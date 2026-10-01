import { huntSponsorBodySchema } from "@hunty/types/api-schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

import { NotFoundError,ValidationError } from "@/lib/api/errors";
import { withValidation } from "@/lib/api/withValidation";
import { logger } from "@/lib/logger";
import { getIP, rateLimit, rateLimitPresets, rateLimitResponse } from "@/lib/rate-limit";

const paramsSchema = z.object({ id: z.string() });

/**
 * The sponsor address is no longer trusted from the body; it is optional and,
 * when present, must match the verified wallet. The signed challenge may be
 * sent in the body or via the x-wallet-challenge / x-wallet-signature headers.
 */
const sponsorPostBodySchema = huntSponsorBodySchema
  .partial({ sponsorAddress: true })
  .extend({
    challenge: z.string().optional(),
    signature: z.string().optional(),
  });

/** Must match CHALLENGE_VALIDITY_MS in lib/signature.ts. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Challenges already accepted, keyed by challenge string → expiry timestamp. */
const usedChallenges = new Map<string, number>();

/**
 * Marks a challenge as used. Returns false if it was already consumed, so a
 * captured signature cannot be replayed within its validity window.
 */
function consumeChallenge(challenge: string): boolean {
  const now = Date.now();
  for (const [key, expiresAt] of usedChallenges) {
    if (expiresAt <= now) usedChallenges.delete(key);
  }
  if (usedChallenges.has(challenge)) return false;
  usedChallenges.set(challenge, now + CHALLENGE_TTL_MS);
  return true;
}

function sponsorChallengePurpose(huntId: number): string {
  return `sponsor-hunt-${huntId}`;
}

/**
 * POST /api/v1/hunts/[id]/sponsor
 *
 * Allows a third-party wallet (sponsor) to add funds to an existing hunt's
 * reward pool. The sponsor's address and contribution amount are recorded
 * separately from creator funds so attribution is preserved and sponsor totals
 * can be queried independently.
 *
 * Auth: the caller must prove wallet ownership with a signed challenge.
 *   Header  x-wallet-address: Stellar G-address of the sponsor
 *   Challenge/signature via body { challenge, signature } or headers
 *   x-wallet-challenge / x-wallet-signature. The challenge purpose must be
 *   `sponsor-hunt-<huntId>` (see lib/signature.ts) and each challenge is
 *   single-use. Missing/invalid credentials → 401; a body sponsorAddress that
 *   differs from the verified wallet → 403.
 *
 * Body: { amount: number, sponsorAddress?: string (must equal verified wallet) }
 *
 * Returns: {
 *   success: true,
 *   contribution: SponsorContribution,
 *   sponsorTotal: number,
 *   sponsors: SponsorContribution[]
 * }
 */
export const POST = withValidation(
  { body: sponsorPostBodySchema, params: paramsSchema },
  async (req, _context, { body, params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, rateLimitPresets.write);
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    const wallet = req.headers.get("x-wallet-address")?.trim();
    const challenge = body.challenge ?? req.headers.get("x-wallet-challenge")?.trim();
    const signature = body.signature ?? req.headers.get("x-wallet-signature")?.trim();

    if (!wallet || !challenge || !signature) {
      throw new AuthError(
        "Authentication required: x-wallet-address header and a signed challenge are required"
      );
    }

    if (
      !verifySignedMessage({
        address: wallet,
        challenge,
        signature,
        purpose: sponsorChallengePurpose(huntId),
      })
    ) {
      throw new AuthError("Invalid or expired wallet signature");
    }

    // The actor is the verified wallet. A body-supplied address is only
    // accepted as a consistency check and can never override it.
    if (body.sponsorAddress && body.sponsorAddress !== wallet) {
      throw new ForbiddenError("sponsorAddress does not match the authenticated wallet");
    }

    if (!consumeChallenge(challenge)) {
      throw new AuthError("Challenge has already been used");
    }

    const sponsor = wallet;

    try {
      const { getHunt } = await import("@/lib/huntStore");
      const hunt = getHunt(String(huntId));

      if (!hunt) {
        throw new NotFoundError("Hunt not found", { huntId });
      }

      if (hunt.status !== "Active" && hunt.status !== "Scheduled") {
        throw new ValidationError(
          "Sponsorship is only available for active or scheduled hunts",
          { status: hunt.status }
        );
      }

      const { sponsorHunt, getSponsorContributions, getSponsorTotal } = await import(
        "@/lib/contracts/rewardManager"
      );

      const contribution = await sponsorHunt(huntId, body.amount);

      const sponsorContributions = getSponsorContributions(huntId);
      const sponsorTotal = getSponsorTotal(huntId);

      return NextResponse.json({
        success: true,
        contribution: {
          ...contribution,
          // Attribute the contribution to the verified wallet, never the body.
          sponsor,
        },
        sponsorTotal,
        sponsors: sponsorContributions,
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      const message = error instanceof Error ? error.message : "Sponsorship failed";
      logger.error("Sponsor hunt error:", error);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }
);

/**
 * GET /api/v1/hunts/[id]/sponsor
 *
 * Returns sponsor attribution data: total sponsor funds and a list of all
 * individual sponsor contributions with their amounts and wallet addresses.
 * Sponsor funds are reported separately from creator funds.
 */
export const GET = withValidation(
  { params: paramsSchema },
  async (req, _context, { params }) => {
    const ip = getIP(req);
    const { success, reset } = await rateLimit(ip, rateLimitPresets.read);
    if (!success) return rateLimitResponse(reset);

    const huntId = parseInt(params!.id, 10);
    if (isNaN(huntId)) {
      throw new ValidationError("Invalid hunt ID", { id: params!.id });
    }

    try {
      const { getHunt } = await import("@/lib/huntStore");
      const hunt = getHunt(String(huntId));
      if (!hunt) {
        throw new NotFoundError("Hunt not found", { huntId });
      }

      const { getSponsorContributions, getSponsorTotal, getRewardEscrow } = await import(
        "@/lib/contracts/rewardManager"
      );

      const escrow = getRewardEscrow(huntId);
      const sponsors = getSponsorContributions(huntId);
      const sponsorTotal = getSponsorTotal(huntId);
      const creatorTotal = escrow ? escrow.totalPool - sponsorTotal : 0;

      return NextResponse.json({
        huntId,
        /** Total funds contributed by all sponsors (separate from creator funds). */
        sponsorTotal,
        /** Total funds contributed by the hunt creator. */
        creatorTotal,
        /** All sponsor contributions for attribution display. */
        sponsors,
      });
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error;
      logger.error("Get sponsor info error:", error);
      return NextResponse.json({ error: "Failed to fetch sponsor info" }, { status: 500 });
    }
  }
);
