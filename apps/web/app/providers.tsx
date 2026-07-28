"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { useState } from "react"

import { FeatureFlagProvider } from "@/components/FeatureFlagProvider"
import { WebVitalsReporter } from "@/components/WebVitalsReporter"
import { queryCachePolicy } from "@/lib/queryKeys"
import { WalletProvider } from "@/lib/context/WalletContext"

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
          <FeatureFlagProvider>
            <WebVitalsReporter />
            {children}
          </FeatureFlagProvider>
        </QueryClientProvider>
      </WalletProvider>
    </ThemeProvider>
  )
}
