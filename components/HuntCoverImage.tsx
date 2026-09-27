"use client"

import { useState } from "react"
import Image from "next/image"
import { GATEWAY_COUNT, resolveImageSrc } from "@/lib/ipfs"

interface HuntCoverImageProps {
  src?: string
  alt: string
  className?: string
}

// Tiny dark blur placeholder shown while the cover image loads.
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMxZTI5M2IiLz48L3N2Zz4=";

export function HuntCoverImage({ src, alt, className }: HuntCoverImageProps) {
  const [gatewayIdx, setGatewayIdx] = useState(0)

  // `fill` requires the container to be positioned. We always inject
  // `relative` so callers don't have to remember to add it themselves,
  // preventing layout shift when the image loads.
  const containerClass = `relative ${className ?? ""}`.trim()

  if (!src) {
    return (
      <div className={containerClass}>
        <Image
          src="/static-images/image1.png"
          alt={alt}
          fill
          loading="lazy"
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <Image
        src={resolveImageSrc(src, gatewayIdx)}
        alt={alt}
        fill
        loading="lazy"
        placeholder="blur"
        blurDataURL={BLUR_PLACEHOLDER}
        className="object-cover"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        onError={() => {
          if (gatewayIdx < GATEWAY_COUNT - 1) {
            setGatewayIdx((idx) => idx + 1)
          }
        }}
      />
    </div>
  )
}