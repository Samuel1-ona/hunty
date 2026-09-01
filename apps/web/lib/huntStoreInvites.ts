import type { HuntInvite, StoredHunt } from "./huntStoreCore";
import {
  DEFAULT_HUNT_INVITE_TTL_MS,
  createInviteUuid,
  readHunts,
  writeHunts,
  type HuntInviteValidation,
} from "./huntStoreCore";
import { getHuntById } from "./huntStoreQueries";

export function generateHuntInvite(huntId: number, ttlMs = DEFAULT_HUNT_INVITE_TTL_MS): HuntInvite {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0)
    throw new Error("Invite expiration must be greater than 0.");
  const hunts = readHunts();
  const hunt = hunts.find((candidate) => candidate.id === huntId);
  if (!hunt) throw new Error("Hunt not found.");
  if (!hunt.is_private) throw new Error("Invite links can only be generated for private hunts.");
  const createdAt = Date.now();
  const invite: HuntInvite = { token: createInviteUuid(), createdAt, expiresAt: createdAt + ttlMs };
  writeHunts(
    hunts.map((candidate) => (candidate.id === huntId ? { ...candidate, invite } : candidate))
  );
  return invite;
}

export function revokeHuntInvite(huntId: number): boolean {
  const hunts = readHunts();
  const hunt = hunts.find((candidate) => candidate.id === huntId);
  if (!hunt?.invite) return false;
  writeHunts(
    hunts.map((candidate) => {
      if (candidate.id !== huntId) return candidate;
      const withoutInvite = { ...candidate };
      delete withoutInvite.invite;
      return withoutInvite;
    })
  );
  return true;
}

export function validateHuntInvite(
  hunt: StoredHunt | undefined,
  suppliedToken: string | null | undefined,
  now = Date.now()
): HuntInviteValidation {
  if (!hunt) return { isValid: false, reason: "invalid" };
  if (!hunt.is_private) return { isValid: true, reason: "public" };
  if (!suppliedToken) return { isValid: false, reason: "required" };
  if (!hunt.invite || suppliedToken !== hunt.invite.token)
    return { isValid: false, reason: "invalid" };
  if (!Number.isFinite(hunt.invite.expiresAt) || hunt.invite.expiresAt <= now) {
    return { isValid: false, reason: "expired" };
  }
  return { isValid: true, reason: "valid" };
}

export function validateHuntInviteToken(
  huntId: number,
  suppliedToken: string | null | undefined,
  now = Date.now()
): HuntInviteValidation {
  return validateHuntInvite(getHuntById(huntId), suppliedToken, now);
}

export function buildHuntInviteUrl(huntId: number, token: string, baseUrl?: string): string {
  const origin =
    baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : undefined) ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    "https://hunty.app";
  return `${origin.replace(/\/$/, "")}/hunt/${huntId}?invite=${encodeURIComponent(token)}`;
}
