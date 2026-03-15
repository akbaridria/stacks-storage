"use client";

import Link from "next/link";
import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/constants";
import { Shield, LogOut } from "lucide-react";

export function Navbar() {
  const { address, connected, connect, disconnect } = useWallet();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <Shield className="h-6 w-6 text-brand-400" />
            <span>
              Stacks <span className="text-brand-400">Storage</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/marketplace"
              className="text-sm text-gray-400 transition-colors hover:text-gray-100"
            >
              Marketplace
            </Link>
            {connected && (
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 transition-colors hover:text-gray-100"
              >
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {connected ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="btn-secondary text-xs py-2">
                {truncateAddress(address!)}
              </Link>
              <button
                onClick={disconnect}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
                title="Disconnect"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={connect} className="btn-primary text-sm">
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
