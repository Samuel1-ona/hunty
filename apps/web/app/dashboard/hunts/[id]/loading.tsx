import { DetailHeaderSkeleton, FormPageSkeletonLayout } from "@/components/LoadingSkeletons"

export default function DashboardHuntDetailLoading() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <DetailHeaderSkeleton />
        <FormPageSkeletonLayout />
      </div>
    </div>
  )
}
