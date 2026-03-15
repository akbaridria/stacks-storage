"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/context/WalletContext";
import { accessFile, PaymentRequiredError } from "@/lib/acn";
import { deserializeKey, decryptFile } from "@/lib/crypto";
import { IPFS_GATEWAYS, ustxToStx, STACKS_NETWORK } from "@/lib/constants";
import { Loader2, Download, ShoppingCart, Wallet, RefreshCw } from "lucide-react";

interface Props {
  fileId: string;
  priceUstx: number;
  seller: string;
  fileName: string;
}

type BuyStep =
  | "checking"    // initial silent check on mount
  | "idle"        // needs to buy
  | "ready"       // already purchased — can download immediately
  | "paying"
  | "confirming"
  | "downloading"
  | "decrypting"
  | "done"
  | "error";

type AccessResult = { cid: string; encryptedKey: string };

async function fetchFromIPFS(cid: string): Promise<ArrayBuffer> {
  for (const gw of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gw}${cid}`);
      if (res.ok) return res.arrayBuffer();
    } catch {
      continue;
    }
  }
  throw new Error("Failed to fetch from IPFS");
}

async function pollForAccess(
  fileId: string,
  txId: string,
  buyer: string,
  onAttempt?: (attempt: number) => void,
  maxMs = 5 * 60 * 1000
): Promise<AccessResult> {
  const start = Date.now();
  let attempt = 0;
  const delays = [5000, 10000, 15000, 20000, 30000];

  while (Date.now() - start < maxMs) {
    attempt++;
    onAttempt?.(attempt);
    try {
      return await accessFile(fileId, { txId, buyer });
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 400) {
        const delay = delays[Math.min(attempt - 1, delays.length - 1)];
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Timed out waiting for transaction confirmation. Check the explorer and try again.");
}

export function BuyButton({ fileId, priceUstx, seller, fileName }: Props) {
  const { address, connected, connect } = useWallet();
  const [step, setStep] = useState<BuyStep>("checking");
  const [confirmAttempt, setConfirmAttempt] = useState(0);
  const [error, setError] = useState("");
  // Cache the access result so a "ready" user can download without re-fetching
  const cachedAccess = useRef<AccessResult | null>(null);

  const isFree = priceUstx === 0;

  // ── On mount / wallet change: silently check if user already has access ──
  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      // Not connected yet — just show idle (buy / connect)
      if (!connected || !address) {
        setStep("idle");
        return;
      }

      setStep("checking");
      try {
        const result = await accessFile(fileId, { buyer: address });
        if (cancelled) return;
        // User already has access — cache the result and show "Download Again"
        cachedAccess.current = result;
        setStep("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { status?: number };
        if (e.status === 402) {
          // Normal — not purchased yet
          setStep("idle");
        } else {
          // Any other error (403, 410, network) — still show idle so user can try
          setStep("idle");
        }
      }
    }

    checkAccess();
    return () => { cancelled = true; };
  }, [fileId, address, connected]);

  async function handleDownload(result: AccessResult) {
    setStep("downloading");
    const encryptedBytes = await fetchFromIPFS(result.cid);
    setStep("decrypting");
    const { iv, key } = deserializeKey(result.encryptedKey);
    const decrypted = await decryptFile(encryptedBytes, key, iv);

    const blob = new Blob([decrypted]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStep("done");
    setTimeout(() => setStep(cachedAccess.current ? "ready" : "idle"), 3000);
  }

  async function handleClick() {
    if (!connected) {
      connect();
      return;
    }

    // Already purchased — download directly from cache
    if (step === "ready" && cachedAccess.current) {
      try {
        await handleDownload(cachedAccess.current);
      } catch (err: unknown) {
        setError((err as Error).message ?? "Download failed");
        setStep("error");
      }
      return;
    }

    setError("");
    setConfirmAttempt(0);

    try {
      // Step 1: Try access (free files or repeat purchases go through here)
      const result = await accessFile(fileId, { buyer: address ?? undefined });
      cachedAccess.current = result;
      await handleDownload(result);
    } catch (err: unknown) {
      if (!(err instanceof PaymentRequiredError)) {
        const e = err as { status?: number; message?: string };
        if (e.status === 403) setError("Access conditions not met");
        else if (e.status === 410) setError("File no longer available");
        else setError(e.message ?? "Access failed");
        setStep("error");
        return;
      }

      // Step 2: Got 402 — pay using details from the server's response
      const { payTo, price, network } = err.payment;
      setStep("paying");

      try {
        const { openSTXTransfer, getStacksProvider } = await import("@stacks/connect");

        const provider = getStacksProvider();
        if (!provider) {
          setError("No wallet provider found. Please reconnect your wallet.");
          setStep("error");
          return;
        }

        await new Promise<void>((resolve, reject) => {
          openSTXTransfer(
            {
              recipient: payTo,
              amount: BigInt(price),
              memo: `x402:${fileId.slice(0, 28)}`,
              network: network as "mainnet" | "testnet",
              onFinish: async (data) => {
                try {
                  setStep("confirming");
                  setConfirmAttempt(0);
                  // Step 3: Poll until tx confirmed, then get access
                  const accessResult = await pollForAccess(
                    fileId,
                    data.txId,
                    address ?? "",
                    (n) => setConfirmAttempt(n)
                  );
                  cachedAccess.current = accessResult;
                  await handleDownload(accessResult);
                  resolve();
                } catch (innerErr) {
                  reject(innerErr);
                }
              },
              onCancel: () => {
                setStep("idle");
                resolve();
              },
            },
            provider
          );
        });
      } catch (payErr: unknown) {
        const e = payErr as { status?: number; message?: string };
        if (e.status === 403) setError("Access conditions not met");
        else setError(e.message ?? "Payment or access failed");
        setStep("error");
      }
    }
  }

  function getButtonContent() {
    switch (step) {
      case "checking":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking access...
          </>
        );
      case "ready":
        return (
          <>
            <Download className="h-4 w-4 mr-2" />
            Download Again
          </>
        );
      case "idle":
        return connected ? (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isFree ? "Download Free" : `Buy for ${ustxToStx(priceUstx)} STX`}
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet to Buy
          </>
        );
      case "paying":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Approve payment in wallet...
          </>
        );
      case "confirming":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            {confirmAttempt > 1
              ? `Waiting for confirmation... (${confirmAttempt})`
              : "Waiting for confirmation..."}
          </>
        );
      case "downloading":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Fetching from IPFS...
          </>
        );
      case "decrypting":
        return (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Decrypting...
          </>
        );
      case "done":
        return (
          <>
            <Download className="h-4 w-4 mr-2" />
            Downloaded!
          </>
        );
      case "error":
        return (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </>
        );
    }
  }

  const isDisabled =
    step === "checking" ||
    step === "paying" ||
    step === "confirming" ||
    step === "downloading" ||
    step === "decrypting";

  const buttonClass =
    step === "done" || step === "ready"
      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
      : step === "error"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "btn-primary";

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`w-full font-semibold rounded-lg px-6 py-3 text-sm transition-all ${buttonClass}`}
      >
        {getButtonContent()}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
