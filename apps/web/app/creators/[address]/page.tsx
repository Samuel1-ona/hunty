"use client"

import { Button, Card, CardContent } from "@hunty/ui"
import { ArrowLeft, Star, Target, Trophy, User } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"
import { use, useState } from "react"

import { Header } from "@/components/Header"
import { HuntCards } from "@/components/HuntCards"
import { getCreatorProfile } from "@/lib/creatorProfiles"
import { getCreatorStats } from "@/lib/creatorStats"

interface PublicCreatorPageProps {
  params: Promise<{ address: string }>
}

export default function PublicCreatorPage({ params }: PublicCreatorPageProps) {
  const { address } = use(params)
  const decodedAddress = decodeURIComponent(address).trim()
  const [profile] = useState(() => getCreatorProfile(decodedAddress))
  const [stats] = useState(() => getCreatorStats(decodedAddress))

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <Header />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Button label="Back to arcade" variant="ghost" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to arcade
          </Link>
        </Button>
        <section className="mt-8 flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow">
            <User className="text-slate-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {decodedAddress.slice(0, 8)}...{decodedAddress.slice(-8)}
            </h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              {profile?.bio || "This creator has not added a bio yet."}
            </p>
          </div>
        </section>
        {profile?.links?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.links.map((link) => (
              <a
                className="text-sm text-indigo-700 underline"
                href={link.url}
                key={`${link.title}-${link.url}`}
                target="_blank"
                rel="noreferrer"
              >
                {link.title}
              </a>
            ))}
          </div>
        ) : null}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Target />} label="Hunts published" value={stats.huntsPublished} />
          <StatCard icon={<Trophy />} label="Players served" value={stats.playersServed} />
          <StatCard
            icon={<Star />}
            label="Average rating"
            value={stats.averageRating ? stats.averageRating.toFixed(1) : "-"}
          />
        </section>
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-slate-900">Active hunts</h2>
          {stats.activeHunts.length ? (
            <HuntCards hunts={stats.activeHunts as never[]} />
          ) : (
            <p className="rounded-xl bg-white p-8 text-center text-slate-500">
              No active hunts yet.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span className="text-indigo-600">{icon}</span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
