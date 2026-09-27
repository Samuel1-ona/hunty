"use client";

import Image from "next/image";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface NftReward {
  id: number;
  name: string;
  description: string;
  imageUri: string;
  earnedAt: string; // ISO date string
  claimed: boolean;
  huntName: string;
  attributes: { trait_type: string; value: string }[];
}

export interface NftCardProps {
  nft: NftReward;
  onClick: (nft: NftReward) => void;
}

export function NftCard({ nft, onClick }: NftCardProps) {
  return (
    <Card
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(nft)}
    >
      <div className="relative w-full h-48 bg-slate-100 flex items-center justify-center">
        <Image
          src={nft.imageUri.startsWith("ipfs://") ? `/api/ipfs/${nft.imageUri.split("ipfs://")[1]}` : nft.imageUri}
          alt={nft.name}
          width={200}
          height={200}
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <CardTitle className="text-lg font-semibold line-clamp-1">{nft.name}</CardTitle>
        <CardDescription className="text-sm text-slate-600 line-clamp-2">{nft.description}</CardDescription>
        <div className="mt-2 flex items-center justify-between">
          <Badge variant="secondary" className="bg-purple-50 text-purple-700 border border-purple-200">
            {nft.huntName}
          </Badge>
          {nft.claimed ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border border-green-200">
              Claimed
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border border-amber-200">
              Unclaimed
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
