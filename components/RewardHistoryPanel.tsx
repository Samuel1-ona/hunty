"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  getRewardEscrow,
  getRewardHistory,
  refundUnclaimedRewards,
  type RewardEscrow,
} from "@/lib/contracts/rewardManager"
import { withTransactionToast } from "@/lib/txToast"
import type { RewardReceipt, StoredHunt } from "@/lib/types"

type RewardHistoryPanelProps = {
  hunts: StoredHunt[]
  onRefresh?: () => void
}

type RewardHistoryRow = {
  hunt: StoredHunt
  escrow: RewardEscrow | null
  receipts: RewardReceipt[]
}

function formatXlm(amount?: number) {
  return `${(amount ?? 0).toFixed(7)} XLM`
}

function shortHash(hash?: string) {
  if (!hash) return "No transaction yet"
  if (hash.length <= 16) return hash
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`
}

function receiptLabel(type: RewardReceipt["type"]) {
  if (type === "deposit") return "Deposit"
  if (type === "distribution") return "Distribution"
  if (type === "refund") return "Refund"
  return "Claim"
}

export function RewardHistoryPanel({ hunts, onRefresh }: RewardHistoryPanelProps) {
  const rewardHunts = useMemo(
    () => hunts.filter((hunt) => hunt.rewardType === "XLM" || hunt.rewardType === "Both"),
    [hunts]
  )
  const [rows, setRows] = useState<RewardHistoryRow[]>([])
  const [refundingHuntId, setRefundingHuntId] = useState<number | null>(null)

  const reload = useCallback(() => {
    setRows(
      rewardHunts.map((hunt) => {
        const escrow = getRewardEscrow(hunt.id)
        const receipts = getRewardHistory(hunt.id)

        if (receipts.length === 0 && hunt.rewardEscrowTxHash) {
          receipts.push({
            id: `stored_deposit_${hunt.id}`,
            huntId: hunt.id,
            type: "deposit",
            txHash: hunt.rewardEscrowTxHash,
            amount: hunt.rewardPool ?? 0,
            createdAt: (hunt.createdAt ?? Math.floor(Date.now() / 1000)) * 1000,
          })
        }

        return { hunt, escrow, receipts }
      })
    )
  }, [rewardHunts])

  useEffect(() => {
    reload()
  }, [reload])

  const handleRefund = async (huntId: number) => {
    setRefundingHuntId(huntId)
    try {
      await withTransactionToast(
        async (setStage) => {
          setStage("approving")
          return refundUnclaimedRewards(huntId)
        },
        {
          pending: "Pending - preparing refund...",
          approving: "Approving - sign the refund receipt in your wallet...",
          confirmed: "Unclaimed rewards refunded.",
        }
      )
      reload()
      onRefresh?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refund rewards.")
    } finally {
      setRefundingHuntId(null)
    }
  }

  if (rewardHunts.length === 0) return null

  return (
    <section className="mb-6 rounded-3xl border border-emerald-100 bg-white/85 p-5 shadow-sm dark:border-emerald-900/30 dark:bg-slate-950/60">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">XLM escrow</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Reward receipts</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Deposits, winner distributions, and expired-pool refunds.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map(({ hunt, escrow, receipts }) => {
          const expiresAtMs = (escrow?.expiresAt ?? hunt.endTime ?? 0) * 1000
          const isExpired = expiresAtMs > 0 && Date.now() >= expiresAtMs
          const balance = escrow?.balance ?? hunt.rewardEscrowBalance ?? 0
          const canRefund = Boolean(escrow && isExpired && balance > 0)

          return (
            <div
              key={hunt.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-900/70"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{hunt.title}</h3>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {formatXlm(balance)} remaining
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Pool {formatXlm(escrow?.totalPool ?? hunt.rewardPool)} - {receipts.length} receipt{receipts.length === 1 ? "" : "s"}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canRefund || refundingHuntId === hunt.id}
                  onClick={() => handleRefund(hunt.id)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                  title={canRefund ? "Refund unclaimed rewards" : "Refunds unlock after expiry when escrow has a balance"}
                >
                  <RotateCcw className="h-4 w-4" />
                  {refundingHuntId === hunt.id ? "Refunding" : "Refund"}
                </Button>
              </div>

              <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm dark:divide-white/10 dark:border-white/10 dark:bg-slate-950">
                {receipts.length === 0 ? (
                  <p className="px-3 py-3 text-slate-500 dark:text-slate-400">No reward transactions recorded yet.</p>
                ) : (
                  receipts.map((receipt) => (
                    <div key={receipt.id} className="grid gap-2 px-3 py-3 sm:grid-cols-[120px_1fr_110px] sm:items-center">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {receiptLabel(receipt.type)}
                        {receipt.rank ? ` #${receipt.rank}` : ""}
                      </span>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400" title={receipt.txHash}>
                        {shortHash(receipt.txHash)}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white sm:text-right">
                        {formatXlm(receipt.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
