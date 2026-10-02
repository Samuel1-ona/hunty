/**
 * Admin identity verification for privileged, state-changing API routes.
 *
 * A caller proves who they are in one of two ways:
 *
 *  1. **Signed wallet challenge** — the wallet signs a short-lived challenge that
 *     embeds the caller's own address (see `buildChallenge`), proving control of
 *     that keypair. The proven address is then matched against the
 *     `ADMIN_WALLET_ADDRESSES` allow-list.
 *  2. **Admin API secret** — a shared bearer token (`ADMIN_API_SECRET`) for
 *     server-to-server callers. Fails closed when the secret is not configured.
 *
 * The returned actor is derived *only* from the verified credential, never from
 * a request body field, so a caller cannot act as somebody else by rewriting
 * JSON. Every denial is written to the audit log with a machine-readable reason.
 *
 * Throws `AuthError` (401) when the caller cannot be authenticated at all and
 * `ForbiddenError` (403) when a caller is authenticated but lacks the admin role.
 */

import { randomBytes } from "node:crypto";

import { Keypair } from "@stellar/stellar-sdk";

import { auditLog } from "@/lib/audit";

import { AuthError, ForbiddenError } from "./errors";
import { constantTimeEqual } from "./timingSafeCompare";

/** Keep in sync with `generateChallenge` in `@/lib/signature`. */
const CHALLENGE_PREFIX = "huntly-challenge";

/** Challenges older than this are rejected, bounding the replay window. */
const CHALLENGE_VALIDITY_MS = 5 * 60 * 1000;

/** Tolerance for a challenge issued marginally in the future (clock skew). */
const CHALLENGE_CLOCK_SKEW_MS = 30 * 1000;

/** Actor name used when the caller authenticates with the shared API secret. */
export const ADMIN_API_KEY_ACTOR = "admin-api-key";

/** Credentials accepted by {@link assertAdminIdentity}, surfaced in 401 bodies. */
const ACCEPTED_CREDENTIALS = [
  "x-wallet-address + x-wallet-challenge + x-wallet-signature",
  "Authorization: Bearer <ADMIN_API_SECRET>",
] as const;

export type AdminAuthMethod = "wallet-signature" | "admin-api-secret";

export interface AdminIdentity {
  /** Verified identity of the caller. Safe to persist and to audit. */
  actor: string;
  method: AdminAuthMethod;
}

/**
 * Builds the canonical challenge a wallet must sign for a given purpose.
 * The address and purpose are baked into the message so a signature captured
 * for one action cannot be replayed against another.
 */
export function buildChallenge(
  address: string,
  purpose: string,
  issuedAt: number = Date.now(),
  nonce: string = randomBytes(16).toString("hex")
): string {
  return `${CHALLENGE_PREFIX}:${purpose}:${address.toLowerCase()}:${issuedAt}:${nonce}`;
}

/** True when `address` appears in the `ADMIN_WALLET_ADDRESSES` allow-list. */
export function isAdminWallet(address: string): boolean {
  const configured = process.env.ADMIN_WALLET_ADDRESSES;
  if (!configured) return false;

  const target = address.trim().toLowerCase();
  if (!target) return false;

  return configured
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(target);
}

/**
 * Verifies a signed challenge: well-formed, scoped to `purpose`, bound to
 * `address`, still fresh, and carrying a genuine signature from that keypair.
 */
function verifyChallengeSignature(params: {
  address: string;
  challenge: string;
  signature: string;
  purpose: string;
}): boolean {
  const { address, challenge, signature, purpose } = params;

  const parts = challenge.split(":");
  if (parts.length !== 5 || parts[0] !== CHALLENGE_PREFIX) return false;
  if (parts[1] !== purpose) return false;

  const challengeAddress = parts[2];
  const issuedAt = Number(parts[3]);
  const nonce = parts[4];
  if (!challengeAddress || !nonce || !Number.isFinite(issuedAt)) return false;
  if (challengeAddress.toLowerCase() !== address.trim().toLowerCase()) return false;

  const now = Date.now();
  if (now - issuedAt > CHALLENGE_VALIDITY_MS) return false;
  if (issuedAt > now + CHALLENGE_CLOCK_SKEW_MS) return false;

  try {
    return Keypair.fromPublicKey(address.trim()).verify(
      Buffer.from(challenge, "utf8"),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

function readBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Resolves the admin caller, throwing 401 when unauthenticated and 403 when
 * authenticated without the admin role. Call before performing any write.
 */
export function assertAdminIdentity(req: Request, purpose: string): AdminIdentity {
  const path = new URL(req.url).pathname;

  const bearer = readBearerToken(req);
  const adminSecret = process.env.ADMIN_API_SECRET;
  if (bearer && adminSecret && constantTimeEqual(bearer, adminSecret)) {
    auditLog("admin.auth.granted", { path, method: "admin-api-secret" }, ADMIN_API_KEY_ACTOR);
    return { actor: ADMIN_API_KEY_ACTOR, method: "admin-api-secret" };
  }

  const address = req.headers.get("x-wallet-address")?.trim();
  if (!address) {
    auditLog("admin.auth.denied", { path, reason: "missing_credentials" }, "anonymous");
    throw new AuthError("Admin authentication required", { accepted: [...ACCEPTED_CREDENTIALS] });
  }

  const challenge = req.headers.get("x-wallet-challenge")?.trim();
  const signature = req.headers.get("x-wallet-signature")?.trim();
  if (!challenge || !signature) {
    auditLog("admin.auth.denied", { path, reason: "missing_signature" }, address);
    throw new AuthError("Admin authentication required", {
      required: ["x-wallet-challenge", "x-wallet-signature"],
    });
  }

  if (!verifyChallengeSignature({ address, challenge, signature, purpose })) {
    auditLog("admin.auth.denied", { path, reason: "invalid_signature", purpose }, address);
    throw new AuthError("Invalid wallet signature");
  }

  if (!isAdminWallet(address)) {
    auditLog("admin.auth.denied", { path, reason: "insufficient_role", purpose }, address);
    throw new ForbiddenError("Admin privileges required");
  }

  auditLog("admin.auth.granted", { path, method: "wallet-signature", purpose }, address);
  return { actor: address, method: "wallet-signature" };
}
