"use client";

import { useEffect, useState } from "react";

import { EmptyState } from "@/components/QueryState";
import { FilterBar } from "@/components/FilterBar";
import { GalleryGridSkeleton } from "@/components/LoadingSkeletons";
import { NftCard } from "@/components/NftCard";
import { NftDetailModal, type NftRewardDetail } from "@/components/NftDetailModal";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ViewToggle } from "@/components/ViewToggle";
import { usePlayerNfts } from "@/hooks/usePlayerNfts";

export default function GalleryPage() {
  const { address, nfts, loading, error } = usePlayerNfts();
  const [selectedNft, setSelectedNft] = useState<NftRewardDetail | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [huntFilter, setHuntFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [sort, setSort] = useState<"newest" | "rarest" | "alphabetical">("newest");

  const filtered = nfts
    .filter((n) => (huntFilter && huntFilter !== "All" ? n.huntName === huntFilter : true))
    .filter((n) => {
      if (!dateRange.start && !dateRange.end) return true;
      const earned = new Date(n.earnedAt).getTime();
      const afterStart = dateRange.start ? earned >= new Date(dateRange.start).getTime() : true;
      const beforeEnd = dateRange.end ? earned <= new Date(dateRange.end).getTime() : true;
      return afterStart && beforeEnd;
    })
    .sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
      } else {
        const rarityOrder: Record<string, number> = {
          Legendary: 5,
          Epic: 4,
          Rare: 3,
          Uncommon: 2,
          Common: 1,
        };
        const aRarity = a.attributes.find((t) => t.trait_type === "Rarity")?.value ?? "Common";
        const bRarity = b.attributes.find((t) => t.trait_type === "Rarity")?.value ?? "Common";
        return (rarityOrder[bRarity] ?? 0) - (rarityOrder[aRarity] ?? 0);
      }
    });

  // `usePlayerNfts` returns NftItem (string id, `image`), while NftCard and
  // NftDetailModal consume NftReward/NftRewardDetail (numeric id, `imageUri`,
  // `claimed`). Adapt once here so both consumers get the shape they expect.
  const displayNfts = filtered.map((nft, index) => ({
    ...nft,
    id: Number.isNaN(Number(nft.id)) ? index + 1 : Number(nft.id),
    imageUri: nft.image,
    claimed: true,
  }));

  const huntOptions = Array.from(new Set(nfts.map((n) => n.huntName)));

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] dark:from-slate-900 dark:bg-slate-900 dark:to-slate-800 pb-20">
      <div className="max-w-[1500px] mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-4">Your NFT Gallery</h1>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <ViewToggle view={view} setView={setView} />
          <FilterBar
            hunts={huntOptions}
            selectedHunt={huntFilter}
            setHunt={setHuntFilter}
            dateRange={dateRange}
            setDateRange={setDateRange}
            sort={sort}
            setSort={setSort}
          />
        </div>
        {loading && <GalleryGridSkeleton count={8} />}
        {error && <p className="text-red-600">{error}</p>}
        {filtered.length === 0 && !loading && (
          <EmptyState
            icon={<Badge variant="outline">🪙</Badge>}
            title="No NFTs yet"
            description="Earn NFTs by completing hunts."
          />
        )}
        {view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayNfts.map((nft) => (
              <NftCard key={nft.id} nft={nft} onClick={setSelectedNft} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {displayNfts.map((nft) => (
              <Card key={nft.id} className="p-4 cursor-pointer" onClick={() => setSelectedNft(nft)}>
                <div className="flex items-center gap-4">
                  <img
                    src={
                      nft.imageUri.startsWith("ipfs://")
                        ? `/api/ipfs/${nft.imageUri.split("ipfs://")[1]}`
                        : nft.imageUri
                    }
                    alt={nft.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div>
                    <h2 className="font-semibold text-lg line-clamp-1">{nft.name}</h2>
                    <p className="text-sm text-slate-600 line-clamp-2">{nft.description}</p>
                    <p className="text-xs text-slate-500">
                      Earned {new Date(nft.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
        {selectedNft && (
          <NftDetailModal nft={selectedNft} isOpen onClose={() => setSelectedNft(null)} />
        )}
      </div>
    </div>
  );
}
 