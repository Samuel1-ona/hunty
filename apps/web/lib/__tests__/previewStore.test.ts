/**
 * Unit tests for lib/previewStore.ts (#581)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StoredHunt, Clue } from '@/lib/types';

// ─── Mock huntStore ───────────────────────────────────────────────────────────

const mockHunt: StoredHunt = {
  id: 42,
  title: 'Test Hunt',
  description: 'A test hunt for preview',
  cluesCount: 2,
  status: 'Draft',
  rewardType: 'XLM',
};

const mockClues: Clue[] = [
  { id: 1, huntId: 42, question: 'What is 2+2?', answer: '4', points: 10 },
  { id: 2, huntId: 42, question: 'Capital of France?', answer: 'paris', points: 20 },
];

vi.mock('@/lib/huntStore', () => ({
  getHuntById: vi.fn((id: number) => (id === 42 ? mockHunt : undefined)),
  getHuntClues: vi.fn((huntId: number) => (huntId === 42 ? mockClues : [])),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  createPreviewSession,
  advancePreviewSession,
  recordWrongAttempt,
  resetPreviewSession,
  buildPreviewUrl,
  VIEWPORT_LABELS,
  VIEWPORT_WIDTHS,
  type PreviewSession,
} from '@/lib/previewStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(): PreviewSession {
  const s = createPreviewSession(42);
  if (!s) throw new Error('Session should not be null');
  return s;
}

// ─── createPreviewSession ─────────────────────────────────────────────────────

describe('createPreviewSession', () => {
  it('returns null when hunt does not exist', () => {
    expect(createPreviewSession(999)).toBeNull();
  });

  it('creates a session with the correct hunt', () => {
    const session = makeSession();
    expect(session.huntId).toBe(42);
    expect(session.hunt.title).toBe('Test Hunt');
  });

  it('populates clues from huntStore', () => {
    const session = makeSession();
    expect(session.clues).toHaveLength(2);
    expect(session.clues[0].clue.question).toBe('What is 2+2?');
  });

  it('starts at clue index 0 with 0 points and not complete', () => {
    const session = makeSession();
    expect(session.currentClueIndex).toBe(0);
    expect(session.totalPoints).toBe(0);
    expect(session.isComplete).toBe(false);
  });

  it('marks all clues as unsolved initially', () => {
    const session = makeSession();
    expect(session.clues.every((cs) => !cs.solved)).toBe(true);
  });

  it('sets startedAt to an ISO date string', () => {
    const session = makeSession();
    expect(() => new Date(session.startedAt)).not.toThrow();
    expect(new Date(session.startedAt).getFullYear()).toBeGreaterThan(2024);
  });
});

// ─── advancePreviewSession ────────────────────────────────────────────────────

describe('advancePreviewSession', () => {
  it('marks the solved clue and advances the index', () => {
    const session = makeSession();
    const next = advancePreviewSession(session, 0, '4');
    expect(next.clues[0].solved).toBe(true);
    expect(next.currentClueIndex).toBe(1);
  });

  it("adds the clue's points to totalPoints", () => {
    const session = makeSession();
    const next = advancePreviewSession(session, 0, '4');
    expect(next.totalPoints).toBe(10);
  });

  it('sets isComplete when the last clue is solved', () => {
    const session = makeSession();
    const after1 = advancePreviewSession(session, 0, '4');
    const after2 = advancePreviewSession(after1, 1, 'paris');
    expect(after2.isComplete).toBe(true);
    expect(after2.totalPoints).toBe(30);
  });

  it('does not advance past the last clue index on completion', () => {
    const session = makeSession();
    const after1 = advancePreviewSession(session, 0, '4');
    const after2 = advancePreviewSession(after1, 1, 'paris');
    // currentClueIndex stays at last clue (not out-of-bounds)
    expect(after2.currentClueIndex).toBe(1);
  });

  it('records the answer string', () => {
    const session = makeSession();
    const next = advancePreviewSession(session, 0, 'four');
    expect(next.clues[0].lastAttempt).toBe('four');
    expect(next.clues[0].lastAttemptCorrect).toBe(true);
  });

  it('does not mutate the original session (immutability)', () => {
    const session = makeSession();
    advancePreviewSession(session, 0, '4');
    expect(session.clues[0].solved).toBe(false);
  });
});

// ─── recordWrongAttempt ───────────────────────────────────────────────────────

describe('recordWrongAttempt', () => {
  it('does not mark the clue as solved', () => {
    const session = makeSession();
    const next = recordWrongAttempt(session, 0, 'wrong');
    expect(next.clues[0].solved).toBe(false);
  });

  it('records the wrong answer', () => {
    const session = makeSession();
    const next = recordWrongAttempt(session, 0, 'wrong');
    expect(next.clues[0].lastAttempt).toBe('wrong');
    expect(next.clues[0].lastAttemptCorrect).toBe(false);
  });

  it('does not change totalPoints', () => {
    const session = makeSession();
    const next = recordWrongAttempt(session, 0, 'nope');
    expect(next.totalPoints).toBe(0);
  });

  it('does not mutate the original session', () => {
    const session = makeSession();
    recordWrongAttempt(session, 0, 'wrong');
    expect(session.clues[0].lastAttempt).toBeUndefined();
  });
});

// ─── resetPreviewSession ──────────────────────────────────────────────────────

describe('resetPreviewSession', () => {
  it('resets all clues to unsolved', () => {
    const session = makeSession();
    const advanced = advancePreviewSession(session, 0, '4');
    const reset = resetPreviewSession(advanced);
    expect(reset.clues.every((cs) => !cs.solved)).toBe(true);
  });

  it('resets totalPoints to 0', () => {
    const session = makeSession();
    const advanced = advancePreviewSession(session, 0, '4');
    const reset = resetPreviewSession(advanced);
    expect(reset.totalPoints).toBe(0);
  });

  it('resets currentClueIndex to 0', () => {
    const session = makeSession();
    const advanced = advancePreviewSession(session, 0, '4');
    const reset = resetPreviewSession(advanced);
    expect(reset.currentClueIndex).toBe(0);
  });

  it('sets isComplete to false', () => {
    let session = makeSession();
    session = advancePreviewSession(session, 0, '4');
    session = advancePreviewSession(session, 1, 'paris');
    expect(session.isComplete).toBe(true);
    const reset = resetPreviewSession(session);
    expect(reset.isComplete).toBe(false);
  });

  it('preserves hunt and huntId', () => {
    const session = makeSession();
    const reset = resetPreviewSession(session);
    expect(reset.huntId).toBe(42);
    expect(reset.hunt.title).toBe('Test Hunt');
  });
});

// ─── buildPreviewUrl ──────────────────────────────────────────────────────────

describe('buildPreviewUrl', () => {
  it('builds a URL with the hunt ID', () => {
    const url = buildPreviewUrl(42, 'https://hunty.app');
    expect(url).toBe('https://hunty.app/hunt/42/preview');
  });

  it('uses window.location.origin when no base is provided', () => {
    // jsdom sets window.location.origin to "http://localhost:3000" in tests
    const url = buildPreviewUrl(7);
    expect(url).toContain('/hunt/7/preview');
  });
});

// ─── VIEWPORT_LABELS / VIEWPORT_WIDTHS ───────────────────────────────────────

describe('viewport constants', () => {
  it('has entries for mobile, tablet, desktop', () => {
    expect(VIEWPORT_LABELS).toHaveProperty('mobile');
    expect(VIEWPORT_LABELS).toHaveProperty('tablet');
    expect(VIEWPORT_LABELS).toHaveProperty('desktop');
  });

  it('desktop width is null (full width)', () => {
    expect(VIEWPORT_WIDTHS.desktop).toBeNull();
  });

  it('mobile width is 375', () => {
    expect(VIEWPORT_WIDTHS.mobile).toBe(375);
  });

  it('tablet width is 768', () => {
    expect(VIEWPORT_WIDTHS.tablet).toBe(768);
  });
});
