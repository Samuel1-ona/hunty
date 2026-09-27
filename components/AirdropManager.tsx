"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Gift,
  Users,
  Target,
  List,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  XCircle,
} from "lucide-react"
import {
  createAirdrop,
  executeAirdrop,
  getAirdropsByCreator,
  cancelAirdrop,
  type AirdropConfig,
  type AirdropRecord,
  type AirdropTargetType,
  type AirdropItemType,
} from "@/lib/nft/airdrop"

interface AirdropManagerProps {
  adminAddress: string
}

export function AirdropManager({ adminAddress }: AirdropManagerProps) {
  const [airdrops, setAirdrops] = useState<AirdropRecord[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [executing, setExecuting] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [itemType, setItemType] = useState<AirdropItemType>("token")
  const [tokenAmount, setTokenAmount] = useState("")
  const [nftId, setNftId] = useState("")
  const [targetType, setTargetType] = useState<AirdropTargetType>("all_players")
  const [huntId, setHuntId] = useState("")
  const [walletListText, setWalletListText] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setAirdrops(getAirdropsByCreator(adminAddress))
  }, [adminAddress])

  const handleCreate = () => {
    setError("")
    try {
      const config: AirdropConfig = {
        name,
        description,
        createdBy: adminAddress,
        itemType,
        tokenAmount: itemType === "token" ? Number(tokenAmount) : undefined,
        nftId: itemType === "nft" ? Number(nftId) : undefined,
        targetType,
        huntId: targetType === "hunt_completers" ? Number(huntId) : undefined,
        walletList:
          targetType === "wallet_list"
            ? walletListText
                .split(/[\n,]/)
                .map((w) => w.trim())
                .filter(Boolean)
            : undefined,
      }
      createAirdrop(config)
      setAirdrops(getAirdropsByCreator(adminAddress))
      setCreateOpen(false)
      resetForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create airdrop")
    }
  }

  const handleExecute = async (airdropId: string) => {
    setExecuting(airdropId)
    setProgress(null)
    try {
      await executeAirdrop(airdropId, (processed, total) => {
        setProgress({ processed, total })
      })
      setAirdrops(getAirdropsByCreator(adminAddress))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed")
    } finally {
      setExecuting(null)
      setProgress(null)
    }
  }

  const handleCancel = (airdropId: string) => {
    try {
      cancelAirdrop(airdropId, adminAddress)
      setAirdrops(getAirdropsByCreator(adminAddress))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed")
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setItemType("token")
    setTokenAmount("")
    setNftId("")
    setTargetType("all_players")
    setHuntId("")
    setWalletListText("")
    setError("")
  }

  const targetIcon = {
    all_players: <Users className="w-4 h-4" />,
    hunt_completers: <Target className="w-4 h-4" />,
    wallet_list: <List className="w-4 h-4" />,
  }

  const statusColor = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-slate-100 text-slate-500",
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Airdrops</h2>
        <Button onClick={() => setCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
          <Gift className="w-4 h-4 mr-2" />
          Create Airdrop
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="w-4 h-4" /> {error}
          <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {airdrops.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No airdrops yet</p>
          <p className="text-sm mt-1">Create your first airdrop to distribute rewards</p>
        </div>
      ) : (
        <div className="space-y-3">
          {airdrops.map((airdrop) => (
            <div
              key={airdrop.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900 truncate">{airdrop.name}</h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor[airdrop.status]}`}>
                    {airdrop.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  {targetIcon[airdrop.targetType]}
                  {airdrop.totalRecipients} recipients
                  {airdrop.itemType === "token" && ` · ${airdrop.tokenAmount} XLM each`}
                  {airdrop.itemType === "nft" && ` · NFT #${airdrop.nftId}`}
                </p>
                {executing === airdrop.id && progress && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {progress.processed} / {progress.total} processed
                    </p>
                  </div>
                )}
                {airdrop.status === "completed" && (
                  <p className="text-[10px] text-emerald-600 mt-1">
                    {airdrop.successCount} succeeded · {airdrop.failedCount} failed
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {airdrop.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleExecute(airdrop.id)}
                      disabled={executing !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                    >
                      {executing === airdrop.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-3 h-3 mr-1" /> Execute
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(airdrop.id)}
                      className="rounded-xl"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {airdrop.status === "completed" && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-indigo-600" />
              Create Airdrop
            </DialogTitle>
            <DialogDescription>Configure a new promotional airdrop</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Airdrop name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
            <Input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Reward Type</label>
              <div className="flex gap-2">
                {(["token", "nft"] as AirdropItemType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={itemType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setItemType(t)}
                    className="rounded-xl capitalize"
                  >
                    {t === "token" ? "XLM Tokens" : "NFT"}
                  </Button>
                ))}
              </div>
            </div>

            {itemType === "token" && (
              <Input
                type="number"
                placeholder="Amount per recipient (XLM)"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
                className="rounded-xl"
              />
            )}
            {itemType === "nft" && (
              <Input
                type="number"
                placeholder="NFT ID"
                value={nftId}
                onChange={(e) => setNftId(e.target.value)}
                className="rounded-xl"
              />
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Target</label>
              <div className="flex gap-2 flex-wrap">
                {(["all_players", "hunt_completers", "wallet_list"] as AirdropTargetType[]).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={targetType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTargetType(t)}
                    className="rounded-xl text-xs"
                  >
                    {targetIcon[t]}
                    <span className="ml-1">
                      {t === "all_players" && "All Players"}
                      {t === "hunt_completers" && "Hunt Completers"}
                      {t === "wallet_list" && "Wallet List"}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {targetType === "hunt_completers" && (
              <Input
                type="number"
                placeholder="Hunt ID"
                value={huntId}
                onChange={(e) => setHuntId(e.target.value)}
                className="rounded-xl"
              />
            )}
            {targetType === "wallet_list" && (
              <textarea
                placeholder="Paste wallet addresses (one per line or comma-separated)"
                value={walletListText}
                onChange={(e) => setWalletListText(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono min-h-[80px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {error}
              </p>
            )}

            <Button
              onClick={handleCreate}
              disabled={!name}
              className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11"
            >
              Create Airdrop
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
