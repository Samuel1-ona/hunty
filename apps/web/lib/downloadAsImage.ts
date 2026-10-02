import html2canvas from "html2canvas"
import { toast } from "sonner"

export type DownloadAsImageOptions = {
  filename?: string
  backgroundColor?: string
}

export async function downloadElementAsImage(
  element: HTMLElement,
  options: DownloadAsImageOptions = {},
): Promise<string> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    scale: 2,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    logging: false,
  })

  const dataUrl = canvas.toDataURL("image/png")
  
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = options.filename ?? "hunty-achievement.png"
  link.click()

  return dataUrl
}

export function buildDeepLink(path: string): string {
  if (typeof window === "undefined") return `https://hunty.app${path}`
  return `${window.location.origin}${path}`
}

export function buildHuntOgImageUrl(huntId: number): string {
  return buildDeepLink(`/api/og/hunt/${huntId}`)
}

/**
 * Build the URL for a player's result-card OG image (rank, time, hunt name)
 * generated on hunt completion.
 */
export function buildResultCardImageUrl(
  huntId: number,
  wallet: string,
  options?: { rank?: number; time?: number },
): string {
  const params = new URLSearchParams({
    huntId: String(huntId),
    wallet,
  })
  if (options?.rank != null) params.set("rank", String(options.rank))
  if (options?.time != null) params.set("time", String(options.time))
  return buildDeepLink(`/api/og/result?${params.toString()}`)
}

export async function copyShareLink(url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false
  try {
    await navigator.clipboard.writeText(url)
    toast.success("Link copied to clipboard")
    return true
  } catch {
    toast.error("Failed to copy link")
    return false
  }
}

function openShare(url: string) {
  window.open(url, "_blank", "width=720,height=560")
}

/**
 * Opens the Twitter/X intent for sharing.
 */
export function shareOnTwitter(text: string, url: string, ogImageUrl?: string) {
  const imagePart = ogImageUrl ? `&hashtags=${encodeURIComponent("hunty")}` : ""
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}${imagePart}`
  openShare(shareUrl)
}

/**
 * Opens the Warpcast (Farcaster) intent for sharing.
 */
export function shareOnFarcaster(text: string, url: string) {
  const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`
  openShare(shareUrl)
}

export function shareOnTelegram(text: string, url: string) {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
  openShare(shareUrl)
}

export function shareOnWhatsApp(text: string, url: string) {
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  openShare(shareUrl)
}
