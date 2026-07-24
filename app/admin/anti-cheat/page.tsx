"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Shield, Ban, Eye, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Header } from "@/components/Header"
import { toast } from "sonner"

interface FlaggedUser {
  wallet: string
  ip: string
  anomalyCount: number
  lastAnomaly: number
}

interface AnomalyRecord {
  id: string
  wallet: string
  ip: string
  type: string
  details: string
  timestamp: number
  huntId: number
  clueId: number
}

interface BanRecord {
  wallet: string
  ip: string
  reason: string
  bannedAt: number
  bannedBy: string
}

interface SubmissionRecord {
  huntId: number
  clueId: number
  wallet: string
  ip: string
  correct: boolean
  serverTimestamp: number
  score: number
  anomalyFlags: string[]
}

type Tab = "flagged" | "anomalies" | "submissions" | "bans"

export default function AdminAntiCheatPage() {
  const [tab, setTab] = useState<Tab>("flagged")
  const [flaggedUsers, setFlaggedUsers] = useState<FlaggedUser[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([])
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [bans, setBans] = useState<BanRecord[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>("")
  const [banReason, setBanReason] = useState<string>("")

  const fetchData = useCallback(async () => {
    try {
      const [flaggedRes, anomaliesRes, submissionsRes, bansRes] = await Promise.all([
        fetch("/api/admin/anti-cheat?type=flagged"),
        fetch(`/api/admin/anti-cheat?type=anomalies${selectedWallet ? `&wallet=${selectedWallet}` : ""}`),
        fetch(`/api/admin/anti-cheat?type=submissions${selectedWallet ? `&wallet=${selectedWallet}` : ""}`),
        fetch("/api/admin/anti-cheat?type=bans"),
      ])

      const flaggedData = await flaggedRes.json()
      const anomaliesData = await anomaliesRes.json()
      const submissionsData = await submissionsRes.json()
      const bansData = await bansRes.json()

      setFlaggedUsers(flaggedData.users || [])
      setAnomalies(anomaliesData.anomalies || [])
      setSubmissions(submissionsData.submissions || [])
      setBans(bansData.bans || [])
    } catch {
      toast.error("Failed to load anti-cheat data")
    }
  }, [selectedWallet])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBan = async (wallet: string, ip: string) => {
    const reason = banReason || "Suspicious activity detected"
    try {
      const res = await fetch("/api/admin/anti-cheat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ban", wallet, ip, reason, bannedBy: "admin" }),
      })
      if (!res.ok) throw new Error("Failed to ban user")
      toast.success(`Banned ${wallet.slice(0, 8)}...`)
      setBanReason("")
      fetchData()
    } catch {
      toast.error("Failed to ban user")
    }
  }

  const handleUnban = async (wallet: string) => {
    try {
      const res = await fetch("/api/admin/anti-cheat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unban", wallet }),
      })
      if (!res.ok) throw new Error("Failed to unban user")
      toast.success(`Unbanned ${wallet.slice(0, 8)}...`)
      fetchData()
    } catch {
      toast.error("Failed to unban user")
    }
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: "flagged", label: "Flagged Users", icon: AlertTriangle },
    { key: "anomalies", label: "Anomaly History", icon: Eye },
    { key: "submissions", label: "Submissions", icon: Shield },
    { key: "bans", label: "Bans", icon: Ban },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-16">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" asChild className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              Back to Admin
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#3737A4] via-[#5C5CFF] to-[#E87785] text-transparent bg-clip-text">
            Anti-Cheat Investigation
          </h1>
          <p className="mt-2 text-slate-650 dark:text-slate-400">
            Review flagged users, anomalies, and manage bans.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  tab === t.key
                    ? "bg-[#3737A4] text-white shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Filter by wallet address..."
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="w-full max-w-md px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
          />
        </div>

        {tab === "flagged" && (
          <div className="space-y-4">
            {flaggedUsers.length === 0 ? (
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                <p className="text-slate-500">No flagged users found.</p>
              </Card>
            ) : (
              flaggedUsers.map((user) => (
                <Card key={`${user.wallet}_${user.ip}`} className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                        {user.wallet || "No wallet"}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">IP: {user.ip || "N/A"}</p>
                      <p className="text-xs text-slate-500">
                        Anomalies: <span className="font-bold text-red-500">{user.anomalyCount}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        Last: {new Date(user.lastAnomaly).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        onClick={() => handleBan(user.wallet, user.ip)}
                      >
                        <Ban className="h-3 w-3 mr-1" />
                        Ban
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "anomalies" && (
          <div className="space-y-3">
            {anomalies.length === 0 ? (
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                <p className="text-slate-500">No anomalies recorded.</p>
              </Card>
            ) : (
              anomalies.map((a) => (
                <Card key={a.id} className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        <span className="text-red-500 uppercase text-xs">{a.type}</span>
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {a.wallet || "No wallet"} | IP: {a.ip}
                      </p>
                      <p className="text-xs text-slate-500">{a.details}</p>
                      <p className="text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Hunt #{a.huntId} Clue #{a.clueId}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "submissions" && (
          <div className="space-y-3">
            {submissions.length === 0 ? (
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                <p className="text-slate-500">No submissions found.</p>
              </Card>
            ) : (
              submissions.map((s, i) => (
                <Card key={i} className={`rounded-2xl border p-4 ${
                  s.correct
                    ? "border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900"
                    : "border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900"
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">
                        {s.correct ? "Correct" : "Incorrect"}
                        {s.anomalyFlags.length > 0 && (
                          <span className="ml-2 text-xs text-red-500">
                            ({s.anomalyFlags.join(", ")})
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-slate-500">{s.wallet}</p>
                      <p className="text-xs text-slate-500">Score: {s.score} | IP: {s.ip}</p>
                      <p className="text-xs text-slate-400">{new Date(s.serverTimestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Hunt #{s.huntId} Clue #{s.clueId}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "bans" && (
          <div className="space-y-4">
            {bans.length === 0 ? (
              <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                <p className="text-slate-500">No bans recorded.</p>
              </Card>
            ) : (
              bans.map((b, i) => (
                <Card key={i} className="rounded-2xl border-red-200 dark:border-red-900/50 bg-white dark:bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                        {b.wallet || "No wallet"}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">IP: {b.ip || "N/A"}</p>
                      <p className="text-xs text-slate-500">Reason: {b.reason}</p>
                      <p className="text-xs text-slate-500">By: {b.bannedBy}</p>
                      <p className="text-xs text-slate-400">{new Date(b.bannedAt).toLocaleString()}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs"
                      onClick={() => handleUnban(b.wallet)}
                    >
                      Unban
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
