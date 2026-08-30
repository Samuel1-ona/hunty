import { HuntCardSkeletonGrid } from '@/components/LoadingSkeletons';

export default function DashboardHuntsLoading() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <HuntCardSkeletonGrid count={6} />
      </div>
    </div>
  );
}
