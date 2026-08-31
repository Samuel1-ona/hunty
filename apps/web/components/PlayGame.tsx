"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lightbulb } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { HuntPageSkeletonLayout } from "@/components/LoadingSkeletons";
import { PlayerProgressPanel } from "@/components/PlayerProgressPanel";
import { Button } from "@hunty/ui";
import { useHuntInfo } from "@/lib/hooks/useHuntContract";
import { get_clue_info } from "@/lib/contracts/hunt";
import {
  getHuntClues,
  getHuntProgress,
  startHuntProgress,
} from "@/lib/huntStore";
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
import { markFirstHuntStep } from "@/lib/firstHuntGuide";
import { awardReferralBonusOnFirstCompletion } from "@/lib/referrals";
import { resolveLocalizedText } from "@/lib/clueLocalization";
import type { HuntCard as Hunt, HuntInfo } from "@/lib/types";

import { HuntCards } from "./HuntCards";
import { LiveHuntCountdown } from "./LiveHuntCountdown";
import Replay from "./icons/Replay";
import Share from "./icons/Share";
import {
  getServerSyncedNowSeconds,
  syncServerTime,
} from "@/lib/serverTime";

interface PlayGameProps {
  hunts: Hunt[];
  gameName: string;
  onExit: () => void;
  onGameComplete: (score: number) => void;
  gameCompleteModal?: React.ReactNode;
  huntId?: number;
  playerAddress?: string;
}

interface HintUsageRecord {
  huntId?: number;
  clueId: number;
  hintLevel: number;
  cost: number;
  usedAt: number;
  playerAddress?: string;
}

/**
 * Progressive hint cost.
 *
 * If a clue has a configured hintCost of 5:
 *   Level 1 = 5 points
 *   Level 2 = 10 points
 *   Level 3 = 15 points
 *
 * This keeps the existing `hintCost` field compatible while
 * introducing progressive costs.
 */
const getProgressiveHintCost = (
  baseCost: number | undefined,
  level: number
): number => {
  const safeBaseCost =
    typeof baseCost === "number" && baseCost > 0 ? baseCost : 5;

  return safeBaseCost * level;
};

const HINT_ANALYTICS_STORAGE_KEY = "hunty_hint_usage";

const recordHintUsage = (record: HintUsageRecord): void => {
  if (typeof window === "undefined") return;

  try {
    const existing = window.localStorage.getItem(
      HINT_ANALYTICS_STORAGE_KEY
    );

    const records: HintUsageRecord[] = existing
      ? JSON.parse(existing)
      : [];

    records.push(record);

    window.localStorage.setItem(
      HINT_ANALYTICS_STORAGE_KEY,
      JSON.stringify(records)
    );
  } catch (error) {
    // Analytics must never break gameplay.
    logger.error("Failed to record hint usage:", error);
  }
};

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
  const locale = useLocale();

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [solvedClues, setSolvedClues] = useState<Set<number>>(
    new Set()
  );
  const [huntEnded, setHuntEnded] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const attemptIdRef = useRef<string | null>(null);

  /**
   * Tracks the highest hint level already used for each clue.
   *
   * Example:
   *
   * {
   *   12: 2,
   *   13: 1
   * }
   *
   * means:
   * - clue 12 has used hint levels 1 and 2
   * - clue 13 has used hint level 1
   */
  const [usedHintLevels, setUsedHintLevels] = useState<
    Record<number, number>
  >({});

  /**
   * Controls whether the current clue's hint is visible.
   */
  const [visibleHintLevel, setVisibleHintLevel] = useState<
    Record<number, number>
  >({});

  const [huntProgress, setHuntProgress] = useState(() =>
    huntId != null ? getHuntProgress(huntId) : null
  );

  const solvedCount = solvedClues.size;

  const huntInfoQuery = useHuntInfo(huntId);

  const {
    data: fetched = null as null | {
      clues: Hunt[];
      huntInfo: HuntInfo;
    },
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.hunts.clues(huntId),
    queryFn: async () => {
      if (huntId == null || !huntInfoQuery.data) return null;

      const huntInfo = huntInfoQuery.data;
      const localClues = getHuntClues(huntId);
      const clues: Hunt[] = [];

      for (let i = 0; i < huntInfo.totalClues; i++) {
        const clue = await get_clue_info(huntId, i);

        const localizedQuestion = resolveLocalizedText(
          clue.questionTranslations,
          locale,
          clue.question
        );

        const localizedHint = resolveLocalizedText(
          clue.hintTranslations,
          locale,
          clue.hint
        );

        const localClue =
          localClues[i] ??
          localClues.find(
            (item) =>
              item.id === clue.id ||
              item.question === clue.question ||
              resolveLocalizedText(
                item.questionTranslations,
                locale,
                item.question
              ) === localizedQuestion
          );

        clues.push({
          id: clue.id,
          title: localizedQuestion,
          description: `${clue.points} pts`,
          link: "",
          code: "",
          points: clue.points,
          hint: localizedHint,
          hintCost: clue.hintCost,
          difficulty: clue.difficulty,
          mediaCid: localClue?.mediaCid,
        });
      }

      return { clues, huntInfo };
    },
    enabled: huntId != null && huntInfoQuery.data !== undefined,
    staleTime: Math.max(
      SOROBAN_READ_STALE_TIME_MS,
      queryCachePolicy.hunts.staleTime
    ),
    gcTime: queryCachePolicy.hunts.gcTime,
    refetchInterval: queryCachePolicy.hunts.refetchInterval,
    refetchIntervalInBackground: true,
  });

  const error: string | null =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? "Failed to fetch clues"
        : null;

  const fetchedClues = fetched?.clues ?? null;
  const huntInfo = fetched?.huntInfo ?? null;

  const currentUnlockedIndex =
    huntProgress?.currentClueIndex ?? 0;

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
      : huntsProp ?? [];

  const hasHunts = hunts.length > 0;

  /**
   * Reset gameplay state whenever the hunt changes.
   */
  useEffect(() => {
    setCurrentCardIndex(0);
    setScore(0);
    setSolvedClues(new Set());
    setUsedHintLevels({});
    setVisibleHintLevel({});
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

    const attempt = ensureActiveAttempt(
      playerAddress,
      huntId,
      gameName
    );

    setAttemptId(attempt.id);
    attemptIdRef.current = attempt.id;
  }, [gameName, huntId, playerAddress]);

  const handleExit = () => {
    if (playerAddress && attemptIdRef.current) {
      const activeAttempt = getActiveAttempt(
        playerAddress,
        huntId ?? -1
      );

      if (
        activeAttempt &&
        activeAttempt.clues.length > 0
      ) {
        abandonHuntAttempt(
          playerAddress,
          activeAttempt.id
        );
      }
    }

    onExit();
  };

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  /**
   * Check whether the hunt has ended using the
   * server-synchronized clock.
   */
  useEffect(() => {
    let cancelled = false;

    syncServerTime().then(() => {
      if (cancelled || !huntInfo?.endTime) return;

      if (
        getServerSyncedNowSeconds() >=
        huntInfo.endTime
      ) {
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

    if (
      playerAddress &&
      attemptIdRef.current &&
      huntId != null
    ) {
      const activeAttempt = getActiveAttempt(
        playerAddress,
        huntId
      );

      completeHuntAttempt(
        playerAddress,
        attemptIdRef.current,
        activeAttempt?.totalPoints ?? score
      );

      attemptIdRef.current = null;
      setAttemptId(null);
    }

    onGameComplete(score);
  };

  const handleScoreUpdate = (points: number) => {
    setScore((prev) => prev + points);
  };

  /**
   * Progressive hint handler.
   *
   * Every clue starts at hint level 1.
   *
   * Example with a base hintCost of 5:
   *
   * Level 1 -> 5 points
   * Level 2 -> 10 points
   * Level 3 -> 15 points
   *
   * The same hint level cannot be charged twice.
   */
  const handleUseHint = () => {
    const clue = hunts[currentCardIndex];

    if (!clue) {
      toast.error("Unable to find the current clue.");
      return;
    }

    if (!clue.hint) {
      toast.error("No hint is available for this clue.");
      return;
    }

    const clueId = clue.id;
    const highestUsedLevel =
      usedHintLevels[clueId] ?? 0;

    const nextHintLevel =
      highestUsedLevel + 1;

    const hintCost = getProgressiveHintCost(
      clue.hintCost,
      nextHintLevel
    );

    if (score < hintCost) {
      toast.error(
        `You need ${hintCost} points to use this hint.`
      );
      return;
    }

    /**
     * Deduct the score only once for this hint level.
     */
    setScore((currentScore) =>
      Math.max(0, currentScore - hintCost)
    );

    /**
     * Persist the highest hint level used for this clue
     * during the current hunt.
     */
    setUsedHintLevels((current) => ({
      ...current,
      [clueId]: nextHintLevel,
    }));

    /**
     * Reveal the hint for the current level.
     *
     * The current data model provides one localized hint,
     * so we reveal that existing hint while maintaining
     * progressive usage/cost tracking.
     */
    setVisibleHintLevel((current) => ({
      ...current,
      [clueId]: nextHintLevel,
    }));

    /**
     * Record analytics locally for the MVP.
     *
     * If Hunty later has a server-side analytics endpoint,
     * this function can be replaced with an API call without
     * changing the gameplay logic.
     */
    recordHintUsage({
      huntId,
      clueId,
      hintLevel: nextHintLevel,
      cost: hintCost,
      usedAt: Date.now(),
      playerAddress,
    });

    toast.success(
      `Hint ${nextHintLevel} unlocked for ${hintCost} points.`
    );
  };

  const handleClueUnlock = (
    clueIndex: number,
    pointsAwarded = 0
  ) => {
    const clue = hunts[clueIndex];

    if (clue) {
      setSolvedClues((prev) =>
        new Set(prev).add(clue.id)
      );

      markFirstHuntStep(
        "solve",
        huntId != null ? { huntId } : undefined
      );
    }

    if (huntId != null) {
      setHuntProgress((current) => {
        if (!current) return current;

        const nextIndex = Math.max(
          current.currentClueIndex,
          clueIndex + 1
        );

        const completed =
          nextIndex >= hunts.length;

        return {
          ...current,
          currentClueIndex: nextIndex,
          completed,
          completedAt: completed
            ? Date.now()
            : current.completedAt,
        };
      });
    }

    if (clueIndex < hunts.length - 1) {
      setCurrentCardIndex(clueIndex + 1);
    } else {
      /**
       * Hunt completed.
       */
      if (
        huntId &&
        huntInfo?.emailNotifications &&
        huntInfo?.creatorEmail
      ) {
        fetch("/api/notifications/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            huntId,
            huntName: gameName,
            creatorEmail: huntInfo.creatorEmail,
            completionTime:
              new Date().toLocaleString(),
          }),
        }).catch((err) =>
          logger.error(
            "Failed to send notification:",
            err
          )
        );
      }

      if (huntId) {
        localStorage.setItem(
          `hunt_completed_${huntId}`,
          "true"
        );

        if (playerAddress) {
          fetch(
            `/api/v1/hunts/${huntId}/complete`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                playerAddress,
              }),
            }
          ).catch((err) =>
            logger.error(
              "Failed to register completion on server:",
              err
            )
          );
        }
      }

      const finalScore =
        score + pointsAwarded;

      if (
        playerAddress &&
        attemptIdRef.current &&
        huntId != null
      ) {
        completeHuntAttempt(
          playerAddress,
          attemptIdRef.current,
          finalScore
        );

        awardReferralBonusOnFirstCompletion(
          playerAddress,
          huntId
        );

        attemptIdRef.current = null;
        setAttemptId(null);
      }

      if (
        huntId &&
        playerAddress &&
        huntProgress &&
        !huntProgress.completed
      ) {
        const completionTimeSeconds =
          Math.max(
            0,
            Math.round(
              (Date.now() -
                huntProgress.startedAt) /
                1000
            )
          );

        recordHuntCompletion(
          playerAddress,
          {
            huntId,
            pointsEarned: finalScore,
            completionTimeSeconds,
          }
        );
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
          <p className="text-red-500 text-lg mb-4">
            {error}
          </p>

          <div className="flex items-center justify-center gap-3">
            {huntId != null && (
              <Button onClick={() => refetch()}>
                {t("retry")}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={handleExit}
            >
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

          <p className="text-slate-700 text-lg mb-4">
            No clues available for this hunt yet.
          </p>

          <Button
            variant="ghost"
            onClick={onExit}
          >
            {t("goBack")}
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Show hunt ended message.
   */
  if (huntEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 text-center rounded-3xl bg-white dark:bg-slate-900 px-8 py-10 shadow-lg border border-slate-100 dark:border-white/5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("huntEnded")}
          </h2>

          <p className="text-slate-600 dark:text-slate-400 text-lg">
            {t("finalScore")}:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {score}
            </span>
          </p>

          <div className="pt-4">
            <Button
              onClick={handleExit}
              className="bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white px-6 py-2 rounded-full"
            >
              {t("goHome")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeHunt = hunts[currentCardIndex];

  const currentClueUsedLevel = activeHunt
    ? usedHintLevels[activeHunt.id] ?? 0
    : 0;

  const currentVisibleHintLevel = activeHunt
    ? visibleHintLevel[activeHunt.id] ?? 0
    : 0;

  const nextHintLevel =
    currentClueUsedLevel + 1;

  const nextHintCost = activeHunt
    ? getProgressiveHintCost(
        activeHunt.hintCost,
        nextHintLevel
      )
    : 0;

  const hasHint =
    Boolean(activeHunt?.hint) &&
    !solvedClues.has(activeHunt?.id ?? -1);

  const hasMoreHints =
    currentClueUsedLevel < 3;

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
            <Image
              src="/icons/logo.png"
              alt="Logo"
              width={96}
              height={96}
            />
          </div>

          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-b to-[#3737A4] from-[#0C0C4F] bg-clip-text text-transparent mb-6">
            {t("play")} {gameName}
          </h1>

          <PlayerProgressPanel
            cluesSolved={solvedCount}
            totalClues={hunts.length}
            totalPoints={score}
          />

          {(huntInfo?.endTime ||
            huntInfo?.startTime) && (
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
              <Replay />
              {t("reset")}
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
                    hunts={[
                      hunts[
                        currentCardIndex - 1
                      ],
                    ]}
                    isActive={false}
                    preview={true}
                    currentIndex={currentCardIndex}
                    totalHunts={hunts.length}
                    points={
                      hunts[
                        currentCardIndex - 1
                      ].points
                    }
                    solved={solvedClues.has(
                      hunts[
                        currentCardIndex - 1
                      ].id
                    )}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center mx-auto z-10 w-full">
              <HuntCards
                hunts={
                  activeHunt
                    ? [activeHunt]
                    : []
                }
                isActive={true}
                isLoading={loading}
                huntId={huntId}
                playerAddress={
                  playerAddress
                }
                attemptId={
                  attemptId ?? undefined
                }
                onScoreUpdate={
                  handleScoreUpdate
                }
                onUnlock={(pointsAwarded) =>
                  handleClueUnlock(
                    currentCardIndex,
                    pointsAwarded
                  )
                }
                currentIndex={
                  currentCardIndex + 1
                }
                totalHunts={hunts.length}
                points={
                  hunts[currentCardIndex]
                    ?.points
                }
                huntEnded={huntEnded}
              />

              {/* Progressive Hint Panel */}
              {hasHint && activeHunt && (
                <div className="w-full max-w-[650px] mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 shadow-sm print:hidden">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                      <Lightbulb className="h-5 w-5 text-indigo-600" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            Need a hint?
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            Hint level{" "}
                            {Math.min(
                              currentClueUsedLevel,
                              3
                            )}{" "}
                            of 3
                          </p>
                        </div>

                        {currentClueUsedLevel > 0 && (
                          <span className="text-xs font-medium rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
                            {
                              currentClueUsedLevel
                            }{" "}
                            used
                          </span>
                        )}
                      </div>

                      {currentVisibleHintLevel >
                        0 &&
                        activeHunt.hint && (
                          <div className="mt-4 rounded-xl bg-white border border-indigo-100 p-4">
                            <p className="text-sm font-medium text-indigo-600 mb-1">
                              Hint{" "}
                              {
                                currentVisibleHintLevel
                              }
                            </p>

                            <p className="text-slate-700">
                              {
                                activeHunt.hint
                              }
                            </p>
                          </div>
                        )}

                      {hasMoreHints ? (
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <p className="text-sm text-slate-500">
                            Next hint costs{" "}
                            <span className="font-semibold text-slate-700">
                              {
                                nextHintCost
                              }{" "}
                              points
                            </span>
                          </p>

                          <Button
                            type="button"
                            onClick={
                              handleUseHint
                            }
                            disabled={
                              score <
                              nextHintCost
                            }
                            className="rounded-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white"
                          >
                            <Lightbulb className="mr-2 h-4 w-4" />

                            {currentClueUsedLevel >
                            0
                              ? `Get Hint ${nextHintLevel}`
                              : "Get Hint"}
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-4 text-sm text-slate-500">
                          You have used all available hint levels for this clue.
                        </p>
                      )}

                      {score <
                        nextHintCost &&
                        hasMoreHints && (
                          <p className="mt-2 text-xs text-red-500">
                            You need{" "}
                            {nextHintCost -
                              score}{" "}
                            more points to unlock this hint.
                          </p>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {currentCardIndex <
              hunts.length - 1 && (
              <div className="absolute right-0 top-0 flex flex-col gap-6 ml-8 print:hidden">
                {hunts
                  .slice(
                    currentCardIndex + 1,
                    currentCardIndex + 3
                  )
                  .map((hunt, index) => (
                    <div
                      key={hunt.id}
                      className="opacity-80 scale-90 transform origin-left hover:opacity-95 transition-all duration-300 border-2 border-blue-300/50 rounded-lg shadow-lg hover:border-blue-400 hover:shadow-xl"
                    >
                      <HuntCards
                        hunts={[hunt]}
                        isActive={false}
                        preview={true}
                        currentIndex={
                          currentCardIndex +
                          index +
                          2
                        }
                        totalHunts={
                          hunts.length
                        }
                      />
                    </div>
                  ))}

                {currentCardIndex + 3 <
                  hunts.length && (
                  <div className="text-center text-slate-600 text-sm mt-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    +
                    {hunts.length -
                      currentCardIndex -
                      3}{" "}
                    {t("moreCards")}
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
