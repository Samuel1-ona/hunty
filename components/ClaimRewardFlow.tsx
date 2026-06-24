"use client"

import { useState, useCallback, useRef } from "react"
import { CheckCircle2, Loader2, ExternalLink, AlertCircle, RefreshCw, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import Coin from "@/components/icons/Coin"
import { claimReward, ClaimTimeoutError, ClaimRejectedError } from "@/lib/contracts/rewardManager"
import { getStellarExplorerUrl } from "@/lib/constants"
import { useXlmUsdPrice } from "@/hooks/useXlmUsdPrice"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"

type ClaimStage = "idle" | "preparing" | "approving" | "confirming" | "retrying" | "success" | "error"

interface ClaimRewardFlowProps {
  huntId: number
  rewardAmount: number
  rewardType?: "XLM" | "NFT" | "Both"
  onClaimed?: (txHash: string) => void
}

const STAGE_LABELS: Record<ClaimStage, string> = {
  idle: "",
  preparing: "Preparing transaction…",
  approving: "Approve in your wallet…",
  confirming: "Confirming on-chain…",
  retrying: "Retrying…",
  success: "Reward claimed!",
  error: "Claim failed",
}

export function ClaimRewardFlow({ huntId, rewardAmount, rewardType = "XLM", onClaimed }: ClaimRewardFlowProps) {
  const [stage, setStage] = useState<ClaimStage>("idle")
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const { price: xlmUsdPrice } = useXlmUsdPrice()

  const currencyFormatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  })

  const usdEquivalent = xlmUsdPrice != null ? currencyFormatter.format(rewardAmount * xlmUsdPrice) : null

  const handleClaim = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setStage("preparing")
    setErrorMessage(null)
    setTxHash(null)

    try {
      const result = await claimReward(huntId, {
        signal: controller.signal,
        onStage: (s) => {
          if (s === "retrying") setStage("retrying")
        },
      })

      if (controller.signal.aborted) return

      setTxHash(result.txHash)
      setStage("success")
      setClaimed(true)
      onClaimed?.(result.txHash)
    } catch (err) {
      if (controller.signal.aborted) return

      if (err instanceof ClaimTimeoutError) {
        setErrorMessage("Transaction timed out. Please try again.")
      } else if (err instanceof ClaimRejectedError) {
        setErrorMessage("Transaction was rejected in your wallet. Please try again.")
      } else {
        const msg = err instanceof Error ? err.message : "An unexpected error occurred"
        setErrorMessage(msg)
      }

      setStage("error")
      logger.error("Claim reward failed:", err)
    }
  }, [huntId, onClaimed])

  const handleRetry = useCallback(() => {
    setStage("idle")
    setErrorMessage(null)
  }, [])

  const explorerUrl = txHash ? getStellarExplorerUrl(txHash) : null

  if (claimed && stage === "success" && txHash) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-green-700 dark:text-green-400">Claimed Successfully!</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Your reward has been sent to your wallet.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
          <Coin />
          <span className="font-bold text-lg">{rewardAmount.toFixed(2)} {rewardType}</span>
          {usdEquivalent && (
            <span className="text-sm text-slate-500">({usdEquivalent})</span>
          )}
        </div>

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View transaction on Stellar Explorer
          </a>
        )}

        <div className="w-full max-w-xs">
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
            {txHash}
          </div>
        </div>
      </div>
    )
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-red-700 dark:text-red-400">Claim Failed</p>
          {errorMessage && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{errorMessage}</p>
          )}
        </div>

        <Button
          onClick={handleRetry}
          className="bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:opacity-90 text-white font-bold px-8 py-3 rounded-full inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    )
  }

  if (stage !== "idle") {
    const isApprovingOrConfirming = stage === "approving" || stage === "confirming"
    const isRetrying = stage === "retrying"

    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500",
          isRetrying
            ? "bg-amber-100 dark:bg-amber-900/30"
            : "bg-indigo-100 dark:bg-indigo-900/30"
        )}>
          {isApprovingOrConfirming ? (
            <Wallet className={cn(
              "w-8 h-8",
              isRetrying ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"
            )} />
          ) : (
            <Loader2 className={cn(
              "w-8 h-8 animate-spin",
              isRetrying ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"
            )} />
          )}
        </div>

        <div className="text-center">
          <p className="text-lg font-bold text-slate-800 dark:text-white">
            {STAGE_LABELS[stage]}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRetrying
              ? "Re-attempting the claim…"
              : "Please do not close this page."}
          </p>
        </div>

        {!isRetrying && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex gap-1">
              {["preparing", "approving", "confirming"].map((s) => {
                const stageIndex = ["preparing", "approving", "confirming"].indexOf(s)
                const currentIndex = ["preparing", "approving", "confirming"].indexOf(stage)
                const isActive = stageIndex <= currentIndex
                const isCurrent = s === stage
                return (
                  <div
                    key={s}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full transition-all duration-500",
                      isCurrent ? "bg-indigo-600 dark:bg-indigo-400 scale-125" : isActive ? "bg-indigo-300 dark:bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
                    )}
                  />
                )
              })}
            </div>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">
              {["preparing", "approving", "confirming"].indexOf(stage) + 1} of 3
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 px-5 py-3 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
        <div className="flex items-center gap-2">
          <Coin />
          <span className="font-bold text-lg text-slate-800 dark:text-white">
            {rewardAmount.toFixed(2)} {rewardType}
          </span>
        </div>
        {usdEquivalent && (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ≈ {usdEquivalent}
          </span>
        )}
      </div>

      <Button
        onClick={handleClaim}
        className="px-8 py-3 rounded-full text-white font-bold text-lg w-full max-w-sm bg-gradient-to-b from-[#39A437] to-[#194F0C] hover:opacity-90 inline-flex items-center gap-2"
      >
        <Wallet className="w-5 h-5" />
        Claim Prize
      </Button>
    </div>
  )
}
