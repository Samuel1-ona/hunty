import { NextResponse } from 'next/server';
import { rateLimit, getIP, rateLimitResponse } from '@/lib/rate-limit';
import { getHuntById } from '@/lib/huntStore';

/**
 * GET /api/embed/[id]
 * Returns lightweight hunt data for the embed widget.
 * Private hunts return 403 so the widget can inform the viewer.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = getIP(req);
  const { success, reset } = await rateLimit(ip, { limit: 120, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (isNaN(huntId)) {
    return NextResponse.json({ error: 'Invalid hunt ID' }, { status: 400 });
  }

  const hunt = getHuntById(huntId);

  if (!hunt) {
    return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
  }

  if (hunt.is_private) {
    return NextResponse.json(
      { error: 'This hunt is private and cannot be embedded.' },
      { status: 403 }
    );
  }

  // Return only the fields the embed widget needs
  return NextResponse.json(
    {
      data: {
        id: hunt.id,
        title: hunt.title,
        description: hunt.description,
        cluesCount: hunt.cluesCount,
        status: hunt.status,
        rewardType: hunt.rewardType,
        coverImageCid: hunt.coverImageCid ?? null,
        startTime: hunt.startTime ?? null,
        endTime: hunt.endTime ?? null,
      },
    },
    {
      headers: {
        // Allow any origin to load embed data
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
