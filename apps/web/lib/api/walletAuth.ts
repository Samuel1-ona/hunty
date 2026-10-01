import { AuthError, ForbiddenError } from "@/lib/api/errors"
import { verifySignedMessage } from "@/lib/signature"

type WalletAuthInput = {
  purpose: string
  challenge?: string
  signature?: string
  claimedAddress?: string
}

/**
 * Require a signed challenge bound to `x-wallet-address` and return
 * the normalized authenticated wallet.
 */
export function requireVerifiedWallet(req: Request, input: WalletAuthInput): string {
  const wallet = req.headers.get("x-wallet-address")?.trim()
  if (!wallet) {
    throw new AuthError("Wallet address required", { header: "x-wallet-address" })
  }

  const challenge = input.challenge?.trim()
  const signature = input.signature?.trim()
  if (!challenge || !signature) {
    throw new AuthError("Signed challenge required", {
      fields: ["challenge", "signature"],
    })
  }

  if (!verifySignedMessage({ address: wallet, challenge, signature, purpose: input.purpose })) {
    throw new AuthError("Invalid signature", { wallet })
  }

  const normalizedWallet = wallet.toLowerCase()
  const claimedAddress = input.claimedAddress?.trim().toLowerCase()
  if (claimedAddress && claimedAddress !== normalizedWallet) {
    throw new ForbiddenError("Authenticated wallet does not match requested actor")
  }

  return normalizedWallet
}
