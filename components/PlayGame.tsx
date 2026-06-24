"use client";

import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import { Button } from "@/components/ui/button";
import { HuntPageSkeletonLayout } from "@/components/LoadingSkeletons";
import { Header } from "@/components/Header";
import { PlayerProgressPanel } from "@/components/PlayerProgressPanel";
import { get_clue_info, get_hunt } from "@/lib/contracts/hunt";
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys";
import { SOROBAN_READ_STALE_TIME_MS } from "@/lib/soroban/queryConfig";

import { HuntCards } from "./HuntCards";
import Replay from "./icons/Replay";
import Share from "./icons/Share";
import type { HuntCard as Hunt, HuntInfo } from "@/lib/types";

interface PlayGameProps {
  hunts: Hunt[];
  gameName: string;
  onExit: () => void;
  onGameComplete: (score: number) => void;
  gameCompleteModal?: React.ReactNode;
  huntId?: number;
  playerAddress?: string;
}

export function PlayGame({
  hunts: huntsProp,
  gameName,
  onExit,
  onGameComplete,
  gameCompleteModal,
  huntId,
}: PlayGameProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedClues, setSolvedClues] = useState<Set<number>>(new Set());
  const [huntEnded, setHuntEnded] = useState(false);

  const solvedCount = solvedClues.size;

  const {
    data: fetched = null as null | { clues: Hunt[]; huntInfo: HuntInfo },
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.hunts.clues(huntId),
    queryFn: async () => {
      if (huntId == null) return null;
      const huntInfo = await get_hunt(huntId);
      const clues: Hunt[] = [];

      for (let i = 0; i < huntInfo.totalClues; i++) {
        const clue = await get_clue_info(huntId, i);
        clues.push({
          id: clue.id,
          title: clue.question,
          description: `${clue.points} pts`,
          link: "",
          code: "",
          points: clue.points,
          hint: clue.hint,
          hintCost: clue.hintCost,
          difficulty: clue.difficulty,
        });
      }
      return { clues, huntInfo };
    },
    enabled: huntId != null,
    staleTime: Math.max(SOROBAN_READ_STALE_TIME_MS, queryCachePolicy.hunts.staleTime),
    gcTime: queryCachePolicy.hunts.gcTime,
    refetchInterval: queryCachePolicy.hunts.refetchInterval,
    refetchIntervalInBackground: true,
  });

  const error: string | null = queryError instanceof Error ? queryError.message : queryError ? "Failed to fetch clues" : null;
  const fetchedClues = fetched?.clues ?? null;
  const huntInfo = fetched?.huntInfo ?? null;
  const hunts = huntId != null ? (fetchedClues ?? []) : (huntsProp ?? []);
  const hasHunts = hunts.length > 0;

  useEffect(() => {
    setCurrentCardIndex(0);
    setScore(0);
    setSolvedClues(new Set());
  }, [huntId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Check if hunt has ended
  useEffect(() => {
    if (huntInfo?.endTime) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= huntInfo.endTime) {
        setHuntEnded(true);
      } else {
        setHuntEnded(false);
      }
    }
  }, [huntInfo?.endTime]);

  const handleScoreUpdate = (points: number) => {
    setScore((prev) => prev + points);
  };

  const handleClueUnlock = (clueIndex: number) => {
    const clue = hunts[clueIndex];
    if (clue) {
      setSolvedClues((prev) => new Set(prev).add(clue.id));
    }

    if (clueIndex < hunts.length - 1) {
      setCurrentCardIndex(clueIndex + 1);
    } else {
      // Hunt completed! Trigger notification if enabled
      if (huntId && huntInfo?.emailNotifications && huntInfo?.creatorEmail) {
        fetch("/api/notifications/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            huntId,
            huntName: gameName,
            creatorEmail: huntInfo.creatorEmail,
            completionTime: new Date().toLocaleString(),
          }),
        }).catch((err) => logger.error("Failed to send notification:", err));
      }
      if (huntId) {
        localStorage.setItem(`hunt_completed_${huntId}`, "true");
      }
      onGameComplete(score);
    }
  };

  if (loading && !hasHunts) {
    return (
      <HuntPageSkeletonLayout />
    );
  }

  if (error && !hasHunts) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] flex items-center justify-center">
        <div className="text-center rounded-3xl bg-white px-8 py-10 shadow-lg">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            {huntId != null && (
              <Button onClick={() => refetch()}>
                Retry
              </Button>
            )}
            <Button variant="ghost" onClick={onExit}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasHunts) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] flex items-center justify-center">
        <div className="text-center rounded-3xl bg-white px-8 py-10 shadow-lg">
          <p className="text-slate-700 text-lg mb-4">
            No clues available for this hunt yet.
          </p>
          <Button variant="ghost" onClick={onExit}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Show hunt ended message
  if (huntEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center rounded-3xl bg-white dark:bg-slate-900 px-8 py-10 shadow-lg border border-slate-100 dark:border-white/5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Hunt Ended
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            This hunt has ended. Final score: <span className="font-bold text-slate-900 dark:text-white">{score}</span>
          </p>
          <div className="pt-4">
            <Button onClick={onExit} className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white px-6 py-2 rounded-full">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeHunt = hunts[currentCardIndex];

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] print:bg-white print:bg-none print:min-h-0">
      <div className="print:hidden">
        <Header balance="24.2453" />
      </div>

      <div className="max-w-[1500px] px-14 pt-10 pb-12 bg-white mx-auto rounded-4xl relative print:px-0 print:py-0 print:w-full print:max-w-none print:rounded-none">
        <div className="flex items-center gap-4 mb-8 print:hidden">
          <Button
            variant="ghost"
            onClick={onExit}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-6 h-6 fill-[#0C0C4F]" />
            <span className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text text-xl font-normal">
              Go Home
            </span>
          </Button>
          <div className="text-right ml-auto">
            <span className="bg-gradient-to-b from-[#E3225C] to-[#7B1C4A] text-transparent bg-clip-text text-xl font-normal">
              Edit Game
            </span>
            <br />
            <span className="text-sm bg-gradient-to-b from-[#787884] to-[#576065] text-transparent bg-clip-text">
              (Only You Can See This)
            </span>
          </div>
        </div>

        <div className="text-center mb-8 print:hidden">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
            <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-b to-[#3737A4] from-[#0C0C4F] bg-clip-text text-transparent mb-6">
            Play {gameName}
          </h1>

          <PlayerProgressPanel
            cluesSolved={solvedCount}
            totalClues={hunts.length}
            totalPoints={score}
          />

          <div className="flex justify-center gap-4 mb-8">
            <Button className="bg-gradient-to-b from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white px-6 py-2 rounded-full flex items-center gap-2">
              <Replay /> Reset
            </Button>
            <Button className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center gap-2">
              <Share />
              Share Link
            </Button>
          </div>
        </div>

        <div className="relative flex justify-center mt-8 min-h-[500px] overflow-x-auto print:mt-0 print:min-h-0 print:overflow-visible">
          <div className="relative flex items-start justify-center w-full max-w-none px-8 print:p-0">
            {currentCardIndex > 0 && (
              <div className="absolute left-0 top-0 flex flex-col gap-4 mr-8 print:hidden">
                <div className="opacity-40 scale-60 transform origin-right">
                  <HuntCards
                    hunts={[hunts[currentCardIndex - 1]]}
                    isActive={false}
                    preview={true}
                    currentIndex={currentCardIndex}
                    totalHunts={hunts.length}
                    points={hunts[currentCardIndex - 1].points}
                    solved={solvedClues.has(hunts[currentCardIndex - 1].id)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-center mx-auto z-10">
              <HuntCards
                hunts={activeHunt ? [activeHunt] : []}
                isActive={true}
                isLoading={loading}
                huntId={huntId}
                onScoreUpdate={handleScoreUpdate}
                onUnlock={() => handleClueUnlock(currentCardIndex)}
                currentIndex={currentCardIndex + 1}
                totalHunts={hunts.length}
                points={hunts[currentCardIndex]?.points}
                huntEnded={huntEnded}
              />
            </div>

            {currentCardIndex < hunts.length - 1 && (
              <div className="absolute right-0 top-0 flex flex-col gap-6 ml-8 print:hidden">
                {hunts
                  .slice(currentCardIndex + 1, currentCardIndex + 3)
                  .map((hunt, index) => (
                    <div
                      key={hunt.id}
                      className="opacity-80 scale-90 transform origin-left hover:opacity-95 transition-all duration-300 border-2 border-blue-300/50 rounded-lg shadow-lg hover:border-blue-400 hover:shadow-xl"
                    >
                      <HuntCards
                        hunts={[hunt]}
                        isActive={false}
                        preview={true}
                        currentIndex={currentCardIndex + index + 2}
                        totalHunts={hunts.length}
                      />
                    </div>
                  ))}
                {currentCardIndex + 3 < hunts.length && (
                  <div className="text-center text-slate-600 text-sm mt-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    +{hunts.length - currentCardIndex - 3} more cards
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {gameCompleteModal}
    </div>
  );
}
