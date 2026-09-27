/**
 * Tests for badgeService — badge count increment, reset, and retrieval.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBadgeCount, incrementBadge, resetBadge } from '../../services/notifications/badgeService';

jest.mock('expo-notifications');
jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
  mockNotifications.setBadgeCountAsync.mockResolvedValue(true);
});

// ─── getBadgeCount ────────────────────────────────────────────────────────────

describe('getBadgeCount', () => {
  it('returns 0 when no value is stored', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    expect(await getBadgeCount()).toBe(0);
  });

  it('returns the stored numeric value', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('5');
    expect(await getBadgeCount()).toBe(5);
  });

  it('returns 0 when stored value is NaN', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('not-a-number');
    expect(await getBadgeCount()).toBe(0);
  });

  it('returns 0 when stored value is negative', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('-3');
    expect(await getBadgeCount()).toBe(0);
  });

  it('returns 0 when AsyncStorage throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));
    expect(await getBadgeCount()).toBe(0);
  });
});

// ─── incrementBadge ───────────────────────────────────────────────────────────

describe('incrementBadge', () => {
  it('increments from 0 to 1 on first call', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);
    const result = await incrementBadge();
    expect(result).toBe(1);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('hunty_badge_count', '1');
    expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(1);
  });

  it('increments from existing value', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('3');
    const result = await incrementBadge();
    expect(result).toBe(4);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('hunty_badge_count', '4');
    expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(4);
  });

  it('does not throw when setBadgeCountAsync fails', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('2');
    mockNotifications.setBadgeCountAsync.mockRejectedValueOnce(new Error('Badge error'));
    const result = await incrementBadge();
    expect(result).toBe(3);
  });
});

// ─── resetBadge ───────────────────────────────────────────────────────────────

describe('resetBadge', () => {
  it('sets count to 0 in storage and on the badge', async () => {
    await resetBadge();
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('hunty_badge_count', '0');
    expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
  });

  it('does not throw when storage fails', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Write error'));
    await expect(resetBadge()).resolves.not.toThrow();
  });
});
