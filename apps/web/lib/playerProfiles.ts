/**
 * Off-chain player profile store backed by localStorage.
 * Maps Stellar address → { displayName, avatarUrl }.
 */

import type { PlayerProfile } from "@/lib/types"

const STORAGE_KEY = "hunty:playerProfiles"

function loadAll(): Record<string, PlayerProfile> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, PlayerProfile>) : {}
  } catch {
    return {}
  }
}

function saveAll(profiles: Record<string, PlayerProfile>): void {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

export function getProfile(address: string): PlayerProfile | undefined {
  return loadAll()[address]
}

export function setProfile(address: string, profile: Partial<PlayerProfile>): void {
  const all = loadAll()
  all[address] = { ...all[address], address, ...profile }
  saveAll(all)
}

export function resolveDisplayName(address: string, fallback: string): string {
  const profile = getProfile(address)
  return profile?.displayName?.trim() || fallback
}
