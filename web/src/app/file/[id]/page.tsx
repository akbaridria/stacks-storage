"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchFileDetail, fetchFiles, type FileDetail, type PublicFile } from "@/lib/acn";
import { useWallet } from "@/context/WalletContext";
import { BuyButton } from "@/components/BuyButton";
import { FileCard } from "@/components/FileCard";
import {
  ustxToStx,
  formatFileSize,
  truncateAddress,
  STACKS_EXPLORER,
} from "@/lib/constants";
import {
  FileText,
  Film,
  Database,
  Code,
  File,
  ExternalLink,
  ArrowLeft,
  Eye,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeIcons: Record<string, typeof FileText> = {
  document: FileText,
  video: Film,
  dataset: Database,
  software: Code,
  other: File,
};

function conditionLabel(method: string): string {
  const labels: Record<string, string> = {
    "x402-payment": "x402 Payment",
    "stx-balance": "STX Balance",
    "sip010-balance": "SIP-010 Token Balance",
    "sip009-owner": "SIP-009 NFT Ownership",
    "contract-call": "Custom Contract Call",
    "block-height": "Block Height",
  };
  return labels[method] ?? method;
}

export default function FileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useWallet();
  const [file, setFile] = useState<FileDetail | null>(null);
  const [sellerFiles, setSellerFiles] = useState<PublicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchFileDetail(id, address ?? undefined)
      .then((f) => {
        setFile(f);
        fetchFiles(f.seller).then((list) =>
          setSellerFiles(list.filter((sf) => sf.fileId !== f.fileId).slice(0, 3))
        );
      })
      .catch(() => setError("File not found"))
      .finally(() => setLoading(false));
  }, [id, address]);

  function copyId() {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-accent mx-auto mb-4" />
        <h1 className="text-xl font-bold">File Not Found</h1>
        <p className="text-muted-foreground mt-2">
          This file may have been removed or the ID is invalid.
        </p>
        <Button asChild variant="secondary" className="mt-6">
          <Link href="/marketplace">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Marketplace
          </Link>
        </Button>
      </div>
    );
  }

  const Icon = typeIcons[file.fileType] ?? File;
  const isFree = file.priceUstx === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Button variant="ghost" asChild className="mb-6 text-muted-foreground hover:text-foreground">
        <Link href="/marketplace">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Marketplace
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-4 text-primary">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-xl font-bold truncate">
                      {file.name || "Untitled"}
                    </h1>
                    {!file.active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {file.description || "No description provided."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  File Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="capitalize">{file.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{formatFileSize(file.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accesses</span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      {file.accessCount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  On-Chain
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">File ID</span>
                    <Button variant="ghost" size="sm" onClick={copyId} className="font-mono text-xs h-auto p-0">
                      {id!.slice(0, 12)}...
                      {copied ? <Check className="h-3 w-3 ml-1 text-primary" /> : <Copy className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IPFS CID</span>
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">
                      {file.cid}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Seller</span>
                    <a
                      href={`${STACKS_EXPLORER}/address/${file.seller}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline text-xs"
                    >
                      {truncateAddress(file.seller)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {file.conditions && file.conditions.conditions.length > 0 && (
            <Card>
              <CardContent>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Access Conditions
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Requires{" "}
                    <span className="font-semibold text-primary">
                      {file.conditions.operator === "AND" ? "ALL" : "ANY"}
                    </span>{" "}
                    of the following:
                  </span>
                </div>
                <div className="space-y-2">
                  {file.conditions.conditions.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-lg bg-muted border border-border px-4 py-2.5 text-sm"
                    >
                      <span className="font-medium">{conditionLabel(c.method)}</span>
                      {c.contractAddress && (
                        <span className="ml-2 text-xs text-muted-foreground font-mono">
                          {truncateAddress(c.contractAddress)}
                        </span>
                      )}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.returnValueTest.comparator} {c.returnValueTest.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="sticky top-24">
            <CardContent>
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-1">Price</p>
                <p className="text-3xl font-bold">
                  {isFree ? (
                    <span className="text-primary">Free</span>
                  ) : (
                    <>
                      {ustxToStx(file.priceUstx)}{" "}
                      <span className="text-lg font-normal text-muted-foreground">STX</span>
                    </>
                  )}
                </p>
              </div>

              {file.accessGranted && (
                <div className="rounded-lg bg-primary/10 text-primary text-sm font-medium py-3 px-4 text-center mb-4">
                  You have access to this file
                </div>
              )}
              {file.active ? (
                <BuyButton
                  fileId={file.fileId}
                  priceUstx={file.priceUstx}
                  seller={file.seller}
                  fileName={file.name}
                />
              ) : (
                <div className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
                  This file has been deactivated by the seller.
                </div>
              )}

              <div className="pt-4 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  File decrypted locally in your browser
                </p>
                <p className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Payment recorded on Stacks blockchain
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
