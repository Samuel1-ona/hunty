"use client"

import { useContext, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/Header"
import { HuntReplayDetail } from "@/components/HuntReplayDetail"
import { WalletContext } from "@/lib/context/WalletContext"
import { getAttemptById } from "@/lib/huntAttemptHistory"
import type { HuntAttemptRecord } from "@/lib/types"

export default function HuntReplayPage() {
  const params = useParams<{ attemptId: string }>()
  const wallet = useContext(WalletContext)
  const connected = wallet?.connected ?? false
  const publicKey = wallet?.publicKey ?? ""
  const [attempt, setAttempt] = useState<HuntAttemptRecord | null>(null)

  useEffect(() => {
    if (!connected || !publicKey || !params.attemptId) {
      setAttempt(null)
      return
    }

    setAttempt(getAttemptById(publicKey, params.attemptId))
  }, [connected, params.attemptId, publicKey])

  return (
    <div className="min-h-screen bg-linear-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-20">
      <Header />

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 pt-4 pb-12 bg-white rounded-4xl">
        {!connected || !publicKey ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600 px-6">
            Connect your wallet to view this hunt replay.
          </div>
        ) : !attempt ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600 px-6">
            Hunt attempt not found.
          </div>
        ) : (
          <HuntReplayDetail attempt={attempt} playerAddress={publicKey} />
        )}
      </div>
    </div>
  )
}
