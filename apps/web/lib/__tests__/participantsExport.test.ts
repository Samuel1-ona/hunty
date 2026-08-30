// Tests for streaming participants CSV export (#1184).

import {
  collectParticipantRows,
  csvEscape,
  participantToCsvLine,
  streamParticipantsCsv,
} from '../participantsExport';

describe('participants CSV export (#1184)', () => {
  test('csvEscape quotes fields containing commas, quotes, newlines', () => {
    expect(csvEscape('plain')).toBe('plain');
    expect(csvEscape('with,comma')).toBe('"with,comma"');
    expect(csvEscape('has "quote"')).toBe('"has ""quote"""');
    expect(csvEscape('multi\nline')).toBe('"multi\nline"');
  });

  test('participantToCsvLine emits ordered columns', () => {
    const line = participantToCsvLine({
      rank: 1,
      wallet: 'GABC',
      alias: 'alice',
      score: 42,
      completionTime: '2026-08-24T00:00:00.000Z',
      joinedAt: '2026-08-23T00:00:00.000Z',
    });
    expect(line).toBe('1,GABC,alice,42,2026-08-24T00:00:00.000Z,2026-08-23T00:00:00.000Z');
  });

  test('streamParticipantsCsv streams header then chunks lazily', async () => {
    const total = 250;
    const calls: Array<[number, number]> = [];
    const rowSource = async (offset: number, limit: number) => {
      calls.push([offset, limit]);
      const rows = [];
      for (let i = offset; i < Math.min(offset + limit, total); i++) {
        rows.push({
          rank: i + 1,
          wallet: `W${i}`,
          alias: '',
          score: 100 - i,
          completionTime: '2026-08-24T00:00:00.000Z',
          joinedAt: '2026-08-20T00:00:00.000Z',
        });
      }
      return rows;
    };

    const stream = streamParticipantsCsv(total, 100, rowSource);
    const reader = (stream as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    let text = '';
    let chunkCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += decoder.decode(value);
      chunkCount += 1;
    }

    // header + 3 data chunks (250 rows / 100 per chunk)
    expect(chunkCount).toBe(4);
    const lines = text.trim().split('\n');
    expect(lines[0]).toBe('rank,wallet,alias,score,completion_time,joined_at');
    expect(lines).toHaveLength(total + 1);
    expect(calls).toEqual([
      [0, 100],
      [100, 100],
      [200, 100],
    ]);
  });

  test('collectParticipantRows excludes privacy opt-outs from ranking', async () => {
    const leaderboard = [
      { address: 'W1', points: 30 },
      { address: 'W2', points: 20 },
      { address: 'W3', points: 10 },
    ];
    const participants = [
      { address: 'W1', alias: 'alice', points: 30, privacy: { shareResults: true } },
      { address: 'W2', alias: 'bob', points: 20, privacy: { shareResults: false } },
      { address: 'W3', alias: '', points: 10 },
    ];

    const rows = await collectParticipantRows(leaderboard, [], async () => participants);

    // W2 opted out -> excluded entirely; W3 gets rank 2 (not 3)
    expect(rows.map((r) => r.wallet)).toEqual(['W1', 'W3']);
    expect(rows[1].rank).toBe(2);
  });
});
