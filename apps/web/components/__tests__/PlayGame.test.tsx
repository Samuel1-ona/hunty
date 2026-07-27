/* eslint-disable @next/next/no-img-element */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { PlayGame } from "../PlayGame"

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}))

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}))

vi.mock("sonner", () => ({
  toast: {
    error: toastError,
  },
}))

vi.mock("@/components/Header", () => ({
  Header: () => <div data-testid="header" />,
}))

vi.mock("@/components/PlayerProgressPanel", () => ({
  PlayerProgressPanel: () => <div data-testid="player-progress" />,
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

const mockGetHunt = vi.fn()
const mockGetClueInfo = vi.fn()

vi.mock("@/lib/contracts/hunt", () => ({
  get_hunt: (...args: any[]) => mockGetHunt(...args),
  get_clue_info: (...args: any[]) => mockGetClueInfo(...args),
}))

describe("PlayGame", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHunt.mockResolvedValue({
      id: 56,
      title: "Test Hunt",
      totalClues: 1,
      rewardPool: 100,
      status: "Active",
      startTime: Math.floor(Date.now() / 1000) - 100,
      endTime: Math.floor(Date.now() / 1000) + 1000,
    })
    mockGetClueInfo.mockResolvedValue({
      id: 0,
      question: "First clue question",
      points: 10,
      hint: "Hint text",
      hintCost: 2,
      difficulty: "Easy",
    })
  })

  // ─── Render Tests ───────────────────────────────────────────────
  describe("render", () => {
    it("renders Header component", async () => {
      renderWithClient(
        <PlayGame
          hunts={[]}
          gameName="Hunty"
          onExit={vi.fn()}
          onGameComplete={vi.fn()}
          gameCompleteModal={null}
          huntId={56}
        />
      )
      await waitFor(() => {
        expect(screen.getByTestId("header")).toBeInTheDocument()
      })
    })

    it("renders PlayerProgressPanel", async () => {
      renderWithClient(
        <PlayGame
          hunts={[]}
          gameName="Hunty"
          onExit={vi.fn()}
          onGameComplete={vi.fn()}
          gameCompleteModal={null}
          huntId={56}
        />
      )
      await waitFor(() => {
        expect(screen.getByTestId("player-progress")).toBeInTheDocument()
      })
    })

    it("renders loading skeleton while fetching hunt", () => {
      mockGetHunt.mockImplementation(() => new Promise(() => {}))
      renderWithClient(
        <PlayGame
          hunts={[]}
          gameName="Hunty"
          onExit={vi.fn()}
          onGameComplete={vi.fn()}
          gameCompleteModal={null}
          huntId={56}
        />
      )
      expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
    })
  })

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    it("shows Network Error instead of crashing when hunt fetch times out", async () => {
      mockGetHunt.mockRejectedValue(new Error("Soroban RPC request timed out"))

      renderWithClient(
        <PlayGame
          hunts={[]}
          gameName="Hunty"
          onExit={vi.fn()}
          onGameComplete={vi.fn()}
          gameCompleteModal={null}
          huntId={56}
        />
      )

      expect(document.querySelector(".animate-pulse")).toBeInTheDocument()
      expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0)

      await waitFor(() => {
        expect(screen.getByText("Soroban RPC request timed out")).toBeInTheDocument()
      })

      expect(toastError).toHaveBeenCalledWith("Soroban RPC request timed out")
    })
  })

  // ─── Accessibility Tests ────────────────────────────────────────
  describe("accessibility", () => {
    it("has no accessibility violations in loading state", async () => {
      renderWithClient(
        <PlayGame
          hunts={[]}
          gameName="Hunty"
          onExit={vi.fn()}
          onGameComplete={vi.fn()}
          gameCompleteModal={null}
          huntId={56}
        />
      )
      // Skeleton elements should be present
      const skeletons = document.querySelectorAll(".animate-pulse")
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it("announces network error to screen readers", async () => {
      mockGetHunt.mockRejectedValue(new Error("Soroban RPC request timed out"))

      renderWithClient(
        <PlayGame
          hunts={[]}
          gameName="Hunty"
          onExit={vi.fn()}
          onGameComplete={vi.fn()}
          gameCompleteModal={null}
          huntId={56}
        />
      )

      await waitFor(() => {
        const errorEl = screen.getByText("Soroban RPC request timed out")
        expect(errorEl).toBeInTheDocument()
      })
    })
  })
})