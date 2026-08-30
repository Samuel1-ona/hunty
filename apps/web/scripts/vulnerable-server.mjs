/**
 * vulnerable-server.mjs
 *
 * Minimal HTTP server that deliberately omits security headers.
 * Used to prove that security.spec.ts goes red on a real misconfiguration.
 *
 * Run:
 *   node scripts/vulnerable-server.mjs &
 *   PLAYWRIGHT_BASE_URL=http://localhost:4000 \
 *     npx playwright test e2e/security.spec.ts --project=chromium-desktop
 *
 * Expected result: multiple tests fail (CSP missing, X-Frame-Options missing,
 * X-Content-Type-Options missing, etc.)
 */

import { createServer } from "node:http";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Vulnerable Test Server</title></head>
<body>
  <h1>No security headers here</h1>
  <!-- Intentionally missing: CSP, X-Frame-Options, X-Content-Type-Options,
       Referrer-Policy, Permissions-Policy, HSTS -->
  <script>console.log("inline script — no nonce");</script>
</body>
</html>`;

const PORT = 4000;

const server = createServer((req, res) => {
  // Deliberately no security headers.
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(HTML);
});

server.listen(PORT, () => {
  console.log(`Vulnerable test server running at http://localhost:${PORT}`);
  console.log("Run security tests against it with:");
  console.log(
    `  PLAYWRIGHT_BASE_URL=http://localhost:${PORT} npx playwright test e2e/security.spec.ts --project=chromium-desktop`
  );
});
