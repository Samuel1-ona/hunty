"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Star, Trash2, RefreshCw, Trophy, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { Header } from "@/components/Header"
import { getAllHuntsIncludingPrivate, setLocalFeaturedHunt } from "@/lib/huntStore"
import type { StoredHunt } from "@/lib/types"
import { toast } from "sonner"
import { HuntCoverImage } from "@/components/HuntCoverImage"

function StatusBadge({ status }: { status: StoredHunt["status"] }) {
  const config = {
    Draft: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    Active: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    Completed: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-750",
    Cancelled: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/50",
  }
  const style = config[status] ?? config.Draft
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style}`}>
      {status}
    </span>
  )
}

export default function AdminPage() {
  const [hunts, setHunts] = useState<StoredHunt[]>([])
  const [filter, setFilter] = useState<"all" | "Active" | "Completed" | "Draft">("all")

  // Fetch featured hunt ID from server API
  const { data: featuredData, refetch: refetchFeatured, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ["featuredHuntId"],
    queryFn: async () => {
      const res = await fetch("/api/admin/featured")
      if (!res.ok) throw new Error("Failed to load featured hunt")
      return res.json() as Promise<{ featuredHuntId: number | null }>
    }
  })

  const featuredHuntId = featuredData?.featuredHuntId ?? null

  const loadHuntsList = useCallback(() => {
    // Read from client's local store
    setHunts(getAllHuntsIncludingPrivate())
  }, [])

  useEffect(() => {
    loadHuntsList()
  }, [loadHuntsList])

  const handleSetFeatured = async (huntId: number) => {
    const targetHunt = hunts.find(h => h.id === huntId)
    if (!targetHunt) return

    const promise = async () => {
      // 1. Persist on Server
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huntId }),
      })
      if (!res.ok) throw new Error("Failed to set featured hunt on server")

      // 2. Sync client-side localStorage
      setLocalFeaturedHunt(huntId)
      
      // 3. Reload lists
      loadHuntsList()
      await refetchFeatured()
    }

    toast.promise(promise(), {
      loading: `Setting "${targetHunt.title}" as Hunt of the Week...`,
      success: `"${targetHunt.title}" is now the Hunt of the Week!`,
      error: "Could not set featured hunt. Please try again.",
    })
  }

  const handleClearFeatured = async () => {
    const promise = async () => {
      // 1. Clear on Server
      const res = await fetch("/api/admin/featured", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huntId: null }),
      })
      if (!res.ok) throw new Error("Failed to clear featured hunt")

      // 2. Sync client local storage
      setLocalFeaturedHunt(null)

      // 3. Reload lists
      loadHuntsList()
      await refetchFeatured()
    }

    toast.promise(promise(), {
      loading: "Clearing Hunt of the Week...",
      success: "Hunt of the Week banner cleared successfully.",
      error: "Failed to clear. Please try again.",
    })
  }

  const handleTriggerRotation = async () => {
    const promise = async () => {
      const res = await fetch("/api/admin/featured/rotate", { method: "POST" })
      if (!res.ok) {
        const errorData = await res.json() as { error?: string }
        throw new Error(errorData.error || "Rotation failed")
      }
      const data = await res.json() as { rotatedTo: number }

      // Sync the rotated hunt in client local storage
      setLocalFeaturedHunt(data.rotatedTo)

      loadHuntsList()
      await refetchFeatured()
      return data
    }

    toast.promise(promise(), {
      loading: "Rotating Hunt of the Week...",
      success: (data) => {
        const rotatedHunt = hunts.find(h => h.id === data.rotatedTo)
        return `Weekly rotation complete! Rotated to: "${rotatedHunt?.title || 'Next Hunt'}"`
      },
      error: (err) => `${err?.message || "Failed to rotate featured hunt."}`,
    })
  }

  const featuredHunt = hunts.find(h => h.id === featuredHuntId)

  const filteredHunts = hunts.filter(h => {
    if (filter === "all") return true
    return h.status === filter
  })

  return (
    <div className="min-h-screen bg-gradient-to-tr from-blue-100 via-purple-100 to-[#f9f9ff] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-16">
      <Header balance="24.2453" />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation back */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="ghost"
            asChild
            className="flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to Game Arcade
            </Link>
          </Button>
        </div>

        {/* Dashboard Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-[#3737A4] via-[#5C5CFF] to-[#E87785] text-transparent bg-clip-text">
              Curate Hunt of the Week
            </h1>
            <p className="mt-2 text-slate-650 dark:text-slate-400">
              Select or rotate high-quality hunts to showcase in the top-level Arcade Hero Banner.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleTriggerRotation}
              className="bg-indigo-650 hover:bg-indigo-750 text-white font-bold flex items-center gap-2 rounded-xl transition-all"
            >
              <RefreshCw className="h-4 w-4 animate-spin-hover" />
              Trigger Weekly Rotation
            </Button>
            <Button
              variant="outline"
              onClick={handleClearFeatured}
              disabled={!featuredHuntId}
              className="border-red-200 dark:border-red-900/35 text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold flex items-center gap-2 rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
              Clear Curation
            </Button>
          </div>
        </div>

        {/* Active curation overview */}
        {featuredHunt ? (
          <section className="mb-12">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Active Showcase
            </h2>
            <div className="relative overflow-hidden rounded-3xl p-[2px] bg-gradient-to-r from-amber-400 via-pink-500 to-[#3737A4] shadow-xl animate-pulse-glow">
              <div className="rounded-[22px] bg-white dark:bg-slate-900 p-6 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 items-center">
                <div className="w-full lg:w-1/3 max-h-48 overflow-hidden rounded-2xl relative shadow-inner">
                  <HuntCoverImage
                    src={featuredHunt.coverImageCid}
                    alt={`${featuredHunt.title} cover`}
                    className="w-full h-44 bg-slate-100 dark:bg-slate-800"
                  />
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                    <Trophy className="h-3 w-3" />
                    Featured
                  </span>
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#3737A4] dark:text-indigo-400">
                    Featured Hunt of the Week
                  </span>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 mb-3">
                    {featuredHunt.title}
                  </h3>
                  <p className="text-slate-650 dark:text-slate-400 mb-4 max-w-2xl text-sm md:text-base leading-relaxed">
                    {featuredHunt.description}
                  </p>
                  <div className="flex flex-wrap justify-center lg:justify-start items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-xs font-bold text-[#3737A4] dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                      {featuredHunt.cluesCount} Clues
                    </span>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                      featuredHunt.rewardType === "XLM" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-450 border-green-100 dark:border-green-900/30" :
                      featuredHunt.rewardType === "NFT" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-900/30" :
                      "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30"
                    }`}>
                      {featuredHunt.rewardType} Prize
                    </span>
                    <StatusBadge status={featuredHunt.status} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-12">
            <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-900/30 py-8 text-center">
              <Star className="h-8 w-8 text-slate-350 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-450 font-medium">
                No hunt is currently featured as the Hunt of the Week.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Select an active hunt below or trigger automated rotation to activate the hero banner.
              </p>
            </div>
          </section>
        )}

        {/* Hunts List filter and curation section */}
        <section>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              All Hunts
            </h2>
            <div className="flex bg-slate-100 dark:bg-slate-850 p-1 rounded-xl w-full sm:w-auto">
              {(["all", "Active", "Completed", "Draft"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    filter === s
                      ? "bg-white dark:bg-slate-700 text-[#3737A4] dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                  }`}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>

          {filteredHunts.length === 0 ? (
            <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No hunts found matching the filter selection.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredHunts.map((hunt) => {
                const isFeatured = hunt.id === featuredHuntId
                const isActive = hunt.status === "Active"

                return (
                  <Card
                    key={hunt.id}
                    className={`relative overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 ${
                      isFeatured
                        ? "border-amber-400 dark:border-amber-500 shadow-amber-100/55 ring-1 ring-amber-300/40"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700"
                    }`}
                  >
                    {isFeatured && (
                      <div className="absolute top-0 right-0 bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        Selected
                      </div>
                    )}
                    <div className="p-5 flex flex-col h-full">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <CardTitle className="line-clamp-2 text-lg font-bold text-slate-800 dark:text-white">
                          {hunt.title}
                        </CardTitle>
                        <StatusBadge status={hunt.status} />
                      </div>
                      <CardDescription className="mb-4 line-clamp-3 text-sm text-slate-650 dark:text-slate-400 flex-grow">
                        {hunt.description}
                      </CardDescription>
                      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          {hunt.cluesCount} Clues
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                          {hunt.rewardType} Reward
                        </span>
                      </div>
                      <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-850">
                        <Button
                          className={`w-full font-bold text-xs rounded-xl ${
                            isFeatured
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                              : isActive
                                ? "bg-amber-450 hover:bg-amber-500 text-slate-950"
                                : "bg-slate-100 dark:bg-slate-850 text-slate-400 cursor-not-allowed"
                          }`}
                          disabled={isFeatured || !isActive}
                          onClick={() => handleSetFeatured(hunt.id)}
                        >
                          {isFeatured ? (
                            <span className="flex items-center gap-1.5 justify-center">
                              <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                              Active Featured Hunt
                            </span>
                          ) : isActive ? (
                            "Set as Hunt of the Week"
                          ) : (
                            "Must be Active to Feature"
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
