import { Skeleton } from "@/components/ui/skeleton"

export default function HuntPlayersLoading() {
  return (
    <div className="min-h-screen bg-[#0b0c10] p-6 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <Skeleton className="h-8 w-48 rounded mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
