"use client";

import { Button } from "@hunty/ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { useCallback, useState } from "react";

import { HuntCardSkeleton } from "@/components/LoadingSkeletons";
import { Input } from "@/components/ui/input";
import { useHuntCardSubmission } from "@/hooks/useHuntCardSubmission";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { usePlayerCount } from "@/hooks/usePlayerCount";
import type { HuntCard } from "@/lib/types/hunt-ui";
import { cn } from "@/lib/utils";

import { ClueTypeInput } from "./ClueTypeInput";
import { HuntCardHeader } from "./HuntCardHeader";
import { HuntCardHint } from "./HuntCardHint";
import { HuntCardMedia } from "./HuntCardMedia";

export type { HuntCard };

interface HuntCardsProps {
  hunts: HuntCard[];
  isActive?: boolean;
  preview?: boolean;
  onUnlock?: (pointsAwarded?: number) => void;
  currentIndex?: number;
  totalHunts?: number;
  isLoading?: boolean;
  huntId?: number;
  onScoreUpdate?: (points: number) => void;
  points?: number;
  solved?: boolean;
  huntEnded?: boolean;
  playerCount?: number;
  playerCountLoading?: boolean;
  playerCountError?: string | null;
  isTrending?: boolean;
  playerAddress?: string;
  attemptId?: string;
}

const slideVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const HuntCards: React.FC<HuntCardsProps> = ({
  hunts,
  isActive = true,
  preview = false,
  onUnlock,
  currentIndex = 1,
  totalHunts = 1,
  isLoading = false,
  huntId,
  onScoreUpdate,
  points,
  solved = false,
  huntEnded = false,
  playerCount: playerCountProp,
  playerCountLoading: playerCountLoadingProp,
  playerCountError: playerCountErrorProp,
  isTrending: isTrendingProp,
  playerAddress,
  attemptId,
}) => {
  const hunt = hunts && hunts.length > 0 ? hunts[0] : ({} as HuntCard);

  const fallbackId = String(huntId ?? hunt.id ?? "");
  const ownCount = usePlayerCount(playerCountProp !== undefined ? "" : fallbackId);

  const count = playerCountProp !== undefined ? playerCountProp : ownCount.count;
  const countIsLoading =
    playerCountProp !== undefined ? (playerCountLoadingProp ?? false) : ownCount.isLoading;
  const countError =
    playerCountProp !== undefined ? (playerCountErrorProp ?? null) : ownCount.error;
  const trending = playerCountProp !== undefined ? (isTrendingProp ?? false) : ownCount.isTrending;

  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake] = useState(false);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [imgGatewayIdx, setImgGatewayIdx] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const a11y = useTranslations("a11y");

  const keyboardInsetHeight = useKeyboardInset();

  const { isPending, handleUnlock } = useHuntCardSubmission({
    hunt,
    huntId,
    playerAddress,
    attemptId,
    points,
    currentIndex,
    totalHunts,
    hintRevealed,
    hintsUsed,
    onScoreUpdate,
    onUnlock,
    onError: setError,
    onSuccess: () => setSuccess(true),
  });

  const handleInputFocus = useCallback(() => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      document.activeElement?.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }, 120);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    setInput(e.target.value);
    setError("");
    setSuccess(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") void handleUnlock({ answer: input });
  };

  const usesTypedAnswer = hunt.type === "text" || hunt.type === "image";
  const isLocked = !isActive || preview || isPending || solved || huntEnded;

  if (isLoading) {
    return (
      <HuntCardSkeleton
        className={cn(
          "w-full max-w-[400px] transition-all duration-300",
          isActive ? "sm:scale-105 border-2 border-blue-400" : preview ? "opacity-70" : "opacity-90"
        )}
      />
    );
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl sm:rounded-2xl shadow-lg w-full max-w-[400px] transition-all duration-300 relative print:shadow-none print:border-none print:max-w-none print:scale-100 print:m-0 print:opacity-100 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
        isActive
          ? "sm:scale-105 border-2 border-blue-400 dark:border-blue-500"
          : preview
            ? "opacity-70"
            : "opacity-90"
      )}
    >
      {solved && (
        <div className="absolute inset-0 bg-green-500/10 rounded-xl sm:rounded-2xl z-20 flex items-center justify-center pointer-events-none print:hidden">
          <CheckCircle2 className="w-12 sm:w-16 h-12 sm:h-16 text-green-500 opacity-60" />
        </div>
      )}

      <HuntCardHeader
        hunt={hunt}
        solved={solved}
        points={points}
        currentIndex={currentIndex}
        totalHunts={totalHunts}
        count={count}
        countIsLoading={countIsLoading}
        countError={countError}
        trending={trending}
        a11y={a11y}
      />

      <HuntCardMedia
        hunt={hunt}
        imgGatewayIdx={imgGatewayIdx}
        setImgGatewayIdx={setImgGatewayIdx}
      />

      <HuntCardHint
        hunt={hunt}
        hintRevealed={hintRevealed}
        setHintRevealed={setHintRevealed}
        setHintsUsed={setHintsUsed}
        isLocked={isLocked}
      />

      <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 pt-2 sm:pt-3 print:hidden">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs sm:text-sm text-slate-600 dark:text-slate-400 hover:text-[#3737A4] dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-white/5 border-slate-200 dark:border-white/10 py-2 sm:py-2.5"
          onClick={() => window.print()}
        >
          <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
          Print Clue
        </Button>
      </div>

      <div
        data-testid="answer-row"
        className="sticky bottom-0 left-0 z-20 bg-white dark:bg-slate-900 flex gap-2 p-4 sm:p-6 rounded-b-xl sm:rounded-b-2xl items-center print:hidden"
        style={{
          bottom: `max(env(keyboard-inset-height, 0px), ${keyboardInsetHeight}px, env(safe-area-inset-bottom, 0px))`,
          backdropFilter: "saturate(180%) blur(18px)",
        }}
      >
        {usesTypedAnswer ? (
          <>
            <motion.div
              animate={shake ? "shake" : "idle"}
              variants={shakeVariants}
              className="flex-1"
            >
              <Input
                aria-label={hunt.type === "image" ? "Image clue answer" : "Clue answer"}
                placeholder={
                  isActive && !preview
                    ? hunt.type === "image"
                      ? "Identify what you see"
                      : "Enter answer"
                    : "Locked"
                }
                className={cn(
                  "flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-full text-sm transition-colors",
                  isLocked
                    ? "bg-gray-100 dark:bg-slate-800 cursor-not-allowed"
                    : "dark:bg-slate-950 dark:border-white/10"
                )}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                disabled={isLocked}
              />
            </motion.div>
            <Button
              className={cn(
                "bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-purple-700 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 flex-shrink-0",
                isLocked && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => void handleUnlock({ answer: input })}
              disabled={isLocked}
              aria-label={a11y("submitAnswer")}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </Button>
          </>
        ) : hunt.type === "location" || hunt.type === "qr" || hunt.type === "multiple-choice" ? (
          <ClueTypeInput
            type={hunt.type}
            disabled={isLocked}
            isPending={isPending}
            geofenceRadiusMeters={hunt.geofenceRadiusMeters}
            options={hunt.multipleChoice?.options}
            onSubmit={handleUnlock}
          />
        ) : null}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-b-xl sm:rounded-b-2xl -mt-4 pb-4 px-4 sm:px-6 min-h-[36px] print:hidden">
        <AnimatePresence mode="wait">
          {huntEnded && (
            <motion.div
              key="ended"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm sm:text-base"
            >
              <span>🏁</span>
              Hunt Ended
            </motion.div>
          )}
          {!huntEnded && success && (
            <motion.div
              key="success"
              initial={prefersReducedMotion ? false : slideVariants.initial}
              animate={prefersReducedMotion ? {} : slideVariants.animate}
              exit={prefersReducedMotion ? {} : slideVariants.exit}
              className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm sm:text-base"
            >
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Solved!
            </motion.div>
          )}
          {!huntEnded && !success && isPending && (
            <motion.p
              key="pending"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0 }}
              className="text-center text-slate-400 dark:text-slate-400 text-xs sm:text-sm"
            >
              Submitting...
            </motion.p>
          )}
          {!huntEnded && !success && !isPending && error && (
            <motion.p
              key="error"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              className="text-center text-red-500 dark:text-red-400 font-semibold text-xs sm:text-sm"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
