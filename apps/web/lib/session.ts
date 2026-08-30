import { logger } from '@/lib/logger';

const SESSION_STORAGE_KEY = 'hunty-session';
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const SESSION_RENEWAL_THRESHOLD = 60 * 60 * 1000;

const ALL_KNOWN_STORAGE_KEYS: string[] = [
  SESSION_STORAGE_KEY,
  'stellar_wallet_session',
  'freighter_public_key',
  'hunty-wallet',
  'hunty_hunts',
  'hunty_clues',
  'draft-hunts',
  'draft-rewards',
  'draft-rewardType',
  'theme',
];

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
}

export interface Session {
  token: string;
  publicKey: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  preferences: UserPreferences;
}

export function generateSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 18)}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function createSession(publicKey: string, preferences?: UserPreferences): Session {
  const now = Date.now();
  return {
    token: generateSessionToken(),
    publicKey,
    createdAt: now,
    lastActivity: now,
    expiresAt: now + SESSION_DURATION,
    preferences: preferences ?? {},
  };
}

export function getStoredSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.token || !parsed.publicKey || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredSession(session: Session): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    logger.warn('Failed to persist session', err);
  }
}

export function clearStoredSession(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Silently ignore
  }
}

export function isSessionExpired(session: Session): boolean {
  return Date.now() > session.expiresAt;
}

export function shouldRenewSession(session: Session): boolean {
  return Date.now() - session.lastActivity > SESSION_RENEWAL_THRESHOLD;
}

export function renewSession(session: Session): Session {
  const now = Date.now();
  return {
    ...session,
    lastActivity: now,
    expiresAt: now + SESSION_DURATION,
  };
}

export function getSessionRemainingMs(session: Session): number {
  return Math.max(0, session.expiresAt - Date.now());
}

export function clearAllSessionData(): void {
  if (!isBrowser()) return;
  for (const key of ALL_KNOWN_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently continue
    }
  }
}

export const SESSION_DURATION_MS = SESSION_DURATION;
export const SESSION_RENEWAL_THRESHOLD_MS = SESSION_RENEWAL_THRESHOLD;
