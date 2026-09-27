"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle, X, Loader2 } from "lucide-react"
import type { StoredHunt } from "@/lib/types"
import Server, { TransactionBuilder, Networks, Operation, Account } from "@stellar/stellar-sdk"
import { withSorobanRpcRetry } from "@/lib/soroban/rpcRetry"
import { logger } from "@/lib/logger"

async function cancelHuntOnChain(huntId: number): Promise<{ txHash: string }> {
    if (typeof window === "undefined") throw new Error("Browser environment required")

    const RPC =
        process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
        "https://rpc.testnet.soroban.stellar.org"
    const server = new Server(RPC)

    const win = window as Window & {
        freighter?: unknown
        soroban?: unknown
        sorobanWallet?: unknown
    }
    const wallet = win.freighter ?? win.soroban ?? win.sorobanWallet
    if (!wallet) {
        throw new Error(
            "No Soroban-compatible wallet detected (install Freighter or Soroban Wallet)."
        )
    }

    const w = wallet as {
        getPublicKey?: () => Promise<string>
        request?: (arg: { method: string }) => Promise<string>
    }

    let publicKey: string | undefined
    if (w.getPublicKey) {
        publicKey = await w.getPublicKey()
    } else if (typeof w.request === "function") {
        try {
            publicKey = await w.request({ method: "getPublicKey" })
        } catch {
            // ignore, publicKey remains undefined and error is thrown below
        }
    }

    if (!publicKey) {
        throw new Error(
            "Unable to obtain public key from wallet; ensure you are connected."
        )
    }

    const account = (await withSorobanRpcRetry(() => server.getAccount(publicKey))) as Account
    const payload = JSON.stringify({ action: "cancel_hunt", hunt_id: huntId })
    const key = `cancel_hunt:${Date.now()}`
    const op = Operation.manageData({ name: key, value: payload })

    const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
    })
        .addOperation(op)
        .setTimeout(180)
        .build()

    const sw = wallet as {
        signTransaction?: (xdr: string) => Promise<string>
        request?: (arg: {
            method: string
            params?: { tx: string }
        }) => Promise<string>
    }

    let signedXdr: string | undefined
    if (sw.signTransaction) {
        signedXdr = await sw.signTransaction(tx.toXDR())
    } else if (typeof sw.request === "function") {
        try {
            signedXdr = await sw.request({
                method: "signTransaction",
                params: { tx: tx.toXDR() },
            })
        } catch (err) {
            logger.error(err)
        }
    }

    if (!signedXdr) {
        throw new Error(
            "Wallet does not support signing via the detected API; please use Freighter or Soroban Wallet."
        )
    }

    const res = (await withSorobanRpcRetry(() => server.submitTransaction(signedXdr))) as {
        hash?: string
    }
    if (!res?.hash) throw new Error("Transaction submission failed")
    return { txHash: res.hash }
}

interface HuntControlsProps {
    hunt: StoredHunt
    connectedPublicKey?: string
    onCancelled?: (huntId: number, txHash: string) => void
}

/** Returns true for statuses that can still be cancelled. */
function isCancellable(status: StoredHunt["status"]): boolean {
    return status === "Draft" || status === "Active"
}

/** Returns true when the connected wallet is the hunt creator. */
function isCreator(
    hunt: StoredHunt,
    connectedPublicKey?: string
): boolean {
    if (!connectedPublicKey) return false
    const h = hunt as StoredHunt & { creator?: string };
    if (!h.creator) return true
    return h.creator === connectedPublicKey
}

interface CancelModalProps {
    isOpen: boolean
    huntTitle: string
    huntId: number
    isCancelling: boolean
    onClose: () => void
    onConfirmFirst: () => void   // step 1 → move to step 2
    onConfirmFinal: () => void   // step 2 → actually cancel
    step: 1 | 2
}

function CancelModal({
    isOpen,
    huntTitle,
    huntId,
    isCancelling,
    onClose,
    onConfirmFirst,
    onConfirmFinal,
    step,
}: CancelModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton
                className="sm:max-w-md rounded-2xl border border-red-900/30 bg-[#110e0e] text-white"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-red-400">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        {step === 1 ? "Cancel Hunt?" : "Are you absolutely sure?"}
                    </DialogTitle>
                </DialogHeader>

                {step === 1 ? (
                    <div className="space-y-4">
                        <p className="text-zinc-300 text-sm leading-relaxed">
                            You are about to cancel{" "}
                            <span className="font-semibold text-white">&quot;{huntTitle}&quot;</span>.
                            This will remove it from the active hunts list and cannot be undone.
                        </p>
                        <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
                            <li>Active players will be kicked out immediately.</li>
                            <li>Rewards (if any) will not be distributed.</li>
                            <li>The hunt status will be permanently set to Cancelled.</li>
                        </ul>
                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="border-white/10 text-zinc-300 hover:bg-white/5"
                            >
                                Keep Hunt
                            </Button>
                            <Button
                                onClick={onConfirmFirst}
                                className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                            >
                                Yes, Cancel It
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-xl bg-red-950/40 border border-red-800/40 px-4 py-3 text-sm text-red-300 leading-relaxed">
                            <span className="font-bold text-red-400 uppercase tracking-wider text-xs block mb-1">
                                Final Warning
                            </span>
                            This action will call{" "}
                            <code className="bg-red-900/50 px-1 rounded text-red-200 text-xs">
                                cancel_hunt({huntId})
                            </code>{" "}
                            on the Soroban contract. Once submitted to the blockchain it{" "}
                            <span className="font-semibold text-white">cannot be reversed</span>.
                        </div>
                        <div className="flex justify-end gap-3 pt-1">
                            <Button
                                variant="outline"
                                onClick={onClose}
                                disabled={isCancelling}
                                className="border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                            >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Abort
                            </Button>
                            <Button
                                onClick={onConfirmFinal}
                                disabled={isCancelling}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold disabled:opacity-50 min-w-[140px]"
                            >
                                {isCancelling ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Cancelling…
                                    </>
                                ) : (
                                    "Confirm Cancel"
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

export function HuntControls({
    hunt,
    connectedPublicKey,
    onCancelled,
}: HuntControlsProps) {
    const [modalOpen, setModalOpen] = useState(false)
    const [step, setStep] = useState<1 | 2>(1)
    const [isCancelling, setIsCancelling] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null)

    // Gate: only the creator sees this, and only for cancellable statuses
    if (!isCreator(hunt, connectedPublicKey) || !isCancellable(hunt.status)) {
        return null
    }

    const openModal = () => {
        setStep(1)
        setError(null)
        setModalOpen(true)
    }

    const closeModal = () => {
        if (isCancelling) return
        setModalOpen(false)
        setStep(1)
        setError(null)
    }

    const handleConfirmFirst = () => {
        setStep(2)
    }

    const handleConfirmFinal = async () => {
        setIsCancelling(true)
        setError(null)
        try {
            const { txHash } = await cancelHuntOnChain(hunt.id)
            setModalOpen(false)
            onCancelled?.(hunt.id, txHash)
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Cancellation failed. Please try again."
            )
        } finally {
            setIsCancelling(false)
        }
    }

    return (
        <>
            <Button
                onClick={openModal}
                variant="outline"
                className="border-red-800/50 text-red-400 hover:bg-red-950/60 hover:text-red-300 hover:border-red-600/70 active:scale-95 transition-all duration-150 font-semibold"
            >
                <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                Cancel Hunt
            </Button>

            <CancelModal
                isOpen={modalOpen}
                huntTitle={hunt.title}
                huntId={hunt.id}
                isCancelling={isCancelling}
                onClose={closeModal}
                onConfirmFirst={handleConfirmFirst}
                onConfirmFinal={handleConfirmFinal}
                step={step}
            />
        </>
    )
}
