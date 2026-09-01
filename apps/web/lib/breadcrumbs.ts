// lib/breadcrumbs.ts

/**
 * Custom label map for route segments.
 * Keys are exact path segments (e.g. "hunts", "create").
 * Dynamic segments like [id] are resolved at runtime via the resolver below.
 */
export const ROUTE_LABELS: Record<string, string> = {
  // Top-level
  hunts: "Hunts",
  create: "Create Hunt",
  play: "Play",
  rewards: "Rewards",
  leaderboard: "Leaderboard",
  dashboard: "Dashboard",
  profile: "Profile",
  settings: "Settings",
  community: "Community",
  // Nested
  edit: "Edit",
  preview: "Preview",
  clues: "Clues",
  nft: "NFT",
  claim: "Claim Reward",
  mint: "Mint",
  complete: "Complete",
  progress: "Progress",
  wallet: "Wallet",
  analytics: "Analytics",
  templates: "Templates",
};

/**
 * Dynamic segment resolver.
 * Called when a segment looks like a dynamic param (e.g. UUID, slug).
 * Returns a human-readable label, or null to fall back to the raw segment.
 *
 * In a real app, wire this to your data store / API.
 */
export type DynamicLabelResolver = (
  segment: string,
  fullPath: string
) => string | null;

/** Default resolver — replace with real data lookups in production. */
export const defaultResolver: DynamicLabelResolver = (segment) => {
  // UUID-shaped segments → "Hunt #abc123"
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment
    )
  ) {
    return `Hunt #${segment.slice(0, 6)}`;
  }
  return null;
};

export interface BreadcrumbItem {
  label: string;
  href: string;
  /** True for the final (current) segment — not clickable */
  isCurrent: boolean;
}

/**
 * Generate breadcrumb items from a Next.js pathname.
 *
 * @param pathname   e.g. "/hunts/abc-123/clues/edit"
 * @param customLabels  optional per-page overrides (e.g. the hunt's real title)
 * @param resolver   optional async-resolved labels for dynamic segments
 */
export function generateBreadcrumbs(
  pathname: string,
  customLabels: Record<string, string> = {},
  resolver: DynamicLabelResolver = defaultResolver
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: BreadcrumbItem[] = [
    { label: "Home", href: "/", isCurrent: false },
  ];

  let cumulativePath = "";

  segments.forEach((segment, index) => {
    cumulativePath += `/${segment}`;
    const isCurrent = index === segments.length - 1;

    // Priority: explicit custom label > ROUTE_LABELS map > dynamic resolver > raw segment
    const label =
      customLabels[cumulativePath] ??
      customLabels[segment] ??
      ROUTE_LABELS[segment] ??
      resolver(segment, cumulativePath) ??
      // Humanise slugs: "my-hunt-title" → "My Hunt Title"
      segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

    crumbs.push({ label, href: cumulativePath, isCurrent });
  });

  return crumbs;
}

/**
 * Truncate breadcrumb list for long paths.
 * Keeps the first item (Home), an ellipsis sentinel, and the last N items.
 */
export function truncateBreadcrumbs(
  crumbs: BreadcrumbItem[],
  maxVisible = 4
): (BreadcrumbItem | { ellipsis: true })[] {
  if (crumbs.length <= maxVisible) return crumbs;

  const head = crumbs[0];
  const tail = crumbs.slice(-(maxVisible - 2)); // leave room for head + ellipsis
  return [head, { ellipsis: true as const }, ...tail];
}