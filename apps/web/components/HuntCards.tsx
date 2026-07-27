import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Clock, Lightbulb, Loader2, Printer } from "lucide-react";
const picture = "/static-images/image1.png";
import { HuntCardSkeleton } from "@/components/LoadingSkeletons";
import { cn } from "@/lib/utils";
import sanitizeHtml from "@/lib/sanitizeHtml";
import { submitAnswer, AnswerIncorrectError, pollTransaction } from "@/lib/contracts/hunt";
import { getClueElapsedSeconds, recordClueAttempt } from "@/lib/huntAttemptHistory";
import { calculateCluePoints, DEFAULT_SCORING_WEIGHTS } from "@/lib/scoring";
import { resolveImageSrc, GATEWAY_COUNT } from "@/lib/ipfs";
import type { ClueHint, HuntCard as Hunt } from "@/lib/types";
import { usePlayerCount } from "@/hooks/usePlayerCount";

export type { Hunt };

interface HuntCardsProps {
  hunts: Hunt[];
  isActive?: boolean;
  preview?: boolean;
  onUnlock?: (pointsAwarded: number) => void;
  currentIndex?: number;
  totalHunts?: number;
  isLoading?: boolean;
  /** Overall game/hunt ID — when provided, answers go to the contract. */
  huntId?: number;
  /** Called with the points awarded after a correct answer. */
  onScoreUpdate?: (points: number) => void;
  /** Point value for this clue. */
  points?: number;
  /** Whether this clue has been solved. */
  solved?: boolean;
  /** Whether the hunt has ended. */
  huntEnded?: boolean;
  playerCount?: number;
  playerCountLoading?: boolean;
  playerCountError?: string | null;
  isTrending?: boolean;
  playerAddress?: string;
  attemptId?: string;
}

const DEFAULT_POINTS = 10;

const shakeVariants = {
  shake: { x: [0, -10, 10, -10, 10, -5, 5, 0], transition: { duration: 0.5 } },
  idle: { x: 0 },
};

const slideVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Resolve the effective hints array for a clue, falling back to the legacy
 * single-hint fields when the new `hints` array is absent.
 */
function resolveHints(hunt: Hunt): ClueHint[] {
  if (hunt.hints && hunt.hints.length > 0) return hunt.hints;
  // Legacy fallback: treat hint/hintCost as a single hint with no delay
  if (hunt.hint) {
    return [{ text: hunt.hint, penalty: hunt.hintCost ?? 0, delaySeconds: 0 }];
  }
  return [];
}

/**
 * Hook that drives the per-hint countdown timer.
 * Returns seconds remaining until the next hint can be revealed (0 = ready).
 */
function useHintCountdown(
  lastRevealedAt: number | null,
  nextDelaySeconds: number
): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (lastRevealedAt === null || nextDelaySeconds <= 0) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - lastRevealedAt) / 1000;
      const left = Math.max(0, Math.ceil(nextDelaySeconds - elapsed));
      setRemaining(left);
      if (left > 0) {
        timerRef.current = window.setTimeout(tick, 500);
      }
    };
    const timerRef = { current: 0 };
    tick();
    return () => window.clearTimeout(timerRef.current);
  }, [lastRevealedAt, nextDelaySeconds]);

  return remaining;
}

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
  const hunt = hunts && hunts.length > 0 ? hunts[0] : ({} as Hunt);

  const fallbackId = String(huntId ?? hunt.id ?? "");
  const ownCount = usePlayerCount(playerCountProp !== undefined ? "" : fallbackId);

  const count = playerCountProp !== undefined ? playerCountProp : ownCount.count;
  const countIsLoading = playerCountProp !== undefined ? (playerCountLoadingProp ?? false) : ownCount.isLoading;
  const countError = playerCountProp !== undefined ? (playerCountErrorProp ?? null) : ownCount.error;
  const trending = playerCountProp !== undefined ? (isTrendingProp ?? false) : ownCount.isTrending;

  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const submittingRef = useRef(false);
  const [imgGatewayIdx, setImgGatewayIdx] = useState(0);
  const [keyboardInsetHeight, setKeyboardInsetHeight] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const [shake, setShake] = useState(false);

  // ── Progressive hint state ──────────────────────────────────────────────
  // Index of the next hint to reveal (0 = none revealed yet, hints.length = all revealed)
  const [revealedCount, setRevealedCount] = useState(0);
  // Timestamp (ms) when the last hint was revealed — drives the delay countdown
  const [lastRevealedAt, setLastRevealedAt] = useState<number | null>(null);

  const hints = resolveHints(hunt);
  const nextHint: ClueHint | undefined = hints[revealedCount];
  const nextDelay = nextHint?.delaySeconds ?? 0;
  const countdownSeconds = useHintCountdown(lastRevealedAt, nextDelay);

  // Total penalty accrued from all revealed hints
  const totalHintPenalty = hints
    .slice(0, revealedCount)
    .reduce((sum, h) => sum + h.penalty, 0);

  const revealNextHint = useCallback(() => {
    if (revealedCount >= hints.length) return;
    setRevealedCount((n) => n + 1);
    setLastRevealedAt(Date.now());
  }, [revealedCount, hints.length]);

  // ── Keyboard inset (mobile virtual keyboard) ───────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateInset = () => {
      const viewport = window.visualViewport;
      setKeyboardInsetHeight(viewport ? Math.max(0, window.innerHeight - viewport.height) : 0);
    };
    updateInset();
    window.addEventListener("resize", updateInset);
    window.visualViewport?.addEventListener("resize", updateInset);
    window.visualViewport?.addEventListener("scroll", updateInset);
    return () => {
      window.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("resize", updateInset);
      window.visualViewport?.removeEventListener("scroll", updateInset);
    };
  }, []);

  const handleInputFocus = () => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      document.activeElement?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    }, 120);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isPending) return;
    setInput(e.target.value);
    setError("");
    setSuccess(false);
  };

  const handleUnlock = async () => {
    if (!isActive || preview) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsPending(true);
    setError("");

    try {
      if (huntId != null) {
        const result = await submitAnswer(huntId, Number(hunt.id), input, playerAddress);
        if (result?.txHash) await pollTransaction(result.txHash);

        setSuccess(true);

        let updatedActualPoints = 0;
        if (playerAddress && attemptId) {
          const updatedAttempt = recordClueAttempt(
            playerAddress,
            attemptId,
            {
              clueId: Number(hunt.id),
              clueIndex: currentIndex - 1,
              question: hunt.title ?? "",
              answerGiven: input.trim(),
              timeTakenSeconds: getClueElapsedSeconds(huntId, Number(hunt.id)),
              pointsEarned: 0,
              answeredAt: new Date().toISOString(),
              hintsUsed: revealedCount,
            },
            points ?? DEFAULT_POINTS,
            (hunt.difficulty === "Expert" ? "Hard" : hunt.difficulty || "Medium"),
            revealedCount,
            totalHintPenalty,
          );
          if (updatedAttempt) {
            const updatedClue = updatedAttempt.clues.find((c) => c.clueId === Number(hunt.id));
            updatedActualPoints = updatedClue?.pointsEarned ?? 0;
          }
        } else {
          updatedActualPoints = Math.max(0, (points ?? DEFAULT_POINTS) - totalHintPenalty);
        }

        const isLastClue = currentIndex === totalHunts;
        const isDifficultClue = (points ?? DEFAULT_POINTS) >= 20;
        if (!prefersReducedMotion) {
          if (isLastClue) {
            confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ["#3737A4", "#E3225C", "#39A437", "#FFD43E"] });
          } else if (isDifficultClue) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          }
        }

        setInput("");
        onScoreUpdate?.(updatedActualPoints);
        setTimeout(() => {
          setSuccess(false);
          onUnlock?.(updatedActualPoints);
        }, 1200);
      } else {
        // Local / preview fallback
        if (input.trim().toLowerCase() === (hunt.code || "").trim().toLowerCase()) {
          setSuccess(true);
          const { breakdown } = calculateCluePoints(
            points ?? DEFAULT_POINTS,
            hunt.difficulty || "Medium",
            0,
            revealedCount,
            0,
          );
          const isLastClue = currentIndex === totalHunts;
          const isDifficultClue = (points ?? DEFAULT_POINTS) >= 20;
          if (!prefersReducedMotion) {
            if (isLastClue) confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
            else if (isDifficultClue) confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
          }
          setError("");
          setInput("");
          onScoreUpdate?.(breakdown.totalPoints);
          setTimeout(() => {
            setSuccess(false);
            onUnlock?.(breakdown.totalPoints);
          }, 1200);
        } else {
          setError("Try Again");
          setSuccess(false);
          if (!prefersReducedMotion) { setShake(true); setTimeout(() => setShake(false), 500); }
        }
      }
    } catch (err) {
      if (err instanceof AnswerIncorrectError) {
        setError("Try Again");
        if (!prefersReducedMotion) { setShake(true); setTimeout(() => setShake(false), 500); }
      } else {
        setError(err instanceof Error ? err.message : "Submission failed. Try again.");
      }
      setSuccess(false);
    } finally {
      setIsPending(false);
      submittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleUnlock();
  };

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

  const isLocked = !isActive || preview || isPending || solved || huntEnded;

  // ── Derived hint-button state ──────────────────────────────────────────
  const allHintsRevealed = revealedCount >= hints.length;
  const hasHints = hints.length > 0;
  // Can reveal when: not all revealed, not solved, not locked, and delay elapsed
  const canRevealNextHint = hasHints && !allHintsRevealed && !solved && !isLocked && countdownSeconds === 0;

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={cn(
        "rounded-xl sm:rounded-2xl shadow-lg w-full max-w-[400px] transition-all duration-300 relative print:shadow-none print:border-none print:max-w-none print:scale-100 print:m-0 print:opacity-100 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
        isActive ? "sm:scale-105 border-2 border-blue-400 dark:border-blue-500" : preview ? "opacity-70" : "opacity-90"
      )}
    >
      {solved && (
        <div className="absolute inset-0 bg-green-500/10 rounded-xl sm:rounded-2xl z-20 flex items-center justify-center pointer-events-none print:hidden">
          <CheckCircle2 className="w-12 sm:w-16 h-12 sm:h-16 text-green-500 opacity-60" />
        </div>
      )}

      {/* ── Header band ─────────────────────────────────────────────── */}
      <div className="rounded-t-xl sm:rounded-t-2xl px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 text-white bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] print:bg-none print:text-black print:p-8">
        <div className="flex justify-between items-center text-xs sm:text-sm mb-3 sm:mb-4">
          {points != null && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold print:bg-transparent print:border print:border-gray-300 print:text-black">
              {points} pts
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {trending && (
              <span
                className="trending-badge bg-orange-500/80 text-white px-2 py-0.5 rounded-full text-xs font-semibold print:hidden"
                aria-label="Trending hunt"
              >
                🔥 Trending
              </span>
            )}
            <span className="text-[#B3B3E5] print:text-black text-xs sm:text-sm">{currentIndex}/{totalHunts}</span>
          </div>
          {hunt.difficulty && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-semibold ml-2 print:border print:text-black",
              hunt.difficulty === "Easy" && "bg-green-500/30 text-green-200 print:border-green-500",
              hunt.difficulty === "Medium" && "bg-yellow-500/30 text-yellow-200 print:border-yellow-500",
              hunt.difficulty === "Hard" && "bg-red-500/30 text-red-200 print:border-red-500",
              hunt.difficulty === "Expert" && "bg-purple-500/30 text-purple-200 print:border-purple-500",
            )}>
              {hunt.difficulty}
            </span>
          )}
          <span className="text-[#B3B3E5] ml-auto print:text-black text-xs sm:text-sm">{currentIndex}/{totalHunts}</span>
        </div>

        <span
          className="player-count block text-xs text-white/60 mb-2 print:hidden"
          aria-label={countIsLoading ? "Loading player count" : countError ? undefined : `${count} player${count !== 1 ? "s" : ""} registered`}
        >
          {countIsLoading ? (
            <span className="player-count--loading" aria-hidden="true">—</span>
          ) : countError ? null : (
            `${count} player${count !== 1 ? "s" : ""} registered`
          )}
        </span>

        <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 line-clamp-2 print:text-3xl print:mb-4">
          {hunt.title || "Untitled Hunt"}
        </h3>
        <p
          className="text-xs sm:text-sm opacity-90 mb-4 sm:mb-6 line-clamp-3 print:text-lg print:opacity-100 print:mb-8"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(hunt.description || "No description provided.") }}
        />
        <div className="flex justify-center">
          {hunt.link || hunt.image ? (
            <Image
              src={resolveImageSrc(hunt.link || hunt.image || "", imgGatewayIdx)}
              alt="hunt"
              width={180}
              height={180}
              loading="lazy"
              sizes="180px"
              onError={() => { if (imgGatewayIdx < GATEWAY_COUNT - 1) setImgGatewayIdx((i) => i + 1); }}
              unoptimized
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] object-contain print:w-64 print:h-auto print:rounded-xl"
            />
          ) : (
            <Image
              src={picture}
              alt="hunt"
              width={180}
              height={180}
              loading="lazy"
              sizes="180px"
              className="w-[140px] h-[140px] sm:w-[180px] sm:h-[180px] object-contain print:w-64 print:h-auto print:rounded-xl"
            />
          )}
        </div>
      </div>

      {/* ── Progressive hints panel ─────────────────────────────────── */}
      {hasHints && !solved && (
        <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-2 border-b border-gray-100 dark:border-white/5 print:hidden space-y-2">

          {/* Already-revealed hints */}
          {revealedCount > 0 && (
            <div className="space-y-1.5" aria-live="polite" aria-label="Revealed hints">
              {hints.slice(0, revealedCount).map((h, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-2 sm:p-2.5 rounded-lg text-xs sm:text-sm border border-blue-100 dark:border-blue-900/30"
                >
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="font-semibold text-blue-900 dark:text-blue-200 mr-1.5">
                      Hint {i + 1}
                      {h.penalty > 0 && (
                        <span className="ml-1 text-[10px] font-normal text-blue-500 dark:text-blue-400">
                          (-{h.penalty} pts)
                        </span>
                      )}:
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(h.text) }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Next-hint button or countdown */}
          {!allHintsRevealed && (
            <div>
              {countdownSeconds > 0 ? (
                /* Countdown: next hint not yet available */
                <div
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 py-1.5"
                  aria-live="polite"
                  aria-label={`Hint ${revealedCount + 1} available in ${countdownSeconds} seconds`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    Hint {revealedCount + 1} available in{" "}
                    <span className="font-semibold tabular-nums">{countdownSeconds}s</span>
                  </span>
                </div>
              ) : (
                /* Reveal button */
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 py-2 sm:py-2.5"
                  onClick={revealNextHint}
                  disabled={!canRevealNextHint}
                  aria-label={`Reveal hint ${revealedCount + 1}${nextHint?.penalty ? ` (costs ${nextHint.penalty} points)` : ""}`}
                >
                  <Lightbulb className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                  Reveal Hint {revealedCount + 1} of {hints.length}
                  {nextHint?.penalty ? (
                    <span className="ml-1.5 text-blue-500 dark:text-blue-400">
                      (-{nextHint.penalty} pts)
                    </span>
                  ) : null}
                </Button>
              )}
            </div>
          )}

          {/* All hints revealed */}
          {allHintsRevealed && (
            <p className="text-xs text-center text-slate-400 dark:text-slate-500 py-0.5">
              All hints revealed
            </p>
          )}
        </div>
      )}

      {/* ── Print button ─────────────────────────────────────────────── */}
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

      {/* ── Answer input row ─────────────────────────────────────────── */}
      <div
        data-testid="answer-row"
        className="sticky bottom-0 left-0 z-20 bg-white dark:bg-slate-900 flex gap-2 p-4 sm:p-6 rounded-b-xl sm:rounded-b-2xl items-center print:hidden"
        style={{
          bottom: `max(env(keyboard-inset-height, 0px), ${keyboardInsetHeight}px, env(safe-area-inset-bottom, 0px))`,
          backdropFilter: "saturate(180%) blur(18px)",
        }}
      >
        <motion.div animate={shake ? "shake" : "idle"} variants={shakeVariants} className="flex-1">
          <Input
            placeholder={isActive && !preview ? "Enter answer" : "Locked"}
            className={cn(
              "flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-full text-sm transition-colors",
              isLocked ? "bg-gray-100 dark:bg-slate-800 cursor-not-allowed" : "dark:bg-slate-950 dark:border-white/10"
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
          onClick={handleUnlock}
          disabled={isLocked}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>

      {/* ── Feedback strip ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-b-xl sm:rounded-b-2xl -mt-4 pb-4 px-4 sm:px-6 min-h-[36px] print:hidden">
        <AnimatePresence mode="wait">
          {huntEnded && (
            <motion.div key="ended" initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={prefersReducedMotion ? {} : { opacity: 0 }} className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm sm:text-base">
              <span>🏁</span> Hunt Ended
            </motion.div>
          )}
          {!huntEnded && success && (
            <motion.div key="success" initial={prefersReducedMotion ? false : slideVariants.initial} animate={prefersReducedMotion ? {} : slideVariants.animate} exit={prefersReducedMotion ? {} : slideVariants.exit} className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm sm:text-base">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> Solved!
            </motion.div>
          )}
          {!huntEnded && !success && isPending && (
            <motion.p key="pending" initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={prefersReducedMotion ? {} : { opacity: 0 }} className="text-center text-slate-400 dark:text-slate-400 text-xs sm:text-sm">
              Submitting...
            </motion.p>
          )}
          {!huntEnded && !success && !isPending && error && (
            <motion.p key="error" initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.95 }} className="text-center text-red-500 dark:text-red-400 font-semibold text-xs sm:text-sm">
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
