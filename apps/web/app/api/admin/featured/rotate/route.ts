import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/api/errors";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { assertAdminAuth } from "@/lib/api/adminAuth";
import { readFeaturedId, writeFeaturedId } from "@/lib/featuredHuntDb";
import { SEED_HUNTS } from "@/lib/huntStore";

/**
 * POST /api/admin/featured/rotate
 *
 * Advances the featured hunt to the next active seeded hunt (round-robin).
 * Both the read and the write use the shared database so the rotation is
 * consistent across all instances and survives deploys.
 *
 * Any database failure propagates as an HTTP 500 rather than being silently
 * ignored.
 */
export const POST = withErrorHandling(async (req: Request) => {
  assertAdminAuth(req);
  // Only rotate amongst active seeded hunts
  const activeSeedHunts = SEED_HUNTS.filter((h) => h.status === "Active");
  if (activeSeedHunts.length === 0) {
    throw new NotFoundError("No active seeded hunts available to rotate");
  }

  const currentId = await readFeaturedId();
  let nextIndex = 0;

  if (currentId !== null) {
    const currentIndex = activeSeedHunts.findIndex((h) => h.id === currentId);
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % activeSeedHunts.length;
    }
  }

  const nextHunt = activeSeedHunts[nextIndex];
  // writeFeaturedId throws on DB failure — the error bubbles to withErrorHandling
  // which converts it to an HTTP 500 response.
  await writeFeaturedId(nextHunt.id);

  return NextResponse.json({
    success: true,
    rotatedTo: nextHunt.id,
    hunt: nextHunt,
  });
});
