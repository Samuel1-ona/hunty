import { NextResponse } from 'next/server';

import { getHuntById } from '@/lib/huntStore';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const huntId = Number(id);

  if (Number.isNaN(huntId)) {
    return NextResponse.json({ error: 'Invalid hunt id' }, { status: 400 });
  }

  const hunt = getHuntById(huntId);
  if (!hunt) {
    return NextResponse.json({ error: 'Hunt not found' }, { status: 404 });
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0C0C4F" />
          <stop offset="100%" stop-color="#3737A4" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bg)" />
      <circle cx="1040" cy="130" r="180" fill="rgba(255,255,255,0.08)" />
      <circle cx="170" cy="550" r="210" fill="rgba(232,119,133,0.20)" />
      <text x="80" y="130" font-size="44" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">Hunty Scavenger Hunt</text>
      <text x="80" y="240" font-size="66" font-family="Arial, sans-serif" fill="#ffffff" font-weight="700">${hunt.title}</text>
      <text x="80" y="320" font-size="30" font-family="Arial, sans-serif" fill="#D8DBFF">${hunt.description.slice(0, 90)}</text>
      <text x="80" y="390" font-size="28" font-family="Arial, sans-serif" fill="#FFD43E">Reward: ${hunt.rewardType}</text>
      <text x="80" y="450" font-size="24" font-family="Arial, sans-serif" fill="#FFFFFF">Clues: ${hunt.cluesCount}</text>
      <text x="80" y="520" font-size="24" font-family="Arial, sans-serif" fill="#FFFFFF">Status: ${hunt.status}</text>
      <text x="80" y="580" font-size="24" font-family="Arial, sans-serif" fill="#FFFFFF">hunty.app</text>
    </svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=600',
    },
  });
}
