import { beforeEach, describe, expect, it } from "vitest"

import {
  COMMUNITY_TEMPLATES_STORAGE_KEY,
  MIN_TEMPLATE_CLUES,
  addCommunityTemplate,
  getCommunityTemplateBySlug,
  getCommunityTemplates,
  slugify,
  validateCommunityTemplateInput,
  type CommunityTemplateInput,
} from "@/lib/communityTemplates"

function validInput(
  overrides: Partial<CommunityTemplateInput> = {},
): CommunityTemplateInput {
  return {
    title: "Riverside Photo Quest",
    description: "A relaxed photo hunt along the river path.",
    category: "Outdoor",
    estimatedDuration: "30-45 min",
    author: "Ada",
    clues: Array.from({ length: MIN_TEMPLATE_CLUES }, (_, i) => ({
      title: `Clue ${i + 1}`,
      description: `Find landmark number ${i + 1}.`,
      code: `code${i + 1}`,
    })),
    ...overrides,
  }
}

describe("community templates", () => {
  beforeEach(() => {
    window.localStorage.removeItem(COMMUNITY_TEMPLATES_STORAGE_KEY)
  })

  it("slugifies titles into URL-safe slugs", () => {
    expect(slugify("Riverside Photo Quest!")).toBe("riverside-photo-quest")
    expect(slugify("  Multiple   Spaces  ")).toBe("multiple-spaces")
  })

  it("persists a valid submission and reads it back", () => {
    const saved = addCommunityTemplate(validInput())

    expect(saved.isCommunity).toBe(true)
    expect(saved.slug).toBe("riverside-photo-quest")
    expect(getCommunityTemplates()).toHaveLength(1)
    expect(getCommunityTemplateBySlug(saved.slug)?.title).toBe(
      "Riverside Photo Quest",
    )
  })

  it("assigns unique slugs when titles collide", () => {
    const first = addCommunityTemplate(validInput())
    const second = addCommunityTemplate(validInput())

    expect(first.slug).toBe("riverside-photo-quest")
    expect(second.slug).toBe("riverside-photo-quest-2")
  })

  it("returns newest templates first", () => {
    addCommunityTemplate(validInput({ title: "First Hunt" }))
    addCommunityTemplate(validInput({ title: "Second Hunt" }))

    const [newest] = getCommunityTemplates()
    expect(newest.title).toBe("Second Hunt")
  })

  it("rejects submissions with too few complete clues", () => {
    const input = validInput({
      clues: [{ title: "Only one", description: "Just one clue here", code: "x" }],
    })

    expect(validateCommunityTemplateInput(input)).toMatch(/at least/i)
    expect(() => addCommunityTemplate(input)).toThrow()
    expect(getCommunityTemplates()).toHaveLength(0)
  })

  it("rejects submissions with a missing author or short title", () => {
    expect(validateCommunityTemplateInput(validInput({ author: "" }))).toMatch(
      /name/i,
    )
    expect(validateCommunityTemplateInput(validInput({ title: "Hi" }))).toMatch(
      /title/i,
    )
  })

  it("ignores clues that are only partially filled", () => {
    const input = validInput({
      clues: [
        ...Array.from({ length: MIN_TEMPLATE_CLUES }, (_, i) => ({
          title: `Clue ${i + 1}`,
          description: `Find landmark ${i + 1}.`,
          code: `code${i + 1}`,
        })),
        { title: "Half done", description: "", code: "" },
      ],
    })

    const saved = addCommunityTemplate(input)
    expect(saved.clues).toHaveLength(MIN_TEMPLATE_CLUES)
  })
})
