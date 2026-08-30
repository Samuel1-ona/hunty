import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/time
 * Authoritative server time for countdown sync (prevents client clock manipulation).
 */
export async function GET() {
  const serverNowMs = Date.now();
  return NextResponse.json(
    {
      serverNowMs,
      serverTimestamp: Math.floor(serverNowMs / 1000),
      timestamp: new Date(serverNowMs).toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
