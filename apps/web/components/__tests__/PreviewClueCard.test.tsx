/**
 * Unit tests for components/PreviewClueCard.tsx (#581)
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewClueCard } from '@/components/PreviewClueCard';
import type { Clue } from '@/lib/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// matchesClueAnswer returns true when the answer matches "4" or "paris"
vi.mock('@/lib/clueAnswerVerification', () => ({
  matchesClueAnswer: vi.fn(async (candidate: string) => {
    const correct = ['4', 'paris'];
    return correct.includes(candidate.trim().toLowerCase());
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseClue: Clue = {
  id: 1,
  huntId: 42,
  question: 'What is 2 + 2?',
  answer: '4',
  points: 10,
  difficulty: 'Easy',
};

const hintedClue: Clue = {
  ...baseClue,
  hint: "It's a single digit",
  hintCost: 2,
};

function renderCard(clue: Clue = baseClue, isSolved = false) {
  const onSolve = vi.fn();
  const onWrongAnswer = vi.fn();
  const onReset = vi.fn();
  const user = userEvent.setup();

  const utils = render(
    <PreviewClueCard
      clue={clue}
      huntId={42}
      clueIndex={0}
      totalClues={3}
      isSolved={isSolved}
      onSolve={onSolve}
      onWrongAnswer={onWrongAnswer}
      onReset={onReset}
    />
  );

  return { ...utils, user, onSolve, onWrongAnswer, onReset };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PreviewClueCard — rendering', () => {
  it('shows the clue question', () => {
    renderCard();
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('shows clue progress (1 / 3)', () => {
    renderCard();
    expect(screen.getByText(/Clue 1 \/ 3/i)).toBeInTheDocument();
  });

  it('shows difficulty badge', () => {
    renderCard();
    expect(screen.getByText('Easy')).toBeInTheDocument();
  });

  it('shows points badge', () => {
    renderCard();
    expect(screen.getByText('10 pts')).toBeInTheDocument();
  });

  it('renders answer input when not solved', () => {
    renderCard();
    expect(screen.getByPlaceholderText(/type your answer/i)).toBeInTheDocument();
  });

  it('shows solved state and hides input when isSolved=true', () => {
    renderCard(baseClue, true);
    expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/type your answer/i)).not.toBeInTheDocument();
  });

  it('shows reset button when solved', () => {
    renderCard(baseClue, true);
    expect(screen.getByLabelText(/reset this clue/i)).toBeInTheDocument();
  });
});

describe('PreviewClueCard — answer submission', () => {
  it('calls onSolve with the correct answer', async () => {
    const { user, onSolve } = renderCard();
    await user.type(screen.getByPlaceholderText(/type your answer/i), '4');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await waitFor(() => expect(onSolve).toHaveBeenCalledWith('4'));
  });

  it('calls onWrongAnswer on an incorrect submission', async () => {
    const { user, onWrongAnswer } = renderCard();
    await user.type(screen.getByPlaceholderText(/type your answer/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await waitFor(() => expect(onWrongAnswer).toHaveBeenCalledWith('wrong'));
  });

  it('shows wrong-answer feedback message', async () => {
    const { user } = renderCard();
    await user.type(screen.getByPlaceholderText(/type your answer/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /submit answer/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not quite right/i));
  });

  it('submit button is disabled when input is empty', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /submit answer/i });
    expect(btn).toBeDisabled();
  });

  it('submits on Enter key', async () => {
    const { user, onSolve } = renderCard();
    const input = screen.getByPlaceholderText(/type your answer/i);
    await user.type(input, '4');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onSolve).toHaveBeenCalled());
  });
});

describe('PreviewClueCard — hint panel', () => {
  it('does not show hint button when clue has no hint', () => {
    renderCard(baseClue);
    expect(screen.queryByRole('button', { name: /show hint/i })).not.toBeInTheDocument();
  });

  it('shows hint button when clue has a hint', () => {
    renderCard(hintedClue);
    expect(screen.getByRole('button', { name: /show hint/i })).toBeInTheDocument();
  });

  it('toggles hint panel on click', async () => {
    const { user } = renderCard(hintedClue);
    const hintBtn = screen.getByRole('button', { name: /show hint/i });
    await user.click(hintBtn);
    expect(screen.getByText("It's a single digit")).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /hide hint/i }));
    await waitFor(() => expect(screen.queryByText("It's a single digit")).not.toBeInTheDocument());
  });

  it('shows hint cost info', async () => {
    const { user } = renderCard(hintedClue);
    await user.click(screen.getByRole('button', { name: /show hint/i }));
    expect(screen.getByText(/hint cost for players: 2/i)).toBeInTheDocument();
  });
});

describe('PreviewClueCard — reveal answer panel', () => {
  it('shows Reveal Answer button', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /reveal answer/i })).toBeInTheDocument();
  });

  it('shows the actual answer when toggled', async () => {
    const { user } = renderCard();
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    expect(screen.getByText(baseClue.answer)).toBeInTheDocument();
  });

  it('toggles back to hide', async () => {
    const { user } = renderCard();
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    await user.click(screen.getByRole('button', { name: /hide answer/i }));
    await waitFor(() =>
      expect(screen.queryByText('Answer (creator only)')).not.toBeInTheDocument()
    );
  });
});

describe('PreviewClueCard — reset button', () => {
  it('calls onReset when reset is clicked while solved', async () => {
    const { user, onReset } = renderCard(baseClue, true);
    await user.click(screen.getByLabelText(/reset this clue/i));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
