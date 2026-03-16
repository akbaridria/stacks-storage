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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[128px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary mb-8">
            <Shield className="h-4 w-4" />
            Powered by Stacks & Bitcoin
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Sell access to any file.
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              No platform needed.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Sell ebooks, courses, music, or any file — and get paid in STX. Buyers
            pay once, download instantly, no sign-ups. Your content, your rules:
            set a price, gate by tokens or NFTs, or keep it free. Powered by
            Stacks and Bitcoin.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/marketplace">
                Browse Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="text-base px-8">
              <Link href="/dashboard">Start Selling</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How it works</h2>
            <p className="mt-3 text-muted-foreground">Three steps. No accounts. No intermediaries.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.step} className="relative">
                <span className="absolute -top-3 left-6 z-10 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                  {s.step}
                </span>
                <Card>
                <CardContent className="pt-6">
                  <div className="rounded-lg bg-primary/10 p-3 w-fit text-primary">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {s.desc}
                  </p>
                </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className=" py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">Why Stacks Storage</h2>
            <p className="mt-3 text-muted-foreground">
              True ownership and privacy for your digital assets.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card
                key={f.title}
                className="transition-all hover:border-primary/30"
              >
                <CardContent className="p-6">
                  <div className="rounded-lg bg-primary/10 p-2.5 w-fit text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className=" py-24">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mt-4 text-muted-foreground">
            Upload your first file in under a minute. No sign-up required — just
            connect your Stacks wallet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="text-base px-8">
              <Link href="/dashboard">
                Upload a File
                <Upload className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg" className="text-base px-8">
              <Link href="/marketplace">Explore Marketplace</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
