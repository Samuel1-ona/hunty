"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import {
  isValidStellarAddress,
  transferNft,
  type TransferResult,
} from "@/lib/nft/transfer"
import type { NftRewardDetail } from "./NftDetailModal"

interface NftTransferModalProps {
  nft: NftRewardDetail | null
  senderAddress: string
  isOpen: boolean
  onClose: () => void
  onTransferComplete?: (result: TransferResult) => void
}

type TransferStep = "input" | "confirm" | "processing" | "success" | "error"

export function NftTransferModal({
  nft,
  senderAddress,
  isOpen,
  onClose,
  onTransferComplete,
}: NftTransferModalProps) {
  const [recipient, setRecipient] = useState("")
  const [memo, setMemo] = useState("")
  const [step, setStep] = useState<TransferStep>("input")
  const [error, setError] = useState("")
  const [result, setResult] = useState<TransferResult | null>(null)

  if (!nft) return null

  const recipientValid = recipient.length > 0 && isValidStellarAddress(recipient)
  const isSelf = recipient === senderAddress

  const handleConfirm = () => {
    if (!recipientValid) {
      setError("Please enter a valid Stellar address")
      return
    }
    if (isSelf) {
      setError("Cannot transfer to yourself")
      return
    }
    setError("")
    setStep("confirm")
  }

  const handleTransfer = async () => {
    setStep("processing")
    try {
      const transferResult = await transferNft({
        nftId: nft.id,
        recipientAddress: recipient,
        senderAddress,
        memo: memo || undefined,
      })
      setResult(transferResult)
      setStep("success")
      onTransferComplete?.(transferResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed")
      setStep("error")
    }
  }

  const handleClose = () => {
    setRecipient("")
    setMemo("")
    setStep("input")
    setError("")
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white border-slate-200 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-600" />
            {step === "success" ? "Transfer Complete" : `Transfer "${nft.name}"`}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && "Send this NFT to another wallet"}
            {step === "confirm" && "Please confirm the transfer details"}
            {step === "processing" && "Processing your transfer..."}
            {step === "success" && "Your NFT has been sent successfully"}
            {step === "error" && "Something went wrong"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === "input" && (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Recipient Wallet Address
                </label>
                <Input
                  placeholder="G..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value.trim())}
                  className={`font-mono text-sm ${
                    recipient.length > 0 && !recipientValid
                      ? "border-red-300 focus:ring-red-500"
                      : ""
                  }`}
                />
                {recipient.length > 0 && !recipientValid && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Invalid Stellar address
                  </p>
                )}
                {isSelf && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Cannot transfer to yourself
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  Message (optional)
                </label>
                <Input
                  placeholder="Happy birthday!"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={100}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {error}
                </p>
              )}
              <Button
                onClick={handleConfirm}
                disabled={!recipientValid || isSelf}
                className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-11"
              >
                Continue
              </Button>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">NFT</span>
                  <span className="font-semibold">{nft.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">To</span>
                  <span className="font-mono text-xs">{recipient.slice(0, 8)}...{recipient.slice(-8)}</span>
                </div>
                {memo && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Message</span>
                    <span>{memo}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
                This action is irreversible. The NFT will be permanently transferred to the recipient.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("input")} className="flex-1 rounded-xl">
                  Back
                </Button>
                <Button onClick={handleTransfer} className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                  Confirm Transfer
                </Button>
              </div>
            </>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
              <p className="text-sm text-slate-600">Submitting transaction...</p>
            </div>
          )}

          {step === "success" && result && (
            <>
              <div className="flex flex-col items-center py-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <p className="text-sm text-slate-600 text-center">
                  NFT transferred to {result.to.slice(0, 8)}...{result.to.slice(-8)}
                </p>
                <p className="text-xs text-slate-400 mt-1 font-mono">{result.txHash}</p>
              </div>
              <Button onClick={handleClose} className="w-full rounded-xl">
                Done
              </Button>
            </>
          )}

          {step === "error" && (
            <>
              <div className="flex flex-col items-center py-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl">
                  Cancel
                </Button>
                <Button onClick={() => setStep("input")} className="flex-1 rounded-xl">
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
