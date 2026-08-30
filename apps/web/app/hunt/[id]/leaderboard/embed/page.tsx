import Link from 'next/link';
import { get_hunt_leaderboard } from '@/lib/contracts/hunt';
import { getHuntById } from '@/lib/huntStore';

interface EmbedPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeaderboardEmbedPage({ params }: EmbedPageProps) {
  const { id } = await params;
  const huntId = parseInt(id, 10);
  const [leaderboard, hunt] = await Promise.all([
    get_hunt_leaderboard(huntId),
    Promise.resolve(getHuntById(huntId)),
  ]);

  const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
  const topEntry = sorted[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 100%)',
        color: 'white',
        padding: 24,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          background: 'rgba(15, 23, 42, 0.84)',
          border: '1px solid rgba(255,255,255,0.16)',
          borderRadius: 24,
          padding: 24,
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.24em',
                opacity: 0.7,
              }}
            >
              Hunty
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{hunt?.title || `Hunt ${huntId}`}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Top rank</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {topEntry ? topEntry.name || topEntry.address : 'No entries'}
            </div>
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Players</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{sorted.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Leader</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{topEntry?.points ?? 0} pts</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.slice(0, 5).map((entry, index) => (
            <div
              key={`${entry.address}-${index}`}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.75 }}>#{index + 1}</div>
                <div>{entry.name || entry.address}</div>
              </div>
              <div style={{ fontWeight: 700 }}>{entry.points} pts</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: 13, opacity: 0.8 }}>
          Powered by{' '}
          <Link
            href={`/hunt/${huntId}/leaderboard`}
            style={{ color: '#fde68a', textDecoration: 'underline' }}
          >
            Hunty
          </Link>
        </div>
      </div>
    </div>
  );
}
