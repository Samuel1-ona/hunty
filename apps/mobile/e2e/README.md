# Mobile E2E Testing (Maestro)

Maestro provides baseline end-to-end coverage for critical user flows on iOS and Android.

## Prerequisites

1. Install [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro):

   ```bash
   brew tap mobile-dev-inc/tap
   brew install maestro
   ```

2. Install mobile dependencies:

   ```bash
   cd mobile
   pnpm install
   ```

## Running locally

Start the Expo dev server, then run Maestro in a separate terminal:

```bash
cd mobile
pnpm start
# In another terminal:
pnpm test:e2e
```

## Covered flows

| Flow          | File                                  | Verifies                                                                    |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| Feed & wallet | `.maestro/flows/feed-and-wallet.yaml` | Hunts feed loads, hunt detail opens, wallet modal appears                   |
| QR clue       | `.maestro/flows/scan-qr-clue.yaml`    | Join a hunt, reject a QR for the wrong clue, accept the right one, progress |

### QR clue flow

Emulators have no scannable camera feed, so the flow injects the QR payload
through the scanner's **Enter code manually** fallback, which runs the same
`processScan → onScan` path as a real camera scan. The payloads live in the
flow's `env` block; `__tests__/maestroQrFlow.test.ts` checks them against the
real QR verification logic and seed data.

The flow targets an installed build (default app id `io.hunty.mobile.dev`):

```bash
cd apps/mobile
npx expo run:android --variant release   # or: npx expo run:ios --configuration Release
pnpm test:e2e:qr
# Other build variants: maestro test -e APP_ID=io.hunty.mobile.preview .maestro/flows/scan-qr-clue.yaml
```

## Test IDs

Components expose stable `testID` props for Maestro:

- `hunts-feed` — active hunts FlatList
- `hunt-feed-item-{id}` — individual hunt card
- `hunt-detail-screen` — hunt detail view
- `connect-wallet-button` — opens wallet modal
- `wallet-connect-modal` — wallet selection sheet
- `onboarding-skip` — skips first-launch onboarding
- `join-hunt-button-{id}` — join button on the Hunts tab
- `play-progress-label` — "Clue N of M" progress on the play screen
- `scan-qr-button` — opens the QR scanner
- `answer-error` — clue answer / QR verification error
- `manual-entry-button`, `manual-code-input`, `manual-code-submit` — scanner manual entry

## CI

The `mobile-e2e` GitHub Actions workflow runs on PRs that touch `apps/mobile/**`:

- `maestro` — static validation (`pnpm test:e2e:validate`): flows exist, are registered, and reference declared testIDs
- `android` — builds a release APK and runs the QR clue flow on an Android emulator (API 34)
- `ios` — builds a release simulator app and runs the QR clue flow on an iOS simulator

The emulator jobs are `continue-on-error` until the mobile app bundles again on `main`.
