import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsConfig, type AnalyticsConfig } from '@config/analytics';

// ───────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────

export type AnalyticsEventName =
  | 'screen_view'
  | 'user_action'
  | 'hunt_started'
  | 'hunt_completed'
  | 'clue_revealed'
  | 'reward_claimed'
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'transaction_signed'
  | 'transaction_failed'
  | 'app_start'
  | 'screen_load'
  | 'api_request'
  | 'api_error'
  | 'push_notification_received'
  | 'push_notification_tapped'
  | 'custom';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  /** Event-specific parameters (no PII) */
  params?: Record<string, string | number | boolean>;
  /** Custom tags merged with default tags */
  tags?: Record<string, string>;
}

export interface ScreenViewEvent extends AnalyticsEvent {
  name: 'screen_view';
  params: {
    screen_name: string;
    screen_class?: string;
    previous_screen?: string;
  };
}

export interface UserActionEvent extends AnalyticsEvent {
  name: 'user_action';
  params: {
    action: string;
    target?: string;
    value?: string | number | boolean;
  };
}

export interface PerformanceEvent extends AnalyticsEvent {
  name: 'app_start' | 'screen_load';
  params: {
    duration_ms: number;
    cold_start?: boolean;
  };
}

// ───────────────────────────────────────────────────────────
// Internal state
// ───────────────────────────────────────────────────────────

const OPT_OUT_KEY = '@hunty/analytics_opt_out';
let _isInitialized = false;
let _isOptedOut = false;

// ───────────────────────────────────────────────────────────
// Initialization
// ───────────────────────────────────────────────────────────

/**
 * Initialize the analytics SDK (Sentry) with privacy-compliant defaults.
 * Must be called once before any tracking methods.
 */
export async function initializeAnalytics(config: Partial<AnalyticsConfig> = {}): Promise<void> {
  if (_isInitialized) return;

  const merged = { ...analyticsConfig, ...config };

  // Respect opt-out before initializing
  _isOptedOut = await getOptOutStatus();
  if (_isOptedOut || !merged.enabled) {
    _isInitialized = true;
    return;
  }

  if (!merged.sentryDsn) {
    console.warn('[Analytics] Sentry DSN not configured. Crash reporting disabled.');
    _isInitialized = true;
    return;
  }

  Sentry.init({
    dsn: merged.sentryDsn,
    environment: merged.environment,
    tracesSampleRate: merged.tracesSampleRate,
    replaysSessionSampleRate: merged.replaysSessionSampleRate,
    attachScreenshot: merged.attachScreenshot,
    beforeSend: (event) => {
      // Privacy scrub: strip any potential PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data && typeof crumb.data === 'object') {
            const scrubbed = { ...crumb.data };
            // Remove known PII fields
            delete scrubbed.password;
            delete scrubbed.token;
            delete scrubbed.secret;
            delete scrubbed.privateKey;
            delete scrubbed.mnemonic;
            delete scrubbed.email;
            delete scrubbed.phone;
            return { ...crumb, data: scrubbed };
          }
          return crumb;
        });
      }
      return event;
    },
    beforeSendTransaction: (transaction) => {
      // Attach default tags to every transaction
      transaction.tags = { ...merged.defaultTags, ...transaction.tags };
      return transaction;
    },
  });

  // Set default context
  Sentry.setTags(merged.defaultTags);

  _isInitialized = true;
}

// ───────────────────────────────────────────────────────────
// Opt-out / Opt-in
// ───────────────────────────────────────────────────────────

/**
 * Check whether the user has opted out of analytics collection.
 */
export async function getOptOutStatus(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(OPT_OUT_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Opt the user out of analytics collection. Persists to AsyncStorage.
 * After calling, the SDK will drop all events.
 */
export async function optOut(): Promise<void> {
  _isOptedOut = true;
  await AsyncStorage.setItem(OPT_OUT_KEY, 'true');
  // Close Sentry client to stop sending
  Sentry.close();
}

/**
 * Opt the user back in. Resumes analytics collection.
 */
export async function optIn(): Promise<void> {
  _isOptedOut = false;
  await AsyncStorage.setItem(OPT_OUT_KEY, 'false');
  // Re-initialize if needed
  if (!_isInitialized) {
    await initializeAnalytics();
  }
}

// ───────────────────────────────────────────────────────────
// Event Tracking
// ───────────────────────────────────────────────────────────

/**
 * Track a generic analytics event.
 * Events are dropped silently if the user has opted out.
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (_isOptedOut || !_isInitialized) return;

  const { name, params = {}, tags = {} } = event;

  // Log to Sentry as a breadcrumb (lightweight)
  Sentry.addBreadcrumb({
    category: 'analytics',
    message: name,
    data: params,
    level: 'info',
  });

  // Also send as a custom Sentry event for dashboard visibility
  Sentry.captureMessage(`analytics:${name}`, {
    level: 'info',
    tags: { ...tags, event_name: name },
    extra: params,
  });
}

/**
 * Track a screen view. Automatically called by the navigation
 * integration if autoScreenTracking is enabled.
 */
export function trackScreenView(screenName: string, previousScreen?: string): void {
  trackEvent({
    name: 'screen_view',
    params: {
      screen_name: screenName,
      previous_screen: previousScreen ?? 'unknown',
    },
  });

  // Also set the current route in Sentry scope for crash context
  Sentry.configureScope((scope) => {
    scope.setTag('current_screen', screenName);
  });
}

/**
 * Track a user action (button tap, form submit, etc.).
 */
export function trackUserAction(
  action: string,
  target?: string,
  value?: string | number | boolean
): void {
  trackEvent({
    name: 'user_action',
    params: { action, target: target ?? 'unknown', value: value ?? 'none' },
  });
}

// ───────────────────────────────────────────────────────────
// Performance Metrics
// ───────────────────────────────────────────────────────────

/**
 * Track app start time. Call at the end of your root layout mount.
 */
export function trackAppStart(durationMs: number, coldStart = true): void {
  trackEvent({
    name: 'app_start',
    params: { duration_ms: Math.round(durationMs), cold_start: coldStart },
  });

  // Also send as a Sentry transaction for performance monitoring
  const transaction = Sentry.startTransaction({
    name: 'app_start',
    op: 'app.lifecycle',
  });
  transaction.setData('duration_ms', durationMs);
  transaction.setData('cold_start', coldStart);
  transaction.finish();
}

/**
 * Track screen load time. Wrap your screen component with this.
 */
export function trackScreenLoad(screenName: string, durationMs: number): void {
  trackEvent({
    name: 'screen_load',
    params: { duration_ms: Math.round(durationMs) },
  });

  const transaction = Sentry.startTransaction({
    name: `screen_load:${screenName}`,
    op: 'ui.load',
  });
  transaction.setData('duration_ms', durationMs);
  transaction.finish();
}

/**
 * Start a manual performance span. Use `finish()` on the returned span.
 */
export function startPerformanceSpan(
  operation: string,
  description: string
): ReturnType<typeof Sentry.startTransaction> {
  return Sentry.startTransaction({ name: description, op: operation });
}

// ───────────────────────────────────────────────────────────
// Crash Reporting
// ───────────────────────────────────────────────────────────

/**
 * Report a caught error to Sentry. Use inside try/catch blocks.
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  if (_isOptedOut || !_isInitialized) return;

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Set user context (wallet address only — no PII).
 * Pass `null` to clear.
 */
export function setUserContext(walletAddress?: string | null): void {
  if (_isOptedOut || !_isInitialized) return;

  if (walletAddress) {
    Sentry.setUser({ id: walletAddress, wallet_address: walletAddress });
  } else {
    Sentry.setUser(null);
  }
}

// ───────────────────────────────────────────────────────────
// Navigation Integration (Expo Router)
// ───────────────────────────────────────────────────────────

let _lastScreen: string | undefined;

/**
 * Call this from your root layout's navigation state listener
 * to enable automatic screen view tracking.
 */
export function onNavigationStateChange(currentRouteName: string | undefined): void {
  if (!currentRouteName || !_isInitialized || _isOptedOut) return;
  if (currentRouteName === _lastScreen) return;

  trackScreenView(currentRouteName, _lastScreen);
  _lastScreen = currentRouteName;
}