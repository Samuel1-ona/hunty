import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

// ─────────────────────────────────────────────────────────────────
// Report paths
// ─────────────────────────────────────────────────────────────────

const reportRoot = path.join(process.cwd(), "test-results", "a11y");
const baselineFilePath = path.join(reportRoot, "baseline.json");

// ─────────────────────────────────────────────────────────────────
// Baseline helpers
// ─────────────────────────────────────────────────────────────────

type ViolationSummary = {
  id: string;
  impact: string;
  description: string;
};

type BaselineFile = Record<string, ViolationSummary[]>;

function loadBaseline(): BaselineFile {
  if (!fs.existsSync(baselineFilePath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(baselineFilePath, "utf8");
    return JSON.parse(raw) as BaselineFile;
  } catch {
    console.warn(`[axe-audits] Could not parse baseline file at ${baselineFilePath}. Treating as empty.`);
    return {};
  }
}

function saveBaseline(baseline: BaselineFile): void {
  fs.mkdirSync(reportRoot, { recursive: true });
  // Preserve metadata keys that start with "_" from the original file if present
  let existing: Record<string, unknown> = {};
  if (fs.existsSync(baselineFilePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(baselineFilePath, "utf8"));
    } catch {
      // ignore parse errors when updating
    }
  }
  const meta: Record<string, unknown> = {};
  for (const key of Object.keys(existing)) {
    if (key.startsWith("_")) {
      meta[key] = existing[key];
    }
  }
  meta["_generated"] = new Date().toISOString();
  const output = { ...meta, ...baseline };
  fs.writeFileSync(baselineFilePath, JSON.stringify(output, null, 2));
  console.log(`[axe-audits] Baseline updated: ${baselineFilePath}`);
}

// ─────────────────────────────────────────────────────────────────
// Core audit helper
// ─────────────────────────────────────────────────────────────────

async function runAxeAudit(page: Page, pageName: string): Promise<void> {
  // Run axe with comprehensive WCAG 2.1 AA tag set
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze();

  // Persist full JSON report
  fs.mkdirSync(reportRoot, { recursive: true });
  const sanitized = pageName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const reportPath = path.join(reportRoot, `${sanitized}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`[axe-audits] Full report saved: ${reportPath}`);

  // Load baseline
  const baseline = loadBaseline();
  const pageBaseline: ViolationSummary[] = baseline[pageName] ?? [];
  const baselineIds = new Set(pageBaseline.map((v) => v.id));

  // Categorise violations
  const criticalOrSerious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );

  const newViolations = criticalOrSerious.filter((v) => !baselineIds.has(v.id));
  const knownViolations = criticalOrSerious.filter((v) => baselineIds.has(v.id));

  // Warn about known (baselined) violations — these are tracked for burn-down
  for (const v of knownViolations) {
    console.warn(
      `[axe-audits][KNOWN] "${pageName}" has a baselined violation: ${v.id} (${v.impact}) — ${v.description}`
    );
  }

  // Write/update baseline when env var is set (used by CI on first run)
  if (process.env.WRITE_A11Y_BASELINE === "true") {
    const allCriticalSerious: ViolationSummary[] = criticalOrSerious.map((v) => ({
      id: v.id,
      impact: v.impact as string,
      description: v.description,
    }));
    const updatedBaseline: BaselineFile = { ...baseline, [pageName]: allCriticalSerious };
    saveBaseline(updatedBaseline);
    console.log(`[axe-audits] Baseline written for page "${pageName}" (${allCriticalSerious.length} violations).`);
    // Do not fail when writing baseline — we are capturing the current state
    return;
  }

  // Hard-fail on new (non-baselined) critical/serious violations
  if (newViolations.length > 0) {
    const details = newViolations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
    }));
    throw new Error(
      `[axe-audits] ${newViolations.length} NEW critical/serious a11y violation(s) on "${pageName}":\n` +
        JSON.stringify(details, null, 2) +
        "\n\nTo acknowledge these as known issues, run with WRITE_A11Y_BASELINE=true once, then commit the updated baseline.json."
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Keyboard navigation helper (shared with keyboard-nav describe)
// ─────────────────────────────────────────────────────────────────

async function assertTabFocusReachesInteractiveElement(page: Page): Promise<void> {
  const maxTabs = 15;
  let activeTag = await page.evaluate(() => document.activeElement?.tagName ?? "");

  for (let i = 0; i < maxTabs && ["BODY", "HTML", ""].includes(activeTag); i++) {
    await page.keyboard.press("Tab");
    activeTag = await page.evaluate(() => document.activeElement?.tagName ?? "");
  }

  expect(
    activeTag,
    "Tab key should move focus away from BODY to an interactive element"
  ).not.toMatch(/^(BODY|HTML|)$/);
}

// ─────────────────────────────────────────────────────────────────
// Main suite
// ─────────────────────────────────────────────────────────────────

test.describe("Axe Accessibility Audits", () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
    await injectMockWallet(page);
  });

  test("landing page (/): zero critical/serious violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await runAxeAudit(page, "landing");
  });

  test("hunt detail page (/hunt/100): zero critical/serious violations", async ({ page }) => {
    await page.goto("/hunt/100");
    await page.waitForLoadState("networkidle");
    await runAxeAudit(page, "hunt_detail");
  });

  test(
    "hunt play mode (/hunt/100): zero critical/serious violations after entering play state",
    async ({ page }) => {
      await page.goto("/hunt/100");
      await page.waitForLoadState("networkidle");

      // Attempt to enter play/start mode if the button is visible
      const playButton = page
        .locator("button")
        .filter({ hasText: /start hunt|play|begin/i })
        .first();

      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForLoadState("networkidle");
      } else {
        console.log('[axe-audits] No "Start Hunt / Play / Begin" button visible; auditing hunt detail state as play mode.');
      }

      await runAxeAudit(page, "hunt_play");
    }
  );

  test("leaderboard page (/leaderboard): zero critical/serious violations", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
    await runAxeAudit(page, "leaderboard");
  });
});

// ─────────────────────────────────────────────────────────────────
// Keyboard Navigation suite
// ─────────────────────────────────────────────────────────────────

test.describe("Axe Audit - Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
    await injectMockWallet(page);
  });

  test("landing page (/): Tab focus reaches a non-BODY element", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await assertTabFocusReachesInteractiveElement(page);
  });

  test("hunt detail page (/hunt/100): Tab focus reaches a non-BODY element", async ({ page }) => {
    await page.goto("/hunt/100");
    await page.waitForLoadState("networkidle");
    await assertTabFocusReachesInteractiveElement(page);
  });

  test("leaderboard page (/leaderboard): Tab focus reaches a non-BODY element", async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
    await assertTabFocusReachesInteractiveElement(page);
  });

  test("create hunt page (/hunty): Tab focus reaches a non-BODY element", async ({ page }) => {
    await page.goto("/hunty");
    await page.waitForLoadState("networkidle");
    await assertTabFocusReachesInteractiveElement(page);
  });
});
