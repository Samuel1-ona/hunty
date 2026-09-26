import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockEntries = Array.from({ length: 50 }, (_, i) => ({
  huntId: 42,
  wallet: `wallet${i}`,
  currentClueIndex: i,
  totalClues: 10,
  totalPoints: (50 - i) * 10,
  completed: i >= 40,
  completedAt: i >= 40 ? 1000 + i : null,
  startedAt: 1000,
  lastUpdated: 2000 + i,
  completedClueIds: Array.from({ length: i + 1 }, (_, j) => j),
}));

vi.mock("@/lib/progressData", () => ({
  getAllProgressForHunt: vi.fn(),
  getActivePlayersForHunt: vi.fn(),
  getCompletedPlayersForHunt: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getIP: () => "127.0.0.1",
  rateLimit: () => Promise.resolve({ success: true, remaining: 60, reset: Date.now() + 60000 }),
  rateLimitResponse: () => {
    return { status: 429 } as any;
  },
}));

import { getAllProgressForHunt, getActivePlayersForHunt, getCompletedPlayersForHunt } from "@/lib/progressData";
import { GET } from "@/app/api/v1/hunts/[id]/players/route";

const mockedGetAll = vi.mocked(getAllProgressForHunt);
const mockedGetActive = vi.mocked(getActivePlayersForHunt);
const mockedGetCompleted = vi.mocked(getCompletedPlayersForHunt);

describe("GET /api/v1/hunts/:id/players", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetAll.mockReturnValue([...mockEntries]);
    mockedGetActive.mockReturnValue(mockEntries.filter((e) => !e.completed));
    mockedGetCompleted.mockReturnValue(mockEntries.filter((e) => e.completed));
  });

  function makeRequest(url: string) {
    return new NextRequest(url);
  }

  it("returns a paginated response with data and pagination metadata", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination).toHaveProperty("total");
    expect(body.pagination).toHaveProperty("limit");
    expect(body.pagination).toHaveProperty("cursor");
    expect(body.pagination).toHaveProperty("nextCursor");
  });

  it("defaults to 20 entries per page", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(body.pagination.limit).toBe(20);
    expect(body.data.length).toBe(20);
    expect(body.pagination.total).toBe(50);
    expect(body.pagination.cursor).toBeNull();
    expect(body.pagination.nextCursor).toBe(20);
  });

  it("fetches the second page using the cursor from the first", async () => {
    const req1 = makeRequest("http://localhost/api/v1/hunts/42/players");
    const res1 = await GET(req1, { params: Promise.resolve({ id: "42" }) });
    const body1 = await res1.json();

    expect(body1.data.length).toBe(20);
    expect(body1.pagination.nextCursor).toBe(20);

    const req2 = makeRequest(`http://localhost/api/v1/hunts/42/players?cursor=20`);
    const res2 = await GET(req2, { params: Promise.resolve({ id: "42" }) });
    const body2 = await res2.json();

    expect(body2.pagination.cursor).toBe(20);
    expect(body2.data.length).toBe(20);
    expect(body2.pagination.nextCursor).toBe(40);
    expect(body2.data[0].wallet).toBe(mockEntries[20].wallet);
  });

  it("returns null nextCursor on the last page", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players?cursor=40");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(body.data.length).toBe(10);
    expect(body.pagination.nextCursor).toBeNull();
  });

  it("respects a custom limit parameter", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players?limit=5");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(body.pagination.limit).toBe(5);
    expect(body.data.length).toBe(5);
    expect(body.pagination.nextCursor).toBe(5);
  });

  it("caps the limit at 100", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players?limit=500");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(body.pagination.limit).toBe(100);
    expect(body.data.length).toBe(50);
    expect(body.pagination.nextCursor).toBeNull();
  });

  it("sorts entries by totalPoints descending", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(body.data[0].totalPoints).toBe(500);
    expect(body.data[19].totalPoints).toBe(310);
  });

  it("applies the active filter", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players?filter=active");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(mockedGetActive).toHaveBeenCalledWith(42);
    expect(mockedGetAll).not.toHaveBeenCalled();
    expect(body.pagination.total).toBe(40);
  });

  it("applies the completed filter", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players?filter=completed");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(mockedGetCompleted).toHaveBeenCalledWith(42);
    expect(body.pagination.total).toBe(10);
  });

  it("returns 400 for an invalid hunt ID", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/not-a-number/players");
    const res = await GET(req, { params: Promise.resolve({ id: "not-a-number" }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 400 for an invalid cursor", async () => {
    const req = makeRequest("http://localhost/api/v1/hunts/42/players?cursor=abc");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });

    expect(res.status).toBe(400);
  });

  it("returns an empty paginated response when no players exist", async () => {
    mockedGetAll.mockReturnValue([]);
    const req = makeRequest("http://localhost/api/v1/hunts/42/players");
    const res = await GET(req, { params: Promise.resolve({ id: "42" }) });
    const body = await res.json();

    expect(body.data).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.nextCursor).toBeNull();
  });
});
