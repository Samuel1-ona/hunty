# Accessibility Axe Audit — Baseline & Burn-down Plan

This document describes the axe-core accessibility audit system used in the Hunty web app, how the baseline mechanism works, and the sprint-by-sprint plan for resolving known violations.

---

## How the Axe Audit Baseline System Works

The axe audit system is implemented in `e2e/axe-audits.spec.ts` and runs against every main route of the web app as part of the Playwright E2E test suite.

### Audit coverage

Each test page is scanned with the following axe rule tags:

| Tag | Standard covered |
|-----|-----------------|
| `wcag2a` | WCAG 2.0 Level A |
| `wcag2aa` | WCAG 2.0 Level AA |
| `wcag21aa` | WCAG 2.1 Level AA |
| `best-practice` | axe best-practice rules |

### Violation severity levels

axe-core assigns one of four impact levels to each violation:

| Impact | Build behaviour |
|--------|----------------|
| `critical` | **Fails the build** unless baselined |
| `serious` | **Fails the build** unless baselined |
| `moderate` | Logged only (does not fail) |
| `minor` | Logged only (does not fail) |

### Baseline file

Known violations are tracked in `test-results/a11y/baseline.json`. The file maps page names to arrays of known violation summaries:

```json
{
  "_comment": "...",
  "_generated": "2026-07-26T22:33:59.491Z",
  "landing": [],
  "hunt_detail": [
    {
      "id": "color-contrast",
      "impact": "serious",
      "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds"
    }
  ]
}
```

- If a `critical` or `serious` violation is **not** in the baseline → **test fails immediately**.
- If a violation **is** in the baseline → `console.warn` is emitted (tracked for burn-down) but the test passes.
- When a violation is **fixed**, remove its entry from `baseline.json` and commit.

### Full reports

After every test run, a full axe JSON report per page is saved to `test-results/a11y/{page}.json`. These are uploaded as CI artifacts (retained 30 days) via the `playwright-cross-browser.yml` workflow for review.

---

## Burn-down Plan

| Sprint | Target | Description |
|--------|--------|-------------|
| Sprint 1 | Landing page hero | Fix `color-contrast` violations on the hero section (button and heading text over gradient backgrounds) |
| Sprint 2 | Hunt card buttons | Add `aria-label` attributes to icon-only action buttons on hunt cards |
| Sprint 3 | Custom button focus | Fix missing `focus-visible` outlines on all custom `<Button>` component variants |
| Sprint 4 | Leaderboard table | Audit and fix `<th scope>` attributes and missing table summary on the leaderboard page |

---

## How to Update the Baseline

### On first CI run (capture current state)

Run Playwright with `WRITE_A11Y_BASELINE=true` to scan all pages and write the current violations into `baseline.json`:

```bash
WRITE_A11Y_BASELINE=true npx playwright test e2e/axe-audits.spec.ts
```

Commit the resulting `test-results/a11y/baseline.json`. From this point on, only *new* violations introduced after the baseline was taken will fail the build.

### After fixing a known violation

1. Remove the corresponding entry from `baseline.json` for that page.
2. Run `pnpm test:e2e` (or `npx playwright test e2e/axe-audits.spec.ts`) locally to confirm the test passes without the entry.
3. Commit the updated `baseline.json` together with the fix.

---

## How to Intentionally Add a Known Violation to the Baseline

If a violation is discovered but cannot be fixed immediately (e.g., blocked by a third-party component or design debt), add it to the baseline manually:

1. Find the violation `id`, `impact`, and `description` from the test output or from `test-results/a11y/{page}.json`.
2. Add an entry to the appropriate page array in `baseline.json`:

```json
"hunt_detail": [
  {
    "id": "color-contrast",
    "impact": "serious",
    "description": "Ensures the contrast between foreground and background colors meets WCAG 2 AA contrast ratio thresholds"
  }
]
```

3. Add a comment in the burn-down plan table (this file) describing when and by whom the violation will be resolved.
4. Open a tracking issue and link it in your PR.

> **Do not** add violations to the baseline without a corresponding issue or sprint plan entry. The baseline is a *burn-down* list, not a permanent exclusion list.

---

## WCAG 2.1 AA Coverage

The `['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']` tag set covers the following success criteria (non-exhaustive):

| Criterion | Description |
|-----------|-------------|
| 1.1.1 Non-text Content | All images have meaningful `alt` text |
| 1.3.1 Info and Relationships | Structure conveyed via semantic HTML |
| 1.4.3 Contrast (Minimum) | Text contrast ratio ≥ 4.5:1 (3:1 for large text) |
| 1.4.11 Non-text Contrast | UI components and focus indicators ≥ 3:1 |
| 2.1.1 Keyboard | All functionality operable by keyboard |
| 2.4.3 Focus Order | Focus order preserves meaning and operability |
| 2.4.7 Focus Visible | Keyboard focus indicator is visible |
| 4.1.2 Name, Role, Value | All UI components have accessible names and roles |
| 4.1.3 Status Messages | Status messages conveyed without focus change |

The separate `Axe Audit - Keyboard Navigation` describe block additionally validates that `Tab` focus moves away from `BODY` to an interactive element on every audited route.

---

## Running Audits Locally

```bash
# Run only the axe audit spec
npx playwright test e2e/axe-audits.spec.ts

# Run with baseline capture (first-time or after major refactor)
WRITE_A11Y_BASELINE=true npx playwright test e2e/axe-audits.spec.ts

# Run all a11y specs (axe-audits + a11y)
npx playwright test e2e/axe-audits.spec.ts e2e/a11y.spec.ts

# View the full report for a page
cat apps/web/test-results/a11y/landing.json | jq '.violations[] | {id, impact, description}'
```
