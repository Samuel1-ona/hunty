import { BarChart3 } from "lucide-react";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="h-72 rounded-xl bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="h-64 rounded-xl bg-slate-200 dark:bg-slate-700" />
    </div>
  );
}

export function NoData() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
      <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
      <p className="text-sm font-medium">No analytics data yet</p>
      <p className="text-xs mt-1">
        Data will appear once players start viewing and playing this hunt.
      </p>
    </div>
  );
}
