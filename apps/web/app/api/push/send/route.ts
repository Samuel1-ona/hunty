import { NextRequest, NextResponse } from "next/server";

import { AuthError, InternalError, ValidationError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { logger } from "@/lib/logger";
import { getIP, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { notifyWallet, notifyWallets } from "@/lib/notifications/pushService";
import type { PushEventType } from "@/lib/notifications/types";

/**
 * Internal service-to-service endpoint for triggering Web Push notifications.
 * Browser code must never call this endpoint because the credential is secret.
 */
function assertServiceOrAdminAuth(request: Request): void {
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const pushSecret = process.env.PUSH_API_SECRET;
  const adminSecret = process.env.ADMIN_API_SECRET;

  const matchesPush = Boolean(token && pushSecret && token === pushSecret);
  const matchesAdmin = Boolean(token && adminSecret && token === adminSecret);

  if (!matchesPush && !matchesAdmin) {
    throw new AuthError("A valid service or admin credential is required");
  }
}

const validTypes: PushEventType[] = [
  "hunt_start",
  "hunt_cancelled",
  "leaderboard_overtake",
  "player_registered",
  "first_completion",
];

export const POST = withErrorHandling(async (request: NextRequest) => {
  const ip = getIP(request);
  const { success, reset } = await rateLimit(ip, { limit: 50, windowMs: 60 * 1000 });
  if (!success) return rateLimitResponse(reset);

  assertServiceOrAdminAuth(request);

  let body: {
    type?: string;
    walletAddresses?: string[];
    context?: Record<string, string | number>;
  };
  try {
    body = await request.json();
  } catch {
    throw new ValidationError("Invalid request body");
  }

  const { type, walletAddresses, context = {} } = body;
  if (!type || !validTypes.includes(type as PushEventType)) {
    throw new ValidationError(`Invalid type. Must be one of: ${validTypes.join(", ")}`, {
      field: "type",
    });
  }
  if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
    throw new ValidationError("walletAddresses must be a non-empty array", {
      field: "walletAddresses",
    });
  }

  try {
    if (walletAddresses.length === 1) {
      await notifyWallet(walletAddresses[0], type as PushEventType, context);
    } else {
      await notifyWallets(walletAddresses, type as PushEventType, context);
    }
  } catch (error) {
    logger.error("[push/send] Failed to send push notification:", error);
    throw new InternalError("Failed to send push notification");
  }

  logger.info(`[push/send] Sent "${type}" to ${walletAddresses.length} wallet(s)`);
  return NextResponse.json({ success: true, sent: walletAddresses.length });
});
