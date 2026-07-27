import { describe, expect, it } from "vitest"
import {
  autocompleteTags,
  huntMatchesTags,
  normalizeTag,
  normalizeTags,
  suggestTagsFromContent,
} from "../tags"
import { getCategory, HUNT_CATEGORIES, isHuntCategoryId } from "../categories"

describe("categories", () => {
  it("includes Adventure, Education, City, Nature", () => {
    const labels = HUNT_CATEGORIES.map((c) => c.label)
    expect(labels).toEqual(
      expect.arrayContaining(["Adventure", "Education", "City", "Nature"]),
    )
  })

  it("exposes icon and color for each category", () => {
    for (const cat of HUNT_CATEGORIES) {
      expect(cat.icon).toBeTruthy()
      expect(cat.color).toMatch(/^#/)
      expect(getCategory(cat.id)?.id).toBe(cat.id)
    }
  })

  it("validates category ids", () => {
    expect(isHuntCategoryId("city")).toBe(true)
    expect(isHuntCategoryId("nope")).toBe(false)
  })
})

describe("tags", () => {
  it("normalizes tags", () => {
    expect(normalizeTag("  Outdoor Walk! ")).toBe("outdoor-walk")
    expect(normalizeTags(["A", "a", "B"])).toEqual(["a", "b"])
  })

  it("autocompletes from corpus", () => {
    expect(autocompleteTags("mu", ["mural", "museum", "park"])).toEqual(
      expect.arrayContaining(["mural", "museum"]),
    )
  })

  it("suggests tags from hunt content", () => {
    const suggestions = suggestTagsFromContent({
      title: "City mural treasure hunt",
      description: "Find outdoor landmarks downtown",
    })
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions).toEqual(expect.arrayContaining(["mural", "outdoor", "treasure"]))
  })

  it("matches hunt tags against filters", () => {
    expect(huntMatchesTags(["mural", "city"], ["mural"])).toBe(true)
    expect(huntMatchesTags(["mural"], ["park"])).toBe(false)
    expect(huntMatchesTags(undefined, [])).toBe(true)
  })
})
