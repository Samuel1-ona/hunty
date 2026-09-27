"use client"

import { useEffect, useState } from "react"
import { RARITY_COLORS, RARITY_BORDER_COLORS } from "@/lib/achievements/config"
import { getAllAchievementsWithStatus } from "@/lib/achievements/service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"

interface BadgeWallProps {
  playerAddress: string
}

export function BadgeWall({ playerAddress }: BadgeWallProps) {
  const [achievements, setAchievements] = useState<ReturnType<typeof getAllAchievementsWithStatus>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!playerAddress) {
      setLoading(false)
      return
    }

    try {
      const allAchievements = getAllAchievementsWithStatus(playerAddress)
      setAchievements(allAchievements)
    } catch (error) {
      logger.error("Failed to load achievements:", error)
    } finally {
      setLoading(false)
    }
  }, [playerAddress])

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
          <CardDescription>Your earned badges and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-500">Loading achievements...</div>
        </CardContent>
      </Card>
    )
  }

  const earnedCount = achievements.filter((a) => a.earned).length
  const totalCount = achievements.length

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Achievements</CardTitle>
        <CardDescription>
          {earnedCount} of {totalCount} badges earned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <TooltipProvider>
            {achievements.map((achievement) => (
              <Tooltip key={achievement.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all cursor-pointer",
                      achievement.earned
                        ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} ${RARITY_BORDER_COLORS[achievement.rarity]} shadow-lg`
                        : "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-50"
                    )}
                  >
                    <div className="text-4xl mb-2">{achievement.icon}</div>
                    <div className="text-xs font-semibold text-center line-clamp-2 text-white dark:text-slate-900">
                      {achievement.title}
                    </div>
                    {achievement.earned && (
                      <div className="text-xs mt-1 text-white/80 dark:text-slate-900/80">
                        ✓ Earned
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{achievement.title}</p>
                    <p className="text-sm text-slate-300">{achievement.description}</p>
                    <p className="text-xs text-slate-400">{achievement.condition}</p>
                    {achievement.earned && achievement.earnedAt && (
                      <p className="text-xs text-green-400 pt-1">
                        Earned: {new Date(achievement.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 capitalize pt-1">
                      Rarity: {achievement.rarity}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>

        {earnedCount === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p className="mb-2">No achievements earned yet.</p>
            <p className="text-sm">Complete hunts to unlock badges!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
