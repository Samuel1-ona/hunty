import { DetailHeaderSkeleton, ProfileHistorySkeleton } from "@/components/LoadingSkeletons"

export default function ProfileHistoryAttemptLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <DetailHeaderSkeleton />
        <ProfileHistorySkeleton count={3} />
      </div>
    </div>
  )
}
