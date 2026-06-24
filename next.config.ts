import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
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
    // Determine if we're in report-only mode (staging) or enforcement mode (production)
    const isProduction = process.env.NODE_ENV === "production";
    const isReportOnly = !isProduction || process.env.CSP_REPORT_ONLY === "true";

    // Trusted IPFS gateways
    const ipfsGateways = [
      "https://gateway.pinata.cloud",
      "https://*.mypinata.cloud",
      "https://cloudflare-ipfs.com",
      "https://dweb.link",
      "https://ipfs.io",
    ];

    // Soroban RPC endpoints for blockchain interactions
    const sorobanRpcEndpoints = [
      "https://soroban-testnet.stellar.org",
      "https://rpc.testnet.soroban.stellar.org",
      "https://soroban-mainnet.stellar.org",
      "https://rpc.mainnet.soroban.stellar.org",
    ];

    // Trusted API endpoints
    const trustedApis = [
      "https://api.resend.com", // Email service for notifications
      "https://torii-indexer.stellar-mainnet.public.blastapi.io", // Indexer API
      "https://indexer.testnet.torii.com", // Testnet Indexer
      ...sorobanRpcEndpoints,
    ];

    // Build CSP directives
    const cspDirectives = [
      // Script sources: only self and trusted inline scripts
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,

      // Style sources: self and inline styles
      `style-src 'self' 'unsafe-inline'`,

      // Image sources: self and IPFS gateways
      `img-src 'self' data: https: ${ipfsGateways.join(" ")}`,

      // Connect sources: self, Soroban RPC, IPFS, and APIs
      `connect-src 'self' ${trustedApis.join(" ")} wss: https:`,

      // Font sources
      `font-src 'self' data: https:`,

      // Frame ancestors - prevent clickjacking
      `frame-ancestors 'none'`,

      // Default fallback
      `default-src 'self'`,

      // Base URI restriction
      `base-uri 'self'`,

      // Form action restriction
      `form-action 'self'`,
    ];

    const cspHeader = cspDirectives.join("; ");
    const cspHeaderName = isReportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: cspHeaderName,
            value: cspHeader,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
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
        ],
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
    ];
  },
};

export default withNextIntl(nextConfig);
