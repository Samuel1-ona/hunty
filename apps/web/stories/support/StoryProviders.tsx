import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WalletContext } from '@/lib/context/WalletContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function withQueryClient(children: ReactNode) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function withWalletContext(children: ReactNode) {
  return (
    <WalletContext.Provider
      value={{
        connected: true,
        publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        displayKey: 'GAAAAA...AWHF',
        connect: async () => ({}),
        walletProvider: 'freighter',
        disconnect: () => {},
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
