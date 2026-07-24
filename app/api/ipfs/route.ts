import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

const PINATA_JWT = process.env.PINATA_JWT

// In-memory rate limiter: 10 uploads per IP per hour
const RATE_LIMIT = 10
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

const ipStore = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipStore.get(ip)

  if (!entry || now >= entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  if (!PINATA_JWT) {
    return NextResponse.json(
      { error: "IPFS uploads are not configured. Add PINATA_JWT to your environment variables." },
      { status: 503 }
    )
  }

  // Wallet address validation
  const wallet = req.headers.get("x-wallet-address")
  if (!wallet) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  // Rate limiting by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Limit is 10 uploads per hour." },
      { status: 429 }
    )
  }

  const formData = await req.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Forward to Pinata's pinFileToIPFS endpoint
  const pinataForm = new FormData()
  pinataForm.append("file", file)

  const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: pinataForm,
  })

  if (!pinataRes.ok) {
    const errText = await pinataRes.text()
    logger.error("Pinata upload error:", pinataRes.status, errText)
    return NextResponse.json({ error: "Failed to pin file to IPFS" }, { status: 502 })
  }

  const data = (await pinataRes.json()) as { IpfsHash: string }
  return NextResponse.json({ cid: data.IpfsHash })
}
