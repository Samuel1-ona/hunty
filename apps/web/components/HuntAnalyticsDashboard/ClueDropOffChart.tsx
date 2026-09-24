import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@hunty/ui";
import type { ClueDropOffEntry } from "@/lib/huntAnalytics";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "none",
  borderRadius: "8px",
  color: "#f1f5f9",
  fontSize: "12px",
};

interface ClueDropOffChartProps {
  clueDropOff: ClueDropOffEntry[];
}

/** AC 3: clue-by-clue drop-off analysis. */
export function ClueDropOffChart({ clueDropOff }: ClueDropOffChartProps) {
  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
          Clue Drop-off Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clueDropOff.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
            No clue data yet
          </div>
        ) : (
          <>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clueDropOff} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="attempts" fill="#6366F1" name="Attempts" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="completions"
                    fill="#39A437"
                    name="Completions"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Funnel bars below the chart */}
            <div className="mt-4 space-y-2">
              {clueDropOff.map((clue) => {
                const rate =
                  clue.attempts > 0 ? Math.round((clue.completions / clue.attempts) * 100) : 0;
                return (
                  <div key={clue.clueIndex} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-slate-500 truncate">{clue.label}</span>
                    <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#3737A4] to-[#6366F1] transition-all duration-700"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="w-10 text-xs font-medium text-slate-700 dark:text-slate-300 text-right">
                      {rate}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
