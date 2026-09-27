// components/__tests__/breadcrumbs.test.ts
import { describe, it, expect } from "vitest";
import {
  generateBreadcrumbs,
  truncateBreadcrumbs,
  ROUTE_LABELS,
  defaultResolver,
} from "@/lib/breadcrumbs";

describe("generateBreadcrumbs", () => {
  it("returns only Home for root path", () => {
    const crumbs = generateBreadcrumbs("/");
    expect(crumbs).toHaveLength(1);
    expect(crumbs[0]).toEqual({ label: "Home", href: "/", isCurrent: false });
  });

  it("generates correct crumbs for a known route", () => {
    const crumbs = generateBreadcrumbs("/hunts");
    expect(crumbs).toHaveLength(2);
    expect(crumbs[1]).toEqual({
      label: "Hunts",
      href: "/hunts",
      isCurrent: true,
    });
  });

  it("marks only the last segment as current", () => {
    const crumbs = generateBreadcrumbs("/hunts/abc/clues/edit");
    const currentItems = crumbs.filter((c) => c.isCurrent);
    expect(currentItems).toHaveLength(1);
    expect(currentItems[0].href).toBe("/hunts/abc/clues/edit");
  });

  it("accumulates hrefs correctly", () => {
    const crumbs = generateBreadcrumbs("/hunts/abc/clues");
    expect(crumbs.map((c) => c.href)).toEqual(["/", "/hunts", "/hunts/abc", "/hunts/abc/clues"]);
  });

  it("applies ROUTE_LABELS for known segments", () => {
    const crumbs = generateBreadcrumbs("/dashboard/analytics");
    const labels = crumbs.map((c) => c.label);
    expect(labels).toContain("Dashboard");
    expect(labels).toContain("Analytics");
  });

  it("uses custom labels over ROUTE_LABELS", () => {
    const crumbs = generateBreadcrumbs("/hunts/abc-123", {
      "/hunts/abc-123": "Summer City Hunt",
    });
    const huntCrumb = crumbs.find((c) => c.href === "/hunts/abc-123");
    expect(huntCrumb?.label).toBe("Summer City Hunt");
  });

  it("uses custom label keyed by segment name", () => {
    const crumbs = generateBreadcrumbs("/hunts", { hunts: "All Hunts" });
    expect(crumbs[1].label).toBe("All Hunts");
  });

  it("falls back to dynamic resolver for UUID segments", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    const crumbs = generateBreadcrumbs(`/hunts/${uuid}`);
    const dynamic = crumbs.find((c) => c.href === `/hunts/${uuid}`);
    expect(dynamic?.label).toBe("Hunt #550e84");
  });

  it("humanises unknown slug segments", () => {
    const crumbs = generateBreadcrumbs("/hunts/my-cool-hunt");
    const seg = crumbs.find((c) => c.href === "/hunts/my-cool-hunt");
    expect(seg?.label).toBe("My Cool Hunt");
  });

  it("uses a custom resolver when provided", () => {
    const resolver = (segment: string) =>
      segment === "special-id" ? "Special Hunt Name" : null;
    const crumbs = generateBreadcrumbs("/hunts/special-id", {}, resolver);
    const seg = crumbs.find((c) => c.href === "/hunts/special-id");
    expect(seg?.label).toBe("Special Hunt Name");
  });
});

describe("truncateBreadcrumbs", () => {
  const makeCrumbs = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      label: `Segment ${i}`,
      href: `/seg-${i}`,
      isCurrent: i === n - 1,
    }));

  it("returns all crumbs when under the limit", () => {
    const crumbs = makeCrumbs(4);
    expect(truncateBreadcrumbs(crumbs, 4)).toHaveLength(4);
  });

  it("inserts an ellipsis sentinel for long paths", () => {
    const crumbs = makeCrumbs(6);
    const result = truncateBreadcrumbs(crumbs, 4);
    const hasEllipsis = result.some((r) => "ellipsis" in r);
    expect(hasEllipsis).toBe(true);
  });

  it("always keeps the first and last items", () => {
    const crumbs = makeCrumbs(7);
    const result = truncateBreadcrumbs(crumbs, 4);
    const nonEllipsis = result.filter((r) => !("ellipsis" in r)) as typeof crumbs;
    expect(nonEllipsis[0].href).toBe("/seg-0");
    expect(nonEllipsis[nonEllipsis.length - 1].href).toBe("/seg-6");
  });

  it("total visible items does not exceed maxVisible", () => {
    const crumbs = makeCrumbs(10);
    const result = truncateBreadcrumbs(crumbs, 4);
    expect(result.length).toBeLessThanOrEqual(4 + 1); // +1 for ellipsis sentinel
  });
});

describe("defaultResolver", () => {
  it("recognises UUID-shaped segments", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(defaultResolver(uuid, `/hunts/${uuid}`)).toBe("Hunt #550e84");
  });

  it("returns null for non-UUID segments", () => {
    expect(defaultResolver("my-hunt-slug", "/hunts/my-hunt-slug")).toBeNull();
  });
});