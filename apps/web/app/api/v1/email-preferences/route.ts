/**
 * GET  /api/v1/email-preferences?wallet=<address>  — get player's email preferences
 * POST /api/v1/email-preferences                    — subscribe/unsubscribe
 *
 * POST body:
 * {
 *   "walletAddress": "<address>",
 *   "email": "<email>",
 *   "digestSubscribed": true/false
 * }
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { withErrorHandling } from "@/lib/api/withErrorHandling"
import { ValidationError } from "@/lib/api/errors"
import {
  getEmailPreference,
  upsertEmailPreference,
  updateDigestSubscription,
} from "@/lib/email/dbStore"

const getParamsSchema = z.object({
  wallet: z.string().min(1),
})

const postBodySchema = z.object({
  walletAddress: z.string().min(1),
  email: z.string().email(),
  digestSubscribed: z.boolean(),
})

/**
 * GET /api/v1/email-preferences?wallet=<address>
 */
export const GET = withErrorHandling(async (req: Request) => {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get("wallet")

  if (!wallet) {
    throw new ValidationError("Missing wallet parameter", { wallet })
  }

  const preference = await getEmailPreference(wallet)

  if (!preference) {
    return NextResponse.json(
      {
        walletAddress: wallet,
        email: null,
        digestSubscribed: false,
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    id: preference.id,
    walletAddress: preference.walletAddress,
    email: preference.email,
    digestSubscribed: preference.digestSubscribed,
    subscriptionDate: preference.subscriptionDate,
    lastUpdated: preference.lastUpdated,
    createdAt: preference.createdAt,
  })
})

/**
 * POST /api/v1/email-preferences
 *
 * Subscribe or update email preferences.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const body = await req.json()
  const parsed = postBodySchema.safeParse(body)

  if (!parsed.success) {
    throw new ValidationError("Invalid request body", {
      errors: parsed.error.flatten(),
    })
  }

  const { walletAddress, email, digestSubscribed } = parsed.data

  // Create or update preference
  const preference = await upsertEmailPreference(walletAddress, email, digestSubscribed)

  return NextResponse.json(
    {
      id: preference.id,
      walletAddress: preference.walletAddress,
      email: preference.email,
      digestSubscribed: preference.digestSubscribed,
      subscriptionDate: preference.subscriptionDate,
      lastUpdated: preference.lastUpdated,
      createdAt: preference.createdAt,
      message: digestSubscribed
        ? "Successfully subscribed to email digest"
        : "Successfully unsubscribed from email digest",
    },
    { status: 200 },
  )
})
