"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchFileDetail, fetchFiles, type FileDetail, type PublicFile } from "@/lib/acn";
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
  const [file, setFile] = useState<FileDetail | null>(null);
  const [sellerFiles, setSellerFiles] = useState<PublicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchFileDetail(id)
      .then((f) => {
        setFile(f);
        fetchFiles(f.seller).then((list) =>
          setSellerFiles(list.filter((sf) => sf.fileId !== f.fileId).slice(0, 3))
        );
      })
      .catch(() => setError("File not found"))
      .finally(() => setLoading(false));
  }, [id]);

  function copyId() {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold">File Not Found</h1>
        <p className="text-gray-500 mt-2">
          This file may have been removed or the ID is invalid.
        </p>
        <Link href="/marketplace" className="btn-secondary mt-6 inline-flex">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const Icon = typeIcons[file.fileType] ?? File;
  const isFree = file.priceUstx === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Marketplace
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-brand-600/10 p-4 text-brand-400">
                <Icon className="h-8 w-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold truncate">
                    {file.name || "Untitled"}
                  </h1>
                  {!file.active && (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {file.description || "No description provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                File Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="capitalize text-gray-300">{file.fileType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Size</span>
                  <span className="text-gray-300">{formatFileSize(file.fileSize)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Uploaded</span>
                  <span className="text-gray-300">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Accesses</span>
                  <span className="flex items-center gap-1 text-gray-300">
                    <Eye className="h-3.5 w-3.5 text-gray-600" />
                    {file.accessCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="card p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                On-Chain
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">File ID</span>
                  <button
                    onClick={copyId}
                    className="flex items-center gap-1 text-gray-400 hover:text-gray-200 font-mono text-xs"
                  >
                    {id.slice(0, 12)}...
                    {copied ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">IPFS CID</span>
                  <span className="font-mono text-xs text-gray-400 truncate max-w-[140px]">
                    {file.cid}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Seller</span>
                  <a
                    href={`${STACKS_EXPLORER}/address/${file.seller}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-brand-400 hover:text-brand-300 text-xs"
                  >
                    {truncateAddress(file.seller)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          {file.conditions && file.conditions.conditions.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Access Conditions
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-brand-400" />
                <span className="text-sm text-gray-300">
                  Requires{" "}
                  <span className="font-semibold text-brand-300">
                    {file.conditions.operator === "AND" ? "ALL" : "ANY"}
                  </span>{" "}
                  of the following:
                </span>
              </div>
              <div className="space-y-2">
                {file.conditions.conditions.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-gray-800/50 border border-gray-800 px-4 py-2.5 text-sm"
                  >
                    <span className="text-gray-300 font-medium">
                      {conditionLabel(c.method)}
                    </span>
                    {c.contractAddress && (
                      <span className="ml-2 text-xs text-gray-500 font-mono">
                        {truncateAddress(c.contractAddress)}
                      </span>
                    )}
                    <span className="ml-2 text-xs text-gray-500">
                      {c.returnValueTest.comparator} {c.returnValueTest.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — Buy */}
        <div className="space-y-6">
          <div className="card p-6 sticky top-24">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-1">Price</p>
              <p className="text-3xl font-bold">
                {isFree ? (
                  <span className="text-emerald-400">Free</span>
                ) : (
                  <>
                    {ustxToStx(file.priceUstx)}{" "}
                    <span className="text-lg font-normal text-gray-500">STX</span>
                  </>
                )}
              </p>
            </div>

            {file.active ? (
              <BuyButton
                fileId={file.fileId}
                priceUstx={file.priceUstx}
                seller={file.seller}
                fileName={file.name}
              />
            ) : (
              <div className="rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-400">
                This file has been deactivated by the seller.
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-gray-800 space-y-2 text-xs text-gray-600">
              <p className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                File decrypted locally in your browser
              </p>
              <p className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                Payment recorded on Stacks blockchain
              </p>
            </div>
          </div>

          {/* Seller's other files */}
          {sellerFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">
                More from this seller
              </h3>
              <div className="space-y-3">
                {sellerFiles.map((sf) => (
                  <FileCard key={sf.fileId} file={sf} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
