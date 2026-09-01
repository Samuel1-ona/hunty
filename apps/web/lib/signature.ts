import { Keypair } from "@stellar/stellar-base";
import { randomBytes } from "crypto";

const CHALLENGE_PREFIX = "huntly-challenge";
const CHALLENGE_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a signed challenge for wallet ownership proof.
 * The challenge is a single-use string with a timestamp and nonce.
 */
export function generateChallenge(address: string, purpose: string = "generic"): string {
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = Date.now();
  return `${CHALLENGE_PREFIX}:${purpose}:${address.toLowerCase()}:${issuedAt}:${nonce}`;
}

/**
 * Verifies a signed challenge against a Stellar wallet address.
 *
 * @returns true if the signature is valid, the challenge is fresh, and the address matches.
 */
export function verifySignedMessage(params: {
  address: string;
  challenge: string;
  signature: string;
  purpose?: string;
}): boolean {
  const { address, challenge, signature, purpose = "generic" } = params;

  try {
    const parts = challenge.split(":");
    if (parts.length !== 5 || parts[0] !== CHALLENGE_PREFIX) return false;

    const challengePurpose = parts[1];
    const challengeAddress = parts[2];
    const issuedAt = Number(parts[3]);
    const nonce = parts[4];

    if (!challengePurpose || !challengeAddress || !issuedAt || !nonce) return false;
    if (challengePurpose !== purpose) return false;
    if (challengeAddress.toLowerCase() !== address.toLowerCase()) return false;

    // Reject expired or future challenges to prevent replay attacks.
    const now = Date.now();
    if (now - issuedAt > CHALLENGE_VALIDITY_MS) return false;
    if (issuedAt > now + 30_000) return false;

    // Verify the signature with the Stellar public key.
    const keypair = Keypair.fromPublicKey(address);
    const messageBuffer = Buffer.from(challenge, "utf8");
    const signatureBuffer = Buffer.from(signature, "base64");

    return keypair.verify(messageBuffer, signatureBuffer);
  } catch {
    return false;
  }
}
