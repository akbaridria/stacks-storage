import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Stacks Storage</span>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Encrypted files on IPFS. Programmable access on Stacks. Payments via x402.
          </p>
        </div>
      </div>
    </footer>
  );
}
