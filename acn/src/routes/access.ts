import { Router } from "express";
import { getFile, hasPurchased, recordPurchase } from "../services/keyStore.js";
import { getFileOnChain, recordAccess, getTransaction } from "../services/stacks.js";
import {
  parsePaymentSignature,
  settlePayment,
  send402,
  attachPaymentResponse,
} from "../services/x402.js";
import { evaluate } from "../services/conditionEvaluator.js";

export const accessRouter = Router();

/**
 * GET /access/:fileId
 *
 * Supports two payment modes:
 *
 * 1. x402 flow (SDK / programmatic clients):
 *    - Client signs an STX transfer WITHOUT broadcasting
 *    - Retries with `payment-signature` header containing the signed tx
 *    - ACN settles via x402 facilitator (facilitator broadcasts + confirms)
 *
 * 2. Browser wallet flow:
 *    - Client broadcasts an STX transfer via wallet (openSTXTransfer)
 *    - Retries with `x-stx-txid` header containing the confirmed txId
 *    - ACN verifies the tx on-chain via Stacks API
 *
 * Full flow:
 * 1. Look up file in key store + on-chain
 * 2. If price > 0 and no payment header → 402 with payment requirements
 * 3. Settle / verify payment via appropriate path
 * 4. Evaluate access conditions
 * 5. Record access on-chain (payment distribution is centralized: operator transfers 97% to seller, 3% to treasury)
 * 6. Return encrypted AES key + CID
 */
accessRouter.get("/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;

    const file = getFile(fileId);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const onChain = await getFileOnChain(fileId);
    if (onChain && !onChain.active) {
      res.status(410).json({ error: "File no longer available" });
      return;
    }

    const priceUstx = onChain?.priceUstx ?? file.priceUstx;
    const seller = onChain?.seller ?? file.seller;
    const resourceUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

    const paymentPayload = parsePaymentSignature(req);
    const directTxId = req.headers["x-stx-txid"] as string | undefined;
    const buyerParam = (req.query.buyer as string) ?? "";

    // ── Short-circuit: buyer has already paid for this file ──
    if (priceUstx > 0 && buyerParam && hasPurchased(buyerParam, fileId)) {
      const conditionsMet = await evaluate(file.conditions, buyerParam, true);
      if (!conditionsMet) {
        res.status(403).json({ error: "Access conditions not met" });
        return;
      }
      res.status(200).json({
        cid: file.cid,
        encryptedKey: file.encryptedKey,
        buyerAddress: buyerParam,
        txId: "",
      });
      return;
    }

    if (priceUstx > 0 && !paymentPayload && !directTxId) {
      send402(res, fileId, priceUstx, resourceUrl);
      return;
    }

    let paymentVerified = false;
    let buyerAddress = "";
    let settlementTxId = "";
    let settlement: Awaited<ReturnType<typeof settlePayment>> | undefined;

    if (paymentPayload && priceUstx > 0) {
      // ── x402 facilitator flow ──
      try {
        settlement = await settlePayment(paymentPayload, priceUstx, resourceUrl);
        if (!settlement.success) {
          send402(res, fileId, priceUstx, resourceUrl);
          return;
        }
        paymentVerified = true;
        buyerAddress = settlement.payer ?? "";
        settlementTxId = settlement.transaction;
      } catch {
        send402(res, fileId, priceUstx, resourceUrl);
        return;
      }
    } else if (directTxId && priceUstx > 0) {
      // ── Browser wallet flow: verify the broadcast STX transfer on-chain ──
      try {
        const tx = await getTransaction(directTxId);
        const confirmed =
          tx.tx_status === "success" || tx.tx_status === "microblock_confirmed";
        if (!confirmed) {
          res.status(400).json({
            error: "Transaction not yet confirmed",
            txStatus: tx.tx_status,
          });
          return;
        }
        const stxEvent = tx.events?.find(
          (e) =>
            e.event_type === "stx_transfer_event" ||
            e.event_type === "stx_asset"
        );
        if (!stxEvent || Number(stxEvent.asset?.amount) < priceUstx) {
          res.status(400).json({ error: "Payment amount insufficient" });
          return;
        }
        paymentVerified = true;
        buyerAddress = tx.sender_address;
        settlementTxId = directTxId;
      } catch {
        res.status(400).json({ error: "Failed to verify transaction" });
        return;
      }
    } else if (priceUstx === 0) {
      paymentVerified = true;
      buyerAddress = (req.query.address as string) ?? "";
    }

    // Evaluate access conditions
    const conditionsMet = await evaluate(file.conditions, buyerAddress, paymentVerified);
    if (!conditionsMet) {
      res.status(403).json({ error: "Access conditions not met" });
      return;
    }

    // Persist purchase so the buyer can re-download without paying again
    if (paymentVerified && priceUstx > 0 && buyerAddress) {
      recordPurchase(buyerAddress, fileId, settlementTxId);
    }

    // Record access on-chain. Payment distribution is centralized: operator manually transfers
    // 97% to seller and 3% to treasury (see Roadmap in documentation).
    const txPromises: Promise<string>[] = [recordAccess(fileId)];

    if (paymentVerified && priceUstx > 0) {
      const sellerAmount = Math.floor((priceUstx * 97) / 100);
      const treasuryAmount = priceUstx - sellerAmount;
      console.info(
        `[access] Payment received: ${priceUstx} ustx — manually transfer 97% (${sellerAmount} ustx) to seller ${seller}, 3% (${treasuryAmount} ustx) to treasury`
      );
    }

    const [accessTxResult] = await Promise.allSettled(txPromises);
    const txId =
      accessTxResult.status === "fulfilled" ? accessTxResult.value : settlementTxId;

    if (settlement?.success) {
      attachPaymentResponse(res, settlement);
    }

    res.status(200).json({
      cid: file.cid,
      encryptedKey: file.encryptedKey,
      buyerAddress,
      txId,
    });
  } catch (err) {
    console.error("GET /access/:fileId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
