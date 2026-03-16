"use client";

import Link from "next/link";
import type { PublicFile } from "@/lib/acn";
import { ustxToStx, formatFileSize, truncateAddress } from "@/lib/constants";
import { FileText, Film, Database, Code, File, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <Link href={`/file/${file.fileId}`}>
      <Card className="group block transition-all hover:border-primary/30 hover:bg-muted/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <Badge variant={isFree ? "success" : "secondary"}>
              {isFree ? "Free" : `${price} STX`}
            </Badge>
          </div>

          <h3 className="mt-4 font-semibold text-foreground group-hover:text-primary line-clamp-1">
            {file.name || "Untitled"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {file.description || "No description"}
          </p>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{truncateAddress(file.seller)}</span>
            <span>{formatFileSize(file.fileSize)}</span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
            <ShoppingCart className="h-3.5 w-3.5" />
            View details
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
