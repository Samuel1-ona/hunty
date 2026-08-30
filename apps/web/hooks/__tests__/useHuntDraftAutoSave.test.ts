/**
 * Unit tests for hooks/useHuntDraftAutoSave.ts
 *
 * Covers:
 *  - readDraftPayload returns null for missing keys
 *  - deleteDraft removes the entry from the index and storage
 *  - listAllDrafts returns drafts newest-first
 *  - markDraftRecovered sets the recovered flag
 *  - useHuntDraftAutoSave generates a stable activeDraftId
 *  - useHuntDraftAutoSave writes to localStorage after debounce fires
 *  - useHuntDraftAutoSave saveNow() flushes immediately
 *  - useHuntDraftAutoSave reports saveStatus transitions
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useHuntDraftAutoSave,
  readDraftPayload,
  deleteDraft,
  listAllDrafts,
  markDraftRecovered,
  draftPayloadKey,
  DRAFT_INDEX_KEY,
} from '../useHuntDraftAutoSave';
import type { HuntDraft, HuntDraftSave } from '@/lib/types';

// ─── localStorage mock ────────────────────────────────────────────────────────

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

vi.stubGlobal('localStorage', localStorageMock);

// ─── Debounce mock ────────────────────────────────────────────────────────────
// Override lib/debounce so the hook fires synchronously in tests.

vi.mock('@/lib/debounce', () => ({
  debounce: <TArgs extends unknown[]>(fn: (...args: TArgs) => void, _delay: number) => {
    const wrapped = (...args: TArgs) => fn(...args);
    wrapped.cancel = vi.fn();
    return wrapped;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_HUNTS: HuntDraft[] = [
  { id: 1, title: 'Clue 1', description: 'Desc 1', link: '', code: '' },
];

const MOCK_META: HuntDraftSave['meta'] = {
  gameName: 'My Test Hunt',
  startDate: '2026-01-01',
  endDate: '2026-01-31',
  rewardType: 'XLM',
  sequential: false,
  isPrivate: false,
  timerEnabled: false,
  creatorEmail: '',
  emailNotifications: false,
};

const MOCK_REWARDS = [{ place: 1, amount: 100 }];

function buildDraft(overrides: Partial<HuntDraftSave> = {}): HuntDraftSave {
  return {
    draftId: 'test-draft-id',
    label: 'Test Draft',
    savedAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago
    hunts: MOCK_HUNTS,
    rewards: MOCK_REWARDS,
    meta: MOCK_META,
    recovered: false,
    ...overrides,
  };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  store = {};
  vi.clearAllMocks();
});

afterEach(() => {
  store = {};
});

// ─── Helper utilities ─────────────────────────────────────────────────────────

describe('readDraftPayload', () => {
  it('returns null when the key is absent', () => {
    expect(readDraftPayload('nonexistent-id')).toBeNull();
  });

  it('returns the parsed draft when the key exists', () => {
    const draft = buildDraft();
    store[draftPayloadKey(draft.draftId)] = JSON.stringify(draft);
    expect(readDraftPayload(draft.draftId)).toEqual(draft);
  });

  it('returns null when the stored value is malformed JSON', () => {
    store[draftPayloadKey('bad-id')] = '{ not json }';
    expect(readDraftPayload('bad-id')).toBeNull();
  });
});

describe('deleteDraft', () => {
  it('removes the draft payload from storage', () => {
    const draft = buildDraft();
    store[draftPayloadKey(draft.draftId)] = JSON.stringify(draft);
    store[DRAFT_INDEX_KEY] = JSON.stringify([draft.draftId]);

    deleteDraft(draft.draftId);

    expect(store[draftPayloadKey(draft.draftId)]).toBeUndefined();
  });

  it('removes the draftId from the index', () => {
    const draft = buildDraft();
    store[draftPayloadKey(draft.draftId)] = JSON.stringify(draft);
    store[DRAFT_INDEX_KEY] = JSON.stringify([draft.draftId, 'other-id']);

    deleteDraft(draft.draftId);

    const index = JSON.parse(store[DRAFT_INDEX_KEY]) as string[];
    expect(index).not.toContain(draft.draftId);
    expect(index).toContain('other-id');
  });

  it('does not throw when the draftId is not in the index', () => {
    store[DRAFT_INDEX_KEY] = JSON.stringify(['other-id']);
    expect(() => deleteDraft('missing-id')).not.toThrow();
  });
});

describe('listAllDrafts', () => {
  it('returns an empty array when no drafts are saved', () => {
    expect(listAllDrafts()).toEqual([]);
  });

  it('returns drafts in newest-first order', () => {
    const olderDraft = buildDraft({
      draftId: 'old',
      label: 'Old',
      savedAt: new Date(Date.now() - 120_000).toISOString(),
    });
    const newerDraft = buildDraft({
      draftId: 'new',
      label: 'New',
      savedAt: new Date(Date.now() - 30_000).toISOString(),
    });

    store[draftPayloadKey('old')] = JSON.stringify(olderDraft);
    store[draftPayloadKey('new')] = JSON.stringify(newerDraft);
    store[DRAFT_INDEX_KEY] = JSON.stringify(['old', 'new']);

    const drafts = listAllDrafts();
    expect(drafts[0].draftId).toBe('new');
    expect(drafts[1].draftId).toBe('old');
  });

  it('skips index entries whose payload is missing', () => {
    store[DRAFT_INDEX_KEY] = JSON.stringify(['ghost-id']);
    // No payload stored for "ghost-id"
    expect(listAllDrafts()).toEqual([]);
  });
});

describe('markDraftRecovered', () => {
  it('sets the recovered flag to true', () => {
    const draft = buildDraft();
    store[draftPayloadKey(draft.draftId)] = JSON.stringify(draft);
    store[DRAFT_INDEX_KEY] = JSON.stringify([draft.draftId]);

    markDraftRecovered(draft.draftId);

    const updated = readDraftPayload(draft.draftId);
    expect(updated?.recovered).toBe(true);
  });

  it('does not throw when the draft does not exist', () => {
    expect(() => markDraftRecovered('nonexistent')).not.toThrow();
  });
});

// ─── useHuntDraftAutoSave hook ────────────────────────────────────────────────

describe('useHuntDraftAutoSave', () => {
  it('exposes a stable activeDraftId on first render', () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: MOCK_META,
      })
    );
    expect(result.current.activeDraftId).toBeTruthy();
    expect(typeof result.current.activeDraftId).toBe('string');
  });

  it('uses the provided draftId instead of generating a new one', () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: MOCK_META,
        draftId: 'my-existing-id',
      })
    );
    expect(result.current.activeDraftId).toBe('my-existing-id');
  });

  it('writes a draft payload to localStorage on mount (debounce fires synchronously in tests)', async () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: MOCK_META,
      })
    );

    await waitFor(() => {
      const stored = localStorageMock.setItem.mock.calls.some(([key]) =>
        key.startsWith('hunty_draft_')
      );
      expect(stored).toBe(true);
    });

    const draftId = result.current.activeDraftId!;
    const saved = readDraftPayload(draftId);
    expect(saved).not.toBeNull();
    expect(saved?.label).toBe('My Test Hunt');
    expect(saved?.hunts).toEqual(MOCK_HUNTS);
  });

  it('saveNow() resolves and transitions status to saved', async () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: MOCK_META,
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.saveStatus).toBe('saved');
  });

  it('saveNow() writes the label from meta.gameName', async () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: { ...MOCK_META, gameName: 'Custom Label Hunt' },
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    const saved = readDraftPayload(result.current.activeDraftId!);
    expect(saved?.label).toBe('Custom Label Hunt');
  });

  it("falls back to 'Untitled Draft' when gameName is empty", async () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: { ...MOCK_META, gameName: '' },
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    const saved = readDraftPayload(result.current.activeDraftId!);
    expect(saved?.label).toBe('Untitled Draft');
  });

  it('includes the draftId in the global index after saveNow()', async () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: MOCK_META,
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    const draftId = result.current.activeDraftId!;
    const raw = store[DRAFT_INDEX_KEY];
    const index = raw ? (JSON.parse(raw) as string[]) : [];
    expect(index).toContain(draftId);
  });

  it('does not duplicate draftId in the index on repeated saves', async () => {
    const { result } = renderHook(() =>
      useHuntDraftAutoSave({
        hunts: MOCK_HUNTS,
        rewards: MOCK_REWARDS,
        meta: MOCK_META,
        draftId: 'fixed-id',
      })
    );

    await act(async () => {
      await result.current.saveNow();
    });
    await act(async () => {
      await result.current.saveNow();
    });

    const index = JSON.parse(store[DRAFT_INDEX_KEY]) as string[];
    const occurrences = index.filter((id) => id === 'fixed-id');
    expect(occurrences).toHaveLength(1);
  });
});
