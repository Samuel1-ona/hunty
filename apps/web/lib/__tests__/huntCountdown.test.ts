import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getCountdownParts, getTimeWarningLevel, resolveHuntLiveStatus } from '../huntCountdown';
import {
  computeOffsetFromServerPayload,
  getServerSyncedNowMs,
  setCachedTimeOffsetMs,
} from '../serverTime';

describe('huntCountdown', () => {
  it('splits countdown into days/hours/minutes/seconds', () => {
    const now = 1_000_000;
    const parts = getCountdownParts(now + 90061, now); // 1d 1h 1m 1s
    expect(parts.expired).toBe(false);
    expect(parts.days).toBe(1);
    expect(parts.hours).toBe(1);
    expect(parts.minutes).toBe(1);
    expect(parts.seconds).toBe(1);
    expect(parts.label).toContain('d');
  });

  it('marks expired when target passed', () => {
    expect(getCountdownParts(100, 200).expired).toBe(true);
  });

  it('resolves live status', () => {
    const now = 10_000;
    expect(resolveHuntLiveStatus({ startTime: 11_000, endTime: 20_000, now })).toBe('scheduled');
    expect(resolveHuntLiveStatus({ startTime: 9_000, endTime: 20_000, now })).toBe('live');
    expect(
      resolveHuntLiveStatus({ startTime: 9_000, endTime: 10_500, now, endingSoonSeconds: 1000 })
    ).toBe('ending_soon');
    expect(resolveHuntLiveStatus({ endTime: 9_000, now })).toBe('ended');
  });

  it('warns at thresholds', () => {
    expect(getTimeWarningLevel(3600)).toBe('none');
    expect(getTimeWarningLevel(20 * 60)).toBe('caution');
    expect(getTimeWarningLevel(4 * 60)).toBe('warning');
    expect(getTimeWarningLevel(30)).toBe('critical');
    expect(getTimeWarningLevel(0)).toBe('expired');
  });
});

describe('serverTime', () => {
  beforeEach(() => {
    setCachedTimeOffsetMs(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes offset from serverNowMs', () => {
    const snap = computeOffsetFromServerPayload({ serverNowMs: 5_000 }, 4_000);
    expect(snap.offsetMs).toBe(1_000);
    expect(getServerSyncedNowMs()).toBe(Date.now() + 1_000);
  });

  it('accepts ISO timestamp payloads', () => {
    const snap = computeOffsetFromServerPayload(
      { timestamp: new Date(10_000).toISOString() },
      9_000
    );
    expect(snap.offsetMs).toBe(1_000);
  });
});
