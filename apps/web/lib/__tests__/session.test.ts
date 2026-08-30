import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAllSessionData,
  clearStoredSession,
  createSession,
  generateSessionToken,
  getSessionRemainingMs,
  getStoredSession,
  isSessionExpired,
  renewSession,
  type Session,
  SESSION_DURATION_MS,
  SESSION_RENEWAL_THRESHOLD_MS,
  setStoredSession,
  shouldRenewSession,
} from '../session';

const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

describe('session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {});
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn().mockReturnValue('mock-uuid-12345'),
    });
  });

  describe('generateSessionToken', () => {
    it('should use crypto.randomUUID when available', () => {
      const token = generateSessionToken();
      expect(token).toBe('mock-uuid-12345');
      expect(crypto.randomUUID).toHaveBeenCalledOnce();
    });

    it('should fallback when crypto is undefined', () => {
      vi.stubGlobal('crypto', undefined);
      const token = generateSessionToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should fallback when randomUUID is undefined', () => {
      vi.stubGlobal('crypto', {});
      const token = generateSessionToken();
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });

    it('should return unique tokens on successive calls', () => {
      vi.stubGlobal('crypto', undefined);
      const a = generateSessionToken();
      const b = generateSessionToken();
      expect(a).not.toBe(b);
    });
  });

  describe('createSession', () => {
    it('should create a session with the given public key', () => {
      const session = createSession('GABC123...');
      expect(session.publicKey).toBe('GABC123...');
      expect(session.token).toBe('mock-uuid-12345');
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBe(session.createdAt);
      expect(session.expiresAt).toBe(session.createdAt + SESSION_DURATION_MS);
      expect(session.preferences).toEqual({});
    });

    it('should include provided preferences', () => {
      const prefs = { theme: 'dark' as const };
      const session = createSession('GABC123...', prefs);
      expect(session.preferences).toEqual({ theme: 'dark' });
    });

    it('should create a session with empty preferences when none provided', () => {
      const session = createSession('GXYZ789...');
      expect(session.preferences).toEqual({});
    });
  });

  describe('getStoredSession', () => {
    it('should return null when localStorage has no session', () => {
      const session = getStoredSession();
      expect(session).toBeNull();
    });

    it('should return parsed session when valid', () => {
      const validSession: Session = {
        token: 'token-1',
        publicKey: 'GABC123...',
        createdAt: Date.now(),
        lastActivity: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_MS,
        preferences: {},
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(validSession));
      const result = getStoredSession();
      expect(result).toEqual(validSession);
    });

    it('should return null when JSON is invalid', () => {
      localStorageMock.getItem.mockReturnValue('{invalid');
      const result = getStoredSession();
      expect(result).toBeNull();
    });

    it('should return null when token is missing', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ publicKey: 'GABC...', expiresAt: Date.now() + 1000 })
      );
      const result = getStoredSession();
      expect(result).toBeNull();
    });

    it('should return null when publicKey is missing', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ token: 'tok', expiresAt: Date.now() + 1000 })
      );
      const result = getStoredSession();
      expect(result).toBeNull();
    });

    it('should return null when expiresAt is not a number', () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ token: 'tok', publicKey: 'G...', expiresAt: 'never' })
      );
      const result = getStoredSession();
      expect(result).toBeNull();
    });

    it('should return null when window is undefined', () => {
      vi.stubGlobal('window', undefined);
      const result = getStoredSession();
      expect(result).toBeNull();
    });
  });

  describe('setStoredSession', () => {
    it('should store session in localStorage', () => {
      const session: Session = {
        token: 'tok-1',
        publicKey: 'GABC123...',
        createdAt: 1000,
        lastActivity: 1000,
        expiresAt: 1000 + SESSION_DURATION_MS,
        preferences: { theme: 'light' },
      };
      setStoredSession(session);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'hunty-session',
        JSON.stringify(session)
      );
    });

    it('should not throw when window is undefined', () => {
      vi.stubGlobal('window', undefined);
      const session = createSession('GABC...');
      expect(() => setStoredSession(session)).not.toThrow();
    });
  });

  describe('clearStoredSession', () => {
    it('should remove session from localStorage', () => {
      clearStoredSession();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hunty-session');
    });

    it('should not throw when window is undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(() => clearStoredSession()).not.toThrow();
    });
  });

  describe('isSessionExpired', () => {
    it('should return true when session has expired', () => {
      const session = createSession('GABC...');
      const expired = { ...session, expiresAt: Date.now() - 1 };
      expect(isSessionExpired(expired)).toBe(true);
    });

    it('should return false when session is still valid', () => {
      const session = createSession('GABC...');
      const valid = { ...session, expiresAt: Date.now() + SESSION_DURATION_MS };
      expect(isSessionExpired(valid)).toBe(false);
    });

    it('should return false when session expires exactly now', () => {
      const session = createSession('GABC...');
      const now = Date.now();
      const valid = { ...session, expiresAt: now };
      expect(isSessionExpired(valid)).toBe(false);
    });
  });

  describe('shouldRenewSession', () => {
    it('should return true when last activity is beyond threshold', () => {
      const session = createSession('GABC...');
      const old = { ...session, lastActivity: Date.now() - SESSION_RENEWAL_THRESHOLD_MS - 1 };
      expect(shouldRenewSession(old)).toBe(true);
    });

    it('should return false when recently active', () => {
      const session = createSession('GABC...');
      expect(shouldRenewSession(session)).toBe(false);
    });

    it('should return false when last activity is exactly at threshold', () => {
      const session = createSession('GABC...');
      const borderline = { ...session, lastActivity: Date.now() - SESSION_RENEWAL_THRESHOLD_MS };
      expect(shouldRenewSession(borderline)).toBe(false);
    });
  });

  describe('renewSession', () => {
    it('should extend expiresAt by session duration', () => {
      const session = createSession('GABC...');
      const original = {
        ...session,
        lastActivity: Date.now() - SESSION_DURATION_MS,
        expiresAt: Date.now() - 1,
      };
      const renewed = renewSession(original);
      expect(renewed.lastActivity).toBeGreaterThan(original.lastActivity);
      expect(renewed.expiresAt).toBeGreaterThan(original.expiresAt);
      expect(renewed.expiresAt).toBeGreaterThan(Date.now());
      expect(renewed.token).toBe(original.token);
      expect(renewed.publicKey).toBe(original.publicKey);
    });
  });

  describe('getSessionRemainingMs', () => {
    it('should return remaining time for a valid session', () => {
      const session = createSession('GABC...');
      const remaining = getSessionRemainingMs(session);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(SESSION_DURATION_MS);
    });

    it('should return 0 for an expired session', () => {
      const expired = createSession('GABC...');
      const past = { ...expired, expiresAt: Date.now() - 1000 };
      expect(getSessionRemainingMs(past)).toBe(0);
    });
  });

  describe('clearAllSessionData', () => {
    it('should remove all known storage keys', () => {
      clearAllSessionData();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hunty-session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('stellar_wallet_session');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('freighter_public_key');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hunty-wallet');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hunty_hunts');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hunty_clues');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('draft-hunts');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('draft-rewards');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('draft-rewardType');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('theme');
    });

    it('should not throw when window is undefined', () => {
      vi.stubGlobal('window', undefined);
      expect(() => clearAllSessionData()).not.toThrow();
    });
  });
});
