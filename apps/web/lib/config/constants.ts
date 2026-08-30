/**
 * Centralized constants and configuration for the Hunty application.
 *
 * All magic numbers, limits, and tunable values live here — import from
 * `@/lib/config/constants` instead of hardcoding values in components or
 * API routes. Every constant is typed and documented so it can be safely
 * referenced across client and server code.
 */

// ─── Hunt Limits ────────────────────────────────────────────────────────────

export const HUNT_LIMITS = {
  /** Maximum number of clues allowed per hunt. */
  MAX_CLUES: 50,
  /** Minimum number of clues required to activate a hunt. */
  MIN_CLUES: 1,
  /** Maximum number of players that can register for a hunt (0 = unlimited). */
  MAX_PLAYERS_DEFAULT: 0,
  /** Minimum point value per clue. */
  MIN_POINTS: 1,
  /** Maximum point value per clue. */
  MAX_POINTS: 1000,
  /** Maximum hint cost (in points) for a clue. */
  MAX_HINT_COST: 500,
  /** Maximum length of a hunt title. */
  MAX_TITLE_LENGTH: 120,
  /** Maximum length of a hunt description. */
  MAX_DESCRIPTION_LENGTH: 500,
  /** Maximum length of a clue question. */
  MAX_QUESTION_LENGTH: 500,
  /** Maximum length of a clue answer. */
  MAX_ANSWER_LENGTH: 200,
  /** Maximum length of a hint text. */
  MAX_HINT_LENGTH: 300,
} as const

// ─── Time Limits ────────────────────────────────────────────────────────────

export const TIME_LIMITS = {
  /** Default hunt duration in seconds (7 days). */
  DEFAULT_HUNT_DURATION_S: 7 * 24 * 60 * 60,
  /** Minimum hunt duration in seconds (1 hour). */
  MIN_HUNT_DURATION_S: 60 * 60,
  /** Maximum hunt duration in seconds (90 days). */
  MAX_HUNT_DURATION_S: 90 * 24 * 60 * 60,
  /** Minimum time between clue answer submissions per wallet (ms). */
  MIN_SUBMISSION_INTERVAL_MS: 5_000,
} as const

// ─── Blockchain Constants ───────────────────────────────────────────────────

export const BLOCKCHAIN = {
  /** Soroban testnet RPC URL. */
  TESTNET_RPC_URL: "https://soroban-testnet.stellar.org",
  /** Soroban mainnet RPC URL. */
  MAINNET_RPC_URL: "https://soroban-mainnet.stellar.org",
  /** Stellar testnet network passphrase. */
  TESTNET_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
  /** Stellar mainnet network passphrase. */
  MAINNET_NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015",
  /** Stellar Expert explorer base URL. */
  STELLAR_EXPLORER_BASE_URL: "https://stellar.expert/explorer",
} as const

/** Environment variable names for contract addresses. */
export const CONTRACT_ENV_VARS = {
  HUNTY_CORE: "NEXT_PUBLIC_HUNTY_CORE_ADDRESS",
  REWARD_MANAGER: "NEXT_PUBLIC_REWARD_MANAGER_ADDRESS",
  NFT_REWARD: "NEXT_PUBLIC_NFT_REWARD_ADDRESS",
} as const

// ─── UI Constants ───────────────────────────────────────────────────────────

export const UI = {
  /** Page transition duration in seconds. */
  PAGE_TRANSITION_DURATION_S: 0.3,
  /** Card hover animation duration in seconds. */
  CARD_HOVER_DURATION_S: 0.2,
  /** Toast notification auto-dismiss duration in milliseconds. */
  TOAST_DURATION_MS: 5_000,
  /** Debounce delay for search inputs (ms). */
  SEARCH_DEBOUNCE_MS: 300,
  /** Maximum number of hunt cards displayed per page in the arcade. */
  ARCADE_PAGE_SIZE: 12,
  /** Maximum number of leaderboard entries displayed. */
  LEADERBOARD_PAGE_SIZE: 50,
} as const

/** Tailwind CSS breakpoint values (px). */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

// ─── Player Count ───────────────────────────────────────────────────────────

export const PLAYER_COUNT = {
  /** Player count above which a hunt shows the Trending badge. */
  TRENDING_THRESHOLD: 50,
  /** How long a fetched player count is considered fresh (ms). */
  CACHE_TTL_MS: 60_000,
} as const

// ─── API Rate Limiting ──────────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** Default window for rate limiting (ms). */
  DEFAULT_WINDOW_MS: 60_000,
  /** Read endpoint: requests per window per IP. */
  READ_IP_LIMIT: 100,
  /** Write endpoint: requests per window per IP. */
  WRITE_IP_LIMIT: 30,
  /** Read endpoint: requests per window per wallet. */
  READ_WALLET_LIMIT: 200,
  /** Write endpoint: requests per window per wallet. */
  WRITE_WALLET_LIMIT: 50,
  /** Admin endpoint: requests per window per IP. */
  ADMIN_IP_LIMIT: 20,
} as const

// ─── API Body Size Limits ───────────────────────────────────────────────────

export const BODY_SIZE_LIMITS = {
  /** Default maximum request body size in bytes (1MB). */
  DEFAULT_MAX_BODY_SIZE_BYTES: 1024 * 1024, // 1,048,576 bytes
} as const

// ─── Feature Flags ──────────────────────────────────────────────────────────

/**
 * Feature flags for progressive rollout.
 *
 * Each flag is driven by an environment variable of the form
 * `NEXT_PUBLIC_FEATURE_<NAME>`. Set the env var to `"true"` to enable
 * the feature. All flags default to `false` when unset.
 *
 * @deprecated Use the type-safe feature flag system from `@/lib/config/feature-flags`
 * instead. The new system supports runtime overrides, server-side evaluation,
 * environment-based overrides, and a React provider/hooks API.
 * See `lib/config/feature-flags/definitions.ts` for the canonical flag registry.
 */
export const FEATURE_FLAGS = {
  /** Show the staging banner on non-production environments. */
  STAGING_BANNER: process.env.NEXT_PUBLIC_ENABLE_STAGING_BANNER === "true",
  /** Enable the NFT marketplace view. */
  NFT_MARKETPLACE: process.env.NEXT_PUBLIC_FEATURE_NFT_MARKETPLACE === "true",
  /** Enable real-time chat in hunt rooms. */
  HUNT_CHAT: process.env.NEXT_PUBLIC_FEATURE_HUNT_CHAT === "true",
  /** Enable seasonal leaderboard. */
  SEASONAL_LEADERBOARD: process.env.NEXT_PUBLIC_FEATURE_SEASONAL === "true",
  /** Enable drag-and-drop clue reordering in the hunt wizard. */
  DRAG_DROP_CLUES: process.env.NEXT_PUBLIC_FEATURE_DRAG_DROP === "true",
} as const

/** @deprecated Use `FeatureFlagKey` from `@/lib/config/feature-flags` instead. */
export type FeatureFlag = keyof typeof FEATURE_FLAGS

// ─── Anti-Cheat Defaults ────────────────────────────────────────────────────

export const ANTI_CHEAT = {
  /** Maximum submissions allowed per wallet per submission window. */
  MAX_SUBMISSIONS_PER_WINDOW: 10,
  /** Submission window duration (ms). */
  SUBMISSION_WINDOW_MS: 60_000,
  /** Minimum interval between submissions for the same clue (ms). */
  MIN_CLUE_INTERVAL_MS: 5_000,
  /** Threshold for flagging rapid successive submissions. */
  RAPID_SUBMISSION_THRESHOLD: 3,
} as const
