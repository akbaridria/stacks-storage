"use client";

import { useState, useEffect } from "react";
import { fetchFiles, type PublicFile } from "@/lib/acn";
import { FileCard } from "@/components/FileCard";
import { FILE_TYPES } from "@/lib/constants";
import { Search, SlidersHorizontal, Loader2, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortOption = "newest" | "price-asc" | "price-desc";

export default function MarketplacePage() {
  const [files, setFiles] = useState<PublicFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("newest");

  useEffect(() => {
    fetchFiles()
      .then(setFiles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = files
    .filter((f) => {
      if (typeFilter !== "all" && f.fileType !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.seller.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case "price-asc":
          return a.priceUstx - b.priceUstx;
        case "price-desc":
          return b.priceUstx - a.priceUstx;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Marketplace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse all files listed on Stacks Storage.
        </p>
      </div>

      <Card className="mb-8">
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <InputGroup className="flex-1">
              <InputGroupAddon align="inline-start">
                <Search className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, description, or seller..."
              />
            </InputGroup>
            <div className="flex gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 sm:flex-initial sm:w-auto">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {FILE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="price-asc">Lowest price</SelectItem>
                  <SelectItem value="price-desc">Highest price</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <PackageOpen className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            {files.length === 0
              ? "No files listed yet. Be the first to upload!"
              : "No files match your filters."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground mb-4">
            {filtered.length} file{filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((f) => (
              <FileCard key={f.fileId} file={f} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
