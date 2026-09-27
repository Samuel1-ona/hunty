"use client"

import { BarChart3, Calendar, Filter, Star, TrendingUp, Users } from "lucide-react"
import { useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "@/components/StarRating"
import type { StoredHunt } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CreatorAnalyticsProps {
  hunts: StoredHunt[]
}

type DateRange = "7d" | "30d" | "90d" | "all"

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  all: "All time",
}

function generateCompletionData(hunts: StoredHunt[], days: number) {
  const now = new Date()
  const data = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    
    // Simulate completions based on hunt activity
    const activeHunts = hunts.filter(h => h.status === "Active" || h.status === "Completed")
    const baseCount = activeHunts.length * 2
    const completions = Math.floor(Math.random() * (baseCount + 5))
    
    data.push({
      date: dateStr,
      completions,
      players: Math.floor(completions * (0.8 + Math.random() * 0.4)),
    })
  }
  
  return data
}

function generateDropOffData(hunts: StoredHunt[]) {
  const totalClues = hunts.reduce((sum, h) => sum + h.cluesCount, 0) || 10
  const clueCount = Math.min(totalClues, 8)
  
  return Array.from({ length: clueCount }, (_, i) => ({
    clue: `Clue ${i + 1}`,
    dropOff: Math.max(5, 100 - (i * 12) - Math.floor(Math.random() * 15)),
    completions: Math.max(10, 100 - (i * 15) - Math.floor(Math.random() * 20)),
  }))
}

function generateRetentionData() {
  return [
    { stage: "Started", players: 100 },
    { stage: "Clue 2", players: 78 },
    { stage: "Clue 3", players: 62 },
    { stage: "Clue 4", players: 45 },
    { stage: "Completed", players: 32 },
  ]
}

export function CreatorAnalytics({ hunts }: CreatorAnalyticsProps) {
  const [dateRange, setDateRange] = useState<DateRange>("30d")
  
  const days = useMemo(() => {
    switch (dateRange) {
      case "7d": return 7
      case "30d": return 30
      case "90d": return 90
      case "all": return 90
    }
  }, [dateRange])
  
  const completionData = useMemo(() => generateCompletionData(hunts, days), [hunts, days])
  const dropOffData = useMemo(() => generateDropOffData(hunts), [hunts])
  const retentionData = useMemo(() => generateRetentionData(), [])
  
  const totalCompletions = completionData.reduce((sum, d) => sum + d.completions, 0)
  const totalPlayers = completionData.reduce((sum, d) => sum + d.players, 0)
  const activeHunts = hunts.filter(h => h.status === "Active").length
  const completedHunts = hunts.filter(h => h.status === "Completed").length

  // ─── Ratings aggregation ─────────────────────────────────────────────────
  const huntsWithRatings = hunts.filter(
    (h) => h.averageRating !== undefined && h.averageRating !== null && h.averageRating > 0
  )
  const overallAverageRating =
    huntsWithRatings.length > 0
      ? Math.round(
          (huntsWithRatings.reduce((sum, h) => sum + (h.averageRating ?? 0), 0) /
            huntsWithRatings.length) *
            10
        ) / 10
      : null
  const totalReviews = hunts.reduce((sum, h) => sum + (h.reviewCount ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header with date range filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Analytics Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your hunt performance and player engagement
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden">
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  dateRange === range
                    ? "bg-[#3737A4] text-white"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                {DATE_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-slate-200 dark:border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCompletions}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Completions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPlayers}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Unique Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{activeHunts}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active Hunts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedHunts}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completed Hunts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                <Star className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {overallAverageRating !== null ? overallAverageRating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Avg Rating
                  {totalReviews > 0 && (
                    <span className="ml-1 text-slate-400">({totalReviews})</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Completions over time - Line Chart */}
        <Card className="border-slate-200 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Completions Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="completions" 
                    stroke="#3737A4" 
                    strokeWidth={2}
                    dot={false}
                    name="Completions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="players" 
                    stroke="#39A437" 
                    strokeWidth={2}
                    dot={false}
                    name="Players"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Clue drop-off rate - Bar Chart */}
        <Card className="border-slate-200 dark:border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
              Clue Drop-off Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dropOffData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
                  <XAxis dataKey="clue" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#f1f5f9'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="dropOff" fill="#E3225C" name="Drop-off %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completions" fill="#39A437" name="Completions %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Player Retention Funnel */}
      <Card className="border-slate-200 dark:border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">
            Player Retention Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {retentionData.map((stage, index) => {
              const width = (stage.players / retentionData[0].players) * 100
              const isLast = index === retentionData.length - 1
              
              return (
                <div key={stage.stage} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-slate-600 dark:text-slate-400 text-right">
                    {stage.stage}
                  </span>
                  <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-lg transition-all duration-500",
                        isLast 
                          ? "bg-gradient-to-r from-[#39A437] to-[#194F0C]"
                          : "bg-gradient-to-r from-[#3737A4] to-[#0C0C4F]"
                      )}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm font-medium text-slate-900 dark:text-white text-right">
                    {stage.players}%
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Per-hunt ratings table ──────────────────────────────────────────── */}
      <Card className="border-slate-200 dark:border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Player Ratings per Hunt
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hunts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              No hunts to display.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">
                      Hunt
                    </th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">
                      Status
                    </th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 pr-4">
                      Rating
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Reviews
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {hunts.map((hunt) => (
                    <tr key={hunt.id} className="group">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900 dark:text-white line-clamp-1">
                          {hunt.title}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">#{hunt.id}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            hunt.status === "Active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : hunt.status === "Completed"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          )}
                        >
                          {hunt.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {hunt.averageRating && hunt.averageRating > 0 ? (
                          <StarRating rating={hunt.averageRating} count={hunt.reviewCount} />
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            No ratings yet
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {hunt.reviewCount ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
