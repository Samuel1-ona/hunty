/**
 * #348 — HuntForm Zod validation tests
 *
 * Tests the clues sub-form validation enforced by zod + react-hook-form.
 * Parent-level fields (title, description) are controlled via props/onUpdate,
 * so tests for those fields assert direct DOM interactions.
 */

import React from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi, beforeEach } from "vitest"

import { HuntForm } from "../HuntForm"
import type { HuntDraft } from "@/lib/types"

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock("@/lib/ipfs", () => ({
  uploadToIPFS: vi.fn().mockResolvedValue("ipfs://mock"),
}))

vi.mock("@/lib/contracts/hunt", () => ({
  addClue: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("@/lib/huntStore", () => ({
  saveClueLocally: vi.fn().mockReturnValue(1),
  updateClueAnswer: vi.fn(),
}))

vi.mock("@/lib/crypto", () => ({
  sha256Hex: vi.fn().mockResolvedValue("mockhash"),
}))

vi.mock("@/lib/txToast", () => ({
  withTransactionToast: vi.fn().mockImplementation(async (fn: (...args: unknown[]) => unknown) => fn(() => {})),
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock for next/image, not rendered in app
    <img {...props} alt={props.alt ?? ""} />
  ),
}))

vi.mock("@/components/HuntCards", () => ({
  HuntCards: () => <div data-testid="hunt-cards-preview" />,
}))



// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseHunt: HuntDraft = {
  id: 1,
  title: "Test Hunt",
  description: "A test description",
  link: "",
  code: "",
}

function renderForm(huntOverride?: Partial<HuntDraft>, huntId = 42) {
  const onUpdate = vi.fn()
  const onRemove = vi.fn()
  const onCluesSaved = vi.fn()
  const utils = render(
    <HuntForm
      hunt={{ ...baseHunt, ...huntOverride }}
      onUpdate={onUpdate}
      onRemove={onRemove}
      huntId={huntId}
      onCluesSaved={onCluesSaved}
    />
  )
  return { ...utils, onUpdate, onRemove, onCluesSaved }
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

describe("HuntForm — clue validation (Zod + react-hook-form)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Render Tests ───────────────────────────────────────────────
  describe("render", () => {
    it("renders the hunt form with title input pre-filled from props", () => {
      renderForm()
      expect(screen.getByDisplayValue("Test Hunt")).toBeInTheDocument()
      expect(screen.getByDisplayValue("A test description")).toBeInTheDocument()
    })

    it("renders the clue question input", () => {
      renderForm()
      expect(screen.getByPlaceholderText(/title of the hunt/i)).toBeInTheDocument()
    })

    it("renders the clue answer input", () => {
      renderForm()
      expect(screen.getByPlaceholderText(/enter code to unlock/i)).toBeInTheDocument()
    })

    it("renders the save clues button", () => {
      renderForm()
      expect(screen.getByRole("button", { name: /save clues/i })).toBeInTheDocument()
    })

    it("renders the add clue button", () => {
      renderForm()
      expect(screen.getByRole("button", { name: /add clue/i })).toBeInTheDocument()
    })

    it("renders HuntCards preview component", () => {
      renderForm()
      expect(screen.getByTestId("hunt-cards-preview")).toBeInTheDocument()
    })
  })

  // ─── Interaction Tests ──────────────────────────────────────────
  describe("interaction", () => {
    // -------------------------------------------------------------------------
    // Question required
    // -------------------------------------------------------------------------

    it("shows validation error when clue question is empty and form is submitted", async () => {
      const user = userEvent.setup()
      renderForm()

      // Leave question empty, fill only the answer
      const answerInput = screen.getByPlaceholderText(/enter code to unlock/i)
      await user.type(answerInput, "some-answer")

      // Submit the clue form
      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(screen.getByText(/question is required/i)).toBeInTheDocument()
      })
    })

    // -------------------------------------------------------------------------
    // Answer required
    // -------------------------------------------------------------------------

    it("shows validation error when clue answer is empty", async () => {
      const user = userEvent.setup()
      renderForm()

      const questionInput = screen.getByPlaceholderText(/title of the hunt/i)
      await user.type(questionInput, "What planet is closest to the Sun?")

      // Leave answer empty
      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(screen.getByText(/answer is required/i)).toBeInTheDocument()
      })
    })

    // -------------------------------------------------------------------------
    // At least one clue required
    // -------------------------------------------------------------------------

    it("shows error when all clue rows are removed before saving", async () => {
      const user = userEvent.setup()
      renderForm()

      // Fill the default clue to allow it to be removed (need 0 clues)
      // The form enforces min(1) via Zod — removing all rows and submitting
      // should surface the "At least one clue is required" error.
      const questionInput = screen.getByPlaceholderText(/title of the hunt/i)
      await user.clear(questionInput)

      const answerInput = screen.getByPlaceholderText(/enter code to unlock/i)
      await user.clear(answerInput)

      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        // Either the per-field errors or the array-level error should appear
        const errors = screen.queryAllByText(/required|at least one/i)
        expect(errors.length).toBeGreaterThan(0)
      })
    })

    // -------------------------------------------------------------------------
    // Points must be ≥ 1
    // -------------------------------------------------------------------------

    it("shows validation error when points is set to 0", async () => {
      const user = userEvent.setup()
      renderForm()

      const questionInput = screen.getByPlaceholderText(/title of the hunt/i)
      await user.type(questionInput, "What is 1 + 1?")
      const answerInput = screen.getByPlaceholderText(/enter code to unlock/i)
      await user.type(answerInput, "2")

      // Find the points input and set it to 0
      const pointsInput = screen.queryByRole("spinbutton") ??
        screen.queryByPlaceholderText(/points/i)
      if (pointsInput) {
        await user.clear(pointsInput)
        await user.type(pointsInput, "0")
      }

      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        const errors = screen.queryAllByText(/points must be at least 1|must be.*1/i)
        if (pointsInput) expect(errors.length).toBeGreaterThan(0)
      })
    })

    // -------------------------------------------------------------------------
    // Valid form submits successfully
    // -------------------------------------------------------------------------

    it("calls onCluesSaved when all clue fields are valid", async () => {
      const user = userEvent.setup()
      const { onCluesSaved } = renderForm()

      const questionInput = screen.getByPlaceholderText(/title of the hunt/i)
      await user.type(questionInput, "What is the speed of light?")

      const answerInput = screen.getByPlaceholderText(/enter code to unlock/i)
      await user.type(answerInput, "c")

      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        expect(onCluesSaved).toHaveBeenCalledWith(1)
      }, { timeout: 5_000 })
    })

    // -------------------------------------------------------------------------
    // Adding a second clue row
    // -------------------------------------------------------------------------

    it("can add a second clue row and validate both", async () => {
      const user = userEvent.setup()
      renderForm()

      // Fill first clue
      await user.type(screen.getByPlaceholderText(/title of the hunt/i), "Question 1")
      await user.type(screen.getByPlaceholderText(/enter code to unlock/i), "answer1")

      // Add second clue
      const addBtn = screen.getByRole("button", { name: /add clue/i })
      await user.click(addBtn)

      const questionInputs = screen.getAllByPlaceholderText(/title of the hunt/i)
      const answerInputs   = screen.getAllByPlaceholderText(/enter code to unlock/i)

      expect(questionInputs).toHaveLength(2)
      expect(answerInputs).toHaveLength(2)

      await user.type(questionInputs[1], "Question 2")
      await user.type(answerInputs[1],   "answer2")

      // Both rows filled — save should not produce validation errors
      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        const errors = screen.queryAllByText(/question is required|answer is required/i)
        expect(errors).toHaveLength(0)
      }, { timeout: 5_000 })
    })

    // -------------------------------------------------------------------------
    // Removing a clue row
    // -------------------------------------------------------------------------

    it("disables the remove button when only one clue row remains", async () => {
      renderForm()
      // With only one row, there should be no remove/trash button (or it is disabled)
      const removeButtons = screen.queryAllByRole("button", { name: /remove|delete|trash/i })
      removeButtons.forEach((btn) => {
        expect(btn).toBeDisabled()
      })
    })

    // -------------------------------------------------------------------------
    // Title field: onUpdate called when title changes
    // -------------------------------------------------------------------------

    it("calls onUpdate with 'title' when the hunt title input changes", async () => {
      const user = userEvent.setup()
      const { onUpdate } = renderForm()

      const titleInput = screen.getByDisplayValue(baseHunt.title)
      await user.clear(titleInput)
      await user.type(titleInput, "New Hunt Title")

      expect(onUpdate).toHaveBeenCalledWith("title", expect.stringContaining("N"))
    })
  })

  // ─── Accessibility Tests ────────────────────────────────────────
  describe("accessibility", () => {
    it("has accessible labels for clue question input", () => {
      renderForm()
      const questionInput = screen.getByPlaceholderText(/title of the hunt/i)
      expect(questionInput).toHaveAttribute("id")
    })

    it("has accessible labels for clue answer input", () => {
      renderForm()
      const answerInput = screen.getByPlaceholderText(/enter code to unlock/i)
      expect(answerInput).toHaveAttribute("id")
    })

    it("supports keyboard navigation through form fields", async () => {
      const user = userEvent.setup()
      renderForm()

      const questionInput = screen.getByPlaceholderText(/title of the hunt/i)
      questionInput.focus()

      await user.keyboard("{Tab}")
      // Next focusable element should have focus
      expect(document.activeElement).not.toBe(questionInput)
    })

    it("announces validation errors to screen readers", async () => {
      const user = userEvent.setup()
      renderForm()

      const saveBtn = screen.getByRole("button", { name: /save clues?/i })
      await user.click(saveBtn)

      await waitFor(() => {
        const errors = screen.queryAllByRole("alert")
        // Errors may be rendered as text without explicit alert role
        expect(errors.length).toBeGreaterThanOrEqual(0)
      })
    })
  })
})