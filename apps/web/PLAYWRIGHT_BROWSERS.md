# Playwright Browser Version Management

This document describes how Playwright browser versions are pinned and managed in this project to ensure reproducible cross-browser E2E test runs.

## Overview

Browser versions are intentionally pinned to guarantee consistent test execution across different environments and time. Without pinning, Playwright would install whatever browser version is latest at runtime, leading to non-reproducible test results and potential flakiness.

## How Versions Are Pinned

Browser versions are controlled by the `@playwright/test` npm package version specified in `apps/web/package.json`. When you install dependencies via `pnpm install`, the exact version of `@playwright/test` is locked in `pnpm-lock.yaml`, which ensures:

1. **Reproducibility**: Every developer and CI run uses the same browser versions
2. **Consistency**: Test results are comparable across environments
3. **Deliberate updates**: Browser version updates are explicit and reviewed

### Current Pinned Versions

Check `apps/web/package.json` for the current `@playwright/test` version:

```json
"@playwright/test": "^1.58.2"
```

This version specification means:
- The exact major.minor.patch version is managed through `pnpm-lock.yaml`
- The caret (^) allows patch-level updates via Renovate (e.g., 1.58.2 → 1.58.3)
- Minor and major version bumps are handled explicitly via Renovate package rules

### Browser Projects

The following projects are configured in `apps/web/playwright.config.ts`:

- **chromium** - Chromium-based browser (desktop)
- **chromium-desktop** - Chromium desktop variant (used for visual regression)
- **firefox** - Firefox browser (desktop)
- **webkit** - WebKit browser (desktop Safari)
- **msedge** - Microsoft Edge (Chromium-based)
- **iphone** - iPhone 13 emulation (iOS Safari)
- **pixel** - Pixel 5 emulation (Android Chrome)
- **chromium-dark** - Chromium in dark mode (CSS compatibility)

All projects use the same Playwright engine version, ensuring consistency.

## Updating Browser Versions

### Automated Updates via Renovate

Renovate is configured to automatically create pull requests for Playwright updates. The update strategy is:

1. **Patch updates** (e.g., 1.58.2 → 1.58.3): Automatically merged after CI passes
2. **Minor updates** (e.g., 1.58.x → 1.59.0): Grouped and require manual review
3. **Major updates** (e.g., 1.x.x → 2.0.0): Grouped and require manual review

See `renovate.json` in the project root for the configuration.

### Manual Updates

To manually update browser versions:

1. Update `@playwright/test` version in `apps/web/package.json`
2. Run `pnpm install` to update `pnpm-lock.yaml`
3. Test locally: `pnpm test:e2e`
4. Run full cross-browser suite: `pnpm test:e2e -- --project=chromium --project=firefox --project=webkit`
5. Commit and create a pull request with test results

## Installation in CI

The GitHub Actions workflow (`.github/workflows/playwright-cross-browser.yml`) installs browsers with:

```bash
pnpm exec playwright install --with-deps
```

This command:
- Uses the Playwright version from `pnpm-lock.yaml`
- Installs browsers matching that version
- Installs system dependencies (`--with-deps`)
- Ensures reproducible runs across CI environments

## Troubleshooting

### Browser mismatch errors

If you see errors about browser versions not matching:

1. Clear Playwright cache: `pnpm exec playwright clean`
2. Reinstall: `pnpm install && pnpm exec playwright install --with-deps`
3. Try again: `pnpm test:e2e`

### Different versions locally and in CI

If tests pass locally but fail in CI (or vice versa):

1. Check your `pnpm-lock.yaml` is committed and up-to-date
2. Ensure `@playwright/test` and `playwright` versions match in `apps/web/package.json`
3. Run `pnpm install` after pulling changes
4. Clear browser cache: `pnpm exec playwright clean`

### Using a specific Playwright version

To test with a specific version before committing:

```bash
pnpm add -D @playwright/test@1.60.0 playwright@1.60.0
pnpm exec playwright install --with-deps
pnpm test:e2e
```

Then reset with `pnpm install` to return to the locked version.

## Benefits

- **Stability**: No surprises from random browser updates
- **Debugging**: Failures are reproducible by other developers
- **Performance**: Consistent baseline for performance testing
- **Regression testing**: Visual regression baselines remain valid
- **CI efficiency**: Faster builds due to cached binaries with known versions

## Related Files

- `apps/web/playwright.config.ts` - Playwright configuration with project definitions
- `apps/web/package.json` - Defines `@playwright/test` version
- `.github/workflows/playwright-cross-browser.yml` - CI workflow that installs browsers
- `renovate.json` - Renovate configuration for automated updates
