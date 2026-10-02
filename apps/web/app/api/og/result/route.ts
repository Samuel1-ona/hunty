import React from "react";
import { ImageResponse } from "next/og";

import { formatDuration } from "@/lib/huntAttemptHistory";
import { getHuntById } from "@/lib/huntStore";
import { getPlayerHuntResult } from "@/lib/huntResults";
import { getAllProgressForHunt } from "@/lib/progressData";

// Note: deliberately NOT edge runtime. We read progress data from disk
// (`lib/progress-data/progress.json`) which requires the Node.js runtime, just
// like the results page does. ImageResponse works fine on the Node runtime.
export const runtime = "nodejs";

/** 1200×630 OG image canvas, matching the other OG share surfaces. */
const WIDTH = 1200;
const HEIGHT = 630;

/** Ordinal suffix for a rank, e.g. 1 -> "1st", 2 -> "2nd", 3 -> "3rd". */
function rankSuffix(rank: number): string {
  const suffix = ["th", "st", "nd", "rd"];
  const mod = rank % 100;
  const suffixIndex = mod >= 11 && mod <= 13 ? 0 : Math.min(rank % 10, 3);
  return `${rank}${suffix[suffixIndex]}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const huntId = parseInt(searchParams.get("huntId") || "", 10);
  const wallet = searchParams.get("wallet") || "";

  // Optional overrides so the card is accurate at the exact share moment,
  // even before progress data is persisted server-side.
  const rankOverride = parseInt(searchParams.get("rank") || "", 10);
  const timeOverride = parseInt(searchParams.get("time") || "", 10);

  const hunt = Number.isFinite(huntId) ? getHuntById(huntId) : undefined;
  const { rank, completionTimeSeconds } = getPlayerHuntResult(
    getAllProgressForHunt(huntId),
    wallet,
  );

  const effectiveRank = Number.isFinite(rankOverride) ? rankOverride : rank;
  const effectiveTime = Number.isFinite(timeOverride)
    ? timeOverride
    : completionTimeSeconds;

  const title = hunt?.title ?? `Hunt #${huntId ?? "?"}`;
  const rankLabel = effectiveRank ? `#${rankSuffix(effectiveRank)}` : "—";
  const timeLabel =
    effectiveTime != null ? formatDuration(effectiveTime) : "—";

  return new ImageResponse(
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 48,
          color: "white",
          background: "linear-gradient(135deg, #0C0C4F 0%, #2D2D8A 50%, #0E1530 100%)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "sans-serif",
        },
      },
      // Decorative background blobs (mirrors the branded hunt OG image)
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(139, 92, 246, 0.18)",
            filter: "blur(60px)",
          },
        },
      ),
      React.createElement(
        "div",
        {
          style: {
            position: "absolute",
            bottom: -60,
            left: 200,
            width: 360,
            height: 300,
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.14)",
            filter: "blur(80px)",
          },
        },
      ),
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 12, position: "relative" } },
        React.createElement("div", { style: { fontSize: 26, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: 2 } }, "Hunt Completed!"),
        React.createElement("div", { style: { fontSize: 52, fontWeight: 800, lineHeight: 1.1 } }, title)
      ),
      React.createElement(
        "div",
        { style: { display: "flex", gap: 16, position: "relative" } },
        React.createElement(
          "div",
          { style: { flex: 1, background: "rgba(255,255,255,0.16)", padding: 24, borderRadius: 18, display: "flex", flexDirection: "column", gap: 6 } },
          React.createElement("div", { style: { fontSize: 20, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 } }, "Rank"),
          React.createElement("div", { style: { fontSize: 44, fontWeight: 800 } }, rankLabel)
        ),
        React.createElement(
          "div",
          { style: { flex: 1, background: "rgba(255,255,255,0.16)", padding: 24, borderRadius: 18, display: "flex", flexDirection: "column", gap: 6 } },
          React.createElement("div", { style: { fontSize: 20, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 } }, "Time"),
          React.createElement("div", { style: { fontSize: 44, fontWeight: 800 } }, timeLabel)
        )
      ),
      React.createElement(
        "div",
        { style: { position: "relative", display: "flex", justifyContent: "flex-end", fontSize: 22, opacity: 0.6 } },
        "hunty.app"
      )
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}