// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock lib/db so we never need a real Postgres connection ─────────────────
const mockSql = vi.fn() as ReturnType<typeof vi.fn> & {
  array: (v: unknown[]) => unknown[];
  json: (v: unknown) => unknown;
};
mockSql.array = (v: unknown[]) => v;
mockSql.json = (v: unknown) => v;

vi.mock('@/lib/db', () => ({ getDb: () => mockSql }));

import { getIP, rateLimit, rateLimitResponse } from '../rate-limit';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Make the DB UPSERT return a count row */
function setupCount(count: number) {
  mockSql.mockImplementation(() => Promise.resolve([{ count }]));
}

/** Make the DB throw */
function setupDbError() {
  mockSql.mockImplementation(() => Promise.reject(new Error('db down')));
}

// ── rateLimit ────────────────────────────────────────────────────────────────

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows the first request and returns remaining count', async () => {
    setupCount(1);
    const result = await rateLimit('192.168.1.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it('allows requests up to the limit', async () => {
    setupCount(60);
    const result = await rateLimit('10.0.0.1');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('blocks requests that exceed the limit', async () => {
    setupCount(61);
    const result = await rateLimit('10.0.0.2');
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('rejects with zero remaining when exceeded', async () => {
    setupCount(100);
    const result = await rateLimit('10.0.0.3');
    expect(result.remaining).toBe(0);
  });

  it('accepts custom limit and window configurations', async () => {
    setupCount(5);
    const result = await rateLimit('10.0.0.5', { limit: 5, windowMs: 2000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('accepts custom limit - blocks when over', async () => {
    setupCount(6);
    const result = await rateLimit('10.0.0.5', { limit: 5, windowMs: 2000 });
    expect(result.success).toBe(false);
  });

  it('returns the correct reset timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    setupCount(1);
    const result = await rateLimit('10.0.0.8', { limit: 10, windowMs: 5000 });
    // Window aligned: floor(1_000_000 / 5000) * 5000 + 5000 = 1_000_000 + 5000 = 1_005_000
    expect(result.reset).toBe(1_005_000);
  });

  it('uses default config when none is provided', async () => {
    setupCount(1);
    const result = await rateLimit('10.0.0.9');
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(59);
    expect(typeof result.reset).toBe('number');
  });

  it('degrades gracefully when the database is unavailable', async () => {
    setupDbError();
    const result = await rateLimit('10.0.0.10');
    expect(result.success).toBe(true); // allow through
  });
});

// ── getIP ────────────────────────────────────────────────────────────────────

describe('getIP', () => {
  it('returns the IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195' },
    });
    expect(getIP(req)).toBe('203.0.113.195');
  });

  it('returns the first IP from a comma-separated x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '203.0.113.195, 198.51.100.14, 192.0.2.1' },
    });
    expect(getIP(req)).toBe('203.0.113.195');
  });

  it('returns 127.0.0.1 when no x-forwarded-for header is present', () => {
    const req = new Request('http://localhost');
    expect(getIP(req)).toBe('127.0.0.1');
  });

  it('trims whitespace from the IP value', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  203.0.113.195  ' },
    });
    expect(getIP(req)).toBe('203.0.113.195');
  });

  it('falls back to 127.0.0.1 when x-forwarded-for is empty', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '' },
    });
    expect(getIP(req)).toBe('127.0.0.1');
  });
});

// ── rateLimitResponse ────────────────────────────────────────────────────────

describe('rateLimitResponse', () => {
  it('returns a 429 status response', () => {
    const reset = Date.now() + 60_000;
    const response = rateLimitResponse(reset);
    expect(response.status).toBe(429);
  });

  it('sets X-RateLimit-Reset header to the reset timestamp in seconds', () => {
    const reset = 2_000_000;
    const response = rateLimitResponse(reset);
    expect(response.headers.get('X-RateLimit-Reset')).toBe('2000');
  });

  it('sets Retry-After header', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const reset = 1_060_000;
    const response = rateLimitResponse(reset);
    expect(response.headers.get('Retry-After')).toBe('60');
    vi.useRealTimers();
  });

  it('returns an error message and code in the JSON body', async () => {
    const reset = Date.now() + 60_000;
    const response = rateLimitResponse(reset);
    const body = await response.json();
    expect(body).toEqual({
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMITED',
    });
  });

  it('returns a JSON content-type header', () => {
    const reset = Date.now() + 60_000;
    const response = rateLimitResponse(reset);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
  });
});
