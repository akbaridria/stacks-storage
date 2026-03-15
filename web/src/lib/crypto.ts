/**
 * Browser-side AES-256-GCM encryption/decryption using Web Crypto API.
 * Key format: "iv_hex:key_hex" — same as the SDK and ACN.
 */

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateKey(): Promise<{ key: Uint8Array; iv: Uint8Array }> {
  const key = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return { key, iv };
}

export async function encryptFile(
  data: ArrayBuffer,
  key: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    "AES-GCM",
    false,
    ["encrypt"]
  );
  return crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    data
  );
}

export async function decryptFile(
  data: ArrayBuffer,
  key: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    "AES-GCM",
    false,
    ["decrypt"]
  );
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    data
  );
}

export function serializeKey(iv: Uint8Array, key: Uint8Array): string {
  return `${bytesToHex(iv)}:${bytesToHex(key)}`;
}

export function deserializeKey(serialized: string): { iv: Uint8Array; key: Uint8Array } {
  const [ivHex, keyHex] = serialized.split(":");
  return { iv: hexToBytes(ivHex), key: hexToBytes(keyHex) };
}

export async function sha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
