/**
 * Central type definitions for the Hunty application.
 * All shared interfaces and types live here — import from "@/lib/types".
 */

import type { ReactNode } from "react"

// ─── Hunt ────────────────────────────────────────────────────────────────────

export type HuntStatus = "Active" | "Completed" | "Draft" | "Cancelled"

export interface StoredHunt {
  id: number
  title: string
  description: string
  cluesCount: number
  status: HuntStatus
  rewardType: "XLM" | "NFT" | "Both"
  /** Total reward pool value used for creator-side sorting. */
  rewardPool?: number
  /** Per-place XLM reward buckets funded by the creator. */
  rewards?: Reward[]
  /** Escrow transaction hash proving the creator funded the XLM reward pool. */
  rewardEscrowTxHash?: string
  /** Amount still available in the XLM escrow. */
  rewardEscrowBalance?: number
  /** Creator-side participant count snapshot for dashboard sorting. */
  playerCount?: number
  /** Unix timestamp in seconds when the hunt draft was created locally. */
  createdAt?: number
  /** Unix timestamp in seconds — when the hunt starts. */
  startTime?: number
  /** Unix timestamp in seconds — when the hunt ends. */
  endTime?: number
  creatorEmail?: string
  emailNotifications?: boolean
  /** When true, the hunt is hidden from the public arcade grid. */
  is_private?: boolean
  /** Optional game cover CID/URL for hunt cards and sharing previews. */
  coverImageCid?: string
  /** Active editorial banner showcase at the top of the Arcade. */
  isFeaturedOfWeek?: boolean
}

export type HuntInfo = {
  id: number
  title: string
  description: string
  totalClues: number
  status: string
  startTime?: number
  endTime?: number
  creatorEmail?: string
  emailNotifications?: boolean
}

// ─── Clue ────────────────────────────────────────────────────────────────────

export type ClueDifficulty = "Easy" | "Medium" | "Hard"

export interface Clue {
  id: number
  huntId: number
  question: string
  answer: string
  points: number
  hint?: string
  hintCost?: number
  /** Optional difficulty tag set by the creator. */
  difficulty?: ClueDifficulty
  /** Center latitude for the clue's answer geofence. */
  latitude?: number
  /** Center longitude for the clue's answer geofence. */
  longitude?: number
  /** Allowed distance from the clue center in metres. Defaults to 100m. */
  geofenceRadiusMeters?: number
}

export type ClueInfo = {
  id: number
  question: string
  points: number
  hint?: string
  hintCost?: number
  difficulty?: ClueDifficulty
}

export interface ClueRow {
  id: number
  question: string
  answer: string
  points: number
  hint?: string
  hintCost?: number
  difficulty?: ClueDifficulty
}

// ─── Transaction Results ─────────────────────────────────────────────────────

export type CreateHuntResult = {
  txHash: string
}

export type ClaimRewardResult = {
  txHash: string
  /** ipfs:// URI for the SEP-0039 compliant metadata JSON uploaded before minting. */
  metadataUri: string
}

export type SubmitAnswerResult = {
  txHash: string
  /** The contract event emitted on success. */
  event: "ClueCompleted"
}

export type ActivateHuntResult = {
  txHash: string
}

export type AddClueResult = {
  txHash: string
}

export type ExtendHuntResult = {
  txHash: string
  newEndTime: number
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export type LeaderboardEntry = {
  address: string
  name?: string
  points: number
}

export type FastestPlayerEntry = {
  address: string
  name?: string
  points?: number
  completionTimeSeconds: number
}

export interface LeaderboardDisplayEntry {
  position: number
  name: string
  points: number
  icon: ReactNode
}

export interface FastestPlayerDisplayEntry {
  position: number
  name: string
  completionTimeLabel: string
  points?: number
  icon: ReactNode
}

// ─── Player & Registration ───────────────────────────────────────────────────

export type PlayerProgress = {
  hunt_id: number
  player: string
  current_clue_index: number
  completed: boolean
  reward_claimed: boolean
}

export type RegistrationStatus = {
  isRegistered: boolean
  progressData?: PlayerProgress
  loading: boolean
  error?: string
}

export type RegistrationResult = {
  success: boolean
  error?: string
  transactionHash?: string
}

// ─── Reward ──────────────────────────────────────────────────────────────────

export interface Reward {
  place: number
  amount: number
  icon?: ReactNode
}

export interface RewardPlayerProgress {
  is_completed: boolean
  reward_claimed: boolean
  hunt_id?: number | string
  reward_amount?: number
}

export type RewardReceiptType = "deposit" | "distribution" | "claim" | "refund"

export interface RewardReceipt {
  id: string
  huntId: number
  type: RewardReceiptType
  txHash: string
  amount: number
  from?: string
  to?: string
  rank?: number
  createdAt: number
}

export type RewardHistoryType = "XLM" | "NFT"

export interface RewardHistoryEntry {
  id: string
  type: RewardHistoryType
  amount?: number
  description: string
  txHash: string
  earnedAt: string
  huntId?: number
  huntName?: string
  recipient?: string
  explorerUrl: string
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

export type ActivityEventType = "HuntCompleted" | "ClueCompleted"

export interface ActivityEvent {
  id: string
  /** Full Stellar G-address of the participant */
  address: string
  /** Optional display name resolved from the player's profile */
  displayName?: string
  huntTitle: string
  huntId: number
  timestamp: number
  type: ActivityEventType
}

// ─── Component-level Hunt (used by PlayGame, HuntForm, GamePreview, HuntCards) ─

export interface HuntCard {
  id: number
  title?: string
  description?: string
  link?: string
  code?: string
  image?: string
  hint?: string
  hintCost?: number
  points?: number
  difficulty?: ClueDifficulty
}

export interface HuntDraft {
  id: number
  title: string
  description: string
  link: string
  code: string
  image?: string
}

export type CoverImageUploadState = "idle" | "uploading" | "succeeded" | "failed"

// ─── Player Count ────────────────────────────────────────────────────────────

/**
 * Player count above which a hunt is considered "Trending".
 *
 * A hunt whose registered player count is >= this value receives the
 * 🔥 Trending badge on its card. Set to 50 as a reasonable signal of
 * meaningful engagement without being too easy to trigger on small hunts.
 *
 * To tune: lower the value to badge more hunts (e.g. 20 for a new platform
 * with low traffic); raise it to reserve the badge for genuinely popular hunts.
 */
export const TRENDING_PLAYER_THRESHOLD = 50

/**
 * How long a fetched player count is considered fresh (ms).
 *
 * After this TTL the next call to `usePlayerCount` / `usePlayerCounts` will
 * re-scan localStorage and update the cache. The cache is module-level, so it
 * resets on a full page reload — satisfying the "updates on each arcade page
 * load" requirement without stale counts surviving navigation.
 *
 * Tradeoff: shorter TTL → fresher counts but more localStorage scans per
 * session; longer TTL → fewer scans but counts may lag behind reality.
 * 60 s is a reasonable default for a game arcade where registration activity
 * is bursty rather than continuous.
 */
export const PLAYER_COUNT_CACHE_TTL_MS = 60_000

export interface PlayerCountResult {
  huntId: string
  count: number
  /**
   * `true` when `count >= TRENDING_PLAYER_THRESHOLD`.
   *
   * Computed at fetch time and cached alongside the count, so the badge
   * reflects the same snapshot as the displayed number. Re-evaluated on
   * every cache miss (stale or absent entry).
   */
  isTrending: boolean
  fetchedAt: number   // Date.now() at time of fetch
  isLoading: boolean
  error: string | null
}

// ─── Profile Dashboard Types ───────────────────────────────────────────────────

export type HuntProgressStatus = "Completed" | "In-Progress"

export interface PlayerHuntProgress {
  id: number
  title: string
  description: string
  totalClues: number
  status: HuntProgressStatus
  pointsEarned: number
  startedAt: string
  completedAt?: string
}

export interface NftAttribute {
  trait_type: string
  value: string | number
}

export interface NftRewardDetail {
  id: number
  name: string
  description?: string
  imageUri: string
  earnedAt: string
  claimed: boolean
  huntName?: string
  attributes?: NftAttribute[]
  /** ipfs:// URI pointing to the SEP-0039 metadata JSON file for this NFT. */
  metadataUri?: string
}

export interface ProfileSummary {
  totalHunts: number
  completedHunts: number
  inProgressHunts: number
  totalPoints: number
  completionRate: number
  totalNftRewards: number
  claimedNftRewards: number
  unclaimedNftRewards: number
}

// ─── Core Web Vitals ────────────────────────────────────────────────────────────

export type WebVitalMetric = "LCP" | "FID" | "CLS" | "TTFB" | "INP" | "FCP"

export interface PerformanceMetric {
  name: WebVitalMetric
  value: number
  rating: "good" | "needs-improvement" | "poor"
  timestamp: number
  url: string
}

export interface PerformanceBudget {
  name: WebVitalMetric
  good: number
  poor: number
}

export interface PerformanceReportEntry {
  id: string
  metrics: PerformanceMetric[]
  timestamp: number
  url: string
  userAgent: string
}

export interface PerformanceAlert {
  metric: WebVitalMetric
  value: number
  threshold: number
  timestamp: number
  url: string
}
