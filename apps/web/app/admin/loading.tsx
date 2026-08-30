import { AdminTableSkeleton } from '@/components/LoadingSkeletons';

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <AdminTableSkeleton rows={6} />
      </div>
    </div>
  );
}
