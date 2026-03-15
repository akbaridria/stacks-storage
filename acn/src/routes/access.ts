import { Router } from "express";
import { getFile } from "../services/keyStore.js";
import { getFileOnChain, recordAccess, distributePayment } from "../services/stacks.js";
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
 * Full x402 flow using x402-stacks library:
 * 1. Look up file in key store + on-chain
 * 2. If no payment-signature header → 402 with payment-required header
 * 3. Settle payment via facilitator (x402-stacks verifier)
 * 4. Evaluate access conditions
 * 5. Record access + distribute payment on-chain
 * 6. Return encrypted AES key + CID with payment-response header
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

    // Parse x402 V2 payment-signature header
    const paymentPayload = parsePaymentSignature(req);

    // If price > 0 and no payment, return 402 with proper headers
    if (priceUstx > 0 && !paymentPayload) {
      send402(res, fileId, priceUstx, resourceUrl);
      return;
    }

    // Settle payment via facilitator if present
    let paymentVerified = false;
    let buyerAddress = "";
    let settlementTxId = "";
    let settlement = undefined as
      | Awaited<ReturnType<typeof settlePayment>>
      | undefined;

    if (paymentPayload && priceUstx > 0) {
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
    } else if (priceUstx === 0) {
      paymentVerified = true;
      buyerAddress = (req.query.address as string) ?? "";
    }

    // Evaluate access conditions
    const conditionsMet = await evaluate(
      file.conditions,
      buyerAddress,
      paymentVerified
    );
    if (!conditionsMet) {
      res.status(403).json({ error: "Access conditions not met" });
      return;
    }

    // Record access + distribute payment on-chain (non-blocking)
    const txPromises: Promise<string>[] = [recordAccess(fileId)];
    if (paymentVerified && priceUstx > 0) {
      txPromises.push(distributePayment(seller, priceUstx));
    }

    const [accessTxResult] = await Promise.allSettled(txPromises);
    const txId =
      accessTxResult.status === "fulfilled"
        ? accessTxResult.value
        : settlementTxId;

    // Attach payment-response header if we settled a payment
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
