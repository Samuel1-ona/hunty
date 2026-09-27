import type { StoredHunt } from "@/lib/types"

export type ModerationDecision = "pending" | "approved" | "rejected"

export type ContentPolicyViolation =
  | "profanity"
  | "hate_speech"
  | "spam"
  | "misleading"
  | "illegal_content"
  | "other"

export type AutoFlagReason =
  | "excessive_caps"
  | "suspicious_urls"
  | "blocked_terms"
  | "reward_anomaly"
  | "short_description"

export interface ModerationSubmission {
  id: string
  huntId: number
  hunt: StoredHunt
  status: ModerationDecision
  submittedAt: number
  submittedBy?: string
  reviewedAt?: number
  reviewedBy?: string
  rejectionReason?: string
  autoFlags: AutoFlagReason[]
  policyViolations: ContentPolicyViolation[]
  creatorEmail?: string
}

export interface CreatorModerationNotification {
  id: string
  huntId: number
  huntTitle: string
  action: "approved" | "rejected"
  reason?: string
  creatorEmail?: string
  createdAt: number
  read: boolean
}
