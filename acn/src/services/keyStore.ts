import crypto from "node:crypto";
import Database from "better-sqlite3";
import path from "node:path";
import { getConfigSync } from "../config.js";
import type { ConditionGroup, FileRecord, PublicFileRecord } from "../types.js";

const config = getConfigSync();
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
    name           TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    file_type      TEXT NOT NULL DEFAULT 'other',
    file_size      INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_address  TEXT NOT NULL,
    file_id        TEXT NOT NULL,
    tx_id          TEXT NOT NULL,
    purchased_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(buyer_address, file_id)
  );
`);

// Migrate existing tables that may lack new columns
for (const col of [
  ["name", "TEXT NOT NULL DEFAULT ''"],
  ["description", "TEXT NOT NULL DEFAULT ''"],
  ["file_type", "TEXT NOT NULL DEFAULT 'other'"],
  ["file_size", "INTEGER NOT NULL DEFAULT 0"],
]) {
  try {
    db.exec(`ALTER TABLE file_keys ADD COLUMN ${col[0]} ${col[1]}`);
  } catch {
    // column already exists
  }
}

const insertStmt = db.prepare(`
  INSERT INTO file_keys (file_id, encrypted_data, iv, auth_tag, conditions, cid, seller, price_ustx, name, description, file_type, file_size)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const selectStmt = db.prepare(`
  SELECT * FROM file_keys WHERE file_id = ?
`);

const deleteStmt = db.prepare(`DELETE FROM file_keys WHERE file_id = ?`);

const listAllStmt = db.prepare(`
  SELECT file_id, cid, conditions, seller, price_ustx, name, description, file_type, file_size, created_at
  FROM file_keys ORDER BY created_at DESC
`);

const listBySellerStmt = db.prepare(`
  SELECT file_id, cid, conditions, seller, price_ustx, name, description, file_type, file_size, created_at
  FROM file_keys WHERE seller = ? ORDER BY created_at DESC
`);

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

interface RawRow {
  file_id: string;
  encrypted_data: string;
  iv: string;
  auth_tag: string;
  conditions: string | null;
  cid: string;
  seller: string;
  price_ustx: number;
  name: string;
  description: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

interface PublicRow {
  file_id: string;
  cid: string;
  conditions: string | null;
  seller: string;
  price_ustx: number;
  name: string;
  description: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

function rowToPublic(row: PublicRow): PublicFileRecord {
  return {
    fileId: row.file_id,
    cid: row.cid,
    conditions: row.conditions ? JSON.parse(row.conditions) : null,
    seller: row.seller,
    priceUstx: row.price_ustx,
    name: row.name,
    description: row.description,
    fileType: row.file_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

// ── Public API ──

export function storeFile(
  fileId: string,
  encryptedKey: string,
  conditions: ConditionGroup | null,
  cid: string,
  seller: string,
  priceUstx: number,
  name: string = "",
  description: string = "",
  fileType: string = "other",
  fileSize: number = 0
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
    priceUstx,
    name,
    description,
    fileType,
    fileSize
  );
}

export function getFile(fileId: string): FileRecord | null {
  const row = selectStmt.get(fileId) as RawRow | undefined;
  if (!row) return null;

  return {
    fileId: row.file_id,
    cid: row.cid,
    encryptedKey: decrypt(row.encrypted_data, row.iv, row.auth_tag),
    conditions: row.conditions ? JSON.parse(row.conditions) : null,
    seller: row.seller,
    priceUstx: row.price_ustx,
    name: row.name,
    description: row.description,
    fileType: row.file_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  };
}

export function getPublicFile(fileId: string): PublicFileRecord | null {
  const row = selectStmt.get(fileId) as RawRow | undefined;
  if (!row) return null;
  return rowToPublic(row);
}

export function listFiles(): PublicFileRecord[] {
  const rows = listAllStmt.all() as PublicRow[];
  return rows.map(rowToPublic);
}

export function listFilesBySeller(seller: string): PublicFileRecord[] {
  const rows = listBySellerStmt.all(seller) as PublicRow[];
  return rows.map(rowToPublic);
}

export function deleteFile(fileId: string): void {
  deleteStmt.run(fileId);
}

// ── Purchase records ──

const insertPurchaseStmt = db.prepare(`
  INSERT OR REPLACE INTO purchases (buyer_address, file_id, tx_id)
  VALUES (?, ?, ?)
`);

const hasPurchasedStmt = db.prepare(`
  SELECT 1 FROM purchases WHERE buyer_address = ? AND file_id = ? LIMIT 1
`);

/** Persist a verified purchase so the buyer can re-download without paying again. */
export function recordPurchase(buyerAddress: string, fileId: string, txId: string): void {
  insertPurchaseStmt.run(buyerAddress, fileId, txId);
}

/** Returns true if this buyer has already paid for this file. */
export function hasPurchased(buyerAddress: string, fileId: string): boolean {
  return !!hasPurchasedStmt.get(buyerAddress, fileId);
}
