import { ProfileHistorySkeleton } from '@/components/LoadingSkeletons';

export default function ProfileHistoryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <ProfileHistorySkeleton count={6} />
      </div>
    </div>
  );
}
