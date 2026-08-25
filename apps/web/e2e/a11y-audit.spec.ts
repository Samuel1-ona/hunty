/**
 * Axe-core accessibility audit — E2E
 *
 * Strategy
 * ─────────
 * • Every run checks the four main flows: landing (/), hunt detail (/hunt/[id]),
 *   play/create (/hunty), and the leaderboard (/leaderboard).
 * • Any *new* serious or critical violation immediately fails the build.
 * • Violations that were already present when the baseline was first recorded are
 *   allowed through so the build stays green while the team works them down.
 * • The baseline is committed to source control.  When a violation is fixed,
 *   remove its entry from the baseline file (or run `UPDATE_A11Y_BASELINE=true`
 *   to regenerate it from the current run).
 *
 * Burn-down plan
 * ──────────────
 * 1. Week 1 — Fix all critical violations (impact === "critical").
 * 2. Week 2-3 — Fix serious violations (impact === "serious").
 * 3. Week 4+ — Address moderate then minor violations.
 * Reviewers should refuse PRs that add new serious/critical violations.
 *
 * Running locally
 * ───────────────
 *   # Normal run (fails on new serious/critical violations)
 *   pnpm test:e2e -- e2e/a11y-audit.spec.ts
 *
 *   # Regenerate the baseline from the current state of the app
 *   UPDATE_A11Y_BASELINE=true pnpm test:e2e -- e2e/a11y-audit.spec.ts
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

// ─── Paths ──────────────────────────────────────────────────────────────────

const REPORT_DIR = path.join(process.cwd(), "test-results", "a11y-audit");
const BASELINE_FILE = path.join(process.cwd(), "e2e", "a11y-baseline.json");

// ─── Violation severity levels that must never regress ───────────────────────

const BLOCKING_IMPACTS = new Set(["critical", "serious"]);

// ─── Types ──────────────────────────────────────────────────────────────────

interface ViolationEntry {
  id: string;
  impact: string | null | undefined;
  description: string;
  nodes: number;
}

interface BaselineRecord {
  page: string;
  violations: ViolationEntry[];
  recordedAt: string;
  burnDownTarget: string;
}

type Baseline = Record<string, BaselineRecord>;

// ─── Baseline helpers ────────────────────────────────────────────────────────

function loadBaseline(): Baseline {
  if (!fs.existsSync(BASELINE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")) as Baseline;
  } catch {
    return {};
  }
}

function saveBaseline(baseline: Baseline): void {
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + "\n", "utf8");
}

function toEntry(v: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][0]): ViolationEntry {
  return {
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
  };
}

// ─── Report helpers ──────────────────────────────────────────────────────────

function saveReport(
  pageName: string,
  results: Awaited<ReturnType<AxeBuilder["analyze"]>>,
): void {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  const sanitized = pageName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  fs.writeFileSync(
    path.join(REPORT_DIR, `${sanitized}.json`),
    JSON.stringify(results, null, 2) + "\n",
    "utf8",
  );
}

// ─── Core audit function ─────────────────────────────────────────────────────

/**
 * Runs axe on the current page and asserts:
 *  1. No *new* serious or critical violations beyond what is in the baseline.
 *  2. The total number of serious/critical violations has not grown vs. baseline.
 *
 * When `UPDATE_A11Y_BASELINE=true` the function just records the current state
 * and always passes — useful for first runs or after deliberate resets.
 */
async function auditPage(page: Page, pageName: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .options({
      rules: {
        "color-contrast": { enabled: true },
        // Disable next/image related false-positives
        "image-redundant-alt": { enabled: true },
      },
    })
    .analyze();

  // Always persist the full report for inspection
  saveReport(pageName, results);

  const allViolations = results.violations;
  const blockingViolations = allViolations.filter(
    (v) => v.impact && BLOCKING_IMPACTS.has(v.impact),
  );

  // ── Baseline update mode ─────────────────────────────────────────────────
  if (process.env.UPDATE_A11Y_BASELINE === "true") {
    const baseline = loadBaseline();
    baseline[pageName] = {
      page: pageName,
      violations: allViolations.map(toEntry),
      recordedAt: new Date().toISOString(),
      burnDownTarget:
        "Fix critical violations by week 1, serious by week 3 (see e2e/a11y-audit.spec.ts)",
    };
    saveBaseline(baseline);
    console.log(
      `[a11y] Baseline updated for "${pageName}": ` +
      `${allViolations.length} total violation(s), ` +
      `${blockingViolations.length} serious/critical.`,
    );
    return; // always pass in update mode
  }

  // ── Normal mode: compare against baseline ────────────────────────────────
  const baseline = loadBaseline();
  const baselineRecord = baseline[pageName];

  const baselineBlockingIds = new Set(
    (baselineRecord?.violations ?? [])
      .filter((v) => v.impact && BLOCKING_IMPACTS.has(v.impact))
      .map((v) => v.id),
  );

  const newViolations = blockingViolations.filter(
    (v) => !baselineBlockingIds.has(v.id),
  );

  if (allViolations.length > 0) {
    console.log(
      `[a11y] "${pageName}" — ${allViolations.length} violation(s) total ` +
      `(${blockingViolations.length} serious/critical, ` +
      `${newViolations.length} new).`,
    );
    if (blockingViolations.length > 0) {
      console.log(
        "[a11y] Serious/critical violations:\n" +
        blockingViolations
          .map(
            (v) =>
              `  • [${v.impact?.toUpperCase()}] ${v.id}: ${v.description} ` +
              `(${v.nodes.length} node(s))`,
          )
          .join("\n"),
      );
    }
  } else {
    console.log(`[a11y] "${pageName}" — no violations. ✓`);
  }

  // Fail immediately if there are NEW serious/critical violations
  expect(
    newViolations,
    `Found ${newViolations.length} NEW serious/critical axe violation(s) on "${pageName}" ` +
    `that are not in the baseline.\n\n` +
    newViolations
      .map(
        (v) =>
          `[${v.impact?.toUpperCase()}] ${v.id}\n` +
          `  ${v.description}\n` +
          `  Nodes affected: ${v.nodes.length}\n` +
          `  Help: ${v.helpUrl}`,
      )
      .join("\n\n") +
    `\n\nTo add these to the baseline (burn-down approach), run:\n` +
    `  UPDATE_A11Y_BASELINE=true pnpm test:e2e -- e2e/a11y-audit.spec.ts`,
  ).toHaveLength(0);

  // Also fail if blocking count grew above baseline (regression guard)
  const baselineBlockingCount = baselineRecord
    ? (baselineRecord.violations ?? []).filter(
        (v) => v.impact && BLOCKING_IMPACTS.has(v.impact),
      ).length
    : 0;

  expect(
    blockingViolations.length,
    `Serious/critical violation count on "${pageName}" grew from ` +
    `${baselineBlockingCount} (baseline) to ${blockingViolations.length}. ` +
    `No regressions allowed — fix the new violation(s) or update the baseline.`,
  ).toBeLessThanOrEqual(baselineBlockingCount);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe("Axe Accessibility Audits", () => {
  test.beforeEach(async ({ page }) => {
    // Inject a minimal mock wallet and seed data so pages render with content
    await page.addInitScript(() => {
      const mockKey =
        "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";
      (window as Record<string, unknown>).freighter = {
        isConnected: true,
        getPublicKey: () => Promise.resolve(mockKey),
        signTransaction: (xdr: string) => Promise.resolve(xdr),
        request: ({ method }: { method: string }) =>
          method === "getPublicKey" ? Promise.resolve(mockKey) : Promise.resolve(null),
      };
      localStorage.setItem("freighter_public_key", mockKey);
      localStorage.setItem(
        "hunty_hunts",
        JSON.stringify([
          {
            id: 100,
            title: "E2E Audit Hunt",
            description: "A hunt for axe auditing.",
            cluesCount: 2,
            status: "Active",
            startTime: Math.floor(Date.now() / 1000) - 86400,
            endTime: Math.floor(Date.now() / 1000) + 7 * 86400,
          },
        ]),
      );
      localStorage.setItem(
        "hunty_clues",
        JSON.stringify([
          { id: 1, huntId: 100, question: "What is 2+2?", answer: "4", points: 10 },
        ]),
      );
    });
  });

  // ── Landing page ──────────────────────────────────────────────────────────

  test("landing page meets WCAG 2.1 AA (with baseline burn-down)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await auditPage(page, "landing");
  });

  // ── Hunt detail page ──────────────────────────────────────────────────────

  test("hunt detail page meets WCAG 2.1 AA (with baseline burn-down)", async ({
    page,
  }) => {
    // Use the seeded hunt id; if the server returns 404 the page still renders
    // a not-found boundary that should itself be accessible.
    await page.goto("/hunt/100");
    await page.waitForLoadState("networkidle");
    await auditPage(page, "hunt-detail");
  });

  // ── Play / Create page (/hunty) ───────────────────────────────────────────

  test("play/create page meets WCAG 2.1 AA (with baseline burn-down)", async ({
    page,
  }) => {
    await page.goto("/hunty");
    await page.waitForLoadState("networkidle");
    await auditPage(page, "play-create");
  });

  // ── Global leaderboard ────────────────────────────────────────────────────

  test("leaderboard page meets WCAG 2.1 AA (with baseline burn-down)", async ({
    page,
  }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
    await auditPage(page, "leaderboard");
  });

  // ── Hunt-specific leaderboard ─────────────────────────────────────────────

  test("hunt leaderboard page meets WCAG 2.1 AA (with baseline burn-down)", async ({
    page,
  }) => {
    await page.goto("/hunt/100/leaderboard");
    await page.waitForLoadState("networkidle");
    await auditPage(page, "hunt-leaderboard");
  });
});
