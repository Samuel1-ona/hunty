import { NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

interface PushTokenRecord {
  token: string
  walletAddress: string
  registeredAt: number
}

const tokensStore: PushTokenRecord[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, walletAddress } = body

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Push token is required" },
        { status: 400 }
      )
    }

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      )
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
  } catch (error) {
    logger.error("Failed to register push token:", error)
    return NextResponse.json(
      { error: "Failed to register push token" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, walletAddress } = body

    if (!token && !walletAddress) {
      return NextResponse.json(
        { error: "Token or wallet address is required" },
        { status: 400 }
      )
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
  } catch (error) {
    logger.error("Failed to unregister push token:", error)
    return NextResponse.json(
      { error: "Failed to unregister push token" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    return NextResponse.json({ tokens: tokensStore })
  } catch (error) {
    logger.error("Failed to fetch push tokens:", error)
    return NextResponse.json(
      { error: "Failed to fetch push tokens" },
      { status: 500 }
    )
  }
}
