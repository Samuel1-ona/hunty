'use client';

/**
 * PreviewClueCard (#581)
 *
 * A creator-only clue card that validates answers locally without any
 * Soroban contract calls or score persistence.  Mirrors the visual layout
 * of HuntCards so the preview is an accurate representation of the live
 * player experience.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Lightbulb, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { isValidClueAnswer } from '@/lib/clueAnswerValidation';
import { matchesClueAnswer } from '@/lib/clueAnswerVerification';
import type { Clue } from '@/lib/types';

interface PreviewClueCardProps {
  clue: Clue;
  huntId: number;
  clueIndex: number;
  totalClues: number;
  isSolved: boolean;
  /** Called when a correct answer is confirmed. */
  onSolve: (answer: string) => void;
  /** Called when a wrong answer is submitted (for shake animation coordination). */
  onWrongAnswer?: (answer: string) => void;
  /** Called when the creator clicks "Reset" to undo their solved state. */
  onReset?: () => void;
}

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.5 },
  },
  idle: { x: 0 },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Hard: 'bg-red-100 text-red-700 border-red-200',
};

export function PreviewClueCard({
  clue,
  huntId,
  clueIndex,
  totalClues,
  isSolved,
  onSolve,
  onWrongAnswer,
  onReset,
}: PreviewClueCardProps) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const handleSubmit = async () => {
    const trimmed = input.trim();
    if (!isValidClueAnswer(trimmed)) return;

    setIsChecking(true);
    setFeedback(null);

    try {
      const correct = await matchesClueAnswer(trimmed, clue, huntId);
      if (correct) {
        setFeedback('correct');
        // Brief visual delay so the creator sees the success state
        setTimeout(() => {
          onSolve(trimmed);
          setInput('');
          setFeedback(null);
        }, 700);
      } else {
        setFeedback('wrong');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        onWrongAnswer?.(trimmed);
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div
      className={cn(
        'rounded-3xl border bg-white shadow-lg transition-all duration-300 w-full max-w-sm mx-auto',
        isSolved ? 'border-emerald-300 bg-emerald-50/50 shadow-emerald-100' : 'border-slate-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Clue {clueIndex + 1} / {totalClues}
        </span>
        <div className="flex items-center gap-2">
          {clue.difficulty && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full border',
                DIFFICULTY_COLORS[clue.difficulty] ?? 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              {clue.difficulty}
            </span>
          )}
          {clue.points != null && (
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              {clue.points} pts
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="px-6 pb-4">
        <p className="text-slate-800 text-base font-medium leading-relaxed">{clue.question}</p>
      </div>

      {/* Solved overlay */}
      <AnimatePresence>
        {isSolved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mx-6 mb-4 flex items-center gap-3 rounded-2xl bg-emerald-100 border border-emerald-200 px-4 py-3"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-700">
                Correct! +{clue.points ?? 0} pts
              </p>
              <p className="text-xs text-emerald-600/80">Preview only — no data saved</p>
            </div>
            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="ml-auto text-emerald-600 hover:text-emerald-800 hover:bg-emerald-200 shrink-0"
                aria-label="Reset this clue"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answer input */}
      {!isSolved && (
        <div className="px-6 pb-4 space-y-3">
          <motion.div animate={shake ? 'shake' : 'idle'} variants={shakeVariants}>
            <Input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setFeedback(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer…"
              disabled={isChecking}
              className={cn(
                'rounded-xl border-slate-200 focus-visible:ring-indigo-400',
                feedback === 'wrong' && 'border-red-400 focus-visible:ring-red-300',
                feedback === 'correct' && 'border-emerald-400'
              )}
              aria-label="Answer input"
            />
          </motion.div>

          {feedback === 'wrong' && (
            <p className="text-xs text-red-500 font-medium" role="alert">
              That&apos;s not quite right — try again!
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={isChecking || !isValidClueAnswer(input)}
            className="w-full bg-gradient-to-b from-[#3737A4] to-[#0C0C4F] text-white rounded-xl disabled:opacity-50"
          >
            {isChecking ? 'Checking…' : 'Submit Answer'}
          </Button>
        </div>
      )}

      {/* Hint & reveal-answer helpers (creator perks) */}
      <div className="px-6 pb-6 flex flex-wrap gap-2">
        {clue.hint && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHint((v) => !v)}
            className="text-xs gap-1.5 text-amber-700 border-amber-200 hover:bg-amber-50"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAnswer((v) => !v)}
          className="text-xs gap-1.5 text-slate-600 border-slate-200 hover:bg-slate-50"
        >
          {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {showAnswer ? 'Hide Answer' : 'Reveal Answer'}
        </Button>
      </div>

      {/* Hint panel */}
      <AnimatePresence>
        {showHint && clue.hint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-6 mb-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Hint</p>
              <p className="text-sm text-amber-900">{clue.hint}</p>
              {clue.hintCost != null && (
                <p className="text-xs text-amber-600 mt-1">
                  Hint cost for players: {clue.hintCost} pts
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reveal answer panel */}
      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-6 mb-6 rounded-2xl bg-indigo-50 border border-indigo-200 px-4 py-3">
              <p className="text-xs font-semibold text-indigo-700 mb-1">Answer (creator only)</p>
              <p className="text-sm font-mono text-indigo-900 break-all">{clue.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
