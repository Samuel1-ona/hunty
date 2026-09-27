import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const intlMiddleware = createMiddleware(routing)

export default function middleware(request: NextRequest) {
  // Generate a random cryptographic nonce (Base64)
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

  // Set the nonce in request headers so Server Components can read it
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  // Create a request proxy or request clone with the new headers
  const requestWithNonce = new Proxy(request, {
    get(target, prop) {
      if (prop === "headers") {
        return requestHeaders
      }
      return Reflect.get(target, prop)
    },
  })

  // Execute next-intl middleware
  const response = intlMiddleware(requestWithNonce)

  // Configure Content Security Policy
  const isProduction = process.env.NODE_ENV === "production"
  const isReportOnly = !isProduction || process.env.CSP_REPORT_ONLY === "true"

  const ipfsGateways = [
    "https://gateway.pinata.cloud",
    "https://*.mypinata.cloud",
    "https://cloudflare-ipfs.com",
    "https://dweb.link",
    "https://ipfs.io",
  ]

  const sorobanRpcEndpoints = [
    "https://soroban-testnet.stellar.org",
    "https://rpc.testnet.soroban.stellar.org",
    "https://soroban-mainnet.stellar.org",
    "https://rpc.mainnet.soroban.stellar.org",
  ]

  const trustedApis = [
    "https://api.resend.com",
    "https://torii-indexer.stellar-mainnet.public.blastapi.io",
    "https://indexer.testnet.torii.com",
    ...sorobanRpcEndpoints,
  ]

  const scriptSrc = isProduction
    ? `script-src 'self' 'nonce-${nonce}'`
    : `script-src 'self' 'nonce-${nonce}' 'unsafe-eval'`

  const cspDirectives = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https: ${ipfsGateways.join(" ")}`,
    `connect-src 'self' ${trustedApis.join(" ")} wss: https:`,
    "font-src 'self' data: https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/csp-report",
  ]

  const cspHeaderValue = cspDirectives.join("; ")
  const cspHeaderName = isReportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy"

  // Set the CSP response header
  response.headers.set(cspHeaderName, cspHeaderValue)
  
  // Set the x-nonce header in the response as well for testing/verification
  response.headers.set("x-nonce", nonce)

  return response
}

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}

