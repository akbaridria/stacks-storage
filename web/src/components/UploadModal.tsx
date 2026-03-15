"use client";

import { useState, useRef, type DragEvent } from "react";
import { X, Upload, Loader2, Check, File as FileIcon } from "lucide-react";
import { useWallet } from "@/context/WalletContext";
import { uploadToIpfs, registerFile, type ConditionGroup } from "@/lib/acn";
import { generateKey, encryptFile, serializeKey, sha256Hex } from "@/lib/crypto";
import { formatFileSize, FILE_TYPES } from "@/lib/constants";
import { ConditionBuilder, extractPriceFromConditions } from "./ConditionBuilder";

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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Upload File</h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "form" && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-brand-500 bg-brand-500/5"
                  : file
                  ? "border-emerald-600 bg-emerald-600/5"
                  : "border-gray-700 hover:border-gray-600"
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
                  <FileIcon className="h-8 w-8 text-emerald-400 mb-2" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">
                    Drag & drop or click to select
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="label">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My awesome file"
                className="input"
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this file?"
                rows={2}
                className="input resize-none"
              />
            </div>

            <div>
              <label className="label">Type</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="input"
              >
                {FILE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <ConditionBuilder value={conditions} onChange={setConditions} />

            {error && (
              <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || !address}
              className="btn-primary w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              Encrypt & Upload
            </button>
          </div>
        )}

        {step === "uploading" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="h-10 w-10 text-brand-400 animate-spin" />
            <p className="text-sm text-gray-400">{status}</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold">Upload Complete</p>
            <div className="w-full space-y-2 rounded-lg bg-gray-800/50 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">File ID</span>
                <span className="font-mono text-gray-300 truncate max-w-[200px]">
                  {resultFileId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transaction</span>
                <span className="font-mono text-brand-400 truncate max-w-[200px]">
                  {resultTxId}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                handleClose();
                onSuccess();
              }}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
