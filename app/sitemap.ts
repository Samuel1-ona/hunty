import type { MetadataRoute } from "next"
import { SEED_HUNTS } from "@/lib/huntStore"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://hunty.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/admin`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
    { url: `${BASE_URL}/creator`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.4 },
    { url: `${BASE_URL}/dashboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.4 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/hunty`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/hunty/templates`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/profile`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.3 },
  ]

  const huntPages: MetadataRoute.Sitemap = SEED_HUNTS.map((hunt) => ({
    url: `${BASE_URL}/hunt/${hunt.id}`,
    lastModified: hunt.endTime ? new Date(hunt.endTime * 1000) : new Date(),
    changeFrequency: (hunt.status === "Active" ? "daily" : "weekly") as "daily" | "weekly",
    priority: hunt.status === "Active" ? 0.9 : 0.6,
  }))

  const huntLeaderboardPages: MetadataRoute.Sitemap = SEED_HUNTS.map((hunt) => ({
    url: `${BASE_URL}/hunt/${hunt.id}/leaderboard`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.5,
  }))

  const creatorStatsPages: MetadataRoute.Sitemap = SEED_HUNTS.map((hunt) => ({
    url: `${BASE_URL}/creator/stats/${hunt.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.3,
  }))

  return [...staticPages, ...huntPages, ...huntLeaderboardPages, ...creatorStatsPages]
}
