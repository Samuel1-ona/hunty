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
  creatorEmail?: string
  emailNotifications?: boolean
}

// ─── Clue ────────────────────────────────────────────────────────────────────

export interface Clue {
  id: number
  huntId: number
  question: string
  answer: string
  points: number
  hint?: string
  hintCost?: number
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
}

export interface ClueRow {
  id: number
  question: string
  answer: string
  points: number
  hint?: string
  hintCost?: number
}

// ─── Transaction Results ─────────────────────────────────────────────────────

export type CreateHuntResult = {
  txHash: string
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
}

// ─── Activity Feed ───────────────────────────────────────────────────────────

export type ActivityEventType = "HuntCompleted" | "ClueCompleted"

export interface ActivityEvent {
  id: string
  /** Full Stellar G-address of the participant */
  address: string
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
}

export interface HuntDraft {
  id: number
  title: string
  description: string
  link: string
  code: string
  image?: string
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
