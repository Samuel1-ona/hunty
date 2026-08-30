/**
 * Environment Variable Validation
 *
 * Validates all environment variables at startup using Zod.
 * The module is split into two schemas:
 *
 *  - serverEnv  — server-side only variables (never sent to the browser).
 *                 Accessing these in client components will throw at runtime.
 *  - clientEnv  — NEXT_PUBLIC_* variables that are safe to expose to the browser.
 *
 * Import the pre-validated exports rather than reading process.env directly:
 *
 *   import { serverEnv } from '@/lib/env'   // server components / API routes
 *   import { clientEnv } from '@/lib/env'   // client components
 *
 * If a required variable is missing or invalid, the process will throw a
 * descriptive error at startup (fail-fast), preventing silent misconfiguration.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Accept "true" / "false" strings and coerce to boolean. */
const booleanString = z
  .string()
  .toLowerCase()
  .transform((v) => v === 'true')
  .pipe(z.boolean())
  .optional();

/** Accept a numeric string and coerce to number. */
const numberString = (min?: number) => {
  let schema = z.coerce.number();
  if (min !== undefined) schema = schema.min(min);
  return schema.optional();
};

// ---------------------------------------------------------------------------
// Server-side schema  (private — never exposed to the browser)
// ---------------------------------------------------------------------------

const serverSchema = z.object({
  /** PostgreSQL connection string */
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .url('DATABASE_URL must be a valid URL'),

  /** Pinata JWT for IPFS uploads */
  PINATA_JWT: z.string().min(1, 'PINATA_JWT is required'),

  /** Resend API key for transactional email */
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  // -- Paymaster --
  /**
   * Secret seed for the Stellar keypair that signs fee-bump transactions.
   * Generate with: node -e "const {Keypair}=require('@stellar/stellar-sdk'); console.log(Keypair.random().secret())"
   * The corresponding public key should be set as NEXT_PUBLIC_PAYMASTER_PUBLIC_KEY.
   * Fund the account on testnet via https://laboratory.stellar.org/#account-creator?network=testnet
   */
  PAYMASTER_SECRET: z.string().min(1, 'PAYMASTER_SECRET is required'),

  // -- Web Push (VAPID) --
  VAPID_PUBLIC_KEY: z.string().min(1, 'VAPID_PUBLIC_KEY is required'),
  VAPID_PRIVATE_KEY: z.string().min(1, 'VAPID_PRIVATE_KEY is required'),
  VAPID_SUBJECT: z.string().min(1, 'VAPID_SUBJECT is required'),
  /** Optional secret that protects /api/push/send */
  PUSH_API_SECRET: z.string().optional(),

  // -- Sentry (server-side source map upload) --
  /** Auth token for uploading source maps. Never expose to the browser. */
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),

  /** Bearer token protecting /api/admin/* routes */
  ADMIN_API_SECRET: z.string().optional(),

  // -- Deep-linking --
  APPLE_TEAM_ID: z.string().optional(),
  IOS_BUNDLE_ID: z.string().optional(),
  ANDROID_SHA256_CERT_FINGERPRINTS: z.string().optional(),
  ANDROID_PACKAGE_NAME: z.string().optional(),

  // -- Rate limiting (all optional; defaults defined in lib/config/constants.ts) --
  RATE_LIMIT_WINDOW_MS: numberString(0),
  RATE_LIMIT_READ_IP: numberString(0),
  RATE_LIMIT_WRITE_IP: numberString(0),
  RATE_LIMIT_READ_WALLET: numberString(0),
  RATE_LIMIT_WRITE_WALLET: numberString(0),
  RATE_LIMIT_ADMIN_IP: numberString(0),

  // -- Alert channels --
  ALERT_EMAIL_ENABLED: booleanString,
  ALERT_EMAIL_TO: z.string().email().optional(),
  ALERT_EMAIL_FROM: z.string().email().optional(),
  ALERT_SLACK_ENABLED: booleanString,
  ALERT_SLACK_WEBHOOK_URL: z.string().url().optional(),
  ALERT_DISCORD_ENABLED: booleanString,
  ALERT_DISCORD_WEBHOOK_URL: z.string().url().optional(),

  // -- Monitoring --
  MONITORING_ENABLED: booleanString,
  SLOW_QUERY_THRESHOLD_MS: numberString(0),
  WEB_VITALS_ENDPOINT: z.string().url().optional(),
  WEB_VITALS_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),

  // -- Hunt analytics (optional external sink) --
  HUNT_VIEW_ANALYTICS_ENDPOINT: z.string().url().optional(),
  HUNT_VIEW_ANALYTICS_KEY: z.string().optional(),
  HUNT_VIEW_ANALYTICS_SECRET: z.string().optional(),

  /** Node runtime environment (set automatically by Next.js) */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

// ---------------------------------------------------------------------------
// Client-side schema  (NEXT_PUBLIC_* — safe to expose to the browser)
// ---------------------------------------------------------------------------

const clientSchema = z.object({
  /** Deployment environment: development | staging | production */
  NEXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'staging', 'production']).default('development'),

  /** Public-facing base URL */
  NEXT_PUBLIC_BASE_URL: z.string().url('NEXT_PUBLIC_BASE_URL must be a valid URL').optional(),

  /** Internal API base URL */
  NEXT_PUBLIC_API_URL: z.string().url().optional(),

  /** GraphQL indexer URL */
  NEXT_PUBLIC_GRAPHQL_URL: z.string().url().optional(),

  // -- Stellar / Soroban --
  NEXT_PUBLIC_SOROBAN_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SOROBAN_FALLBACK_RPC_URL: z.string().url().optional(),
  NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: z.string().optional(),
  NEXT_PUBLIC_SOROBAN_NETWORK_TYPE: z.enum(['testnet', 'mainnet']).default('testnet'),
  NEXT_PUBLIC_SOROBAN_DEBOUNCE_MS: numberString(0),
  NEXT_PUBLIC_SOROBAN_READ_TTL_MS: numberString(0),
  NEXT_PUBLIC_HORIZON_URL: z.string().url().optional(),

  // -- Smart contract addresses --
  NEXT_PUBLIC_HUNTY_CORE_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_REWARD_MANAGER_ADDRESS: z.string().optional(),
  NEXT_PUBLIC_NFT_REWARD_ADDRESS: z.string().optional(),

  // -- Paymaster --
  /** Public G-address of the paymaster keypair. Shown in UIs and explorer links. */
  NEXT_PUBLIC_PAYMASTER_PUBLIC_KEY: z.string().optional(),

  // -- WalletConnect --
  NEXT_PUBLIC_WC_PROJECT_ID: z.string().optional(),

  // -- Sentry (public DSN is safe in the browser) --
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // -- VAPID public key (required for push notifications in browser) --
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  // -- Pinata public gateway (optional CDN) --
  NEXT_PUBLIC_PINATA_GATEWAY: z.string().optional(),

  // -- Feature flags --
  NEXT_PUBLIC_ENABLE_STAGING_BANNER: booleanString,
  NEXT_PUBLIC_FEATURE_NFT_MARKETPLACE: booleanString,
  NEXT_PUBLIC_FEATURE_HUNT_CHAT: booleanString,
  NEXT_PUBLIC_FEATURE_SEASONAL: booleanString,
  NEXT_PUBLIC_FEATURE_DRAG_DROP: booleanString,
  NEXT_PUBLIC_FEATURE_ADVANCED_REWARDS: booleanString,
  NEXT_PUBLIC_FEATURE_GAME_MODES: booleanString,
  NEXT_PUBLIC_FEATURE_COLLABORATIVE_HUNTS: booleanString,

  // -- App version / vitals --
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Validation & export
// ---------------------------------------------------------------------------

/**
 * Validates an env schema against the given raw object and throws a
 * human-readable error listing every invalid/missing field if validation fails.
 */
function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  raw: Record<string, string | undefined>,
  label: string
): z.infer<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `[env] Invalid ${label} environment variables:\n${formatted}\n\nFix the above variables in your .env.local file.`
    );
  }
  return result.data as z.infer<T>;
}

// Guard: in the browser we must not read server-only variables.
// We parse the server schema only on the server (typeof window === "undefined").
const isServer = typeof window === 'undefined';

/**
 * Validated server-side environment variables.
 * Only import this in server components, API routes, or middleware.
 *
 * @throws {Error} at startup if any required server variable is missing/invalid.
 */
export const serverEnv = isServer
  ? parseEnv(serverSchema, process.env as Record<string, string | undefined>, 'server')
  : ({} as z.infer<typeof serverSchema>);

/**
 * Validated client-side (NEXT_PUBLIC_*) environment variables.
 * Safe to import in any component — client or server.
 *
 * @throws {Error} at startup if any client variable has an invalid value.
 */
export const clientEnv = parseEnv(
  clientSchema,
  process.env as Record<string, string | undefined>,
  'client (NEXT_PUBLIC_*)'
);

// Export inferred types for use elsewhere in the codebase.
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
