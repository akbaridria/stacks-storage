"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { fetchFiles, fetchFileDetail, type PublicFile } from "@/lib/acn";
import { ustxToStx, formatFileSize, truncateAddress, STACKS_EXPLORER } from "@/lib/constants";
import { UploadModal } from "@/components/UploadModal";
import {
  Upload,
  FileText,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Wallet,
  Loader2,
} from "lucide-react";

interface FileWithStats extends PublicFile {
  accessCount: number;
  active: boolean;
}

export default function DashboardPage() {
  const { address, connected, connect } = useWallet();
  const [files, setFiles] = useState<FileWithStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const list = await fetchFiles(address);
      const enriched = await Promise.all(
        list.map(async (f) => {
          try {
            const detail = await fetchFileDetail(f.fileId);
            return { ...f, accessCount: detail.accessCount, active: detail.active };
          } catch {
            return { ...f, accessCount: 0, active: true };
          }
        })
      );
      setFiles(enriched);
    } catch {
      // ACN may not be running
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  function copyFileId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!connected) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24">
        <div className="flex flex-col items-center justify-center text-center gap-6">
          <div className="rounded-full bg-brand-600/10 p-4">
            <Wallet className="h-10 w-10 text-brand-400" />
          </div>
          <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
          <p className="text-gray-400 max-w-md">
            Connect your Hiro wallet to view your seller dashboard, manage
            files, and track revenue.
          </p>
          <button onClick={connect} className="btn-primary px-8 py-3">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const totalRevenue = files.reduce(
    (sum, f) => sum + f.priceUstx * f.accessCount,
    0
  );
  const totalAccesses = files.reduce((sum, f) => sum + f.accessCount, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {truncateAddress(address!)}
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Files</p>
          <p className="text-2xl font-bold mt-1">{files.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Accesses</p>
          <p className="text-2xl font-bold mt-1">{totalAccesses}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Est. Revenue</p>
          <p className="text-2xl font-bold mt-1">
            {ustxToStx(totalRevenue)}{" "}
            <span className="text-sm font-normal text-gray-500">STX</span>
          </p>
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center">
          <FileText className="h-12 w-12 text-gray-700" />
          <p className="text-gray-500">No files yet. Upload your first file to get started.</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Accesses</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {files.map((f) => (
                  <tr key={f.fileId} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-200 truncate max-w-[200px]">
                          {f.name || "Untitled"}
                        </p>
                        <p className="text-xs text-gray-600 font-mono truncate max-w-[200px]">
                          {f.fileId.slice(0, 16)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {f.priceUstx === 0 ? (
                        <span className="text-emerald-400">Free</span>
                      ) : (
                        `${ustxToStx(f.priceUstx)} STX`
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Eye className="h-3.5 w-3.5 text-gray-600" />
                        {f.accessCount}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400">
                      {formatFileSize(f.fileSize)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.active
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {f.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => copyFileId(f.fileId)}
                          className="rounded p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                          title="Copy file ID"
                        >
                          {copiedId === f.fileId ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <a
                          href={`/file/${f.fileId}`}
                          className="rounded p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                          title="View file page"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Embed snippet for first file */}
      {files.length > 0 && (
        <div className="mt-8 card p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Embed Button
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Add this snippet to any website to let users purchase your file:
          </p>
          <pre className="rounded-lg bg-gray-800 p-3 text-xs text-gray-400 overflow-x-auto">
            {`<script src="https://stacks-storage.xyz/embed.js"\n        data-file-id="${files[0].fileId}"\n        data-label="Buy for ${ustxToStx(files[0].priceUstx)} STX">\n</script>`}
          </pre>
        </div>
      )}

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={loadFiles}
      />
    </div>
  );
}
