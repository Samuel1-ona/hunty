/**
 * Tests for the useNotifications hook — permission flow and token registration.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useNotifications } from '../../hooks/useNotifications';
import * as notificationService from '../../services/notifications/notificationService';
import * as tokenRegistry from '../../services/notifications/tokenRegistry';

jest.mock('../../services/notifications/notificationService');
jest.mock('../../services/notifications/tokenRegistry');

const mockGetPermissionStatus = notificationService.getPermissionStatus as jest.MockedFunction<
  typeof notificationService.getPermissionStatus
>;
const mockRequestPermission = notificationService.requestPermission as jest.MockedFunction<
  typeof notificationService.requestPermission
>;
const mockRegisterPushToken = tokenRegistry.registerPushToken as jest.MockedFunction<
  typeof tokenRegistry.registerPushToken
>;
const mockUnregisterPushToken = tokenRegistry.unregisterPushToken as jest.MockedFunction<
  typeof tokenRegistry.unregisterPushToken
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPermissionStatus.mockResolvedValue('undetermined');
  mockRequestPermission.mockResolvedValue('granted');
  mockRegisterPushToken.mockResolvedValue(undefined);
  mockUnregisterPushToken.mockResolvedValue(undefined);
});

describe('initial state', () => {
  it('starts with loading=true while hydrating', () => {
    const { result } = renderHook(() => useNotifications());
    expect(result.current.loading).toBe(true);
  });

  it('sets enabled=false when permission is undetermined', async () => {
    mockGetPermissionStatus.mockResolvedValue('undetermined');
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    expect(result.current.enabled).toBe(false);
    expect(result.current.permissionStatus).toBe('undetermined');
  });

  it('sets enabled=true when permission is granted', async () => {
    mockGetPermissionStatus.mockResolvedValue('granted');
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    expect(result.current.enabled).toBe(true);
  });

  it('sets enabled=false when permission is denied', async () => {
    mockGetPermissionStatus.mockResolvedValue('denied');
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});
    expect(result.current.enabled).toBe(false);
    expect(result.current.permissionStatus).toBe('denied');
  });
});

describe('toggle', () => {
  it('requests permission when toggling on from undetermined', async () => {
    mockGetPermissionStatus.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('granted');
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      await result.current.toggle(true);
    });

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    expect(result.current.enabled).toBe(true);
    expect(result.current.permissionStatus).toBe('granted');
  });

  it('reflects denied status after user refuses the prompt', async () => {
    mockGetPermissionStatus.mockResolvedValue('undetermined');
    mockRequestPermission.mockResolvedValue('denied');
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      await result.current.toggle(true);
    });

    expect(result.current.enabled).toBe(false);
    expect(result.current.permissionStatus).toBe('denied');
  });

  it('does not call requestPermission when toggling off', async () => {
    mockGetPermissionStatus.mockResolvedValue('granted');
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      await result.current.toggle(false);
    });

    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});

describe('registerForWallet', () => {
  it('delegates to registerPushToken with the wallet address', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      await result.current.registerForWallet('GWALLET123');
    });

    expect(mockRegisterPushToken).toHaveBeenCalledWith('GWALLET123');
  });
});

describe('unregister', () => {
  it('delegates to unregisterPushToken', async () => {
    const { result } = renderHook(() => useNotifications());
    await act(async () => {});

    await act(async () => {
      await result.current.unregister();
    });

    expect(mockUnregisterPushToken).toHaveBeenCalledTimes(1);
  });
});
