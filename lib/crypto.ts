// Cross-environment SHA-256 helper returning a lowercase hex digest
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  type GlobalWithCrypto = typeof globalThis & {
    crypto?: { subtle?: { digest: (algo: string, data: ArrayBuffer) => Promise<ArrayBuffer> } }
  }

  // Browser environment (Web Crypto)
  const g = globalThis as GlobalWithCrypto
  if (g.crypto?.subtle) {
    const hashBuffer = await g.crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  // Node fallback
  try {
    // dynamic import to avoid bundler/node resolution issues in browsers
    const { createHash } = await import("crypto")
    return createHash("sha256").update(data).digest("hex")
  } catch {
    throw new Error("No crypto available for sha256 hashing")
  }
}
