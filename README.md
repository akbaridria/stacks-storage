# Stacks Storage

Encrypted file storage on IPFS with programmable access control, powered by the Stacks blockchain and Bitcoin finality.

Upload any file. Encrypt it. Define who can decrypt it — and how. Access conditions are enforced on-chain via Clarity smart contracts. Payments use the x402 protocol with STX, so buyers pay instantly with no accounts, no subscriptions, and no intermediaries.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Access Conditions](#access-conditions)
  - [Condition Types](#condition-types)
  - [AND / OR Operator Logic](#and--or-operator-logic)
- [SDK](#sdk)
  - [Installation](#installation)
  - [Seller: Upload a File](#seller-upload-a-file)
  - [Buyer: Access a File](#buyer-access-a-file)
  - [Condition Examples](#condition-examples)
- [Web Marketplace](#web-marketplace)
  - [Seller Dashboard](#seller-dashboard)
  - [Buyer Marketplace](#buyer-marketplace)
- [Developer API Reference](#developer-api-reference)
  - [Upload Endpoints](#upload-endpoints)
  - [Access Endpoints](#access-endpoints)
  - [Error Codes](#error-codes)
- [Architecture](#architecture)
- [Self-Hosting](#self-hosting)

---

## Overview

Stacks Storage solves a specific problem: **how do you sell or gate access to a file without trusting a centralized platform?**

Traditional approaches (Google Drive paywalls, Gumroad, Patreon) require:
- An account on both sides
- A platform that can revoke access at any time
- Payment rails that can freeze funds
- A server that stores your file and can leak it

Stacks Storage takes a different approach:

| Concern | How we handle it |
|---|---|
| File storage | Encrypted bytes on IPFS + Filecoin — permanent, decentralized |
| Who can decrypt | Conditions checked on Stacks blockchain — no central authority |
| Payment | x402 protocol — buyer pays in STX, no account needed |
| File privacy | AES-256 encrypted in the browser before upload — server never sees plaintext |
| Audit trail | Every access payment is anchored to Bitcoin via Stacks PoX |

---

## How It Works

```
SELLER                          ACN (Access Control Node)          BUYER

upload file
  │
  ├─ encrypt with AES-256 ──────────────────────────────────────────────────
  │  (in browser, key never leaves SDK)
  │
  ├─ pin encrypted bytes to IPFS ──── store encrypted AES key
  │
  └─ register on Clarity contract     (CID + price + conditions)
       (file-id, CID, price, seller)
                                                                   request file
                                                                       │
                                              ◄── HTTP 402 ───────────┤
                                              (price in STX,          │
                                               facilitator URL)        │
                                                                       │
                                              sign STX payment ───────►
                                              (x402-stacks handles this)
                                                                       │
                                        verify payment on Stacks       │
                                        evaluate conditions            │
                                        record payment on-chain        │
                                              │                        │
                                              └── release AES key ────►
                                                                       │
                                                                 fetch CID from IPFS
                                                                 decrypt in browser
                                                                       │
                                                                    ✓ file
```

---

## Access Conditions

Conditions are the rules that determine who can decrypt a file. The seller defines them at upload time. The ACN evaluates them on every access request against live Stacks chain state.

### Condition Types

#### `x402-payment`

The buyer pays a fixed amount of STX. This is the default and most common condition. Payment is handled automatically by the x402-stacks library — the buyer's wallet signs the transaction, a facilitator broadcasts it, and the ACN confirms settlement before releasing the key.

```typescript
{
  id: 1,
  method: 'x402-payment',
  returnValueTest: { comparator: '==', value: 'true' }
}
```

No `contractAddress` needed. Payment amount and recipient are defined separately at upload time via `priceUstx` and are stored on-chain.

---

#### `stx-balance`

The buyer must hold a minimum amount of STX in their wallet at access time. Useful for whale-only content or protocol participant gating.

```typescript
{
  id: 1,
  method: 'stx-balance',
  returnValueTest: { comparator: '>=', value: '1000000000' }  // 1000 STX in microSTX
}
```

---

#### `sip010-balance`

The buyer must hold a minimum balance of a SIP-010 fungible token. Use this for DAO membership tokens, governance tokens, or any custom token gate.

```typescript
{
  id: 1,
  method: 'sip010-balance',
  contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token',
  returnValueTest: { comparator: '>=', value: '100' }
}
```

---

#### `sip009-owner`

The buyer must own at least one NFT from a SIP-009 collection. Use for NFT-gated content, collector perks, or membership passes.

```typescript
{
  id: 1,
  method: 'sip009-owner',
  contractAddress: 'SP2BE8TZATXEVPGZ8HAFZYE5GKZ02X0YDKAN7A98M.boomboxes-inv-v1',
  returnValueTest: { comparator: '>=', value: '1' }
}
```

---

#### `contract-call`

Call any read-only function on any Clarity contract and test its return value. This is the most flexible condition — any on-chain state can gate access.

```typescript
{
  id: 1,
  method: 'contract-call',
  contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.my-subscription',
  function: 'is-subscribed',
  parameters: [':userAddress'],       // :userAddress is replaced with buyer's address
  returnValueTest: { comparator: '==', value: 'true' }
}
```

---

#### `block-height`

File becomes accessible at or after a specific Stacks block height. Use for scheduled releases, embargoed content, or time-locked documents.

```typescript
{
  id: 1,
  method: 'block-height',
  returnValueTest: { comparator: '>=', value: '150000' }
}
```

---

### AND / OR Operator Logic

Conditions are grouped with an `operator` field that controls how multiple conditions are combined.

#### OR — satisfy any one condition

The most common pattern: free for token holders, paid for everyone else.

```typescript
{
  operator: 'OR',
  conditions: [
    {
      id: 1,
      method: 'sip010-balance',
      contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.my-token',
      returnValueTest: { comparator: '>=', value: '100' }
    },
    {
      id: 2,
      method: 'x402-payment',
      returnValueTest: { comparator: '==', value: 'true' }
    }
  ]
}
// token holders → free access
// everyone else → pays STX
```

#### AND — satisfy all conditions

All conditions must pass. Use to combine payment with membership, or NFT ownership with minimum balance.

```typescript
{
  operator: 'AND',
  conditions: [
    {
      id: 1,
      method: 'sip009-owner',
      contractAddress: 'SP2BE8TZATXEVPGZ8HAFZYE5GKZ02X0YDKAN7A98M.my-nft',
      returnValueTest: { comparator: '>=', value: '1' }
    },
    {
      id: 2,
      method: 'x402-payment',
      returnValueTest: { comparator: '==', value: 'true' }
    }
  ]
}
// must own the NFT AND pay — prevents NFT holders sharing access freely
```

#### Comparators

All condition types support these comparators in `returnValueTest`:

| Comparator | Meaning |
|---|---|
| `==` | Equal to |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |
| `>` | Greater than |
| `<` | Less than |

---

## SDK

### Installation

```bash
npm install @stacks-storage/sdk
```

The SDK works in both browser and Node.js environments. AES-256 encryption uses the native `crypto.subtle` API in browsers and Node's built-in `crypto` module in Node.js.

### Seller: Upload a File

```typescript
import { StacksStorage } from '@stacks-storage/sdk'

const storage = new StacksStorage({
  acnUrl:  'https://acn.stacks-storage.xyz',
  network: 'mainnet'
})

// Simple: x402 payment only
const { fileId, cid, txId } = await storage.upload(file, {
  priceUstx: 5_000_000   // 5 STX
})

console.log(`File registered: ${fileId}`)
console.log(`IPFS CID: ${cid}`)
```

Upload with conditions:

```typescript
// Free for token holders, 5 STX for everyone else
const { fileId } = await storage.upload(file, {
  priceUstx: 5_000_000,
  conditions: {
    operator: 'OR',
    conditions: [
      {
        id: 1,
        method: 'sip010-balance',
        contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.my-token',
        returnValueTest: { comparator: '>=', value: '100' }
      },
      {
        id: 2,
        method: 'x402-payment',
        returnValueTest: { comparator: '==', value: 'true' }
      }
    ]
  }
})
```

### Buyer: Access a File

```typescript
import { StacksStorage } from '@stacks-storage/sdk'

const storage = new StacksStorage({
  acnUrl:  'https://acn.stacks-storage.xyz',
  network: 'mainnet'
})

const { file, txId } = await storage.access('your-file-id', {
  wallet: {
    address:    'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    privateKey: process.env.PRIVATE_KEY!
  }
})

// file is a Blob — save or display it
const url = URL.createObjectURL(file)
```

What happens under the hood:
1. SDK calls `GET /access/:fileId` on the ACN
2. ACN returns `HTTP 402` with price and facilitator URL
3. `x402-stacks` intercepts the 402, signs the STX payment, sends to facilitator
4. Facilitator broadcasts the transaction and waits for confirmation
5. SDK retries the request — ACN verifies payment, evaluates conditions, releases AES key
6. SDK fetches encrypted bytes from IPFS via CID
7. SDK decrypts locally with the AES key — plaintext never touches a server

### Condition Examples

```typescript
// Time-locked document — unlocks at block 160000
await storage.upload(file, {
  priceUstx: 0,
  conditions: {
    operator: 'AND',
    conditions: [{
      id: 1,
      method: 'block-height',
      returnValueTest: { comparator: '>=', value: '160000' }
    }]
  }
})

// NFT-gated research report
await storage.upload(file, {
  priceUstx: 2_000_000,
  conditions: {
    operator: 'AND',
    conditions: [
      {
        id: 1,
        method: 'sip009-owner',
        contractAddress: 'SP2BE8TZATXEVPGZ8HAFZYE5GKZ02X0YDKAN7A98M.research-pass',
        returnValueTest: { comparator: '>=', value: '1' }
      },
      {
        id: 2,
        method: 'x402-payment',
        returnValueTest: { comparator: '==', value: 'true' }
      }
    ]
  }
})

// DAO governance: custom Clarity contract check
await storage.upload(file, {
  priceUstx: 0,
  conditions: {
    operator: 'AND',
    conditions: [{
      id: 1,
      method: 'contract-call',
      contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.dao-governance',
      function: 'is-member',
      parameters: [':userAddress'],
      returnValueTest: { comparator: '==', value: 'true' }
    }]
  }
})
```

---

## Web Marketplace

The web app at `web/` is a Next.js 14 application with two distinct experiences.

### Seller Dashboard

Sellers connect their Hiro wallet and get a personal dashboard to manage all their files.

**Upload flow:**

1. Drag and drop any file (up to 50GB supported via multipart upload)
2. Set a price in STX — or set to 0 and use conditions only
3. Optionally add access conditions using the visual condition builder
4. Upload — file is encrypted in the browser, pinned to IPFS, registered on-chain
5. Share the generated file page URL or embed the buy button anywhere

**Dashboard shows per file:**
- IPFS CID and Clarity transaction link
- Total access count (pulled from on-chain `access-count`)
- Revenue earned in STX
- Active conditions
- Option to update price or deactivate

**Embed button:**

Every file gets a one-line embed sellers can drop on any website:

```html
<script src="https://stacks-storage.xyz/embed.js"
        data-file-id="abc123"
        data-label="Buy for 5 STX">
</script>
```

The button handles the entire x402 flow, wallet connection, and download in a self-contained widget.

---

### Buyer Marketplace

The marketplace is a public feed of all active files listed on Stacks Storage.

**Browse:**
- Filter by asset type (document, video, dataset, software, other)
- Filter by price range
- Sort by newest, most popular, lowest price
- Search by title or seller address

**File detail page:**
- File name, description, type, and size
- Price in STX (converted to USD at current rate)
- Access conditions shown clearly — "Must hold 100 MY-TOKEN or pay 5 STX"
- Seller's other files
- Buy button — connects Hiro wallet, handles x402 payment, triggers download

**After purchase:**
- File decrypts in the browser
- Download prompt appears automatically
- Purchase recorded on-chain — permanent receipt

---

## Developer API Reference

The ACN exposes a REST API. Base URL: `https://acn.stacks-storage.xyz`

All requests and responses use `application/json` unless noted.

---

### Upload Endpoints

#### `POST /upload/ipfs`

Upload an encrypted file to IPFS. Returns a CID.

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | binary | Encrypted file bytes |

**Response `201`:**

```json
{
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
}
```

---

#### `POST /upload/register`

Register a file with the ACN. Stores the AES key and triggers the Clarity `register-file` transaction.

**Request body:**

```json
{
  "fileId":       "string — sha256 of CID",
  "cid":          "string — IPFS CID",
  "priceUstx":    1000000,
  "encryptedKey": "string — iv:aesKeyBase64",
  "conditions": {
    "operator": "OR",
    "conditions": [...]
  }
}
```

**Response `201`:**

```json
{
  "txId":   "0xabc123...",
  "fileId": "string",
  "cid":    "string"
}
```

---

### Access Endpoints

#### `GET /access/:fileId`

Request access to a file. Returns `402` if no valid payment is present.

**Headers:**

| Header | Required | Description |
|---|---|---|
| `X-PAYMENT` | no (first request) | x402 payment header — added automatically by `x402-stacks` |

**Response `402` — payment required:**

```json
{
  "error":    "Payment required",
  "price":    5000000,
  "currency": "STX",
  "network":  "mainnet",
  "payTo":    "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "fileId":   "abc123",
  "scheme":   "stacks-x402-v1"
}
```

**Response `200` — access granted:**

```json
{
  "cid":          "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
  "encryptedKey": "base64-encoded-wrapped-aes-key",
  "buyerAddress": "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "txId":         "0xabc123..."
}
```

**Response `403` — conditions not met:**

```json
{
  "error": "Access conditions not met"
}
```

**Response `410` — file deactivated:**

```json
{
  "error": "File no longer available"
}
```

---

### Error Codes

| HTTP Status | Meaning |
|---|---|
| `400` | Invalid request body — check field types and required fields |
| `402` | Payment required — attach `X-PAYMENT` header with valid STX payment |
| `403` | Access conditions not met — buyer does not satisfy the file's conditions |
| `404` | File not found — `fileId` not registered |
| `410` | File deactivated — seller has taken the file offline |
| `500` | Internal server error — check ACN logs |

---

## Architecture

```
stacks-storage/
├── contract/               Clarity smart contracts
│   ├── file-registry.clar  On-chain file index: CID, price, seller, access count
│   └── acn-payments.clar   STX fee split: 97% seller, 3% protocol treasury
│
├── acn/                    Access Control Node — Node.js / Express
│   └── src/
│       ├── routes/
│       │   ├── upload.ts   POST /upload/ipfs, POST /upload/register
│       │   └── access.ts   GET /access/:fileId — x402 gate + condition eval
│       └── services/
│           ├── x402.ts     x402-stacks middleware wrapper
│           ├── conditionEvaluator.ts  AND/OR logic engine
│           ├── stacks.ts   Clarity contract calls + chain reads
│           └── keyStore.ts AES key storage + release
│
├── sdk/                    npm package — @stacks-storage/sdk
│   └── src/
│       ├── StacksStorage.ts  upload() + access()
│       └── types.ts          TypeScript types
│
├── web/                    Next.js 14 — seller dashboard + buyer marketplace
│
└── docs/                   Developer documentation
```

**Data ownership:**

| Data | Where | Who controls |
|---|---|---|
| Encrypted file bytes | IPFS + Filecoin | Nobody — permanent and public |
| File CID + price + seller | Clarity contract | Seller (can update price, deactivate) |
| AES decryption key | ACN key store (encrypted at rest) | ACN operator |
| Payment history | Stacks blockchain | Immutable |

---

## Self-Hosting

You can run your own ACN to maintain full key custody.

**Requirements:**
- Node.js 20+
- A Stacks wallet with some STX for transaction fees
- A web3.storage account for IPFS pinning
- A deployed x402-stacks facilitator (see [x402Stacks](https://github.com/tony1908/x402Stacks))

**Steps:**

```bash
git clone https://github.com/your-org/stacks-storage
cd stacks-storage/acn

cp .env.example .env
# fill in STACKS_NETWORK, ACN_PRIVATE_KEY, W3_STORAGE_TOKEN,
# KEY_ENCRYPTION_SECRET, X402_FACILITATOR_URL

npm install
npm run dev
```

Deploy the Clarity contracts with Clarinet:

```bash
cd contract
clarinet deployments apply --testnet
```

Point the SDK to your ACN:

```typescript
const storage = new StacksStorage({
  acnUrl:  'https://your-acn.example.com',
  network: 'testnet'
})
```

---

## License

MIT
