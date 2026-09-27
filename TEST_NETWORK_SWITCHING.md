# Network Switching - Testing Guide

## Quick Start Testing

Follow these steps to test the network switching feature immediately after deployment.

## Prerequisites

```bash
cd hunty
pnpm install  # or npm install
```

## Setup Test Environment Variables

Create `.env.local`:

```env
# Network Configuration
NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet

# Testnet Contracts (use mock addresses for testing)
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CATESTCORE000000000000000000000000000000000000000000000
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CATESTREWARD00000000000000000000000000000000000000000
NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CATESTNFT0000000000000000000000000000000000000000000

# Mainnet Contracts (use mock addresses for testing)
NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CAMAINCORE000000000000000000000000000000000000000000000
NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CAMAINREWARD00000000000000000000000000000000000000000
NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CAMAINNFT0000000000000000000000000000000000000000000

# RPC URLs
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## Run Development Server

```bash
pnpm dev
# or
npm run dev
```

Visit: http://localhost:3000

## Visual Testing Checklist

### 1. Header Network Indicator

**Test:**
- [ ] Yellow "TESTNET" badge visible in header (right side)
- [ ] Badge is responsive on mobile
- [ ] Badge updates when network changes

**Expected Result:**
```
[TESTNET] badge with yellow background in header navigation bar
```

### 2. Testnet Warning Banner

**Test:**
- [ ] Yellow banner appears at top of page
- [ ] Banner shows "You're on Stellar Testnet"
- [ ] "Dismiss" button works
- [ ] Banner stays dismissed for session
- [ ] Banner reappears on new session

**Expected Result:**
```
╔════════════════════════════════════════════════════════╗
║ ⚠️  You're on Stellar Testnet                          ║
║     Transactions use test XLM. No real assets at risk. ║
║                                          [Dismiss]      ║
╚════════════════════════════════════════════════════════╝
```

### 3. Settings Page Access

**Test:**
- [ ] "Settings" link visible in header navigation (desktop)
- [ ] "Settings" link in wallet dropdown menu
- [ ] Settings page loads at `/settings`

**Path:**
1. Click "Settings" in header navigation
2. Should navigate to `/settings`

### 4. Network Switcher Component

**Test:**
- [ ] Current network clearly indicated
- [ ] Testnet option shows yellow styling
- [ ] Mainnet option shows green styling
- [ ] Active network has checkmark icon
- [ ] Inactive network is clickable

**Expected UI:**
```
┌─────────────────────────────────────┐
│ Current Network: Testnet            │
│                                      │
│ ┌─────────┐  ┌─────────┐           │
│ │✓TESTNET │  │ MAINNET │           │
│ │ Yellow  │  │  Gray   │           │
│ └─────────┘  └─────────┘           │
└─────────────────────────────────────┘
```

### 5. Network Switch Confirmation

**Test:**
- [ ] Click "Mainnet" in network switcher
- [ ] Confirmation modal appears
- [ ] Modal explains the switch
- [ ] "Cancel" button closes modal
- [ ] "Switch & Reload" button triggers reload

**Expected Modal:**
```
┌──────────────────────────────────────────┐
│ ⚠️  Switch to Mainnet?                   │
│                                           │
│ You're about to switch to Mainnet.       │
│ Transactions will use real XLM and       │
│ interact with production smart           │
│ contracts. The page will reload.         │
│                                           │
│ [Cancel]  [Switch & Reload]              │
└──────────────────────────────────────────┘
```

### 6. Network Persistence

**Test:**
- [ ] Switch to mainnet
- [ ] Page reloads automatically
- [ ] Green "MAINNET" badge now visible
- [ ] Network stays mainnet after manual refresh
- [ ] Open new tab - network preference persists

**Expected:**
```
Testnet → Switch → Reload → Mainnet (persisted)
```

### 7. Contract Address Resolution

**Test in Browser Console:**

```javascript
// Open browser console (F12)

// Test 1: Check current network
import { getSorobanNetworkType } from "./lib/soroban/client"
console.log("Current network:", getSorobanNetworkType())
// Expected: "testnet" or "mainnet"

// Test 2: Check contracts
import { getContracts } from "./lib/contracts/config"
console.log("Contracts:", getContracts())
// Expected: Object with HUNTY_CORE, REWARD_MANAGER, NFT_REWARD

// Test 3: Verify network-specific addresses
console.log("Core address:", getContracts().HUNTY_CORE)
// Should match TESTNET or MAINNET env var based on active network
```

### 8. Wallet Connection (with Freighter)

**Prerequisites:**
- Install Freighter wallet extension
- Set Freighter to testnet

**Test:**
- [ ] Connect Freighter wallet
- [ ] No network mismatch warning (both on testnet)
- [ ] Switch Freighter to mainnet
- [ ] Orange mismatch warning appears
- [ ] "Go to Settings" link works

**Expected Mismatch Warning:**
```
┌──────────────────────────────────────────┐
│ ⚠️  Network Mismatch Detected            │
│                                           │
│ Your wallet is connected to mainnet but  │
│ the app is configured for testnet.       │
│ Transactions may fail.                   │
│                                           │
│ [Go to Settings]  [Dismiss]              │
└──────────────────────────────────────────┘
```

### 9. Cross-Tab Synchronization

**Test:**
- [ ] Open app in Tab 1
- [ ] Open app in Tab 2
- [ ] Switch network in Tab 1
- [ ] Tab 2 should detect change (after reload)

**Note:** localStorage changes sync across tabs, but require reload to apply.

### 10. Mobile Responsiveness

**Test on Mobile/Narrow Window:**
- [ ] Network badge visible and readable
- [ ] Settings accessible from menu
- [ ] Network switcher buttons properly sized
- [ ] Confirmation modal fits screen
- [ ] Touch targets are adequate (min 44x44px)

## Automated Testing

### Unit Tests

Create `lib/soroban/client.test.ts`:

```typescript
import { getSorobanNetworkType, setSorobanNetworkType } from "./client"

describe("Network Switching", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("should default to testnet", () => {
    expect(getSorobanNetworkType()).toBe("testnet")
  })

  it("should persist network preference", () => {
    setSorobanNetworkType("mainnet")
    expect(localStorage.getItem("stellar_network_preference")).toBe("mainnet")
    expect(getSorobanNetworkType()).toBe("mainnet")
  })

  it("should switch back to testnet", () => {
    setSorobanNetworkType("mainnet")
    setSorobanNetworkType("testnet")
    expect(getSorobanNetworkType()).toBe("testnet")
  })
})
```

Run tests:
```bash
pnpm test
```

### Integration Tests

Create `e2e/network-switching.spec.ts`:

```typescript
import { test, expect } from "@playwright/test"

test.describe("Network Switching", () => {
  test("should show testnet indicator by default", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator('[data-testid="network-indicator"]')).toContainText("TESTNET")
  })

  test("should allow switching networks", async ({ page }) => {
    await page.goto("/settings")
    
    // Click mainnet option
    await page.click('text=Mainnet')
    
    // Confirm modal should appear
    await expect(page.locator('text=Switch to Mainnet?')).toBeVisible()
    
    // Click confirm
    await page.click('text=Switch & Reload')
    
    // Page should reload and show mainnet
    await page.waitForLoadState("networkidle")
    await expect(page.locator('[data-testid="network-indicator"]')).toContainText("MAINNET")
  })
})
```

Run E2E tests:
```bash
pnpm e2e
```

## Console Testing Commands

Open browser console and test these commands:

```javascript
// 1. Check current network
localStorage.getItem("stellar_network_preference")

// 2. Manually switch to mainnet
localStorage.setItem("stellar_network_preference", "mainnet")
location.reload()

// 3. Switch back to testnet
localStorage.setItem("stellar_network_preference", "testnet")
location.reload()

// 4. Clear preference (use env var default)
localStorage.removeItem("stellar_network_preference")
location.reload()

// 5. Check contract addresses (in console after page load)
// This requires importing in the browser - better to add a debug function
window.__DEBUG_NETWORK__ = () => {
  console.log("Network:", getSorobanNetworkType())
  console.log("Contracts:", getContracts())
}
```

## Common Issues & Solutions

### Issue: Network badge not showing

**Check:**
1. Is component imported in Header?
2. Is the component client-side? (has "use client")
3. Check browser console for errors

**Solution:**
```typescript
// In Header.tsx, verify import:
import { NetworkIndicator } from "./NetworkIndicator"

// And render:
<NetworkIndicator variant="pill" showIcon={true} />
```

### Issue: Settings page 404

**Check:**
- File exists at `app/settings/page.tsx`
- No routing conflicts
- Development server restarted

**Solution:**
```bash
# Restart dev server
pnpm dev
```

### Issue: Network not persisting

**Check:**
- localStorage enabled in browser
- Not in incognito mode (unless localStorage allowed)
- Check browser privacy settings

**Solution:**
```javascript
// Test localStorage
localStorage.setItem("test", "123")
console.log(localStorage.getItem("test")) // Should print "123"
```

### Issue: Contract addresses not loading

**Check:**
1. Environment variables set correctly
2. .env.local file in project root
3. Dev server restarted after env changes

**Solution:**
```bash
# Verify env vars
echo $NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET

# Restart server
pnpm dev
```

## Performance Testing

### Measure bundle size impact

```bash
pnpm build
pnpm bundle:check
```

Expected impact: +15-20KB (network switching components)

### Measure runtime performance

```javascript
// In browser console
performance.mark("network-check-start")
const network = getSorobanNetworkType()
performance.mark("network-check-end")
performance.measure("network-check", "network-check-start", "network-check-end")
console.log(performance.getEntriesByName("network-check"))
```

Expected: <1ms for network check

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab to network badge
- [ ] Tab to settings link
- [ ] Tab through network switcher
- [ ] Space/Enter to activate buttons
- [ ] Esc to close modal

### Screen Reader Testing
- [ ] Network badge announces current network
- [ ] Testnet warning is announced
- [ ] Modal has proper ARIA labels
- [ ] Focus management in modal

### Color Contrast
- [ ] Yellow badge text readable
- [ ] Green badge text readable
- [ ] Warning text has sufficient contrast
- [ ] Dark mode passes WCAG AA

## Sign-Off Checklist

Before marking complete:

- [ ] All visual tests pass
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Tested on Chrome, Firefox, Safari
- [ ] Tested on mobile devices
- [ ] Accessibility check complete
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Deployed to staging

## Next Steps After Testing

1. **If tests pass:**
   - Deploy to production
   - Monitor analytics
   - Collect user feedback

2. **If tests fail:**
   - Document issues
   - Create bug tickets
   - Fix and retest

3. **Post-deployment:**
   - Monitor error rates
   - Track network switching usage
   - Optimize based on data

---

**Happy Testing! 🚀**
