"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { HuntPageSkeletonLayout } from "@/components/LoadingSkeletons";
import { PlayerProgressPanel } from "@/components/PlayerProgressPanel";
import { Button } from "@/components/ui/button";
import { get_clue_info, get_hunt } from "@/lib/contracts/hunt";
import { getHuntClues, getHuntProgress, startHuntProgress } from "@/lib/huntStore";
import { recordHuntCompletion } from "@/lib/contracts/player-stats";
import { queryCachePolicy, queryKeys } from "@/lib/queryKeys";
import { SOROBAN_READ_STALE_TIME_MS } from "@/lib/soroban/queryConfig";
import {
  abandonHuntAttempt,
  completeHuntAttempt,
  ensureActiveAttempt,
  getActiveAttempt,
} from "@/lib/huntAttemptHistory";
import { logger } from "@/lib/logger";
import { awardReferralBonusOnFirstCompletion } from "@/lib/referrals";
import type { HuntCard as Hunt, HuntInfo } from "@/lib/types";

import { HuntCards } from "./HuntCards";
import { LiveHuntCountdown } from "./LiveHuntCountdown";
import Replay from "./icons/Replay";
import Share from "./icons/Share";
import { getServerSyncedNowSeconds, syncServerTime } from "@/lib/serverTime";

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
  playerAddress,
}: PlayGameProps) {
  const t = useTranslations("playGame");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedClues, setSolvedClues] = useState<Set<number>>(new Set());
  const [huntEnded, setHuntEnded] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);
  const [huntProgress, setHuntProgress] = useState(() =>
    huntId != null ? getHuntProgress(huntId) : null
  );

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
      const localClues = getHuntClues(huntId);
      const clues: Hunt[] = [];

      for (let i = 0; i < huntInfo.totalClues; i++) {
        const clue = await get_clue_info(huntId, i);
        const localClue = localClues[i] ?? localClues.find((item) => item.question === clue.question);
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
          mediaCid: localClue?.mediaCid,
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

  const error: string | null =
    queryError instanceof Error ? queryError.message : queryError ? "Failed to fetch clues" : null;
  const fetchedClues = fetched?.clues ?? null;
  const huntInfo = fetched?.huntInfo ?? null;
  const currentUnlockedIndex = huntProgress?.currentClueIndex ?? 0;
  const hunts =
    huntId != null
      ? (fetchedClues ?? []).map((clue, index) =>
          huntInfo?.sequential && index > currentUnlockedIndex
            ? {
                ...clue,
                title: t("lockedClue"),
                hint: undefined,
                hintCost: undefined,
              }
            : clue
        )
      : (huntsProp ?? []);
  const hasHunts = hunts.length > 0;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentCardIndex(0);
    setScore(0);
    setSolvedClues(new Set());
    setAttemptId(null);
    attemptIdRef.current = null;
    if (huntId != null) {
      setHuntProgress(startHuntProgress(huntId));
    } else {
      setHuntProgress(null);
    }
  }, [huntId]);

  useEffect(() => {
    if (huntId == null || !playerAddress || !gameName) return;

    const attempt = ensureActiveAttempt(playerAddress, huntId, gameName);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttemptId(attempt.id);
    attemptIdRef.current = attempt.id;
  }, [gameName, huntId, playerAddress]);

  const handleExit = () => {
    if (playerAddress && attemptIdRef.current) {
      const activeAttempt = getActiveAttempt(playerAddress, huntId ?? -1);
      if (activeAttempt && activeAttempt.clues.length > 0) {
        abandonHuntAttempt(playerAddress, activeAttempt.id);
      }
    }
    onExit();
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Check if hunt has ended (server-synced clock)
  useEffect(() => {
    let cancelled = false;
    syncServerTime().then(() => {
      if (cancelled || !huntInfo?.endTime) return;
      if (getServerSyncedNowSeconds() >= huntInfo.endTime) {
        setHuntEnded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [huntInfo?.endTime]);

  const handleTimeExpired = () => {
    if (huntEnded) return;
    setHuntEnded(true);
    toast.message(t("timeExpired"));
    if (playerAddress && attemptIdRef.current && huntId != null) {
      const activeAttempt = getActiveAttempt(playerAddress, huntId);
      completeHuntAttempt(playerAddress, attemptIdRef.current, activeAttempt?.totalPoints ?? score);
      attemptIdRef.current = null;
      setAttemptId(null);
    }
    onGameComplete(score);
  };

  const handleScoreUpdate = (points: number) => {
    setScore((prev) => prev + points);
  };

  const handleClueUnlock = (clueIndex: number, pointsAwarded = 0) => {
    const clue = hunts[clueIndex];
    if (clue) {
      setSolvedClues((prev) => new Set(prev).add(clue.id));
    }

    if (huntId != null) {
      setHuntProgress((current) => {
        if (!current) return current;
        const nextIndex = Math.max(current.currentClueIndex, clueIndex + 1);
        const completed = nextIndex >= hunts.length;
        return {
          ...current,
          currentClueIndex: nextIndex,
          completed,
          completedAt: completed ? Date.now() : current.completedAt,
        };
      });
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
        if (playerAddress) {
          fetch(`/api/v1/hunts/${huntId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerAddress }),
          }).catch((err) => logger.error("Failed to register completion on server:", err));
        }
      }
      const finalScore = score + pointsAwarded;
      if (playerAddress && attemptIdRef.current && huntId != null) {
        completeHuntAttempt(playerAddress, attemptIdRef.current, finalScore);
        awardReferralBonusOnFirstCompletion(playerAddress, huntId);
        attemptIdRef.current = null;
        setAttemptId(null);
      }
      if (huntId && playerAddress && huntProgress && !huntProgress.completed) {
        const completionTimeSeconds = Math.max(
          0,
          Math.round((Date.now() - huntProgress.startedAt) / 1000)
        );
        recordHuntCompletion(playerAddress, {
          huntId,
          pointsEarned: finalScore,
          completionTimeSeconds,
        });
      }
      onGameComplete(finalScore);
    }
  };

  if (loading && !hasHunts) {
    return <HuntPageSkeletonLayout />;
  }

  if (error && !hasHunts) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] flex items-center justify-center">
        <div className="text-center rounded-3xl bg-white px-8 py-10 shadow-lg">
          <p className="text-red-500 text-lg mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            {huntId != null && (
              <Button onClick={() => refetch()}>
                {t("retry")}
              </Button>
            )}
            {huntId != null && <Button onClick={() => refetch()}>Retry</Button>}
            <Button variant="ghost" onClick={handleExit}>
              {t("goBack")}
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
            {t("noClues")}
          </p>
          <p className="text-slate-700 text-lg mb-4">No clues available for this hunt yet.</p>
          <Button variant="ghost" onClick={onExit}>
            {t("goBack")}
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
            {t("huntEnded")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {t("finalScore")}: <span className="font-bold text-slate-900 dark:text-white">{score}</span>
          </p>
          <div className="pt-4">
            <Button onClick={handleExit} className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white px-6 py-2 rounded-full">
              {t("goHome")}
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
        <Header />
      </div>

      <div className="max-w-[1500px] px-14 pt-10 pb-12 bg-white mx-auto rounded-4xl relative print:px-0 print:py-0 print:w-full print:max-w-none print:rounded-none">
        <div className="flex items-center gap-4 mb-8 print:hidden">
          <Button
            variant="ghost"
            onClick={handleExit}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="w-6 h-6 fill-[#0C0C4F]" />
            <span className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text text-xl font-normal">
              {t("goHome")}
            </span>
          </Button>
          <div className="text-right ml-auto">
            <span className="bg-gradient-to-b from-[#E3225C] to-[#7B1C4A] text-transparent bg-clip-text text-xl font-normal">
              {t("editGame")}
            </span>
            <br />
            <span className="text-sm bg-gradient-to-b from-[#787884] to-[#576065] text-transparent bg-clip-text">
              {t("onlyYouSeeThis")}
            </span>
          </div>
        </div>

        <div className="text-center mb-8 print:hidden">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#0C0C4F] shadow-lg absolute left-1/2 top-1 -translate-x-1/2 -translate-y-1/2">
            <Image src="/icons/logo.png" alt="Logo" width={96} height={96} />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-b to-[#3737A4] from-[#0C0C4F] bg-clip-text text-transparent mb-6">
            {t("play")} {gameName}
          </h1>

          <PlayerProgressPanel
            cluesSolved={solvedCount}
            totalClues={hunts.length}
            totalPoints={score}
          />

          {(huntInfo?.endTime || huntInfo?.startTime) && (
            <div className="max-w-md mx-auto mb-6">
              <LiveHuntCountdown
                startTime={huntInfo?.startTime}
                endTime={huntInfo?.endTime}
                onExpire={handleTimeExpired}
              />
            </div>
          )}

          <div className="flex justify-center gap-4 mb-8">
            <Button className="bg-gradient-to-b from-[#E3225C] to-[#7B1C4A] hover:bg-pink-600 text-white px-6 py-2 rounded-full flex items-center gap-2">
              <Replay /> {t("reset")}
            </Button>
            <Button className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:bg-green-700 text-white px-6 py-2 rounded-full flex items-center gap-2">
              <Share />
              {t("shareLink")}
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
                playerAddress={playerAddress}
                attemptId={attemptId ?? undefined}
                onScoreUpdate={handleScoreUpdate}
                onUnlock={(pointsAwarded: number) => handleClueUnlock(currentCardIndex, pointsAwarded)}
                currentIndex={currentCardIndex + 1}
                totalHunts={hunts.length}
                points={hunts[currentCardIndex]?.points}
                huntEnded={huntEnded}
              />
            </div>

            {currentCardIndex < hunts.length - 1 && (
              <div className="absolute right-0 top-0 flex flex-col gap-6 ml-8 print:hidden">
                {hunts.slice(currentCardIndex + 1, currentCardIndex + 3).map((hunt, index) => (
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
                    +{hunts.length - currentCardIndex - 3} {t("moreCards")}
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
 