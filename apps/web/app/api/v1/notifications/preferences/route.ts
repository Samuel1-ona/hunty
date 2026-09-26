import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getStoredNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notifications/notificationPreferencesStore";
import { withValidation } from "@/lib/api/withValidation";
import { verifyCallerAuth } from "@/lib/walletAuth";
import {
  notificationPreferencesBodySchema,
  notificationPreferencesQuerySchema,
} from "@hunty/types/api-schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/notifications/preferences?walletAddress=...
 *
 * Returns the canonical preference document for a wallet. A new wallet gets
 * the default document without creating a database row until the first write.
 * Reads stay public; writes are gated on a verified caller.
 */
export const GET = withValidation(
  { query: notificationPreferencesQuerySchema },
  async (_request, _context, { query }) => {
    const preferences = await getStoredNotificationPreferences(query.walletAddress);
    return NextResponse.json({ preferences });
  }
);

async function writePreferences(
  request: Request,
  _context: unknown,
  { body }: { body: { walletAddress: string; preferences: Record<string, unknown> } }
): Promise<NextResponse> {
  const auth = await verifyCallerAuth(request as unknown as NextRequest, body);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error || "Unauthenticated" }, { status: auth.status || 401 });
  }
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error || "Unauthorized" }, { status: auth.status || 403 });
  }

  const actor = auth.actor!;
  if (actor.toLowerCase() !== body.walletAddress.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "Forbidden: authenticated wallet does not match the requested wallet address",
      },
      { status: 403 }
    );
  }

  // Read and write are keyed by the verified actor, never by the body address.
  const current = await getStoredNotificationPreferences(actor);
  const preferences = await saveNotificationPreferences(actor, {
    ...current,
    ...body.preferences,
  });

  return NextResponse.json({ preferences });
}

const validatedWrite = withValidation(
  { body: notificationPreferencesBodySchema },
  writePreferences
);

/** PUT is the primary client operation; PATCH and POST keep the endpoint easy
 * to consume from mobile clients and older API integrations. */
export const PUT = validatedWrite;
export const PATCH = validatedWrite;
export const POST = validatedWrite;
