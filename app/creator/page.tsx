"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/Header"
import { useWallet } from "@/lib/context/WalletContext"
import type { StoredHunt } from "@/lib/types"
import { getHuntsByCreator } from "@/lib/huntStore"

function StatusBadge({ status }: { status: StoredHunt["status"] }) {
  const config = {
    Draft: "bg-amber-100 text-amber-800 border-amber-200",
    Active: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Completed: "bg-slate-100 text-slate-700 border-slate-200",
    Cancelled: "bg-red-100 text-red-800 border-red-200",
  }
  const style = config[status] ?? config.Draft
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  )
}

export default function CreatorPage() {
  const router = useRouter()
  const { connected, publicKey, connect } = useWallet()
  const [hunts, setHunts] = useState<StoredHunt[]>([])

  const loadHunts = useCallback(() => {
    if (!publicKey) {
      setHunts([])
      return
    }
    setHunts(getHuntsByCreator())
  }, [publicKey])

  useEffect(() => {
    loadHunts()
  }, [loadHunts])

  const handleCardClick = (hunt: StoredHunt) => {
    if (hunt.status === "Draft") {
      router.push(`/hunty?edit=${hunt.id}`)
    } else if (hunt.status === "Active") {
      router.push(`/creator/stats/${hunt.id}`)
    }
    // Completed: no navigation or could open a read-only summary
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] pb-12">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Game Arcade
            </Link>
          </Button>
        </div>

        <h1 className="mb-2 text-3xl font-bold bg-gradient-to-br from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
          My Hunts
        </h1>
        <p className="mb-8 text-slate-600">
          View and manage hunts you have created. Draft hunts open in Edit; Active hunts open Live Statistics.
        </p>

        {!connected ? (
          <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="mb-4 text-slate-600">
              Connect your wallet to see hunts you have created.
            </p>
            <Button
              onClick={() => connect()}
              className="bg-[#0C0C4F] hover:bg-slate-800 text-white"
            >
              Connect Wallet
            </Button>
          </Card>
        ) : hunts.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="mb-4 text-slate-600">
              You haven&apos;t created any hunts yet.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild className="bg-[#0C0C4F] hover:bg-slate-800 text-white">
                <Link href="/hunty">Create your first hunt</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-[#0C0C4F] text-[#0C0C4F] hover:bg-[#0C0C4F] hover:text-white"
              >
                <Link href="/hunty/templates">Browse templates</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {hunts.map((hunt) => {
              const isDraft = hunt.status === "Draft"
              const isActive = hunt.status === "Active"
              const isClickable = isDraft || isActive

              return (
                <Card
                  key={hunt.id}
                  className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow ${
                    isClickable
                      ? "cursor-pointer hover:shadow-md"
                      : "opacity-90"
                  }`}
                  onClick={() => isClickable && handleCardClick(hunt)}
                >
                  <div className="p-5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-lg">
                        {hunt.title}
                      </CardTitle>
                      <StatusBadge status={hunt.status} />
                    </div>
                    <CardDescription className="mb-4 line-clamp-3 text-sm text-slate-600">
                      {hunt.description}
                    </CardDescription>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">
                        {hunt.cluesCount} {hunt.cluesCount === 1 ? "clue" : "clues"}
                      </span>
                      {isDraft && (
                        <span className="flex items-center gap-1 text-xs text-amber-700">
                          <Pencil className="h-3 w-3" />
                          Edit
                        </span>
                      )}
                      {isActive && (
                        <span className="flex items-center gap-1 text-xs text-emerald-700">
                          <BarChart3 className="h-3 w-3" />
                          Live Statistics
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
