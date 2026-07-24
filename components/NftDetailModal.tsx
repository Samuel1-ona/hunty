"use client";

import React from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Calendar, Trophy, Zap, Share2, Download, ExternalLink, Send } from "lucide-react"
import { resolveImageSrc } from "@/lib/ipfs"
import { formatISOString } from "@/lib/dateUtils"

interface NftAttribute {
  trait_type: string;
  value: string | number;
}

export interface NftRewardDetail {
  id: number;
  name: string;
  description?: string;
  imageUri: string;
  earnedAt: string;
  claimed: boolean;
  attributes?: NftAttribute[];
  huntName?: string;
  /** ipfs:// URI pointing to the SEP-0039 metadata JSON for this NFT. */
  metadataUri?: string;
}

interface NftDetailModalProps {
  nft: NftRewardDetail | null
  isOpen: boolean
  onClose: () => void
  onTransfer?: (nft: NftRewardDetail) => void
}

export function NftDetailModal({ nft, isOpen, onClose, onTransfer }: NftDetailModalProps) {
  if (!nft) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border-white/20 shadow-2xl overflow-hidden p-0 rounded-3xl">
        <div className="flex flex-col md:flex-row h-full">
          {/* Image Section */}
          <div className="relative w-full md:w-1/2 aspect-square bg-linear-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-8">
            <motion.div
              initial={
                prefersReducedMotion ? false : { scale: 0.8, opacity: 0 }
              }
              animate={prefersReducedMotion ? {} : { scale: 1, opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { delay: 0.1, duration: 0.5, type: "spring" }
              }
              className="relative w-full h-full drop-shadow-2xl"
            >
              <Image
                src={resolveImageSrc(nft.imageUri)}
                alt={nft.name}
                fill
                className="object-contain"
                priority
              />
            </motion.div>
            <div className="absolute top-4 left-4">
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  nft.claimed
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                )}
              >
                {nft.claimed ? "Verified" : "Unclaimed"}
              </span>
            </div>
          </div>

          {/* Details Section */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[80vh] md:max-h-none">
            <DialogHeader className="p-0 text-left">
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Trophy #{nft.id}
                </span>
              </div>
              <DialogTitle className="text-2xl sm:text-3xl font-black bg-linear-to-b from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent leading-tight">
                {nft.name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-2 text-sm leading-relaxed">
                {nft.description ||
                  "An exclusive digital trophy earned by solving challenging clues in the Hunty Scavenger Hunt."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Metadata Pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">
                      Earned On
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {formatISOString(nft.earnedAt)}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Zap className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase">
                      Hunt
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate">
                    {nft.huntName || "Legacy Hunt"}
                  </div>
                </div>
              </div>

              {/* Attributes */}
              {nft.attributes && nft.attributes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Attributes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {nft.attributes.map((attr, idx) => (
                      <div
                        key={idx}
                        className="bg-indigo-50 border border-indigo-100/50 rounded-xl px-3 py-1.5 flex flex-col items-center min-w-[80px]"
                      >
                        <span className="text-[9px] text-indigo-400 uppercase font-bold">
                          {attr.trait_type}
                        </span>
                        <span className="text-xs font-bold text-indigo-700">
                          {attr.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 flex flex-col gap-3">
              <Button className="w-full bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] hover:shadow-lg transition-all h-11 rounded-xl font-bold flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Download Certificate
              </Button>
              {onTransfer && nft.claimed && (
                <Button
                  variant="outline"
                  className="w-full border-indigo-200 text-indigo-700 rounded-xl h-11 flex items-center justify-center gap-2 hover:bg-indigo-50"
                  onClick={() => onTransfer(nft)}
                >
                  <Send className="w-4 h-4" />
                  Transfer / Gift
                </Button>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-700 rounded-xl h-11 flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-slate-200 text-slate-700 rounded-xl h-11 flex items-center justify-center gap-2"
                  onClick={() => {
                    const uri = nft.metadataUri ?? nft.imageUri;
                    // Resolve ipfs:// to a public gateway for browser navigation
                    const url = uri.startsWith("ipfs://")
                      ? `https://ipfs.io/ipfs/${uri.slice(7)}`
                      : uri;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Explorer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
