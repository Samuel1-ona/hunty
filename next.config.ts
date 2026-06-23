import type { NextConfig } from "next";

// CDN asset prefix for geographic distribution (set NEXT_PUBLIC_CDN_URL in env)
// e.g. "https://cdn.hunty.app" or a CloudFront/Cloudflare distribution URL
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL;

const nextConfig: NextConfig = {
  // Route static assets through CDN when configured
  assetPrefix: CDN_URL ?? undefined,

  images: {
    // Use CDN as the default image loader domain when configured
    loader: CDN_URL ? "custom" : "default",
    loaderFile: CDN_URL ? "./lib/cdn.ts" : undefined,
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
      // Image CDN (weserv) for on-the-fly resizing
      { protocol: "https", hostname: "images.weserv.nl" },
    ],
    // Optimise delivery: allow modern formats
    formats: ["image/avif", "image/webp"],
    // Reasonable device widths for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache optimised images for 7 days on CDN/browser
    minimumCacheTTL: 60 * 60 * 24 * 7,
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
      // Immutable static assets – cache forever (content-hashed filenames)
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Public static files (icons, images, etc.) – cache for 1 day, revalidate
      {
        source: "/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // Favicon and icons
      {
        source: "/:file(favicon\\.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      // All other routes – CSP + security headers
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
    ];
  },
};

export default nextConfig;
