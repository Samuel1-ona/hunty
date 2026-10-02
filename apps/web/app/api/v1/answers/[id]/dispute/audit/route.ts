/**
 * @deprecated Use /api/v1/answers/disputes/{id}/audit instead.
 *
 * This endpoint has been removed. The audit log for a specific dispute
 * can be fetched from the canonical route:
 *   GET /api/v1/answers/disputes/{disputeId}/audit
 *
 * The old route served a per-answer audit trail that aggregated all dispute
 * audit entries for a given answerId.  That functionality is now available
 * by listing disputes for an answer first:
 *   GET /api/v1/answers/disputes?answerId={id}
 * and then fetching audit entries per disputeId.
 */
import { NextResponse } from "next/server"

export function GET() {
  return NextResponse.json(
    {
      error: "Gone",
      message:
        "This endpoint has been removed. " +
        "Fetch disputes for an answer via GET /api/v1/answers/disputes?answerId={id}, " +
        "then retrieve audit entries via GET /api/v1/answers/disputes/{disputeId}/audit.",
    },
    { status: 410 },
  )
}
