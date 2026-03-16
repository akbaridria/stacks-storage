"use client";

import Link from "next/link";
import {
  BookOpen,
  ArrowLeft,
  Zap,
  Shield,
  Code,
  Globe,
  FileCode,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const navItems = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "how-it-works", label: "How It Works", icon: Zap },
  { id: "access-conditions", label: "Access Conditions", icon: Shield },
  { id: "sdk", label: "SDK", icon: Code },
  { id: "web-marketplace", label: "Web Marketplace", icon: Globe },
  { id: "api-reference", label: "Developer API Reference", icon: FileCode },
  { id: "roadmap", label: "Roadmap", icon: MapPin },
];

export default function DocumentationPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Button
        variant="ghost"
        asChild
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Home
        </Link>
      </Button>

      <div className="flex gap-8">
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              On this page
            </p>
            {navItems.map(({ id, label, icon: Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-1.5 rounded-md transition-colors"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-16">
          <div>
            <h1 className="text-2xl font-bold mb-2">Documentation</h1>
            <p className="text-muted-foreground">
              Encrypted file storage on IPFS with programmable access control,
              powered by the Stacks blockchain and Bitcoin finality.
            </p>
          </div>

          {/* Overview */}
          <section id="overview" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              Overview
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-4 text-muted-foreground">
              <p>
                Stacks Storage solves a specific problem:{" "}
                <strong className="text-foreground">
                  how do you sell or gate access to a file without trusting a
                  centralized platform?
                </strong>
              </p>
              <p>
                Traditional approaches (Google Drive paywalls, Gumroad, Patreon)
                require:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>An account on both sides</li>
                <li>A platform that can revoke access at any time</li>
                <li>Payment rails that can freeze funds</li>
                <li>A server that stores your file and can leak it</li>
              </ul>
              <p>Stacks Storage takes a different approach:</p>
              <div className="overflow-x-auto">
                <table className="w-full border border-border rounded-lg text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-3 font-medium text-foreground">
                        Concern
                      </th>
                      <th className="text-left p-3 font-medium text-foreground">
                        How we handle it
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-3">File storage</td>
                      <td className="p-3">
                        Encrypted bytes on IPFS + Filecoin — permanent,
                        decentralized
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">Who can decrypt</td>
                      <td className="p-3">
                        Conditions checked on Stacks blockchain — no central
                        authority
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">Payment</td>
                      <td className="p-3">
                        x402 protocol — buyer pays in STX, no account needed
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">File privacy</td>
                      <td className="p-3">
                        AES-256 encrypted in the browser before upload — server
                        never sees plaintext
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3">Audit trail</td>
                      <td className="p-3">
                        Every access payment is anchored to Bitcoin via Stacks
                        PoX
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section id="how-it-works" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary" />
              How It Works
            </h2>
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre">
                  {`SELLER                          ACN (Access Control Node)          BUYER

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
                                                                    ✓ file`}
                </pre>
              </CardContent>
            </Card>
          </section>

          {/* Access Conditions */}
          <section id="access-conditions" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              Access Conditions
            </h2>
            <div className="space-y-6 text-sm text-muted-foreground">
              <p>
                Conditions are the rules that determine who can decrypt a file.
                The seller defines them at upload time. The ACN evaluates them
                on every access request against live Stacks chain state.
              </p>

              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Condition Types
                </h3>
                <ul className="space-y-4">
                  <li>
                    <strong className="text-foreground">x402-payment</strong> —
                    The buyer pays a fixed amount of STX. Payment is handled by
                    x402-stacks; no contractAddress needed.
                  </li>
                  <li>
                    <strong className="text-foreground">stx-balance</strong> —
                    The buyer must hold a minimum amount of STX (e.g.{" "}
                    <code className="bg-muted px-1 rounded">
                      {"comparator: '>=', value: '1000000000'"}
                    </code>{" "}
                    for 1000 STX in microSTX).
                  </li>
                  <li>
                    <strong className="text-foreground">sip010-balance</strong>{" "}
                    — Minimum balance of a SIP-010 fungible token. Use{" "}
                    <code className="bg-muted px-1 rounded">
                      contractAddress
                    </code>{" "}
                    for the token contract.
                  </li>
                  <li>
                    <strong className="text-foreground">sip009-owner</strong> —
                    Buyer must own at least one NFT from a SIP-009 collection.
                    Use{" "}
                    <code className="bg-muted px-1 rounded">
                      contractAddress
                    </code>{" "}
                    for the NFT contract.
                  </li>
                  <li>
                    <strong className="text-foreground">contract-call</strong> —
                    Call any read-only Clarity function. Use{" "}
                    <code className="bg-muted px-1 rounded">function</code>,{" "}
                    <code className="bg-muted px-1 rounded">parameters</code>{" "}
                    (e.g.{" "}
                    <code className="bg-muted px-1 rounded">
                      [':userAddress']
                    </code>{" "}
                    for buyer address).
                  </li>
                  <li>
                    <strong className="text-foreground">block-height</strong> —
                    File becomes accessible at or after a Stacks block height.
                    Use for scheduled releases.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  AND / OR Operator Logic
                </h3>
                <p className="mb-2">
                  Conditions are grouped with an{" "}
                  <code className="bg-muted px-1 rounded">operator</code> field:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>
                    <strong className="text-foreground">OR</strong> — Satisfy
                    any one condition (e.g. free for token holders, paid for
                    everyone else).
                  </li>
                  <li>
                    <strong className="text-foreground">AND</strong> — All
                    conditions must pass (e.g. own NFT and pay).
                  </li>
                </ul>
                <p className="mt-2">
                  Comparators in{" "}
                  <code className="bg-muted px-1 rounded">returnValueTest</code>
                  : <code className="bg-muted px-1 rounded">==</code>,{" "}
                  <code className="bg-muted px-1 rounded">&gt;=</code>,{" "}
                  <code className="bg-muted px-1 rounded">&lt;=</code>,{" "}
                  <code className="bg-muted px-1 rounded">&gt;</code>,{" "}
                  <code className="bg-muted px-1 rounded">&lt;</code>.
                </p>
              </div>
            </div>
          </section>

          {/* SDK */}
          <section id="sdk" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Code className="h-5 w-5 text-primary" />
              SDK
            </h2>
            <div className="space-y-6 text-sm text-muted-foreground">
              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Installation
                </h3>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">
                  <code>npm install @stacks-storage/sdk</code>
                </pre>
                <p className="mt-2">
                  Works in browser and Node.js. AES-256 uses native crypto.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Seller: Upload a File
                </h3>
                <p className="mb-2">
                  Price is set only via the{" "}
                  <strong className="text-foreground">x402-payment</strong>{" "}
                  condition (value = amount in microSTX). No top-level price
                  field.
                </p>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">{`const storage = new StacksStorage({
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
      returnValueTest: { comparator: '==', value: '5000000' }  // 5 STX in microSTX
    }]
  }
})`}</pre>
                <p className="mt-2">
                  Add more conditions for token gates, NFT ownership,
                  block-height, or custom contract calls. Omit conditions (or
                  use only non-payment conditions) for free files.
                </p>
              </div>

              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Buyer: Access a File
                </h3>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto">{`const { file, txId } = await storage.access('your-file-id', {
  wallet: {
    address:    'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    privateKey: process.env.PRIVATE_KEY!
  }
})
// file is a Blob — save or display it`}</pre>
                <p className="mt-2">
                  Flow: SDK gets 402 → x402-stacks signs payment → facilitator
                  broadcasts → ACN verifies and releases key → SDK fetches from
                  IPFS and decrypts locally.
                </p>
              </div>
            </div>
          </section>

          {/* Web Marketplace */}
          <section id="web-marketplace" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-primary" />
              Web Marketplace
            </h2>
            <div className="space-y-6 text-sm text-muted-foreground">
              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Seller Dashboard
                </h3>
                <p>
                  Connect Hiro wallet for a personal dashboard. Upload: drag &
                  drop, set price (or 0), add conditions with the visual
                  builder, then share the file page URL or use the embed button.
                </p>
                <p className="mt-2">
                  Dashboard shows per file: IPFS CID, tx link, access count,
                  revenue, conditions, and option to update price or deactivate.
                </p>
                <p className="mt-2">Embed:</p>
                <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto mt-1">{`<script src="https://stacks-storage.xyz/embed.js"
        data-file-id="abc123"
        data-label="Buy for 5 STX">
</script>`}</pre>
              </div>

              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Buyer Marketplace
                </h3>
                <p>
                  Public feed of all active files. Filter by type, price, sort
                  by newest/lowest price, search by title or seller. File page
                  shows name, description, type, size, price, conditions,
                  seller, and Buy button. After purchase, file decrypts in
                  browser and download prompt appears.
                </p>
              </div>
            </div>
          </section>

          {/* Developer API Reference */}
          <section id="api-reference" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <FileCode className="h-5 w-5 text-primary" />
              Developer API Reference
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Base URL:{" "}
              <code className="bg-muted px-1 rounded">
                https://acn.stacks-storage.xyz
              </code>
              . JSON unless noted.
            </p>

            <div className="space-y-6">
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-medium text-foreground">
                    Upload Endpoints
                  </h3>
                  <p>
                    <strong>POST /upload/ipfs</strong> — multipart/form-data,
                    field <code className="bg-muted px-1 rounded">file</code>.
                    Returns{" "}
                    <code className="bg-muted px-1 rounded">{"{ cid }"}</code>{" "}
                    (201).
                  </p>
                  <p>
                    <strong>POST /upload/register</strong> — Body: fileId, cid,
                    seller, encryptedKey, conditions (required).{" "}
                    <code className="bg-muted px-1 rounded">priceUstx</code> is
                    optional; when omitted, derived from the x402-payment
                    condition. Returns{" "}
                    <code className="bg-muted px-1 rounded">
                      {"{ txId, fileId, cid }"}
                    </code>{" "}
                    (201).
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-medium text-foreground">
                    Access Endpoints
                  </h3>
                  <p>
                    <strong>GET /access/:fileId</strong> — Optional{" "}
                    <code className="bg-muted px-1 rounded">X-PAYMENT</code>{" "}
                    header (x402). Returns 402 (payment required), 200 (cid,
                    encryptedKey, buyerAddress, txId), 403 (conditions not met),
                    410 (file deactivated).
                  </p>
                </CardContent>
              </Card>

              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Error Codes
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-border rounded-lg text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left p-3 font-medium text-foreground">
                          Status
                        </th>
                        <th className="text-left p-3 font-medium text-foreground">
                          Meaning
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-muted-foreground">
                      <tr>
                        <td className="p-3">400</td>
                        <td className="p-3">Invalid request body</td>
                      </tr>
                      <tr>
                        <td className="p-3">402</td>
                        <td className="p-3">
                          Payment required — attach X-PAYMENT
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3">403</td>
                        <td className="p-3">Access conditions not met</td>
                      </tr>
                      <tr>
                        <td className="p-3">404</td>
                        <td className="p-3">File not found</td>
                      </tr>
                      <tr>
                        <td className="p-3">410</td>
                        <td className="p-3">File deactivated</td>
                      </tr>
                      <tr>
                        <td className="p-3">500</td>
                        <td className="p-3">Internal server error</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>

          {/* Roadmap */}
          <section id="roadmap" className="scroll-mt-24">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              Roadmap
            </h2>
            <div className="space-y-6 text-sm text-muted-foreground">
              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Decentralized Key Management (KMS)
                </h3>
                <p>
                  The Key Management System is currently{" "}
                  <strong className="text-foreground">centralized</strong>: the
                  ACN stores encrypted AES keys and releases them when access
                  conditions are met. The roadmap is to{" "}
                  <strong className="text-foreground">
                    decentralize the KMS
                  </strong>{" "}
                  so that key storage and release are not dependent on a single
                  operator — e.g. via threshold encryption, distributed key
                  shards, or on-chain/contract-based release logic.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  Payment distribution
                </h3>
                <p>
                  Payment distribution is currently{" "}
                  <strong className="text-foreground">centralized</strong>: when
                  the ACN receives payment (via x402), the operator manually
                  transfers{" "}
                  <strong className="text-foreground">97% to the seller</strong>{" "}
                  and{" "}
                  <strong className="text-foreground">
                    3% to the protocol treasury
                  </strong>{" "}
                  (the payment-clar / acn-payments contract address). A future
                  step is to switch to on-chain distribution by calling the
                  payment-clar smart contract so that splits happen
                  automatically in a single transaction.
                </p>
              </div>
            </div>
          </section>

          <div className="pt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <ChevronRight className="h-4 w-4" />
            <Link
              href="/marketplace"
              className="hover:text-foreground transition-colors"
            >
              Browse the Marketplace
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
