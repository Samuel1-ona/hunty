import { expect, test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const EMBED_PATHS = ["/hunt/1/embed", "/hunt/1/leaderboard/embed"];

function getCsp(headers: Record<string, string>): string {
  return (
    headers["content-security-policy"] ||
    headers["content-security-policy-report-only"] ||
    ""
  );
}

test.describe("Embed framing headers", () => {
  for (const path of EMBED_PATHS) {
    test(`${path} omits X-Frame-Options and allows frame-ancestors`, async ({
      request,
    }) => {
      const res = await request.get(`${BASE}${path}`);
      expect(res.status(), `${path} should respond`).toBeLessThan(500);

      const headers = res.headers();
      // X-Frame-Options has no allow-all value and must be omitted so
      // third-party sites can frame the widget.
      expect(
        headers["x-frame-options"],
        `${path} must not send X-Frame-Options`
      ).toBeUndefined();

      const csp = getCsp(headers);
      expect(csp, `${path} CSP should exist`).toBeTruthy();
      expect(csp).toContain("frame-ancestors");
      expect(csp).not.toContain("frame-ancestors 'none'");
      expect(csp).toMatch(/frame-ancestors (\*|https?:)/);
    });
  }

  test("non-embed pages still deny framing", async ({ request }) => {
    const res = await request.get(`${BASE}/`);
    const headers = res.headers();
    expect(headers["x-frame-options"]).toBe("DENY");

    const csp = getCsp(headers);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("hunt embed renders inside a cross-origin iframe", async ({ page }) => {
    // localhost and 127.0.0.1 are different origins but hit the same dev
    // server, so this simulates a third-party site embedding the widget.
    const parentUrl = BASE.replace("localhost", "127.0.0.1");
    await page.goto(parentUrl, { waitUntil: "domcontentloaded" });

    const embedSrc = `${BASE}/hunt/1/embed`;

    await page.evaluate(async (src) => {
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.name = "hunty-embed-test";
      iframe.style.width = "400px";
      iframe.style.height = "500px";
      document.body.appendChild(iframe);

      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("iframe did not load in time")),
          20_000
        );
        iframe.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        iframe.onerror = () => {
          clearTimeout(timer);
          reject(new Error("iframe failed to load"));
        };
      });
    }, embedSrc);

    const frame = page
      .frames()
      .find((f) => f.url().includes("/hunt/1/embed"));
    expect(frame, "embed iframe should be attached").toBeTruthy();

    // A blocked frame yields an empty/opaque document; a successful load
    // renders the widget title from the seed hunt data.
    const bodyText = await frame!.locator("body").innerText();
    expect(bodyText).toContain("City Secrets");
  });
});
