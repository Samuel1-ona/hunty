"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/Header"
import { LeaderboardTable } from "@/components/LeaderBoardTable"
import { LeaderboardExport } from "@/components/LeaderboardExport"
import { getHuntById } from "@/lib/huntStore"
import type { StoredHunt } from "@/lib/types"

interface LeaderboardPageProps {
  params: Promise<{ id: string }>
}

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [hunt, setHunt] = useState<StoredHunt | null>(null)
  const [huntId, setHuntId] = useState<number | null>(null)

  useEffect(() => {
    const resolveParams = async () => {
      const { id } = await params
      const huntIdNum = parseInt(id, 10)
      setHuntId(huntIdNum)
      const huntData = getHuntById(huntIdNum)
      setHunt(huntData || null)
    }
    resolveParams()
  }, [params])

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {hunt ? (
          <>
            <div className="mb-8">
              <h1 className="mb-2 text-3xl font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] bg-clip-text text-transparent">
                Leaderboard
              </h1>
              <p className="text-slate-600">
                {hunt.title}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  Players Ranked by Points
                </h2>
                <p className="text-sm text-slate-600">
                  {hunt.status === "Active"
                    ? "Leaderboard updates every 30 seconds"
                    : "This hunt is no longer active"}
                </p>
              </div>

              {huntId !== null && (
                <LeaderboardTable huntId={huntId} />
              )}
            </div>

            {huntId !== null && (
              <div className="mt-6">
                <LeaderboardExport huntId={huntId} />
              </div>
            )}

            {/* Hunt Stats */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Status</p>
                <p className="text-lg font-semibold text-slate-900 capitalize">{hunt.status}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Total Clues</p>
                <p className="text-lg font-semibold text-slate-900">{hunt.cluesCount}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Reward Type</p>
                <p className="text-lg font-semibold text-slate-900">{hunt.rewardType}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-600 font-medium">Hunt not found</p>
            <Button
              asChild
              variant="outline"
              className="mt-4"
            >
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
