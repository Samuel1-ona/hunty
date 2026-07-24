"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import type { RewardHistoryEntry, RewardHistoryType } from "@/lib/types"
import { formatISOString } from "@/lib/dateUtils"

const DATE_RANGES = [
  { id: "all", label: "All time" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
]

const TYPE_FILTERS: Array<{ id: RewardHistoryType | "All"; label: string }> = [
  { id: "All", label: "All" },
  { id: "XLM", label: "XLM" },
  { id: "NFT", label: "NFT" },
]

interface RewardHistorySectionProps {
  title: string
  description: string
  entries: RewardHistoryEntry[]
  showRecipient?: boolean
  recipientLabel?: string
}

export function RewardHistorySection({
  title,
  description,
  entries,
  showRecipient = false,
  recipientLabel = "Recipient",
}: RewardHistorySectionProps) {
  const [typeFilter, setTypeFilter] = useState<RewardHistoryType | "All">("All")
  const [dateFilter, setDateFilter] = useState<string>("all")

  const filteredEntries = useMemo(() => {
    const now = Date.now()
    return entries.filter((entry) => {
      if (typeFilter !== "All" && entry.type !== typeFilter) return false

      if (dateFilter !== "all") {
        const days = Number(dateFilter)
        const threshold = now - days * 24 * 60 * 60 * 1000
        const timestamp = new Date(entry.earnedAt).getTime()
        if (Number.isNaN(timestamp) || timestamp < threshold) {
          return false
        }
      }

      return true
    })
  }, [entries, typeFilter, dateFilter])

  const summary = useMemo(() => {
    const totalXlm = entries.filter((entry) => entry.type === "XLM").reduce((sum, entry) => sum + (entry.amount ?? 0), 0)
    const totalNfts = entries.filter((entry) => entry.type === "NFT").length
    const totalTx = entries.length
    return { totalXlm, totalNfts, totalTx }
  }, [entries])

  return (
    <section aria-label={title} className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
          <Card className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <CardTitle className="text-sm text-slate-500">Total Distributed</CardTitle>
            <CardContent className="p-0 mt-3 text-2xl font-semibold text-slate-900">{summary.totalTx}</CardContent>
          </Card>
          <Card className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <CardTitle className="text-sm text-slate-500">XLM Total</CardTitle>
            <CardContent className="p-0 mt-3 text-2xl font-semibold text-emerald-700">{summary.totalXlm.toFixed(2)}</CardContent>
          </Card>
          <Card className="rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
            <CardTitle className="text-sm text-slate-500">NFT Events</CardTitle>
            <CardContent className="p-0 mt-3 text-2xl font-semibold text-violet-700">{summary.totalNfts}</CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="grid grid-cols-3 gap-2">
          {TYPE_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              variant={typeFilter === filter.id ? "default" : "outline"}
              className="text-sm"
              onClick={() => setTypeFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-500" />
          <div className="flex flex-wrap items-center gap-2">
            {DATE_RANGES.map((range) => (
              <Button
                key={range.id}
                variant={dateFilter === range.id ? "default" : "outline"}
                className="text-sm"
                onClick={() => setDateFilter(range.id)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.7fr_0.7fr_0.7fr_1.1fr_1.4fr] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs uppercase tracking-[0.16em] text-slate-500">
          <span>Reward</span>
          <span>Type</span>
          <span>{showRecipient ? recipientLabel : "Amount"}</span>
          <span>Date</span>
          <span className="text-right">Transaction</span>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-500">
            No reward history matches this filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="grid grid-cols-[1.7fr_0.7fr_0.7fr_1.1fr_1.4fr] gap-0 px-4 py-4 items-center text-sm text-slate-700">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{entry.huntName ?? "Unknown Hunt"}</p>
                  <p className="text-xs text-slate-500">{entry.description}</p>
                </div>
                <span className="font-semibold text-slate-900">{entry.type}</span>
                <span className="font-medium text-slate-900">
                  {showRecipient ? entry.recipient ?? "—" : entry.type === "XLM" ? `${entry.amount?.toFixed(2)} XLM` : "NFT"}
                </span>
                <span className="text-slate-500">{formatISOString(entry.earnedAt)}</span>
                <div className="flex justify-end">
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 rounded-full text-xs px-3"
                  >
                    <a href={entry.explorerUrl} target="_blank" rel="noreferrer noopener">
                      <span className="inline-flex items-center gap-1">
                        Explorer <ExternalLink className="h-3.5 w-3.5" />
                      </span>
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
