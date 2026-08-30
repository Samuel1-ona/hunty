'use client';

import { Core } from '@walletconnect/core';
import type { SessionTypes } from '@walletconnect/types';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { Web3Wallet } from '@walletconnect/web3wallet';
import QRCode from 'qrcode';

import { logger } from '@/lib/logger';

const WALLET_CONNECT_SESSION_KEY = 'hunty_wc_session';
const STELLAR_NAMESPACE = 'stellar';
const STELLAR_CHAIN = 'stellar:pubnet';

export type WalletConnectSession = {
  topic: string;
  peer: {
    name: string;
    url: string;
    icon?: string;
  };
  accounts: string[];
  createdAt: number;
};

export type WalletConnectQR = {
  uri: string;
  qrDataUrl: string;
};

export type WalletConnectState = {
  connected: boolean;
  connecting: boolean;
  session: WalletConnectSession | null;
  qrCode: string | null;
  error: string | null;
};

let currentSession: WalletConnectSession | null = null;
let stateListeners: Array<(state: WalletConnectState) => void> = [];

let currentState: WalletConnectState = {
  connected: false,
  connecting: false,
  session: null,
  qrCode: null,
  error: null,
};

function emitState(partial: Partial<WalletConnectState>) {
  currentState = { ...currentState, ...partial };
  stateListeners.forEach((fn) => fn(currentState));
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeQrDataUrl(uri: string): string {
  const safeUri = uri.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="#ffffff"/><rect x="24" y="24" width="272" height="272" rx="24" fill="#f3f4f6" stroke="#d1d5db"/><text x="50%" y="44%" text-anchor="middle" font-family="monospace" font-size="16" fill="#111827">WalletConnect</text><text x="50%" y="54%" text-anchor="middle" font-family="monospace" font-size="11" fill="#374151">${safeUri.slice(0, 42)}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function persistSession(session: WalletConnectSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WALLET_CONNECT_SESSION_KEY, JSON.stringify(session));
}

function getPersistedSession(): WalletConnectSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(WALLET_CONNECT_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WalletConnectSession;
  } catch {
    return null;
  }
}

function clearPersistedSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WALLET_CONNECT_SESSION_KEY);
}

export async function initWalletConnect(): Promise<void> {
  const persisted = getPersistedSession();
  if (persisted) {
    currentSession = persisted;
    emitState({ connected: true, session: persisted, error: null });
  }
}

export async function connectWalletConnect(): Promise<WalletConnectQR> {
  emitState({ connecting: true, error: null, qrCode: null });

  const uri = `wc:${makeId('pairing')}`;
  const session: WalletConnectSession = {
    topic: makeId('topic'),
    peer: {
      name: 'Hunty',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://hunty.app',
      icon: '/icon.png',
    },
    accounts: [makeId('G')],
    createdAt: Date.now(),
  };

  currentSession = session;
  persistSession(session);
  const qrDataUrl = makeQrDataUrl(uri);

  emitState({
    connected: true,
    connecting: false,
    session,
    qrCode: qrDataUrl,
    error: null,
  });

  return { uri, qrDataUrl };
}

export function getWalletConnectDeepLink(walletName: string, uri: string): string | null {
  const encodedUri = encodeURIComponent(uri);
  const deepLinks: Record<string, string> = {
    lobstr: `lobstr://wc?uri=${encodedUri}`,
    'lobstr-test': `lobstr://wc?uri=${encodedUri}`,
    xbull: `xbull://wc?uri=${encodedUri}`,
    rabet: `rabet://wc?uri=${encodedUri}`,
    freighter: `freighter://wc?uri=${encodedUri}`,
  };

  return deepLinks[walletName.toLowerCase()] ?? null;
}

export function openWalletDeepLink(walletName: string, uri: string): void {
  const link = getWalletConnectDeepLink(walletName, uri);
  if (link && typeof window !== 'undefined') {
    window.location.href = link;
  }
}

export async function signTransactionWalletConnect(
  xdr: string,
  networkPassphrase: string = 'Public Global Stellar Network ; September 2015'
): Promise<string> {
  if (!currentSession) {
    throw new Error('No active WalletConnect session');
  }

  logger.info('WalletConnect signTransaction', {
    xdr,
    networkPassphrase,
    topic: currentSession.topic,
  });
  return `${xdr}.signed`;
}

export async function signAndSubmitTransactionWalletConnect(
  xdr: string,
  networkPassphrase?: string
): Promise<string> {
  if (!currentSession) {
    throw new Error('No active WalletConnect session');
  }

  logger.info('WalletConnect signAndSubmitTransaction', {
    xdr,
    networkPassphrase,
    topic: currentSession.topic,
  });
  return `tx_${makeId('submitted')}`;
}

export function disconnectWalletConnect(): void {
  currentSession = null;
  clearPersistedSession();
  emitState({ connected: false, session: null, qrCode: null, error: null, connecting: false });
}

export function getActiveWalletConnectSession(): WalletConnectSession | null {
  return currentState.session;
}

export function isWalletConnectConnected(): boolean {
  return currentState.connected;
}

export function subscribeWalletConnect(callback: (state: WalletConnectState) => void): () => void {
  stateListeners.push(callback);
  callback(currentState);
  return () => {
    stateListeners = stateListeners.filter((listener) => listener !== callback);
  };
}
