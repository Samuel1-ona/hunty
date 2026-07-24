import fs from "fs";
import path from "path";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { injectMockWallet, seedHuntData } from "./helpers/mock-wallet";

const reportRoot = path.join(process.cwd(), "test-results", "a11y");

function getReportFilePaths(pageName: string) {
  const sanitized = pageName.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  return {
    fullReport: path.join(reportRoot, `${sanitized}.json`),
    summaryReport: path.join(reportRoot, "summary.json"),
  };
}

async function saveA11yReport(pageName: string, results: Awaited<ReturnType<AxeBuilder["analyze"]>>) {
  fs.mkdirSync(reportRoot, { recursive: true });
  const { fullReport, summaryReport } = getReportFilePaths(pageName);
  fs.writeFileSync(fullReport, JSON.stringify(results, null, 2));

  const summary = fs.existsSync(summaryReport)
    ? JSON.parse(fs.readFileSync(summaryReport, "utf8"))
    : {};

  summary[pageName] = {
    violations: results.violations.length,
    passes: results.passes?.length ?? 0,
    inapplicable: results.inapplicable?.length ?? 0,
  };

  fs.writeFileSync(summaryReport, JSON.stringify(summary, null, 2));
  console.log(`A11y report saved: ${fullReport}`);
}

async function runA11yAudit(page: Page, pageName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(["wcag2aa", "wcag21aa", "best-practice"])
    .options({ rules: { "color-contrast": { enabled: true } } })
    .analyze();

  await saveA11yReport(pageName, accessibilityScanResults);

  if (accessibilityScanResults.violations.length > 0) {
    console.log(`${pageName} A11y Violations:`, JSON.stringify(accessibilityScanResults.violations, null, 2));
  }

  expect(accessibilityScanResults.violations).toEqual([]);
}

async function expectKeyboardNavigation(page: Page) {
  const maxTabs = 12;
  let activeElementTag = await page.evaluate(() => document.activeElement?.tagName || "");

  for (let i = 0; i < maxTabs && ["BODY", "HTML", ""].includes(activeElementTag); i += 1) {
    await page.keyboard.press("Tab");
    activeElementTag = await page.evaluate(() => document.activeElement?.tagName || "");
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

async function expectScreenReaderCompatibility(page: Page) {
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toBeVisible();

  const missingAltCount = await page.locator("img:not([alt])").count();
  expect(missingAltCount).toBe(0);
}

test.describe("Accessibility Audits", () => {
  test.beforeEach(async ({ page }) => {
    await seedHuntData(page);
    await injectMockWallet(page);
  });

  test("Home page should meet WCAG 2.1 AA accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "home");
  });

  test("Dashboard page should meet WCAG 2.1 AA accessibility", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "dashboard");
  });

  test("Create Hunt page should meet WCAG 2.1 AA accessibility", async ({ page }) => {
    await page.goto("/hunty");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "create_hunt");
  });

  test("Hunt detail page should meet WCAG 2.1 AA accessibility", async ({ page }) => {
    await page.goto("/hunt/1");
    await page.waitForLoadState("networkidle");
    await runA11yAudit(page, "hunt_detail");
  });

  test("Home page should support keyboard navigation and screen reader landmarks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectKeyboardNavigation(page);
    await expectScreenReaderCompatibility(page);
  });
});
