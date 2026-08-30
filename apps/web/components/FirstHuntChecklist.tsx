'use client';

import { Check, ChevronDown, ChevronUp, Compass, Trophy, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useFirstHuntGuide } from '@/hooks/useFirstHuntGuide';
import {
  FIRST_HUNT_STEPS,
  type FirstHuntStepDefinition,
  type FirstHuntStepId,
  getFirstHuntStepHref,
  requestWalletConnect,
} from '@/lib/firstHuntGuide';
import { cn } from '@/lib/utils';

const STEP_ICONS: Record<FirstHuntStepId, typeof Wallet> = {
  connect: Wallet,
  join: Compass,
  solve: Compass,
  claim: Trophy,
};

function StepAction({
  step,
  huntId,
  isNext,
}: {
  step: FirstHuntStepDefinition;
  huntId: number | null;
  isNext: boolean;
}) {
  const href = getFirstHuntStepHref(step, huntId);

  if (!isNext) return null;

  if (step.id === 'connect') {
    return (
      <Button
        type="button"
        size="sm"
        onClick={requestWalletConnect}
        className="h-7 rounded-lg bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] px-2.5 text-[11px] font-bold text-white"
      >
        Connect
      </Button>
    );
  }

  return (
    <Button
      asChild
      size="sm"
      className="h-7 rounded-lg bg-gradient-to-r from-[#3737A4] to-[#0C0C4F] px-2.5 text-[11px] font-bold text-white"
    >
      <Link href={href}>
        {step.id === 'claim' ? 'Claim' : step.id === 'solve' ? 'Solve' : 'Join'}
      </Link>
    </Button>
  );
}

export function FirstHuntChecklist() {
  const { state, progress, isVisible, dismiss, setCollapsed } = useFirstHuntGuide();

  const heading = useMemo(() => {
    if (progress.allComplete) return 'First hunt complete';
    return 'Complete your first hunt';
  }, [progress.allComplete]);

  if (!isVisible) return null;

  if (state.collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 print:hidden">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Open first hunt checklist"
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg backdrop-blur-md hover:bg-white dark:border-white/10 dark:bg-slate-950/95 dark:text-slate-100"
        >
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#3737A4] text-[10px] font-bold text-white">
            {progress.completedCount}/{progress.total}
          </span>
          First hunt
          <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <aside
      data-testid="first-hunt-checklist"
      aria-label="First hunt checklist"
      className="fixed bottom-4 right-4 z-50 w-[min(100%-2rem,22rem)] print:hidden"
    >
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              New player guide
            </p>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{heading}</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {progress.allComplete
                ? 'You connected, joined, solved, and claimed.'
                : `${progress.completedCount} of ${progress.total} steps done`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Minimize first hunt checklist"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss first hunt checklist"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/5 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <ol className="space-y-2">
          {FIRST_HUNT_STEPS.map((step) => {
            const done = state.completed[step.id];
            const isNext = progress.nextStep?.id === step.id;
            const Icon = STEP_ICONS[step.id];

            return (
              <li
                key={step.id}
                data-testid={`first-hunt-step-${step.id}`}
                data-complete={done ? 'true' : 'false'}
                className={cn(
                  'flex items-start gap-3 rounded-xl border px-3 py-2.5',
                  done
                    ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/20'
                    : isNext
                      ? 'border-[#3737A4]/30 bg-indigo-50/70 dark:border-indigo-500/30 dark:bg-indigo-950/20'
                      : 'border-slate-200 bg-slate-50 dark:border-white/5 dark:bg-slate-900/40'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                    done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-white/10'
                  )}
                  aria-hidden="true"
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        done
                          ? 'text-emerald-800 dark:text-emerald-300'
                          : 'text-slate-800 dark:text-slate-100'
                      )}
                    >
                      {step.title}
                    </p>
                    <StepAction step={step} huntId={state.huntId} isNext={isNext} />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}

export default FirstHuntChecklist;
