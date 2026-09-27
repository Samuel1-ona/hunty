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

| Flow | File | Verifies |
|------|------|----------|
| Feed & wallet | `.maestro/flows/feed-and-wallet.yaml` | Hunts feed loads, hunt detail opens, wallet modal appears |

## Test IDs

Components expose stable `testID` props for Maestro:

- `hunts-feed` — active hunts FlatList
- `hunt-feed-item-{id}` — individual hunt card
- `hunt-detail-screen` — hunt detail view
- `connect-wallet-button` — opens wallet modal
- `wallet-connect-modal` — wallet selection sheet

## CI

The `mobile-e2e` GitHub Actions workflow runs Maestro against an Android emulator on PRs that touch `mobile/**`.
