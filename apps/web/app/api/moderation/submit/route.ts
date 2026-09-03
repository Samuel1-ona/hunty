import { NextResponse } from "next/server";
import { submitHuntForModeration } from "@/lib/moderation/dbStore";
import type { StoredHunt } from "@/lib/types";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { AuthError, RateLimitError, ValidationError } from "@/lib/api/errors";
import { getIP, rateLimit } from "@/lib/rate-limit";
import { verifySignedMessage } from "@/lib/signature";

export const POST = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const wallet = req.headers.get("x-wallet-address")?.trim();

  if (!wallet) {
    throw new AuthError("Wallet address required", { header: "x-wallet-address" });
  }

  const walletResult = rateLimit(`submit_wallet:${wallet}`, { limit: 10, windowMs: 60 * 1000 });
  if (!walletResult.success) {
    throw new RateLimitError("Too many submissions from this wallet", {
      reset: walletResult.reset,
      remaining: walletResult.remaining,
    });
  }

  const ipResult = rateLimit(`submit_ip:${ip}`, { limit: 100, windowMs: 60 * 1000 });
  if (!ipResult.success) {
    throw new RateLimitError("Too many submissions from this IP", {
      reset: ipResult.reset,
      remaining: ipResult.remaining,
    });
  }

  let body: { hunt?: StoredHint; challenge?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError("Invalid request body");
  }

  const { hunt, challenge, signature } = body ?? {};
  if (!hunt?.id || !hunt?.title) {
    throw new ValidationError("hunt with id and title is required");
  }
  if (!challenge || !signature) {
    throw new ValidationError("challenge and signature are required");
  }

  if (!verifySignedMessage({ address: wallet, challenge, signature, purpose: "moderation-submit" })) {
    throw new AuthError("Invalid signature", { wallet });
  }

  const submission = await submitHuntForModeration(hunt, wallet);
  return NextResponse.json({ success: true, submission });
});
