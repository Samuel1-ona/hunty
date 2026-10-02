import type { PlayerProgress } from "@hunty/types";

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
