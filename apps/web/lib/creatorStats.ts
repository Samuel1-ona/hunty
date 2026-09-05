import { getHuntsByCreator } from "./huntStore"
import { getHuntsWithClientRatings } from "./reviewRatings"
import type { StoredHunt } from "./types"

export interface CreatorStats {
  huntsPublished: number
  playersServed: number
  averageRating: number
  activeHunts: StoredHunt[]
}

export function getCreatorStats(address: string): CreatorStats {
  const hunts = getHuntsWithClientRatings(getHuntsByCreator(address))
  const published = hunts.filter((hunt) => hunt.status === "Active" || hunt.status === "Completed")
  const activeHunts = published.filter(
    (hunt) => hunt.status === "Active" && !hunt.is_private && !hunt.isArchived && !hunt.deletedAt,
  )
  const rated = published.filter((hunt) => hunt.averageRating !== undefined)

  return {
    huntsPublished: published.length,
    playersServed: published.reduce((total, hunt) => total + (hunt.playerCount ?? 0), 0),
    averageRating: rated.length
      ? rated.reduce((total, hunt) => total + (hunt.averageRating ?? 0), 0) / rated.length
      : 0,
    activeHunts,
  }
}