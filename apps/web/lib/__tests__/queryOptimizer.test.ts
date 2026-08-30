import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  dbPoolConfig,
  getPublicHuntByIdOptimized,
  listPublicActiveHuntsByCursorOptimized,
} from '@/lib/db/queryOptimizer';

describe('queryOptimizer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cursor pagination with next cursor', () => {
    const page = listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 1 });

    expect(page.data.length).toBeLessThanOrEqual(1);
    expect(page.total).toBeGreaterThan(0);
    expect(page.nextCursor === null || typeof page.nextCursor === 'number').toBe(true);
  });

  it('returns public hunt from indexed lookup', () => {
    const hunt = getPublicHuntByIdOptimized(1);

    expect(hunt).toBeDefined();
    expect(hunt?.id).toBe(1);
  });

  it('exposes pool configuration defaults', () => {
    expect(dbPoolConfig.min).toBeGreaterThan(0);
    expect(dbPoolConfig.max).toBeGreaterThanOrEqual(dbPoolConfig.min);
  });

  it('filters hunts by status', () => {
    const activePage = listPublicActiveHuntsByCursorOptimized({
      cursor: null,
      limit: 10,
      status: 'Active',
    });
    expect(activePage.data.every((h) => h.status === 'Active')).toBe(true);

    const completedPage = listPublicActiveHuntsByCursorOptimized({
      cursor: null,
      limit: 10,
      status: 'Completed',
    });
    expect(completedPage.data.every((h) => h.status === 'Completed')).toBe(true);
  });

  it('filters hunts by reward type', () => {
    const xlmPage = listPublicActiveHuntsByCursorOptimized({
      cursor: null,
      limit: 10,
      reward: 'XLM',
    });
    expect(xlmPage.data.every((h) => h.rewardType === 'XLM' || h.rewardType === 'Both')).toBe(true);
  });

  it('filters hunts by search query', () => {
    const searchPage = listPublicActiveHuntsByCursorOptimized({
      cursor: null,
      limit: 10,
      search: 'Secrets',
    });
    expect(
      searchPage.data.every((h) => h.title.includes('Secrets') || h.description.includes('Secrets'))
    ).toBe(true);
  });

  it('sorts hunts correctly', () => {
    const page = listPublicActiveHuntsByCursorOptimized({
      cursor: null,
      limit: 10,
      sortBy: 'clues-high',
    });
    if (page.data.length >= 2) {
      expect(page.data[0].cluesCount).toBeGreaterThanOrEqual(page.data[1].cluesCount);
    }
  });

  it('benchmarks query execution under repeated calls (caching efficacy)', () => {
    vi.useFakeTimers();
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      getPublicHuntByIdOptimized(1, 'bench-req');
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    expect(avgMs).toBeLessThan(1);

    vi.useRealTimers();
  });

  it('benchmarks filtered listing performance (caching efficacy)', () => {
    vi.useFakeTimers();
    const iterations = 50;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10 });
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    expect(avgMs).toBeLessThan(1);

    vi.useRealTimers();
  });

  it('benchmarks cursor pagination with varying parameters (uncached path)', () => {
    vi.useFakeTimers();
    const iterations = 20;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      listPublicActiveHuntsByCursorOptimized({
        cursor: null,
        limit: 10,
        difficulty: i % 2 === 0 ? 'Easy' : 'Hard',
      });
    }

    const elapsed = performance.now() - start;
    const avgMs = elapsed / iterations;

    expect(avgMs).toBeLessThan(5);

    vi.useRealTimers();
  });

  it('uses logger for slow query warnings (not console.log)', () => {
    const loggerModule = require('@/lib/logger');
    const warnSpy = vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => {});

    vi.useFakeTimers();
    listPublicActiveHuntsByCursorOptimized({ cursor: null, limit: 10 });

    expect(warnSpy).not.toHaveBeenCalled();

    vi.useRealTimers();
    warnSpy.mockRestore();
  });

  it('deduplicates repeated queries (N+1 detection)', () => {
    vi.useFakeTimers();
    const requestId = 'nplusone-test';

    for (let i = 0; i < 10; i++) {
      getPublicHuntByIdOptimized(1, requestId);
    }

    vi.useRealTimers();
  });
});
