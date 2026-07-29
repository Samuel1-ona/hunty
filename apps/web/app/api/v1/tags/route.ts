import { NextResponse } from "next/server"
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit"
import { getAllHunts } from "@/lib/huntStore"
import { autocompleteTags, normalizeTag, suggestTagsFromContent } from "@/lib/tags"
import { isHuntCategoryId } from "@/lib/categories"

/**
 * GET /api/v1/tags?q=mur&suggestFromTitle=...
 * Autocomplete + content-based tag suggestions for hunt discovery/creation.
 */
export async function GET(req: Request) {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 120, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q") ?? ""
  const title = searchParams.get("title") ?? undefined
  const description = searchParams.get("description") ?? undefined

  const corpus = new Set<string>()
  for (const hunt of getAllHunts()) {
    for (const tag of hunt.tags ?? []) corpus.add(normalizeTag(tag))
  }

  const autocomplete = autocompleteTags(q, [...corpus], 12)
  const suggestions = suggestTagsFromContent(
    { title, description },
    autocomplete,
    8,
  )

  return NextResponse.json({
    autocomplete,
    suggestions,
    corpusSize: corpus.size,
  })
}

/**
 * POST body helpers are not required; keep GET-only for now.
 * Category list is static client-side via lib/categories — expose for API consumers.
 */
export async function POST(req: Request) {
  const ip = getIP(req)
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 })
  if (!success) return rateLimitResponse(reset)

  let body: { category?: string; tags?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (body.category && !isHuntCategoryId(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    category: body.category ?? null,
    tags: (body.tags ?? []).map(normalizeTag).filter(Boolean),
  })
}
