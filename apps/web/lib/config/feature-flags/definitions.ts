export type FeatureFlagValue = boolean | string | number;

export interface FeatureFlagDefinition<T extends FeatureFlagValue = boolean> {
  description: string;
  defaultValue: T;
  envVar?: string;
  environments?: Partial<Record<'development' | 'staging' | 'production', T>>;
}

export type FeatureFlagKey = keyof typeof FEATURE_FLAG_DEFINITIONS;

export type FeatureFlagMap = {
  [K in FeatureFlagKey]: (typeof FEATURE_FLAG_DEFINITIONS)[K] extends FeatureFlagDefinition<infer T>
    ? T
    : boolean;
};

export interface FeatureFlagOverride {
  value: FeatureFlagValue;
  source: 'env' | 'localStorage' | 'runtime' | 'api';
  expiresAt?: number;
}

export const FEATURE_FLAG_DEFINITIONS = {
  stagingBanner: {
    description: 'Show the staging environment banner on non-production environments',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_ENABLE_STAGING_BANNER',
    environments: { production: false },
  },
  nftMarketplace: {
    description: 'Enable the NFT marketplace view',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_NFT_MARKETPLACE',
  },
  huntChat: {
    description: 'Enable real-time chat in hunt rooms',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_HUNT_CHAT',
  },
  seasonalLeaderboard: {
    description: 'Enable seasonal leaderboard with season-based resets',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_SEASONAL',
  },
  dragDropClues: {
    description: 'Enable drag-and-drop clue reordering in the hunt wizard',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_DRAG_DROP',
  },
  advancedRewards: {
    description: 'Enable advanced reward configurations (token-gated, multi-tier)',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_ADVANCED_REWARDS',
  },
  gameModes: {
    description: 'Enable additional game modes (timed, competitive, collaborative)',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_GAME_MODES',
  },
  collaborativeHunts: {
    description: 'Enable collaborative (team-based) hunt mode',
    defaultValue: false,
    envVar: 'NEXT_PUBLIC_FEATURE_COLLABORATIVE_HUNTS',
  },
} as const satisfies Record<string, FeatureFlagDefinition>;
