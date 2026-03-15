"use client";

import Link from "next/link";
import {
  Shield,
  Lock,
  Zap,
  Globe,
  ArrowRight,
  Upload,
  Key,
  Download,
  Blocks,
  FileCheck,
  Coins,
} from "lucide-react";

const FEATURES = [
  {
    icon: Lock,
    title: "Client-Side Encryption",
    desc: "AES-256 encryption happens in your browser. Your file's plaintext never touches a server.",
  },
  {
    icon: Globe,
    title: "Decentralized Storage",
    desc: "Encrypted bytes live on IPFS + Filecoin. No single point of failure, no takedowns.",
  },
  {
    icon: Zap,
    title: "Instant x402 Payments",
    desc: "Buyers pay in STX with no accounts or sign-ups. One click, one transaction.",
  },
  {
    icon: Blocks,
    title: "Bitcoin Finality",
    desc: "Every payment is anchored to Bitcoin via Stacks Proof of Transfer. Immutable receipts.",
  },
  {
    icon: FileCheck,
    title: "Programmable Access",
    desc: "Gate files by token balance, NFT ownership, block height, or custom Clarity contracts.",
  },
  {
    icon: Coins,
    title: "97% Revenue",
    desc: "Sellers keep 97% of every sale. 3% protocol fee. No middlemen, no surprise cuts.",
  },
];

const STEPS = [
  {
    icon: Upload,
    step: "01",
    title: "Upload & Encrypt",
    desc: "Drag and drop any file. It's encrypted in your browser with AES-256 and pinned to IPFS.",
  },
  {
    icon: Key,
    step: "02",
    title: "Set Conditions",
    desc: "Set a price in STX, or define access conditions — token gates, NFT ownership, DAO membership.",
  },
  {
    icon: Download,
    step: "03",
    title: "Buyers Access",
    desc: "Buyers pay via x402, conditions are checked on-chain, AES key is released, file decrypts locally.",
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-brand-600/10 blur-[128px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/5 px-4 py-1.5 text-sm text-brand-300 mb-8">
            <Shield className="h-4 w-4" />
            Powered by Stacks & Bitcoin
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Sell access to any file.
            <br />
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent">
              No platform needed.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400 leading-relaxed">
            Upload, encrypt, and gate access to files on IPFS. Define who can
            decrypt — by payment, token balance, NFT ownership, or custom logic.
            Powered by Stacks smart contracts and x402 instant payments.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/marketplace" className="btn-primary px-8 py-3 text-base">
              Browse Marketplace
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="btn-secondary px-8 py-3 text-base">
              Start Selling
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-gray-800/60 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-gray-500">Three steps. No accounts. No intermediaries.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="card relative p-6">
                <span className="absolute -top-3 left-6 rounded-full bg-brand-600 px-3 py-0.5 text-xs font-bold">
                  {s.step}
                </span>
                <div className="mt-2 rounded-lg bg-brand-600/10 p-3 w-fit text-brand-400">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-800/60 py-24 bg-gray-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Why Stacks Storage</h2>
            <p className="mt-3 text-gray-500">
              True ownership and privacy for your digital assets.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card p-6 transition-all hover:border-gray-700"
              >
                <div className="rounded-lg bg-brand-600/10 p-2.5 w-fit text-brand-400">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-800/60 py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-4 text-gray-400">
            Upload your first file in under a minute. No sign-up required — just
            connect your Stacks wallet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary px-8 py-3 text-base">
              Upload a File
              <Upload className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/marketplace" className="btn-secondary px-8 py-3 text-base">
              Explore Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
