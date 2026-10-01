import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useQueuedAnswerCount } from '@hooks/useQueuedAnswerCount';
import {
  ANSWER_QUEUE_KEY,
  getQueuedAnswerCount,
  notifyAnswerQueueChanged,
  subscribeToAnswerQueue,
} from '@store/answerQueue';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('answerQueue', () => {
  it('counts the persisted queue', async () => {
    await AsyncStorage.setItem(
      ANSWER_QUEUE_KEY,
      JSON.stringify([
        { huntId: 1, clueId: 1, answer: 'a' },
        { huntId: 1, clueId: 2, answer: 'b' },
      ]),
    );
    await expect(getQueuedAnswerCount()).resolves.toBe(2);
  });

  it('returns 0 for an empty or corrupt queue', async () => {
    await expect(getQueuedAnswerCount()).resolves.toBe(0);
    await AsyncStorage.setItem(ANSWER_QUEUE_KEY, '{not json');
    await expect(getQueuedAnswerCount()).resolves.toBe(0);
  });

  it('notifies subscribers until they unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToAnswerQueue(listener);

    notifyAnswerQueueChanged(4);
    unsubscribe();
    notifyAnswerQueueChanged(0);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(4);
  });
});

describe('useQueuedAnswerCount', () => {
  it('starts from the persisted queue size', async () => {
    await AsyncStorage.setItem(
      ANSWER_QUEUE_KEY,
      JSON.stringify([{ huntId: 1, clueId: 1, answer: 'a' }]),
    );

    const { result } = renderHook(() => useQueuedAnswerCount());

    await waitFor(() => expect(result.current).toBe(1));
  });

  it('updates when answers are queued and drops to 0 after a sync', async () => {
    const { result } = renderHook(() => useQueuedAnswerCount());
    await waitFor(() => expect(result.current).toBe(0));

    act(() => notifyAnswerQueueChanged(1));
    expect(result.current).toBe(1);

    act(() => notifyAnswerQueueChanged(2));
    expect(result.current).toBe(2);

    act(() => notifyAnswerQueueChanged(0));
    expect(result.current).toBe(0);
  });

  it('prefers a change event over a slower initial read', async () => {
    await AsyncStorage.setItem(
      ANSWER_QUEUE_KEY,
      JSON.stringify([{ huntId: 1, clueId: 1, answer: 'stale' }]),
    );

    const { result } = renderHook(() => useQueuedAnswerCount());
    act(() => notifyAnswerQueueChanged(0));

    // Let the initial AsyncStorage read resolve; it must not overwrite the event.
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current).toBe(0);
  });

  it('stops listening after unmount', () => {
    const { result, unmount } = renderHook(() => useQueuedAnswerCount());
    unmount();

    expect(() => notifyAnswerQueueChanged(5)).not.toThrow();
    expect(result.current).toBe(0);
  });
});

describe('useQueuedAnswerCount with the real huntStore queue', () => {
  it('counts answers queued offline and clears after processQueuedAnswers', async () => {
    const { queueClueAnswer, processQueuedAnswers } = require('@store/huntStore');
    const { result } = renderHook(() => useQueuedAnswerCount());
    await waitFor(() => expect(result.current).toBe(0));

    await act(async () => {
      await queueClueAnswer(7, 1, 'first', 'G'.repeat(56));
      await queueClueAnswer(7, 2, 'second', 'G'.repeat(56));
    });
    expect(result.current).toBe(2);
    await expect(getQueuedAnswerCount()).resolves.toBe(2);

    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    await act(async () => {
      await processQueuedAnswers();
    });
    expect(result.current).toBe(0);
    await expect(getQueuedAnswerCount()).resolves.toBe(0);
  });

  it('keeps counting answers that failed to submit', async () => {
    const { queueClueAnswer, processQueuedAnswers } = require('@store/huntStore');
    const { result } = renderHook(() => useQueuedAnswerCount());
    await waitFor(() => expect(result.current).toBe(0));

    await act(async () => {
      await queueClueAnswer(7, 1, 'first', 'G'.repeat(56));
    });
    expect(result.current).toBe(1);

    global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
    await act(async () => {
      await processQueuedAnswers();
    });
    expect(result.current).toBe(1);
    await expect(getQueuedAnswerCount()).resolves.toBe(1);
  });
});
