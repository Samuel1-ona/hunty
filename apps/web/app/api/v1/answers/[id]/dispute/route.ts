/**
 * @deprecated Use /api/v1/answers/disputes instead.
 *
 * GET  /api/v1/answers/{id}/dispute
 *   → 308 /api/v1/answers/disputes?answerId={id}
 *
 * POST /api/v1/answers/{id}/dispute
 *   → 308 /api/v1/answers/disputes
 *
 * Clients should update to the canonical route shape:
 *   GET  /api/v1/answers/disputes?answerId={id}
 *   POST /api/v1/answers/disputes  (body includes answerId)
 */
import { NextResponse } from "next/server"

function getAnswerId(req: Request): string | null {
  const segments = new URL(req.url).pathname.split("/").filter(Boolean)
  // pathname: /api/v1/answers/{id}/dispute  → segments[-2] = id
  return segments[segments.length - 2] ?? null
}

export function GET(req: Request) {
  const answerId = getAnswerId(req)
  const base = new URL(req.url)
  const target = new URL("/api/v1/answers/disputes", base.origin)
  if (answerId) target.searchParams.set("answerId", answerId)
  return NextResponse.redirect(target.toString(), 308)
}

export function POST(req: Request) {
  const base = new URL(req.url)
  const target = new URL("/api/v1/answers/disputes", base.origin)
  return NextResponse.redirect(target.toString(), 308)
}
