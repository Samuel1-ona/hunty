import { getHuntById, getHuntCapacity } from '@/lib/huntStore';
import type { WaitlistEntry } from '@/lib/types';

const WAITLIST_STORAGE_KEY = 'hunty_waitlist';

function readWaitlist(): WaitlistEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(WAITLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WaitlistEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWaitlist(waitlist: WaitlistEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(waitlist));
  } catch {
    // ignore
  }
}

export function getWaitlistForHunt(huntId: number): WaitlistEntry[] {
  return readWaitlist()
    .filter((w) => w.huntId === huntId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getWaitlistPosition(huntId: number, playerAddress: string): number | null {
  const waitlist = getWaitlistForHunt(huntId);
  const index = waitlist.findIndex((w) => w.playerAddress === playerAddress);
  return index !== -1 ? index + 1 : null;
}

export function addToWaitlist(
  huntId: number,
  playerAddress: string,
  playerName?: string
): WaitlistEntry {
  const entry: WaitlistEntry = {
    id: crypto.randomUUID(),
    huntId,
    playerAddress,
    playerName,
    timestamp: Date.now(),
    isNotified: false,
  };
  const waitlist = [...readWaitlist(), entry];
  writeWaitlist(waitlist);
  return entry;
}

export function removeFromWaitlist(huntId: number, playerAddress: string): void {
  const waitlist = readWaitlist().filter(
    (w) => !(w.huntId === huntId && w.playerAddress === playerAddress)
  );
  writeWaitlist(waitlist);
}

/** Remove first from waitlist, return entry if there was one */
export function popFromWaitlist(huntId: number): WaitlistEntry | null {
  const waitlist = readWaitlist();
  const huntWaitlist = waitlist
    .filter((w) => w.huntId === huntId)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (huntWaitlist.length === 0) return null;
  const firstEntry = huntWaitlist[0];
  const updatedWaitlist = waitlist.filter((w) => !(w.huntId === huntId && w.id === firstEntry.id));
  writeWaitlist(updatedWaitlist);
  return firstEntry;
}

export function isHuntFull(huntId: number, currentPlayers: number): boolean {
  const hunt = getHuntById(huntId);
  const capacity = getHuntCapacity(hunt);
  if (!hunt || capacity === undefined) return false;
  return currentPlayers >= capacity;
}

export function markWaitlistEntryNotified(entryId: string): void {
  const waitlist = readWaitlist().map((w) => (w.id === entryId ? { ...w, isNotified: true } : w));
  writeWaitlist(waitlist);
}
