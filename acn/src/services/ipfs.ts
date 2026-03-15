import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getConfigSync } from "../config.js";

const config = getConfigSync();
const UPLOADS_DIR = path.resolve("uploads");

async function pinLocal(buffer: Buffer): Promise<string> {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const cid = `bafylocal${hash.slice(0, 48)}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, cid), buffer);
  return cid;
}

async function pinPinata(buffer: Buffer, filename: string): Promise<string> {
  const boundary = `----FormBoundary${crypto.randomBytes(8).toString("hex")}`;
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;

  const body = Buffer.concat([
    Buffer.from(header, "utf-8"),
    buffer,
    Buffer.from(footer, "utf-8"),
  ]);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.pinataJwt}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata upload failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { IpfsHash: string };
  return data.IpfsHash;
}

export async function pinFile(
  buffer: Buffer,
  filename = "encrypted-file"
): Promise<string> {
  switch (config.ipfsProvider) {
    case "pinata":
      return pinPinata(buffer, filename);
    case "local":
    default:
      return pinLocal(buffer);
  }
}
