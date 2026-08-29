import { NextRequest, NextResponse } from "next/server"
import { ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { withAdminAuth, withAuth } from "@/lib/api/withAuth"

interface PushTokenRecord {
  token: string
  walletAddress: string
  registeredAt: number
}

const tokensStore: PushTokenRecord[] = []

export const POST = withErrorHandling(
  withAuth(async (request: NextRequest) => {
    let body: { token?: string; walletAddress?: string }
    try {
      body = await request.json()
    } catch {
      throw new ValidationError("Invalid request body")
    }
    const { token, walletAddress } = body

    if (!token || typeof token !== "string") {
      throw new ValidationError("Push token is required", { field: "token" })
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      throw new ValidationError("Wallet address is required", { field: "walletAddress" })
    }

    const existingIndex = tokensStore.findIndex(
      (t) => t.token === token || t.walletAddress === walletAddress
    )

    if (existingIndex !== -1) {
      tokensStore[existingIndex] = { token, walletAddress, registeredAt: Date.now() }
    } else {
      tokensStore.push({ token, walletAddress, registeredAt: Date.now() })
    }

    return NextResponse.json({ success: true })
  })
)

export const DELETE = withErrorHandling(
  withAuth(async (request: NextRequest) => {
    let body: { token?: string; walletAddress?: string }
    try {
      body = await request.json()
    } catch {
      throw new ValidationError("Invalid request body")
    }
    const { token, walletAddress } = body

    if (!token && !walletAddress) {
      throw new ValidationError("Token or wallet address is required")
    }

    if (token) {
      const idx = tokensStore.findIndex((t) => t.token === token)
      if (idx !== -1) tokensStore.splice(idx, 1)
    } else if (walletAddress) {
      for (let i = tokensStore.length - 1; i >= 0; i--) {
        if (tokensStore[i].walletAddress === walletAddress) {
          tokensStore.splice(i, 1)
        }
      }
    }

    return NextResponse.json({ success: true })
  })
)

// GET returns every registered token/wallet pair across all users — a full
// data dump, not something an individual caller should be able to fetch.
// Gated behind the admin secret rather than left open. See issue #865.
export const GET = withErrorHandling(
  withAdminAuth(async () => {
    return NextResponse.json({ tokens: tokensStore })
  })
)
