import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PlayerProgressPanel } from "../PlayerProgressPanel"

describe("PlayerProgressPanel", () => {
  it("renders correctly with given progress data", () => {
    render(
      <PlayerProgressPanel
        cluesSolved={2}
        totalClues={5}
        totalPoints={150}
      />
    )

    // Verify Points display
    expect(screen.getByText("Total Points")).toBeInTheDocument()
    expect(screen.getByText("150")).toBeInTheDocument()

    // Verify Fraction display
    expect(screen.getByText("Clues Solved")).toBeInTheDocument()
    expect(screen.getByText("2/5")).toBeInTheDocument()

    // Verify percentage label calculation (40%)
    expect(screen.getByText("40% complete")).toBeInTheDocument()
  })

  it("calculates percentage correctly and sets ARIA styles", () => {
    // 3 solved out of 10 = 30%
    render(
      <PlayerProgressPanel
        cluesSolved={3}
        totalClues={10}
        totalPoints={999}
      />
    )

    const progressBar = screen.getByRole("progressbar")
    // Aria value should match the percentage accurately
    expect(progressBar).toHaveAttribute("aria-valuenow", "30")
    
    // Verify the visual width is dynamically applied inline via the inner div
    const innerBar = progressBar.firstElementChild as HTMLElement
    expect(innerBar.style.width).toBe("30%")
  })

  it("handles zero totalClues gracefully to avoid NaN or Infinity", () => {
    render(
      <PlayerProgressPanel
        cluesSolved={0}
        totalClues={0}
        totalPoints={0}
      />
    )

    expect(screen.getByText("0/0")).toBeInTheDocument()
    
    // Zero divided by zero logic should default to 0%
    expect(screen.getByText("0% complete")).toBeInTheDocument()

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "0")
  })
})
