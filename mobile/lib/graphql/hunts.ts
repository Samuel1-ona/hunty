import type { HuntStatus, StoredHunt } from '@lib/types';
import { graphqlRequest } from './client';
import { ACTIVE_HUNTS_QUERY, HUNT_BY_ID_QUERY } from './queries';

type GraphQLHunt = {
  id: number;
  title: string;
  description: string;
  cluesCount: number;
  status: string;
  rewardType: string;
  startTime?: number;
  endTime?: number;
  coverImageCid?: string;
  isPrivate?: boolean;
};

function mapHunt(raw: GraphQLHunt): StoredHunt {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    cluesCount: raw.cluesCount,
    status: raw.status as HuntStatus,
    rewardType: raw.rewardType as StoredHunt['rewardType'],
    startTime: raw.startTime,
    endTime: raw.endTime,
    coverImageCid: raw.coverImageCid,
    is_private: raw.isPrivate,
  };
}

export async function fetchActiveHuntsFromIndexer(limit = 50): Promise<StoredHunt[]> {
  const data = await graphqlRequest<{ hunts: GraphQLHunt[] }>(ACTIVE_HUNTS_QUERY, {
    first: limit,
  });
  return data.hunts.map(mapHunt);
}

export async function fetchHuntByIdFromIndexer(id: number): Promise<StoredHunt | undefined> {
  const data = await graphqlRequest<{ hunt: GraphQLHunt | null }>(HUNT_BY_ID_QUERY, { id });
  return data.hunt ? mapHunt(data.hunt) : undefined;
}
