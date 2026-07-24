import { getAllHunts } from "@/lib/huntStore"

import type { ActivityEventType, ActivityEvent } from "@/lib/types"

export type { ActivityEventType, ActivityEvent }

/**
 * Anonymizes a Stellar public key for public display.
 * e.g. "GABCDEFGH...UVWXYZ" → "GAB...WXYZ"
 * Falls back to the original value for very short strings.
 */
export function anonymizeAddress(address: string, prefixChars = 3, suffixChars = 4): string {
  if (!address || address.length <= prefixChars + suffixChars + 3) {
    return address
  }
  return `${address.slice(0, prefixChars)}...${address.slice(-suffixChars)}`
}

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

/** Pseudo-random Stellar-like public keys used in mock events. */
const MOCK_ADDRESSES = [
  "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  "GBX7NQMGKPQFNILAJSQIMUPRQ9CXHXSWJYAAPQZFHKCFHAKFZV5H7YL2",
  "GCT4MFQE2ZQKIHS4KMIUQZFVLXYB3NJPKXKQIKMHZYHULKDKXQFZSLP3",
  "GDEF7QHZRJLXKIAOPQMN5VBCWETYU23HIAJZXCVBNM456789QWERTYUI",
  "GFA27MNBVCXZASDFGHJKLQWERTYUIOP1234567890ZXCVBNMASDFGHJKL",
  "GCA18LKJHGFDSAPOIUYTREWQ0987654321MNBVCXZASDFGHJKLPOIUYTR",
  "GHST9QWERTYUIOPASDFGHJKLZXCVBNM1234567890QWERTYUIOPASDFGH",
  "GJKL3ASDFGHJKLZXCVBNMQWERTYUIOP0987654321ASDFGHJKLZXCVBNM",
]

const EVENT_TYPES: ActivityEventType[] = ["HuntCompleted", "ClueCompleted"]

/**
 * Generates a deterministic but varied set of mock activity events
 * seeded from real hunt titles in localStorage, so the feed looks authentic.
 */
function generateMockEvents(limit: number): ActivityEvent[] {
  const hunts = getAllHunts().filter((h) => h.status === "Active" || h.status === "Completed")
  const now = Math.floor(Date.now() / 1000)

  // Build a varied pool of events
  const events: ActivityEvent[] = []

  for (let i = 0; i < Math.max(limit, 10); i++) {
    const hunt = hunts[i % (hunts.length || 1)] ?? {
      id: 1,
      title: "City Secrets",
    }
    const address = MOCK_ADDRESSES[i % MOCK_ADDRESSES.length]
    const type = EVENT_TYPES[i % EVENT_TYPES.length]
    // Space events out over the last 30 minutes
    const timestamp = now - i * 90 - Math.floor(i * 47)

    events.push({
      id: `mock-event-${i}`,
      address,
      huntTitle: hunt.title,
      huntId: hunt.id,
      timestamp,
      type,
    })
  }

  return events.slice(0, limit)
}

/**
 * Retrieves recent platform activity (hunt/clue completions).
 *
 * In production this would query the HuntyCore contract's completion events
 * via the Soroban RPC. For now it returns deterministic mock data seeded from
 * real hunt titles so the feed looks realistic during development.
 *
 * @param limit  Maximum number of events to return (default: 10)
 */
export async function getRecentActivity(limit = 10): Promise<ActivityEvent[]> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600))

  return generateMockEvents(limit)
}
