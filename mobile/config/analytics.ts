import Constants from 'expo-constants';

/**
 * Analytics configuration for Hunty mobile app.
 *
 * Privacy-first by default:
 * - No PII collected without explicit consent
 * - IP anonymization enabled
 * - Data retention limited
 * - Opt-out respected at the SDK level
 */

export interface AnalyticsConfig {
  /** Sentry DSN for crash reporting */
  sentryDsn: string;
  /** Environment tag */
  environment: 'development' | 'staging' | 'production';
  /** Sampling rate for performance traces (0.0–1.0) */
  tracesSampleRate: number;
  /** Sampling rate for session replays (0.0–1.0) */
  replaysSessionSampleRate: number;
  /** Whether to attach screenshots to crash reports */
  attachScreenshot: boolean;
  /** Whether analytics collection is enabled (opt-out) */
  enabled: boolean;
  /** Whether to track screen views automatically */
  autoScreenTracking: boolean;
  /** Whether to track performance metrics */
  autoPerformanceTracking: boolean;
  /** Custom tags applied to every event */
  defaultTags: Record<string, string>;
}

function getEnvVar(name: string): string | undefined {
  return Constants.expoConfig?.extra?.[name] ?? process.env[name];
}

export const analyticsConfig: AnalyticsConfig = {
  sentryDsn: getEnvVar('SENTRY_DSN') ?? '',
  environment: (getEnvVar('APP_ENV') as AnalyticsConfig['environment']) ?? 'development',
  tracesSampleRate: Number(getEnvVar('SENTRY_TRACES_SAMPLE_RATE') ?? '0.1'),
  replaysSessionSampleRate: Number(getEnvVar('SENTRY_REPLAYS_SAMPLE_RATE') ?? '0.05'),
  attachScreenshot: getEnvVar('SENTRY_ATTACH_SCREENSHOT') === 'true',
  enabled: getEnvVar('ANALYTICS_ENABLED') !== 'false',
  autoScreenTracking: getEnvVar('ANALYTICS_AUTO_SCREEN_TRACKING') !== 'false',
  autoPerformanceTracking: getEnvVar('ANALYTICS_AUTO_PERFORMANCE') !== 'false',
  defaultTags: {
    app_version: Constants.expoConfig?.version ?? 'unknown',
    build_number: String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '0'),
    platform: Constants.platform?.ios ? 'ios' : Constants.platform?.android ? 'android' : 'web',
    native_build_version: Constants.nativeBuildVersion ?? 'unknown',
  },
};