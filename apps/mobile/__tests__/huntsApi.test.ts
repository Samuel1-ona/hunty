import { fetchActiveHuntsFromIndexer, fetchHuntByIdFromIndexer } from '@/lib/graphql/hunts';
import { getActiveHuntsForFeed, getHuntById } from '@store/huntStore';
import { getActiveHuntsNetworkFirst, getHuntNetworkFirst } from '@services/huntsApi';

jest.mock('@/lib/graphql/hunts');
jest.mock('@store/huntStore');

const mockHunts = [
  {
    id: 1,
    title: 'Hunt 1',
    status: 'Active' as const,
    rewardType: 'XLM' as const,
    cluesCount: 5,
    description: '',
  },
  {
    id: 2,
    title: 'Hunt 2',
    status: 'Active' as const,
    rewardType: 'NFT' as const,
    cluesCount: 3,
    description: '',
  },
];

describe('getActiveHuntsNetworkFirst', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns hunts from the indexer when available', async () => {
    (fetchActiveHuntsFromIndexer as jest.Mock).mockResolvedValue(mockHunts);

    const result = await getActiveHuntsNetworkFirst();
    expect(result).toEqual(mockHunts);
    expect(fetchActiveHuntsFromIndexer).toHaveBeenCalledTimes(1);
    expect(getActiveHuntsForFeed).not.toHaveBeenCalled();
  });

  it('falls back to local store when indexer returns empty', async () => {
    (fetchActiveHuntsFromIndexer as jest.Mock).mockResolvedValue([]);
    (getActiveHuntsForFeed as jest.Mock).mockResolvedValue(mockHunts);

    const result = await getActiveHuntsNetworkFirst();
    expect(result).toEqual(mockHunts);
    expect(getActiveHuntsForFeed).toHaveBeenCalledTimes(1);
  });

  it('falls back to local store when indexer throws', async () => {
    (fetchActiveHuntsFromIndexer as jest.Mock).mockRejectedValue(new Error('Network error'));
    (getActiveHuntsForFeed as jest.Mock).mockResolvedValue(mockHunts);

    const result = await getActiveHuntsNetworkFirst();
    expect(result).toEqual(mockHunts);
    expect(getActiveHuntsForFeed).toHaveBeenCalledTimes(1);
  });
});

describe('getHuntNetworkFirst', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the hunt from the indexer when found', async () => {
    const hunt = mockHunts[0];
    (fetchHuntByIdFromIndexer as jest.Mock).mockResolvedValue(hunt);

    const result = await getHuntNetworkFirst(1);
    expect(result).toEqual(hunt);
    expect(fetchHuntByIdFromIndexer).toHaveBeenCalledWith(1);
    expect(getHuntById).not.toHaveBeenCalled();
  });

  it('falls back to local store when indexer returns undefined', async () => {
    (fetchHuntByIdFromIndexer as jest.Mock).mockResolvedValue(undefined);
    (getHuntById as jest.Mock).mockResolvedValue(mockHunts[0]);

    const result = await getHuntNetworkFirst(1);
    expect(result).toEqual(mockHunts[0]);
    expect(getHuntById).toHaveBeenCalledWith(1);
  });

  it('falls back to local store when indexer throws', async () => {
    (fetchHuntByIdFromIndexer as jest.Mock).mockRejectedValue(new Error('Network error'));
    (getHuntById as jest.Mock).mockResolvedValue(mockHunts[0]);

    const result = await getHuntNetworkFirst(1);
    expect(result).toEqual(mockHunts[0]);
    expect(getHuntById).toHaveBeenCalledWith(1);
  });
});
