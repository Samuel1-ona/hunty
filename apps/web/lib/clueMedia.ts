import { resolveImageSrc } from "@/lib/ipfs"

export type ClueMediaKind = "image" | "audio" | "video"

export function attachMediaTypeToCid(
  mediaUri: string,
  mimeType?: string | null
): string {
  const topLevelType = mimeType?.split("/")[0]
  if (
    topLevelType !== "image" &&
    topLevelType !== "audio" &&
    topLevelType !== "video"
  ) {
    return mediaUri
  }

  const separator = mediaUri.includes("?") ? "&" : "?"
  return `${mediaUri}${separator}type=${topLevelType}`
}

export function getClueMediaKind(
  mediaCid?: string | null
): ClueMediaKind | null {
  if (!mediaCid) return null

  try {
    const url = new URL(mediaCid, "https://hunty.app")
    const kind = url.searchParams.get("type")
    if (kind === "image" || kind === "audio" || kind === "video") {
      return kind
    }
  } catch {
    // ignore malformed URLs and fall back below
  }

  const normalized = mediaCid.toLowerCase()
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(normalized)) return "image"
  if (/\.(mp3|wav|ogg|m4a)$/.test(normalized)) return "audio"
  if (/\.(mp4|webm|mov|m4v)$/.test(normalized)) return "video"

  return "image"
}

export function getClueMediaSource(
  mediaCid?: string | null,
  gatewayIndex = 0
): string | null {
  if (!mediaCid) return null

  const cleaned = mediaCid.split("?")[0]
  return resolveImageSrc(cleaned, gatewayIndex)
}
