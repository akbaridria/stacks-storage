import express from "express";
import cors from "cors";
import { getConfigSync } from "./config.js";
import { uploadRouter } from "./routes/upload.js";
import { accessRouter } from "./routes/access.js";
import { filesRouter } from "./routes/files.js";
import { acnAddress } from "./services/stacks.js";

const config = getConfigSync();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/upload", uploadRouter);
app.use("/access", accessRouter);
app.use("/files", filesRouter);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    network: config.network,
    acnAddress,
  });
});

app.listen(config.port, () => {
  console.log(`ACN running on http://localhost:${config.port}`);
  console.log(`  Network:     ${config.network}`);
  console.log(`  Stacks API:  ${config.stacksApiUrl}`);
  console.log(`  ACN address: ${acnAddress}`);
  console.log(`  IPFS:        ${config.ipfsProvider}`);
  console.log(`  Contracts:   ${config.contractDeployer}.file-registry`);
  console.log(`  Payment:     centralized (manual 97% seller / 3% treasury)`);
});
