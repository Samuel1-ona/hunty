import type { StoredHunt } from '@hunty/types';
import { buildClueZones, zoneColor } from '../lib/clueZones';

function makeHunt(overrides: Partial<StoredHunt> = {}): StoredHunt {
  return {
    id: 1,
    title: 'Test Hunt',
    description: 'A test hunt',
    cluesCount: 5,
    status: 'Active',
    rewardType: 'XLM',
    ...overrides,
  };
}

describe('buildClueZones', () => {
  it('returns empty array when there are no active hunts', () => {
    expect(buildClueZones([], 0, 0)).toEqual([]);
  });

  it('filters out non-Active hunts', () => {
    const hunts = [
      makeHunt({ id: 1, status: 'Active' }),
      makeHunt({ id: 2, status: 'Draft' }),
      makeHunt({ id: 3, status: 'Cancelled' }),
    ];
    const zones = buildClueZones(hunts, 0, 0);
    expect(zones).toHaveLength(1);
    expect(zones[0].huntId).toBe(1);
  });

  it('places zones around the player position', () => {
    const hunts = [makeHunt({ id: 1 })];
    const zones = buildClueZones(hunts, 40.0, -74.0);
    expect(zones).toHaveLength(1);
    expect(zones[0].latitude).toBeCloseTo(40.0, 3);
    expect(zones[0].longitude).toBeCloseTo(-74.0 + 0.005, 3);
  });

  it('spreads multiple zones at different angles', () => {
    const hunts = [makeHunt({ id: 1 }), makeHunt({ id: 2 }), makeHunt({ id: 3 })];
    const zones = buildClueZones(hunts, 0, 0);
    expect(zones).toHaveLength(3);

    const lats = zones.map((z) => z.latitude);
    const lngs = zones.map((z) => z.longitude);

    expect(new Set(lats).size).toBe(3);
    expect(new Set(lngs).size).toBe(3);
  });

  it('calculates radius based on cluesCount', () => {
    const hunts = [makeHunt({ id: 1, cluesCount: 10 })];
    const zones = buildClueZones(hunts, 0, 0);
    expect(zones[0].radius).toBe(150 + 10 * 20);
  });

  it('preserves title and rewardType from the hunt', () => {
    const hunts = [makeHunt({ id: 1, title: 'My Hunt', rewardType: 'NFT' })];
    const zones = buildClueZones(hunts, 0, 0);
    expect(zones[0].title).toBe('My Hunt');
    expect(zones[0].rewardType).toBe('NFT');
  });
});

describe('zoneColor', () => {
  it('returns blue for XLM', () => {
    expect(zoneColor('XLM')).toBe('#3b82f6');
  });

  it('returns purple for NFT', () => {
    expect(zoneColor('NFT')).toBe('#8b5cf6');
  });

  it('returns green for Both', () => {
    expect(zoneColor('Both')).toBe('#10b981');
  });
});
