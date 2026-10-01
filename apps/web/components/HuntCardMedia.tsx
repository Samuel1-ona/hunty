"use client";

import Image from "next/image";

import { getClueMediaKind, getClueMediaSource } from "@/lib/clueMedia";
import { getClueType, getImageClueMode } from "@/lib/clueTypeSystem";
import { GATEWAY_COUNT, resolveImageSrc } from "@/lib/ipfs";
import type { HuntCard } from "@/lib/types/hunt-ui";
import picture from "@/public/static-images/image1.png";

interface HuntCardMediaProps {
  hunt: HuntCard;
  imgGatewayIdx: number;
  setImgGatewayIdx: (idx: number | ((prev: number) => number)) => void;
}

export function HuntCardMedia({ hunt, imgGatewayIdx, setImgGatewayIdx }: HuntCardMediaProps) {
  const clueType = getClueType({ type: hunt.type });
  const imageMode = getImageClueMode(hunt);
  const clueMediaKind = getClueMediaKind(hunt.mediaCid);
  const clueMediaSrc = getClueMediaSource(
    clueType === "image" ? hunt.imageCid : hunt.mediaCid,
    imgGatewayIdx
  );

  return (
    <div className="flex justify-center">
      {clueType === "image" && (
        <p className="mb-3 rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white/90 print:border print:border-gray-300 print:text-black">
          {imageMode === "spot-difference"
            ? "Inspect the image and identify what changed."
            : "Inspect the image and identify the object."}
        </p>
      )}
      {clueType === "image" && !clueMediaSrc ? (
        <p className="rounded-xl bg-amber-100 px-4 py-6 text-center text-sm text-amber-900">
          This image clue is missing its image. Please contact the hunt creator.
        </p>
      ) : clueMediaSrc && clueMediaKind === "audio" ? (
        <audio controls aria-label="clue audio" className="w-full max-w-xs">
          <source src={clueMediaSrc} />
        </audio>
      ) : clueMediaSrc && clueMediaKind === "video" ? (
        <video controls aria-label="clue video" className="w-full max-w-xs rounded-xl">
          <source src={clueMediaSrc} />
        </video>
      ) : clueMediaSrc ? (
        <Image
          src={clueMediaSrc}
          alt="clue media"
          width={180}
          height={180}
          loading="lazy"
          sizes="180px"
          onError={() => {
            if (imgGatewayIdx < GATEWAY_COUNT - 1) {
              setImgGatewayIdx((i: number) => i + 1);
            }
          }}
          unoptimized
          className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] object-contain print:w-64 print:h-auto print:rounded-xl"
        />
      ) : hunt.link || hunt.image ? (
        <Image
          src={resolveImageSrc(hunt.link || hunt.image || "", imgGatewayIdx)}
          alt="hunt"
          width={180}
          height={180}
          loading="lazy"
          sizes="180px"
          onError={() => {
            if (imgGatewayIdx < GATEWAY_COUNT - 1) {
              setImgGatewayIdx((i: number) => i + 1);
            }
          }}
          unoptimized
          className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] object-contain print:w-64 print:h-auto print:rounded-xl"
        />
      ) : (
        <Image
          src={picture}
          alt="hunt"
          width={180}
          height={180}
          loading="lazy"
          sizes="180px"
          className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] object-contain print:w-64 print:h-auto print:rounded-xl"
        />
      )}
    </div>
  );
}
