import { Skeleton } from "@/components/ui/skeleton"

export default function HuntPageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24">
      <main className="relative max-w-3xl mx-auto px-6 pt-16">
        <Skeleton className="h-6 w-24 mb-6 bg-white/10" />
        <Skeleton className="h-12 w-3/4 mb-4 bg-white/10" />
        <Skeleton className="h-6 w-full mb-2 bg-white/10" />
        <Skeleton className="h-6 w-5/6 mb-10 bg-white/10" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-12">
          <Skeleton className="h-24 bg-white/10" />
          <Skeleton className="h-24 bg-white/10" />
          <Skeleton className="h-24 bg-white/10" />
        </div>

        <Skeleton className="h-40 w-full bg-white/10" />
      </main>
    </div>
  )
}
