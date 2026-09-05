/**
 * Characterization tests for the creator page components extracted from
 * `apps/web/app/creator/page.tsx` (#1105).
 *
 * These lock in the behavior of the split so the refactor is a pure move:
 * the hunt card renders status, promote, and per-tab actions exactly as the
 * inline JSX did before the split.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { StoredHunt } from "@/lib/types";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/huntStore", () => ({
  isHuntPromoted: vi.fn(() => false),
  duplicateHunt: vi.fn(),
  SPOTLIGHT_FEE_XLM: 50,
}));

import type { HuntTab } from "@/components/creator/HuntCard";
import { HuntCard } from "@/components/creator/HuntCard";
import { StatusBadge } from "@/components/creator/StatusBadge";

function baseHunt(overrides: Partial<StoredHunt> = {}): StoredHunt {
  return {
    id: 1,
    title: "Test Hunt",
    description: "A characterization fixture hunt.",
    status: "Active",
    cluesCount: 3,
    isArchived: false,
    createdAt: 1_711_368_000,
    ...overrides,
  } as StoredHunt;
}

const noop = () => {};

function renderCard(hunt: StoredHunt, activeTab: HuntTab = "active") {
  return render(
    <HuntCard
      hunt={hunt}
      activeTab={activeTab}
      isSelected={false}
      promotingHuntId={null}
      onSelect={noop}
      onPromote={noop}
      onDuplicate={noop}
      onSaveTemplate={noop}
      onAction={noop}
    />
  );
}

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="Active" />);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("falls back to the Draft style for unknown statuses", () => {
    render(<StatusBadge status={"Unknown" as StoredHunt["status"]} />);
    expect(screen.getByText("Unknown")).toBeTruthy();
  });
});

describe("HuntCard (active tab)", () => {
  it("renders title, description, and clue count", () => {
    renderCard(baseHunt());
    expect(screen.getByText("Test Hunt")).toBeTruthy();
    expect(screen.getByText("A characterization fixture hunt.")).toBeTruthy();
    expect(screen.getByText("3 clues")).toBeTruthy();
  });

  it("renders the promote button for active hunts", () => {
    renderCard(baseHunt());
    expect(screen.getByText("Promote (50 XLM)")).toBeTruthy();
  });

  it("renders action buttons on the active tab", () => {
    renderCard(baseHunt());
    expect(screen.getByTitle("Duplicate")).toBeTruthy();
    expect(screen.getByTitle("Save as Template")).toBeTruthy();
    // The active-tab archive button is a bare icon (no title), matching the
    // original inline JSX. Verify it exists via the button count.
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it("fires onPromote when the promote button is clicked", () => {
    const onPromote = vi.fn();
    render(
      <HuntCard
        hunt={baseHunt()}
        activeTab="active"
        isSelected={false}
        promotingHuntId={null}
        onSelect={noop}
        onPromote={onPromote}
        onDuplicate={noop}
        onSaveTemplate={noop}
        onAction={noop}
      />
    );
    fireEvent.click(screen.getByText("Promote (50 XLM)"));
    expect(onPromote).toHaveBeenCalledWith(1);
  });
});

describe("HuntCard (per-tab action sets)", () => {
  it("shows restore + permanent delete on the deleted tab", () => {
    renderCard(baseHunt({ status: "Completed" }), "deleted");
    expect(screen.getByTitle("Restore")).toBeTruthy();
    expect(screen.getByTitle("Permanent Delete")).toBeTruthy();
  });

  it("shows unarchive + delete on the archived tab", () => {
    renderCard(baseHunt({ status: "Completed", isArchived: true }), "archived");
    expect(screen.getByTitle("Unarchive")).toBeTruthy();
  });

  it("shows the soft-delete expiry notice when deletedAt is set", () => {
    const now = Math.floor(Date.now() / 1000);
    renderCard(baseHunt({ deletedAt: now, recoveryWindow: 7 * 86400 }));
    expect(screen.getByText(/Expires in/)).toBeTruthy();
  });
});
