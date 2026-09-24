import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredProgressEntry } from "@/lib/progressData";
import type { StoredHunt } from "@/lib/types";

const mockGetAllProgressForHunt = vi.fn<(id: number) => StoredProgressEntry[]>(() => []);
const mockGetHuntById = vi.fn<(id: number) => StoredHunt | undefined>(() => undefined);

vi.mock("@/lib/progressData", () => ({
  getAllProgressForHunt: (id: number) => mockGetAllProgressForHunt(id),
}));

vi.mock("@/lib/huntStore", () => ({
  getHuntById: (id: number) => mockGetHuntById(id),
}));

import { GET } from "@/app/api/og/result/route";

function makeProgress(overrides: Partial<StoredProgressEntry> = {}): StoredProgressEntry {
  return {
    huntId: 1,
    wallet: "GABC...WALLET",
    currentClueIndex: 0,
    totalClues: 5,
    totalPoints: 0,
    completed: false,
    completedAt: null,
    startedAt: 0,
    lastUpdated: 0,
    completedClueIds: [],
    ...overrides,
  };
}

function makeHunt(overrides: Partial<StoredHunt> = {}): StoredHunt {
  return {
    id: 3,
    title: "Office Onboarding Hunt",
    description: "A playful intro game.",
    cluesCount: 4,
    status: "Completed",
    rewardType: "Both",
    ...overrides,
  };
}

function handlerToExpress(handler: unknown) {
  return async (req: any, res: any) => {
    try {
      const url = `http://localhost${req.url || req.originalUrl}`;
      const method = req.method;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, String(value));
          }
        }
      }

      const webRequest = new Request(url, { method, headers });
      const result = (await handler(webRequest, {})) as Response;
      if (result instanceof Response) {
        res.statusCode = result.status;
        result.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(await result.text());
      } else {
        res.statusCode = 200;
        res.end();
      }
    } catch (err: any) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ error: err.message }));
    }
  };
}

describe("GET /api/og/result", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHuntById.mockReturnValue(makeHunt());
  });

  it("returns a result-card image response with rank, time and hunt name", async () => {
    mockGetAllProgressForHunt.mockReturnValue([
      makeProgress({ wallet: "winner", totalPoints: 90, completed: true }),
      makeProgress({ wallet: "me", totalPoints: 40, completed: true }),
    ]);

    const app = (await import("supertest")).default(handlerToExpress(GET) as any);
    const response = await app.get("/api/og/result?huntId=3&wallet=me");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image");
  });

  it("honours rank/time query overrides at the share moment", async () => {
    mockGetAllProgressForHunt.mockReturnValue([]);

    const app = (await import("supertest")).default(handlerToExpress(GET) as any);
    const response = await app.get(
      "/api/og/result?huntId=3&wallet=me&rank=2&time=300",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image");
  });

  it("falls back gracefully when no progress data is available", async () => {
    mockGetAllProgressForHunt.mockReturnValue([]);
    mockGetHuntById.mockReturnValue(undefined);

    const app = (await import("supertest")).default(handlerToExpress(GET) as any);
    const response = await app.get("/api/og/result?huntId=9999&wallet=me");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("image");
  });
});