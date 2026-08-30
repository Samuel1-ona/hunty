'use client';

import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useIsMounted } from '@/hooks/useIsMounted';
import { useWallet } from '@/lib/context/WalletContext';
import { logger } from '@/lib/logger';
import {
  clearAllSessionData,
  clearStoredSession,
  createSession,
  getSessionRemainingMs,
  getStoredSession,
  isSessionExpired,
  renewSession,
  type Session,
  setStoredSession,
  shouldRenewSession,
  type UserPreferences,
} from '@/lib/session';

interface SessionContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  remainingMs: number;
  preferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  renew: () => void;
  clear: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'focus'];

const EXPIRY_CHECK_INTERVAL = 60_000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const mounted = useIsMounted();
  const { connected, publicKey, disconnect } = useWallet();
  const [session, setSession] = useState<Session | null>(null);
  const walletPublicKeyRef = useRef(publicKey);

  useEffect(() => {
    walletPublicKeyRef.current = publicKey;
  }, [publicKey]);

  useEffect(() => {
    if (!mounted) return;

    const saved = getStoredSession();
    if (saved) {
      if (isSessionExpired(saved)) {
        logger.info('Session expired on restore');
        clearStoredSession();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(null);
      } else {
        if (shouldRenewSession(saved)) {
          const renewed = renewSession(saved);
          setStoredSession(renewed);
          setSession(renewed);
        } else {
          setSession(saved);
        }
      }
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!connected || !publicKey) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession((prev) => {
      if (prev?.publicKey === publicKey) {
        if (isSessionExpired(prev)) {
          clearStoredSession();
          return null;
        }
        if (shouldRenewSession(prev)) {
          const renewed = renewSession(prev);
          setStoredSession(renewed);
          return renewed;
        }
        return prev;
      }
      const newSession = createSession(publicKey);
      setStoredSession(newSession);
      return newSession;
    });
  }, [mounted, connected, publicKey]);

  useEffect(() => {
    if (!mounted) return;
    if (connected) return;
    if (session) {
      clearStoredSession();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(null);
    }
  }, [mounted, connected, session]);

  useEffect(() => {
    if (!mounted) return;
    if (!session) return;

    const handleActivity = () => {
      setSession((prev) => {
        if (!prev) return prev;
        const currentKey = walletPublicKeyRef.current;
        if (!currentKey) return prev;
        if (isSessionExpired(prev)) {
          clearStoredSession();
          return null;
        }
        if (shouldRenewSession(prev)) {
          const renewed = renewSession(prev);
          setStoredSession(renewed);
          return renewed;
        }
        return prev;
      });
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    const interval = setInterval(() => {
      setSession((prev) => {
        if (!prev) return prev;
        if (isSessionExpired(prev)) {
          logger.info('Session expired');
          clearStoredSession();
          return null;
        }
        return prev;
      });
    }, EXPIRY_CHECK_INTERVAL);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      clearInterval(interval);
    };
  }, [mounted, session]);

  const isAuth = mounted && connected && session !== null && !isSessionExpired(session);

  const updatePreferences = useCallback((prefs: Partial<UserPreferences>) => {
    setSession((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        preferences: { ...prev.preferences, ...prefs },
      };
      setStoredSession(updated);
      return updated;
    });
  }, []);

  const renew = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev;
      const renewed = renewSession(prev);
      setStoredSession(renewed);
      return renewed;
    });
  }, []);

  const clear = useCallback(() => {
    clearAllSessionData();
    setSession(null);
    disconnect();
  }, [disconnect]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isAuthenticated: isAuth,
      isExpired: session ? isSessionExpired(session) : false,
      remainingMs: session ? getSessionRemainingMs(session) : 0,
      preferences: session?.preferences ?? {},
      updatePreferences,
      renew,
      clear,
    }),
    [session, isAuth, updatePreferences, renew, clear]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (ctx == null) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
