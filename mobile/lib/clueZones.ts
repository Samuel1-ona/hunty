import type { StoredHunt } from '@lib/types';

export type ClueZone = {
  huntId: number;
  title: string;
  rewardType: StoredHunt['rewardType'];
  latitude: number;
  longitude: number;
  /** Approximate radius in metres */
  radius: number;
};

/**
 * Derive a stable geographic zone for each active hunt relative to the
 * player's current position. In production these coordinates would come
 * from the contract / backend; here we spread them around the player so
 * the map is always populated during development.
 */
export function buildClueZones(
  hunts: StoredHunt[],
  playerLat: number,
  playerLng: number
): ClueZone[] {
  const active = hunts.filter((h) => h.status === 'Active');
  const count = active.length;

  return active.map((hunt, i) => {
    // Spread zones evenly around the player in a ~500 m ring
    const angle = (2 * Math.PI * i) / Math.max(count, 1);
    const offsetDeg = 0.005; // ≈ 500 m
    return {
      huntId: hunt.id,
      title: hunt.title,
      rewardType: hunt.rewardType,
      latitude: playerLat + offsetDeg * Math.sin(angle),
      longitude: playerLng + offsetDeg * Math.cos(angle),
      radius: 150 + hunt.cluesCount * 20,
    };
  });
}

export function zoneColor(rewardType: StoredHunt['rewardType']): string {
  switch (rewardType) {
    case 'XLM':
      return '#3b82f6'; // blue
    case 'NFT':
      return '#8b5cf6'; // purple
    case 'Both':
      return '#10b981'; // green
  }
}
