/**
 * Accessibility E2E tests using @axe-core/playwright.
 *
 * Strategy:
 *  - Run axe with wcag2a, wcag2aa, wcag21aa, and best-practice tags.
 *  - Filter to `serious` and `critical` impact violations only.
 *  - Compare those violations against the baseline in a11y-baseline.json:
 *      • NEW violations (rule ID not in baseline) → fail the test.
 *      • KNOWN violations (rule ID already in baseline) → console.warn, pass.
 *  - Log a burn-down reminder showing how many baseline entries still remain.
 *  - Save the full axe JSON report per page and an aggregate summary.json.
 *
 * To capture a new baseline after intentional regressions are accepted:
 *   1. Add the rule ID(s) to the appropriate key in e2e/a11y-baseline.json.
 *   2. Open a follow-up ticket to fix them (they are "burned down" when removed).
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

// ── Types ─────────────────────────────────────────────────────────────────────

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
type AxeViolation = AxeResults["violations"][number];

/** Impact levels that will fail the build when they appear outside the baseline. */
const BLOCKING_IMPACTS: Array<AxeViolation["impact"]> = ["serious", "critical"];

/** Keys in the baseline JSON — one per audited page. */
type BaselineKey = "landing" | "hunt_detail" | "play" | "leaderboard";

interface A11yBaseline {
  _comment?: string;
  _burndown?: string;
  landing: string[];
  hunt_detail: string[];
  play: string[];
  leaderboard: string[];
}

// ── Report paths ──────────────────────────────────────────────────────────────

const reportRoot = path.join(process.cwd(), "test-results", "a11y");
const baselinePath = path.join(__dirname, "a11y-baseline.json");

function getReportFilePaths(pageName: string) {
  const sanitized = pageName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return {
    fullReport: path.join(reportRoot, `${sanitized}.json`),
    summaryReport: path.join(reportRoot, "summary.json"),
  };
}

// ── Report persistence ────────────────────────────────────────────────────────

async function saveA11yReport(pageName: string, results: AxeResults) {
  fs.mkdirSync(reportRoot, { recursive: true });
  const { fullReport, summaryReport } = getReportFilePaths(pageName);

  fs.writeFileSync(fullReport, JSON.stringify(results, null, 2));
  console.log(`A11y full report saved: ${fullReport}`);

  const summary: Record<string, unknown> = fs.existsSync(summaryReport)
    ? (JSON.parse(fs.readFileSync(summaryReport, "utf8")) as Record<string, unknown>)
    : {};

  summary[pageName] = {
    violations: results.violations.length,
    passes: results.passes?.length ?? 0,
    inapplicable: results.inapplicable?.length ?? 0,
    incomplete: results.incomplete?.length ?? 0,
    seriousOrCritical: results.violations.filter((v) =>
      BLOCKING_IMPACTS.includes(v.impact)
    ).length,
  };

  fs.writeFileSync(summaryReport, JSON.stringify(summary, null, 2));
  console.log(`A11y summary updated: ${summaryReport}`);
}

// ── Baseline loader ───────────────────────────────────────────────────────────

function loadBaseline(): A11yBaseline {
  if (!fs.existsSync(baselinePath)) {
    // Return an empty baseline so tests do not crash on a fresh checkout.
    return { landing: [], hunt_detail: [], play: [], leaderboard: [] };
  }
  return JSON.parse(fs.readFileSync(baselinePath, "utf8")) as A11yBaseline;
}

// ── Core audit helper ─────────────────────────────────────────────────────────

/**
 * Run an axe audit on the current page, save reports, then compare
 * serious/critical violations against the baseline.
 *
 * Fails the test only when a NEW violation (not yet in the baseline) is found.
 */
async function runA11yAudit(
  page: Page,
  pageName: string,
  baselineKey: BaselineKey
) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .options({ rules: { "color-contrast": { enabled: true } } })
    .analyze();

  await saveA11yReport(pageName, accessibilityScanResults);

  // ── Filter to blocking impact levels only ───────────────────────────────────
  const blockingViolations = accessibilityScanResults.violations.filter((v) =>
    BLOCKING_IMPACTS.includes(v.impact)
  );

  if (blockingViolations.length > 0) {
    console.log(
      `[a11y] ${pageName} — ${blockingViolations.length} serious/critical violation(s) found:`
    );
    for (const v of blockingViolations) {
      console.log(`  • [${v.impact}] ${v.id}: ${v.description}`);
    }
  }

  // ── Baseline comparison ─────────────────────────────────────────────────────
  const baseline = loadBaseline();
  const knownRuleIds: string[] = baseline[baselineKey] ?? [];

  const newViolations = blockingViolations.filter(
    (v) => !knownRuleIds.includes(v.id)
  );
  const knownViolations = blockingViolations.filter((v) =>
    knownRuleIds.includes(v.id)
  );

  // Warn about known (baseline) violations so they are visible in CI logs.
  if (knownViolations.length > 0) {
    console.warn(
      `[a11y] ⚠️  ${pageName} — ${knownViolations.length} KNOWN violation(s) still in baseline (please fix!):`,
      knownViolations.map((v) => `${v.id} [${v.impact}]`)
    );
  }

  // ── Burn-down reminder ──────────────────────────────────────────────────────
  const totalBaselineEntries = knownRuleIds.length;
  if (totalBaselineEntries > 0) {
    console.warn(
      `[a11y] 🔥 Burn-down: ${totalBaselineEntries} baseline violation(s) remain for "${baselineKey}". ` +
        `Remove entries from apps/web/e2e/a11y-baseline.json as you fix them.`
    );
  }

  // ── Fail only for NEW violations ────────────────────────────────────────────
  if (newViolations.length > 0) {
    const details = newViolations
      .map(
        (v) =>
          `  [${v.impact?.toUpperCase()}] ${v.id}\n` +
          `    Description: ${v.description}\n` +
          `    Help: ${v.helpUrl}\n` +
          `    Nodes affected: ${v.nodes.length}`
      )
      .join("\n\n");

    throw new Error(
      `[a11y] ${newViolations.length} NEW serious/critical violation(s) on "${pageName}" ` +
        `(not in baseline for key "${baselineKey}").\n\n` +
        `To accept as a known issue, add the rule ID(s) to apps/web/e2e/a11y-baseline.json → "${baselineKey}".\n\n` +
        `Violations:\n${details}`
    );
  }
}

// ── Keyboard navigation helper ────────────────────────────────────────────────

async function expectKeyboardNavigation(page: Page) {
  const maxTabs = 12;
  let activeElementTag = await page.evaluate(
    () => document.activeElement?.tagName || ""
  );

  for (
    let i = 0;
    i < maxTabs && ["BODY", "HTML", ""].includes(activeElementTag);
    i += 1
  ) {
    await page.keyboard.press("Tab");
    activeElementTag = await page.evaluate(
      () => document.activeElement?.tagName || ""
    );
  }

  expect(activeElementTag).not.toMatch(/^(BODY|HTML|)$/);

  const activeElementAccessibleName = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return "";
    return (
      active.getAttribute("aria-label") ||
      active.getAttribute("aria-labelledby") ||
      active.textContent?.trim() ||
      ""
    );
  });

  expect(activeElementAccessibleName).not.toBe("");
}

// ── Screen reader compatibility helper ────────────────────────────────────────

async function expectScreenReaderCompatibility(page: Page) {
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toBeVisible();

  const missingAltCount = await page.locator("img:not([alt])").count();
  expect(missingAltCount).toBe(0);
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe("a11y — Accessibility Audits", () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
    await injectMockWallet(page);
  });

  // ── Landing page ────────────────────────────────────────────────────────────
  test("Landing page — WCAG 2.1 AA (baseline-aware)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "landing", "landing");
  });

  // ── Hunt detail page ────────────────────────────────────────────────────────
  test("Hunt detail page — WCAG 2.1 AA (baseline-aware)", async ({ page }) => {
    await page.goto("/hunt/100");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "hunt_detail", "hunt_detail");
  });

  // ── Play / Create hunt page ─────────────────────────────────────────────────
  test("Play page — WCAG 2.1 AA (baseline-aware)", async ({ page }) => {
    await page.goto("/hunty");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "play", "play");
  });

  // ── Leaderboard page ────────────────────────────────────────────────────────
  test("Leaderboard page — WCAG 2.1 AA (baseline-aware)", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "leaderboard", "leaderboard");
  });

  // ── Keyboard navigation & screen reader landmarks ───────────────────────────
  test("Landing page — keyboard navigation and screen reader landmarks", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectKeyboardNavigation(page);
    await expectScreenReaderCompatibility(page);
  });
});
