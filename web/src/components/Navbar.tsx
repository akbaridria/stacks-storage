"use client";

import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/constants";
import { Shield, LogOut, ArrowRight, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { address, connected, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <Shield className="h-6 w-6 text-primary" />
            <span>
              Stacks <span className="text-primary">Storage</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/marketplace"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Marketplace
            </Link>
            <Link
              href="/documentation"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Documentation
            </Link>
            {connected && (
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {connected ? (
            <div className="flex items-center gap-3">
              <Button variant="secondary" asChild>
                <Link href="/dashboard">
                  {truncateAddress(address!).toLowerCase()}
                  <ArrowRight
                    className="h-4 w-4"
                  />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={disconnect}
                title="Disconnect"
              >
                <Power />
              </Button>
            </div>
          ) : (
            <Button onClick={connect}>Connect Wallet</Button>
          )}
        </div>
      </div>
    </header>
  );
}
