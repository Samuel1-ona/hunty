import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getAllHunts = vi.fn();
const getPendingSubmissions = vi.fn();
const getErrorRate = vi.fn();
const getMetrics = vi.fn();

vi.mock("@/lib/huntStore", () => ({ getAllHunts }));
vi.mock("@/lib/moderation/dbStore", () => ({ getPendingSubmissions }));
vi.mock("@/lib/monitoring/apiMonitor", () => ({ getErrorRate, getMetrics }));
vi.mock("@sentry/nextjs", () => ({ captureEvent: vi.fn(), captureException: vi.fn() }));

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

function request(token?: string) {
  return new Request("http://localhost/api/admin/dashboard", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

describe("GET /api/admin/dashboard", () => {
  const originalSecret = process.env.ADMIN_API_SECRET;

  beforeEach(() => {
    process.env.ADMIN_API_SECRET = "admin-secret";
    getAllHunts.mockReturnValue([
      { status: "Active", playerCount: 3 },
      { status: "PendingReview", playerCount: 2 },
      { status: "Completed", playerCount: 1 },
    ]);
    getPendingSubmissions.mockResolvedValue([{ id: "pending-1" }]);
    getErrorRate.mockReturnValue(0.025);
    getMetrics.mockReturnValue([{}, {}, {}]);
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.ADMIN_API_SECRET;
    else process.env.ADMIN_API_SECRET = originalSecret;
    vi.clearAllMocks();
  });

  it("rejects requests without an admin bearer token", async () => {
    const { GET } = await loadRoute();
    const response = await GET(request() as never, undefined);

    expect(response.status).toBe(401);
    expect(getAllHunts).not.toHaveBeenCalled();
  });

  it("rejects requests with an invalid admin bearer token", async () => {
    const { GET } = await loadRoute();
    const response = await GET(request("wrong-secret") as never, undefined);

    expect(response.status).toBe(401);
    expect(getPendingSubmissions).not.toHaveBeenCalled();
  });

  it("returns platform health metrics for an authorized admin", async () => {
    const { GET } = await loadRoute();
    const response = await GET(request("admin-secret") as never, undefined);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      hunts: { total: 3, active: 1, pendingReview: 1 },
      players: { registrations: 6 },
      moderation: { pending: 1 },
      api: { errorRate: 0.025, sampledRequests: 3 },
    });
  });
});
