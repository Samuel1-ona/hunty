"use client";

import confetti from "canvas-confetti";
import { useReducedMotion } from "framer-motion";
import { useCallback, useRef, useState } from "react";

import type { ClueSubmission } from "@/lib/clueTypeSystem";
import { AnswerIncorrectError, pollTransaction, submitAnswer } from "@/lib/contracts/hunt";
import { getClueElapsedSeconds, recordClueAttempt } from "@/lib/huntAttemptHistory";
import { calculateCluePoints } from "@/lib/scoring";
import type { HuntCard } from "@/lib/types/hunt-ui";

const DEFAULT_POINTS = 10;

interface UseHuntCardSubmissionOptions {
  hunt: HuntCard;
  huntId?: number;
  playerAddress?: string;
  attemptId?: string;
  points?: number;
  currentIndex: number;
  totalHunts: number;
  hintRevealed: boolean;
  hintsUsed: number;
  onScoreUpdate?: (points: number) => void;
  onUnlock?: () => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
}

interface UseHuntCardSubmissionResult {
  isPending: boolean;
  handleUnlock: (submission?: ClueSubmission) => Promise<void>;
}

export function useHuntCardSubmission({
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
  onError,
  onSuccess,
  onPendingChange,
}: UseHuntCardSubmissionOptions): UseHuntCardSubmissionResult {
  const [isPending, setIsPending] = useState(false);
  const submittingRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  const handleUnlock = useCallback(
    async (submission?: ClueSubmission) => {
      if (submittingRef.current) return;

      submittingRef.current = true;
      setIsPending(true);
      onPendingChange?.(true);

      try {
        const submittedAnswer = submission?.answer ?? "";

        if (huntId != null) {
          const result = await submitAnswer(
            huntId,
            Number(hunt.id),
            submittedAnswer,
            undefined,
            submission
          );

          if (result && result.txHash) {
            await pollTransaction(result.txHash);
          }

          let updatedActualPoints = 0;
          if (playerAddress && attemptId) {
            const updatedAttempt = recordClueAttempt(
              playerAddress,
              attemptId,
              {
                clueId: Number(hunt.id),
                clueIndex: currentIndex - 1,
                question: hunt.title ?? "",
                answerGiven: submittedAnswer.trim(),
                timeTakenSeconds: getClueElapsedSeconds(huntId, Number(hunt.id)),
                pointsEarned: 0,
                answeredAt: new Date().toISOString(),
                hintsUsed: 0,
              },
              points ?? DEFAULT_POINTS,
              hunt.difficulty === "Expert" ? "Hard" : (hunt.difficulty ?? "Medium"),
              hintsUsed
            );
            if (updatedAttempt) {
              const updatedClue = updatedAttempt.clues.find((c) => c.clueId === Number(hunt.id));
              updatedActualPoints = updatedClue?.pointsEarned || 0;
            }
          } else {
            updatedActualPoints = Math.max(
              0,
              (points ?? DEFAULT_POINTS) - (hintRevealed ? hunt.hintCost || 0 : 0)
            );
          }

          const isLastClue = currentIndex === totalHunts;
          const isDifficultClue = (points ?? DEFAULT_POINTS) >= 20;

          if (!prefersReducedMotion) {
            if (isLastClue) {
              void confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ["#3737A4", "#E3225C", "#39A437", "#FFD43E"],
              });
            } else if (isDifficultClue) {
              void confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.7 },
              });
            }
          }

          onScoreUpdate?.(updatedActualPoints);
          onSuccess?.();

          setTimeout(() => {
            onUnlock?.();
          }, 1200);
        } else {
          const selectedOption =
            hunt.type === "multiple-choice"
              ? hunt.multipleChoice?.options.find((option) => option.id === submittedAnswer)?.label
              : undefined;
          const localCandidate = selectedOption ?? submittedAnswer;
          const isLocallyCorrect =
            hunt.type !== "location" &&
            localCandidate.trim().toLowerCase() === (hunt.code || "").trim().toLowerCase();

          if (isLocallyCorrect) {
            const { breakdown } = calculateCluePoints(
              points ?? DEFAULT_POINTS,
              hunt.difficulty === "Expert" ? "Hard" : (hunt.difficulty ?? "Medium"),
              0,
              hintsUsed,
              0
            );

            const isLastClue = currentIndex === totalHunts;
            const isDifficultClue = (points ?? DEFAULT_POINTS) >= 20;

            if (!prefersReducedMotion) {
              if (isLastClue) {
                void confetti({
                  particleCount: 150,
                  spread: 100,
                  origin: { y: 0.6 },
                });
              } else if (isDifficultClue) {
                void confetti({
                  particleCount: 80,
                  spread: 60,
                  origin: { y: 0.7 },
                });
              }
            }

            onScoreUpdate?.(breakdown.totalPoints);
            onSuccess?.();

            setTimeout(() => {
              onUnlock?.();
            }, 1200);
          } else {
            onError?.("Try Again");
          }
        }
      } catch (err) {
        if (err instanceof AnswerIncorrectError) {
          onError?.("Try Again");
        } else {
          onError?.(err instanceof Error ? err.message : "Submission failed. Try again.");
        }
      } finally {
        setIsPending(false);
        onPendingChange?.(false);
        submittingRef.current = false;
      }
    },
    [
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
      onError,
      onSuccess,
      onPendingChange,
      prefersReducedMotion,
    ]
  );

  return { isPending, handleUnlock };
}
