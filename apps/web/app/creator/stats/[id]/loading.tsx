import { DetailHeaderSkeleton, StatsCardSkeleton } from "@/components/LoadingSkeletons"

export default function CreatorStatsDetailLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <DetailHeaderSkeleton />
        <StatsCardSkeleton count={3} />
      </div>
    </div>
  )
}
