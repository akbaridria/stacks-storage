"use client";

import Link from "next/link";
import type { PublicFile } from "@/lib/acn";
import { ustxToStx, formatFileSize, truncateAddress } from "@/lib/constants";
import { FileText, Film, Database, Code, File, ShoppingCart } from "lucide-react";

const typeIcons: Record<string, typeof FileText> = {
  document: FileText,
  video: Film,
  dataset: Database,
  software: Code,
  other: File,
};

export function FileCard({ file }: { file: PublicFile }) {
  const Icon = typeIcons[file.fileType] ?? File;
  const price = ustxToStx(file.priceUstx);
  const isFree = file.priceUstx === 0;

  return (
    <Link href={`/file/${file.fileId}`} className="card group block p-5 transition-all hover:border-gray-700 hover:bg-gray-900/80">
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg bg-brand-600/10 p-2.5 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isFree
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-brand-500/10 text-brand-300"
          }`}
        >
          {isFree ? "Free" : `${price} STX`}
        </span>
      </div>

      <h3 className="mt-4 font-semibold text-gray-100 group-hover:text-white line-clamp-1">
        {file.name || "Untitled"}
      </h3>
      <p className="mt-1 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
        {file.description || "No description"}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
        <span>{truncateAddress(file.seller)}</span>
        <span>{formatFileSize(file.fileSize)}</span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-400 opacity-0 transition-opacity group-hover:opacity-100">
        <ShoppingCart className="h-3.5 w-3.5" />
        View details
      </div>
    </Link>
  );
}
