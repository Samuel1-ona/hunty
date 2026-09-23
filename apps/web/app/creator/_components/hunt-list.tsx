"use client"

import { Button } from "@hunty/ui"
import { Archive, Check, Eye, Star, Trash2 } from "lucide-react"
import Link from "next/link"

import type { StoredHunt } from "@/lib/types"

export type CreatorTab = "active" | "archived" | "deleted"
export type HuntAction = "archive" | "soft-delete" | "unarchive" | "restore" | "permanent-delete"

export function HuntList({
  hunts,
  activeTab,
  selectedHunts,
  promotingHuntId,
  onToggleSelect,
  onAction,
  onPromote,
  onSaveTemplate,
}: {
  hunts: StoredHunt[]
  activeTab: CreatorTab
  selectedHunts: number[]
  promotingHuntId: number | null
  onToggleSelect: (id: number) => void
  onAction: (action: HuntAction, ids: number[]) => void
  onPromote: (hunt: StoredHunt) => void
  onSaveTemplate: (hunt: StoredHunt) => void
}) {
  return <>
    {hunts.map((hunt) => {
      const selected = selectedHunts.includes(hunt.id)
      return <article key={hunt.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={selected} onChange={() => onToggleSelect(hunt.id)} aria-label={`Select ${hunt.title}`} />
            <span><h2 className="font-semibold text-slate-900">{hunt.title}</h2><p className="mt-1 text-sm text-slate-500">{hunt.description}</p></span>
          </label>
          {hunt.averageRating ? <span className="flex items-center gap-1 text-sm text-amber-600"><Star className="h-4 w-4" />{hunt.averageRating.toFixed(1)}</span> : null}
        </div>
        <p className="mt-3 text-sm text-slate-500">{hunt.playerCount ?? 0} players · {hunt.cluesCount} clues</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button label="Preview" variant="outline" size="sm" asChild><Link href={`/hunt/${hunt.id}/preview`}><Eye className="mr-1 h-4 w-4" />Preview</Link></Button>
          {activeTab === "active" ? <>
            <Button label="Archive" variant="outline" size="sm" onClick={() => onAction("archive", [hunt.id])}><Archive className="mr-1 h-4 w-4" />Archive</Button>
            <Button label="Promote" variant="outline" size="sm" disabled={promotingHuntId === hunt.id} onClick={() => onPromote(hunt)}><Star className="mr-1 h-4 w-4" />Promote</Button>
          </> : null}
          {activeTab === "archived" ? <Button label="Restore" variant="outline" size="sm" onClick={() => onAction("unarchive", [hunt.id])}><Check className="mr-1 h-4 w-4" />Restore</Button> : null}
          {activeTab === "deleted" ? <Button label="Restore" variant="outline" size="sm" onClick={() => onAction("restore", [hunt.id])}><Check className="mr-1 h-4 w-4" />Restore</Button> : null}
          <Button label="Save template" variant="outline" size="sm" onClick={() => onSaveTemplate(hunt)}>Save template</Button>
          <Button label="Delete" variant="ghost" size="sm" onClick={() => onAction("soft-delete", [hunt.id])}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </article>
    })}
  </>
}
