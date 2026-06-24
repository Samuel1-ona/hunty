"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { StoredHunt, Reward } from "@/lib/types"
import { getHuntById, getHuntPool, depositToPool, withdrawUnclaimedRewards, setDistributionPlan, isPoolLow } from "@/lib/huntStore"

export function RewardPoolManager({ huntId, isOpen, onClose }: { huntId: number; isOpen: boolean; onClose: () => void }) {
  const [hunt, setHunt] = useState<StoredHunt | null>(null)
  const [amount, setAmount] = useState<string>("")
  const [distributionJson, setDistributionJson] = useState<string>("[]")
  const [low, setLow] = useState(false)

  useEffect(() => {
    const h = getHuntById(huntId) ?? null
    setHunt(h)
    const pool = getHuntPool(huntId)
    setDistributionJson(JSON.stringify(pool?.distribution ?? [], null, 2))
    setLow(isPoolLow(huntId))
  }, [huntId, isOpen])

  const handleDeposit = () => {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) return toast.error("Enter a valid amount")
    const ok = depositToPool(huntId, value)
    if (ok) {
      toast.success(`Deposited ${value.toFixed(2)} XLM to reward pool`)
      setAmount("")
      const h = getHuntById(huntId) ?? null
      setHunt(h)
      setLow(isPoolLow(huntId))
    } else {
      toast.error("Could not deposit")
    }
  }

  const handleTopUp = () => handleDeposit()

  const handleWithdraw = () => {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) return toast.error("Enter a valid amount")
    const ok = withdrawUnclaimedRewards(huntId, value)
    if (ok) {
      toast.success(`Withdrew ${value.toFixed(2)} XLM from unclaimed pool`)
      setAmount("")
      setHunt(getHuntById(huntId) ?? null)
      setLow(isPoolLow(huntId))
    } else {
      toast.error("Could not withdraw. Ensure hunt is ended and amount is valid")
    }
  }

  const handleSaveDistribution = () => {
    try {
      const parsed = JSON.parse(distributionJson) as Reward[]
      // basic validation
      if (!Array.isArray(parsed)) throw new Error("Invalid format")
      setDistributionPlan(huntId, parsed.map((p) => ({ place: p.place, amount: p.amount })))
      toast.success("Distribution plan saved")
      setHunt(getHuntById(huntId) ?? null)
      setLow(isPoolLow(huntId))
    } catch (err) {
      toast.error("Invalid distribution JSON")
    }
  }

  if (!hunt) return null

  const pool = getHuntPool(huntId)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reward Pool - {hunt.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-slate-500">Total Configured Pool</p>
              <p className="text-2xl font-bold">{(pool?.rewardPool ?? 0).toFixed(2)} XLM</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-slate-500">Available Balance</p>
              <p className="text-2xl font-bold">{(pool?.poolBalance ?? 0).toFixed(2)} XLM</p>
              {low && <p className="mt-2 text-sm text-amber-700">Low balance warning: top up recommended</p>}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Distribution Plan (JSON)</p>
            <textarea value={distributionJson} onChange={(e) => setDistributionJson(e.target.value)} className="w-full h-36 rounded-md border p-2 font-mono text-sm" />
            <div className="flex gap-2 mt-2">
              <Button onClick={handleSaveDistribution}>Save Plan</Button>
              <Button variant="outline" onClick={() => setDistributionJson(JSON.stringify(pool?.distribution ?? [], null, 2))}>Reset</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div className="sm:col-span-2">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (XLM)" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDeposit}>Deposit</Button>
              <Button variant="outline" onClick={handleTopUp}>Top Up</Button>
              <Button variant="ghost" onClick={handleWithdraw}>Withdraw</Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Distribution Preview</p>
            <div className="mt-2 space-y-1">
              {(pool?.distribution ?? []).map((d) => (
                <div key={d.place} className="flex justify-between rounded-md border p-2">
                  <div>Place {d.place}</div>
                  <div>{d.amount.toFixed(2)} XLM</div>
                </div>
              ))}
              {(pool?.distribution ?? []).length === 0 && <p className="text-sm text-slate-500">No distribution configured.</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
