import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { pinFile } from "../services/ipfs.js";
import { storeFile } from "../services/keyStore.js";
import { registerFile } from "../services/stacks.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const registerSchema = z.object({
  fileId: z.string().min(1).max(64),
  cid: z.string().min(1).max(128),
  priceUstx: z.number().int().min(0),
  seller: z.string().min(1),
  encryptedKey: z.string().min(1),
  conditions: z
    .object({
      operator: z.enum(["AND", "OR"]),
      conditions: z.array(
        z.object({
          id: z.number(),
          method: z.enum([
            "x402-payment",
            "stx-balance",
            "sip010-balance",
            "sip009-owner",
            "contract-call",
            "block-height",
          ]),
          contractAddress: z.string().optional(),
          function: z.string().optional(),
          parameters: z.array(z.string()).optional(),
          returnValueTest: z.object({
            comparator: z.enum(["==", ">=", "<=", ">", "<"]),
            value: z.string(),
          }),
        })
      ),
    })
    .nullable()
    .optional(),
});

export const uploadRouter = Router();

/**
 * POST /upload/ipfs
 * Upload encrypted file bytes → pin to IPFS → return CID.
 */
uploadRouter.post("/ipfs", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const cid = await pinFile(req.file.buffer, req.file.originalname);
    res.status(201).json({ cid });
  } catch (err) {
    console.error("POST /upload/ipfs error:", err);
    res.status(500).json({ error: "Failed to pin file to IPFS" });
  }
});

/**
 * POST /upload/register
 * Store AES key + conditions, register file on-chain via Clarity contract.
 */
uploadRouter.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
      return;
    }

    const { fileId, cid, priceUstx, seller, encryptedKey, conditions } = parsed.data;

    storeFile(fileId, encryptedKey, conditions ?? null, cid, seller, priceUstx);

    const txId = await registerFile(fileId, cid, priceUstx, seller);

    res.status(201).json({ txId, fileId, cid });
  } catch (err) {
    console.error("POST /upload/register error:", err);
    res.status(500).json({ error: "Failed to register file" });
  }
});
