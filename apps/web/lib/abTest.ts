import { sha256Hex } from "./crypto"

/**
 * Deterministically assigns a player (wallet) to variant 'A' or 'B' for a
 * specific clue. Uses SHA-256(wallet_hunt_clue) hex digest and picks parity.
 */
export async function getVariantForPlayer(
  wallet: string,
  huntId: number,
  clueId: number,
): Promise<"A" | "B"> {
  const digest = await sha256Hex(`${wallet}_${huntId}_${clueId}`)
  const last = digest.slice(-1)
  const v = parseInt(last, 16) % 2 === 0 ? "A" : "B"
  return v
}

export function deterministicVariantFromHex(hex: string): "A" | "B" {
  const last = hex.slice(-1)
  return parseInt(last, 16) % 2 === 0 ? "A" : "B"
}
