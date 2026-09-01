import { LeaderboardTableSkeleton } from "@/components/LoadingSkeletons"

export default function HuntLeaderboardLoading() {
  return (
    <div className="min-h-screen bg-[#0b0c10] p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-inner">
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
