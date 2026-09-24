import { Clock, Eye, Play, TrendingUp, Trophy, Users } from "lucide-react";
import { Card, CardContent } from "@hunty/ui";
import { cn } from "@/lib/utils";
import type { HuntAnalyticsResponse } from "@/lib/huntAnalytics";
import { formatSeconds } from "./utils";

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ icon, iconBg, label, value, sub }: StatCardProps) {
  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn("p-2.5 rounded-xl flex-shrink-0", iconBg)}>{icon}</div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white truncate">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  analytics: HuntAnalyticsResponse | null;
}

/** AC 1 + AC 2: total views/starts/completions, completion rate, avg completion time. */
export function StatsGrid({ analytics }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        icon={<Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
        iconBg="bg-blue-50 dark:bg-blue-900/20"
        label="Total Views"
        value={analytics?.views ?? 0}
      />
      <StatCard
        icon={<Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        iconBg="bg-indigo-50 dark:bg-indigo-900/20"
        label="Starts"
        value={analytics?.starts ?? 0}
      />
      <StatCard
        icon={<Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
        iconBg="bg-emerald-50 dark:bg-emerald-900/20"
        label="Completions"
        value={analytics?.completions ?? 0}
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
        iconBg="bg-violet-50 dark:bg-violet-900/20"
        label="Completion Rate"
        value={`${analytics?.completionRate ?? 0}%`}
        sub={
          (analytics?.starts ?? 0) > 0
            ? `${analytics!.completions} / ${analytics!.starts} starters`
            : undefined
        }
      />
      <StatCard
        icon={<Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
        iconBg="bg-amber-50 dark:bg-amber-900/20"
        label="Avg Completion"
        value={formatSeconds(analytics?.avgCompletionTimeSeconds ?? null)}
        sub={
          (analytics?.completions ?? 0) > 0
            ? `over ${analytics!.completions} completions`
            : undefined
        }
      />
      <StatCard
        icon={<Users className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
        iconBg="bg-rose-50 dark:bg-rose-900/20"
        label="Unique Devices"
        value={analytics?.demographics?.reduce((s, d) => s + d.count, 0) ?? 0}
      />
    </div>
  );
}
