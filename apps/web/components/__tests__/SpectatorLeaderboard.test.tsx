/**
 * #1442 – SpectatorLeaderboard a11y tests
 *
 * Covers:
 * - A polite live region is present in the DOM
 * - The leaderboard renders correctly
 * - Rank change announcements are generated and placed in the live region
 */

import { render, screen, act } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import SpectatorLeaderboard from "../SpectatorLeaderboard"

const mockLeaderboardData = {
  hunt: { id: 1, title: "Test Hunt", description: "A test hunt" },
  leaderboard: [
    { position: 1, name: "Alice", points: 100, completionCount: 5 },
    { position: 2, name: "Bob", points: 80, completionCount: 4 },
  ],
  summary: { topRankName: "Alice", topRankPoints: 100, playerCount: 2 },
  embedUrl: "https://hunty.app/embed/1",
  shareUrl: "https://hunty.app/share/1",
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockLeaderboardData),
  }) as unknown as typeof global.fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("SpectatorLeaderboard", () => {
  it("has a polite live region for announcing rank changes", () => {
    render(<SpectatorLeaderboard huntId="1" />)

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute("aria-atomic", "true")
    expect(liveRegion).toHaveAttribute("role", "status")
  })

  it("renders the leaderboard with players", async () => {
    render(<SpectatorLeaderboard huntId="1" />)

    expect(screen.getByText("Test Hunt")).toBeInTheDocument()
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
  })

  it("announces a new player entering the leaderboard", async () => {
    render(<SpectatorLeaderboard huntId="1" />)

    // Wait for initial fetch to complete
    await act(async () => {
      await Promise.resolve()
    })

    // Simulate a subsequent fetch with a new player
    const updatedData = {
      ...mockLeaderboardData,
      leaderboard: [
        { position: 1, name: "Alice", points: 100, completionCount: 5 },
        { position: 2, name: "Bob", points: 80, completionCount: 4 },
        { position: 3, name: "Charlie", points: 60, completionCount: 3 },
      ],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedData),
    }) as unknown as typeof global.fetch

    // Trigger the data-update effect
    await act(async () => {
      await Promise.resolve()
    })

    // Flush the requestAnimationFrame used to update the live region
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion?.textContent).toContain(
      "Charlie entered the leaderboard at position 3",
    )
  })

  it("announces a player moving up in rank", async () => {
    render(<SpectatorLeaderboard huntId="1" />)

    await act(async () => {
      await Promise.resolve()
    })

    const updatedData = {
      ...mockLeaderboardData,
      leaderboard: [
        { position: 1, name: "Bob", points: 80, completionCount: 4 },
        { position: 2, name: "Alice", points: 100, completionCount: 5 },
      ],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedData),
    }) as unknown as typeof global.fetch

    await act(async () => {
      await Promise.resolve()
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion?.textContent).toContain("Bob moved up 1 position to 1")
    expect(liveRegion?.textContent).toContain("Alice moved down 1 position to 2")
  })
})
