"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

import { HuntPlayers } from "@/components/HuntPlayers"
import { Header } from "@/components/Header"
import { getHuntById } from "@/lib/huntStore"
import type { StoredHunt } from "@/lib/types"

interface PlayersPageProps {
  params: Promise<{ id: string }>
}

export default function PlayersPage({ params }: PlayersPageProps) {
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

  if (huntId === null) {
    return null
  }

  const huntTitle = hunt?.title ?? "Hunt"

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/hunt/${huntId}/leaderboard`} className="hover:text-slate-300">
            Leaderboard
          </Link>
          <span>/</span>
          <span className="text-slate-300">Players</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-bold mb-2">{huntTitle}</h1>
        <p className="text-slate-400 mb-6">All players registered for this hunt.</p>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <HuntPlayers huntId={huntId} />
        </div>
      </main>
    </div>
  )
}
