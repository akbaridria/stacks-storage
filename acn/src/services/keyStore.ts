import crypto from "node:crypto";
import Database from "better-sqlite3";
import path from "node:path";
import { config } from "../config.js";
import type { ConditionGroup, FileRecord } from "../types.js";

const DB_PATH = path.resolve("acn.db");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS file_keys (
    file_id        TEXT PRIMARY KEY,
    encrypted_data TEXT NOT NULL,
    iv             TEXT NOT NULL,
    auth_tag       TEXT NOT NULL,
    conditions     TEXT,
    cid            TEXT NOT NULL,
    seller         TEXT NOT NULL,
    price_ustx     INTEGER NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertStmt = db.prepare(`
  INSERT INTO file_keys (file_id, encrypted_data, iv, auth_tag, conditions, cid, seller, price_ustx)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectStmt = db.prepare(`
  SELECT * FROM file_keys WHERE file_id = ?
`);

const deleteStmt = db.prepare(`DELETE FROM file_keys WHERE file_id = ?`);

// ── At-rest encryption with AES-256-GCM ──

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, "stacks-storage-acn-salt", 32);
}

function encrypt(plaintext: string): { data: string; iv: string; authTag: string } {
  const key = deriveKey(config.keyEncryptionSecret);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  return {
    data: encrypted,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(data: string, ivB64: string, authTagB64: string): string {
  const key = deriveKey(config.keyEncryptionSecret);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  let decrypted = decipher.update(data, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ── Public API ──

export function storeFile(
  fileId: string,
  encryptedKey: string,
  conditions: ConditionGroup | null,
  cid: string,
  seller: string,
  priceUstx: number
): void {
  const { data, iv, authTag } = encrypt(encryptedKey);
  insertStmt.run(
    fileId,
    data,
    iv,
    authTag,
    conditions ? JSON.stringify(conditions) : null,
    cid,
    seller,
    priceUstx
  );
}

export function getFile(fileId: string): FileRecord | null {
  const row = selectStmt.get(fileId) as
    | {
        file_id: string;
        encrypted_data: string;
        iv: string;
        auth_tag: string;
        conditions: string | null;
        cid: string;
        seller: string;
        price_ustx: number;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    fileId: row.file_id,
    cid: row.cid,
    encryptedKey: decrypt(row.encrypted_data, row.iv, row.auth_tag),
    conditions: row.conditions ? JSON.parse(row.conditions) : null,
    seller: row.seller,
    priceUstx: row.price_ustx,
    createdAt: row.created_at,
  };
}

export function deleteFile(fileId: string): void {
  deleteStmt.run(fileId);
}
