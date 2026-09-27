"use client"

import { useEffect, useState } from "react"

import { get_hunt_leaderboard } from "@/lib/contracts/hunt"
import type { LeaderboardEntry } from "@/lib/types"

type LeaderboardPageProps = {
  params: Promise<{ id: string }>
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const { id } = await params
        const huntId = parseInt(id, 10)

        if (Number.isNaN(huntId)) {
          setError("Invalid hunt id.")
          return
        }

        const data = await get_hunt_leaderboard(huntId)
        const sorted = [...data].sort((a, b) => {
          if (b.points !== a.points) {
            return b.points - a.points
          }
          return a.address.localeCompare(b.address)
        })

        setPlayers(sorted)
        setError(null)
      } catch (loadError) {
        console.error("Failed to load leaderboard:", loadError)
        setError("Could not load leaderboard.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadLeaderboard()
  }, [params])

  if (isLoading) {
    return <div className="p-6">Loading leaderboard...</div>
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Hunt Leaderboard</h1>
      <table className="min-w-full border bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Rank</th>
            <th className="border p-2">Player Address</th>
            <th className="border p-2">Points</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.address} className="text-center">
              <td className="border p-2 font-bold">{index + 1}</td>
              <td className="border p-2 font-mono">{player.address.slice(0, 6)}...</td>
              <td className="border p-2">{player.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
