import { NextResponse } from 'next/server';

import { ValidationError } from '@/lib/api/errors';
import { withErrorHandling } from '@/lib/api/withErrorHandling';
import { dbGetActiveEditors } from '@/lib/collaborationDb';
import { getIP, rateLimit, rateLimitResponse } from '@/lib/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

function parseHuntId(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * GET /api/v1/hunts/:id/collaborators/presence/stream
 * SSE stream that emits active editors whenever the set changes.
 *
 * Polls the DB every 2s and emits an event when the active editor list changes.
 */
export const GET = withErrorHandling(async (req: Request, context: RouteContext) => {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 30, windowMs: 60_000 });
  if (!success) return rateLimitResponse(reset);

  const { id } = await context.params;
  const huntId = parseHuntId(id);
  if (huntId == null) {
    throw new ValidationError('Invalid hunt id', { id });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let lastPayload = '';

      const send = (data: unknown) => {
        const payload = JSON.stringify(data);
        if (payload === lastPayload) return;
        lastPayload = payload;
        const message = `data: ${payload}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      send({ type: 'connected', huntId });

      const interval = setInterval(async () => {
        try {
          const editors = await dbGetActiveEditors(huntId);
          send({ type: 'update', activeEditors: editors });
        } catch {
          send({ type: 'error', message: 'Failed to fetch presence' });
        }
      }, 2000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});
