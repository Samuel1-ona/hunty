"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Crown, Eye, Pencil, UserPlus, Users } from "lucide-react"
import {
  acceptInvite,
  appendActivity,
  getActiveEditors,
  getActivityLog,
  getCollaborators,
  inviteCollaborator,
  pingPresence,
  removeCollaborator,
  transferOwnership,
  updateCollaboratorRole,
  type CollaboratorRole,
  type CollaborationActivityEntry,
  type HuntCollaborator,
} from "@/lib/collaboration"
import { Button } from "@hunty/ui"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface CollaboratorsPanelProps {
  huntId: number
  currentWallet: string
  className?: string
}

const ROLE_ICON: Record<CollaboratorRole, typeof Crown> = {
  owner: Crown,
  editor: Pencil,
  viewer: Eye,
}

export function CollaboratorsPanel({
  huntId,
  currentWallet,
  className,
}: CollaboratorsPanelProps) {
  const [collaborators, setCollaborators] = useState<HuntCollaborator[]>([])
  const [activity, setActivity] = useState<CollaborationActivityEntry[]>([])
  const [inviteAddress, setInviteAddress] = useState("")
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setCollaborators(getCollaborators(huntId))
    setActivity(getActivityLog(huntId, 30))
  }, [huntId])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Presence heartbeat while panel is open
  useEffect(() => {
    if (!currentWallet) return
    pingPresence(huntId, currentWallet, "collaborators-panel")
    const id = setInterval(() => {
      pingPresence(huntId, currentWallet, "collaborators-panel")
      refresh()
    }, 8_000)
    return () => {
      clearInterval(id)
      pingPresence(huntId, currentWallet, null)
    }
  }, [huntId, currentWallet, refresh])

  const me = useMemo(
    () => collaborators.find((c) => c.walletAddress === currentWallet),
    [collaborators, currentWallet],
  )
  const isOwner = me?.role === "owner"
  const activeEditors = useMemo(() => {
    // Reference collaborators so re-fetching collaborators triggers recomputing active editors
    void collaborators
    return getActiveEditors(huntId, currentWallet)
  }, [huntId, currentWallet, collaborators])

  const handleInvite = () => {
    setError(null)
    setMessage(null)
    const result = inviteCollaborator(huntId, currentWallet, inviteAddress, inviteRole)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setInviteAddress("")
    setMessage(`Invite sent to ${result.collaborator.walletAddress.slice(0, 6)}…`)
    refresh()
  }

  return (
    <div className={cn("space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4", className)}>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-teal-300" />
        <h3 className="text-sm font-semibold text-slate-100">Collaborators</h3>
      </div>

      {activeEditors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          {activeEditors.map((e) => (
            <div key={e.walletAddress}>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              {short(e.walletAddress)} is editing {e.editingField}
            </div>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {collaborators.map((c) => {
          const Icon = ROLE_ICON[c.role]
          return (
            <li
              key={c.walletAddress}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/20 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-mono text-slate-200 truncate">
                    {c.walletAddress}
                    {c.walletAddress === currentWallet ? " (you)" : ""}
                  </p>
                  <p className="text-[11px] text-slate-500 capitalize">
                    {c.role}
                    {!c.accepted ? " · pending" : ""}
                    {c.lastActiveAt && Date.now() - c.lastActiveAt < 30_000
                      ? " · online"
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isOwner && c.role !== "owner" && (
                  <>
                    <select
                      className="rounded-md border border-white/10 bg-black/40 text-[11px] text-slate-200 px-1 py-1"
                      value={c.role}
                      onChange={(e) => {
                        updateCollaboratorRole(
                          huntId,
                          currentWallet,
                          c.walletAddress,
                          e.target.value as "editor" | "viewer",
                        )
                        refresh()
                      }}
                    >
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        const res = transferOwnership(huntId, currentWallet, c.walletAddress)
                        if (!res.ok) setError(res.error)
                        refresh()
                      }}
                    >
                      Make owner
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-red-300"
                      onClick={() => {
                        removeCollaborator(huntId, currentWallet, c.walletAddress)
                        refresh()
                      }}
                    >
                      Remove
                    </Button>
                  </>
                )}
                {!c.accepted && c.walletAddress === currentWallet && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => {
                      acceptInvite(huntId, currentWallet)
                      refresh()
                    }}
                  >
                    Accept
                  </Button>
                )}
              </div>
            </li>
          )
        })}
        {collaborators.length === 0 && (
          <p className="text-xs text-slate-500">No collaborators yet. Invite a wallet to co-create.</p>
        )}
      </ul>

      {isOwner || collaborators.length === 0 ? (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <UserPlus className="h-3 w-3" /> Invite by wallet address
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={inviteAddress}
              onChange={(e) => setInviteAddress(e.target.value)}
              placeholder="G..."
              className="font-mono text-xs"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "editor" | "viewer")}
              className="rounded-md border border-white/10 bg-black/40 text-xs text-slate-200 px-2"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="button" onClick={handleInvite} size="sm">
              Invite
            </Button>
          </div>
        </div>
      ) : null}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-emerald-400">{message}</p>}

      <CollaborationActivityLog entries={activity} />
    </div>
  )
}

export function CollaborationActivityLog({
  entries,
  className,
}: {
  entries: CollaborationActivityEntry[]
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Activity log
      </h4>
      <ul className="max-h-40 overflow-y-auto space-y-1.5">
        {entries.length === 0 && (
          <li className="text-[11px] text-slate-500">No activity yet.</li>
        )}
        {entries.map((e) => (
          <li key={e.id} className="text-[11px] text-slate-400">
            <span className="text-slate-500">
              {new Date(e.timestamp * 1000).toLocaleString()}
            </span>
            {" · "}
            {e.summary}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Helper for creators to record a hunt edit in the activity log. */
export function logHuntEdit(
  huntId: number,
  actorAddress: string,
  summary: string,
): void {
  appendActivity(huntId, {
    actorAddress,
    action: "hunt_updated",
    summary,
  })
}

function short(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}
