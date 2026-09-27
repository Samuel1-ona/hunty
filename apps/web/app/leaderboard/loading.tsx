import { LeaderboardTableSkeleton } from "@/components/LoadingSkeletons"

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-12">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="h-10 w-48 rounded-xl bg-white/10 animate-pulse" />
        <div className="h-6 w-80 rounded-lg bg-white/10 animate-pulse" />
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-inner">
          <table className="w-full">
            <tbody>
              <LeaderboardTableSkeleton count={8} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
