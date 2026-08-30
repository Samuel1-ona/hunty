import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FirstHuntChecklist } from '@/components/FirstHuntChecklist';
import type { UseFirstHuntGuideResult } from '@/hooks/useFirstHuntGuide';
import {
  FIRST_HUNT_STEPS,
  getDefaultFirstHuntGuideState,
  getFirstHuntProgress,
} from '@/lib/firstHuntGuide';

const dismiss = vi.fn();
const setCollapsed = vi.fn();
const restore = vi.fn();
const markStep = vi.fn();

let hookValue: UseFirstHuntGuideResult;

vi.mock('@/hooks/useFirstHuntGuide', () => ({
  useFirstHuntGuide: () => hookValue,
}));

function buildHook(overrides: Partial<UseFirstHuntGuideResult> = {}): UseFirstHuntGuideResult {
  const state = overrides.state ?? getDefaultFirstHuntGuideState();
  const progress = overrides.progress ?? getFirstHuntProgress(state);
  return {
    state,
    progress,
    isReady: true,
    isVisible: !state.dismissed,
    markStep,
    dismiss,
    restore,
    setCollapsed,
    ...overrides,
  };
}

describe('FirstHuntChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookValue = buildHook();
  });

  it('renders connect, join, solve, and claim', () => {
    render(<FirstHuntChecklist />);

    expect(screen.getByTestId('first-hunt-checklist')).toBeInTheDocument();
    for (const step of FIRST_HUNT_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
  });

  it('is dismissible', async () => {
    const user = userEvent.setup();
    render(<FirstHuntChecklist />);

    await user.click(screen.getByRole('button', { name: /dismiss first hunt checklist/i }));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render after it has been dismissed', () => {
    hookValue = buildHook({
      state: { ...getDefaultFirstHuntGuideState(), dismissed: true },
      isVisible: false,
    });

    render(<FirstHuntChecklist />);
    expect(screen.queryByTestId('first-hunt-checklist')).not.toBeInTheDocument();
  });

  it('shows a collapsed launcher that can be reopened', async () => {
    const user = userEvent.setup();
    hookValue = buildHook({
      state: { ...getDefaultFirstHuntGuideState(), collapsed: true },
    });

    render(<FirstHuntChecklist />);
    expect(screen.queryByTestId('first-hunt-checklist')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open first hunt checklist/i }));
    expect(setCollapsed).toHaveBeenCalledWith(false);
  });

  it('marks completed steps', () => {
    hookValue = buildHook({
      state: {
        ...getDefaultFirstHuntGuideState(),
        completed: { connect: true, join: true, solve: false, claim: false },
      },
    });

    render(<FirstHuntChecklist />);
    expect(screen.getByTestId('first-hunt-step-connect')).toHaveAttribute('data-complete', 'true');
    expect(screen.getByTestId('first-hunt-step-join')).toHaveAttribute('data-complete', 'true');
    expect(screen.getByTestId('first-hunt-step-solve')).toHaveAttribute('data-complete', 'false');
  });
});
