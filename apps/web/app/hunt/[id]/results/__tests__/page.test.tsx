import { beforeEach, describe, expect, it, vi } from "vitest";

import type { StoredHunt } from "@/lib/types";

const mockGetHuntById = vi.fn<(id: number) => StoredHunt | undefined>(() => undefined);
const mockGetEndedPublicHunts = vi.fn<() => StoredHunt[]>(() => []);
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("@/lib/huntStore", () => ({
  getHuntById: (id: number) => mockGetHuntById(id),
  getEndedPublicHunts: () => mockGetEndedPublicHunts(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  redirect: (url: string) => mockRedirect(url),
}));

import { generateMetadata, generateStaticParams, resolveEndedHuntOrBail } from "../page";

function makeHunt(overrides: Partial<StoredHunt> = {}): StoredHunt {
  return {
    id: 42,
    title: "Downtown Dash",
    description: "A hunt around downtown.",
    cluesCount: 5,
    status: "Active",
    rewardType: "XLM",
    rewardPool: 100,
    ...overrides,
  };
}

describe("hunt results page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BASE_URL = "https://hunty.app";
  });

  it("is indexable and canonical to itself once the hunt has ended", async () => {
    mockGetHuntById.mockReturnValue(makeHunt({ id: 7, status: "Completed" }));

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "7" }) });

    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://hunty.app/hunt/7/results");
    expect(metadata.openGraph?.url).toBe("https://hunty.app/hunt/7/results");
  });

  it("is not indexed and defers canonically to the live page while the hunt is still active", async () => {
    mockGetHuntById.mockReturnValue(makeHunt({ id: 7, status: "Active" }));

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "7" }) });

    expect(metadata.robots).toMatchObject({ index: false });
    expect(metadata.alternates?.canonical).toBe("https://hunty.app/hunt/7");
  });

  it("returns a not-found, noindex metadata block when the hunt does not exist", async () => {
    mockGetHuntById.mockReturnValue(undefined);

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "999" }) });

    expect(metadata.title).toContain("Not Found");
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("returns a not-found, noindex metadata block for private hunts", async () => {
    mockGetHuntById.mockReturnValue(makeHunt({ id: 7, status: "Completed", is_private: true }));

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "7" }) });

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});

describe("generateStaticParams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-renders a path for every ended, public hunt", () => {
    mockGetEndedPublicHunts.mockReturnValue([
      makeHunt({ id: 1, status: "Completed" }),
      makeHunt({ id: 2, status: "ended" as StoredHunt["status"] }),
    ]);

    expect(generateStaticParams()).toEqual([{ id: "1" }, { id: "2" }]);
  });
});

describe("resolveEndedHuntOrBail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the hunt once it has ended", () => {
    const hunt = makeHunt({ id: 7, status: "Completed" });
    mockGetHuntById.mockReturnValue(hunt);

    expect(resolveEndedHuntOrBail("7")).toBe(hunt);
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to the live hunt page when the hunt hasn't ended yet", () => {
    mockGetHuntById.mockReturnValue(makeHunt({ id: 7, status: "Active" }));

    expect(() => resolveEndedHuntOrBail("7")).toThrow("NEXT_REDIRECT:/hunt/7");
  });

  it("calls notFound when the hunt does not exist", () => {
    mockGetHuntById.mockReturnValue(undefined);

    expect(() => resolveEndedHuntOrBail("999")).toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound for private hunts even if they have ended", () => {
    mockGetHuntById.mockReturnValue(makeHunt({ id: 7, status: "Completed", is_private: true }));

    expect(() => resolveEndedHuntOrBail("7")).toThrow("NEXT_NOT_FOUND");
  });
});
