import { NextResponse } from 'next/server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { getAllHunts } from '@/lib/huntStore';
import { autocompleteTags, normalizeTag, suggestTagsFromContent } from '@/lib/tags';
import { isHuntCategoryId } from '@/lib/categories';
import { withValidation } from '@/lib/api/withValidation';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { ValidationError } from '@/lib/api/errors';
import { tagsBodySchema, tagsQuerySchema } from '@hunty/types/api-schemas';

/**
 * GET /api/v1/tags?q=mur&suggestFromTitle=...
 * Autocomplete + content-based tag suggestions for hunt discovery/creation.
 */
export const GET = withErrorHandling(async (req: Request) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 120, windowMs: 60_000 });
  if (!success) return rateLimitResponse(reset);

  const { searchParams } = new URL(req.url);
  const queryResult = tagsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!queryResult.success) {
    throw new ValidationError('Invalid query parameters', {
      fieldErrors: queryResult.error.flatten().fieldErrors,
    });
  }
  const { q, title, description } = queryResult.data;

  const corpus = new Set<string>();
  for (const hunt of getAllHunts()) {
    for (const tag of hunt.tags ?? []) corpus.add(normalizeTag(tag));
  }

  const autocomplete = autocompleteTags(q, [...corpus], 12);
  const suggestions = suggestTagsFromContent({ title, description }, autocomplete, 8);

  return NextResponse.json({
    autocomplete,
    suggestions,
    corpusSize: corpus.size,
  });
});

/**
 * POST /api/v1/tags
 * Category list is static client-side via lib/categories — expose for API consumers.
 */
export const POST = withValidation({ body: tagsBodySchema }, async (req, _context, { body }) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 60, windowMs: 60_000 });
  if (!success) return rateLimitResponse(reset);

  if (body.category && !isHuntCategoryId(body.category)) {
    throw new ValidationError('Invalid category', { category: body.category });
  }

  return NextResponse.json({
    ok: true,
    category: body.category ?? null,
    tags: (body.tags ?? []).map(normalizeTag).filter(Boolean),
  });
});
