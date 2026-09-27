import { describe, expect, it } from "vitest"

import {
  STARTER_HUNT_TEMPLATES,
  buildDraftHuntsFromTemplate,
  getStarterTemplateBySlug,
} from "@/lib/huntTemplates"

describe("hunt templates", () => {
  it("ships at least five starter templates", () => {
    expect(STARTER_HUNT_TEMPLATES.length).toBeGreaterThanOrEqual(5)
  })

  it("ensures every starter template includes at least three sample clues", () => {
    for (const template of STARTER_HUNT_TEMPLATES) {
      expect(template.clues.length).toBeGreaterThanOrEqual(3)
    }
  })

  it("builds editable draft hunts from a selected template", () => {
    const template = getStarterTemplateBySlug("city-walking-tour")

    expect(template).toBeDefined()

    const draftHunts = buildDraftHuntsFromTemplate(template!)

    expect(draftHunts).toEqual([
      {
        id: 1,
        title: "Mural at Sunrise Alley",
        description: "Find the alley mural with the giant orange sun and note the year painted in the corner.",
        link: "",
        code: "2019",
        image: "",
      },
      {
        id: 2,
        title: "Clocktower Countdown",
        description: "Head to the old clocktower and enter the number shown on the face nearest the market square.",
        link: "",
        code: "12",
        image: "",
      },
      {
        id: 3,
        title: "Bridge With the Brass Plaque",
        description: "Cross the pedestrian bridge and use the surname engraved on the brass dedication plaque.",
        link: "",
        code: "adeyemi",
        image: "",
      },
    ])
  })
})
