import React from "react"
import { render, screen, waitFor, act } from "@testing-library/react"
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import { toast } from "sonner"

import { GlobalActivityFeed } from "../GlobalActivityFeed"
import * as activityFeedModule from "@/lib/contracts/activityFeed"
import type { ActivityEvent } from "@/lib/types"
import { anonymizeAddress } from "@/lib/contracts/activityFeed"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: vi.fn(() => false),
}))

const MOCK_EVENTS: ActivityEvent[] = [
  {
    id: "event-1",
    address: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
    huntTitle: "City Secrets",
    huntId: 1,
    timestamp: Math.floor(Date.now() / 1000) - 120,
    type: "HuntCompleted",
  },
  {
    id: "event-2",
    address: "GBX7NQMGKPQFNILAJSQIMUPRQ9CXHXSWJYAAPQZFHKCFHAKFZV5H7YL2",
    huntTitle: "Campus Quest",
    huntId: 2,
    timestamp: Math.floor(Date.now() / 1000) - 300,
    type: "ClueCompleted",
  },
  {
    id: "event-3",
    address: "GCT4MFQE2ZQKIHS4KMIUQZFVLXYB3NJPKXKQIKMHZYHULKDKXQFZSLP3",
    huntTitle: "Museum Mystery",
    huntId: 5,
    timestamp: Math.floor(Date.now() / 1000) - 600,
    type: "ClueCompleted",
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GlobalActivityFeed", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // 1. Shows loading skeleton while fetch is in-flight
  it("shows loading skeletons while data is being fetched", () => {
    // getRecentActivity never resolves during this check
    vi.spyOn(activityFeedModule, "getRecentActivity").mockReturnValue(
      new Promise(() => {})
    )

    render(<GlobalActivityFeed pollIntervalMs={999_999} />)

    // The feed container is present
    expect(screen.getByTestId("activity-feed")).toBeInTheDocument()
    // "Live Activity" header is always rendered
    expect(screen.getByText(/live activity/i)).toBeInTheDocument()
    // Spinner icon — Loader2 is rendered with animate-spin
    expect(document.querySelector(".animate-spin")).toBeTruthy()
  })

  // 2. Renders activity items after load with anonymized addresses and hunt titles
  it("renders activity event items with anonymized addresses and hunt titles", async () => {
    vi.spyOn(activityFeedModule, "getRecentActivity").mockResolvedValue(MOCK_EVENTS)

    render(<GlobalActivityFeed pollIntervalMs={999_999} />)

    await waitFor(() => {
      // All three hunt titles should appear
      expect(screen.getByText(/City Secrets/i)).toBeInTheDocument()
      expect(screen.getByText(/Campus Quest/i)).toBeInTheDocument()
      expect(screen.getByText(/Museum Mystery/i)).toBeInTheDocument()
    })

    // Addresses should be anonymized — full key should NOT appear
    expect(screen.queryByText("GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37")).toBeNull()
    // Anonymized form — first 3 chars + last 4
    expect(screen.getByText(/GDQ\.\.\.4W37/)).toBeInTheDocument()
  })

  // 3. Shows empty state when no events returned
  it("displays an empty state message when there are no events", async () => {
    vi.spyOn(activityFeedModule, "getRecentActivity").mockResolvedValue([])

    render(<GlobalActivityFeed pollIntervalMs={999_999} />)

    await waitFor(() => {
      expect(
        screen.getByText(/be the first to complete a hunt/i)
      ).toBeInTheDocument()
    })
  })

  // 4. Polls again after the interval elapses
  it("re-fetches data after the polling interval", async () => {
    vi.useFakeTimers()
    const spy = vi
      .spyOn(activityFeedModule, "getRecentActivity")
      .mockResolvedValue(MOCK_EVENTS)

    render(<GlobalActivityFeed pollIntervalMs={30_000} />)

    // Wait for the initial fetch to complete
    await act(async () => {
      await Promise.resolve()
    })
    expect(spy).toHaveBeenCalledTimes(1)

    // Advance time by 30 seconds
    await act(async () => {
      vi.advanceTimersByTime(30_000)
      await Promise.resolve()
    })

    expect(spy).toHaveBeenCalledTimes(2)
  })

  // 5. Notify users via toast on new HuntCompleted events
  it("shows a toast when a new HuntCompleted event arrives", async () => {
    const firstEvents = [MOCK_EVENTS[0]]
    const newEvent = {
      id: "event-4",
      address: "GDEF7QHZRJLXKIAOPQMN5VBCWETYU23HIAJZXCVBNM456789QWERTYUI",
      huntTitle: "Market Mayhem",
      huntId: 6,
      timestamp: Math.floor(Date.now() / 1000),
      type: "HuntCompleted",
    }

    vi.spyOn(activityFeedModule, "getRecentActivity")
      .mockResolvedValueOnce(firstEvents)
      .mockResolvedValueOnce([...firstEvents, newEvent])

    const toastSuccess = vi.spyOn(toast, "success").mockImplementation(() => {})

    render(<GlobalActivityFeed pollIntervalMs={40} />)

    await waitFor(() => expect(screen.getByText(/City Secrets/i)).toBeInTheDocument())
    await new Promise((resolve) => setTimeout(resolve, 80))

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    expect(toastSuccess).toHaveBeenCalledWith(
      "GDE...TYUI completed Market Mayhem!",
      { duration: 4000 },
    )
  })

  // 6. Gracefully handles fetch errors without crashing
  it("does not crash when fetch fails", async () => {
    vi.spyOn(activityFeedModule, "getRecentActivity").mockRejectedValue(
      new Error("Network Error")
    )

    render(<GlobalActivityFeed pollIntervalMs={999_999} />)

    await waitFor(() => {
      expect(screen.getByTestId("activity-feed")).toBeInTheDocument()
    })

    expect(screen.getByTestId("activity-feed")).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Unit tests for anonymizeAddress utility
// ---------------------------------------------------------------------------

describe("anonymizeAddress", () => {
  it("returns prefix...suffix for a standard Stellar address", () => {
    const address = "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDE12345678901ABCDE"
    const result = anonymizeAddress(address)
    expect(result).toBe("GAB...BCDE")
  })

  it("returns the address unchanged when it is too short to anonymize", () => {
    const short = "GABC1234"
    expect(anonymizeAddress(short)).toBe(short)
  })

  it("respects custom prefixChars and suffixChars", () => {
    const address = "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"
    expect(anonymizeAddress(address, 4, 5)).toBe("GDQP...G4W37")
    // simplified: just verify length-based structure
    const result = anonymizeAddress(address, 4, 5)
    expect(result.startsWith("GDQP")).toBe(true)
    expect(result.includes("...")).toBe(true)
    expect(result.endsWith(address.slice(-5))).toBe(true)
  })

  it("handles empty string gracefully", () => {
    expect(anonymizeAddress("")).toBe("")
  })
})
