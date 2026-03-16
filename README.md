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
  - [Files Endpoints](#files-endpoints)
  - [Access Endpoints](#access-endpoints)
  - [Error Codes](#error-codes)
- [Roadmap](#roadmap)

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
                                        record access on-chain         │
                                        (payment: manual 97% / 3%)      │
                                              │                        │
                                              └── release AES key ────►
                                                                       │
                                                                 fetch CID from IPFS
                                                                 (Pinata gateway)
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
  returnValueTest: { comparator: '==', value: '5000000' }   // 5 STX in microSTX
}
```

No `contractAddress` needed. The payment amount is set in the condition's `returnValueTest.value` (in microSTX) and is stored on-chain with the file.

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
      returnValueTest: { comparator: '==', value: '5000000' }   // 5 STX
    }
  ]
}
// token holders → free access
// everyone else → pays 5 STX
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
      returnValueTest: { comparator: '==', value: '5000000' }   // 5 STX
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

Price is set only via the **x402-payment** condition (the condition's `returnValueTest.value` is the amount in microSTX). There is no top-level price field.

```typescript
import { StacksStorage } from '@stacks-storage/sdk'

const storage = new StacksStorage({
  acnUrl:  'https://acn.stacks-storage.xyz',
  network: 'mainnet'
})

// Paid file: 5 STX — use x402-payment condition with value in microSTX
const { fileId, cid, txId } = await storage.upload(file, {
  seller: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  conditions: {
    operator: 'AND',
    conditions: [{
      id: 1,
      method: 'x402-payment',
      returnValueTest: { comparator: '==', value: '5000000' }   // 5 STX
    }]
  }
})

console.log(`File registered: ${fileId}`)
console.log(`IPFS CID: ${cid}`)
```

Upload with conditions (e.g. free for token holders, 5 STX for everyone else):

```typescript
const { fileId } = await storage.upload(file, {
  seller: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
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
        returnValueTest: { comparator: '==', value: '5000000' }   // 5 STX for others
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
6. SDK fetches encrypted bytes from IPFS via CID (using the configured Pinata gateway)
7. SDK decrypts locally with the AES key — plaintext never touches a server

### Condition Examples

```typescript
// Time-locked document — unlocks at block 160000 (free)
await storage.upload(file, {
  seller: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  conditions: {
    operator: 'AND',
    conditions: [{
      id: 1,
      method: 'block-height',
      returnValueTest: { comparator: '>=', value: '160000' }
    }]
  }
})

// NFT-gated research report — 2 STX and must own NFT
await storage.upload(file, {
  seller: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
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
        returnValueTest: { comparator: '==', value: '2000000' }   // 2 STX
      }
    ]
  }
})

// DAO governance: custom Clarity contract check (free for members)
await storage.upload(file, {
  seller: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  conditions: {
    operator: 'AND',
    conditions: [{
      id: 1,
      method: 'contract-call',
      contractAddress: 'SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.dao-governance',
      function: 'is-member',
      parameters: [':userAddress'],
      returnValueTest: { comparator: '==', value: 'true' }   // boolean for is-member
    }]
  }
})
```

---

## Web Marketplace

The web app at `web/` is a Next.js 14 application with two distinct experiences. It includes a **Documentation** section (Overview, How It Works, Access Conditions, SDK, Web Marketplace, API Reference, Roadmap) and uses the shared UI components (Dialog, Select, etc.).

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
- When the connected wallet has passed all requirements, a "You have access" state is shown (backend checks via `GET /files/:fileId?address=...` and returns `accessGranted`)
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
  "seller":       "string — Stacks address",
  "encryptedKey": "string — iv:aesKeyBase64",
  "conditions": {
    "operator": "OR",
    "conditions": [...]
  }
}
```

`priceUstx` is optional. When omitted, the ACN derives it from the x402-payment condition (the condition's `value` in microSTX). Include `priceUstx` only if you need to override that.

**Response `201`:**

```json
{
  "txId":   "0xabc123...",
  "fileId": "string",
  "cid":    "string"
}
```

---

### Files Endpoints

#### `GET /files`

List all files (public info). Query: optional `seller` to filter by seller. Response: `{ files: [...] }`.

#### `GET /files/:fileId`

Get public info for a single file (no encrypted key). Response includes on-chain data: `accessCount`, `active`.

**Optional query:** `address` — when provided, the ACN checks whether this address has passed all access requirements (payment + conditions) and includes `accessGranted: true | false` in the response. Used by the file detail page to show "You have access" for the connected wallet.

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

## Roadmap

### Decentralized Key Management (KMS)

The Key Management System is currently **centralized**: the ACN stores encrypted AES keys and releases them when access conditions are met. The roadmap is to **decentralize the KMS** so that key storage and release are not dependent on a single operator (e.g. threshold encryption, distributed key shards, or on-chain/contract-based release logic).

### Payment distribution

Payment distribution is currently **centralized**: when the ACN receives payment (via x402), the operator **manually transfers 97% to the seller** and **3% to the protocol treasury** (the payment-clar / acn-payments contract address or a configured treasury address). A future step is to switch to on-chain distribution by calling the payment-clar smart contract so that splits happen automatically in a single transaction.

---

## License

MIT
