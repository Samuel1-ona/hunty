/**
 * Tests for the HuntDashboard component.
 *
 * HuntDashboard is a controlled, presentational component. All pagination
 * state lives in the parent (DashboardPageClient) and flows in via props.
 * These tests drive the component through a thin harness that mirrors the
 * parent's pagination logic using getHuntHistoryView.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getHuntHistoryView,
  HUNT_HISTORY_PAGE_SIZE,
  type HuntHistorySortOption,
  type HuntHistoryStatusFilter,
} from "@/lib/huntHistory";
import type { StoredHunt } from "@/lib/types";

// ── External dependencies ─────────────────────────────────────────────────────

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) {
      return Object.entries(params).reduce(
        (result, [k, v]) => result.replace(`{${k}}`, String(v)),
        key
      );
    }
    return key;
  },
}));

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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// ── Sub-component mocks ───────────────────────────────────────────────────────
// Render a minimal placeholder so the tree doesn't blow up on missing context.

vi.mock("@/components/ActivateHuntModal", () => ({
  ActivateHuntModal: () => null,
}));

vi.mock("@/components/CreatorAnalytics", () => ({
  CreatorAnalytics: () => <div data-testid="creator-analytics" />,
}));

vi.mock("@/components/HuntInviteControls", () => ({
  HuntInviteControls: () => null,
}));

vi.mock("@/components/LeaderBoardTable", () => ({
  LeaderboardTable: () => null,
}));

vi.mock("@/components/RewardPoolManager", () => ({
  RewardPoolManager: () => null,
}));

vi.mock("@/components/StarRating", () => ({
  StarRating: () => null,
}));

// ── huntStore mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/huntStore", () => ({
  archiveHunts: vi.fn(),
  deleteHunts: vi.fn(),
  duplicateHunt: vi.fn(),
}));

// ── Component under test ──────────────────────────────────────────────────────

import { HuntDashboard } from "@/components/HuntDashboard";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeHunt(id: number, overrides: Partial<StoredHunt> = {}): StoredHunt {
  return {
    id,
    title: `Hunt ${id}`,
    description: `Description for hunt ${id}`,
    cluesCount: 2,
    status: "Draft",
    rewardType: "XLM",
    rewardPool: id * 10,
    playerCount: id,
    createdAt: 1_000_000 + id,
    ...overrides,
  };
}

function makeHunts(count: number, overrides: Partial<StoredHunt> = {}): StoredHunt[] {
  return Array.from({ length: count }, (_, i) => makeHunt(i + 1, overrides));
}

// ── Harness ───────────────────────────────────────────────────────────────────
// Mirrors the parent (DashboardPageClient) pagination logic so we can test
// navigation without needing a Next.js router.

interface HarnessProps {
  allHunts: StoredHunt[];
  initialPage?: number;
  initialStatus?: HuntHistoryStatusFilter;
  initialSort?: HuntHistorySortOption;
  onRefresh?: () => void;
  onPageChange?: (page: number) => void;
}

function HuntDashboardHarness({
  allHunts,
  initialPage = 1,
  initialStatus = "all",
  initialSort = "newest",
  onRefresh = vi.fn(),
  onPageChange,
}: HarnessProps) {
  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<HuntHistoryStatusFilter>(initialStatus);
  const [sort, setSort] = useState<HuntHistorySortOption>(initialSort);

  const view = getHuntHistoryView(allHunts, { status, sort, page });

  const handlePageChange = (next: number) => {
    setPage(next);
    onPageChange?.(next);
  };

  return (
    <HuntDashboard
      hunts={view.pageHunts}
      totalHunts={view.totalHunts}
      filteredCount={view.filteredCount}
      currentPage={view.currentPage}
      totalPages={view.totalPages}
      pageSize={view.pageSize}
      startItem={view.startItem}
      endItem={view.endItem}
      statusFilter={status}
      sortOption={sort}
      onStatusFilterChange={(s) => {
        setStatus(s);
        setPage(1);
      }}
      onSortChange={(s) => {
        setSort(s);
        setPage(1);
      }}
      onPageChange={handlePageChange}
      onActivate={vi.fn()}
      onRefresh={onRefresh}
      onSaveClues={vi.fn()}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("HuntDashboard — page size constant", () => {
  it("uses 20 hunts per page", () => {
    expect(HUNT_HISTORY_PAGE_SIZE).toBe(20);
  });
});

describe("HuntDashboard — paginated rendering with 200+ hunts", () => {
  const ALL_HUNTS = makeHunts(205);

  it("renders only 20 hunts on the first page, not all 205", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    // Count rendered hunt title elements; titles are unique (Hunt 1 … Hunt 205)
    // getHuntHistoryView sorts by newest (highest createdAt first), so page 1
    // shows hunts 205 down to 186.
    const titles = screen.getAllByText(/^Hunt \d+$/).filter((el) => el.tagName !== "TITLE");

    expect(titles).toHaveLength(20);
  });

  it("shows total hunt count header", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    expect(screen.getByText("205 total hunts")).toBeInTheDocument();
  });

  it("shows current page and total pages", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    expect(screen.getByText("Page 1 of 11")).toBeInTheDocument();
  });

  it("shows correct showing range on first page", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    expect(screen.getByText("Showing 1-20")).toBeInTheDocument();
  });

  it("shows correct showing range on the last page (5 hunts)", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={11} />);

    expect(screen.getByText("Showing 201-205")).toBeInTheDocument();
    const titles = screen.getAllByText(/^Hunt \d+$/).filter((el) => el.tagName !== "TITLE");
    expect(titles).toHaveLength(5);
  });
});

describe("HuntDashboard — pagination navigation", () => {
  const ALL_HUNTS = makeHunts(45); // 3 pages of 20, 5, 20 — wait: 45/20 = 3 pages (20, 20, 5)

  it("disables Previous button on page 1", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
  });

  it("disables Next button on the last page", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={3} />);

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).not.toBeDisabled();
  });

  it("navigates forward with Next button", () => {
    const onPageChange = vi.fn();
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Showing 21-40")).toBeInTheDocument();
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("navigates backward with Previous button", () => {
    const onPageChange = vi.fn();
    render(
      <HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={2} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("navigates to a specific page by clicking a page number button", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    // Page buttons rendered: 1 (current), 2, 3
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(screen.getByText("Showing 41-45")).toBeInTheDocument();
  });

  it("renders the correct page number as active/highlighted", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={2} />);

    const page2Btn = screen.getByRole("button", { name: "2" });
    // Active page button uses the indigo bg-[#3737A4] variant
    expect(page2Btn.className).toMatch(/bg-\[#3737A4\]/);
  });
});

describe("HuntDashboard — pagination with 200+ hunts, ellipsis navigation", () => {
  const ALL_HUNTS = makeHunts(205); // 11 pages

  it("shows ellipsis between page 1 and current window when on a middle page", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={6} />);

    // Ellipsis characters should be present for gaps
    const ellipses = screen.getAllByText("…");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it("shows page 1 and last page in pagination regardless of current page", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={6} />);

    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "11" })).toBeInTheDocument();
  });

  it("navigating from page 1 to page 11 in multiple steps reaches the last page", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    // Jump directly to page 2 first (page 2 button visible from page 1)
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Page 2 of 11")).toBeInTheDocument();

    // From page 2, button 1, 2 (active), 3, 11 are visible
    fireEvent.click(screen.getByRole("button", { name: "11" }));
    expect(screen.getByText("Page 11 of 11")).toBeInTheDocument();
    expect(screen.getByText("Showing 201-205")).toBeInTheDocument();
    // Only 5 hunts on last page
    const titles = screen.getAllByText(/^Hunt \d+$/).filter((el) => el.tagName !== "TITLE");
    expect(titles).toHaveLength(5);
  });
});

describe("HuntDashboard — batch selection across pages", () => {
  const ALL_HUNTS = makeHunts(45); // 3 pages

  it("selecting items on page 1 persists when navigating to page 2", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    // Select all items on page 1 via Select Page checkbox
    const selectAll = screen.getByLabelText("Select Page");
    fireEvent.click(selectAll);

    // Verify 20 items selected (page 1 has 20 hunts)
    expect(screen.getByText("20 selected")).toBeInTheDocument();

    // Navigate to page 2
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    // Selection count persists across page navigation
    expect(screen.getByText("20 selected")).toBeInTheDocument();
  });

  it("can select items on multiple pages, accumulating count", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    // Select all on page 1
    fireEvent.click(screen.getByLabelText("Select Page"));
    expect(screen.getByText("20 selected")).toBeInTheDocument();

    // Go to page 2, select all there too
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByLabelText("Select Page"));

    // Now 40 hunts selected across 2 pages
    expect(screen.getByText("40 selected")).toBeInTheDocument();
  });

  it("shows batch action bar when items are selected", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    // Initially no batch action bar
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Select Page"));

    // Batch action bar appears
    expect(screen.getByRole("button", { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it("clearing selection hides the batch action bar", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    fireEvent.click(screen.getByLabelText("Select Page"));
    expect(screen.getByText("20 selected")).toBeInTheDocument();

    // Click the X clear button
    fireEvent.click(screen.getByRole("button", { name: "" }).closest("button")!);
    // The X button is the last button in the batch bar — find it by querying
    const clearBtn = screen
      .getAllByRole("button")
      .find((btn) => btn.className.includes("px-2") && btn.className.includes("text-slate-500"));
    if (clearBtn) fireEvent.click(clearBtn);

    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
  });

  it("toggleSelectAll deselects when all visible hunts are already selected", () => {
    render(<HuntDashboardHarness allHunts={ALL_HUNTS} />);

    const selectAll = screen.getByLabelText("Select Page");

    // Select all
    fireEvent.click(selectAll);
    expect(screen.getByText("20 selected")).toBeInTheDocument();

    // Deselect all
    fireEvent.click(selectAll);
    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
  });

  it("individual checkbox toggles selection for a single hunt", () => {
    render(<HuntDashboardHarness allHunts={makeHunts(3)} />);

    const checkboxes = screen.getAllByRole("checkbox").slice(1); // skip "Select Page"
    fireEvent.click(checkboxes[0]!);

    expect(screen.getByText("1 selected")).toBeInTheDocument();
  });
});

describe("HuntDashboard — batch operations with cross-page selections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("batch archive operates on all selected IDs including off-page selections", async () => {
    const { archiveHunts } = await import("@/lib/huntStore");
    const mockedArchive = vi.mocked(archiveHunts);
    const refreshMock = vi.fn();
    const hunts = makeHunts(45);
    render(<HuntDashboardHarness allHunts={hunts} onRefresh={refreshMock} />);

    // Select page 1 (IDs sorted newest-first: IDs 45 down to 26)
    fireEvent.click(screen.getByLabelText("Select Page"));
    // Navigate to page 2 and add more
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByLabelText("Select Page"));

    // 40 items selected across 2 pages
    expect(screen.getByText("40 selected")).toBeInTheDocument();

    // Archive them
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    expect(mockedArchive).toHaveBeenCalledTimes(1);
    const archivedIds = mockedArchive.mock.calls[0]![0] as number[];
    expect(archivedIds).toHaveLength(40);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("batch delete operates on all selected IDs with confirmation", async () => {
    const { deleteHunts } = await import("@/lib/huntStore");
    const mockedDelete = vi.mocked(deleteHunts);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const refreshMock = vi.fn();
    const hunts = makeHunts(45);
    render(<HuntDashboardHarness allHunts={hunts} onRefresh={refreshMock} />);

    // Select page 1
    fireEvent.click(screen.getByLabelText("Select Page"));
    // Navigate to page 2 and add more
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByLabelText("Select Page"));

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    const deletedIds = mockedDelete.mock.calls[0]![0] as number[];
    expect(deletedIds).toHaveLength(40);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("batch delete does nothing when confirm is cancelled", async () => {
    const { deleteHunts } = await import("@/lib/huntStore");
    const mockedDelete = vi.mocked(deleteHunts);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<HuntDashboardHarness allHunts={makeHunts(10)} />);

    fireEvent.click(screen.getByLabelText("Select Page"));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("after batch archive, selection is cleared", async () => {
    const hunts = makeHunts(10);
    render(<HuntDashboardHarness allHunts={hunts} />);

    fireEvent.click(screen.getByLabelText("Select Page"));
    expect(screen.getByText("10 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /archive/i }));

    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument();
  });
});

describe("HuntDashboard — empty state and single page", () => {
  it("shows empty state message when no hunts match the filter", () => {
    render(<HuntDashboardHarness allHunts={[]} />);

    expect(screen.getByText("No hunts found for this filter")).toBeInTheDocument();
  });

  it("shows 'Everything fits on one page.' when filtered count <= pageSize", () => {
    render(<HuntDashboardHarness allHunts={makeHunts(5)} />);

    expect(screen.getByText("Everything fits on one page.")).toBeInTheDocument();
  });

  it("shows browsing message when filtered count > pageSize", () => {
    render(<HuntDashboardHarness allHunts={makeHunts(25)} />);

    expect(
      screen.getByText(`Browsing 25 hunts in pages of ${HUNT_HISTORY_PAGE_SIZE}.`)
    ).toBeInTheDocument();
  });
});

describe("HuntDashboard — status filter resets to page 1", () => {
  it("resets to page 1 when status filter changes", () => {
    const ALL_HUNTS = [
      ...makeHunts(25, { status: "Active" }),
      ...makeHunts(25, { id: 100, status: "Draft" }).map((h, i) => ({ ...h, id: 100 + i })),
    ];

    render(<HuntDashboardHarness allHunts={ALL_HUNTS} initialPage={2} />);

    // On page 2 with "all" filter
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();

    // Switch to "active" filter
    fireEvent.click(screen.getByRole("button", { name: "Active" }));

    // Should reset to page 1 of active hunts (25 active → 2 pages)
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });
});
