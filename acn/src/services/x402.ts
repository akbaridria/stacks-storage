import type { Request, Response } from "express";
import {
  X402PaymentVerifier,
  X402_HEADERS,
  networkToCAIP2,
  type PaymentRequirementsV2,
  type PaymentPayloadV2,
  type SettlementResponseV2,
} from "x402-stacks";
import { acnAddress } from "./stacks.js";
import { getConfigSync } from "../config.js";

const config = getConfigSync();
const verifier = new X402PaymentVerifier(config.x402FacilitatorUrl || undefined);
const networkCaip2 = networkToCAIP2(config.network as "mainnet" | "testnet");

function buildPaymentRequirements(
  priceUstx: number,
  resourceUrl: string
): PaymentRequirementsV2 {
  return {
    scheme: "exact",
    network: networkCaip2,
    amount: String(priceUstx),
    asset: "STX",
    payTo: acnAddress,
    maxTimeoutSeconds: 300,
  };
}

/**
 * Parse the `payment-signature` header (V2 protocol).
 * Returns the decoded PaymentPayloadV2 or null.
 */
export function parsePaymentSignature(req: Request): PaymentPayloadV2 | null {
  const header = req.headers[X402_HEADERS.PAYMENT_SIGNATURE] as string | undefined;
  if (!header) return null;

  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    return JSON.parse(decoded) as PaymentPayloadV2;
  } catch {
    return null;
  }
}

/**
 * Settle a payment through the facilitator.
 * The facilitator broadcasts the signed transaction and waits for confirmation.
 */
export async function settlePayment(
  payload: PaymentPayloadV2,
  priceUstx: number,
  resourceUrl: string
): Promise<SettlementResponseV2> {
  const requirements = buildPaymentRequirements(priceUstx, resourceUrl);
  return verifier.settle(payload, { paymentRequirements: requirements });
}

/**
 * Send a 402 Payment Required response with proper V2 headers.
 */
export function send402(
  res: Response,
  fileId: string,
  priceUstx: number,
  resourceUrl: string
): void {
  const requirements = buildPaymentRequirements(priceUstx, resourceUrl);

  const paymentRequired = {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: resourceUrl,
      description: `Access file ${fileId}`,
    },
    accepts: [requirements],
  };

  const encoded = Buffer.from(JSON.stringify(paymentRequired)).toString("base64");

  res
    .status(402)
    .set(X402_HEADERS.PAYMENT_REQUIRED, encoded)
    .json({
      error: "Payment required",
      price: priceUstx,
      currency: "STX",
      network: config.network,
      payTo: acnAddress,
      fileId,
      scheme: "stacks-x402-v1",
    });
}

/**
 * Attach the `payment-response` header to a successful response.
 */
export function attachPaymentResponse(
  res: Response,
  settlement: SettlementResponseV2
): void {
  const encoded = Buffer.from(JSON.stringify(settlement)).toString("base64");
  res.set(X402_HEADERS.PAYMENT_RESPONSE, encoded);
}
