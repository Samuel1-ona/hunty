import { NextResponse } from "next/server";

import {
  getStoredNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/notifications/notificationPreferencesStore";
import { withValidation } from "@/lib/api/withValidation";
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
 */
export const GET = withValidation(
  { query: notificationPreferencesQuerySchema },
  async (_request, _context, { query }) => {
    const preferences = await getStoredNotificationPreferences(query.walletAddress);
    return NextResponse.json({ preferences });
  }
);

async function writePreferences(
  _request: Request,
  _context: unknown,
  { body }: { body: { walletAddress: string; preferences: Record<string, unknown> } }
): Promise<NextResponse> {
  const current = await getStoredNotificationPreferences(body.walletAddress);
  const preferences = await saveNotificationPreferences(body.walletAddress, {
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
