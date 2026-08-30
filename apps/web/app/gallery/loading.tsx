import { GalleryGridSkeleton } from '@/components/LoadingSkeletons';

export default function GalleryLoading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <GalleryGridSkeleton count={8} />
      </div>
    </div>
  );
}
