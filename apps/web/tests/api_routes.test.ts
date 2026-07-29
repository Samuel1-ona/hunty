import { describe, expect, it, vi } from "vitest";import { POST as postIpfs, GET as getIpfs } from "@/app/api/ipfs/route";
import { GET as getLeaderboardOgImage } from "@/app/api/og/leaderboard/route";
import { GET as getLeaderboard } from "@/app/api/v1/hunts/[id]/leaderboard/route";
import { GET as getPublicLeaderboard } from "@/app/api/v1/hunts/[id]/leaderboard/public/route";
import { GET as getHunts } from "@/app/api/v1/hunts/route";

vi.mock("@/lib/contracts/hunt", () => ({
  get_hunt_leaderboard: vi.fn().mockResolvedValue([]),
}));

vi.mock("next/og", () => ({
  ImageResponse: class ImageResponse extends Response {
    constructor() {
      super("fake-image-data", {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      });
    }
  },
}));