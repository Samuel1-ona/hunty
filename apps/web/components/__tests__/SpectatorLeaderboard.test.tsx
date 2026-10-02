/**
 * #1442 – SpectatorLeaderboard a11y tests
 *
 * Covers:
 * - A polite live region is present in the DOM
 * - The leaderboard renders correctly
 * - Rank change announcements are generated and placed in the live region
 * - Loading and error states
 */

import { render, screen, act, waitFor } from "@testing-library/react"
import React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"

import SpectatorLeaderboard from "../SpectatorLeaderboard"

const mockLeaderboardData = {
  hunt: {
    id: 1,
    title: "Test Hunt",
    description: "A test hunt description",
  },
  leaderboard: [
    { position: 1, name: "Player1", points: 100, completionCount: 5 },
    { position: 2, name: "Player2", points: 80, completionCount: 4 },
  ],
  summary: {
    topRankName: "Player1",
    topRankPoints: 100,
    playerCount: 2,
  },
  embedUrl: "https://hunty.app/embed/1",
  shareUrl: "https://hunty.app/share/1",
}

describe("SpectatorLeaderboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardData),
    }) as unknown as typeof global.fetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders loading state initially", () => {
    // Override fetch just for this test to delay the response
    let resolveFetch: any;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    global.fetch = vi.fn().mockReturnValue(fetchPromise) as unknown as typeof global.fetch;

    const { container } = render(<SpectatorLeaderboard huntId="1" />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    
    // Resolve so we don't leak unhandled promises
    resolveFetch({
      ok: true,
      json: () => Promise.resolve(mockLeaderboardData),
    });
  });

  it("renders leaderboard data after successful fetch", async () => {
    render(<SpectatorLeaderboard huntId="1" />);

    await waitFor(() => {
      expect(screen.getByText("Test Hunt")).toBeInTheDocument();
    });

    expect(screen.getByText("A test hunt description")).toBeInTheDocument();
    expect(screen.getByText("Player1")).toBeInTheDocument();
    expect(screen.getByText("Player2")).toBeInTheDocument();
    expect(screen.getByText("100 pts")).toBeInTheDocument();
  });

  it("renders error state on fetch failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    }) as unknown as typeof global.fetch;

    render(<SpectatorLeaderboard huntId="1" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load leaderboard")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("has a polite live region for announcing rank changes", async () => {
    render(<SpectatorLeaderboard huntId="1" />)
    
    await waitFor(() => {
      expect(screen.getByText("Test Hunt")).toBeInTheDocument();
    });

    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute("aria-atomic", "true")
    expect(liveRegion).toHaveAttribute("role", "status")
  })

  it("announces a new player entering the leaderboard", async () => {
    render(<SpectatorLeaderboard huntId="1" />)

    // Wait for initial fetch to complete
    await waitFor(() => {
      expect(screen.getByText("Test Hunt")).toBeInTheDocument();
    });

    // Simulate a subsequent fetch with a new player
    const updatedData = {
      ...mockLeaderboardData,
      leaderboard: [
        { position: 1, name: "Player1", points: 100, completionCount: 5 },
        { position: 2, name: "Player2", points: 80, completionCount: 4 },
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

    await waitFor(() => {
      expect(screen.getByText("Test Hunt")).toBeInTheDocument();
    });

    const updatedData = {
      ...mockLeaderboardData,
      leaderboard: [
        { position: 1, name: "Player2", points: 80, completionCount: 4 },
        { position: 2, name: "Player1", points: 100, completionCount: 5 },
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
    expect(liveRegion?.textContent).toContain("Player2 moved up 1 position to 1")
    expect(liveRegion?.textContent).toContain("Player1 moved down 1 position to 2")
  })
})
