import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReferralLeaderboardTable } from "@/components/ReferralLeaderboardTable"
import type { ReferralLeaderboardEntry, ReferralLeaderboardStats } from "@/lib/types"

const mockLeaderboard: ReferralLeaderboardEntry[] = [
  {
    rank: 1,
    referrerAddress: "GREFERRER1111111111111111111111111111111111111111111111",
    successfulReferrals: 10,
    totalInvites: 15,
    bonusPoints: 250,
    lastActiveAt: Date.now() - 1000,
    rewardPayoutStatus: "paid",
    rewardAmount: 750,
  },
  {
    rank: 2,
    referrerAddress: "GPLAYER2222222222222222222222222222222222222222222222",
    successfulReferrals: 5,
    totalInvites: 8,
    bonusPoints: 125,
    lastActiveAt: Date.now() - 5000,
    rewardPayoutStatus: "pending",
    rewardAmount: 450,
  },
]

const mockStats: ReferralLeaderboardStats = {
  totalReferrers: 2,
  totalSuccessfulReferrals: 15,
  totalBonusDistributed: 375,
  activeRewardPool: 0,
}

describe("ReferralLeaderboardTable", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders loading skeletons initially and then loads leaderboard data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          leaderboard: mockLeaderboard,
          stats: mockStats,
          period: "all",
        }),
        { status: 200 }
      )
    )

    render(<ReferralLeaderboardTable />)

    expect(screen.getByTestId("referral-leaderboard")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("leaderboard-row-1")).toBeInTheDocument()
      expect(screen.getByTestId("leaderboard-row-2")).toBeInTheDocument()
    })

    expect(screen.getByText("10")).toBeInTheDocument() // successful count for rank 1
    expect(screen.getByTestId("payout-badge-paid")).toBeInTheDocument()
  })

  it("highlights connected player's row and displays player rank callout when present", async () => {
    const playerAddr = "GREFERRER1111111111111111111111111111111111111111111111"
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          leaderboard: mockLeaderboard,
          stats: mockStats,
          playerRank: mockLeaderboard[0],
          period: "all",
        }),
        { status: 200 }
      )
    )

    render(<ReferralLeaderboardTable playerAddress={playerAddr} />)

    await waitFor(() => {
      expect(screen.getByTestId("player-rank-callout")).toBeInTheDocument()
    })

    expect(screen.getByText("(you)")).toBeInTheDocument()
  })

  it("fetches new data when period tab is clicked", async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          leaderboard: mockLeaderboard,
          stats: mockStats,
          period: "week",
        }),
        { status: 200 }
      )
    )

    render(<ReferralLeaderboardTable />)

    const weekTab = screen.getByRole("tab", { name: "This Week" })
    await user.click(weekTab)

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("period=week"),
      expect.anything()
    )
  })

  it("renders empty state message when no referrals exist", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          leaderboard: [],
          stats: { totalReferrers: 0, totalSuccessfulReferrals: 0, totalBonusDistributed: 0, activeRewardPool: 0 },
          period: "all",
        }),
        { status: 200 }
      )
    )

    render(<ReferralLeaderboardTable />)

    await waitFor(() => {
      expect(
        screen.getByText("No referrals recorded yet. Share your link to get started!")
      ).toBeInTheDocument()
    })
  })
})
