// Streaming CSV export of hunt participants and results (#1184).
//
// Mirrors the leaderboard export route but adds:
//  - participant rows (not just leaderboard ranks), honoring privacy settings
//  - streaming via ReadableStream so large exports don't buffer in memory
//
// Privacy: participants who set `shareResults: false` are excluded from the
// export entirely; their row never leaves the server.

// Pure module: data sources are injected by the caller (route), so this
// file has no server-only imports and stays unit-testable in isolation.

export interface ParticipantRow {
  rank: number;
  wallet: string;
  alias: string | '';
  score: number;
  completionTime: string;
  joinedAt: string;
}

export interface ExportPrivacyOptions {
  /** When false, the participant is excluded from exports (their choice). */
  shareResults?: boolean;
}

export function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Yield-safe CSV header for the participants export. */
export function participantsCsvHeader(): string {
  return 'rank,wallet,alias,score,completion_time,joined_at';
}

/** Serialize one participant row as a CSV line. */
export function participantToCsvLine(row: ParticipantRow): string {
  return [
    csvEscape(row.rank),
    csvEscape(row.wallet),
    csvEscape(row.alias),
    csvEscape(row.score),
    csvEscape(row.completionTime),
    csvEscape(row.joinedAt),
  ].join(',');
}

/**
 * Build a streaming web ReadableStream of CSV text from participant rows.
 * Rows are pulled lazily through `rowSource` in chunks so very large hunts
 * do not need to fit in memory.
 */
export function streamParticipantsCsv(
  total: number,
  chunkSize: number,
  rowSource: (offset: number, limit: number) => Promise<ParticipantRow[]>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let offset = 0;
  let headerSent = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headerSent) {
        controller.enqueue(encoder.encode(participantsCsvHeader() + '\n'));
        headerSent = true;
        return;
      }
      if (offset >= total) {
        controller.close();
        return;
      }
      const rows = await rowSource(offset, chunkSize);
      if (rows.length === 0) {
        controller.close();
        return;
      }
      const text = rows.map(participantToCsvLine).join('\n') + '\n';
      controller.enqueue(encoder.encode(text));
      offset += rows.length;
    },
  });
}

/**
 * Collect participant rows for a hunt, applying privacy filtering.
 * Participants with shareResults === false are excluded before any row is built.
 */
export async function collectParticipantRows(
  leaderboard: Array<{ address: string; points: number }>,
  fastest: Array<{ address?: string; completionTimeSeconds?: number }>,
  getParticipants: () => Promise<
    Array<{
      address: string;
      alias?: string;
      points?: number;
      completedAt?: number;
      joinedAt?: number;
      privacy?: ExportPrivacyOptions;
    }>
  >
): Promise<ParticipantRow[]> {
  const completionTimeByWallet = new Map<string, number>();
  for (const entry of fastest) {
    if (entry.address && typeof entry.completionTimeSeconds === 'number') {
      completionTimeByWallet.set(entry.address, entry.completionTimeSeconds * 1000);
    }
  }

  const participants = await getParticipants();
  const sorted = [...leaderboard].sort((a, b) => b.points - a.points);

  const rows: ParticipantRow[] = [];
  let rank = 0;
  for (const entry of sorted) {
    const participant = participants.find((p) => p.address === entry.address);
    // Privacy: exclude participants who opted out of sharing results.
    if (participant?.privacy?.shareResults === false) continue;
    rank += 1;
    const completionMs =
      completionTimeByWallet.get(entry.address) ?? participant?.completedAt ?? Date.now();
    rows.push({
      rank,
      wallet: entry.address,
      alias: participant?.alias ?? '',
      score: entry.points,
      completionTime: new Date(completionMs).toISOString(),
      joinedAt: new Date(participant?.joinedAt ?? completionMs).toISOString(),
    });
  }
  return rows;
}
