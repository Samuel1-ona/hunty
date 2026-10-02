import { ACHIEVEMENTS } from "@/lib/achievements/config"

interface GameCompleteAchievementsProps {
  newAchievements: string[]
}

export function GameCompleteAchievements({ newAchievements }: GameCompleteAchievementsProps) {
  if (newAchievements.length === 0) return null

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-3">
        🎉 New Achievements Unlocked!
      </p>
      <div className="grid grid-cols-2 gap-2">
        {newAchievements.map((achievementId) => {
          const achievement = ACHIEVEMENTS[achievementId as keyof typeof ACHIEVEMENTS]
          return achievement ? (
            <div
              key={achievementId}
              className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg"
            >
              <span className="text-2xl">{achievement.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {achievement.title}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {achievement.description}
                </p>
              </div>
            </div>
          ) : null
        })}
      </div>
    </div>
  )
}
