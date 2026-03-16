"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/context/WalletContext";
import { fetchFiles, fetchFileDetail, type PublicFile } from "@/lib/acn";
import { ustxToStx, formatFileSize, truncateAddress } from "@/lib/constants";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
          <div className="rounded-full bg-primary/10 p-4">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Connect Your Wallet</h1>
          <p className="text-muted-foreground max-w-md">
            Connect your Hiro wallet to view your seller dashboard, manage
            files, and track revenue.
          </p>
          <Button onClick={connect} size="lg" className="px-8 py-3">
            Connect Wallet
          </Button>
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {truncateAddress(address!)}
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Files</p>
            <p className="text-2xl font-bold mt-1">{files.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total Accesses</p>
            <p className="text-2xl font-bold mt-1">{totalAccesses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Est. Revenue</p>
            <p className="text-2xl font-bold mt-1">
              {ustxToStx(totalRevenue)}{" "}
              <span className="text-sm font-normal text-muted-foreground">STX</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No files yet. Upload your first file to get started.</p>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Accesses</th>
                  <th className="px-5 py-3">Size</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {files.map((f) => (
                  <tr key={f.fileId} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-card-foreground truncate max-w-[200px]">
                          {f.name || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                          {f.fileId.slice(0, 16)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {f.priceUstx === 0 ? (
                        <Badge variant="default">Free</Badge>
                      ) : (
                        `${ustxToStx(f.priceUstx)} STX`
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        {f.accessCount}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {formatFileSize(f.fileSize)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={f.active ? "default" : "destructive"}>
                        {f.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyFileId(f.fileId)}
                          title="Copy file ID"
                        >
                          {copiedId === f.fileId ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/file/${f.fileId}`} title="View file page">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {files.length > 0 && (
        <Card className="mt-8">
          <CardContent>
            <h3 className="text-sm font-semibold text-card-foreground mb-2">
              Embed Button
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Add this snippet to any website to let users purchase your file:
            </p>
            <pre className="rounded-lg bg-muted p-3 text-xs text-muted-foreground overflow-x-auto">
              {`<script src="https://stacks-storage.xyz/embed.js"\n        data-file-id="${files[0].fileId}"\n        data-label="Buy for ${ustxToStx(files[0].priceUstx)} STX">\n</script>`}
            </pre>
          </CardContent>
        </Card>
      )}

      <UploadModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={loadFiles}
      />
    </div>
  );
}
