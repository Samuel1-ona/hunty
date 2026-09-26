# Network Switching Migration Guide

This guide helps existing Hunty deployments migrate to the new network switching feature.

## Overview

The network switching feature introduces:
- Runtime network selection (testnet/mainnet)
- Network-specific contract addresses
- Wallet network detection
- Visual network indicators

## Breaking Changes

### Environment Variables

**Old:**
```env
NEXT_PUBLIC_HUNTY_CORE_ADDRESS=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS=CA...
```

**New (Backwards Compatible):**
```env
# Network-specific (recommended)
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CA...

NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CA...

# Legacy (still works, used as testnet fallback)
NEXT_PUBLIC_HUNTY_CORE_ADDRESS=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS=CA...
```

### Contract Address Resolution

The app now resolves contract addresses with this priority:

1. Network-specific env var (e.g., `NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET`)
2. Legacy env var (e.g., `NEXT_PUBLIC_HUNTY_CORE_ADDRESS`) - used as testnet fallback
3. Empty string (will throw error when `getRequiredAddress()` is called)

## Migration Steps

### Step 1: Update Environment Variables

#### Option A: Keep Existing Setup (Testnet Only)

If you're only using testnet, rename your variables:

```bash
# Before
NEXT_PUBLIC_HUNTY_CORE_ADDRESS=CAxxxTestnet

# After
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CAxxxTestnet
```

#### Option B: Add Mainnet Support

If you want to support both networks:

```bash
# Testnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CAxxxTestnet
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CAxxxTestnet
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CAxxxTestnet

# Mainnet
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CAxxxMainnet
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CAxxxMainnet
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CAxxxMainnet
```

### Step 2: Deploy Contracts (if needed)

If you don't have mainnet contracts yet:

1. Deploy your Soroban contracts to mainnet
2. Update environment variables with mainnet addresses
3. Test thoroughly on mainnet with small amounts

### Step 3: Update Build Configuration

#### Vercel/Netlify

Add new environment variables in your dashboard:

1. Go to Project Settings → Environment Variables
2. Add the new network-specific variables
3. Redeploy

#### Docker

Update your Dockerfile or docker-compose.yml:

```dockerfile
ENV NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=${HUNTY_CORE_TESTNET}
ENV NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=${HUNTY_CORE_MAINNET}
```

### Step 4: Test Migration

1. **Local Testing:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/settings
   # Try switching networks
   ```

2. **Verify Contract Loading:**
   ```typescript
   import { getContracts } from "@/lib/contracts/config"
   console.log(getContracts())
   ```

3. **Check Network Detection:**
   - Connect wallet
   - Switch app network
   - Verify mismatch warnings appear

### Step 5: Update CI/CD

Update your CI/CD pipeline to include network variables:

```yaml
# .github/workflows/deploy.yml
env:
  NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET: ${{ secrets.HUNTY_CORE_TESTNET }}
  NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET: ${{ secrets.HUNTY_CORE_MAINNET }}
  NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET: ${{ secrets.REWARD_MGR_TESTNET }}
  NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET: ${{ secrets.REWARD_MGR_MAINNET }}
  NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET: ${{ secrets.NFT_REWARD_TESTNET }}
  NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET: ${{ secrets.NFT_REWARD_MAINNET }}
```

## Rollback Plan

If you need to rollback:

### Quick Rollback (Keep Old Variables)

The new code is backwards compatible. Old variables work as testnet fallbacks:

```env
# These still work (treated as testnet)
NEXT_PUBLIC_HUNTY_CORE_ADDRESS=CA...
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS=CA...
NEXT_PUBLIC_NFT_REWARD_ADDRESS=CA...
```

### Full Rollback (Revert Code)

```bash
git revert <network-switching-commit>
npm install
npm run build
```

## Common Issues

### Issue: "Missing contract address" error

**Cause:** Network-specific env vars not set

**Solution:**
```bash
# Set for active network
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CA...
# or
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CA...
```

### Issue: Network not persisting

**Cause:** localStorage blocked or disabled

**Solution:**
- Check browser privacy settings
- Enable cookies/localStorage
- Use incognito mode to test

### Issue: Wallet network mismatch

**Cause:** Wallet on different network than app

**Solution:**
- Switch wallet network in wallet settings
- Or switch app network in Settings page

## Deployment Strategies

### Strategy 1: Gradual Rollout

1. **Week 1:** Deploy with testnet only
2. **Week 2:** Add mainnet contracts (disabled in UI)
3. **Week 3:** Enable mainnet switching for beta users
4. **Week 4:** Full rollout

### Strategy 2: Separate Environments

- `testnet.hunty.app` → Locked to testnet
- `app.hunty.app` → Locked to mainnet
- Lock network by not including the NetworkSwitcher component

### Strategy 3: Feature Flag

```typescript
// lib/featureFlags.ts
export const ENABLE_NETWORK_SWITCHING = 
  process.env.NEXT_PUBLIC_ENABLE_NETWORK_SWITCHING === "true"

// In Settings page
{ENABLE_NETWORK_SWITCHING && <NetworkSwitcher />}
```

## Monitoring

### Metrics to Track

- Network switch events
- Network mismatch warnings shown
- Failed transactions by network
- User distribution (testnet vs mainnet)

### Analytics Example

```typescript
import { analytics } from "@/lib/analytics"

// Track network switches
setSorobanNetworkType(newNetwork)
analytics.track("network_switched", {
  from: currentNetwork,
  to: newNetwork,
  timestamp: Date.now()
})

// Track network mismatches
if (mismatch) {
  analytics.track("network_mismatch_detected", {
    appNetwork: mismatch.appNetwork,
    walletNetwork: mismatch.walletNetwork,
    provider: walletProvider
  })
}
```

## Testing Checklist

Before going live:

- [ ] All contract addresses set for both networks
- [ ] Testnet contracts functional
- [ ] Mainnet contracts functional  
- [ ] Network switching works locally
- [ ] Network switching works in staging
- [ ] Visual indicators display correctly
- [ ] Wallet network detection works
- [ ] Mismatch warnings appear
- [ ] Transactions succeed on testnet
- [ ] Transactions succeed on mainnet
- [ ] User preference persists
- [ ] Cross-tab synchronization works
- [ ] Mobile responsive
- [ ] Dark mode compatible

## Support During Migration

### For End Users

- Display migration notice in UI
- Provide clear instructions
- Monitor support channels
- Have rollback plan ready

### For Developers

- Document breaking changes
- Provide code examples
- Host Q&A session
- Update all documentation

## Post-Migration

### Day 1-7

- Monitor error rates
- Track network switching
- Collect user feedback
- Fix critical issues

### Week 2-4

- Optimize network detection
- Improve error messages
- Add more visual indicators
- Consider UX improvements

### Month 2+

- Evaluate mainnet adoption
- Plan additional features
- Update documentation
- Share lessons learned

## Questions?

Contact the development team or open an issue on GitHub.

---

**Last Updated**: January 2025
