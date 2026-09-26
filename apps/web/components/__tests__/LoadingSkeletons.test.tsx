import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import React from "react"
import {
  AdminTableSkeleton,
  DetailHeaderSkeleton,
  FormFieldSkeleton,
  FormPageSkeletonLayout,
  GalleryGridSkeleton,
  GenericPageSkeleton,
  HuntCardSkeleton,
  HuntCardSkeletonGrid,
  HuntPageSkeletonLayout,
  LeaderboardRowSkeleton,
  LeaderboardTableSkeleton,
  ProfileHistorySkeleton,
  ProfilePageSkeleton,
  ProfileSectionSkeleton,
  StatsCardSkeleton,
  TemplateCardSkeleton,
} from "../LoadingSkeletons"

describe("LoadingSkeletons Component Suite", () => {
  it("renders HuntCardSkeleton with aria-hidden", () => {
    const { container } = render(<HuntCardSkeleton />)
    const card = container.firstChild as HTMLElement
    expect(card).toBeDefined()
    expect(card.getAttribute("aria-hidden")).toBe("true")
  })

  it("renders HuntCardSkeletonGrid with expected count", () => {
    const { container } = render(<HuntCardSkeletonGrid count={3} />)
    expect(container.querySelectorAll("[aria-hidden='true']").length).toBe(3)
  })

  it("renders LeaderboardRowSkeleton and LeaderboardTableSkeleton", () => {
    const { container } = render(
      <table>
        <tbody>
          <LeaderboardTableSkeleton count={4} />
        </tbody>
      </table>
    )
    expect(container.querySelectorAll("tr").length).toBe(4)
  })

  it("renders AdminTableSkeleton with role status", () => {
    const { getByRole } = render(<AdminTableSkeleton rows={5} />)
    const status = getByRole("status")
    expect(status).toBeDefined()
    expect(status.getAttribute("aria-label")).toBe("Loading admin table")
  })

  it("renders StatsCardSkeleton with role status", () => {
    const { getByRole } = render(<StatsCardSkeleton count={3} />)
    const status = getByRole("status")
    expect(status).toBeDefined()
    expect(status.getAttribute("aria-label")).toBe("Loading statistics")
  })

  it("renders GalleryGridSkeleton", () => {
    const { getByRole } = render(<GalleryGridSkeleton count={4} />)
    const status = getByRole("status")
    expect(status).toBeDefined()
    expect(status.getAttribute("aria-label")).toBe("Loading gallery")
  })

  it("renders TemplateCardSkeleton", () => {
    const { getByRole } = render(<TemplateCardSkeleton count={4} />)
    const status = getByRole("status")
    expect(status).toBeDefined()
    expect(status.getAttribute("aria-label")).toBe("Loading templates")
  })

  it("renders ProfileHistorySkeleton", () => {
    const { getByRole } = render(<ProfileHistorySkeleton count={3} />)
    const status = getByRole("status")
    expect(status).toBeDefined()
    expect(status.getAttribute("aria-label")).toBe("Loading profile history")
  })

  it("renders DetailHeaderSkeleton", () => {
    const { getByRole } = render(<DetailHeaderSkeleton />)
    const status = getByRole("status")
    expect(status).toBeDefined()
  })

  it("renders GenericPageSkeleton", () => {
    const { getByRole } = render(<GenericPageSkeleton />)
    const status = getByRole("status")
    expect(status).toBeDefined()
  })
})
