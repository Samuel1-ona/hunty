# Visual Regression Testing

This directory contains Playwright-based visual regression tests for Hunty.

## Overview

Visual regression tests use Playwright's built-in screenshot comparison to catch unintended UI changes across:
- Key pages: Home, Hunt Detail, Create Hunt, Creator Dashboard
- Components: Header, HuntCard, LeaderboardTable, GameCompleteModal
- Themes: Light and Dark mode
- Viewports: Desktop (Desktop Chrome) and Mobile (iPhone 13, Pixel 5)

## Running Tests

```bash
# Run all visual regression tests
pnpm test:visual

# Update baselines after intentional UI changes
pnpm test:visual:update

# Run specific page tests
npx playwright test visual-regression --grep "Home"
npx playwright test visual-regression --grep "Mobile"
```

## Test Structure

| Test File | Description |
|-----------|-------------|
| `visual-regression.spec.ts` | Page and component snapshots |

## Snapshot Organization

Snapshots are stored in `e2e/screenshots/` with paths structured as:
```
e2e/screenshots/
├── visual-regression.spec.ts/
│   ├── chromium-desktop/
│   │   ├── home-desktop-light.png
│   │   ├── home-desktop-dark.png
│   │   └── ...
│   ├── mobile-chrome/
│   │   ├── home-mobile-light.png
│   │   ├── home-mobile-dark.png
│   │   └── ...
│   └── mobile-safari/
│       └── ...
```

## Baseline Management

Baselines are committed to the repository. When intentional UI changes occur:

1. Run tests locally with `--update-snapshots`
2. Review the updated screenshots
3. Commit and push the new baselines

## Dynamic Content Masking

The following elements are masked to prevent false-positive diffs:
- Timestamp elements (`<time>`)
- Wallet address displays (`#balance-pill`, `[data-testid='wallet-address']`)
- Countdown timers (`[data-testid='hunt-countdown']`)
- Animations (`canvas`, `[data-lottie]`)

## Tolerance

- `maxDiffPixelRatio: 0.02` (2% pixel difference tolerance)
- Animations disabled during screenshots
- 500ms wait for transitions/animations to settle