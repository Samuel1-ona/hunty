"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderBoardTable";
import { getHuntById } from "@/lib/huntStore";
import type { StoredHunt } from "@/lib/types";

interface LeaderboardPageProps {
  params: Promise<{ id: string }>;
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [hunt, setHunt] = useState<StoredHunt | null>(null);
  const [huntId, setHuntId] = useState<number | null>(null);

  useEffect(() => {
    const resolveParams = async () => {
      const { id } = await params;
      const huntIdNum = parseInt(id, 10);
      setHuntId(huntIdNum);
      const huntData = getHuntById(huntIdNum);
      setHunt(huntData || null);
    };
    resolveParams();
  }, [params]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-12 relative">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" asChild className="flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5">
            <Link href={`/hunt/${huntId ?? ""}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Hunt Details
            </Link>
          </Button>
        </div>
        {hunt ? (
          <>
            <div className="mb-8">
              <h1 className="mb-2 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
                {hunt.title} – Leaderboard
              </h1>
              <p className="text-zinc-400 text-lg">
                Spectator Mode – Auto‑refreshes every 30 seconds
              </p>
            </div>
            {huntId !== null && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner">
                <LeaderboardTable huntId={huntId} />
              </div>
            )}
          </>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-zinc-400 font-medium">Hunt not found</p>
            <Button asChild variant="outline" className="mt-4 border-white/20 text-white hover:bg-white/10">
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
