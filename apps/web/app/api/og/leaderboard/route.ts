import React from 'react';
import { ImageResponse } from 'next/og';
import { get_hunt_leaderboard } from '@/lib/contracts/hunt';
import { getHuntById } from '@/lib/huntStore';

export const runtime = 'edge';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const huntId = parseInt(searchParams.get('huntId') || '1', 10);
  const wallet = searchParams.get('wallet') || '';

  const [leaderboard, hunt] = await Promise.all([
    get_hunt_leaderboard(huntId),
    Promise.resolve(getHuntById(huntId)),
  ]);

  const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
  const top = sorted[0];
  const userRank = wallet
    ? sorted.findIndex((entry) => entry.address === wallet || entry.name === wallet) + 1
    : 0;

  const title = hunt?.title || `Hunt ${huntId}`;
  const subtitle = top
    ? `${top.name || top.address} leads with ${top.points} points`
    : 'No public rankings yet';

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: 48,
          color: 'white',
          background: 'linear-gradient(135deg, #0f172a 0%, #312e81 100%)',
          fontFamily: 'sans-serif',
        },
      },
      React.createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        React.createElement(
          'div',
          { style: { fontSize: 24, fontWeight: 700, opacity: 0.8 } },
          'Hunty Leaderboard'
        ),
        React.createElement(
          'div',
          { style: { fontSize: 44, fontWeight: 800, lineHeight: 1.1 } },
          title
        ),
        React.createElement('div', { style: { fontSize: 24, opacity: 0.92 } }, subtitle)
      ),
      React.createElement(
        'div',
        { style: { display: 'flex', gap: 16 } },
        React.createElement(
          'div',
          {
            style: { flex: 1, background: 'rgba(255,255,255,0.16)', padding: 20, borderRadius: 18 },
          },
          React.createElement('div', { style: { fontSize: 20, opacity: 0.8 } }, 'Players'),
          React.createElement('div', { style: { fontSize: 36, fontWeight: 700 } }, sorted.length)
        ),
        React.createElement(
          'div',
          {
            style: { flex: 1, background: 'rgba(255,255,255,0.16)', padding: 20, borderRadius: 18 },
          },
          React.createElement('div', { style: { fontSize: 20, opacity: 0.8 } }, 'Your rank'),
          React.createElement(
            'div',
            { style: { fontSize: 36, fontWeight: 700 } },
            userRank > 0 ? `#${userRank}` : '—'
          )
        )
      )
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
