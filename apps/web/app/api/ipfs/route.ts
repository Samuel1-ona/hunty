import { NextRequest, NextResponse } from "next/server"

import { BadGatewayError, ServiceUnavailableError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { logger } from "@/lib/logger"
import { getIP, rateLimit, rateLimitPresets } from "@/lib/rate-limit"
import {
  exceedsUploadLimit,
  IPFS_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/upload-limits"

const PINATA_JWT = process.env.PINATA_JWT
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain", "video/mp4", "audio/mpeg"])

/**
 * Duck-typed Blob check. `instanceof Blob` fails for File objects that cross a
 * realm boundary (e.g. the undici `File` returned by `req.formData()` compared
 * against a jsdom `Blob` under test), so verify the shape instead.
 */
function isBlobLike(value: FormDataEntryValue | null): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Blob).size === "number" &&
    typeof (value as Blob).type === "string"
  )
}

async function rateLimited(key: string) {
  const { success, reset } = await rateLimit(key, rateLimitPresets.sensitive)
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
  if (!isBlobLike(file)) throw new ValidationError("No file provided", { field: "file" })
  if (exceedsUploadLimit(file.size)) throw new ValidationError(IPFS_UPLOAD_TOO_LARGE_MESSAGE, { field: "file" })
  if (!ALLOWED_MIME_TYPES.has(file.type)) throw new ValidationError("File type not allowed", { field: "file" })
  const pinataForm = new FormData()
  pinataForm.append("file", file)
  const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { Authorization: `Bearer ${PINATA_JWT}` }, body: pinataForm })
  if (!pinataRes.ok) {
    const errText = await pinataRes.text();
    logger.error("Pinata upload error:", pinataRes.status, errText);
    throw new BadGatewayError("Failed to pin file to IPFS");
  }
  const data = (await pinataRes.json()) as { IpfsHash: string };
  return NextResponse.json({ cid: data.IpfsHash });
});
