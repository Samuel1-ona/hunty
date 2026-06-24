import React, { useEffect, useState, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import confetti from "canvas-confetti";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Loader2, Printer } from "lucide-react";
import picture from "@/public/static-images/image1.png";
import { HuntCardSkeleton } from "@/components/LoadingSkeletons";
import { cn } from "@/lib/utils";
import sanitizeHtml from "@/lib/sanitizeHtml";
import { submitAnswer, AnswerIncorrectError, pollTransaction } from "@/lib/contracts/hunt";
import { resolveImageSrc, GATEWAY_COUNT } from "@/lib/ipfs";
import type { HuntCard as Hunt } from "@/lib/types";
import { usePlayerCount } from "@/hooks/usePlayerCount";

export type { Hunt };

interface HuntCardsProps {
  hunts: Hunt[]; // always an array of one item in active/preview mode
  isActive?: boolean;
  preview?: boolean;
  onUnlock?: () => void;
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
  /**
   * Pre-fetched player count from the arcade page (via usePlayerCounts).
   * When omitted, the component fetches its own count via usePlayerCount.
   * Passing from the parent avoids N individual fetches when many cards render.
   */
  playerCount?: number;
  playerCountLoading?: boolean;
  playerCountError?: string | null;
  isTrending?: boolean;
}

const DEFAULT_POINTS = 10;

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
}) => {
  const hunt = hunts && hunts.length > 0 ? hunts[0] : {} as Hunt;

  // If the parent pre-fetched counts (arcade page), use those.
  // Otherwise fall back to the per-card hook (play flow).
  // Using String(huntId ?? hunt.id) as the key — both are numeric IDs.
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
  // Ref-based guard to prevent concurrent submissions (avoids double-click race)
  const submittingRef = useRef(false);
  const [imgGatewayIdx, setImgGatewayIdx] = useState(0);
  const [hintRevealed, setHintRevealed] = useState(false);
  const [keyboardInsetHeight, setKeyboardInsetHeight] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInsetHeight(0);
        return;
      }

      const inset = Math.max(0, window.innerHeight - viewport.height);
      setKeyboardInsetHeight(inset);
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
    // Immediate ref-guard to avoid race from double-clicks or rapid presses
    if (submittingRef.current) return;

    submittingRef.current = true;
    setIsPending(true);
    setError("");

    try {
      if (huntId != null) {
        // Contract path: submit_answer → ClueCompleted | AnswerIncorrect
        const result = await submitAnswer(huntId, Number(hunt.id), input);
        // Poll for transaction inclusion
        if (result && result.txHash) {
          await pollTransaction(result.txHash);
        }

        // ClueCompleted event received
        setSuccess(true);
        
        // Celebratory confetti (Requirement #146)
        const isLastClue = currentIndex === totalHunts;
        const isDifficultClue = (points ?? DEFAULT_POINTS) >= 20;

        if (!prefersReducedMotion) {
          if (isLastClue) {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 },
              colors: ["#3737A4", "#E3225C", "#39A437", "#FFD43E"],
            });
          } else if (isDifficultClue) {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.7 },
            });
          }
        }

        setInput("");
        const actualPoints = Math.max(0, (points ?? DEFAULT_POINTS) - (hintRevealed ? (hunt.hintCost || 0) : 0));
        onScoreUpdate?.(actualPoints);
        setTimeout(() => {
          setSuccess(false);
          onUnlock?.();
        }, 1200);
      } else {
        // Local fallback (test / preview mode — no wallet required)
        if (input.trim().toLowerCase() === (hunt.code || "").trim().toLowerCase()) {
          setSuccess(true);
          
          // Celebratory confetti for local/preview mode (Requirement #146)
          const isLastClue = currentIndex === totalHunts;
          const isDifficultClue = (points ?? DEFAULT_POINTS) >= 20;

          if (!prefersReducedMotion) {
            if (isLastClue) {
              confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
              });
            } else if (isDifficultClue) {
              confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
              });
            }
          }

          setError("");
          setInput("");
          const actualPoints = Math.max(0, (points ?? DEFAULT_POINTS) - (hintRevealed ? (hunt.hintCost || 0) : 0));
          onScoreUpdate?.(actualPoints);
          setTimeout(() => {
            setSuccess(false);
            onUnlock?.();
          }, 1200);
        } else {
          setError("Try Again");
          setSuccess(false);
        }
      }
    } catch (err) {
      if (err instanceof AnswerIncorrectError) {
        setError("Try Again");
      } else {
        setError(err instanceof Error ? err.message : "Submission failed. Try again.");
      }
      setSuccess(false);
    } finally {
      setIsPending(false);
      submittingRef.current = false;
    }
  };

  // Allow Enter key to submit
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
    )
  }

  const isLocked = !isActive || preview || isPending || solved || huntEnded;

  return (
    <div tabIndex={0} onKeyDown={handleKeyDown} className={cn(
      "rounded-xl sm:rounded-2xl shadow-lg w-full max-w-[400px] transition-all duration-300 relative print:shadow-none print:border-none print:max-w-none print:scale-100 print:m-0 print:opacity-100 bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500",
      isActive ? "sm:scale-105 border-2 border-blue-400 dark:border-blue-500" : preview ? "opacity-70" : "opacity-90"
    )}>
      {solved && (
        <div className="absolute inset-0 bg-green-500/10 rounded-xl sm:rounded-2xl z-20 flex items-center justify-center pointer-events-none print:hidden">
          <CheckCircle2 className="w-12 sm:w-16 h-12 sm:h-16 text-green-500 opacity-60" />
        </div>
      )}
      <div className="rounded-t-xl sm:rounded-t-2xl px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6 text-white bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] print:bg-none print:text-black print:p-8">
        <div className="flex justify-between items-center text-xs sm:text-sm mb-3 sm:mb-4">
          {points != null && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-semibold print:bg-transparent print:border print:border-gray-300 print:text-black">{points} pts</span>
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
            )}>
              {hunt.difficulty}
            </span>
          )}
          <span className="text-[#B3B3E5] ml-auto print:text-black text-xs sm:text-sm">{currentIndex}/{totalHunts}</span>
        </div>
        {/* Player count — shown below the title row, above description */}
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
        <p className="text-xs sm:text-sm opacity-90 mb-4 sm:mb-6 line-clamp-3 print:text-lg print:opacity-100 print:mb-8" dangerouslySetInnerHTML={{ __html: sanitizeHtml(hunt.description || "No description provided.") }} />
        <div className="flex justify-center">
          {hunt.link || hunt.image ? (
            <Image
              src={resolveImageSrc(hunt.link || hunt.image || "", imgGatewayIdx)}
              alt="hunt"
              width={180}
              height={180}
              loading="lazy"
              sizes="180px"
              onError={() => {
                if (imgGatewayIdx < GATEWAY_COUNT - 1) {
                  setImgGatewayIdx((i) => i + 1)
                }
              }}
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

      {hunt.hint && !solved && (
        <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-2 border-b border-gray-100 dark:border-white/5 print:hidden">
          {!hintRevealed ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 py-2 sm:py-2.5"
              onClick={() => setHintRevealed(true)}
              disabled={isLocked}
            >
              Reveal Hint (-{hunt.hintCost || 0} pts)
            </Button>
              ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-2 sm:p-3 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-blue-100 dark:border-blue-900/30">
              <span className="font-semibold text-blue-900 dark:text-blue-200 mr-2">Hint:</span>
              <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(hunt.hint || "") }} />
            </div>
          )}
        </div>
      )}

      {/* Print button */}
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

      {/* Input and button only for active, non-preview cards */}
      <div
        data-testid="answer-row"
        className="sticky bottom-0 left-0 z-20 bg-white dark:bg-slate-900 flex gap-2 p-4 sm:p-6 rounded-b-xl sm:rounded-b-2xl items-center print:hidden"
        style={{
          bottom: `max(env(keyboard-inset-height, 0px), ${keyboardInsetHeight}px, env(safe-area-inset-bottom, 0px))`,
          backdropFilter: "saturate(180%) blur(18px)",
        }}
      >
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
        <Button
          className={cn(
            "bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] hover:bg-purple-700 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 flex-shrink-0",
            isLocked && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleUnlock}
          disabled={isLocked}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowRight className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Feedback */}
      <div className="bg-white dark:bg-slate-900 rounded-b-xl sm:rounded-b-2xl -mt-4 pb-4 px-4 sm:px-6 min-h-[36px] print:hidden">
        {huntEnded && (
          <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm sm:text-base">
            <span>🏁</span>
            Hunt Ended
          </div>
        )}
        {!huntEnded && success && (
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm sm:text-base animate-bounce">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            Solved!
          </div>
        )}
        {!huntEnded && !success && isPending && (
          <p className="text-center text-slate-400 dark:text-slate-400 text-xs sm:text-sm">Submitting...</p>
        )}
        {!huntEnded && !success && !isPending && error && (
          <p className="text-center text-red-500 dark:text-red-400 font-semibold text-xs sm:text-sm">{error}</p>
        )}
      </div>
    </div>
  );
};
