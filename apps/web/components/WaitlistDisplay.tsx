"use client"

import { Clock, Users } from "lucide-react"
import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WaitlistEntry } from "@/lib/types"
import { getWaitlistForHunt, getWaitlistPosition } from "@/lib/waitlist"

interface WaitlistDisplayProps {
  huntId: number
  currentPlayers: number
  maxCapacity?: number
  playerAddress?: string
}

export function WaitlistDisplay({
  huntId,
  currentPlayers,
  maxCapacity,
  playerAddress
}: WaitlistDisplayProps) {
  const waitlist = getWaitlistForHunt(huntId)
  const position = playerAddress ? getWaitlistPosition(huntId, playerAddress) : null

  if (!maxCapacity) return null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" /> Spots Left
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {Math.max(0, maxCapacity - currentPlayers)} / {maxCapacity}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Waitlist
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {waitlist.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {position !== null && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Clock className="h-4 w-4" /> You&apos;re #{position} on the waitlist
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            We&apos;ll notify you when a spot becomes available!
          </p>
        </div>
      )}
    </div>
  )
}
