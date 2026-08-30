import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionProvider, useSession } from '@/lib/context/SessionContext';
import * as sessionModule from '@/lib/session';

const mockDisconnect = vi.fn();
let mockConnected = false;
let mockPublicKey = '';

vi.mock('@/lib/context/WalletContext', () => ({
  useWallet: () => ({
    connected: mockConnected,
    publicKey: mockPublicKey,
    disconnect: mockDisconnect,
  }),
}));

vi.mock('@/hooks/useIsMounted', () => ({
  useIsMounted: () => true,
}));

const eventListeners = new Map<string, Set<EventListener>>();

let store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
  get length() {
    return Object.keys(store).length;
  },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

const windowMock = {
  addEventListener: vi.fn((event: string, handler: EventListener) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set());
    }
    eventListeners.get(event)!.add(handler);
  }),
  removeEventListener: vi.fn((event: string, handler: EventListener) => {
    eventListeners.get(event)?.delete(handler);
  }),
};

let uuidCounter = 0;

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

function setupWalletState(connected: boolean, publicKey: string) {
  mockConnected = connected;
  mockPublicKey = publicKey;
}

describe('useSession', () => {
  beforeEach(() => {
    store = {};
    vi.clearAllMocks();
    eventListeners.clear();
    uuidCounter = 0;
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', windowMock);
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => {
        uuidCounter++;
        return `mock-uuid-${uuidCounter}`;
      }),
    });
    setupWalletState(false, '');
  });

  it('should throw when used outside SessionProvider', () => {
    expect(() => renderHook(() => useSession())).toThrow(
      'useSession must be used within a SessionProvider'
    );
  });

  it('should return default state when wallet is not connected', () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.preferences).toEqual({});
  });

  it('should create a session when wallet connects', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toBeNull();

    setupWalletState(true, 'GABC123...');

    rerender();

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.publicKey).toBe('GABC123...');
    expect(result.current.session?.token).toBe('mock-uuid-1');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.remainingMs).toBeGreaterThan(0);
  });

  it('should clear session when wallet disconnects', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    expect(result.current.session).not.toBeNull();

    setupWalletState(false, '');
    rerender();

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should restore session from localStorage on mount when wallet connected', () => {
    const session = sessionModule.createSession('GABC123...', { theme: 'dark' });
    store['hunty-session'] = JSON.stringify(session);

    setupWalletState(true, 'GABC123...');
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.publicKey).toBe('GABC123...');
    expect(result.current.session?.token).toBe(session.token);
    expect(result.current.preferences).toEqual({ theme: 'dark' });
  });

  it('should discard expired session from localStorage when wallet not connected', () => {
    const expired = {
      ...sessionModule.createSession('GABC123...'),
      expiresAt: Date.now() - 1000,
    };
    store['hunty-session'] = JSON.stringify(expired);

    setupWalletState(false, '');
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should create new session when expired session found but wallet is connected', () => {
    const expired = {
      ...sessionModule.createSession('GABC123...'),
      expiresAt: Date.now() - 1000,
    };
    store['hunty-session'] = JSON.stringify(expired);

    setupWalletState(true, 'GABC123...');
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.publicKey).toBe('GABC123...');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should update preferences via updatePreferences', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    expect(result.current.preferences).toEqual({});

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    expect(result.current.preferences).toEqual({ theme: 'dark' });

    act(() => {
      result.current.updatePreferences({ theme: 'light' });
    });

    expect(result.current.preferences).toEqual({ theme: 'light' });
  });

  it('should merge partial preferences', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    act(() => {
      result.current.updatePreferences({ theme: 'dark' });
    });

    act(() => {
      result.current.updatePreferences({ theme: 'system' });
    });

    expect(result.current.preferences).toEqual({ theme: 'system' });
  });

  it('should extend session via renew', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    const originalExpiry = result.current.session!.expiresAt;

    act(() => {
      result.current.renew();
    });

    expect(result.current.session!.expiresAt).toBeGreaterThanOrEqual(originalExpiry);
  });

  it('should clear all data and disconnect on clear', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    expect(result.current.session).not.toBeNull();

    act(() => {
      result.current.clear();
    });

    expect(result.current.session).toBeNull();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should re-create session when wallet changes to a new address', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    const firstToken = result.current.session?.token;

    setupWalletState(true, 'GXYZ789...');
    rerender();

    expect(result.current.session?.publicKey).toBe('GXYZ789...');
    expect(result.current.session?.token).not.toBe(firstToken);
  });

  it('should preserve existing session when same wallet reconnects', () => {
    const { result, rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    setupWalletState(false, '');
    rerender();

    expect(result.current.session).toBeNull();

    setupWalletState(true, 'GABC123...');
    rerender();

    expect(result.current.session?.publicKey).toBe('GABC123...');
  });

  it('should persist session to localStorage after creation', () => {
    const { rerender } = renderHook(() => useSession(), { wrapper });

    setupWalletState(true, 'GABC123...');
    rerender();

    const saved = JSON.parse(store['hunty-session']);
    expect(saved.publicKey).toBe('GABC123...');
    expect(saved.token).toBe('mock-uuid-1');
  });

  it('isAuthenticated should be false when wallet not connected', () => {
    const { result } = renderHook(() => useSession(), { wrapper });

    expect(result.current.isAuthenticated).toBe(false);
  });
});
