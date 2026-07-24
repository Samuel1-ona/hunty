import { toast } from "sonner"
import { mapContractError } from "@/lib/contracts/errors"
import { announceSr } from "@/components/SrAnnouncer"

// ─── Stage type ───────────────────────────────────────────────────────────────

/**
 * The lifecycle stages of a blockchain transaction shown to the user.
 *
 *   pending   → wallet popup is about to open / we are waiting for the user
 *   approving → user is reviewing the transaction inside the wallet
 *   confirmed → transaction landed on-chain
 *   failed    → transaction rejected or errored
 */
export type TxStage = "pending" | "approving" | "confirmed" | "failed"

/** Call this inside your transaction function to advance the visible stage. */
export type SetStageFn = (stage: Extract<TxStage, "pending" | "approving">) => void

// ─── Message config ───────────────────────────────────────────────────────────

export type TxToastMessages = {
  /** Shown immediately — "Pending" state. Default: "Waiting for wallet…" */
  pending?: string
  /** Shown after setStage("approving") — wallet popup is open. Default: "Approve in your wallet…" */
  approving?: string
  /** Shown on success — "Confirmed" state. Default: "Transaction confirmed!" */
  confirmed?: string
}

const DEFAULTS: Required<TxToastMessages> = {
  pending:   "Pending — waiting for wallet…",
  approving: "Approving — sign in your wallet…",
  confirmed: "Confirmed!",
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Wraps a blockchain write operation in a three-stage sonner toast lifecycle:
 *
 *   1. **Pending**   — shown immediately before the wallet popup opens.
 *   2. **Approving** — call `setStage("approving")` inside `fn` to trigger this.
 *   3. **Confirmed** — shown automatically when the promise resolves.
 *   4. **Failed**    — wallet rejection shows a yellow warning; all other errors
 *                      show a red error toast with a human-readable message.
 *
 * The loading toast is always resolved (via its id) on both success and failure,
 * so the UI never hangs in a loading state.
 *
 * Usage:
 * ```ts
 * await withTransactionToast(
 *   async (setStage) => {
 *     setStage("approving")          // right before the wallet call
 *     return await contract.doThing()
 *   },
 *   { confirmed: "Hunt activated!" }
 * )
 * ```
 *
 * Existing zero-arg callers `() => contract.call()` continue to work — they
 * will show Pending → Confirmed without an explicit Approving transition.
 */
export async function withTransactionToast<T>(
  fn: (setStage: SetStageFn) => Promise<T>,
  messages: TxToastMessages = {}
): Promise<T> {
  const msgs: Required<TxToastMessages> = { ...DEFAULTS, ...messages }

  // Stage 1 — Pending
  announceSr(msgs.pending)
  const toastId = toast.loading(msgs.pending)

  const setStage: SetStageFn = (stage) => {
    if (stage === "approving") {
      announceSr(msgs.approving)
      // Update the same toast in-place so it doesn't flicker
      toast.loading(msgs.approving, { id: toastId })
    }
  }

  try {
    const result = await fn(setStage)

    // Stage 3 — Confirmed
    announceSr(msgs.confirmed)
    toast.success(msgs.confirmed, { id: toastId })

    return result
  } catch (err) {
    const mapped = mapContractError(err)

    if (mapped.isUserRejection) {
      // Yellow warning — user intentionally cancelled, not an error.
      announceSr("Transaction cancelled")
      toast.warning(mapped.message, { id: toastId })
    } else {
      announceSr("Failed: " + mapped.message)
      toast.error(mapped.message, { id: toastId })
    }

    // Re-throw so callers can run their own cleanup (e.g. reset isPublishing).
    throw err
  }
}
