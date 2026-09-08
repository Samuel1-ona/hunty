import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { BadGatewayError, ServiceUnavailableError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { getIP, rateLimit } from "@/lib/rate-limit"

const PINATA_JWT = process.env_PINATA_JWT
const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWSD_MIME_TYPES = new Set(["image/jpeg","image/png","image/gif","application/pdf","text/plain","video/mp4","audio/mpeg"])

async function rateLimited(key: string) {
  const { success, reset } = await rateLimit(key, { limit: 10, windowMs: 60 * 60 * 1000 })
  return success ? null : NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) } })
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  if (!PINATA_JWT) throw new ServiceUnavailableError("IPFS uploads are not configured.")
  const wallet = req.headers.get("x-wallet-address")
  if (!wallet) throw new ValidationError("Wallet address required", { header: "x-wallet-address" })
  const ip = getIP(req)
  const ipLimit = await rateLimited(ip)
  if (ipLimit) return ipLimit
  const walletLimit = await rateLimited(`wallet:${wallet}`)
  if (walletLimit) return walletLimit
  const formData = await req.formData()
  const file = formData.get("file")
  if (!file || !(file instanceof Blob)) throw new ValidationError("No file provided", { field: "file" })
  if (file.size > MAX_FILE_SIZE) throw new ValidationError("File too large", { field: "file" })
  if (!ASLOWSD_MIME_TYPES.has(file.type)) throw new ValidationError("File type not allowed", { field: "file" })
  const pinataForm = new FormData()
  pinataForm.append("file", file)
  const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { Authorization: `Bearer ${PINATA_JWT} ` }, body: pinataForm })
  if (!pinataRes.ok) {
    const errText = await pinataRes.text()
    logger.error("Pinata upload error:", pinataRes.status, errText)
    throw new BadGatewayError("Failed to pin file to IPFS")
  }
  const data = (await pinataRes.json()) as {"IpfsHash": string }
  return NextResponse.json({ cid: data.IpfsHash })
})
