"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, Clock, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/Header"
import { getHuntById, updateHuntEndTime } from "@/lib/huntStore"
import { extendEndTime } from "@/lib/contracts/hunt"
import { logger } from "@/lib/logger"
import { useWallet } from "@/lib/context/WalletContext"

export default function CreatorStatsPage() {
  const params = useParams()
  const router = useRouter()
  const huntId = typeof params.id === "string" ? parseInt(params.id, 10) : NaN
  const [title, setTitle] = useState<string>("")
  const [viewCount, setViewCount] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | undefined>()
  const [status, setStatus] = useState<string>("")
  const [isExtending, setIsExtending] = useState(false)
  const [extendHours, setExtendHours] = useState<string>("1")
  const { connected } = useWallet()

  const loadHunt = useCallback(() => {
    if (Number.isNaN(huntId)) return
    const hunt = getHuntById(huntId)
    if (hunt) {
      setTitle(hunt.title)
      setEndTime(hunt.endTime)
      setStatus(hunt.status)
    } else {
      setTitle("Unknown Hunt")
    }
  }, [huntId])

  useEffect(() => {
    if (Number.isNaN(huntId)) return

    void (async () => {
      try {
        const res = await fetch(`/api/analytics/hunt-view?huntId=${huntId}`)
        if (!res.ok) return
        const data = await res.json()
        setViewCount(typeof data.views === "number" ? data.views : 0)
      } catch {
        setViewCount(null)
      }
    })()
  }, [huntId])

  useEffect(() => {
    loadHunt()
  }, [loadHunt])

  const handleExtendEndTime = async () => {
    if (!connected) {
      alert("Please connect your wallet to extend the hunt end time.")
      return
    }

    if (Number.isNaN(huntId) || !endTime) {
      alert("Invalid hunt or end time.")
      return
    }

    const hoursToAdd = parseInt(extendHours, 10)
    if (Number.isNaN(hoursToAdd) || hoursToAdd <= 0) {
      alert("Please enter a valid number of hours.")
      return
    }

    const newEndTime = endTime + hoursToAdd * 3600 // Convert hours to seconds

    setIsExtending(true)
    try {
      // Call the contract function
      const result = await extendEndTime(huntId, newEndTime)
      
      // Update local storage
      updateHuntEndTime(huntId, result.newEndTime)
      
      // Reload hunt data
      loadHunt()
      
      alert(`Hunt end time extended successfully by ${hoursToAdd} hour(s)!`)
    } catch (error) {
      logger.error("Failed to extend end time:", error)
      alert("Failed to extend end time. Please try again.")
    } finally {
      setIsExtending(false)
    }
  }

  const formatEndTime = (timestamp?: number) => {
    if (!timestamp) return "Not set"
    return new Date(timestamp * 1000).toLocaleString()
  }

  const getTimeRemaining = (endTime?: number) => {
    if (!endTime) return null
    const now = Math.floor(Date.now() / 1000)
    const remaining = endTime - now
    if (remaining <= 0) return "Ended"
    
    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const canExtend = status === "Active" && endTime && endTime > Math.floor(Date.now() / 1000)

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/creator")}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Hunts
          </Button>
        </div>

        <div className="mb-6 flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-[#3737A4]" />
          <h1 className="text-3xl font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
            Live Statistics
          </h1>
        </div>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm mb-6">
          <CardHeader>
            <CardTitle className="text-xl">{title || "Loading…"}</CardTitle>
            <p className="text-sm text-slate-500">Hunt ID: {params.id}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Status</p>
                <p className="text-2xl font-bold text-slate-800">{status}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Time Remaining</p>
                <p className="text-2xl font-bold text-slate-800">{getTimeRemaining(endTime) || "—"}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-500 mb-1">End Time</p>
              <p className="text-sm text-slate-800">{formatEndTime(endTime)}</p>
            </div>

            {canExtend && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-900">Extend Hunt Duration</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-blue-600" />
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={extendHours}
                      onChange={(e) => setExtendHours(e.target.value)}
                      className="w-20 px-3 py-2 rounded-md border border-blue-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                      aria-label="Hours to extend"
                    />
                    <span className="text-sm text-blue-900">hours</span>
                  </div>
                  <Button
                    onClick={handleExtendEndTime}
                    disabled={isExtending || !connected}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isExtending ? "Extending..." : "Extend End Time"}
                  </Button>
                </div>
                {!connected && (
                  <p className="text-xs text-blue-700 mt-2">Connect your wallet to extend the hunt.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Player Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-slate-600">
              Live stats (players, completions, leaderboard) will be wired to the contract or indexer here.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Players</p>
                <p className="text-2xl font-bold text-slate-800">—</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Completions</p>
                <p className="text-2xl font-bold text-slate-800">—</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase text-slate-500">Hunt Views</p>
                <p className="text-2xl font-bold text-slate-800">
                  {viewCount !== null ? viewCount : "—"}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/creator">Back to My Hunts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
