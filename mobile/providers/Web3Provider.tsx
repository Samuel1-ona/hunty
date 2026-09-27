import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import SignClient from '@walletconnect/sign-client';
import Constants from 'expo-constants';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';
import { useWalletStore } from '@store/useStore';
import { saveSession, loadSession, clearSession } from '@services/walletSession';
import { registerPushToken, unregisterPushToken } from '@services/notifications/tokenRegistry';

type SessionInfo = {
  topic: string;
  publicKey: string;
  network: string;
};

type Web3ContextValue = {
  isConnecting: boolean;
  isConnected: boolean;
  publicKey: string;
  session: SessionInfo | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signTransaction: (xdr: string) => Promise<string>;
};

const Web3Context = createContext<Web3ContextValue | undefined>(undefined);

const STELLAR_CHAIN = 'stellar:testnet';
const STELLAR_METHODS = ['stellar_signXDR', 'stellar_signAndSubmitXDR'];
const STELLAR_EVENTS: string[] = [];

function getProjectId(): string {
  const id =
    Constants.expoConfig?.extra?.walletConnectProjectId ??
    process.env.WALLETCONNECT_PROJECT_ID ??
    '';
  return id;
}

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientRef = useRef<InstanceType<typeof SignClient> | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const mountedRef = useRef(true);

  const { setWallet, setNetwork, clearWallet, isConnected, walletAddress } = useWalletStore();
  const { authenticate } = useWalletSecurity();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // #189 — Restore persisted session from SecureStore immediately on mount so
  // the UI reflects the connected state before the WalletConnect SDK hydrates.
  useEffect(() => {
    let isCancelled = false;
    const restorePersistedSession = async () => {
      const persisted = await loadSession();
      if (!isCancelled && mountedRef.current && persisted) {
        setSession({ topic: persisted.topic, publicKey: persisted.publicKey, network: persisted.network });
        setWallet(persisted.publicKey);
        setNetwork(persisted.network.includes('main') ? 'mainnet' : 'testnet');
        // #360 — Refresh token registration after session restore
        void registerPushToken(persisted.publicKey);
      }
    };
    void restorePersistedSession();
    return () => { isCancelled = true; };
  }, [setWallet, setNetwork]);

  useEffect(() => {
    const projectId = getProjectId();
    if (!projectId) {
      if (__DEV__) {
        console.warn('WalletConnect project ID is not configured. Skipping client initialization.');
      }
      return;
    }

    let isCancelled = false;

    const init = async () => {
      try {
        const client = await SignClient.init({
          projectId,
          metadata: {
            name: 'Hunty',
            description: 'Scavenger hunt game on Stellar',
            url: 'https://hunty.app',
            icons: ['https://hunty.app/icon.png'],
          },
        });

        if (isCancelled) return;
        clientRef.current = client;

        client.on('session_delete', () => {
          if (mountedRef.current) {
            setSession(null);
            clearWallet();
            void clearSession();
          }
        });

        client.on('session_expire', () => {
          if (mountedRef.current) {
            setSession(null);
            clearWallet();
            void clearSession();
          }
        });

        const existingSessions = client.session.getAll();
        if (existingSessions.length > 0) {
          const last = existingSessions[existingSessions.length - 1];
          const accounts = last.namespaces?.stellar?.accounts ?? [];
          if (accounts.length > 0) {
            const parts = accounts[0].split(':');
            const pubKey = parts[parts.length - 1];
            const net = parts.length >= 2 ? parts[1] : 'testnet';

            if (mountedRef.current) {
              const sessionInfo: SessionInfo = { topic: last.topic, publicKey: pubKey, network: net };
              setSession(sessionInfo);
              setWallet(pubKey);
              setNetwork(net.includes('main') ? 'mainnet' : 'testnet');
              // Keep SecureStore in sync with the SDK-recovered session
              void saveSession(sessionInfo);
            }
          }
        }
      } catch (err) {
        if (__DEV__) {
          console.warn('WalletConnect init failed:', err);
        }
      }
    };

    void init();

    return () => {
      isCancelled = true;
    };
  }, [clearWallet, setWallet, setNetwork]);

  const connect = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      throw new Error('WalletConnect client is not initialized. Check WALLETCONNECT_PROJECT_ID.');
    }

    setIsConnecting(true);

    try {
      const { uri, approval } = await client.connect({
        requiredNamespaces: {
          stellar: {
            chains: [STELLAR_CHAIN],
            methods: STELLAR_METHODS,
            events: STELLAR_EVENTS,
          },
        },
      });

      if (uri) {
        const { Linking } = require('expo-linking');
        await Linking.openURL(`wc:${uri}`);
      }

      const approvedSession = await approval();

      const accounts = approvedSession.namespaces?.stellar?.accounts ?? [];
      if (accounts.length === 0) {
        throw new Error('No Stellar accounts returned from wallet.');
      }

      const parts = accounts[0].split(':');
      const pubKey = parts[parts.length - 1];
      const net = parts.length >= 2 ? parts[1] : 'testnet';

      if (mountedRef.current) {
        const sessionInfo: SessionInfo = { topic: approvedSession.topic, publicKey: pubKey, network: net };
        setSession(sessionInfo);
        setWallet(pubKey);
        setNetwork(net.includes('main') ? 'mainnet' : 'testnet');
        // #189 — Persist new session so it survives app restarts
        void saveSession(sessionInfo);
        // #360 — Register push token after wallet connect
        void registerPushToken(pubKey);
      }
    } finally {
      if (mountedRef.current) {
        setIsConnecting(false);
      }
    }
  }, [setWallet, setNetwork]);

  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !session) return;

    try {
      await client.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: 'User disconnected' },
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('WalletConnect disconnect error:', err);
      }
    }

    if (mountedRef.current) {
      setSession(null);
      clearWallet();
      // #189 — Remove persisted session on explicit user disconnect
      void clearSession();
      // #360 — Unregister push token on wallet disconnect
      void unregisterPushToken();
    }
  }, [session, clearWallet]);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      const client = clientRef.current;
      if (!client || !session) {
        throw new Error('No active wallet session. Connect a wallet first.');
      }

      const auth = await authenticate('Authorize transaction');
      if (!auth.authenticated) {
        throw new Error('Transaction authorization failed.');
      }

      const result = await client.request<{ signedXDR: string }>({
        topic: session.topic,
        chainId: STELLAR_CHAIN,
        request: {
          method: 'stellar_signXDR',
          params: { xdr },
        },
      });

      return result.signedXDR;
    },
    [authenticate, session],
  );

  const value: Web3ContextValue = {
    isConnecting,
    isConnected,
    publicKey: walletAddress,
    session,
    connect,
    disconnect,
    signTransaction,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
};

export const useWeb3 = (): Web3ContextValue => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
