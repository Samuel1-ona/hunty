import { NextResponse } from "next/server";

import { assertAdminAuth } from "@/lib/api/adminAuth";
import { withErrorHandling } from "@/lib/api/withErrorHandling";
import { getAllHunts } from "@/lib/huntStore";
import { getPendingSubmissions } from "@/lib/moderation/dbStore";
import { getErrorRate, getMetrics } from "@/lib/monitoring/apiMonitor";

/**
 * GET /api/admin/dashboard
 *
 * Returns the platform-wide counters displayed by the admin overview. This
 * endpoint intentionally uses the same admin bearer-token guard as the other
 * admin APIs because the aggregate data is not public operational telemetry.
 */
export const GET = withErrorHandling(async (req: Request) => {
  assertAdminAuth(req);

  const [hunts, pendingSubmissions] = await Promise.all([
    Promise.resolve(getAllHunts()),
    getPendingSubmissions(),
  ]);
  const metrics = getMetrics();

  return NextResponse.json({
    hunts: {
      total: hunts.length,
      active: hunts.filter((hunt) => hunt.status === "Active").length,
      pendingReview: hunts.filter((hunt) => hunt.status === "PendingReview").length,
    },
    players: {
      registrations: hunts.reduce((total, hunt) => total + (hunt.playerCount ?? 0), 0),
    },
    moderation: {
      pending: pendingSubmissions.length,
    },
    api: {
      errorRate: getErrorRate(),
      sampledRequests: metrics.length,
    },
    generatedAt: new Date().toISOString(),
  });
});
