import {
  wrapAxiosWithPayment,
  privateKeyToAccount,
  decodePaymentResponse,
} from "x402-stacks";
import { generateKey, encrypt, decrypt, serializeKey, deserializeKey } from "./crypto.js";
import type {
  StacksStorageConfig,
  UploadOptions,
  UploadResult,
  AccessOptions,
  AccessResult,
  RegisterResponse,
  AccessGrantedResponse,
} from "./types.js";

const IPFS_GATEWAYS = [
  "https://coral-charming-marten-712.mypinata.cloud/ipfs/",
];

async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  if (typeof globalThis.process !== "undefined" && globalThis.process.versions?.node) {
    const crypto = await import("node:crypto");
    return crypto.createHash("sha256").update(encoded).digest("hex");
  }
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchFromIPFS(cid: string): Promise<ArrayBuffer> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gateway}${cid}`);
      if (res.ok) return res.arrayBuffer();
    } catch {
      continue;
    }
  }
  throw new Error(`Failed to fetch CID ${cid} from any IPFS gateway`);
}

async function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export class StacksStorage {
  private acnUrl: string;
  private network: string;

  constructor(config: StacksStorageConfig) {
    this.acnUrl = config.acnUrl.replace(/\/$/, "");
    this.network = config.network;
  }

  /**
   * Upload a file: encrypt locally → pin to IPFS via ACN → register on-chain.
   *
   * The file is AES-256-GCM encrypted in memory before it leaves the client.
   * The ACN never sees the plaintext.
   */
  async upload(
    file: File | Blob,
    options: UploadOptions & { seller: string }
  ): Promise<UploadResult> {
    const { key, iv } = await generateKey();
    const plaintext = await fileToArrayBuffer(file);
    const ciphertext = await encrypt(plaintext, key, iv);

    // 1. Pin encrypted bytes to IPFS via ACN
    const formData = new FormData();
    formData.append("file", new Blob([ciphertext]), "encrypted-file");

    const ipfsRes = await fetch(`${this.acnUrl}/upload/ipfs`, {
      method: "POST",
      body: formData,
    });
    if (!ipfsRes.ok) {
      const err = await ipfsRes.json().catch(() => ({}));
      throw new Error(`IPFS upload failed: ${(err as { error?: string }).error ?? ipfsRes.statusText}`);
    }
    const { cid } = (await ipfsRes.json()) as { cid: string };

    // 2. Compute file-id (sha256 of CID, truncated to 64 ascii chars)
    const fullHash = await sha256Hex(cid);
    const fileId = fullHash.slice(0, 64);

    // 3. Register with ACN (stores key + conditions, triggers on-chain register-file)
    const encryptedKey = serializeKey(iv, key);

    const registerBody: Record<string, unknown> = {
      fileId,
      cid,
      seller: options.seller,
      encryptedKey,
      conditions: options.conditions ?? null,
    };
    if (options.priceUstx !== undefined) {
      registerBody.priceUstx = options.priceUstx;
    }
    const registerRes = await fetch(`${this.acnUrl}/upload/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerBody),
    });
    if (!registerRes.ok) {
      const err = await registerRes.json().catch(() => ({}));
      throw new Error(`Registration failed: ${(err as { error?: string }).error ?? registerRes.statusText}`);
    }
    const result = (await registerRes.json()) as RegisterResponse;

    return { fileId: result.fileId, cid: result.cid, txId: result.txId };
  }

  /**
   * Access a file: pay via x402 → receive AES key → fetch from IPFS → decrypt locally.
   *
   * Uses x402-stacks to automatically handle the 402 payment flow:
   * 1. GET /access/:fileId → 402 with payment-required header
   * 2. x402-stacks signs STX tx, sends to facilitator via payment-signature header
   * 3. ACN settles payment, evaluates conditions, returns encrypted key + CID
   * 4. SDK fetches encrypted bytes from IPFS, decrypts with AES key
   */
  async access(fileId: string, options: AccessOptions): Promise<AccessResult> {
    const { default: axios } = await import("x402-stacks/node_modules/axios" as string).catch(
      () => import("axios" as string)
    ).catch(async () => {
      // Fallback: dynamically import axios if available globally
      const mod = await import("axios");
      return { default: mod.default };
    });

    const account = privateKeyToAccount(options.wallet.privateKey, this.network as "mainnet" | "testnet");

    const api = wrapAxiosWithPayment(
      axios.create({ baseURL: this.acnUrl }),
      account
    );

    const response = await api.get<AccessGrantedResponse>(`/access/${fileId}`);
    const { cid, encryptedKey, txId } = response.data;

    // Decode payment response header if present
    const paymentResponseHeader = response.headers?.["payment-response"] as string | undefined;
    if (paymentResponseHeader) {
      const paymentInfo = decodePaymentResponse(paymentResponseHeader);
      if (paymentInfo) {
        // Payment was settled — txId from payment response is the settlement tx
      }
    }

    // Fetch encrypted file from IPFS
    const encryptedBytes = await fetchFromIPFS(cid);

    // Decrypt locally
    const { iv, key } = deserializeKey(encryptedKey);
    const decryptedBytes = await decrypt(encryptedBytes, key, iv);

    return {
      file: new Blob([decryptedBytes]),
      txId,
      cid,
      encryptedKey,
    };
  }
}
