import { test, expect } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Automated security checks', () => {
  test('Security headers: CSP and HSTS present', async ({ request }) => {
    const res = await request.get(BASE);
    const headers = res.headers();
    expect(headers['content-security-policy'] || headers['Content-Security-Policy']).toBeTruthy();
    expect(headers['strict-transport-security'] || headers['Strict-Transport-Security']).toBeTruthy();
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
