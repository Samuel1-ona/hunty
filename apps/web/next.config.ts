import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { createWithNextIntl } from "./lib/nextIntlConfig";

const withNextIntl = createWithNextIntl();

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  poweredByHeader: false,
  httpAgentOptions: {
    keepAlive: true,
  },

  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // Pinata public gateway
      { protocol: "https", hostname: "gateway.pinata.cloud" },
      // Pinata custom dedicated gateways (*.mypinata.cloud)
      { protocol: "https", hostname: "**.mypinata.cloud" },
      // Cloudflare IPFS gateway
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
      // Protocol Labs gateways
      { protocol: "https", hostname: "dweb.link" },
      { protocol: "https", hostname: "ipfs.io" },
    ],
  },

  async headers() {
    // Content-Security-Policy and clickjacking headers (X-Frame-Options /
    // frame-ancestors) are set in middleware.ts so they can vary per route:
    // embed widgets must be framable by third-party sites, everything else
    // keeps DENY / frame-ancestors 'none'. Optional allow-list:
    // EMBED_FRAME_ANCESTORS (defaults to "*").
    //
    // This config only manages static cache and baseline security headers.

    const baseSecurityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "geolocation=(self), microphone=(), camera=()",
      },
    ];

    return [
      {
        source: "/(.*)",
        headers: baseSecurityHeaders,
      },
      {
        source: "/:path*.(svg|png|jpg|jpeg|gif|webp|avif|ico|woff2|woff|ttf|otf)",
        locale: false,
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Service worker must be served from the root scope with no caching
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

const nextIntlConfig = withNextIntl(nextConfig);

// ---------------------------------------------------------------------------
// Sentry source-map upload + auto-instrumentation
// ---------------------------------------------------------------------------
// SENTRY_AUTH_TOKEN must be set in CI/CD and local .env.local (never committed).
// Source maps are deleted from the deployed bundle after upload by default,
// so they are never served to the public.
export default withSentryConfig(nextIntlConfig, {
  org: process.env.SENTRY_ORG ?? "hunty",
  project: process.env.SENTRY_PROJECT ?? "hunty-web",

  // Auth token is read from SENTRY_AUTH_TOKEN env var automatically.
  // Set it in CI secrets and in .env.local for local uploads.

  // Upload source maps during production builds only to keep dev builds fast.
  sourcemaps: {
    // Delete the local .map files after upload so they're not served publicly.
    deleteSourcemapsAfterUpload: true,
  },

  // Automatically instrument Next.js server components, API routes, and the
  // edge runtime for distributed tracing.
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Suppress the CLI upload banner in CI logs.
  silent: !process.env.CI,

  // Remove source maps from the public bundle after Sentry has ingested them.
  hideSourceMaps: true,

  // Disable noisy build-time SDK logger.
  disableLogger: true,
});

