"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"

import { WebVitalsReporter } from "@/components/WebVitalsReporter"
import { queryCachePolicy } from "@/lib/queryKeys"
import { WalletProvider } from "@/lib/context/WalletContext"

// Error tracking is initialised automatically by sentry.client.config.ts which
// Next.js loads before the app renders. The unhandledrejection handler is set up
// there via initErrorTracking(). Wallet-specific user context (setUser) should be
// wired in WalletContext once the user connects their wallet.

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: queryCachePolicy.hunts.gcTime,
            refetchOnWindowFocus: true,
            refetchOnReconnect: "always",
            refetchIntervalInBackground: true,
          },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WalletProvider>
        <QueryClientProvider client={queryClient}>
          <WebVitalsReporter />
          {children}
        </QueryClientProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
