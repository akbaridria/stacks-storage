import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { uploadRouter } from "./routes/upload.js";
import { accessRouter } from "./routes/access.js";
import { acnAddress } from "./services/stacks.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/upload", uploadRouter);
app.use("/access", accessRouter);

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
  console.log(`               ${config.contractDeployer}.acn-payments`);
});
