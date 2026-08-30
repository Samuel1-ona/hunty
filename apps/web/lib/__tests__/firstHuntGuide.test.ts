import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyKnownFirstHuntProgress,
  dismissFirstHuntGuide,
  FIRST_HUNT_GUIDE_EVENT,
  FIRST_HUNT_GUIDE_STORAGE_KEY,
  FIRST_HUNT_STEP_IDS,
  FIRST_HUNT_STEPS,
  getDefaultFirstHuntGuideState,
  getFirstHuntProgress,
  getFirstHuntStepHref,
  hydrateFirstHuntGuide,
  inferFirstHuntProgressFromStorage,
  isFirstHuntStepId,
  loadFirstHuntGuideState,
  markFirstHuntStep,
  normalizeFirstHuntGuideState,
  OPEN_WALLET_EVENT,
  requestWalletConnect,
  restoreFirstHuntGuide,
  saveFirstHuntGuideState,
  setFirstHuntGuideCollapsed,
} from '@/lib/firstHuntGuide';

function readStored() {
  const raw = window.localStorage.getItem(FIRST_HUNT_GUIDE_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

describe('firstHuntGuide', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('defaults and normalization', () => {
    it('returns an empty checklist by default', () => {
      const state = getDefaultFirstHuntGuideState();
      expect(state.dismissed).toBe(false);
      expect(state.collapsed).toBe(false);
      expect(state.huntId).toBeNull();
      expect(state.completed).toEqual({
        connect: false,
        join: false,
        solve: false,
        claim: false,
      });
    });

    it('covers connect, join, solve, and claim', () => {
      expect(FIRST_HUNT_STEP_IDS).toEqual(['connect', 'join', 'solve', 'claim']);
      expect(FIRST_HUNT_STEPS.map((step) => step.id)).toEqual(FIRST_HUNT_STEP_IDS);
    });

    it('identifies valid step ids', () => {
      expect(isFirstHuntStepId('connect')).toBe(true);
      expect(isFirstHuntStepId('join')).toBe(true);
      expect(isFirstHuntStepId('unknown')).toBe(false);
      expect(isFirstHuntStepId(12)).toBe(false);
    });

    it('normalizes malformed payloads', () => {
      expect(normalizeFirstHuntGuideState(null).completed.connect).toBe(false);
      expect(normalizeFirstHuntGuideState('nope').dismissed).toBe(false);

      const normalized = normalizeFirstHuntGuideState({
        dismissed: true,
        collapsed: 'yes',
        completed: { connect: true, join: 'no', extra: true },
        huntId: -4,
        updatedAt: 99,
      });

      expect(normalized.dismissed).toBe(true);
      expect(normalized.collapsed).toBe(false);
      expect(normalized.completed.connect).toBe(true);
      expect(normalized.completed.join).toBe(false);
      expect(normalized.huntId).toBeNull();
      expect(normalized.updatedAt).toBe(99);
    });
  });

  describe('persistence', () => {
    it('loads defaults when nothing is stored', () => {
      expect(loadFirstHuntGuideState().completed.claim).toBe(false);
    });

    it('persists progress across load/save cycles', () => {
      saveFirstHuntGuideState({
        ...getDefaultFirstHuntGuideState(),
        completed: { connect: true, join: true, solve: false, claim: false },
        huntId: 42,
      });

      const loaded = loadFirstHuntGuideState();
      expect(loaded.completed.connect).toBe(true);
      expect(loaded.completed.join).toBe(true);
      expect(loaded.huntId).toBe(42);
      expect(readStored().huntId).toBe(42);
    });

    it('returns defaults when stored JSON is invalid', () => {
      window.localStorage.setItem(FIRST_HUNT_GUIDE_STORAGE_KEY, '{not-json');
      expect(loadFirstHuntGuideState().dismissed).toBe(false);
    });

    it('does not throw when localStorage.setItem fails', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      expect(() => saveFirstHuntGuideState(getDefaultFirstHuntGuideState())).not.toThrow();
    });

    it('emits a change event after saving', () => {
      const listener = vi.fn();
      window.addEventListener(FIRST_HUNT_GUIDE_EVENT, listener);
      saveFirstHuntGuideState(getDefaultFirstHuntGuideState());
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(FIRST_HUNT_GUIDE_EVENT, listener);
    });
  });

  describe('step marking', () => {
    it('marks a step and implied prerequisites', () => {
      const state = markFirstHuntStep('solve', { huntId: 7 });
      expect(state.completed.solve).toBe(true);
      expect(state.completed.join).toBe(true);
      expect(state.completed.connect).toBe(true);
      expect(state.completed.claim).toBe(false);
      expect(state.huntId).toBe(7);
    });

    it('claiming implies the full first-hunt path', () => {
      const state = markFirstHuntStep('claim', { huntId: 3 });
      expect(state.completed).toEqual({
        connect: true,
        join: true,
        solve: true,
        claim: true,
      });
    });

    it('keeps an existing hunt id when none is provided', () => {
      markFirstHuntStep('join', { huntId: 11 });
      const next = markFirstHuntStep('solve');
      expect(next.huntId).toBe(11);
    });
  });

  describe('dismiss / restore / collapse', () => {
    it('dismisses the checklist and persists the choice', () => {
      const state = dismissFirstHuntGuide();
      expect(state.dismissed).toBe(true);
      expect(state.collapsed).toBe(true);
      expect(loadFirstHuntGuideState().dismissed).toBe(true);
    });

    it('restores a dismissed checklist', () => {
      dismissFirstHuntGuide();
      const state = restoreFirstHuntGuide();
      expect(state.dismissed).toBe(false);
      expect(state.collapsed).toBe(false);
    });

    it('toggles collapsed without dismissing', () => {
      const collapsed = setFirstHuntGuideCollapsed(true);
      expect(collapsed.collapsed).toBe(true);
      expect(collapsed.dismissed).toBe(false);
      expect(setFirstHuntGuideCollapsed(false).collapsed).toBe(false);
    });
  });

  describe('progress helpers', () => {
    it('reports the next incomplete step', () => {
      const progress = getFirstHuntProgress({
        ...getDefaultFirstHuntGuideState(),
        completed: { connect: true, join: false, solve: false, claim: false },
      });
      expect(progress.completedCount).toBe(1);
      expect(progress.total).toBe(4);
      expect(progress.nextStep?.id).toBe('join');
      expect(progress.allComplete).toBe(false);
    });

    it('reports completion when every step is done', () => {
      const progress = getFirstHuntProgress({
        ...getDefaultFirstHuntGuideState(),
        completed: { connect: true, join: true, solve: true, claim: true },
      });
      expect(progress.allComplete).toBe(true);
      expect(progress.nextStep).toBeNull();
    });

    it('applies known progress without clearing existing steps', () => {
      markFirstHuntStep('connect');
      const state = applyKnownFirstHuntProgress({ solved: true, huntId: 5 });
      expect(state.completed.connect).toBe(true);
      expect(state.completed.join).toBe(true);
      expect(state.completed.solve).toBe(true);
      expect(state.huntId).toBe(5);
    });

    it('routes join/solve/claim to the current hunt when known', () => {
      const solve = FIRST_HUNT_STEPS.find((step) => step.id === 'solve')!;
      expect(getFirstHuntStepHref(solve, 9)).toBe('/hunt/9');
      expect(getFirstHuntStepHref(solve, null)).toBe('/#discovery-arcade');
      const connect = FIRST_HUNT_STEPS.find((step) => step.id === 'connect')!;
      expect(getFirstHuntStepHref(connect, 9)).toBe('/');
    });
  });

  describe('inference from existing storage', () => {
    it('detects a connected wallet from the persisted wallet store', () => {
      window.localStorage.setItem(
        'hunty-wallet',
        JSON.stringify({ state: { walletAddress: 'GABC' } })
      );
      expect(inferFirstHuntProgressFromStorage()).toMatchObject({ connected: true });
    });

    it('detects join/solve from hunt completion keys', () => {
      window.localStorage.setItem('hunt_completed_18', 'true');
      const inferred = inferFirstHuntProgressFromStorage();
      expect(inferred.joined).toBe(true);
      expect(inferred.solved).toBe(true);
      expect(inferred.huntId).toBe(18);
    });

    it('detects solve from clue keys', () => {
      window.localStorage.setItem('hunt_clue_solved_4_1', 'true');
      const inferred = inferFirstHuntProgressFromStorage();
      expect(inferred.solved).toBe(true);
      expect(inferred.huntId).toBe(4);
    });

    it('detects join from attempt history and solve from completed attempts', () => {
      window.localStorage.setItem(
        'hunty_hunt_attempts_GPLAYER',
        JSON.stringify([{ huntId: 22, status: 'completed', clues: [{ clueId: 1 }] }])
      );
      const inferred = inferFirstHuntProgressFromStorage('GPLAYER');
      expect(inferred.connected).toBe(true);
      expect(inferred.joined).toBe(true);
      expect(inferred.solved).toBe(true);
      expect(inferred.huntId).toBe(22);
    });

    it('detects join from active attempt keys', () => {
      window.localStorage.setItem('hunty_active_attempt_GPLAYER_3', 'attempt_1');
      expect(inferFirstHuntProgressFromStorage()).toMatchObject({ joined: true });
    });

    it('ignores malformed attempt history', () => {
      window.localStorage.setItem('hunty_hunt_attempts_GPLAYER', '{bad');
      expect(inferFirstHuntProgressFromStorage('GPLAYER').solved).toBeUndefined();
    });

    it('hydrates persisted checklist from inferred storage', () => {
      window.localStorage.setItem('hunt_completed_2', 'true');
      const state = hydrateFirstHuntGuide();
      expect(state.completed.solve).toBe(true);
      expect(state.completed.join).toBe(true);
      expect(state.huntId).toBe(2);
    });
  });

  describe('wallet request', () => {
    it('dispatches the open-wallet event', () => {
      const listener = vi.fn();
      window.addEventListener(OPEN_WALLET_EVENT, listener);
      requestWalletConnect();
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(OPEN_WALLET_EVENT, listener);
    });
  });
});
