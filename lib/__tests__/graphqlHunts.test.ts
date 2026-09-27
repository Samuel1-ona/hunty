import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mapHunt(raw: {
  id: number;
  title: string;
  description: string;
  cluesCount: number;
  status: string;
  rewardType: string;
}) {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    cluesCount: raw.cluesCount,
    status: raw.status,
    rewardType: raw.rewardType,
  };
}

async function fetchActiveHuntsFromIndexer(limit = 50) {
  const query = `query ActiveHunts`;
  const response = await fetch('https://indexer.hunty.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { first: limit } }),
  });
  if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(payload.errors[0].message);
  return payload.data.hunts.map(mapHunt);
}

describe('GraphQL hunts fetch', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('maps indexer hunts from GraphQL response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          hunts: [
            {
              id: 42,
              title: 'Graph Hunt',
              description: 'From indexer',
              cluesCount: 3,
              status: 'Active',
              rewardType: 'XLM',
            },
          ],
        },
      }),
    });

    const hunts = await fetchActiveHuntsFromIndexer();
    expect(hunts).toHaveLength(1);
    expect(hunts[0].title).toBe('Graph Hunt');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://indexer.hunty.app/graphql',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when GraphQL returns errors', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ errors: [{ message: 'Indexer unavailable' }] }),
    });

    await expect(fetchActiveHuntsFromIndexer()).rejects.toThrow('Indexer unavailable');
  });
});
