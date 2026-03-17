# @stacks-storage/sdk

JavaScript/TypeScript SDK for **Stacks Storage**: upload, encrypt, and gate access to files on IPFS using the Stacks blockchain and the x402 payment protocol.

Files are **AES-256-GCM encrypted** in the client before upload. The server never sees plaintext. Access is controlled by on-chain conditions (e.g. x402 payment, STX balance, SIP-010/SIP-009) and payments are made in STX via x402.

---

## Installation

```bash
npm install @stacks-storage/sdk
```

**Peer / runtime:** The SDK uses [x402-stacks](https://www.npmjs.com/package/x402-stacks) for payment flows and works in **Node.js** and **browsers** (ESM).

---

## Quick Start

### Seller: upload a file

```ts
import { StacksStorage } from "@stacks-storage/sdk";

const storage = new StacksStorage({
  acnUrl: "https://your-acn.example.com",
  network: "testnet", // or "mainnet"
});

const file = new File(["Hello, world"], "hello.txt", { type: "text/plain" });

const result = await storage.upload(file, {
  seller: "SP2ABC...", // your Stacks address
  conditions: {
    operator: "AND",
    conditions: [
      {
        id: 1,
        method: "x402-payment",
        returnValueTest: { comparator: ">=", value: "1000000" }, // 1 STX in microSTX
      },
    ],
  },
});

console.log("fileId:", result.fileId, "txId:", result.txId);
```

### Buyer: access a file (pay + decrypt)

```ts
const { file, txId, cid } = await storage.access(result.fileId, {
  wallet: {
    address: "SP2BUYER...",
    privateKey: "your-hex-private-key",
  },
});

// file is a Blob; use it as needed (e.g. download, display)
const url = URL.createObjectURL(file);
```

---

## API Overview

### `StacksStorage`

| Method | Description |
|--------|-------------|
| `upload(file, options)` | Encrypt file → pin to IPFS via ACN → register on-chain. Returns `{ fileId, cid, txId }`. |
| `access(fileId, options)` | Pay via x402 (if required) → receive key → fetch from IPFS → decrypt. Returns `{ file, txId, cid, encryptedKey }`. |

### Config & options

- **Constructor:** `StacksStorage({ acnUrl, network })` — `network`: `"mainnet" | "testnet" | "devnet"`.
- **Upload:** `seller` (Stacks address), optional `conditions` (condition group), optional `priceUstx`.
- **Access:** `wallet: { address, privateKey }` (hex private key).

### Types & crypto (re-exports)

You can also use the low-level crypto and types:

```ts
import {
  generateKey,
  encrypt,
  decrypt,
  serializeKey,
  deserializeKey,
} from "@stacks-storage/sdk";
import type {
  StacksStorageConfig,
  UploadOptions,
  UploadResult,
  AccessOptions,
  AccessResult,
  Condition,
  ConditionGroup,
} from "@stacks-storage/sdk";
```

---

## Condition types

Supported `method` values for conditions: `x402-payment`, `stx-balance`, `sip010-balance`, `sip009-owner`, `contract-call`, `block-height`. Use `returnValueTest` with `comparator` and `value` to define the check. Conditions can be combined with `AND` / `OR` in a `ConditionGroup`.

See the main [Stacks Storage](https://github.com/your-org/stacks-storage) repo for full condition docs and examples.

---

## Publishing to npm

### 1. Prerequisites

- [npm](https://www.npmjs.com/) account: sign up at [npmjs.com](https://www.npmjs.com/signup).
- Log in locally: `npm login` (username, password, OTP if 2FA is enabled).

### 2. Scope and name

This package is scoped: `@stacks-storage/sdk`. You can either:

- **Use the existing scope**  
  Create (or join) the [npm org](https://www.npmjs.com/org/create) `stacks-storage` so the name `@stacks-storage/sdk` is under your account.

- **Use your own scope**  
  In `package.json` set `"name": "@your-npm-username/sdk"` (or another scope you own). Then publish with `npm publish --access public`.

### 3. Version and build

- Bump version when you make a release (e.g. `npm version patch` or edit `"version"` in `package.json`).
- Build before publishing (included in `prepublishOnly`):

```bash
cd sdk
npm run build
```

### 4. Publish

From the `sdk` directory:

```bash
# Scoped packages are private by default; use --access public for a free public package
npm publish --access public
```

For an unscoped package (e.g. `"name": "stacks-storage-sdk"`), you can use:

```bash
npm publish
```

### 5. Optional: `.npmignore`

The `package.json` already has `"files": ["dist"]`, so only the `dist` folder is published. To be explicit, you can add an `.npmignore`:

```
src/
*.ts
!*.d.ts
tsconfig.json
```

### Checklist

- [ ] `npm login` successful
- [ ] Version bumped in `package.json`
- [ ] `npm run build` succeeds
- [ ] `npm publish --access public` (for scoped public package)

After publishing, users can install with:

```bash
npm install @stacks-storage/sdk
```
