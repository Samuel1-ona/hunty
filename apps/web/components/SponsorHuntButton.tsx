"use client"

import { Heart, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@hunty/ui"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getSponsorContributions,getSponsorTotal, sponsorHunt } from "@/lib/contracts/rewardManager"
import { withTransactionToast } from "@/lib/txToast"
import { predictWalletBalanceChange } from "@/lib/wallet/balanceEvents"

interface SponsorHuntButtonProps {
  huntId: number
  totalPool: number
  onSponsored?: () => void
}

export function SponsorHuntButton({ huntId, totalPool, onSponsored }: SponsorHuntButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [isSponsoring, setIsSponsoring] = useState(false)

  const sponsorTotal = getSponsorTotal(huntId)
  const sponsorCount = getSponsorContributions(huntId).length

  const handleSponsor = async () => {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setIsSponsoring(true)
    // Show the debit right away; withTransactionToast reconciles it against
    // chain state whether the sponsorship confirms or fails.
    predictWalletBalanceChange({ xlmDelta: -numAmount })
    try {
      await withTransactionToast(
        async (setStage) => {
          setStage("approving")
          return sponsorHunt(huntId, numAmount)
        },
        {
          pending: `Pending — preparing sponsorship of ${numAmount} XLM...`,
          approving: "Approving — sign in your wallet...",
          confirmed: `Successfully sponsored ${numAmount} XLM!`,
        }
      )
      setAmount("")
      setIsOpen(false)
      onSponsored?.()
      toast.success(`Thank you for sponsoring ${numAmount} XLM!`)
    } catch (error) {
      if (error instanceof Error && !error.message.includes("reject")) {
        toast.error(error.message)
      }
    } finally {
      setIsSponsoring(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 dark:border-pink-800/50 dark:bg-pink-900/20 dark:text-pink-400 dark:hover:bg-pink-900/30"
      >
        <Heart className="w-4 h-4 mr-2" />
        Sponsor This Hunt
      </Button>

      {sponsorCount > 0 && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {sponsorCount} sponsor{sponsorCount !== 1 ? "s" : ""} · {sponsorTotal} XLM
        </span>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              Sponsor This Hunt
            </DialogTitle>
            <DialogDescription>
              Add XLM to the reward pool to increase the prize without modifying the creator&apos;s contract.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Current Reward Pool</span>
                <span className="font-semibold text-slate-900 dark:text-white">{totalPool} XLM</span>
              </div>
              {sponsorTotal > 0 && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-pink-600 dark:text-pink-400">Sponsor Contributions</span>
                  <span className="font-semibold text-pink-600 dark:text-pink-400">{sponsorTotal} XLM</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Sponsorship Amount (XLM)
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className="text-lg"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSponsor}
                disabled={isSponsoring || !amount || parseFloat(amount) <= 0}
                className="flex-1 bg-gradient-to-b from-pink-500 to-pink-700 text-white hover:from-pink-600 hover:to-pink-800"
              >
                {isSponsoring ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Heart className="w-4 h-4 mr-2" />
                )}
                Sponsor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
