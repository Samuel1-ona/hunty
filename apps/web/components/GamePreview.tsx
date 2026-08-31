"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Button } from "@hunty/ui";

import PlayCircle from "@/components/icons/PlayCircle";
import type { HuntCard } from "@/lib/types";

import { HuntCards } from "./HuntCards";

interface GamePreviewProps {
  hunts: HuntCard[];
  /** Hunt ID to link to the full-page preview. When provided, "Preview" opens /hunt/:id/preview */
  huntId?: number;
}

export function GamePreview({ hunts, huntId }: GamePreviewProps) {
  return (
    <div
      className="bg-slate-100 backdrop-blur-md rounded-2xl p-6 border border-white/20 print:bg-transparent print:border-none print:p-0 print:shadow-none"
      style={{
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.15), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-4 print:hidden">
        <span className="text-[16px] font-normal text-slate-800">Live Preview</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white px-3 py-[6px] rounded-xl text-sm font-semibold"
          >
            <Eye /> Reveal
          </Button>
          {huntId ? (
            <Button
              size="sm"
              asChild
              className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] hover:bg-purple-700 text-white px-3 py-[6px] rounded-xl text-sm font-semibold"
            >
              <Link href={`/hunt/${huntId}/preview`} target="_blank" rel="noopener noreferrer">
                <PlayCircle /> Preview
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              className="bg-gradient-to-br from-[#2F2FFF] to-[#E87785] hover:bg-purple-700 text-white px-3 py-[6px] rounded-xl text-sm font-semibold"
            >
              <PlayCircle /> Test
            </Button>
          )}
        </div>
      </div>

      <HuntCards hunts={hunts} />
    </div>
  );
}
 