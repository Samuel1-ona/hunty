import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@hunty/ui";
import type { ClueDropOffEntry } from "@/lib/huntAnalytics";
import { formatSeconds } from "./utils";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "none",
  borderRadius: "8px",
  color: "#f1f5f9",
  fontSize: "12px",
};

interface AvgTimePerClueChartProps {
  clueDropOff: ClueDropOffEntry[];
}

export function AvgTimePerClueChart({ clueDropOff }: AvgTimePerClueChartProps) {
  if (clueDropOff.length === 0) return null;

  const data = clueDropOff.map((c) => ({
    label: c.label,
    avgSecs: c.completions > 0 ? Math.round(c.totalTimeSeconds / c.completions) : 0,
  }));

  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
          Average Time per Clue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                label={{
                  value: "Seconds",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#94a3b8" },
                }}
              />
              <Tooltip
                formatter={(value) => [formatSeconds(Number(value ?? 0)), "Avg time"]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar dataKey="avgSecs" fill="#F59E0B" name="Avg Time (s)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
