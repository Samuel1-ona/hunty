import { GenericPageSkeleton } from '@/components/LoadingSkeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white pb-24 flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-150 h-100 bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-100p h-75 bg-indigo-600/15 rounded-full blur-[100px]" />
      </div>

      <main className="relative w-full max-w-xl mx-auto flex flex-col items-center">
        <div className="w-full">
          <GenericPageSkeleton />
        </div>
      </main>
    </div>
  );
}
