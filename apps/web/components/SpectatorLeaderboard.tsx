"use client";

import { useCallback, useEffect, useState } from "react";

interface LeaderboardEntry {
  position: number;
  name: string;
  points: number;
  completionCount: number;
}

interface LeaderboardData {
  hunt: {
    id: number;
    title: string;
    description: string | null;
  } | null;
  leaderboard: LeaderboardEntry[];
  summary: {
    topRankName: string;
    topRankPoints: number;
    playerCount: number;
  };
  embedUrl: string;
  shareUrl: string;
}

export default function SpectatorLeaderboard({ huntId }: { huntId: string }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/hunts/${huntId}/leaderboard/public`);
      if (!response.ok) throw new Error("Failed to fetch");
      const json = await response.json();
      setData(json);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [huntId]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c10] text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (error || !data || !data.hunt) {
    return (
      <div className="min-h-screen bg-[#0b0c10] text-white flex flex-col items-center justify-center space-y-4">
        <p className="text-xl text-red-400">Failed to load leaderboard</p>
        <button
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded transition"
          onClick={fetchLeaderboard}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[150px] h-[100px] bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[100px] h-[75px] bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <div role="main" className="relative max-w-4xl mx-auto px-6 pt-16">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-semibold uppercase tracking-widest text-xs">
              Live
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-2">
            {data.hunt.title || "Hunt Spectator"}
          </h1>
          {data.hunt.description && (
            <p className="text-zinc-400 text-lg leading-relaxed">{data.hunt.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Top Player</p>
            <p className="text-white font-semibold text-lg">{data.summary.topRankName}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Top Points</p>
            <p className="text-white font-semibold text-lg">{data.summary.topRankPoints}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Players</p>
            <p className="text-white font-semibold text-lg">{data.summary.playerCount}</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-white/[0.03]">
            <h2 className="text-xl font-semibold">Leaderboard</h2>
          </div>
          <div className="divide-y divide-white/10">
            {data.leaderboard.length === 0 ? (
              <div className="p-8 text-center text-zinc-400">No players yet</div>
            ) : (
              data.leaderboard.map((entry) => (
                <div key={entry.position} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-bold w-8 text-center text-violet-400">
                      {entry.position}
                    </span>
                    <div>
                      <p className="font-medium text-white">{entry.name}</p>
                      <p className="text-xs text-zinc-500">
                        {entry.completionCount} clues completed
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-emerald-400">{entry.points} pts</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-zinc-400 break-all">
          <span className="font-semibold text-zinc-300">Share this view: </span>
          <a href={data.shareUrl} className="text-violet-400 hover:text-violet-300 underline">
            {data.shareUrl}
          </a>
        </div>
      </div>
    </div>
  );
}