import { HelpCircle, Monitor, Smartphone, Tablet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@hunty/ui";
import type { DemographicsEntry } from "@/lib/huntAnalytics";

const TOOLTIP_STYLE = {
  backgroundColor: "#1e293b",
  border: "none",
  borderRadius: "8px",
  color: "#f1f5f9",
  fontSize: "12px",
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile: <Smartphone className="w-4 h-4" />,
  desktop: <Monitor className="w-4 h-4" />,
  tablet: <Tablet className="w-4 h-4" />,
  unknown: <HelpCircle className="w-4 h-4" />,
};

const PIE_COLORS = ["#3737A4", "#39A437", "#E3225C", "#F59E0B", "#8B5CF6"];

interface DemographicsChartProps {
  demographics: DemographicsEntry[];
}

/** AC 4: player demographics (device breakdown). */
export function DemographicsChart({ demographics }: DemographicsChartProps) {
  return (
    <Card className="border-slate-200 dark:border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
          Player Demographics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {demographics.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-slate-400 text-sm">
            No demographic data yet
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-shrink-0 h-[180px] w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demographics}
                    dataKey="count"
                    nameKey="deviceType"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={40}
                    paddingAngle={3}
                  >
                    {demographics.map((entry, index) => (
                      <Cell key={entry.deviceType} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1 space-y-2 min-w-0">
              {demographics.map((d, index) => {
                const total = demographics.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return (
                  <div key={d.deviceType} className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 flex-shrink-0 capitalize">
                      {DEVICE_ICONS[d.deviceType] ?? null}
                      {d.deviceType}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 w-12 text-right flex-shrink-0">
                      {d.count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
