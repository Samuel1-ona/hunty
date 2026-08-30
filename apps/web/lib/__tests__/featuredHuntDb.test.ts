// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock lib/db so we never need a real Postgres connection in unit tests.
// ---------------------------------------------------------------------------
const mockSql = vi.fn();
vi.mock('@/lib/db', () => ({
  getDb: () => mockSql,
}));

// Import after the mock is in place.
import { readFeaturedId, writeFeaturedId } from '@/lib/featuredHuntDb';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Helper: make mockSql behave as a tagged-template function that returns rows. */
function setupQuery(rows: Record<string, unknown>[]) {
  // The postgres client uses tagged-template literals: sql`SELECT ...`
  // Our mock needs to accept rest args (template strings + interpolations)
  // and return a Promise resolving to the rows array.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mockSql.mockImplementation((..._rest: unknown[]) => Promise.resolve(rows));
}

function setupQueryError(message: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mockSql.mockImplementation((..._rest: unknown[]) => Promise.reject(new Error(message)));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('featuredHuntDb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // readFeaturedId
  // -------------------------------------------------------------------------

  describe('readFeaturedId', () => {
    it('returns null when no row exists', async () => {
      setupQuery([]);
      const result = await readFeaturedId();
      expect(result).toBeNull();
    });

    it('returns null when value is NULL in the database', async () => {
      setupQuery([{ value: null }]);
      const result = await readFeaturedId();
      expect(result).toBeNull();
    });

    it('returns null when value is an empty string', async () => {
      setupQuery([{ value: '' }]);
      const result = await readFeaturedId();
      expect(result).toBeNull();
    });

    it('returns the parsed integer when value is a valid number string', async () => {
      setupQuery([{ value: '42' }]);
      const result = await readFeaturedId();
      expect(result).toBe(42);
    });

    it('returns null when value is a non-numeric string', async () => {
      setupQuery([{ value: 'not-a-number' }]);
      const result = await readFeaturedId();
      expect(result).toBeNull();
    });

    it('propagates database errors instead of swallowing them', async () => {
      setupQueryError('connection refused');
      await expect(readFeaturedId()).rejects.toThrow('connection refused');
    });
  });

  // -------------------------------------------------------------------------
  // writeFeaturedId
  // -------------------------------------------------------------------------

  describe('writeFeaturedId', () => {
    it('resolves without error when the upsert succeeds', async () => {
      setupQuery([]);
      await expect(writeFeaturedId(7)).resolves.toBeUndefined();
    });

    it('resolves without error when clearing (null) the featured hunt', async () => {
      setupQuery([]);
      await expect(writeFeaturedId(null)).resolves.toBeUndefined();
    });

    it('propagates database errors instead of swallowing them', async () => {
      setupQueryError('disk full');
      await expect(writeFeaturedId(1)).rejects.toThrow('disk full');
    });

    it('calls the sql function exactly once per write', async () => {
      setupQuery([]);
      await writeFeaturedId(99);
      expect(mockSql).toHaveBeenCalledTimes(1);
    });
  });
});
