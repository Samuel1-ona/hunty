'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

import { FeatureFlagProvider } from '@/components/FeatureFlagProvider';
import { WebVitalsReporter } from '@/components/WebVitalsReporter';
import { NetworkMismatchWarning } from '@/components/NetworkMismatchWarning';
import { SessionProvider } from '@/lib/context/SessionContext';
import { WalletProvider, useWallet } from '@/lib/context/WalletContext';
import { queryCachePolicy } from '@/lib/queryKeys';

function NetworkWarningWrapper() {
  const { walletProvider, connected } = useWallet();
  return <NetworkMismatchWarning walletProvider={walletProvider} isConnected={connected} />;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: queryCachePolicy.hunts.gcTime,
            refetchOnWindowFocus: true,
            refetchOnReconnect: 'always',
            refetchIntervalInBackground: true,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WalletProvider>
        <SessionProvider>
          <QueryClientProvider client={queryClient}>
            <FeatureFlagProvider>
              <NetworkWarningWrapper />
              <WebVitalsReporter />
              {children}
            </FeatureFlagProvider>
          </QueryClientProvider>
        </SessionProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
