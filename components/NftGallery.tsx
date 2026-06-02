"use client"

import React, { useState } from "react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { resolveImageSrc } from "@/lib/ipfs"
import { NftDetailModal, type NftRewardDetail } from "./NftDetailModal"
import { Trophy, Star } from "lucide-react"

interface NftGalleryProps {
  nfts: NftRewardDetail[]
}

export function NftGallery({ nfts }: NftGalleryProps) {
  const [selectedNft, setSelectedNft] = useState<NftRewardDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion();

  const handleNftClick = (nft: NftRewardDetail) => {
    setSelectedNft(nft)
    setIsModalOpen(true)
  }

  if (nfts.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
          <Trophy className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">No trophies yet</h3>
        <p className="text-slate-500 max-w-xs mx-auto mt-2 text-sm">
          Complete hunts to earn exclusive NFT rewards and build your collection!
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nfts.map((nft, idx) => (
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
                ? {}
                : { y: -8, transition: { duration: 0.2 } }
            }
            onClick={() => handleNftClick(nft)}
            className="cursor-pointer group"
          >
            <Card className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300 border-b-4 border-b-indigo-500/20">
              <CardContent className="p-0">
                {/* Badge for claimed status */}
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

                {/* Image Wrapper */}
                <div className="aspect-square w-full bg-linear-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center p-6 relative overflow-hidden">
                  {/* Decorative background circle */}
                  <div className="absolute inset-0 bg-radial-[at_50%_50%] from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <motion.div
                    className="relative w-full h-full drop-shadow-xl"
                    whileHover={
                      prefersReducedMotion ? {} : { scale: 1.1, rotate: 5 }
                    }
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 300 }
                    }
                  >
                    <Image
                      src={resolveImageSrc(nft.imageUri)}
                      alt={nft.name}
                      fill
                      className="object-contain"
                    />
                  </motion.div>
                </div>

                {/* Text Content */}
                <div className="p-5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">
                    {nft.huntName || "Scavenger Hunt"}
                  </div>
                  <h3 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {nft.name}
                  </h3>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[11px] font-medium text-slate-400">
                      #{nft.id.toString().padStart(4, "0")}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      View Details
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <NftDetailModal
        nft={selectedNft}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
