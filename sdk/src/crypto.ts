/**
 * AES-256-GCM encryption/decryption that works in both browser (crypto.subtle)
 * and Node.js (node:crypto). The SDK encrypts files client-side before upload
 * and decrypts them client-side after access — plaintext never touches a server.
 *
 * Key format stored on ACN: "iv_hex:key_hex"
 */

const IV_BYTES = 12;
const KEY_BYTES = 32;

function isNode(): boolean {
  return typeof globalThis.process !== "undefined" && typeof globalThis.process.versions?.node === "string";
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomBytes(n: number): Uint8Array {
  if (isNode()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("node:crypto").randomBytes(n);
  }
  const buf = new Uint8Array(n);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

// ── Browser implementation (Web Crypto API) ──

async function encryptBrowser(
  plaintext: ArrayBuffer,
  key: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw", key.buffer as ArrayBuffer, "AES-GCM", false, ["encrypt"]
  );
  return globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, cryptoKey, plaintext
  );
}

async function decryptBrowser(
  ciphertext: ArrayBuffer,
  key: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw", key.buffer as ArrayBuffer, "AES-GCM", false, ["decrypt"]
  );
  return globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer }, cryptoKey, ciphertext
  );
}

// ── Node.js implementation ──

async function encryptNode(
  plaintext: ArrayBuffer,
  key: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const crypto = await import("node:crypto");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext)),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([encrypted, authTag]).buffer as ArrayBuffer;
}

async function decryptNode(
  ciphertext: ArrayBuffer,
  key: Uint8Array,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const crypto = await import("node:crypto");
  const buf = Buffer.from(ciphertext);
  const authTag = buf.subarray(buf.length - 16);
  const data = buf.subarray(0, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).buffer as ArrayBuffer;
}

// ── Public API ──

export async function generateKey(): Promise<{ key: Uint8Array; iv: Uint8Array }> {
  return { key: randomBytes(KEY_BYTES), iv: randomBytes(IV_BYTES) };
}

export async function encrypt(data: ArrayBuffer, key: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
  return isNode() ? encryptNode(data, key, iv) : encryptBrowser(data, key, iv);
}

export async function decrypt(data: ArrayBuffer, key: Uint8Array, iv: Uint8Array): Promise<ArrayBuffer> {
  return isNode() ? decryptNode(data, key, iv) : decryptBrowser(data, key, iv);
}

export function serializeKey(iv: Uint8Array, key: Uint8Array): string {
  return `${bytesToHex(iv)}:${bytesToHex(key)}`;
}

export function deserializeKey(serialized: string): { iv: Uint8Array; key: Uint8Array } {
  const [ivHex, keyHex] = serialized.split(":");
  return { iv: hexToBytes(ivHex), key: hexToBytes(keyHex) };
}
