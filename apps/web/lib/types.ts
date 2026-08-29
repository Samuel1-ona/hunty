/**
 * Central type definitions for the Hunty application.
 *
 * Platform-agnostic domain types (Hunt, Clue, Player, Reward, Achievement)
 * live in the shared `@hunty/types` package and are re-exported here so that
 * existing `@/lib/types` imports keep working. Web-only and React-coupled
 * types (display entries, performance, chat, …) remain defined below.
 */

import type { HuntCategory as DomainHuntCategory, HuntInvite, PlayerProgress, Reward as DomainReward } from "@hunty/types";
import type { ReactNode } from "react";

import type { HuntCategoryId } from "./categories";
import type { CollaboratorRole, HuntCollaborator } from "./collaboration";
import type { AnswerStrictness } from "./fuzzyAnswer";
import type { ClueScoringBreakdown, HuntScoringBreakdown, ScoringWeights } from "./scoring";

// ─── Shared domain types (single source of truth: @hunty/types) ──────────────

export interface HuntReview {
  id: string;
  huntId: number;
  playerAddress: string;
  rating: number; // 1 to 5
  text?: string;
  difficultyRating?: HuntDifficulty | "";
  createdAt: number;
  moderated?: boolean;
  flagged?: boolean;
  upvotes?: number;
  upvotedBy?: string[];
}

export type HuntStatus =
  | "Active"
  | "Completed"
  | "Draft"
  | "Cancelled"
  | "PendingReview"
  | "scheduled"
  | "active"
  | "ended";

/**
 * Hunt-level difficulty rating set by the creator so players can gauge
 * challenge before joining. Independent of `ClueDifficulty` which rates
 * individual clues. Older hunts without a difficulty field render as
 * unrated (no badge).
 */
export type HuntDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

export type HuntAgeClassification = "all-ages" | "13-plus" | "16-plus" | "18-plus";

export interface StoredHunt {
  id: number;
  title: string;
  description: string;
  cluesCount: number;
  /** Broad hunt category used in discovery filters. */
  category?: DomainHuntCategory | HuntCategoryId;
  /** Overall hunt difficulty tag used in discovery filters. */
  difficulty?: HuntDifficulty;
  /** Age suitability selected by the creator. Older hunts default to all ages. */
  ageClassification?: HuntAgeClassification;
  status: HuntStatus;
  rewardType: "XLM" | "NFT" | "Both";
  /** When true, players must solve clues in order. */
  sequential?: boolean;
  /** Total reward pool value used for creator-side sorting. */
  rewardPool?: number;
  /** Per-place XLM reward buckets funded by the creator. */
  rewards?: Reward[];
  /** Reward distribution plan for the pool. */
  rewardDistribution?: Reward[];
  /** Current balance in the reward pool. */
  poolBalance?: number;
  /** Low balance threshold for the pool. */
  poolLowBalanceThreshold?: number;
  /** Escrow transaction hash proving the creator funded the XLM reward pool. */
  rewardEscrowTxHash?: string;
  /** Amount still available in the XLM escrow. */
  rewardEscrowBalance?: number;
  /** Creator-side participant count snapshot for dashboard sorting. */
  playerCount?: number;
  /** Max number of participants for limited spots. */
  maxParticipants?: number;
  /** @deprecated Use `maxParticipants`. Kept for older stored hunts. */
  maxCapacity?: number;
  /** Unix timestamp in seconds when the hunt draft was created locally. */
  createdAt?: number;
  /** Unix timestamp in seconds — when the hunt starts. */
  startTime?: number;
  /** Unix timestamp in seconds — when the hunt ends. */
  endTime?: number;
  /** Canonical UTC timestamp for scheduled lifecycle transitions. */
  startAt?: number;
  /** Canonical UTC timestamp for scheduled lifecycle transitions. */
  endAt?: number;
  /** Seconds after the hunt ends before unclaimed rewards can be reclaimed. */
  gracePeriodSeconds?: number;
  creatorEmail?: string;
  emailNotifications?: boolean;
  /** When true, the hunt is hidden from the public arcade grid. */
  is_private?: boolean;
  /** The active private-hunt invite. Replaced on regeneration and removed on revoke. */
  invite?: HuntInvite;
  /** Optional game cover CID/URL for hunt cards and sharing previews. */
  coverImageCid?: string;
  /** Optional map latitude for spatial discovery views. */
  mapLatitude?: number;
  /** Optional map longitude for spatial discovery views. */
  mapLongitude?: number;
  /** Active editorial banner showcase at the top of the Arcade. */
  isFeaturedOfWeek?: boolean;
  /** Unix timestamp in seconds until a paid spotlight placement remains active. */
  promotedUntil?: number;
  /** Creator's wallet public key. */
  creator?: string;
  /** Average user rating (1-5). */
  averageRating?: number;
  /** Average user difficulty rating (1-4). */
  averageDifficulty?: number;
  /** Number of user reviews. */
  reviewCount?: number;
  /** When true, the hunt is archived (hidden from public but data preserved). */
  isArchived?: boolean;
  /** Unix timestamp in seconds when the hunt was soft-deleted. */
  deletedAt?: number;
  /** Recovery window in seconds (default: 30 days = 2592000 seconds). */
  recoveryWindow?: number;
  /** Free-form discovery tags (normalized kebab-case). */
  tags?: string[];
  /** Primary owner wallet (Stellar G-address). */
  ownerAddress?: string;
  /** Collaborators snapshot (authoritative list may live in collaboration store). */
  collaborators?: HuntCollaborator[];
}

export type HuntInfo = {
  id: number;
  title: string;
  description: string;
  totalClues: number;
  status: string;
  sequential?: boolean;
  startTime?: number;
  endTime?: number;
  creatorEmail?: string;
  emailNotifications?: boolean;
  difficulty?: HuntDifficulty;
};

// ─── Clue ────────────────────────────────────────────────────────────────────

export type ClueDifficulty = "Easy" | "Medium" | "Hard";

/**
 * A single progressive hint entry. Creators can define up to 3 hints per clue.
 * Each hint is revealed in order and may carry an optional score penalty and
 * a minimum delay (in seconds) that must elapse after the previous hint before
 * this one can be revealed.
 */
export interface ClueHint {
  /** The hint text shown to the player. */
  text: string;
  /** Points deducted from the clue score when this hint is revealed. */
  penalty: number;
  /** Seconds the player must wait after the previous hint before revealing this one. */
  delaySeconds: number;
}

export interface Clue {
  id: number;
  huntId: number;
  question: string;
  answer: string;
  points: number;
  /** Optional locale-specific question strings. The base `question` remains the fallback. */
  questionTranslations?: Partial<Record<string, string>>;
  /** Optional locale-specific hint strings. The base `hint` remains the fallback. */
  hintTranslations?: Partial<Record<string, string>>;
  /**
   * Progressive hints array (up to 3). Takes precedence over the legacy
   * `hint` / `hintCost` fields when present.
   */
  hints?: ClueHint[];
  /** @deprecated Use `hints[0]` instead. Kept for backwards compatibility. */
  hint?: string;
  /** @deprecated Use `hints[0].penalty` instead. Kept for backwards compatibility. */
  hintCost?: number;
  /** Optional difficulty tag set by the creator. */
  difficulty?: ClueDifficulty;
  /** Center latitude for the clue's answer geofence. */
  latitude?: number;
  /** Center longitude for the clue's answer geofence. */
  longitude?: number;
  /** Allowed distance from the clue center in metres. Defaults to 100m. */
  geofenceRadiusMeters?: number;
  /** Creator-specified accepted alternative answers (plaintext). */
  alternativeAnswers?: string[];
  /** Fuzzy matching strictness for this clue. Defaults to "normal". */
  answerStrictness?: AnswerStrictness;
  /** Optional IPFS media reference, optionally tagged with a type query param. */
  mediaCid?: string;
  /** Optional A/B variants. When present, players may be assigned to A or B. */
  variants?: {
    A?: {
      question?: string;
      answer: string;
      alternativeAnswers?: string[];
      answerStrictness?: AnswerStrictness;
      hints?: ClueHint[];
    };
    B?: {
      question?: string;
      answer: string;
      alternativeAnswers?: string[];
      answerStrictness?: AnswerStrictness;
      hints?: ClueHint[];
    };
  };
}

export type ClueInfo = {
  id: number;
  question: string;
  points: number;
  /** Optional locale-specific question strings. */
  questionTranslations?: Partial<Record<string, string>>;
  /** Optional locale-specific hint strings. */
  hintTranslations?: Partial<Record<string, string>>;
  /** Progressive hints (up to 3). Supersedes the legacy `hint`/`hintCost` fields. */
  hints?: ClueHint[];
  /** @deprecated Use `hints[0]` instead. */
  hint?: string;
  /** @deprecated Use `hints[0].penalty` instead. */
  hintCost?: number;
  difficulty?: ClueDifficulty;
};

export interface ClueRow {
  id: number;
  question: string;
  answer: string;
  points: number;
  questionTranslations?: Partial<Record<string, string>>;
  hintTranslations?: Partial<Record<string, string>>;
  hints?: ClueHint[];
  /** @deprecated */
  hint?: string;
  /** @deprecated */
  hintCost?: number;
  difficulty?: ClueDifficulty;
  alternativeAnswers?: string[];
  answerStrictness?: AnswerStrictness;
  /** Optional IPFS media reference, optionally tagged with a type query param. */
  mediaCid?: string;
}
export type {
  Achievement,
  AchievementId,
  AchievementRarity,
  HuntCategory,
  HuntProgressStatus,
  HuntInvite,
  PlayerHuntProgress,
  PlayerProgress,
  RewardHistoryEntry,
  RewardHistoryType,
  RewardReceipt,
  RewardReceiptType,
  RewardType,
  SponsorContribution,
} from "@hunty/types";

export type { AnswerStrictness, CollaboratorRole, HuntCategoryId };

// ─── Transaction Results ─────────────────────────────────────────────────────

export type CreateHuntResult = {
  txHash: string;
};

export type ClaimRewardResult = {
  txHash: string;
  /** ipfs:// URI for the SEP-0039 compliant metadata JSON uploaded before minting. */
  metadataUri: string;
};

export type SubmitAnswerResult = {
  txHash: string;
  /** The contract event emitted on success. */
  event: "ClueCompleted";
};

export type ActivateHuntResult = {
  txHash: string;
};

export type AddClueResult = {
  txHash: string;
};

export type ExtendHuntResult = {
  txHash: string;
  newEndTime: number;
};

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardTimePeriod = "today" | "week" | "month" | "all";
export type LeaderboardMetric = "points" | "completions";

export type LeaderboardEntry = {
  address: string;
  name?: string;
  points: number;
  completionCount?: number;
  completedAt?: number;
  category?: string;
  difficulty?: ClueDifficulty;
};

export interface LeaderboardFilters {
  timePeriod: LeaderboardTimePeriod;
  category: string;
  difficulty: ClueDifficulty | "all";
  metric: LeaderboardMetric;
}

export type FastestPlayerEntry = {
  address: string;
  name?: string;
  points?: number;
  completionTimeSeconds: number;
};

export interface LeaderboardDisplayEntry {
  position: number;
  name: string;
  points: number;
  icon: ReactNode;
  completionCount?: number;
  completedAt?: number;
  category?: string;
  difficulty?: ClueDifficulty;
  /** Full Stellar address for this row, when known. Drives the identicon, copy button, and explorer link. */
  address?: string;
  /** True when `name` is a player-chosen display name rather than a truncated address. */
  hasDisplayName?: boolean;
}

export interface FastestPlayerDisplayEntry {
  position: number;
  name: string;
  completionTimeLabel: string;
  points?: number;
  icon: ReactNode;
}

// ─── Registration (PlayerProgress lives in @hunty/types) ─────────────────────

export type RegistrationStatus = {
  isRegistered: boolean;
  progressData?: PlayerProgress;
  loading: boolean;
  error?: string;
};

export type RegistrationResult = {
  success: boolean;
  error?: string;
  transactionHash?: string;
};

export type HuntAttemptStatus = "completed" | "abandoned" | "in_progress";

export interface ClueAttemptRecord {
  clueId: number;
  clueIndex: number;
  question: string;
  answerGiven: string;
  timeTakenSeconds: number;
  pointsEarned: number;
  answeredAt: string;
  hintsUsed: number; // Number of hints used for this clue
  scoringBreakdown?: ClueScoringBreakdown; // Detailed scoring breakdown
}

export interface HuntAttemptRecord {
  id: string;
  huntId: number;
  huntTitle: string;
  playerAddress: string;
  status: HuntAttemptStatus;
  startedAt: string;
  completedAt?: string;
  totalTimeSeconds: number;
  totalPoints: number;
  clues: ClueAttemptRecord[];
  attemptNumber: number;
  currentStreak: number; // Current consecutive clues solved streak
  scoringWeights?: ScoringWeights; // Scoring weights used for this attempt
  scoringBreakdown?: HuntScoringBreakdown; // Detailed scoring breakdown for the entire attempt
  isFirstToComplete?: boolean; // Whether this was the first completion of the hunt
}

export interface HuntAttemptTimeComparison {
  playerTimeSeconds: number;
  playerTimeLabel: string;
  fastestTimeSeconds: number | null;
  fastestTimeLabel: string | null;
  averageTimeSeconds: number | null;
  averageTimeLabel: string | null;
  rankAmongFastest: number | null;
  totalComparedPlayers: number;
}

// ─── Reward (web view) ───────────────────────────────────────────────────────

/**
 * Web-facing reward bucket. Extends the shared domain {@link DomainReward}
 * with an optional rendered icon node used by the reward panels. The plain
 * `{ place, amount }` domain shape (and the receipt/history types) live in
 * `@hunty/types`.
 */
export interface Reward extends DomainReward {
  icon?: ReactNode;
}

export interface RewardPlayerProgress {
  is_completed: boolean;
  reward_claimed: boolean;
  hunt_id?: number | string;
  reward_amount?: number;
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

export type ActivityEventType = "HuntCompleted" | "ClueCompleted" | "HuntSponsored";

export interface ActivityEvent {
  id: string;
  /** Full Stellar G-address of the participant */
  address: string;
  /** Optional display name resolved from the player's profile */
  displayName?: string;
  huntTitle: string;
  huntId: number;
  timestamp: number;
  type: ActivityEventType;
  /** Amount for sponsored events */
  amount?: number;
}

// ─── Component-level Hunt (used by PlayGame, HuntForm, GamePreview, HuntCards) ─

export interface HuntCard {
  id: number;
  title?: string;
  description?: string;
  link?: string;
  code?: string;
  image?: string;
  /** Progressive hints (up to 3). Supersedes `hint`/`hintCost` when present. */
  hints?: ClueHint[];
  /** @deprecated Use `hints[0]` instead. */
  hint?: string;
  /** @deprecated Use `hints[0].penalty` instead. */
  hintCost?: number;
  points?: number;
  /**
   * Hunt-level difficulty rating surfaced as a badge on the card.
   * HuntCards historically also accepts legacy ClueDifficulty values
   * (passed in from individual clue views), so both are allowed here.
   */
  difficulty?: HuntDifficulty | ClueDifficulty;
  /** Optional IPFS media reference, optionally tagged with a type query param. */
  mediaCid?: string;
}

// HuntDraft and PlayerStats now live in @hunty/types (re-exported above).
export interface HuntDraft {
  id: number;
  title: string;
  description: string;
  link: string;
  code: string;
  image?: string;
  sequential?: boolean;
  maxParticipants?: number;
  ageClassification?: HuntAgeClassification;
}

/**
 * Persisted auto-save snapshot for a hunt creation session.
 * Stored in localStorage keyed by `draftId`, and optionally synced to the
 * cloud for logged-in users.
 */
export interface HuntDraftSave {
  /** Unique identifier for this draft save (UUID). */
  draftId: string;
  /** Human-readable label – defaults to gameName or "Untitled Draft". */
  label: string;
  /** ISO-8601 timestamp of when this snapshot was last written. */
  savedAt: string;
  /** The individual hunt clue cards in this draft. */
  hunts: HuntDraft[];
  /** Game-level metadata. */
  meta: {
    gameName: string;
    startDate: string;
    endDate: string;
    rewardType: "XLM" | "NFT" | "Both";
    sequential: boolean;
    isPrivate: boolean;
    timerEnabled: boolean;
    creatorEmail: string;
    emailNotifications: boolean;
  };
  /** Reward buckets. */
  rewards: Array<{ place: number; amount: number }>;
  /**
   * Whether the draft has been recovered into the editor.
   * Prevents the recovery prompt from showing again for the same draft.
   */
  recovered?: boolean;
}

export interface PlayerStats {
  address: string;
  totalHuntsCompleted: number;
  totalPointsEarned: number;
  totalNftsReceived: number;
  totalCompletionTimeSeconds: number;
  completedHuntsTracked: number;
  averageCompletionTimeSeconds: number;
  lastUpdated: number;
}

export type CoverImageUploadState = "idle" | "uploading" | "succeeded" | "failed";

export interface PlayerProfile {
  address: string
  displayName?: string
  avatarUrl?: string
}

export interface ReferralRecord {
  code: string
  referrerAddress: string
  referredAddress: string
  registeredAt: number
  firstCompletedAt?: number
  firstCompletedHuntId?: number
  bonusAwarded: boolean
  bonusPoints: number
}

export interface ReferralStats {
  code: string
  totalInvites: number
  successfulReferrals: number
  pendingReferrals: number
  bonusPoints: number
  referralLink: string
  referrals: ReferralRecord[]
}

// ─── Referral Leaderboard ─────────────────────────────────────────────────────

export type ReferralLeaderboardPeriod = "all" | "week" | "month"

export type ReferralPayoutStatus = "pending" | "processing" | "paid" | "failed"

/** A single row in the referral leaderboard. */
export interface ReferralLeaderboardEntry {
  /** 1-based rank using standard competition ranking (ties share a rank). */
  rank: number
  /** Stellar G-address of the referrer. */
  referrerAddress: string
  /** Optional resolved display name. */
  displayName?: string
  /** Number of referred players who completed at least one hunt. */
  successfulReferrals: number
  /** Total number of referred players (including pending). */
  totalInvites: number
  /** Accumulated bonus points awarded to this referrer. */
  bonusPoints: number
  /** Unix timestamp (ms) of the most recent referral activity. */
  lastActiveAt: number
  /** Payout status for this period. */
  rewardPayoutStatus?: ReferralPayoutStatus
  /** Reward amount pending or paid out. */
  rewardAmount?: number
}

/** Aggregate stats describing the referral leaderboard. */
export interface ReferralLeaderboardStats {
  totalReferrers: number
  totalSuccessfulReferrals: number
  totalBonusDistributed: number
  /** XLM amount in the active referral reward pool. */
  activeRewardPool: number
}

/** A processed reward payout record for a top referrer. */
export interface ReferralPayoutRecord {
  /** Unique payout ID. */
  id: string
  /** Period this payout covers. */
  period: "weekly" | "monthly" | "seasonal" | "manual"
  /** Stellar G-address of the rewarded referrer. */
  referrerAddress: string
  /** Final rank position used to determine this reward. */
  rank: number
  /** Amount awarded. */
  rewardAmount: number
  /** Reward type. */
  rewardType: "xlm" | "points"
  /** Current status of the payout. */
  status: ReferralPayoutStatus
  /** Unix timestamp (ms) when the payout was created. */
  createdAt: number
  /** Unix timestamp (ms) when the payout was executed. null until processed. */
  processedAt?: number
  /** Optional transaction hash if paid via XLM. */
  txHash?: string
}


// ─── Player Count ────────────────────────────────────────────────────────────

/**
 * Player count above which a hunt is considered "Trending".
 * @deprecated Import from `@/lib/config/constants` instead: `PLAYER_COUNT.TRENDING_THRESHOLD`
 */
export const TRENDING_PLAYER_THRESHOLD = 50;

/**
 * How long a fetched player count is considered fresh (ms).
 * @deprecated Import from `@/lib/config/constants` instead: `PLAYER_COUNT.CACHE_TTL_MS`
 */
export const PLAYER_COUNT_CACHE_TTL_MS = 60_000;

export interface PlayerCountResult {
  huntId: string;
  count: number;
  /**
   * `true` when `count >= TRENDING_PLAYER_THRESHOLD`.
   *
   * Computed at fetch time and cached alongside the count, so the badge
   * reflects the same snapshot as the displayed number. Re-evaluated on
   * every cache miss (stale or absent entry).
   */
  isTrending: boolean;
  fetchedAt: number; // Date.now() at time of fetch
  isLoading: boolean;
  error: string | null;
}

// ─── Profile Dashboard Types ───────────────────────────────────────────────────
// HuntProgressStatus and PlayerHuntProgress now live in @hunty/types.

export interface NftAttribute {
  trait_type: string;
  value: string | number;
}

export interface NftRewardDetail {
  id: number;
  name: string;
  description?: string;
  imageUri: string;
  earnedAt: string;
  claimed: boolean;
  huntName?: string;
  attributes?: NftAttribute[];
  /** ipfs:// URI pointing to the SEP-0039 metadata JSON file for this NFT. */
  metadataUri?: string;
}

export interface ProfileSummary {
  totalHunts: number;
  completedHunts: number;
  inProgressHunts: number;
  totalPoints: number;
  completionRate: number;
  totalNftRewards: number;
  claimedNftRewards: number;
  unclaimedNftRewards: number;
}

// ─── Seasonal Leaderboard ───────────────────────────────────────────────────

export type SeasonStatus = "Upcoming" | "Active" | "Ended";

export interface Season {
  id: number;
  name: string;
  /** Unix timestamp in seconds — when the season starts. */
  startTime: number;
  /** Unix timestamp in seconds — when the season ends. */
  endTime: number;
  status: SeasonStatus;
  /** Reward amounts for the top N players, indexed by place (1st, 2nd, ...). */
  rewards?: Reward[];
}

export interface SeasonLeaderboardEntry {
  address: string;
  name?: string;
  points: number;
  /** Final rank for this player at season end (set once archived). */
  rank?: number;
}

export interface ArchivedSeason {
  season: Season;
  finalLeaderboard: SeasonLeaderboardEntry[];
  archivedAt: number;
}

export interface SeasonBadge {
  seasonId: number;
  seasonName: string;
  /** Final rank the player achieved, if the season has ended. */
  rank?: number;
  earnedAt: number;
}

// ─── Hunt Feed ───────────────────────────────────────────────────────────────

export type HuntFeedCategory = "trending" | "new" | "nearby" | "featured" | "following"


// ─── Core Web Vitals ────────────────────────────────────────────────────────────

export type WebVitalMetric = "LCP" | "FID" | "CLS" | "TTFB" | "INP" | "FCP";

export interface PerformanceMetric {
  name: WebVitalMetric;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  url: string;
}

export interface PerformanceBudget {
  name: WebVitalMetric;
  good: number;
  poor: number;
}

export interface PerformanceReportEntry {
  id: string;
  metrics: PerformanceMetric[];
  timestamp: number;
  url: string;
  userAgent: string;
}

export interface PerformanceAlert {
  metric: WebVitalMetric;
  value: number;
  threshold: number;
  timestamp: number;
  url: string;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  huntId: number;
  senderAddress: string;
  senderName?: string;
  content: string;
  timestamp: number;
  isDeleted?: boolean;
}

export interface ChatSettings {
  huntId: number;
  isChatEnabled: boolean;
  creatorAddress?: string;
  mutedAddresses: string[];
}

export interface ReportedMessage {
  id: string;
  messageId: string;
  huntId: number;
  reportedBy: string;
  reason: string;
  timestamp: number;
}

// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  id: string;
  huntId: number;
  playerAddress: string;
  playerName?: string;
  timestamp: number;
  isNotified?: boolean;
}

export interface HuntRegistrationStatus {
  isRegistered: boolean;
  isWaitlisted: boolean;
  waitlistPosition?: number;
  progressData?: PlayerProgress;
  loading: boolean;
  error?: string;
}
