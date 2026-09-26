import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { ForbiddenError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import {
  getOwnerSecretForWallet,
  getSubscriptionsForWallet,
  removeSubscriptionsForWallet,
  upsertSubscription,
} from "@/lib/notifications/subscriptionStore";

/**
 * Push registration is bound to a per-wallet owner secret rather than a bare
 * walletAddress. The secret prevents a client that only knows the wallet
 * address from replacing or deleting its push registration.
 *
 * This is separate from notification preference sync: preferences are keyed by
 * wallet in the durable preference store, while this secret is only used to
 * manage a browser's PushSubscription.
 */

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time compare via fixed-length digests, so lengths never leak. */
async function secretMatches(
  walletAddress: string,
  candidate: string | null | undefined
): Promise<boolean> {
  const stored = await getOwnerSecretForWallet(walletAddress.toLowerCase());
  if (!stored || !candidate) return false;
  return timingSafeEqual(digest(stored), digest(candidate));
}

function mintSecret(): string {
  return randomBytes(32).toString("hex");
}

interface PushTokenBody {
  subscription?: PushSubscriptionJSON;
  walletAddress?: string;
  ownerSecret?: string;
  preferences?: Record<string, boolean>;
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  let body: PushTokenBody;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid request body");
  }

  const { subscription, walletAddress, ownerSecret, preferences } = body;

  if (!walletAddress || typeof walletAddress !== "string") {
    throw new ValidationError("Wallet address is required", { field: "walletAddress" });
  }

  if (
    !subscription ||
    typeof subscription !== "object" ||
    typeof subscription.endpoint !== "string"
  ) {
    throw new ValidationError("A valid push subscription is required", { field: "subscription" });
  }

  const key = walletAddress.toLowerCase();
  const storedSecret = await getOwnerSecretForWallet(key);
  const isFirstRegistration = !storedSecret;

  if (!isFirstRegistration && !(await secretMatches(walletAddress, ownerSecret))) {
    throw new ForbiddenError(
      "A valid ownerSecret is required to update this wallet's push registration"
    );
  }

  const secret = isFirstRegistration ? mintSecret() : storedSecret!;

  await upsertSubscription(subscription, walletAddress, preferences, secret);

  if (isFirstRegistration) {
    // Returned once. The client persists it and sends it on later updates or
    // when it unsubscribes.
    return NextResponse.json({ success: true, ownerSecret: secret });
  }

  return NextResponse.json({ success: true });
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  let body: { walletAddress?: string; ownerSecret?: string };
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid request body");
  }

  const { walletAddress, ownerSecret } = body;

  if (!walletAddress || typeof walletAddress !== "string") {
    throw new ValidationError("Wallet address is required", { field: "walletAddress" });
  }

  const storedSecret = await getOwnerSecretForWallet(walletAddress.toLowerCase());
  if (!storedSecret) {
    // Idempotent no-op. Do not reveal whether this wallet has registered.
    return NextResponse.json({ success: true });
  }

  if (!(await secretMatches(walletAddress, ownerSecret))) {
    throw new ForbiddenError(
      "A valid ownerSecret is required to remove this wallet's push registration"
    );
  }

  await removeSubscriptionsForWallet(walletAddress);

  return NextResponse.json({ success: true });
});

export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("walletAddress");
  const ownerSecret = request.headers.get("x-owner-secret");

  if (!walletAddress || !(await secretMatches(walletAddress, ownerSecret))) {
    // Identical response whether the wallet never registered or the secret is
    // wrong, so this cannot be used to probe which wallets use push.
    return NextResponse.json({ registered: false });
  }

  const subscriptions = await getSubscriptionsForWallet(walletAddress);
  return NextResponse.json({
    registered: subscriptions.length > 0,
    registeredAt: subscriptions[0]?.registeredAt,
  });
});
