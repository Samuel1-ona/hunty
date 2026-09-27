"use client"

import { useContext, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Header } from "@/components/Header"
import { HuntHistoryViewer } from "@/components/HuntHistoryViewer"
import { Button } from "@/components/ui/button"
import { WalletContext } from "@/lib/context/WalletContext"
import { getPlayerAttempts } from "@/lib/huntAttemptHistory"
import type { HuntAttemptRecord } from "@/lib/types"

export default function HuntHistoryPage() {
  const wallet = useContext(WalletContext)
  const connected = wallet?.connected ?? false
  const publicKey = wallet?.publicKey ?? ""
  const [attempts, setAttempts] = useState<HuntAttemptRecord[]>([])

  useEffect(() => {
    if (!connected || !publicKey) {
      setAttempts([])
      return
    }

    setAttempts(getPlayerAttempts(publicKey))
  }, [connected, publicKey])

  return (
    <div className="min-h-screen bg-linear-to-tr from-blue-100 bg-purple-100 to-[#f9f9ff] pb-20">
      <Header />

      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 pt-4 pb-12 bg-white rounded-4xl">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" asChild className="mb-4 w-fit px-0 text-slate-700 hover:text-slate-900">
              <Link href="/profile">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to profile
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold bg-linear-to-b from-[#3737A4] to-[#0C0C4F] text-transparent bg-clip-text">
              Hunt History
            </h1>
            <p className="text-sm md:text-base text-slate-600 mt-2">
              Replay past attempts, compare completion times, and download certificates.
            </p>
          </div>
        </div>

        {!connected || !publicKey ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-slate-600 px-6">
            Connect your wallet to view hunt replay history.
          </div>
        ) : (
          <HuntHistoryViewer attempts={attempts} />
        )}
      </div>
    </div>
  )
}
