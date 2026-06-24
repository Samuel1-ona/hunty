import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'expo-router';
import {
  initializeAnalytics,
  trackEvent,
  trackScreenView,
  trackUserAction,
  trackAppStart,
  trackScreenLoad,
  reportError,
  setUserContext,
  getOptOutStatus,
  optIn,
  optOut,
  onNavigationStateChange,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from '@services/analytics';
import { useWalletStore } from '@store/useStore';

// ───────────────────────────────────────────────────────────
// Context
// ───────────────────────────────────────────────────────────

interface AnalyticsContextValue {
  /** Whether analytics is initialized and active */
  isReady: boolean;
  /** Whether the user has opted out */
  isOptedOut: boolean;
  /** Track any analytics event */
  track: (event: AnalyticsEvent) => void;
  /** Track a screen view manually */
  trackScreen: (screenName: string, previousScreen?: string) => void;
  /** Track a user action */
  trackAction: (action: string, target?: string, value?: string | number | boolean) => void;
  /** Report a caught error */
  report: (error: Error, context?: Record<string, unknown>) => void;
  /** Opt out of analytics */
  disableAnalytics: () => Promise<void>;
  /** Opt back in */
  enableAnalytics: () => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return ctx;
}

// ───────────────────────────────────────────────────────────
// Provider
// ───────────────────────────────────────────────────────────

interface AnalyticsProviderProps {
  children: React.ReactNode;
  /** App start timestamp (from root layout mount) */
  appStartTime?: number;
}

export function AnalyticsProvider({ children, appStartTime }: AnalyticsProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isOptedOut, setIsOptedOut] = useState(false);
  const pathname = usePathname();
  const { address } = useWalletStore();

  // Initialize analytics on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      const optedOut = await getOptOutStatus();
      if (mounted) setIsOptedOut(optedOut);

      await initializeAnalytics();
      if (mounted) setIsReady(true);

      // Track app start if timestamp provided
      if (appStartTime) {
        const duration = Date.now() - appStartTime;
        trackAppStart(duration, true);
      }
    }

    void init();
    return () => { mounted = false; };
  }, [appStartTime]);

  // Auto-track screen views via Expo Router pathname
  useEffect(() => {
    if (pathname && isReady) {
      onNavigationStateChange(pathname);
    }
  }, [pathname, isReady]);

  // Sync wallet address as user context (no PII)
  useEffect(() => {
    if (isReady) {
      setUserContext(address ?? null);
    }
  }, [address, isReady]);

  const track = useCallback((event: AnalyticsEvent) => {
    trackEvent(event);
  }, []);

  const trackScreen = useCallback((screenName: string, previousScreen?: string) => {
    trackScreenView(screenName, previousScreen);
  }, []);

  const trackAction = useCallback(
    (action: string, target?: string, value?: string | number | boolean) => {
      trackUserAction(action, target, value);
    },
    []
  );

  const report = useCallback((error: Error, context?: Record<string, unknown>) => {
    reportError(error, context);
  }, []);

  const disableAnalytics = useCallback(async () => {
    await optOut();
    setIsOptedOut(true);
  }, []);

  const enableAnalytics = useCallback(async () => {
    await optIn();
    setIsOptedOut(false);
  }, []);

  const value: AnalyticsContextValue = {
    isReady,
    isOptedOut,
    track,
    trackScreen,
    trackAction,
    report,
    disableAnalytics,
    enableAnalytics,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}