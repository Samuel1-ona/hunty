import type { AutoFlagReason, ContentPolicyViolation } from "./types"
import type { StoredHunt } from "@/lib/types"

const BLOCKED_TERMS = [
  "casino",
  "gambling",
  "free money",
  "get rich",
  "xxx",
  "porn",
  "nazi",
  "kill yourself",
]

const PROFANITY_TERMS = ["damn", "shit", "fuck", "asshole", "bitch"]

const URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi

export function scanHuntContent(hunt: Pick<StoredHunt, "title" | "description" | "rewardPool">): {
  autoFlags: AutoFlagReason[]
  policyViolations: ContentPolicyViolation[]
} {
  const text = `${hunt.title} ${hunt.description}`.toLowerCase()
  const autoFlags: AutoFlagReason[] = []
  const policyViolations: ContentPolicyViolation[] = []

  const lettersOnly = hunt.title.replace(/[^a-zA-Z]/g, "")
  if (lettersOnly.length >= 8 && lettersOnly === lettersOnly.toUpperCase()) {
    autoFlags.push("excessive_caps")
  }

  const urls = hunt.title.match(URL_PATTERN) ?? hunt.description.match(URL_PATTERN)
  if (urls && urls.length >= 2) {
    autoFlags.push("suspicious_urls")
    policyViolations.push("spam")
  } else if (urls && urls.length === 1) {
    autoFlags.push("suspicious_urls")
  }

  for (const term of BLOCKED_TERMS) {
    if (text.includes(term)) {
      autoFlags.push("blocked_terms")
      if (term.includes("nazi") || term.includes("kill")) {
        policyViolations.push("hate_speech")
      } else if (term.includes("xxx") || term.includes("porn")) {
        policyViolations.push("illegal_content")
      } else {
        policyViolations.push("spam")
      }
      break
    }
  }

  for (const word of PROFANITY_TERMS) {
    if (text.includes(word)) {
      policyViolations.push("profanity")
      break
    }
  }

  if ((hunt.description?.length ?? 0) < 20) {
    autoFlags.push("short_description")
  }

  const pool = hunt.rewardPool ?? 0
  if (pool > 10_000) {
    autoFlags.push("reward_anomaly")
    policyViolations.push("misleading")
  }

  return { autoFlags: [...new Set(autoFlags)], policyViolations: [...new Set(policyViolations)] }
}
