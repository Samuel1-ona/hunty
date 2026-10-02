import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@hunty/ui";
import type { TimeSeriesPoint } from "@/lib/huntAnalytics";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "none",
  borderRadius: "8px",
  color: "#f1f5f9",
  fontSize: "12px",
};

interface DailyActivityChartProps {
  data: TimeSeriesPoint[];
}

/** AC 5: time-series chart of daily views/starts/completions. */
export function DailyActivityChart({ data }: DailyActivityChartProps) {
  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
          Daily Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
            No activity in this date range
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3737A4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3737A4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gStarts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCompletions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#39A437" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#39A437" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke="#3737A4"
                  strokeWidth={2}
                  fill="url(#gViews)"
                  name="Views"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="starts"
                  stroke="#6366F1"
                  strokeWidth={2}
                  fill="url(#gStarts)"
                  name="Starts"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="completions"
                  stroke="#39A437"
                  strokeWidth={2}
                  fill="url(#gCompletions)"
                  name="Completions"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
