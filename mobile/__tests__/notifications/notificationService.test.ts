/**
 * Tests for notificationService — permission helpers and payload extraction.
 */

import * as Notifications from 'expo-notifications';
import {
  getPermissionStatus,
  requestPermission,
  configureNotificationHandler,
  extractPayload,
  extractResponsePayload,
} from '../../services/notifications/notificationService';

jest.mock('expo-notifications');
jest.mock('expo-device', () => ({ isDevice: true }));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('getPermissionStatus', () => {
  it('returns granted when permission is granted', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    const status = await getPermissionStatus();
    expect(status).toBe('granted');
  });

  it('returns denied when permission is denied', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      expires: 'never',
      ios: undefined,
      canAskAgain: false,
    });
    const status = await getPermissionStatus();
    expect(status).toBe('denied');
  });

  it('returns undetermined when not yet asked', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'undetermined',
      granted: false,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    const status = await getPermissionStatus();
    expect(status).toBe('undetermined');
  });
});

describe('requestPermission', () => {
  it('returns granted without prompting if already granted', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    const result = await requestPermission();
    expect(result).toBe('granted');
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('calls requestPermissionsAsync when not yet granted', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'undetermined',
      granted: false,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    const result = await requestPermission();
    expect(result).toBe('granted');
    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns denied when user denies the prompt', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
      status: 'undetermined',
      granted: false,
      expires: 'never',
      ios: undefined,
      canAskAgain: true,
    });
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      expires: 'never',
      ios: undefined,
      canAskAgain: false,
    });
    const result = await requestPermission();
    expect(result).toBe('denied');
  });
});

describe('configureNotificationHandler', () => {
  it('calls setNotificationHandler', () => {
    configureNotificationHandler();
    expect(mockNotifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    const [handler] = mockNotifications.setNotificationHandler.mock.calls[0];
    expect(handler).toHaveProperty('handleNotification');
  });

  it('handler resolves with shouldShowAlert=true', async () => {
    configureNotificationHandler();
    const [handler] = mockNotifications.setNotificationHandler.mock.calls[0];
    const options = await handler.handleNotification({} as Notifications.Notification);
    expect(options.shouldShowAlert).toBe(true);
    expect(options.shouldPlaySound).toBe(true);
    expect(options.shouldSetBadge).toBe(true);
  });
});

describe('extractPayload', () => {
  const makeNotification = (data: Record<string, unknown>): Notifications.Notification =>
    ({
      request: { content: { data } },
    } as unknown as Notifications.Notification);

  it('returns null for missing data', () => {
    expect(extractPayload(makeNotification({}))).toBeNull();
  });

  it('returns null when type field is missing', () => {
    expect(extractPayload(makeNotification({ huntId: 1 }))).toBeNull();
  });

  it('returns the typed payload for hunt_start', () => {
    const data = { type: 'hunt_start', huntId: 42, huntTitle: 'City Secrets' };
    const result = extractPayload(makeNotification(data));
    expect(result).toEqual(data);
  });

  it('returns the typed payload for correct_answer', () => {
    const data = { type: 'correct_answer', huntId: 5, huntTitle: 'Campus Quest', score: 80 };
    const result = extractPayload(makeNotification(data));
    expect(result).toEqual(data);
  });
});

describe('extractResponsePayload', () => {
  it('extracts payload from a notification response', () => {
    const data = { type: 'leaderboard_outranked', huntId: 3, huntTitle: 'Sprint', currentRank: 2 };
    const response = {
      notification: { request: { content: { data } } },
    } as unknown as Notifications.NotificationResponse;
    const result = extractResponsePayload(response);
    expect(result).toEqual(data);
  });
});
