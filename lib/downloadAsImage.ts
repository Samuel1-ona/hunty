import html2canvas from "html2canvas"

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

/**
 * Opens the Twitter/X intent for sharing.
 */
export function shareOnTwitter(text: string, url: string) {
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
  window.open(shareUrl, "_blank", "width=600,height=400")
}

/**
 * Opens the Warpcast (Farcaster) intent for sharing.
 */
export function shareOnFarcaster(text: string, url: string) {
  const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`
  window.open(shareUrl, "_blank", "width=600,height=400")
}
