"use client";

import { useState, useEffect } from "react";
import { fetchFiles, type PublicFile } from "@/lib/acn";
import { FileCard } from "@/components/FileCard";
import { FILE_TYPES } from "@/lib/constants";
import { Search, SlidersHorizontal, Loader2, PackageOpen } from "lucide-react";

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
        <p className="text-sm text-gray-500 mt-1">
          Browse all files listed on Stacks Storage.
        </p>
      </div>

      {/* Filters */}
      <div className="card mb-8 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, description, or seller..."
              className="input pl-10"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input w-auto pl-10 pr-8 appearance-none"
              >
                <option value="all">All types</option>
                {FILE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="input w-auto"
            >
              <option value="newest">Newest first</option>
              <option value="price-asc">Lowest price</option>
              <option value="price-desc">Highest price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <PackageOpen className="h-12 w-12 text-gray-700" />
          <p className="text-gray-500">
            {files.length === 0
              ? "No files listed yet. Be the first to upload!"
              : "No files match your filters."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-600 mb-4">
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
