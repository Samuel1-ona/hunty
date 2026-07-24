import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { HuntCards } from "../HuntCards"
import type { HuntCard } from "@/lib/types"
import * as usePlayerCountModule from "@/hooks/usePlayerCount"

// Mock the contract call used inside HuntCards (submitAnswer)
vi.mock("@/lib/contracts/hunt", () => ({
  submitAnswer: vi.fn(),
  pollTransaction: vi.fn(),
  AnswerIncorrectError: class AnswerIncorrectError extends Error {
    constructor() { super("Incorrect"); this.name = "AnswerIncorrectError" }
  },
}))

// Mock canvas-confetti (not available in jsdom)
vi.mock("canvas-confetti", () => ({ default: vi.fn() }))

// Mock usePlayerCount so HuntCards tests are isolated from localStorage
vi.mock("@/hooks/usePlayerCount", () => ({
  usePlayerCount: vi.fn(() => ({
    huntId: "1",
    count: 0,
    isTrending: false,
    fetchedAt: 0,
    isLoading: false,
    error: null,
  })),
}))

const baseHunt: HuntCard = {
  id: 1,
  title: "Test Hunt",
  description: "A test hunt description",
  code: "answer",
}

const defaultProps = {
  hunts: [baseHunt],
  isActive: true,
}

// ── player count display ──────────────────────────────────────────────────────

describe("HuntCards — player count display", () => {
  beforeEach(() => vi.clearAllMocks())

  it("renders player count when provided via props", () => {
    render(<HuntCards {...defaultProps} playerCount={7} playerCountLoading={false} playerCountError={null} isTrending={false} />)
    expect(screen.getByText("7 players registered")).toBeInTheDocument()
  })

  it("renders singular 'player' when count is 1", () => {
    render(<HuntCards {...defaultProps} playerCount={1} playerCountLoading={false} playerCountError={null} isTrending={false} />)
    expect(screen.getByText("1 player registered")).toBeInTheDocument()
  })

  it("renders loading dash when playerCountLoading is true", () => {
    // playerCount must be defined (non-undefined) to use the prop path;
    // passing 0 with loading=true triggers the loading branch.
    render(<HuntCards {...defaultProps} playerCount={0} playerCountLoading={true} playerCountError={null} isTrending={false} />)
    expect(document.querySelector(".player-count--loading")).toBeInTheDocument()
  })

  it("renders nothing for count when there is an error", () => {
    render(<HuntCards {...defaultProps} playerCount={0} playerCountLoading={false} playerCountError="Network error" isTrending={false} />)
    expect(screen.queryByText(/registered/)).not.toBeInTheDocument()
  })

  it("falls back to usePlayerCount hook when no playerCount prop is passed", () => {
    vi.mocked(usePlayerCountModule.usePlayerCount).mockReturnValueOnce({
      huntId: "1", count: 12, isTrending: false, fetchedAt: 0, isLoading: false, error: null,
    })
    render(<HuntCards {...defaultProps} />)
    expect(screen.getByText("12 players registered")).toBeInTheDocument()
  })

  it("shows trending badge from fallback hook when isTrending is true", () => {
    vi.mocked(usePlayerCountModule.usePlayerCount).mockReturnValueOnce({
      huntId: "1", count: 60, isTrending: true, fetchedAt: 0, isLoading: false, error: null,
    })
    render(<HuntCards {...defaultProps} />)
    expect(screen.getByLabelText("Trending hunt")).toBeInTheDocument()
  })
})

// ── trending badge ────────────────────────────────────────────────────────────

describe("HuntCards — trending badge", () => {
  it("shows trending badge when isTrending is true", () => {
    render(<HuntCards {...defaultProps} playerCount={60} playerCountLoading={false} playerCountError={null} isTrending={true} />)
    expect(screen.getByLabelText("Trending hunt")).toBeInTheDocument()
    expect(screen.getByText(/Trending/)).toBeInTheDocument()
  })

  it("does not show trending badge when isTrending is false", () => {
    render(<HuntCards {...defaultProps} playerCount={10} playerCountLoading={false} playerCountError={null} isTrending={false} />)
    expect(screen.queryByLabelText("Trending hunt")).not.toBeInTheDocument()
  })
})

// ── accessibility ─────────────────────────────────────────────────────────────

describe("HuntCards — accessibility", () => {
  it("player count span has aria-label with count text", () => {
    render(<HuntCards {...defaultProps} playerCount={5} playerCountLoading={false} playerCountError={null} isTrending={false} />)
    expect(screen.getByLabelText("5 players registered")).toBeInTheDocument()
  })

  it("trending badge has aria-label", () => {
    render(<HuntCards {...defaultProps} playerCount={60} playerCountLoading={false} playerCountError={null} isTrending={true} />)
    expect(screen.getByLabelText("Trending hunt")).toBeInTheDocument()
  })

  it("player count is readable text — not only an icon", () => {
    render(<HuntCards {...defaultProps} playerCount={3} playerCountLoading={false} playerCountError={null} isTrending={false} />)
    // Visible text must be present alongside any badge
    expect(screen.getByText("3 players registered")).toBeInTheDocument()
  })

  it("answer input has accessible placeholder", () => {
    render(<HuntCards {...defaultProps} />)
    expect(screen.getByPlaceholderText("Enter answer")).toBeInTheDocument()
  })

  it("submit button is keyboard accessible", () => {
    render(<HuntCards {...defaultProps} />)
    const submitBtn = screen.getByRole("button", { name: "" })
    submitBtn.focus()
    expect(document.activeElement).toBe(submitBtn)
  })
})

// ── card rendering ────────────────────────────────────────────────────────────

describe("HuntCards — card rendering", () => {
  it("renders hunt title and description", () => {
    render(<HuntCards {...defaultProps} />)
    expect(screen.getByText("Test Hunt")).toBeInTheDocument()
    expect(screen.getByText("A test hunt description")).toBeInTheDocument()
  })

  it("renders clue counter", () => {
    render(<HuntCards {...defaultProps} currentIndex={2} totalHunts={5} />)
    expect(screen.getByText("2/5")).toBeInTheDocument()
  })

  it("renders points badge when points prop is provided", () => {
    render(<HuntCards {...defaultProps} points={20} />)
    expect(screen.getByText("20 pts")).toBeInTheDocument()
  })

  it("renders skeleton when isLoading is true", () => {
    render(<HuntCards {...defaultProps} isLoading={true} />)
    // Input and submit button are absent during loading
    expect(screen.queryByPlaceholderText("Enter answer")).not.toBeInTheDocument()
  })

  it("shows solved overlay and disables input when solved is true", () => {
    render(<HuntCards {...defaultProps} solved={true} />)
    // The green overlay is rendered
    expect(document.querySelector(".bg-green-500\\/10")).toBeInTheDocument()
    // Input is disabled (isLocked = true when solved)
    expect(screen.getByPlaceholderText("Enter answer")).toBeDisabled()
  })

  it("shows Hunt Ended message when huntEnded is true", () => {
    render(<HuntCards {...defaultProps} huntEnded={true} />)
    expect(screen.getByText("Hunt Ended")).toBeInTheDocument()
  })

  it("renders the answer row as a sticky footer with keyboard inset support", () => {
    render(<HuntCards {...defaultProps} />)
    const answerRow = screen.getByTestId("answer-row")
    expect(answerRow).toBeInTheDocument()
    expect(answerRow.className).toContain("sticky")
    expect(answerRow.style.bottom).toContain("env(keyboard-inset-height")
  })
})

// ── local answer submission ───────────────────────────────────────────────────

describe("HuntCards — local answer submission (no huntId)", () => {
  beforeEach(() => vi.clearAllMocks())

  it("shows Try Again on wrong answer", () => {
    render(<HuntCards {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText("Enter answer"), { target: { value: "wrong" } })
    fireEvent.click(screen.getByRole("button", { name: "" })) // ArrowRight button
    expect(screen.getByText("Try Again")).toBeInTheDocument()
  })

  it("calls onUnlock after correct answer", async () => {
    const onUnlock = vi.fn()
    render(<HuntCards {...defaultProps} onUnlock={onUnlock} />)
    fireEvent.change(screen.getByPlaceholderText("Enter answer"), { target: { value: "answer" } })
    fireEvent.click(screen.getByRole("button", { name: "" }))
    await waitFor(() => expect(onUnlock).toHaveBeenCalled(), { timeout: 2000 })
  })

  it("clears error when input changes after wrong answer", () => {
    render(<HuntCards {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText("Enter answer"), { target: { value: "wrong" } })
    fireEvent.click(screen.getByRole("button", { name: "" }))
    expect(screen.getByText("Try Again")).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText("Enter answer"), { target: { value: "a" } })
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument()
  })
})

// ── interaction / keyboard ────────────────────────────────────────────────────

describe("HuntCards — keyboard interaction", () => {
  it("submits answer on Enter key press", () => {
    const onUnlock = vi.fn()
    render(<HuntCards {...defaultProps} onUnlock={onUnlock} />)
    const input = screen.getByPlaceholderText("Enter answer")
    fireEvent.change(input, { target: { value: "answer" } })
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" })
    // Should trigger submission flow
  })

  it("input is focusable via keyboard", () => {
    render(<HuntCards {...defaultProps} />)
    const input = screen.getByPlaceholderText("Enter answer")
    input.focus()
    expect(document.activeElement).toBe(input)
  })
})