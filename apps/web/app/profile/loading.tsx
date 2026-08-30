import { ProfilePageSkeleton } from '@/components/LoadingSkeletons';

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl">
        <ProfilePageSkeleton />
      </div>
    </div>
  );
}
