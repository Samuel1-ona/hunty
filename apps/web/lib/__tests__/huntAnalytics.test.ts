/**
 * Unit tests for lib/huntAnalytics.ts
 *
 * Two sections:
 *  1. buildAnalyticsCsv — pure function, no I/O, fully isolated.
 *  2. recordAnalyticsEvent / getHuntAnalytics — uses a real temp file
 *     in a dedicated test directory that is cleaned up after each test.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// ─── Helpers: override ANALYTICS_PATH per test ───────────────────────────────
// lib/huntAnalytics resolves ANALYTICS_PATH at module load time from
// process.cwd(). We can't change that at runtime easily, so integration
// tests use a unique huntId range (>= 9000) that won't collide with
// production ids, and we clean up the file after each test.

const ANALYTICS_FILE = path.join(process.cwd(), 'data', 'hunt-analytics.json');

async function clearAnalyticsForIds(ids: number[]) {
  try {
    const raw = await fs.readFile(ANALYTICS_FILE, 'utf8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    for (const id of ids) delete data[String(id)];
    await fs.writeFile(ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // file may not exist yet — that's fine
  }
}

import {
  recordAnalyticsEvent,
  getHuntAnalytics,
  buildAnalyticsCsv,
  type HuntAnalyticsResponse,
} from '@/lib/huntAnalytics';

// ─── recordAnalyticsEvent / getHuntAnalytics ─────────────────────────────────
// Each test uses a unique huntId >= 9000 to avoid collisions with each other
// or with production data. After each test the entries are removed.

describe('recordAnalyticsEvent', () => {
  const usedIds: number[] = [];

  afterEach(async () => {
    await clearAnalyticsForIds(usedIds);
    usedIds.length = 0;
  });

  it('increments views counter for a view event', async () => {
    const id = 9001;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'view', huntId: id, deviceType: 'desktop' });
    const data = await getHuntAnalytics(id);
    expect(data.views).toBe(1);
    expect(data.starts).toBe(0);
    expect(data.completions).toBe(0);
  });

  it('increments starts counter for a start event', async () => {
    const id = 9002;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'start', huntId: id });
    const data = await getHuntAnalytics(id);
    expect(data.starts).toBe(1);
    expect(data.views).toBe(0);
  });

  it('increments completions and accumulates time', async () => {
    const id = 9003;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 300 });
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 500 });
    const data = await getHuntAnalytics(id);
    expect(data.completions).toBe(2);
    expect(data.totalCompletionTimeSeconds).toBe(800);
  });

  it('records clue_attempt events', async () => {
    const id = 9004;
    usedIds.push(id);
    await recordAnalyticsEvent({
      type: 'clue_attempt',
      huntId: id,
      clueIndex: 0,
      clueLabel: 'Clue 1',
    });
    await recordAnalyticsEvent({ type: 'clue_attempt', huntId: id, clueIndex: 0 });
    const clue = (await getHuntAnalytics(id)).clueDropOff.find((c) => c.clueIndex === 0);
    expect(clue).toBeDefined();
    expect(clue!.attempts).toBe(2);
    expect(clue!.completions).toBe(0);
  });

  it('records clue_completion events and accumulates time', async () => {
    const id = 9005;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'clue_attempt', huntId: id, clueIndex: 1 });
    await recordAnalyticsEvent({
      type: 'clue_completion',
      huntId: id,
      clueIndex: 1,
      timeTakenSeconds: 90,
    });
    await recordAnalyticsEvent({
      type: 'clue_completion',
      huntId: id,
      clueIndex: 1,
      timeTakenSeconds: 60,
    });
    const clue = (await getHuntAnalytics(id)).clueDropOff.find((c) => c.clueIndex === 1);
    expect(clue!.completions).toBe(2);
    expect(clue!.totalTimeSeconds).toBe(150);
  });

  it('stores demographic data from view events', async () => {
    const id = 9006;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'view', huntId: id, deviceType: 'mobile' });
    await recordAnalyticsEvent({ type: 'view', huntId: id, deviceType: 'mobile' });
    await recordAnalyticsEvent({ type: 'view', huntId: id, deviceType: 'desktop' });
    const { demographics } = await getHuntAnalytics(id);
    expect(demographics.find((d) => d.deviceType === 'mobile')!.count).toBe(2);
    expect(demographics.find((d) => d.deviceType === 'desktop')!.count).toBe(1);
  });

  it('buckets time-series data by day', async () => {
    const id = 9007;
    usedIds.push(id);
    const today = new Date().toISOString().slice(0, 10);
    await recordAnalyticsEvent({ type: 'view', huntId: id, deviceType: 'unknown' });
    await recordAnalyticsEvent({ type: 'start', huntId: id });
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 120 });
    const point = (await getHuntAnalytics(id)).timeSeries.find((p) => p.date === today);
    expect(point).toBeDefined();
    expect(point!.views).toBe(1);
    expect(point!.starts).toBe(1);
    expect(point!.completions).toBe(1);
  });

  it('handles past timestamps in time-series bucketing', async () => {
    const id = 9008;
    usedIds.push(id);
    const pastDate = '2024-01-15';
    await recordAnalyticsEvent({
      type: 'view',
      huntId: id,
      deviceType: 'tablet',
      timestamp: `${pastDate}T10:00:00.000Z`,
    });
    const point = (await getHuntAnalytics(id)).timeSeries.find((p) => p.date === pastDate);
    expect(point).toBeDefined();
    expect(point!.views).toBe(1);
  });

  it('isolates data across different huntIds', async () => {
    const id1 = 9009;
    const id2 = 9010;
    usedIds.push(id1, id2);
    await recordAnalyticsEvent({ type: 'view', huntId: id1, deviceType: 'desktop' });
    await recordAnalyticsEvent({ type: 'view', huntId: id1, deviceType: 'desktop' });
    await recordAnalyticsEvent({ type: 'view', huntId: id2, deviceType: 'mobile' });
    expect((await getHuntAnalytics(id1)).views).toBe(2);
    expect((await getHuntAnalytics(id2)).views).toBe(1);
  });
});

// ─── getHuntAnalytics derived metrics ────────────────────────────────────────

describe('getHuntAnalytics — derived metrics', () => {
  const usedIds: number[] = [];

  afterEach(async () => {
    await clearAnalyticsForIds(usedIds);
    usedIds.length = 0;
  });

  it('returns completionRate=0 and null avg time for a hunt with no data', async () => {
    const data = await getHuntAnalytics(9999);
    expect(data.completionRate).toBe(0);
    expect(data.avgCompletionTimeSeconds).toBeNull();
  });

  it('computes completionRate = completions / starts × 100', async () => {
    const id = 9020;
    usedIds.push(id);
    for (let i = 0; i < 10; i++) await recordAnalyticsEvent({ type: 'start', huntId: id });
    for (let i = 0; i < 4; i++)
      await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 100 });
    expect((await getHuntAnalytics(id)).completionRate).toBe(40);
  });

  it('computes avgCompletionTimeSeconds as integer average', async () => {
    const id = 9021;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 100 });
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 200 });
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 300 });
    expect((await getHuntAnalytics(id)).avgCompletionTimeSeconds).toBe(200);
  });

  it('returns null avgCompletionTimeSeconds when completions = 0', async () => {
    const id = 9022;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'start', huntId: id });
    expect((await getHuntAnalytics(id)).avgCompletionTimeSeconds).toBeNull();
  });

  it('sets completionRate to 100 when all starters complete', async () => {
    const id = 9023;
    usedIds.push(id);
    await recordAnalyticsEvent({ type: 'start', huntId: id });
    await recordAnalyticsEvent({ type: 'completion', huntId: id, totalTimeSeconds: 60 });
    expect((await getHuntAnalytics(id)).completionRate).toBe(100);
  });
});

// ─── buildAnalyticsCsv — pure function tests ─────────────────────────────────

describe('buildAnalyticsCsv', () => {
  const sample: HuntAnalyticsResponse = {
    huntId: 42,
    views: 100,
    starts: 60,
    completions: 30,
    totalCompletionTimeSeconds: 9000,
    completionRate: 50,
    avgCompletionTimeSeconds: 300,
    clueDropOff: [
      { clueIndex: 0, label: 'Clue 1', attempts: 60, completions: 50, totalTimeSeconds: 3000 },
      { clueIndex: 1, label: 'Clue 2', attempts: 50, completions: 30, totalTimeSeconds: 2400 },
    ],
    demographics: [
      { deviceType: 'mobile', count: 70 },
      { deviceType: 'desktop', count: 30 },
    ],
    timeSeries: [
      { date: '2024-06-01', views: 40, starts: 20, completions: 10 },
      { date: '2024-06-02', views: 60, starts: 40, completions: 20 },
    ],
    updatedAt: '2024-06-02T18:00:00.000Z',
  };

  it('produces a non-empty string', () => {
    expect(buildAnalyticsCsv(sample).length).toBeGreaterThan(0);
  });

  it('includes hunt ID', () => {
    expect(buildAnalyticsCsv(sample)).toContain('Hunt ID,42');
  });

  it('includes views, starts, and completions', () => {
    const csv = buildAnalyticsCsv(sample);
    expect(csv).toContain('Views,100');
    expect(csv).toContain('Starts,60');
    expect(csv).toContain('Completions,30');
  });

  it('includes completion rate', () => {
    expect(buildAnalyticsCsv(sample)).toContain('Completion Rate (%),50');
  });

  it('includes average completion time', () => {
    expect(buildAnalyticsCsv(sample)).toContain('Avg Completion Time (s),300');
  });

  it('includes daily activity rows', () => {
    const csv = buildAnalyticsCsv(sample);
    expect(csv).toContain('2024-06-01');
    expect(csv).toContain('2024-06-02');
  });

  it('includes Clue 2 with 40% drop-off rate', () => {
    // 50 attempts, 30 completions → (50-30)/50 = 40%
    expect(buildAnalyticsCsv(sample)).toMatch(/Clue 2,50,30,40,/);
  });

  it('includes demographics', () => {
    const csv = buildAnalyticsCsv(sample);
    expect(csv).toContain('mobile,70');
    expect(csv).toContain('desktop,30');
  });

  it('outputs N/A for null avgCompletionTimeSeconds', () => {
    expect(buildAnalyticsCsv({ ...sample, avgCompletionTimeSeconds: null })).toContain(
      'Avg Completion Time (s),N/A'
    );
  });

  it('outputs N/A avg time for clues with zero completions', () => {
    const csv = buildAnalyticsCsv({
      ...sample,
      clueDropOff: [
        { clueIndex: 0, label: 'Clue 1', attempts: 10, completions: 0, totalTimeSeconds: 0 },
      ],
    });
    expect(csv).toMatch(/Clue 1,10,0,100,N\/A/);
  });

  it('escapes field values containing commas', () => {
    const csv = buildAnalyticsCsv({
      ...sample,
      clueDropOff: [
        { clueIndex: 0, label: 'Sign, park', attempts: 5, completions: 5, totalTimeSeconds: 300 },
      ],
    });
    expect(csv).toContain('"Sign, park"');
  });

  it('includes all four section headers', () => {
    const csv = buildAnalyticsCsv(sample);
    expect(csv).toContain('# Summary');
    expect(csv).toContain('# Daily Activity');
    expect(csv).toContain('# Clue Drop-off');
    expect(csv).toContain('# Player Demographics');
  });

  it('handles empty time series without throwing', () => {
    expect(() => buildAnalyticsCsv({ ...sample, timeSeries: [] })).not.toThrow();
  });

  it('handles empty demographics without throwing', () => {
    expect(() => buildAnalyticsCsv({ ...sample, demographics: [] })).not.toThrow();
  });
});
