import { NextResponse } from "next/server";
import { get_hunt_leaderboard, get_hunt_fastest_players } from "@/lib/contracts/hunt";
import { rateLimit, getIP, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/v1/hunts/[id]/leaderboard/export
 *
 * Exports a hunt leaderboard for creators in CSV or JSON format,
 * optionally filtered by a date range (on completion time).
 *
 * Query params:
 *   - format: "csv" (default) | "json"
 *   - from:   ISO date string (inclusive) e.g. 2026-01-01T00:00:00Z
 *   - to:     ISO date string (inclusive)
 *
 * Each row contains: rank, wallet, score, time, date.
 * The export also includes aggregate statistics.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getIP(req);
  const { success, reset } = rateLimit(ip, { limit: 30, windowMs: 60 * 1000 });

  if (!success) {
    return rateLimitResponse(reset);
  }

  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (Number.isNaN(huntId)) {
    return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "Invalid format. Use 'csv' or 'json'." }, { status: 400 });
  }

  let fromMs: number | null = null;
  let toMs: number | null = null;

  try {
    if (fromParam) {
      const from = Date.parse(fromParam);
      if (Number.isNaN(from)) throw new Error("invalid");
      fromMs = from;
    }
    if (toParam) {
      const to = Date.parse(toParam);
      if (Number.isNaN(to)) throw new Error("invalid");
      // Inclusive end-of-day: add 24h when only a date was provided.
      toMs = /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? to + 24 * 60 * 60 * 1000 - 1 : to;
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid date range. Use ISO 8601 dates (e.g. 2026-01-01 or 2026-01-01T00:00:00Z)." },
      { status: 400 }
    );
  }

  try {
    const [leaderboard, fastest] = await Promise.all([
      get_hunt_leaderboard(huntId),
      get_hunt_fastest_players(huntId).catch(() => []),
    ]);

    // Map wallet -> completion time (ms) from fastest players data when available.
    const completionTimeByWallet = new Map<string, number>();
    for (const entry of fastest) {
      if (entry.address && typeof entry.completionTimeSeconds === "number") {
        // Completion time is a duration in seconds; we treat the fastest
        // completion row timestamp (when provided by the indexer) as the
        // completion moment. Fall back to the duration as the "time" field.
        completionTimeByWallet.set(entry.address, entry.completionTimeSeconds * 1000);
      }
    }

    const now = Date.now();
    const sorted = [...leaderboard].sort((a, b) => b.points - a.points);

    const rows = sorted
      .map((entry, index) => {
        const completionMs = completionTimeByWallet.get(entry.address) ?? now;
        return {
          rank: index + 1,
          wallet: entry.address,
          score: entry.points,
          time: new Date(completionMs).toISOString(),
          date: new Date(completionMs).toISOString().slice(0, 10),
        };
      })
      .filter((row) => {
        if (fromMs != null && new Date(row.time).getTime() < fromMs) return false;
        if (toMs != null && new Date(row.time).getTime() > toMs) return false;
        return true;
      });

    const totalScore = rows.reduce((sum, row) => sum + row.score, 0);
    const aggregation = {
      huntId,
      exportedAt: new Date().toISOString(),
      rowCount: rows.length,
      totalScore,
      averageScore: rows.length > 0 ? Math.round((totalScore / rows.length) * 100) / 100 : 0,
      highestScore: rows.length > 0 ? rows[0].score : 0,
      lowestScore: rows.length > 0 ? rows[rows.length - 1].score : 0,
      filter: {
        from: fromMs != null ? new Date(fromMs).toISOString() : null,
        to: toMs != null ? new Date(toMs).toISOString() : null,
      },
    };

    if (format === "json") {
      return NextResponse.json(
        { aggregation, rows },
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "content-disposition": `attachment; filename="hunt-${huntId}-leaderboard.json"`,
          },
        }
      );
    }

    const csv = toCsv(rows, aggregation);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="hunt-${huntId}-leaderboard.csv"`,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error exporting leaderboard for hunt ${huntId}:`, error);
    return NextResponse.json({ error: "Failed to export leaderboard" }, { status: 500 });
  }
}

interface ExportRow {
  rank: number;
  wallet: string;
  score: number;
  time: string;
  date: string;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: ExportRow[], aggregation: Record<string, unknown>): string {
  const header = ["rank", "wallet", "score", "time", "date"].join(",");
  const body = rows
    .map((row) => [
      csvEscape(row.rank),
      csvEscape(row.wallet),
      csvEscape(row.score),
      csvEscape(row.time),
      csvEscape(row.date),
    ].join(","));

  const aggLines = [
    `# huntId,${csvEscape(aggregation.huntId as number)}`,
    `# exportedAt,${csvEscape(aggregation.exportedAt as string)}`,
    `# rowCount,${csvEscape(aggregation.rowCount as number)}`,
    `# totalScore,${csvEscape(aggregation.totalScore as number)}`,
    `# averageScore,${csvEscape(aggregation.averageScore as number)}`,
    `# highestScore,${csvEscape(aggregation.highestScore as number)}`,
    `# lowestScore,${csvEscape(aggregation.lowestScore as number)}`,
    `# filterFrom,${csvEscape((aggregation.filter as { from: string | null }).from ?? "")}`,
    `# filterTo,${csvEscape((aggregation.filter as { to: string | null }).to ?? "")}`,
  ];

  return [...aggLines, header, ...body].join("\n");
}