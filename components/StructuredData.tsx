import type { StoredHunt } from "@/lib/types"

type JsonLd = Record<string, unknown>

type Props = {
  data: JsonLd | JsonLd[]
}

export function StructuredData({ data }: Props) {
  const items = Array.isArray(data) ? data : [data]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(items),
      }}
    />
  )
}

export function siteStructuredData(baseUrl: string): JsonLd[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Hunty",
      url: baseUrl,
      description: "Create thrilling scavenger hunts with multiple clues and challenges. Engage players in immersive treasure hunts and reward them with XLM tokens or exclusive NFTs on the Stellar blockchain.",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Hunty",
      url: baseUrl,
      description: "Decentralized scavenger hunt game platform built on the Stellar blockchain.",
    },
  ]
}

export function huntStructuredData(hunt: StoredHunt, baseUrl: string): JsonLd {
  const huntUrl = `${baseUrl}/hunt/${hunt.id}`
  const coverImage = hunt.coverImageCid
    ? hunt.coverImageCid.startsWith("http")
      ? hunt.coverImageCid
      : `https://gateway.pinata.cloud/ipfs/${hunt.coverImageCid}`
    : `${baseUrl}/og-image.png`

  return {
    "@context": "https://schema.org",
    "@type": "Game",
    name: hunt.title,
    description: hunt.description,
    url: huntUrl,
    image: coverImage,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: hunt.status === "Active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
    ...(hunt.startTime ? { startDate: new Date(hunt.startTime * 1000).toISOString() } : {}),
    ...(hunt.endTime ? { endDate: new Date(hunt.endTime * 1000).toISOString() } : {}),
    numberOfPlayers: {
      "@type": "QuantitativeValue",
      minValue: 1,
    },
  }
}
