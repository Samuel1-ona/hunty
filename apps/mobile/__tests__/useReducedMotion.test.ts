/**
 * Tests for the useReducedMotion hook — reads the OS reduce-motion setting
 * from AccessibilityInfo and stays in sync with the `reduceMotionChanged` event.
 */

import { act, renderHook } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';

type ReduceMotionHandler = (enabled: boolean) => void;

describe('useReducedMotion', () => {
  let reduceMotionHandler: ReduceMotionHandler | undefined;
  let removeSubscription: jest.Mock;
  let isReduceMotionEnabledSpy: jest.SpyInstance<Promise<boolean>, []>;

  beforeEach(() => {
    jest.clearAllMocks();
    reduceMotionHandler = undefined;
    removeSubscription = jest.fn();

    isReduceMotionEnabledSpy = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');
    isReduceMotionEnabledSpy.mockResolvedValue(false);

    const addEventListenerMock = jest.fn((eventName: string, handler: ReduceMotionHandler) => {
      if (eventName === 'reduceMotionChanged') {
        reduceMotionHandler = handler;
      }
      return { remove: removeSubscription };
    });

    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation(
        addEventListenerMock as unknown as typeof AccessibilityInfo.addEventListener,
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads the initial value from AccessibilityInfo.isReduceMotionEnabled', async () => {
    isReduceMotionEnabledSpy.mockResolvedValue(true);

    const { result } = renderHook(() => useReducedMotion());

    // Motion is allowed until the async query resolves.
    expect(result.current).toBe(false);

    await act(async () => {});

    expect(isReduceMotionEnabledSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(true);
  });

  it('keeps motion enabled when the platform query rejects', async () => {
    isReduceMotionEnabledSpy.mockRejectedValue(new Error('not supported'));

    const { result } = renderHook(() => useReducedMotion());
    await act(async () => {});

    expect(result.current).toBe(false);
  });

  it('updates when the reduceMotionChanged event fires', async () => {
    const { result } = renderHook(() => useReducedMotion());
    await act(async () => {});

    expect(result.current).toBe(false);

    act(() => {
      reduceMotionHandler?.(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      reduceMotionHandler?.(false);
    });
    expect(result.current).toBe(false);
  });

  it('subscribes to reduceMotionChanged and removes the subscription on unmount', async () => {
    const { unmount } = renderHook(() => useReducedMotion());
    await act(async () => {});

    expect(AccessibilityInfo.addEventListener).toHaveBeenCalledWith(
      'reduceMotionChanged',
      expect.any(Function),
    );

    unmount();

    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it('does not throw on platforms without the event listener', async () => {
    const originalAddEventListener = AccessibilityInfo.addEventListener;
    // Simulate an older React Native / platform without the listener API.
    // @ts-expect-error deliberate removal of the listener for the guard test
    AccessibilityInfo.addEventListener = undefined;

    try {
      const { result, unmount } = renderHook(() => useReducedMotion());
      await act(async () => {});

      expect(result.current).toBe(false);
      expect(() => unmount()).not.toThrow();
    } finally {
      AccessibilityInfo.addEventListener = originalAddEventListener;
    }
  });
});
