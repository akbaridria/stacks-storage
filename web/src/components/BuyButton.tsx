"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/context/WalletContext";
import { accessFile, PaymentRequiredError } from "@/lib/acn";
import { deserializeKey, decryptFile } from "@/lib/crypto";
import { IPFS_GATEWAYS, ustxToStx, STACKS_NETWORK } from "@/lib/constants";
import { Loader2, Download, ShoppingCart, Wallet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  fileId: string;
  priceUstx: number;
  seller: string;
  fileName: string;
  /** When true, x402-payment condition is met (user has paid). Disable buy to avoid double payment. */
  paymentConditionMet?: boolean;
  /** When true, all conditions are met and user has access. */
  accessGranted?: boolean;
}

type BuyStep =
  | "checking"
  | "idle"
  | "ready"
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
      const e = err as { status?: number };
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

export function BuyButton({ fileId, priceUstx, seller, fileName, paymentConditionMet, accessGranted }: Props) {
  const { address, connected, connect } = useWallet();
  const [step, setStep] = useState<BuyStep>("checking");
  const [confirmAttempt, setConfirmAttempt] = useState(0);
  const [error, setError] = useState("");
  const cachedAccess = useRef<AccessResult | null>(null);

  const isFree = priceUstx === 0;
  const paidButOtherConditionsNotMet = Boolean(paymentConditionMet && !accessGranted && !isFree);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      if (!connected || !address) {
        setStep("idle");
        return;
      }

      setStep("checking");
      try {
        const result = await accessFile(fileId, { buyer: address });
        if (cancelled) return;
        cachedAccess.current = result;
        setStep("ready");
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { status?: number };
        setStep(e.status === 402 ? "idle" : "idle");
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

  const isDisabled =
    step === "checking" ||
    step === "paying" ||
    step === "confirming" ||
    step === "downloading" ||
    step === "decrypting" ||
    paidButOtherConditionsNotMet;

  const label =
    step === "checking"
      ? "Checking access..."
      : step === "ready"
      ? "Download Again"
      : step === "idle"
      ? paidButOtherConditionsNotMet
        ? "Already paid — other conditions not met"
        : connected
        ? isFree
          ? "Download Free"
          : `Buy for ${ustxToStx(priceUstx)} STX`
        : "Connect Wallet to Buy"
      : step === "paying"
      ? "Approve payment in wallet..."
      : step === "confirming"
      ? confirmAttempt > 1
        ? `Waiting for confirmation... (${confirmAttempt})`
        : "Waiting for confirmation..."
      : step === "downloading"
      ? "Fetching from IPFS..."
      : step === "decrypting"
      ? "Decrypting..."
      : step === "done"
      ? "Downloaded!"
      : "Try Again";

  const variant =
    step === "done" || step === "ready"
      ? "default"
      : step === "error"
      ? "destructive"
      : "default";

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        variant={variant}
        className="w-full"
      >
        {step === "checking" || step === "paying" || step === "confirming" || step === "downloading" || step === "decrypting" ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : step === "ready" || step === "done" ? (
          <Download className="h-4 w-4 mr-2" />
        ) : step === "error" ? (
          <RefreshCw className="h-4 w-4 mr-2" />
        ) : (
          connected ? <ShoppingCart className="h-4 w-4 mr-2" /> : <Wallet className="h-4 w-4 mr-2" />
        )}
        {label}
      </Button>
      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
