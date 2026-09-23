"use client"

import { useCallback, useEffect, useState } from "react"

import { saveHuntAsTemplate } from "@/lib/communityTemplates"
import { useWallet } from "@/lib/context/WalletContext"
import { promoteHunt } from "@/lib/contracts/rewardManager"
import {
  archiveHunts,
  getArchivedHunts,
  getHuntsByCreator,
  getSoftDeletedHunts,
  permanentDeleteHunts,
  restoreHunts,
  softDeleteHunts,
  unhideHuntsFromPublic,
} from "@/lib/huntStore"
import { fetchCreatorRewardHistory } from "@/lib/rewardHistory"
import type { StoredHunt } from "@/lib/types"

import type { ConfirmDialogState, TemplateDialogState } from "../_components/creator-dialogs"
import type { CreatorTab, HuntAction } from "../_components/hunt-list"

export function useCreatorPage() {
  const { connected, connect, publicKey } = useWallet()
  const [hunts, setHunts] = useState<StoredHunt[]>([])
  const [activeTab, setActiveTab] = useState<CreatorTab>("active")
  const [selectedHunts, setSelectedHunts] = useState<number[]>([])
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ open: false })
  const [templateDialog, setTemplateDialog] = useState<TemplateDialogState>({ open: false })
  const [templateAuthor, setTemplateAuthor] = useState("")
  const [promotingHuntId, setPromotingHuntId] = useState<number | null>(null)
  const [rewardHistory, setRewardHistory] = useState<Awaited<ReturnType<typeof fetchCreatorRewardHistory>>>([])

  const reload = useCallback(() => {
    const creatorHunts = getHuntsByCreator(publicKey || undefined)
    setHunts(creatorHunts)
    if (publicKey) void fetchCreatorRewardHistory(publicKey).then(setRewardHistory)
  }, [publicKey])

  /* eslint-disable react-hooks/set-state-in-effect -- sync local hunt storage after wallet changes. */
  useEffect(() => { reload() }, [reload])

  const archivedHunts = getArchivedHunts()
  const softDeletedHunts = getSoftDeletedHunts()
  const getCurrentHunts = () => activeTab === "archived" ? archivedHunts : activeTab === "deleted" ? softDeletedHunts : hunts.filter((hunt) => !hunt.isArchived && !hunt.deletedAt)

  const handleAction = (action: HuntAction, ids: number[]) => {
    setConfirmDialog({ open: true, action, count: ids.length })
    setSelectedHunts(ids)
  }
  const confirmAction = () => {
    const ids = selectedHunts
    if (confirmDialog.action === "archive") archiveHunts(ids)
    if (confirmDialog.action === "unarchive") unhideHuntsFromPublic(ids)
    if (confirmDialog.action === "restore") restoreHunts(ids)
    if (confirmDialog.action === "soft-delete") softDeleteHunts(ids)
    if (confirmDialog.action === "permanent-delete") permanentDeleteHunts(ids)
    setConfirmDialog({ open: false })
    setSelectedHunts([])
    reload()
  }
  const handlePromote = async (hunt: StoredHunt) => {
    setPromotingHuntId(hunt.id)
    try { await promoteHunt(hunt.id) } finally { setPromotingHuntId(null); reload() }
  }
  const handleSaveTemplate = () => {
    const hunt = hunts.find((item) => item.id === templateDialog.huntId)
    if (hunt) saveHuntAsTemplate(hunt, templateAuthor || publicKey || "Hunty creator")
    setTemplateDialog({ open: false })
  }

  return { connected, connect, hunts, archivedHunts, softDeletedHunts, rewardHistory, activeTab, setActiveTab, selectedHunts, setSelectedHunts, confirmDialog, setConfirmDialog, templateDialog, setTemplateDialog, templateAuthor, setTemplateAuthor, promotingHuntId, handlePromote, handleAction, confirmAction, toggleHuntSelection: (id: number) => setSelectedHunts((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]), getCurrentHunts, handleSaveTemplate }
}
