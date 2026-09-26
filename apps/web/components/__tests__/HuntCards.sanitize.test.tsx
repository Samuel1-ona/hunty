import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { sanitizeHtml } from "@/lib/sanitizeHtml"
import type { HuntCard } from "@/lib/types"

import { HuntCards } from "../HuntCards"

// ── mocks (same set as HuntCards.test.tsx) ───────────────────────────────────
vi.mock("@/lib/contracts/hunt", () => ({
  submitAnswer: vi.fn(),
  pollTransaction: vi.fn(),
  AnswerIncorrectError: class AnswerIncorrectError extends Error {
    constructor() { super("Incorrect"); this.name = "AnswerIncorrectError" }
  },
}))

vi.mock("canvas-confetti", () => ({ default: vi.fn() }))

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

// HuntCards calls next-intl's `useTranslations` for aria-labels. Tests here do
// not assert translated copy, so keep the real module but return the key —
// this lets the component render in isolation without the app's intl provider.
vi.mock("next-intl", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("next-intl")
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  }
})

// Wrap the real sanitizer so a single test can flip it to a no-op while every
// other test (including HuntCards' default import) keeps real DOMPurify
// behaviour. This is what proves the stripping assertions are meaningful.
const sanitizerState = vi.hoisted(() => ({ noop: false }))

vi.mock("@/lib/sanitizeHtml", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sanitizeHtml")>()
  const realSanitize = actual.sanitizeHtml
  const wrap = (fn: (html: string) => string) => (html: string) =>
    sanitizerState.noop ? html : fn(html)
  return {
    ...actual,
    default: wrap(realSanitize),
    sanitizeHtml: wrap(realSanitize),
  }
})

// ── payloads & assertions ────────────────────────────────────────────────────

const XSS_PAYLOADS: Array<{ name: string; payload: string }> = [
  { name: "img onerror", payload: '<img src=x onerror="alert(1)">' },
  { name: "svg onload", payload: '<svg onload="alert(1)"></svg>' },
  { name: "javascript: href", payload: '<a href="javascript:alert(1)">click</a>' },
  { name: "script tag", payload: "<script>alert(1)</script>" },
  { name: "iframe javascript: src", payload: '<iframe src="javascript:alert(1)"></iframe>' },
  { name: "data:text/html URI", payload: '<img src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">' },
  { name: "onclick handler", payload: '<button onclick="alert(1)">press</button>' },
  { name: "onmouseover handler", payload: '<div onmouseover="alert(1)">hover</div>' },
]

const DANGEROUS_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "event-handler attribute", re: /\son[a-z]+\s*=/i },
  { label: "javascript: URL", re: /javascript:/i },
  { label: "<script> tag", re: /<script/i },
  { label: "svg onload handler", re: /<svg[^>]*\sonload/i },
  { label: "data:text/html URI", re: /data:text\/html/i },
]

function expectNoXss(output: string, context: string) {
  for (const { label, re } of DANGEROUS_PATTERNS) {
    expect(output, `${label} must be stripped (${context})`).not.toMatch(re)
  }
}

afterEach(() => {
  sanitizerState.noop = false
})

// ── sanitizer unit tests ─────────────────────────────────────────────────────

describe("sanitizeHtml — XSS payload stripping", () => {
  it.each(XSS_PAYLOADS)("strips $name", ({ name, payload }) => {
    expectNoXss(sanitizeHtml(payload), name)
  })

  it("keeps benign markup and only drops the executable handler", () => {
    const output = sanitizeHtml('<img src=x onerror="alert(1)">')
    expect(output).toMatch(/<img/i)
    expect(output).not.toMatch(/onerror/i)
  })
})

// ── component-level tests ────────────────────────────────────────────────────

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

describe("HuntCards — creator content is sanitized before dangerouslySetInnerHTML", () => {
  it("strips payloads from the rendered description", () => {
    const description =
      '<img src=x onerror="alert(1)"><script>alert(2)</script>Delicious clue'
    const { container } = render(
      <HuntCards {...defaultProps} hunts={[{ ...baseHunt, description }]} />
    )

    expect(container.innerHTML).toContain("Delicious clue")
    expectNoXss(container.innerHTML, "rendered description")
  })

  it("strips payloads from the rendered hint once revealed", () => {
    const hint =
      '<svg onload="alert(1)"></svg><a href="javascript:alert(1)">Look closer</a>'
    const { container } = render(
      <HuntCards {...defaultProps} hunts={[{ ...baseHunt, hint, hintCost: 5 }]} />
    )

    fireEvent.click(screen.getByRole("button", { name: /Reveal Hint/i }))

    expect(container.innerHTML).toContain("Look closer")
    expectNoXss(container.innerHTML, "rendered hint")
  })

  it("is meaningful — a no-op sanitizer lets the payload reach the DOM", () => {
    sanitizerState.noop = true
    const description = '<img src=x onerror="alert(1)">'
    const { container } = render(
      <HuntCards {...defaultProps} hunts={[{ ...baseHunt, description }]} />
    )

    // With a no-op sanitizer the raw handler survives, so the `expectNoXss`
    // assertions used above would fail — proving they actually test something.
    expect(container.innerHTML).toMatch(/onerror=/i)
  })
})
