# Network Switching - Quick Reference Card

One-page reference for developers working with the network switching feature.

## 🎯 Quick Commands

```bash
# Start development server
pnpm dev

# Access settings page
http://localhost:3000/settings

# Check current network in console
localStorage.getItem("stellar_network_preference")

# Manually switch network
localStorage.setItem("stellar_network_preference", "mainnet")
location.reload()
```

## 📦 Key Imports

```typescript
// Network hook
import { useNetwork } from '@/hooks/useNetwork';

// Network utilities
import {
  getSorobanNetworkType,
  setSorobanNetworkType,
  getCurrentNetworkConfig,
} from '@/lib/soroban/client';

// Contract addresses
import { getContracts, getRequiredAddress } from '@/lib/contracts/config';

// Wallet validation
import {
  checkWalletNetworkMatch,
  validateNetworkBeforeTransaction,
} from '@/lib/wallets/networkDetection';

// Components
import { NetworkIndicator, TestnetWarning } from '@/components/NetworkIndicator';
import { NetworkSwitcher } from '@/components/NetworkSwitcher';
import { NetworkMismatchWarning } from '@/components/NetworkMismatchWarning';
```

## 🔧 Common Code Patterns

### Get Current Network

```typescript
const { networkType, isTestnet, isMainnet } = useNetwork();
```

### Switch Network

```typescript
const { switchNetwork } = useNetwork();
switchNetwork('mainnet'); // or "testnet"
```

### Get Contract for Current Network

```typescript
const contracts = getContracts();
const coreAddress = contracts.HUNTY_CORE;
```

### Validate Before Transaction

```typescript
const { valid, error } = await validateNetworkBeforeTransaction('freighter');
if (!valid) {
  alert(error?.message);
  return;
}
// Proceed with transaction
```

### Check Network Mismatch

```typescript
const mismatch = await checkWalletNetworkMatch('freighter');
if (mismatch) {
  console.warn(`App: ${mismatch.appNetwork}, Wallet: ${mismatch.walletNetwork}`);
}
```

### Display Network Badge

```typescript
<NetworkIndicator variant="pill" showIcon={true} />
```

## 🌐 Environment Variables

### Development (.env.local)

```env
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CA...
```

### Production

```env
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=mainnet
# Set mainnet contract addresses
```

## 📁 File Locations

| File                              | Purpose                     |
| --------------------------------- | --------------------------- |
| `lib/soroban/client.ts`           | Network configuration & RPC |
| `lib/contracts/config.ts`         | Contract addresses          |
| `lib/wallets/networkDetection.ts` | Wallet network validation   |
| `hooks/useNetwork.ts`             | Network React hook          |
| `components/NetworkIndicator.tsx` | UI indicators               |
| `components/NetworkSwitcher.tsx`  | Network selection UI        |
| `app/settings/page.tsx`           | Settings page               |

## 🎨 UI Components Quick Reference

### NetworkIndicator

```typescript
// Pill in header (default)
<NetworkIndicator variant="pill" showIcon={true} />

// Small badge
<NetworkIndicator variant="badge" />

// Fixed corner badge
<NetworkIndicator variant="corner" />
```

### TestnetWarning

```typescript
// Shows dismissible banner when on testnet
<TestnetWarning />
```

### NetworkSwitcher

```typescript
// Full network switcher with confirmation
<NetworkSwitcher />
```

## 🧪 Testing Snippets

### Manual Test

```javascript
// Browser console
console.log('Network:', getSorobanNetworkType());
console.log('Contracts:', getContracts());
```

### Unit Test

```typescript
import { getSorobanNetworkType, setSorobanNetworkType } from '@/lib/soroban/client';

test('network persists', () => {
  setSorobanNetworkType('mainnet');
  expect(getSorobanNetworkType()).toBe('mainnet');
});
```

### E2E Test

```typescript
await page.goto('/settings');
await page.click('text=Mainnet');
await page.click('text=Switch & Reload');
await expect(page.locator('[data-testid="network-indicator"]')).toContainText('MAINNET');
```

## 🔍 Debug Commands

```javascript
// Check localStorage
localStorage.getItem('stellar_network_preference');

// Force network
localStorage.setItem('stellar_network_preference', 'testnet');

// Clear preference
localStorage.removeItem('stellar_network_preference');

// Check env vars (only works server-side)
console.log(process.env.NEXT_PUBLIC_SOROBAN_NETWORK_TYPE);
```

## 🚨 Common Errors

### "Missing contract address"

**Cause:** Network-specific env var not set  
**Fix:** Set `NEXT_PUBLIC_*_ADDRESS_TESTNET` or `*_MAINNET`

### "Network mismatch"

**Cause:** Wallet on different network than app  
**Fix:** Switch wallet or app network

### Badge not showing

**Cause:** Component not rendered or missing "use client"  
**Fix:** Check imports and client directive

## 📊 Network Configs

### Testnet

```typescript
{
  rpcUrl: "https://soroban-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
  networkType: "testnet"
}
```

### Mainnet

```typescript
{
  rpcUrl: "https://soroban-mainnet.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  networkType: "mainnet"
}
```

## 🎯 Quick Checks

**Is network switching working?**

- [ ] Badge shows in header
- [ ] Can access `/settings`
- [ ] Can click to switch
- [ ] Confirmation modal appears
- [ ] Page reloads after switch
- [ ] Network persists after refresh

**Are contracts loading correctly?**

- [ ] `getContracts()` returns addresses
- [ ] Addresses differ between networks
- [ ] `getRequiredAddress()` doesn't throw

**Is wallet detection working?**

- [ ] Connect wallet succeeds
- [ ] Mismatch warning shows when networks differ
- [ ] No warning when networks match

## 📖 Documentation Links

- **Full Guide:** `NETWORK_SWITCHING_GUIDE.md`
- **Migration:** `NETWORK_MIGRATION.md`
- **Testing:** `TEST_NETWORK_SWITCHING.md`
- **Summary:** `NETWORK_SWITCHING_IMPLEMENTATION_SUMMARY.md`

## 🆘 Need Help?

1. Check browser console for errors
2. Verify environment variables set
3. Check localStorage not blocked
4. Review documentation files
5. Open GitHub issue

---

**Keep this card handy for quick reference!** 📌
