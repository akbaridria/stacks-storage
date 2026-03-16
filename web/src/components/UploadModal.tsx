"use client";

import { useState, useRef, type DragEvent } from "react";
import { Upload, Loader2, Check, File as FileIcon } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { uploadToIpfs, registerFile, type ConditionGroup } from "@/lib/acn";
import { generateKey, encryptFile, serializeKey, sha256Hex } from "@/lib/crypto";
import { formatFileSize, FILE_TYPES } from "@/lib/constants";
import { ConditionBuilder, extractPriceFromConditions } from "./ConditionBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "form" | "uploading" | "done";

export function UploadModal({ open, onClose, onSuccess }: Props) {
  const { address } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fileType, setFileType] = useState<string>("other");
  const [conditions, setConditions] = useState<ConditionGroup | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [status, setStatus] = useState("");
  const [resultTxId, setResultTxId] = useState("");
  const [resultFileId, setResultFileId] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setFile(null);
    setName("");
    setDescription("");
    setFileType("other");
    setConditions(null);
    setStep("form");
    setStatus("");
    setResultTxId("");
    setResultFileId("");
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(f: File) {
    setFile(f);
    if (!name) setName(f.name);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleUpload() {
    if (!file || !address) return;
    setError("");
    setStep("uploading");

    try {
      setStatus("Generating encryption key...");
      const { key, iv } = await generateKey();

      setStatus("Encrypting file in browser...");
      const plaintext = await file.arrayBuffer();
      const ciphertext = await encryptFile(plaintext, key, iv);

      setStatus("Pinning encrypted file to IPFS...");
      const cid = await uploadToIpfs(new Blob([ciphertext]));

      setStatus("Registering on-chain...");
      const fullHash = await sha256Hex(cid);
      const fileId = fullHash.slice(0, 64);
      const encryptedKey = serializeKey(iv, key);
      const priceUstx = extractPriceFromConditions(conditions);

      const result = await registerFile({
        fileId,
        cid,
        priceUstx,
        seller: address,
        encryptedKey,
        name,
        description,
        fileType,
        fileSize: file.size,
        conditions,
      });

      setResultTxId(result.txId);
      setResultFileId(result.fileId);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStep("form");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>

        {step === "form" && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : file
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                {file ? (
                  <>
                    <FileIcon className="h-8 w-8 text-primary mb-2" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop or click to select
                    </p>
                  </>
                )}
              </div>

              <div>
                <Label>Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My awesome file"
                />
              </div>

              <div>
                <Label>Description</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this file?"
                  rows={2}
                  className="flex min-h-20 w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              <div>
                <Label>Type</Label>
                <Select value={fileType} onValueChange={setFileType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FILE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <ConditionBuilder value={conditions} onChange={setConditions} />

              {error && (
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button
                onClick={handleUpload}
                disabled={!file || !address}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Encrypt & Upload
              </Button>
            </div>
          )}

          {step === "uploading" && (
            <div className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="rounded-full bg-primary/10 p-3">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold">Upload Complete</p>
              <div className="w-full space-y-2 rounded-lg bg-muted p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File ID</span>
                  <span className="font-mono truncate max-w-[200px]">
                    {resultFileId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction</span>
                  <span className="font-mono text-primary truncate max-w-[200px]">
                    {resultTxId}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => {
                  handleClose();
                  onSuccess();
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
      </DialogContent>
    </Dialog>
  );
}
