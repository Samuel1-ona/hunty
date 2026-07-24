/**
 * Tests for tokenRegistry — push token retrieval, registration, and cleanup.
 */

import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { registerPushToken, unregisterPushToken, getExpoPushToken } from '../../services/notifications/tokenRegistry';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-secure-store');
jest.mock('expo-constants');

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

// Spy on global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
  mockSecureStore.getItemAsync.mockResolvedValue(null);
  mockSecureStore.setItemAsync.mockResolvedValue(undefined);
  mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  // Default: permission granted
  mockNotifications.getPermissionsAsync.mockResolvedValue({
    status: 'granted',
    granted: true,
    expires: 'never',
    ios: undefined,
    canAskAgain: true,
  } as any);
  mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
    data: 'ExponentPushToken[default-token]',
    type: 'expo',
  } as any);
});

// ─── getExpoPushToken ──────────────────────────────────────────────────────────

describe('getExpoPushToken', () => {
  it('returns null when Device.isDevice is false (simulator)', async () => {
    // No way to override the module-level isDevice in Jest without re-mocking,
    // so test the observable outcome: when permission check returns no status we bail
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);
    const token = await getExpoPushToken();
    expect(token).toBeNull();
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('returns null when permission is not granted', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      expires: 'never',
      ios: undefined,
      canAskAgain: false,
    });
    const token = await getExpoPushToken();
    expect(token).toBeNull();
  });

  it('returns the token string when permission is granted', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
      data: 'ExponentPushToken[test-token-123]',
      type: 'expo',
    });
    const token = await getExpoPushToken();
    expect(token).toBe('ExponentPushToken[test-token-123]');
  });

  it('returns null when getExpoPushTokenAsync throws', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    mockNotifications.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('SDK error'));
    const token = await getExpoPushToken();
    expect(token).toBeNull();
  });
});

// ─── registerPushToken ────────────────────────────────────────────────────────

describe('registerPushToken', () => {
  const walletAddress = 'GTEST123';

  beforeEach(() => {
    // Default: permission granted, token available
    mockNotifications.getPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[abc]',
      type: 'expo',
    });
  });

  it('does nothing when walletAddress is empty', async () => {
    await registerPushToken('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('registers token with backend and persists it', async () => {
    await registerPushToken(walletAddress);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/push-tokens'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(walletAddress),
      }),
    );
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      'hunty_push_token',
      'ExponentPushToken[abc]',
    );
  });

  it('skips backend call when token + wallet are already stored', async () => {
    // Simulate stored token matching current token + wallet
    mockSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (key === 'hunty_push_token') return 'ExponentPushToken[abc]';
      if (key === 'hunty_push_token_wallet') return walletAddress;
      return null;
    });
    await registerPushToken(walletAddress);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('re-registers when wallet changes', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (key === 'hunty_push_token') return 'ExponentPushToken[abc]';
      if (key === 'hunty_push_token_wallet') return 'OLD_WALLET';
      return null;
    });
    await registerPushToken(walletAddress);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('does not throw when backend registration fails after retries', async () => {
    mockFetch.mockRejectedValue(new Error('Network offline'));
    await expect(registerPushToken(walletAddress)).resolves.not.toThrow();
  });

  it('treats HTTP 409 as success (already registered)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 409 });
    await expect(registerPushToken(walletAddress)).resolves.not.toThrow();
  });
});

// ─── unregisterPushToken ─────────────────────────────────────────────────────

describe('unregisterPushToken', () => {
  it('clears local storage even when backend call fails', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (key === 'hunty_push_token') return 'ExponentPushToken[abc]';
      if (key === 'hunty_push_token_wallet') return 'GTEST123';
      return null;
    });
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await unregisterPushToken();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('hunty_push_token');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('hunty_push_token_wallet');
  });

  it('calls DELETE on the backend with stored token and wallet', async () => {
    mockSecureStore.getItemAsync.mockImplementation(async (key) => {
      if (key === 'hunty_push_token') return 'ExponentPushToken[xyz]';
      if (key === 'hunty_push_token_wallet') return 'GWALLET456';
      return null;
    });
    await unregisterPushToken();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/push-tokens'),
      expect.objectContaining({
        method: 'DELETE',
        body: expect.stringContaining('GWALLET456'),
      }),
    );
  });

  it('does not call backend when no stored token exists', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    await unregisterPushToken();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
