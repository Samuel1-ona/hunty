# Network Switching Guide

This guide explains how to use the Stellar network switching feature in Hunty, allowing users and developers to toggle between testnet and mainnet.

## Overview

Hunty now supports seamless switching between Stellar's testnet and mainnet networks. This enables:

- **Development & Testing**: Use testnet for safe development with test XLM
- **Production Deployment**: Switch to mainnet for real transactions with actual assets
- **Network Awareness**: Visual indicators showing which network you're using
- **Contract Separation**: Different smart contract addresses per network

## Features Implemented

### ✅ 1. Network Indicator in UI

Visual badges show the current network throughout the app:

- **Header Badge**: Small pill indicator in the top navigation bar
- **Testnet Warning Banner**: Dismissible banner when on testnet
- **Corner Badge**: Fixed position indicator (optional)

**Components:**
- `NetworkIndicator.tsx` - Displays current network with visual styles
- `TestnetWarning.tsx` - Warning banner for testnet usage

### ✅ 2. Network Selection in Developer Settings

Access network settings via the Settings page (`/settings`):

1. Navigate to **Settings** from the header menu
2. Find the **Network Settings** card
3. Choose between **Testnet** or **Mainnet**
4. Confirm the switch (page will reload)

**Components:**
- `NetworkSwitcher.tsx` - Interactive network selection UI
- `app/settings/page.tsx` - Settings page with network controls

### ✅ 3. Auto-Detect Connected Wallet Network

The app attempts to detect the wallet's network configuration:

- Checks Freighter and Rabet wallet network settings
- Displays warnings if wallet network doesn't match app network
- Prevents transaction failures due to network mismatches

**Implementation:**
- `lib/wallets/networkDetection.ts` - Wallet network detection utilities
- `NetworkMismatchWarning.tsx` - Warning UI for network mismatches

### ✅ 4. Warning When on Testnet

Multiple warning mechanisms ensure users know they're on testnet:

- **Top Banner**: Persistent banner with dismiss option
- **Network Badge**: Yellow badge indicating testnet
- **Settings Page**: Clear visual distinction in network switcher

### ✅ 5. Different Contract Addresses Per Network

Smart contracts use network-specific addresses:

```env
# Testnet Contracts
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CA...

# Mainnet Contracts
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CA...
```

The app automatically uses the correct contract addresses based on the active network.

## Environment Configuration

### Environment Variables

Update your `.env.local` or deployment environment variables:

```env
# Network Configuration (default: testnet)
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet

# Testnet Configuration
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Mainnet Configuration (for production)
# NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org
# NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015

# Contract Addresses - Testnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=

# Contract Addresses - Mainnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=
```

### Network Detection Priority

The app determines the active network in this order:

1. **User Preference** (localStorage): User's manual network selection from settings
2. **Environment Variable**: `NEXT_PUBLIC_SOROBAN_NETWORK_TYPE`
3. **Default**: Falls back to `testnet` if neither is set

## Usage

### For Users

#### Switching Networks

1. Click **Settings** in the header navigation
2. Locate the **Network Settings** section
3. Click on your desired network (Testnet or Mainnet)
4. Confirm the switch in the modal
5. The page will reload with the new network active

#### Visual Indicators

- **Yellow Badge** = Testnet (test XLM, safe for testing)
- **Green Badge** = Mainnet (real XLM, production environment)

#### Network Warnings

- If your wallet network doesn't match the app network, you'll see an orange warning banner
- Click "Go to Settings" to switch networks or dismiss the warning

### For Developers

#### Using the Network Hook

```typescript
import { useNetwork } from "@/hooks/useNetwork"

function MyComponent() {
  const { 
    networkType,      // "testnet" | "mainnet"
    isTestnet,        // boolean
    isMainnet,        // boolean
    rpcUrl,           // Current RPC URL
    networkPassphrase,// Current network passphrase
    switchNetwork,    // Function to switch networks
    config            // Full network config
  } = useNetwork()

  return (
    <div>
      <p>Current Network: {networkType}</p>
      {isTestnet && <p>Using test XLM</p>}
      <button onClick={() => switchNetwork("mainnet")}>
        Switch to Mainnet
      </button>
    </div>
  )
}
```

#### Getting Contract Addresses

```typescript
import { getContracts, getRequiredAddress } from "@/lib/contracts/config"

// Get all contracts for current network
const contracts = getContracts()
console.log(contracts.HUNTY_CORE)
console.log(contracts.REWARD_MANAGER)
console.log(contracts.NFT_REWARD)

// Get a specific required address (throws if not set)
const rewardManager = getRequiredAddress("REWARD_MANAGER")
```

#### Network Type Utilities

```typescript
import { 
  getSorobanNetworkType,
  setSorobanNetworkType,
  getCurrentNetworkConfig 
} from "@/lib/soroban/client"

// Get current network
const network = getSorobanNetworkType() // "testnet" | "mainnet"

// Switch network programmatically
setSorobanNetworkType("mainnet")

// Get full network config
const config = getCurrentNetworkConfig()
// { rpcUrl, networkPassphrase, networkType }
```

#### Validating Wallet Network

```typescript
import { 
  checkWalletNetworkMatch,
  validateNetworkBeforeTransaction 
} from "@/lib/wallets/networkDetection"

// Check for network mismatch
const mismatch = await checkWalletNetworkMatch("freighter")
if (mismatch) {
  console.warn(mismatch.message)
  // Show warning to user
}

// Validate before transaction
const { valid, error } = await validateNetworkBeforeTransaction("freighter")
if (!valid) {
  alert(`Network mismatch: ${error?.message}`)
  return
}

// Proceed with transaction
await signTransaction(...)
```

## Architecture

### Key Files

```
lib/
├── soroban/
│   └── client.ts              # Network config & RPC client
├── contracts/
│   └── config.ts              # Contract addresses per network
├── wallets/
│   └── networkDetection.ts   # Wallet network detection
├── walletConnect.ts           # WalletConnect with network support
└── config/
    └── environment.ts         # Environment configuration

components/
├── NetworkIndicator.tsx       # Network badge components
├── NetworkSwitcher.tsx        # Network selection UI
├── NetworkMismatchWarning.tsx # Warning for network mismatches
└── Header.tsx                 # Updated with network badge

hooks/
└── useNetwork.ts              # Network management hook

app/
├── layout.tsx                 # TestnetWarning added
├── providers.tsx              # NetworkMismatchWarning added
└── settings/
    └── page.tsx               # Settings page with NetworkSwitcher
```

### Data Flow

1. **User selects network** → `NetworkSwitcher` component
2. **Saves to localStorage** → `stellar_network_preference`
3. **Calls `setSorobanNetworkType()`** → Updates network state
4. **Page reloads** → Reinitializes with new network
5. **All components read network** → Via `useNetwork()` hook
6. **Contracts load correct addresses** → Via `getContracts()`
7. **Wallet detection validates** → Via `checkWalletNetworkMatch()`

## Testing

### Manual Testing Checklist

- [ ] Switch from testnet to mainnet in settings
- [ ] Verify page reloads after switch
- [ ] Check network badge updates in header
- [ ] Confirm testnet warning appears on testnet
- [ ] Verify testnet warning dismisses
- [ ] Test network mismatch warning appears
- [ ] Connect wallet and verify network detection
- [ ] Check contract addresses change per network
- [ ] Verify WalletConnect uses correct chain ID
- [ ] Test in different browsers (localStorage is per-origin)

### Unit Testing

```typescript
// Test network switching
import { getSorobanNetworkType, setSorobanNetworkType } from "@/lib/soroban/client"

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
global.localStorage = localStorageMock as any

// Test setting network
setSorobanNetworkType("mainnet")
expect(localStorageMock.setItem).toHaveBeenCalledWith(
  "stellar_network_preference",
  "mainnet"
)
```

## Deployment

### Testnet Deployment

```bash
# .env.production
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CABC...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CDEF...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CGHI...
```

### Mainnet Deployment

```bash
# .env.production
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=mainnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CJKL...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CMNO...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CPQR...
```

### Multi-Environment Strategy

For production apps, consider:

1. **Separate Deployments**: Deploy testnet and mainnet versions separately
   - `testnet.hunty.app` → Testnet only
   - `hunty.app` → Mainnet only

2. **Single Deployment with Toggle**: Allow runtime switching (current implementation)
   - Users can toggle between networks in settings
   - Useful for developers and power users

3. **Environment-Locked**: Lock network per environment
   - Staging → Always testnet
   - Production → Always mainnet
   - Disable network switcher in UI

## Security Considerations

1. **Contract Address Validation**: Always validate contract addresses are set before use
2. **Network Mismatch Prevention**: App warns users about wallet/app network mismatches
3. **Transaction Confirmation**: Show network type in transaction confirmation modals
4. **Clear Visual Indicators**: Users always know which network they're using
5. **Mainnet Warnings**: Consider additional warnings for mainnet transactions

## Troubleshooting

### Network not switching

- Check browser console for errors
- Verify localStorage is enabled
- Try clearing browser cache and localStorage
- Ensure environment variables are set correctly

### Wallet network mismatch

- Ensure your wallet (Freighter, etc.) is on the correct network
- Check wallet settings/preferences
- Reconnect wallet after switching networks

### Contract not found errors

- Verify contract addresses are set for the active network
- Check environment variables in deployment
- Ensure contracts are deployed to the correct network

### Page not reloading after switch

- Check for JavaScript errors preventing reload
- Manually refresh the page
- Clear browser cache

## Future Enhancements

- [ ] Auto-detect wallet network on connection and auto-switch app
- [ ] Network history/switching analytics
- [ ] More granular network indicators per transaction
- [ ] Network-specific theming
- [ ] Testnet faucet integration
- [ ] Network-specific feature flags
- [ ] Multi-signature network switching (for teams)

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review Stellar network documentation: https://developers.stellar.org/docs

---

**Last Updated**: January 2025
**Version**: 1.0.0
