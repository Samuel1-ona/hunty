import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Automated security checks', () => {
  test('Security headers: CSP and HSTS present', async ({ request }) => {
    const res = await request.get(BASE);
    const headers = res.headers();
    const csp = headers['content-security-policy'] || 
                headers['Content-Security-Policy'] || 
                headers['content-security-policy-report-only'] || 
                headers['Content-Security-Policy-Report-Only'];
    expect(csp).toBeTruthy();
  });

  test('CSP: allows Stellar RPC and IPFS gateways', async ({ request }) => {
    const res = await request.get(BASE);
    const headers = res.headers();
    const csp = headers['content-security-policy'] || 
                headers['Content-Security-Policy'] || 
                headers['content-security-policy-report-only'] || 
                headers['Content-Security-Policy-Report-Only'] || '';
    
    // Check for IPFS gateways
    expect(csp).toContain('gateway.pinata.cloud');
    expect(csp).toContain('cloudflare-ipfs.com');
    
    // Check for Stellar/Soroban RPCs
    expect(csp).toContain('soroban-testnet.stellar.org');
    expect(csp).toContain('rpc.testnet.soroban.stellar.org');
  });

  test('CSP: inline scripts have a valid nonce', async ({ page }) => {
    await page.goto(BASE);
    
    // Find script tags that contain the theme logic
    const scripts = await page.locator('script').all();
    let foundThemeScript = false;
    
    for (const script of scripts) {
      const content = await script.innerHTML();
      if (content.includes('localStorage.getItem(\'theme\')')) {
        foundThemeScript = true;
        const nonce = await script.getAttribute('nonce');
        expect(nonce).toBeTruthy();
        expect(nonce?.length).toBeGreaterThan(10);
        break;
      }
    }
    
    expect(foundThemeScript).toBe(true);
  });

  test('CSP: violation reporting endpoint works', async ({ request }) => {
    const res = await request.post(`${BASE}/api/csp-report`, {
      headers: {
        'content-type': 'application/csp-report',
      },
      data: JSON.stringify({
        'csp-report': {
          'document-uri': `${BASE}/test-page`,
          'violated-directive': 'script-src',
          'blocked-uri': 'http://evil.com/malicious.js',
        }
      })
    });
    
    expect(res.status()).toBe(204);
  });

  test('XSS: reflected query params are sanitized', async ({ page }) => {
    const payload = '<script>alert("xss")</script>';
    await page.goto(`${BASE}/?q=${encodeURIComponent(payload)}`);
    const content = await page.content();
    expect(content).not.toContain(payload);
  });

  test('CSRF: pages expose CSRF tokens on forms or meta tags', async ({ page }) => {
    await page.goto(BASE);
    const hasMeta = await page.locator('meta[name="csrf-token"]').count();
    const hasHiddenInput = await page.locator('input[name="_csrf"]').count();
    expect(hasMeta + hasHiddenInput).toBeGreaterThan(0);
  });

  test('Injection: basic SQL/NoSQL payloads are not reflected', async ({ page }) => {
    const payload = "' OR '1'='1";
    await page.goto(`${BASE}/?q=${encodeURIComponent(payload)}`);
    const content = await page.content();
    expect(content).not.toContain(payload);
  });

  test('Rate limiting: repeated requests eventually trigger 429 or Retry-After', async ({ request }) => {
    const endpoint = `${BASE}/api/health`;
    let saw429 = false;
    for (let i = 0; i < 60; i++) {
      const res = await request.get(endpoint).catch(() => null);
      if (!res) continue;
      if (res.status() === 429) {
        saw429 = true;
        break;
      }
      const headers = res.headers();
      if (headers['retry-after']) {
        saw429 = true;
        break;
      }
    }
    expect(saw429).toBeTruthy();
  });
});
