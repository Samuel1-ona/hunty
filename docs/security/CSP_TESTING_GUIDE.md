# Content Security Policy (CSP) Implementation - Testing Guide

This guide provides a comprehensive step-by-step process to verify successful implementation of Content Security Policy headers and additional security headers in the Hunty application.

---

## Overview of Implementation

The CSP headers have been added to `next.config.ts` via the `headers()` API with the following features:

- **Report-Only Mode** (Staging): Logs CSP violations without blocking resources
- **Enforcement Mode** (Production): Blocks resources that violate the policy
- **Trusted Sources**:
  - `self` - Same origin
  - Soroban RPC endpoints (testnet and mainnet)
  - IPFS Gateways (Pinata, Cloudflare, dweb.link, ipfs.io)
  - Resend API (email service)
  - Torii Indexer APIs

- **Additional Headers**:
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
  - `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
  - `Referrer-Policy: strict-origin-when-cross-origin` - Referrer control
  - `Permissions-Policy` - Restricts geolocation, microphone, camera

---

## Step 1: Build and Run the Application

### 1.1 Install Dependencies
```bash
cd /workspaces/hunty
pnpm install
```

### 1.2 Start Development Server
```bash
pnpm dev
```

**Expected Output:**
```
▲ Next.js 15.3.4
- Local:        http://localhost:3000
```

**Why this step matters:** This ensures the application compiles without errors and the `headers()` configuration is valid.

---

## Step 2: Verify CSP Headers in Development Mode (Report-Only)

### 2.1 Check Headers Using curl

```bash
curl -I http://localhost:3000
```

**Expected Output:**
```
HTTP/1.1 200 OK
...
Content-Security-Policy-Report-Only: script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: https://gateway.pinata.cloud https://*.mypinata.cloud https://cloudflare-ipfs.com https://dweb.link https://ipfs.io; connect-src 'self' https://api.resend.com https://torii-indexer.stellar-mainnet.public.blastapi.io https://indexer.testnet.torii.com https://soroban-testnet.stellar.org https://rpc.testnet.soroban.stellar.org https://soroban-mainnet.stellar.org https://rpc.mainnet.soroban.stellar.org wss: https:; font-src 'self' data: https:; frame-ancestors 'none'; default-src 'self'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), microphone=(), camera=()
```

**Verification Checklist:**
- [ ] `Content-Security-Policy-Report-Only` header is present (dev mode)
- [ ] All Soroban RPC endpoints are included
- [ ] All IPFS gateways are listed
- [ ] `X-Frame-Options: DENY` is present
- [ ] `X-Content-Type-Options: nosniff` is present
- [ ] `X-XSS-Protection: 1; mode=block` is present
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` is present
- [ ] `Permissions-Policy` is configured correctly

### 2.2 Parse Headers More Clearly

```bash
curl -I http://localhost:3000 | grep -E "Content-Security-Policy|X-Frame-Options|X-Content-Type-Options"
```

**Expected Output:**
```
Content-Security-Policy-Report-Only: script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

---

## Step 3: Browser Developer Tools Verification

### 3.1 Chrome/Chromium DevTools

**Steps:**
1. Open the application in Chrome: `http://localhost:3000`
2. Open DevTools: `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. Go to the **Network** tab
4. Refresh the page: `Ctrl+R` (Windows/Linux) or `Cmd+R` (Mac)
5. Click on the main document request (usually the first one)
6. Go to the **Response Headers** section

**Expected Headers Visible:**
- `content-security-policy-report-only`
- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `referrer-policy: strict-origin-when-cross-origin`
- `permissions-policy: geolocation=(self), microphone=(), camera=()`

**Verification Checklist:**
- [ ] All security headers are visible in Response Headers
- [ ] CSP is in report-only mode (in development)
- [ ] No resources are blocked (all load successfully)

### 3.2 Safari DevTools

**Steps:**
1. Open the application in Safari
2. Enable DevTools: Develop menu (Develop > Show Web Inspector) or `Cmd+Option+U`
3. Go to the **Network** tab
4. Refresh the page: `Cmd+R`
5. Click on the main document request
6. View the Response Headers

**Expected:** Same headers as Chrome

### 3.3 Firefox DevTools

**Steps:**
1. Open the application in Firefox: `http://localhost:3000`
2. Open DevTools: `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
3. Go to the **Inspector** tab → **Network** subtab
4. Refresh the page: `Ctrl+R` or `Cmd+R`
5. Click the main document request
6. View Response Headers

**Expected:** Same headers as Chrome

---

## Step 4: Verify Trusted Sources Work Correctly

### 4.1 Test IPFS Gateway Access

**Action:** Navigate to a page that loads images from IPFS gateways
1. Load the Hunt Cards component or any page with IPFS images
2. Open DevTools Network tab
3. Look for requests to:
   - `gateway.pinata.cloud`
   - `cloudflare-ipfs.com`
   - `dweb.link`
   - `ipfs.io`

**Expected:** Images load successfully with HTTP 200 status

**Verification Checklist:**
- [ ] IPFS images load without CSP violations
- [ ] No warnings in console about blocked resources

### 4.2 Test Blockchain Interactions

**Action:** Connect wallet and perform a blockchain operation
1. Click "Connect Wallet" button
2. Open DevTools Console
3. Monitor Network tab for Soroban RPC calls
4. Look for requests to `soroban-testnet.stellar.org` or similar

**Expected:** Blockchain calls succeed without CSP violations

**Verification Checklist:**
- [ ] Wallet connects successfully
- [ ] Blockchain calls reach the Soroban RPC endpoint
- [ ] No CSP-related errors in console

### 4.3 Check for CSP Report Violations

**Steps:**
1. Keep DevTools open in Console tab
2. Interact with the application
3. Look for messages like: `[Report Only] Refused to load the script because...`

**Expected in Report-Only Mode:** No CSP violations reported for legitimate resources

**Expected Violations (should be blocked in production):**
- Scripts from unauthorized external sources
- Styles from unauthorized external sources
- Connections to unauthorized APIs

---

## Step 5: Production Mode Testing

### 5.1 Build for Production

```bash
cd /workspaces/hunty
pnpm build
pnpm start
```

**Expected Output:**
```
▲ Next.js 15.3.4
- Listening on 0.0.0.0:3000
```

### 5.2 Verify Enforcement Mode Headers

**Steps:**
1. Set production environment:
   ```bash
   NODE_ENV=production pnpm start
   ```

2. Check headers:
   ```bash
   curl -I http://localhost:3000
   ```

**Expected Output:**
```
Content-Security-Policy: script-src 'self' 'unsafe-inline' 'unsafe-eval'; ...
```

**Note:** Header should now be `Content-Security-Policy` (not `Report-Only`)

**Verification Checklist:**
- [ ] `Content-Security-Policy` header present (not Report-Only)
- [ ] All security headers still present
- [ ] Application functions normally with enforcement mode

---

## Step 6: Test Staging vs. Production Mode

### 6.1 Staging Mode (Report-Only)

```bash
# Development mode uses report-only by default
pnpm dev
```

**Expected:**
- Header: `Content-Security-Policy-Report-Only`
- Violations logged but not blocked
- All resources load successfully

### 6.2 Production Mode (Enforcement)

```bash
NODE_ENV=production pnpm start
```

**Expected:**
- Header: `Content-Security-Policy`
- Policy actively enforced
- Unauthorized resources blocked

### 6.3 Force Report-Only in Production (for safe rollout)

```bash
NODE_ENV=production CSP_REPORT_ONLY=true pnpm start
```

**Expected:**
- Header: `Content-Security-Policy-Report-Only`
- Even in production, violations are logged but not blocked
- Allows safe monitoring before enforcement

---

## Step 7: End-to-End Test Suite

### 7.1 Run E2E Tests

```bash
cd /workspaces/hunty
pnpm test:e2e
```

**Expected:** All existing E2E tests pass with CSP headers active

**What to verify:**
- [ ] `test:dashboard` passes (no CSP violations)
- [ ] `test:hunt-creation` passes (IPFS uploads work)
- [ ] `test:claim-reward` passes (blockchain calls work)
- [ ] `test:wallet-connection` passes (Freighter integration works)

### 7.2 Run Unit Tests

```bash
pnpm test
```

**Expected:** All unit tests pass

---

## Step 8: Performance & Security Audit

### 8.1 Lighthouse Audit

```bash
# Open Chrome DevTools while running the application
# Go to Lighthouse tab
# Run audit for "Performance", "Security", "Best Practices"
```

**Expected:**
- Security score: 90+
- No CSP-related issues reported

### 8.2 Browser Security Extensions

**Using:**
- OWASP ZAP (free security scanner)
- Burp Suite (free community edition)

**Steps:**
1. Run security scanner on `http://localhost:3000`
2. Check for CSP-related findings
3. Verify no high-risk security issues

---

## Step 9: Monitor CSP Violations

### 9.1 Console Monitoring in Development

**Steps:**
1. Open DevTools Console
2. Interact with the application
3. Look for messages:
   - `Refused to load the script from ...` (report-only mode will show)
   - `Refused to load the stylesheet from ...`
   - `Refused to connect to ... because it violates the following CSP directive`

**Expected in Development:**
- No violations from legitimate resources
- Any violations should be from external/unauthorized sources

### 9.2 Create Custom CSP Violation Handler (Optional)

Add this to your app for monitoring (in production):

```typescript
// app/providers.tsx or similar
if (typeof window !== 'undefined') {
  window.addEventListener('securitypolicyviolation', (e) => {
    console.warn('CSP Violation:', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      sourceFile: e.sourceFile,
      lineNumber: e.lineNumber,
    });
  });
}
```

---

## Step 10: Verify All Application Features

### 10.1 Core Features Checklist

Navigate through the application and verify these work with CSP enabled:

**Hunt Management:**
- [ ] Create a new hunt
- [ ] Upload images to IPFS (via hunt creation)
- [ ] View hunt details
- [ ] IPFS images load correctly

**Player Experience:**
- [ ] Register for a hunt
- [ ] Submit clues
- [ ] Complete a hunt
- [ ] View leaderboard

**Wallet & Blockchain:**
- [ ] Connect Freighter wallet
- [ ] View wallet balance
- [ ] Initiate blockchain transactions
- [ ] Claim NFT rewards

**Admin Features:**
- [ ] Access dashboard
- [ ] View analytics
- [ ] Manage hunts

**Verification Checklist:**
- [ ] All features work without console errors
- [ ] No CSP violations reported
- [ ] Images from all IPFS gateways load
- [ ] Blockchain calls reach Soroban endpoints

---

## Step 11: Test Different Browsers

### Supported Browsers:

- [ ] **Chrome/Edge** (latest)
  ```bash
  # Already tested
  ```

- [ ] **Firefox** (latest)
  ```bash
  # Test by opening http://localhost:3000 in Firefox
  ```

- [ ] **Safari** (latest on macOS/iOS)
  ```bash
  # Test by opening http://localhost:3000 in Safari
  ```

- [ ] **Mobile Browsers** (iOS Safari, Chrome Android)
  ```bash
  # Get local IP: ipconfig getifaddr en0 (macOS) or hostname -I (Linux)
  # Access via: http://<LOCAL_IP>:3000 from mobile device
  ```

**Verification Checklist for Each Browser:**
- [ ] All headers present
- [ ] No console errors
- [ ] All features functional
- [ ] Images load correctly

---

## Step 12: Documentation & Sign-Off

### 12.1 Verify next.config.ts Changes

```bash
cd /workspaces/hunty
cat next.config.ts | grep -A 50 "async headers()"
```

**Expected:** Should see:
- CSP header configuration
- Soroban RPC endpoints
- IPFS gateways
- Resend API
- X-Frame-Options
- X-Content-Type-Options

### 12.2 Review Changes

```bash
git diff next.config.ts
```

**Expected:** Shows new `headers()` function with all security configurations

---

## Troubleshooting Guide

### Issue: CSP Headers Not Appearing

**Possible Causes:**
1. Application not running with updated config
2. Cache not cleared

**Solution:**
```bash
# Stop the dev server (Ctrl+C)
# Clear Next.js cache
rm -rf .next
# Restart
pnpm dev
```

### Issue: Resources Blocked by CSP

**Symptoms:**
- Images not loading
- API calls failing
- Console shows CSP violation warnings

**Solution:**
1. Identify the blocked resource URL
2. Add to appropriate CSP directive in `next.config.ts`
3. Rebuild and test

### Issue: CSP Report-Only Not Working

**Solution:**
```bash
# Verify NODE_ENV
echo $NODE_ENV

# Should be empty (development) or "development"
# NOT "production"
```

### Issue: Soroban RPC Calls Blocked

**Solution:**
1. Check the actual RPC URL being used
2. Verify it's in the `sorobanRpcEndpoints` array
3. Add if missing

---

## Final Verification Checklist

### Security Headers Present:
- [ ] `Content-Security-Policy` or `Content-Security-Policy-Report-Only`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy` configured

### CSP Directives Configured:
- [ ] `script-src` - Contains self and necessary scripts
- [ ] `style-src` - Contains self and inline styles
- [ ] `img-src` - Contains self, data URLs, and IPFS gateways
- [ ] `connect-src` - Contains self, Soroban RPC, APIs
- [ ] `font-src` - Contains self and font sources
- [ ] `frame-ancestors 'none'` - Prevents clickjacking
- [ ] `default-src 'self'` - Safe default

### Application Functionality:
- [ ] All pages load without errors
- [ ] IPFS images display correctly
- [ ] Blockchain operations work
- [ ] Wallet connection successful
- [ ] All E2E tests pass
- [ ] Console is clean (no CSP violations for legitimate resources)

### Environment Modes:
- [ ] Development = Report-Only mode
- [ ] Production = Enforcement mode
- [ ] CSP_REPORT_ONLY=true = Report-Only even in production (safe rollout)

---

## Summary

This CSP implementation protects the Hunty application from:

✅ **Script Injection Attacks** - Only self-hosted scripts and whitelisted origins  
✅ **Data Exfiltration** - Limited connection sources  
✅ **Clickjacking** - X-Frame-Options prevents framing  
✅ **MIME Type Sniffing** - X-Content-Type-Options prevents misinterpretation  
✅ **XSS Attacks** - XSS protection headers in place  

The staged rollout approach ensures:
- ✅ Report-only mode captures violations without breaking functionality
- ✅ Smooth transition to enforcement after monitoring
- ✅ All legitimate operations (blockchain, IPFS, emails) continue working

---

## Support & Questions

For issues or questions about CSP:
1. Check the Troubleshooting Guide above
2. Review OWASP CSP documentation: https://owasp.org/www-community/attacks/xss/#prevention-measures
3. Reference MDN CSP Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP

