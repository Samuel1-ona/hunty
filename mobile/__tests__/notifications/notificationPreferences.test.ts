/**
 * Tests for notificationPreferences — preference storage and type filtering.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPreferences,
  setPreferences,
  shouldShowNotification,
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '../../services/notifications/notificationPreferences';

jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStorage.getItem.mockResolvedValue(null);
  mockAsyncStorage.setItem.mockResolvedValue(undefined);
});

// ─── getPreferences ──────────────────────────────────────────────────────────

describe('getPreferences', () => {
  it('returns defaults when nothing is stored', async () => {
    const prefs = await getPreferences();
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns stored preferences merged with defaults', async () => {
    const stored: Partial<NotificationPreferences> = {
      enabled: true,
      huntEvents: false,
    };
    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(stored));
    const prefs = await getPreferences();
    expect(prefs.huntEvents).toBe(false);
    expect(prefs.rewards).toBe(true); // from default
    expect(prefs.enabled).toBe(true);
  });

  it('returns defaults when stored value is invalid JSON', async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce('not-json');
    const prefs = await getPreferences();
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('returns defaults when AsyncStorage throws', async () => {
    mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Read error'));
    const prefs = await getPreferences();
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });
});

// ─── setPreferences ──────────────────────────────────────────────────────────

describe('setPreferences', () => {
  it('persists the full preferences object', async () => {
    const prefs: NotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      social: false,
    };
    await setPreferences(prefs);
    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'hunty_notification_prefs',
      JSON.stringify(prefs),
    );
  });

  it('does not throw when write fails', async () => {
    mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Write error'));
    await expect(
      setPreferences(DEFAULT_PREFERENCES),
    ).resolves.not.toThrow();
  });
});

// ─── shouldShowNotification ──────────────────────────────────────────────────

describe('shouldShowNotification', () => {
  it('returns true for all types when defaults are active', async () => {
    expect(await shouldShowNotification('hunt_start')).toBe(true);
    expect(await shouldShowNotification('correct_answer')).toBe(true);
    expect(await shouldShowNotification('leaderboard_outranked')).toBe(true);
    expect(await shouldShowNotification('hunt_ending_soon')).toBe(true);
    expect(await shouldShowNotification('reward')).toBe(true);
    expect(await shouldShowNotification('achievement')).toBe(true);
  });

  it('returns false for all types when master toggle is off', async () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, enabled: false };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prefs));

    expect(await shouldShowNotification('hunt_start')).toBe(false);
    expect(await shouldShowNotification('reward')).toBe(false);
    expect(await shouldShowNotification('achievement')).toBe(false);
  });

  it('returns false for hunt_start when huntEvents is off', async () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, huntEvents: false };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prefs));

    expect(await shouldShowNotification('hunt_start')).toBe(false);
    expect(await shouldShowNotification('hunt_ending_soon')).toBe(false);
    // Other categories unaffected
    expect(await shouldShowNotification('reward')).toBe(true);
  });

  it('returns false for reward when rewards is off', async () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, rewards: false };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prefs));

    expect(await shouldShowNotification('reward')).toBe(false);
    expect(await shouldShowNotification('correct_answer')).toBe(false);
  });

  it('returns false for leaderboard_outranked when social is off', async () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, social: false };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prefs));

    expect(await shouldShowNotification('leaderboard_outranked')).toBe(false);
  });

  it('returns false for achievement when achievements is off', async () => {
    const prefs: NotificationPreferences = { ...DEFAULT_PREFERENCES, achievements: false };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(prefs));

    expect(await shouldShowNotification('achievement')).toBe(false);
  });

  it('returns false for unknown event types', async () => {
    expect(await shouldShowNotification('some_unknown_type')).toBe(false);
  });
});
