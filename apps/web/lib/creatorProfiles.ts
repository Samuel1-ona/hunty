export interface CreatorLink {
  title: string
  url: string
}

export interface CreatorProfile {
  address: string
  bio?: string
  links?: CreatorLink[]
}

const STORAGE_KEY = "hunty:creatorProfiles"

function loadProfiles(): Record<string, CreatorProfile> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, CreatorProfile>) : {}
  } catch {
    return {}
  }
}

export function getCreatorProfile(address: string): CreatorProfile | undefined {
  return loadProfiles()[address]
}

export function setCreatorProfile(address: string, profile: Partial<CreatorProfile>): void {
  const profiles = loadProfiles()
  profiles[address] = { ...profiles[address], ...profile, address }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}