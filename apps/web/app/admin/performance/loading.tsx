import { AdminTableSkeleton } from "@/components/LoadingSkeletons"

export default function AdminPerformanceLoading() {
  return (
    <div className="p-6">
      <AdminTableSkeleton rows={5} />
    </div>
  )
}
