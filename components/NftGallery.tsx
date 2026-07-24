"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { resolveImageSrc } from "@/lib/ipfs";
import { NftDetailModal, type NftRewardDetail } from "./NftDetailModal";
import { EmptyState } from "@/components/EmptyState";
import { Trophy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface NftGalleryProps {
  nfts: NftRewardDetail[];
}

type ViewMode = "grid" | "list";
type SortOption = "newest" | "rarest" | "alphabetical";

export function NftGallery({ nfts }: NftGalleryProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedHunt, setSelectedHunt] = useState<string>("All");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [dateFilter, setDateFilter] = useState<string>(""); // YYYY-MM-DD
  const [selectedNft, setSelectedNft] = useState<NftRewardDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Distinct hunt names for filter dropdown
  const huntOptions = useMemo(() => {
    const set = new Set<string>();
    nfts.forEach((n) => n.huntName && set.add(n.huntName));
    return Array.from(set);
  }, [nfts]);

  // Helper to rank rarity for sorting
  const rarityRank = (nft: NftRewardDetail): number => {
    const attr = nft.attributes?.find((a) => a.trait_type.toLowerCase() === "rarity");
    const map: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    if (attr && typeof attr.value === "string") {
      return map[attr.value.toLowerCase()] ?? 0;
    }
    return 0;
  };

  // Apply filter + sort
  const displayedNfts = useMemo(() => {
    let list = [...nfts];
    if (selectedHunt !== "All") {
      list = list.filter((n) => n.huntName === selectedHunt);
    }
    if (dateFilter) {
      const cutoff = new Date(dateFilter).getTime();
      list = list.filter((n) => new Date(n.earnedAt).getTime() >= cutoff);
    }
    if (sortOption === "newest") {
      list.sort((a, b) => new Date(b.earnedAt).valueOf() - new Date(a.earnedAt).valueOf());
    } else if (sortOption === "rarest") {
      list.sort((a, b) => rarityRank(b) - rarityRank(a));
    } else if (sortOption === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [nfts, selectedHunt, dateFilter, sortOption]);

  const handleNftClick = (nft: NftRewardDetail) => {
    setSelectedNft(nft);
    setIsModalOpen(true);
  };

  if (nfts.length === 0) {
    return (
      <EmptyState
        icon={
          <Trophy className="w-10 h-10 text-slate-500 dark:text-slate-400" />
        }
        title="Complete hunts to earn NFTs"
        description="Your NFT gallery is empty right now. Finish a scavenger hunt to unlock your first collectible reward."
        action={{ label: "Browse hunts", href: "/" }}
      />
    );
  }

  return (
    <>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* View toggle */}
        <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
          {viewMode === "grid" ? "Switch to List" : "Switch to Grid"}
        </Button>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Hunt filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {selectedHunt === "All" ? "All Hunts" : selectedHunt}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem onClick={() => setSelectedHunt("All")}>All Hunts</DropdownMenuItem>
              {huntOptions.map((hunt) => (
                <DropdownMenuItem key={hunt} onClick={() => setSelectedHunt(hunt)}>
                  {hunt}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date filter */}
          <input
            type="date"
            aria-label="Filter by date"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-500"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sort: {sortOption === "newest" ? "Newest" : sortOption === "rarest" ? "Rarest" : "Alphabetical"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
              <DropdownMenuItem onClick={() => setSortOption("newest")}>Newest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("rarest")}>Rarest</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortOption("alphabetical")}>Alphabetical</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Gallery */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col space-y-4"}>
        {displayedNfts.map((nft, idx) => (
          <motion.div
            key={nft.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { delay: idx * 0.05, duration: 0.4 }
            }
            whileHover={
              prefersReducedMotion
                ? undefined
                : { y: -8, transition: { duration: 0.2 } }
            }
            onClick={() => handleNftClick(nft)}
            className="cursor-pointer group"
          >
            <Card className={cn(
              "relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300",
              viewMode === "list" && "flex"
            )}>
              <CardContent className={cn("p-0", viewMode === "list" && "flex items-center p-4 w-full")}>
                {/* Badge */}
                <div className="absolute top-3 right-3 z-10">
                  <div
                    className={cn(
                      "p-1.5 rounded-full",
                      nft.claimed ? "bg-emerald-500" : "bg-amber-500",
                      "shadow-lg shadow-emerald-500/20",
                    )}
                  >
                    <Star className="w-3 h-3 text-white fill-white" />
                  </div>
                </div>

                {/* Image */}
                <div className={cn(
                  "aspect-square w-full bg-linear-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6 relative overflow-hidden",
                  viewMode === "list" && "w-24 h-24 flex-shrink-0 mr-4 rounded-2xl"
                )}>
                  <div className="absolute inset-0 bg-radial-[at_50%_50%] from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <motion.div className="relative w-full h-full drop-shadow-xl" whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: "spring", stiffness: 300 }}>
                    <Image src={resolveImageSrc(nft.imageUri)} alt={nft.name} fill className="object-contain" />
                  </motion.div>
                </div>

                {/* Text */}
                <div className={cn("p-5", viewMode === "list" && "flex-1 p-0")}>
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">
                    {nft.huntName || "Scavenger Hunt"}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {nft.name}
                  </h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] font-medium text-slate-400">#{nft.id.toString().padStart(4, "0")}</span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">View Details</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <NftDetailModal nft={selectedNft} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
