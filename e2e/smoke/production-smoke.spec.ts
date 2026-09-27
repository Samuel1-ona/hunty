import { expect, test, type APIRequestContext } from "@playwright/test";

const criticalPages = [
  { path: "/", heading: /ultimate web3 game arcade/i },
  { path: "/hunty", heading: /create scavenge hunt/i },
  { path: "/dashboard", heading: /my hunts/i },
  { path: "/help", heading: /troubleshooting guide/i },
];

const apiChecks = [
  {
    path: "/api/health",
    assert: async (response: Awaited<ReturnType<typeof fetchJson>>) => {
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "ok",
        service: "hunty",
      });
    },
  },
  {
    path: "/api/v1/hunts?page=1&limit=5",
    assert: async (response: Awaited<ReturnType<typeof fetchJson>>) => {
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 5,
      });
    },
  },
  {
    path: "/api/admin/featured",
    assert: async (response: Awaited<ReturnType<typeof fetchJson>>) => {
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("featuredHuntId");
    },
  },
];

async function fetchJson(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  const contentType = response.headers()["content-type"] ?? "";

  expect(response.status(), `${path} should be available`).toBeLessThan(500);
  expect(contentType, `${path} should return JSON`).toContain("application/json");

  return {
    status: response.status(),
    body: await response.json(),
  };
}

test.describe("production smoke checks", () => {
  test("health endpoint reports the service as ready", async ({ request }) => {
    const response = await fetchJson(request, "/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "ok",
      service: "hunty",
    });
    expect(Date.parse(response.body.timestamp)).not.toBeNaN();
  });

  for (const { path, heading } of criticalPages) {
    test(`critical page loads: ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });

      expect(response?.status(), `${path} should not return an error`).toBeLessThan(400);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible({
        timeout: 15_000,
      });
    });
  }

  test("public API endpoints are available", async ({ request }) => {
    for (const check of apiChecks) {
      await check.assert(await fetchJson(request, check.path));
    }
  });

  test("wallet connection entry point opens the wallet provider flow", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });

    expect(response?.status()).toBeLessThan(400);

    await page.getByRole("button", { name: /connect wallet/i }).click();

    await expect(page.getByRole("heading", { name: /connect wallet/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /freighter/i })).toBeVisible();
  });
});
