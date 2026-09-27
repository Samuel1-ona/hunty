import { StatsCardSkeleton } from "@/components/LoadingSkeletons"

export default function CreatorLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <StatsCardSkeleton count={3} />
      </div>
    </div>
  )
}
