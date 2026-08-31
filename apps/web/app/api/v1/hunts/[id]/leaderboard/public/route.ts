import { NextResponse } from "next/server";
import { get_hunt_leaderboard } from "@lib/contracts/hunt";
import { getHuntById } from "@lib/huntStore";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const huntId = parseInt(id, 10);

  if (Number.isNaN(huntId)) {
    return NextResponse.json({ error: "Invalid hunt ID" }, { status: 400 });
  }

  try {
    const [leaderboard, hunt] = await Promise.all([
      get_hunt_leaderboard(huntId),
      Promise.resolve(getHuntById(huntId)),
    ]);

    const sorted = [...leaderboard].sort((a, b) => b.points - a.points);
    const topEntry = sorted[0];
    const playerCount = sorted.length;

    const responseBody = {
      hunt: hunt
        ? {
            id: hunt.id,
            title: hunt.title,
            description: hunt.description,
          }
        : null,
      leaderboard: sorted.slice(0, 10).map((entry, index) => ({
        position: index + 1,
        name: entry.name || entry.address,
        points: entry.points,
        completionCount: entry.completionCount ?? 0,
      })),
      summary: {
        topRankName: topEntry?.name || topEntry?.address || "No entries yet",
        topRankPoints: topEntry?.points ?? 0,
        playerCount,
        lastUpdated: new Date().toISoString(),
      },
      embedUrl: `${baseUrl}/api/og/leaderboard?huntId=${huntId}`,
      shareUrl: `${baseUrl}/hunt/${huntId}/leaderboard`,
      spectator: true,
    };

    return NextResponse.json(responseBody, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch public leaderboard" }, { status: 500 });
  }
}
