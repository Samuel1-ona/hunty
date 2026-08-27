import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

import { NextRequest, NextResponse } from "next/server"
import { ForbiddenError, ValidationError } from "@/lib/api/errors"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import {
  getSubscriptionsForWallet,
  removeSubscriptionsForWallet,
  upsertSubscription,
} from "@/lib/notifications/subscriptionStore"

/**
 * Push registration is bound to a per-wallet owner secret rather than a
 * bare walletAddress: this codebase has no signature-based wallet auth (no
 * route anywhere verifies private-key ownership), so a cryptographic
 * "authenticated wallet" check isn't available to build on here. Instead,
 * the first POST for a walletAddress mints a random secret and returns it
 * once; every later POST/DELETE/GET for that wallet must present the same
 * secret. This stops a third party who only knows or guesses a wallet
 * address from enumerating, overwriting, or deleting someone else's
 * registration — the concrete attacks this route previously allowed.
 */
const ownerSecrets = new Map<string, string>()

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest()
}

/** Constant-time compare via fixed-length digests, so lengths never leak. */
function secretMatches(walletAddress: string, candidate: string | null | undefined): boolean {
  const stored = ownerSecrets.get(walletAddress.toLowerCase())
  if (!stored || !candidate) return false
  return timingSafeEqual(digest(stored), digest(candidate))
}
import { withValidation } from "@/lib/api/withValidation"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { pushTokenRegisterBodySchema, pushTokenDeleteBodySchema } from "@hunty/types/api-schemas"

function mintSecret(): string {
  return randomBytes(32).toString("hex")
}

interface PushTokenBody {
  subscription?: PushSubscriptionJSON
  walletAddress?: string
  ownerSecret?: string
  preferences?: Record<string, boolean>
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  let body: PushTokenBody
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  const { subscription, walletAddress, ownerSecret, preferences } = body

  if (!walletAddress || typeof walletAddress !== "string") {
    throw new ValidationError("Wallet address is required", { field: "walletAddress" })
  }

  if (!subscription || typeof subscription !== "object" || typeof subscription.endpoint !== "string") {
    throw new ValidationError("A valid push subscription is required", { field: "subscription" })
  }

  const key = walletAddress.toLowerCase()
  const isFirstRegistration = !ownerSecrets.has(key)

  if (!isFirstRegistration && !secretMatches(walletAddress, ownerSecret)) {
    throw new ForbiddenError("A valid ownerSecret is required to update this wallet's push registration")
  }

  upsertSubscription(subscription, walletAddress, preferences)

  if (isFirstRegistration) {
    const secret = mintSecret()
    ownerSecrets.set(key, secret)
    // Returned exactly once, on first registration — the caller must persist
    // this to manage (re-sync preferences on, or unregister) this wallet's
    // push subscription later.
    return NextResponse.json({ success: true, ownerSecret: secret })
  }
export const POST = withValidation(
  { body: pushTokenRegisterBodySchema },
  async (_request: NextRequest, _context, { body }) => {
    const { token, walletAddress } = body

    const existingIndex = tokensStore.findIndex(
      (t) => t.token === token || t.walletAddress === walletAddress
    )

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  let body: { walletAddress?: string; ownerSecret?: string }
  try {
    body = await request.json()
  } catch {
    throw new ValidationError("Invalid request body")
  }

  const { walletAddress, ownerSecret } = body

  if (!walletAddress || typeof walletAddress !== "string") {
    throw new ValidationError("Wallet address is required", { field: "walletAddress" })
  }

  const key = walletAddress.toLowerCase()
  if (!ownerSecrets.has(key)) {
    // Nothing registered for this wallet: idempotent no-op. Don't
    // distinguish this from a wrong-secret rejection below, or the
    // response would leak whether a wallet has ever registered.
    return NextResponse.json({ success: true })
  }

  if (!secretMatches(walletAddress, ownerSecret)) {
    throw new ForbiddenError("A valid ownerSecret is required to remove this wallet's push registration")
  }

  removeSubscriptionsForWallet(walletAddress)
  ownerSecrets.delete(key)

  return NextResponse.json({ success: true })
})
    if (existingIndex !== -1) {
      tokensStore[existingIndex] = { token, walletAddress, registeredAt: Date.now() }
    } else {
      tokensStore.push({ token, walletAddress, registeredAt: Date.now() })
    }

    return NextResponse.json({ success: true })
  }
)

export const DELETE = withValidation(
  { body: pushTokenDeleteBodySchema },
  async (_request: NextRequest, _context, { body }) => {
    if (body.token) {
      const idx = tokensStore.findIndex((t) => t.token === body.token)
      if (idx !== -1) tokensStore.splice(idx, 1)
    } else if (body.walletAddress) {
      for (let i = tokensStore.length - 1; i >= 0; i--) {
        if (tokensStore[i].walletAddress === body.walletAddress) {
          tokensStore.splice(i, 1)
        }
      }
    }

    return NextResponse.json({ success: true })
  }
)

export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get("walletAddress")
  const ownerSecret = searchParams.get("ownerSecret")

  if (!walletAddress || !secretMatches(walletAddress, ownerSecret)) {
    // Identical response whether the wallet has never registered or the
    // secret is wrong, so this can't be used to probe which wallets are
    // registered for push.
    return NextResponse.json({ registered: false })
  }

  const subscriptions = getSubscriptionsForWallet(walletAddress)
  return NextResponse.json({
    registered: subscriptions.length > 0,
    registeredAt: subscriptions[0]?.registeredAt,
  })
})
