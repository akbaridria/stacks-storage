import { Router } from "express";
import { listFiles, listFilesBySeller, getPublicFile } from "../services/keyStore.js";
import { getFileOnChain } from "../services/stacks.js";

export const filesRouter = Router();

/**
 * GET /files
 * List all files (public info, no keys). Optionally filter by seller.
 */
filesRouter.get("/", async (req, res) => {
  try {
    const seller = req.query.seller as string | undefined;
    const files = seller ? listFilesBySeller(seller) : listFiles();
    res.json({ files });
  } catch (err) {
    console.error("GET /files error:", err);
    res.status(500).json({ error: "Failed to list files" });
  }
});

/**
 * GET /files/:fileId
 * Get public info for a single file (no encrypted key).
 * Enriches with on-chain data (access count, active status).
 */
filesRouter.get("/:fileId", async (req, res) => {
  try {
    const file = getPublicFile(req.params.fileId);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    let accessCount = 0;
    let active = true;

    try {
      const onChain = await getFileOnChain(file.fileId);
      if (onChain) {
        accessCount = onChain.accessCount;
        active = onChain.active;
      }
    } catch {
      // chain read may fail on devnet — fall back to defaults
    }

    res.json({ ...file, accessCount, active });
  } catch (err) {
    console.error("GET /files/:fileId error:", err);
    res.status(500).json({ error: "Failed to get file" });
  }
});
