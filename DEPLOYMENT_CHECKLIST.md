# Network Switching - Deployment Checklist

## Pre-Deployment Verification

Use this checklist before deploying to ensure everything works correctly.

---

## 1. Environment Variables Setup

### Development (.env.local)

```bash
# Copy and fill in your values
cp .env.example .env.local
```

Required variables:

```env
- [ ] NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=testnet
- [ ] NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET=CA...
- [ ] NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_TESTNET=CA...
- [ ] NEXT_PUBLIC_NFT_REWARD_ADDRESS_TESTNET=CA...
- [ ] NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET=CA...
- [ ] NEXT_PUBLIC_REWARD_MANAGER_ADDRESS_MAINNET=CA...
- [ ] NEXT_PUBLIC_NFT_REWARD_ADDRESS_MAINNET=CA...
```

**Verify:**

```bash
grep "NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET" .env.local
grep "NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET" .env.local
```

---

## 2. Install Dependencies

```bash
- [ ] pnpm install  # or npm install
- [ ] Check for any peer dependency warnings
- [ ] Verify no installation errors
```

---

## 3. Build Check

```bash
- [ ] pnpm build
- [ ] Check build output for errors
- [ ] Verify no TypeScript errors
- [ ] Check bundle size is acceptable
```

Expected output:

```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
```

---

## 4. Development Server Test

```bash
pnpm dev
```

### Visual Checks:

- [ ] Server starts without errors
- [ ] No console errors on page load
- [ ] Navigate to http://localhost:3000
- [ ] Page loads successfully
- [ ] No 404 errors in Network tab

### Component Checks:

- [ ] Yellow "TESTNET" badge visible in header
- [ ] Yellow testnet warning banner appears at top
- [ ] "Settings" link visible in navigation
- [ ] "Settings" link in wallet dropdown (if wallet connected)

---

## 5. Settings Page Test

Visit: http://localhost:3000/settings

- [ ] Settings page loads without errors
- [ ] "Network Settings" card visible
- [ ] Current network shown (Testnet)
- [ ] Both network options (Testnet/Mainnet) displayed
- [ ] Testnet option has checkmark
- [ ] Testnet option has yellow styling
- [ ] Mainnet option is clickable
- [ ] Developer info section shows environment

---

## 6. Network Switching Test

On settings page:

1. **Click Mainnet option**

   - [ ] Confirmation modal appears
   - [ ] Modal shows warning text
   - [ ] "Cancel" button visible
   - [ ] "Switch & Reload" button visible

2. **Click "Switch & Reload"**

   - [ ] Page reloads automatically
   - [ ] Green "MAINNET" badge now in header
   - [ ] No testnet warning banner
   - [ ] Settings shows Mainnet as active
   - [ ] Mainnet has checkmark and green styling

3. **Verify Persistence**

   - [ ] Refresh page manually (Cmd/Ctrl + R)
   - [ ] Still shows Mainnet
   - [ ] Open new tab to same URL
   - [ ] New tab also shows Mainnet

4. **Switch Back to Testnet**
   - [ ] Click Testnet option
   - [ ] Confirm switch
   - [ ] Page reloads
   - [ ] Yellow "TESTNET" badge returns
   - [ ] Warning banner reappears

---

## 7. Browser Console Check

Open browser console (F12):

```javascript
// Check network preference
console.log(localStorage.getItem('stellar_network_preference'));
// Should output: "testnet" or "mainnet"

// Check no errors
// Console should be clean (no red errors)
```

- [ ] No JavaScript errors
- [ ] No import errors
- [ ] No "undefined" errors
- [ ] No 404 network requests
- [ ] localStorage working

---

## 8. Contract Address Verification

In browser console:

```javascript
// This requires adding a debug helper - check manually in code instead
// Or verify by attempting a transaction (if safe)
```

Manual verification:

- [ ] Check `lib/contracts/config.ts` exports `getContracts()`
- [ ] Testnet contracts returned when on testnet
- [ ] Mainnet contracts returned when on mainnet

---

## 9. Wallet Connection Test (Optional)

If you have Freighter installed:

1. **Connect Wallet**

   - [ ] Click "Connect Wallet" in header
   - [ ] Freighter popup appears
   - [ ] Approve connection
   - [ ] Wallet connects successfully

2. **Network Mismatch Test**

   - [ ] Set app to testnet
   - [ ] Set Freighter to mainnet
   - [ ] Orange warning banner should appear
   - [ ] Warning says "Network mismatch detected"
   - [ ] "Go to Settings" button works
   - [ ] "Dismiss" button closes warning

3. **Fix Mismatch**
   - [ ] Switch app to mainnet (or wallet to testnet)
   - [ ] Warning disappears
   - [ ] No errors in console

---

## 10. Mobile Responsiveness

Test on mobile or narrow browser window:

- [ ] Network badge visible and readable
- [ ] Settings page responsive
- [ ] Network switcher buttons adequate size
- [ ] Confirmation modal fits screen
- [ ] All text readable
- [ ] Touch targets big enough (44x44px min)

---

## 11. Dark Mode Test

Toggle dark mode:

- [ ] Network badge readable in dark mode
- [ ] Testnet warning readable in dark mode
- [ ] Settings page readable in dark mode
- [ ] Network switcher styled correctly in dark mode
- [ ] Confirmation modal readable in dark mode
- [ ] Good contrast throughout

---

## 12. Cross-Browser Test

Test in multiple browsers:

- [ ] Chrome/Edge - Works
- [ ] Firefox - Works
- [ ] Safari - Works
- [ ] Mobile Safari (iOS) - Works
- [ ] Mobile Chrome (Android) - Works

---

## 13. Accessibility Test

Keyboard navigation:

- [ ] Tab to network badge (if focusable)
- [ ] Tab to Settings link
- [ ] Tab through network switcher options
- [ ] Space/Enter activates buttons
- [ ] Esc closes confirmation modal
- [ ] Focus visible throughout

Screen reader (optional):

- [ ] Network indicator announces current network
- [ ] Testnet warning is announced
- [ ] Button labels are clear
- [ ] Modal has proper ARIA labels

---

## 14. Documentation Check

Verify all docs are present:

- [ ] `NETWORK_SWITCHING_GUIDE.md` exists
- [ ] `NETWORK_MIGRATION.md` exists
- [ ] `NETWORK_SWITCHING_IMPLEMENTATION_SUMMARY.md` exists
- [ ] `TEST_NETWORK_SWITCHING.md` exists
- [ ] `NETWORK_QUICK_REFERENCE.md` exists
- [ ] `BUGS_FIXED.md` exists
- [ ] `DEPLOYMENT_CHECKLIST.md` exists (this file)

---

## 15. Production Build Test

```bash
pnpm build
pnpm start
```

- [ ] Production build succeeds
- [ ] Production server starts
- [ ] Visit http://localhost:3000
- [ ] All features work in production build
- [ ] No errors in browser console
- [ ] Performance is good

---

## 16. Production Environment Setup

Before deploying to production:

### Vercel/Netlify

- [ ] Add all env vars in dashboard
- [ ] Set mainnet contract addresses
- [ ] Set `NEXT_PUBLIC_SOROBAN_NETWORK_TYPE=mainnet` (for production)
- [ ] Test deploy to staging first

### Docker

- [ ] Update Dockerfile with env vars
- [ ] Build Docker image successfully
- [ ] Run container and test
- [ ] Verify env vars accessible in container

### CI/CD

- [ ] Update GitHub Actions / GitLab CI
- [ ] Add secrets for contract addresses
- [ ] Test CI/CD pipeline
- [ ] Verify automated deployment works

---

## 17. Post-Deployment Verification

After deploying to production:

### Immediate Checks (within 1 hour)

- [ ] Production site loads
- [ ] No 500 errors
- [ ] No console errors
- [ ] Network badge displays
- [ ] Settings page accessible
- [ ] Network switching works

### Monitor (first 24 hours)

- [ ] Check error logs
- [ ] Monitor user reports
- [ ] Verify analytics tracking
- [ ] Check transaction success rate
- [ ] Monitor network switch events

### User Testing (first week)

- [ ] Collect user feedback
- [ ] Monitor support tickets
- [ ] Check for confusion about networks
- [ ] Verify no unintended mainnet usage
- [ ] Track feature adoption

---

## 18. Rollback Plan

If issues occur:

### Quick Rollback

```bash
git revert <commit-hash>
git push
```

### Environment Variable Rollback

- Remove network-specific env vars
- Keep legacy env vars as fallback
- App will use testnet by default

### Feature Flag Rollback

- Set `NEXT_PUBLIC_ENABLE_NETWORK_SWITCHING=false`
- Hide NetworkSwitcher component
- Users stay on default network

---

## Issue Reporting

If you find issues during testing:

1. **Document the issue:**

   - What were you doing?
   - What did you expect?
   - What actually happened?
   - Browser/device info
   - Screenshots if applicable

2. **Check console:**

   - Any errors?
   - Any warnings?
   - Network requests failing?

3. **Check localStorage:**

   ```javascript
   console.log(localStorage.getItem('stellar_network_preference'));
   ```

4. **Report in:**
   - GitHub issues
   - Team Slack/Discord
   - Email to dev team

---

## Sign-Off

Before marking as complete:

**Developer Sign-Off:**

- [ ] All checklist items completed
- [ ] No critical bugs found
- [ ] Documentation reviewed
- [ ] Code reviewed by peer
- [ ] Ready for production

**QA Sign-Off:**

- [ ] All test cases passed
- [ ] Regression testing complete
- [ ] Performance acceptable
- [ ] Security review passed
- [ ] Ready for deployment

**Product Sign-Off:**

- [ ] Feature meets requirements
- [ ] UX acceptable
- [ ] Documentation adequate
- [ ] Stakeholders informed
- [ ] Approved for release

---

## Success Criteria

✅ **Deployment is successful if:**

1. All checklist items pass
2. No critical bugs found
3. Users can switch networks
4. Network persists across sessions
5. Visual indicators work correctly
6. No impact on existing features
7. Performance is acceptable
8. Documentation is complete

---

**Deployment Date:** **\*\***\_**\*\***
**Deployed By:** **\*\***\_**\*\***
**Version:** 1.0.0
**Status:** ⬜ Ready / ⬜ Deployed / ⬜ Verified

---

## Next Steps After Deployment

1. Monitor for 24 hours
2. Collect user feedback
3. Track analytics
4. Plan improvements based on data
5. Document lessons learned

**Good luck with your deployment! 🚀**
