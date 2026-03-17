import { ACN_URL } from "./constants";

export interface PublicFile {
  fileId: string;
  cid: string;
  conditions: ConditionGroup | null;
  seller: string;
  priceUstx: number;
  createdAt: string;
  name: string;
  description: string;
  fileType: string;
  fileSize: number;
}

/** Per-condition evaluation when GET /files/:fileId is called with ?address= */
export interface ConditionResult {
  id: number;
  method: string;
  met: boolean;
}

export interface FileDetail extends PublicFile {
  accessCount: number;
  active: boolean;
  /** Present when request included ?address=; true if that address has passed all access requirements. */
  accessGranted?: boolean;
  /** Present when ?address= was provided; per-condition true/false for UI. */
  conditionResults?: ConditionResult[];
}

export interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

export interface Condition {
  id: number;
  method: string;
  contractAddress?: string;
  function?: string;
  parameters?: string[];
  returnValueTest: { comparator: string; value: string };
}

export async function fetchFiles(seller?: string): Promise<PublicFile[]> {
  const url = seller
    ? `${ACN_URL}/files?seller=${encodeURIComponent(seller)}`
    : `${ACN_URL}/files`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch files");
  const data = (await res.json()) as { files: PublicFile[] };
  return data.files;
}

export async function fetchFileDetail(
  fileId: string,
  /** If provided, backend checks whether this address has passed all requirements and returns accessGranted. */
  address?: string
): Promise<FileDetail> {
  const url = address
    ? `${ACN_URL}/files/${fileId}?address=${encodeURIComponent(address)}`
    : `${ACN_URL}/files/${fileId}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch file detail");
  return res.json() as Promise<FileDetail>;
}

export async function uploadToIpfs(encryptedBlob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", encryptedBlob, "encrypted-file");
  const res = await fetch(`${ACN_URL}/upload/ipfs`, { method: "POST", body: form });
  if (!res.ok) throw new Error("IPFS upload failed");
  const data = (await res.json()) as { cid: string };
  return data.cid;
}

export async function registerFile(body: {
  fileId: string;
  cid: string;
  priceUstx: number;
  seller: string;
  encryptedKey: string;
  name: string;
  description: string;
  fileType: string;
  fileSize: number;
  conditions: ConditionGroup | null;
}): Promise<{ txId: string; fileId: string; cid: string }> {
  const res = await fetch(`${ACN_URL}/upload/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Registration failed");
  }
  return res.json() as Promise<{ txId: string; fileId: string; cid: string }>;
}

export interface X402PaymentRequired {
  payTo: string;
  price: number;
  network: string;
  fileId: string;
  scheme: string;
  /** Raw base64-encoded PaymentRequiredV2 header value */
  paymentRequiredHeader: string | null;
}

export class PaymentRequiredError extends Error {
  status = 402;
  payment: X402PaymentRequired;
  constructor(payment: X402PaymentRequired) {
    super("Payment required");
    this.payment = payment;
  }
}

/**
 * Request access to a file from the ACN.
 *
 * - No options            → may return 402 (throws PaymentRequiredError)
 * - buyer provided        → ACN checks if this address already paid (free re-download)
 * - txId provided         → browser wallet flow: ACN verifies the confirmed on-chain tx
 * - paymentSignature      → x402 SDK flow: ACN settles via facilitator (requires facilitator URL)
 */
export async function accessFile(
  fileId: string,
  options?: { buyer?: string; txId?: string; paymentSignature?: string }
): Promise<{ cid: string; encryptedKey: string; buyerAddress: string; txId: string }> {
  const headers: Record<string, string> = {};
  if (options?.txId) headers["x-stx-txid"] = options.txId;
  if (options?.paymentSignature) headers["payment-signature"] = options.paymentSignature;

  const url = new URL(`${ACN_URL}/access/${fileId}`);
  if (options?.buyer) url.searchParams.set("buyer", options.buyer);

  const res = await fetch(url.toString(), { headers });

  if (res.status === 402) {
    const data = (await res.json()) as {
      payTo?: string;
      price?: number;
      network?: string;
      fileId?: string;
      scheme?: string;
    };
    throw new PaymentRequiredError({
      payTo: data.payTo ?? "",
      price: data.price ?? 0,
      network: data.network ?? "testnet",
      fileId: data.fileId ?? fileId,
      scheme: data.scheme ?? "stacks-x402-v1",
      paymentRequiredHeader: res.headers.get("payment-required"),
    });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    const message = body.error ?? "Access request failed";
    throw Object.assign(new Error(message), { status: res.status });
  }

  return res.json() as Promise<{ cid: string; encryptedKey: string; buyerAddress: string; txId: string }>;
}
