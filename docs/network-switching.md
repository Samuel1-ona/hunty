# Network Switching Guide

This is the single guide for Hunty's Stellar network-switching feature. It merges the former `NETWORK_SWITCHING_GUIDE.md`, `NETWORK_MIGRATION.md`, `NETWORK_SWITCHING_IMPLEMENTATION_SUMMARY.md`, and `NETWORK_QUICK_REFERENCE.md` documents, which covered the same feature and overlapped heavily.

It is written for both users and developers, and covers:

- [Overview](#overview)
- [What the feature provides](#what-the-feature-provides)
- [Quick reference](#quick-reference)
- [Environment configuration](#environment-configuration)
- [Usage](#usage)
- [Architecture](#architecture)
- [Migration from pre-switching deployments](#migration-from-pre-switching-deployments)
- [Deployment](#deployment)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Security considerations](#security-considerations)
- [Known limitations and future work](#known-limitations-and-future-work)

## Overview

Hunty can run against either Stellar **testnet** or **mainnet** and lets the user switch between them at runtime. This enables:

- **Development & testing** on testnet with test XLM.
- **Production use** on mainnet with real assets.
- **Network awareness** through visual indicators.
- **Contract separation** via per-network contract addresses.

The active network is resolved from the user's saved preference, then the environment variable, then a testnet default.

## What the feature provides

- **Network indicator in the UI** — a pill/badge/corner indicator, colour-coded (yellow = testnet, green = mainnet), plus a dismissible testnet banner.
- **Network selection in settings** — `/settings` exposes a network switcher with a confirmation modal and a page reload on change.
- **Wallet network detection** — Freighter and Rabet are queried and a mismatch warning is shown when the wallet disagrees with the app.
- **Warning when on testnet** — a persistent badge, a dismissible top banner, and contextual warnings in settings.
- **Per-network contract addresses** — `HUNTY_CORE`, `REWARD_MANAGER`, and `NFT_REWARD` addresses resolve per network, with legacy variables kept as a testnet fallback.

### Key files

| File | Purpose |
| --- | --- |
| `lib/soroban/client.ts` | Network configuration and RPC URL / passphrase resolution |
| `lib/contracts/config.ts` | Contract address resolution per network |
| `lib/wallets/networkDetection.ts` | Wallet network detection and validation |
| `hooks/useNetwork.ts` | React hook exposing network state and `switchNetwork()` |
| `components/NetworkIndicator.tsx` | Network badge and testnet warning UI |
| `components/NetworkSwitcher.tsx` | Network selection UI |
| `components/NetworkMismatchWarning.tsx` | Wallet/app mismatch warning |
| `app/settings/page.tsx` | Settings page hosting the switcher |

## Quick reference

```bash
# Start development server
pnpm dev

# Settings page
http://localhost:3000/settings

# Check / force the saved preference
localStorage.getItem("stellar_network_preference")
localStorage.setItem("stellar_network_preference", "mainnet")
location.reload()
```

### Key imports

```typescript
// Network hook
import { useNetwork } from "@/hooks/useNetwork"

// Network utilities
import {
  getSorobanNetworkType,
  setSorobanNetworkType,
  getCurrentNetworkConfig,
} from "@/lib/soroban/client"

// Contract addresses
import { getContracts, getRequiredAddress } from "@/lib/contracts/config"

// Wallet validation
import {
  checkWalletNetworkMatch,
  validateNetworkBeforeTransaction,
} from "@/lib/wallets/networkDetection"

// Components
import { NetworkIndicator, TestnetWarning } from "@/components/NetworkIndicator"
import { NetworkSwitcher } from "@/components/NetworkSwitcher"
import { NetworkMismatchWarning } from "@/components/NetworkMismatchWarning"
```

### Common patterns

```typescript
// Current network
const { networkType, isTestnet, isMainnet, switchNetwork } = useNetwork()
switchNetwork("mainnet") // or "testnet"

// Contract for the active network
const contracts = getContracts()
const coreAddress = contracts.HUNTY_CORE

// Validate before signing a transaction
const { valid, error } = await validateNetworkBeforeTransaction("freighter")
if (!valid) {
  alert(error?.message)
  return
}

// Check for a mismatch
const mismatch = await checkWalletNetworkMatch("freighter")
if (mismatch) {
  console.warn(`App: ${mismatch.appNetwork}, Wallet: ${mismatch.walletNetwork}`)
}
```

### Network configs

```typescript
// testnet
{ rpcUrl: "https://soroban-testnet.stellar.org", networkPassphrase: "Test SDF Network ; September 2015", networkType: "testnet" }

// mainnet
{ rpcUrl: "https://soroban-mainnet.stellar.org", networkPassphrase: "Public Global Stellar Network ; September 2015", networkType: "mainnet" }
```

## Environment configuration

```env
# Active network type (default: testnet)
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet

# Testnet
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=

# Mainnet (for production)
# NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org
# NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=
```

### Network detection priority

1. **User preference** (`localStorage.stellar_network_preference`) — manual selection from settings.
2. **Environment variable** (`NEXT_PUBLIC_SOROBAN_NETWORK_TYPE`).
3. **Default** — falls back to `testnet`.

### Contract address resolution priority

1. Network-specific variable, e.g. `NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET`.
2. Legacy variable, e.g. `NEXT_PUBLIC_HUNTY_CORE_ADDRESS` (testnet fallback).
3. Empty string (which throws when `getRequiredAddress()` is called).

## Usage

### For users

1. Open **Settings** from the header.
2. Under **Network Settings**, choose **Testnet** or **Mainnet**.
3. Confirm the switch in the modal; the page reloads with the new network.

Indicators:

- **Yellow badge** = testnet (test XLM, safe for testing).
- **Green badge** = mainnet (real XLM, production).
- **Orange banner** = the connected wallet's network does not match the app.

### For developers

```typescript
import { useNetwork } from "@/hooks/useNetwork"

function MyComponent() {
  const {
    networkType,       // "testnet" | "mainnet"
    isTestnet,
    isMainnet,
    rpcUrl,
    networkPassphrase,
    switchNetwork,
    config,            // full network config
  } = useNetwork()

  return (
    <div>
      <p>Current Network: {networkType}</p>
      {isTestnet && <p>Using test XLM</p>}
      <button onClick={() => switchNetwork("mainnet")}>Switch to Mainnet</button>
    </div>
  )
}
```

```typescript
import { getContracts, getRequiredAddress } from "@/lib/contracts/config"

const contracts = getContracts()
console.log(contracts.HUNTY_CORE, contracts.REWARD_MANAGER, contracts.NFT_REWARD)

const rewardManager = getRequiredAddress("REWARD_MANAGER") // throws if unset
```

## Architecture

### Data flow

1. User selects a network in `NetworkSwitcher`.
2. The preference is saved to `localStorage` under `stellar_network_preference`.
3. `setSorobanNetworkType()` updates the network state.
4. The page reloads and reinitialises with the new network.
5. Components read the network via `useNetwork()`.
6. Contracts resolve addresses via `getContracts()`.
7. Wallet detection validates via `checkWalletNetworkMatch()`.

### Component hierarchy

```
app/layout.tsx
├── TestnetWarning (top banner)
└── Providers
    ├── WalletProvider
    │   └── NetworkMismatchWarning
    └── Header
        ├── NetworkIndicator (badge)
        └── Navigation
            └── Settings Link
                └── Settings Page
                    └── NetworkSwitcher
```

## Migration from pre-switching deployments

The feature is **backwards compatible**. The default contract-address resolution still falls back to the legacy variables, so existing testnet-only deployments keep working without changes.

### Step 1 — Update environment variables

Testnet only (rename to the network-specific form):

```bash
# Before
NEXT_PUBLIC_HUNTY_CORE_ADDRESS=CAxxxTestnet

# After
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CAxxxTestnet
```

Both networks:

```env
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CAxxxTestnet
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CAxxxTestnet
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CAxxxTestnet

NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CAxxxMainnet
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CAxxxMainnet
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CAxxxMainnet
```

### Step 2 — Deploy contracts (if needed)

Deploy Soroban contracts to mainnet, set the mainnet variables, and test with small amounts before enabling the switcher.

### Step 3 — Update build configuration

- **Vercel/Netlify:** add the new variables in Project Settings → Environment Variables, then redeploy.
- **Docker:**

```dockerfile
ENV NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=${HUNTY_CORE_TESTNET}
ENV NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=${HUNTY_CORE_MAINNET}
```

### Step 4 — Test the migration

1. `pnpm dev`, open `http://localhost:3000/settings`, and switch networks.
2. Verify `getContracts()` returns the expected addresses.
3. Connect a wallet, switch the app network, and confirm mismatch warnings.

### Step 5 — Update CI/CD

```yaml
env:
  NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET: ${{ secrets.HUNTY_CORE_TESTNET }}
  NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET: ${{ secrets.HUNTY_CORE_MAINNET }}
  NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET: ${{ secrets.REWARD_MGR_TESTNET }}
  NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET: ${{ secrets.REWARD_MGR_MAINNET }}
  NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET: ${{ secrets.NFT_REWARD_TESTNET }}
  NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET: ${{ secrets.NFT_REWARD_MAINNET }}
```

### Rollback

- **Keep old variables:** compatible — legacy variables are treated as the testnet fallback.
- **Revert code:** `git revert <network-switching-commit>` then rebuild.

## Deployment

### Testnet

```bash
# .env.production
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CABC...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CDEF...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CGHI...
```

### Mainnet

```bash
# .env.production
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=mainnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CJKL...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CMNO...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CPQR...
```

### Multi-environment strategies

1. **Separate deployments:** `testnet.hunty.app` (testnet only), `hunty.app` (mainnet only).
2. **Single deployment with a toggle:** the current runtime-switching implementation.
3. **Environment-locked:** staging → testnet, production → mainnet, with the switcher hidden.

## Testing

### Manual checklist

- [ ] Switch from testnet to mainnet in settings; the page reloads.
- [ ] The network badge updates in the header.
- [ ] The testnet warning appears on testnet and dismisses.
- [ ] The mismatch warning appears when the wallet network differs.
- [ ] Contract addresses change per network.
- [ ] WalletConnect uses the correct chain ID.
- [ ] Behaviour is consistent across browsers (localStorage is per-origin).

### Unit and E2E snippets

```typescript
import { getSorobanNetworkType, setSorobanNetworkType } from "@/lib/soroban/client"

test("network persists", () => {
  setSorobanNetworkType("mainnet")
  expect(getSorobanNetworkType()).toBe("mainnet")
})
```

```typescript
await page.goto("/settings")
await page.click('text=Mainnet')
await page.click('text=Switch & Reload')
await expect(page.locator('[data-testid="network-indicator"]')).toContainText("MAINNET")
```

For the full testing walkthrough, see [`TEST_NETWORK_SWITCHING.md`](../TEST_NETWORK_SWITCHING.md).

## Troubleshooting

### Network not switching

- Check the browser console for errors.
- Verify localStorage is enabled.
- Clear cache/localStorage and retry.
- Ensure the environment variables are set correctly.

### Wallet network mismatch

- Put the wallet (e.g. Freighter) on the same network as the app.
- Reconnect the wallet after switching networks.

### "Missing contract address"

- The network-specific variable for the active network is not set. Set `NEXT_PUBLIC_*_ADDRESS_TESTNET` or `*_MAINNET`.

### "Contract not found"

- Verify the addresses are set for the active network and the contracts are deployed there.

### Page not reloading after a switch

- Check for JavaScript errors preventing the reload, then refresh manually.

## Security considerations

1. **Contract address validation** — addresses are validated before use.
2. **Network mismatch prevention** — users are warned before cross-network transactions.
3. **Clear visual indicators** — the active network is always visible.
4. **Confirmation modals** — switching requires explicit confirmation.
5. **No sensitive data** — only a network preference is stored, in localStorage.

## Known limitations and future work

Known limitations:

- Wallet auto-detection covers Freighter and Rabet (extensible).
- Switching networks reloads the page to reset state cleanly.
- Only one network is active per browser at a time.
- localStorage must be available.

Potential future work:

- Auto-switch the app to match the wallet network.
- Remember the last-used wallet per network.
- Network-specific transaction history and feature flags.
- Testnet faucet integration.

---

**Merged from the former `NETWORK_*` documents.**
