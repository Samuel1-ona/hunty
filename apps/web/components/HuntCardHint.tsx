"use client";

import { Button } from "@hunty/ui";
import { useTranslations } from "next-intl";

import { sanitizeHtml } from "@/lib/sanitizeHtml";
import type { HuntCard } from "@/lib/types/hunt-ui";

interface HuntCardHintProps {
  hunt: HuntCard;
  hintRevealed: boolean;
  setHintRevealed: (revealed: boolean) => void;
  setHintsUsed: (used: number | ((prev: number) => number)) => void;
  isLocked: boolean;
}

export function HuntCardHint({
  hunt,
  hintRevealed,
  setHintRevealed,
  setHintsUsed,
  isLocked,
}: HuntCardHintProps) {
  const a11y = useTranslations("a11y");

  if (!hunt.hint) return null;

  return (
    <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-2 border-b border-gray-100 dark:border-white/5 print:hidden">
      {!hintRevealed ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-900/50 py-2 sm:py-2.5"
          onClick={() => {
            setHintRevealed(true);
            setHintsUsed((prev: number) => prev + 1);
          }}
          disabled={isLocked}
          aria-label={a11y("revealHint")}
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
  );
}
