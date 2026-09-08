import { act, renderHook } from '@testing-library/react-native';

import { useSyncQueue } from '@hooks/useSyncQueue';
import { useToast } from '@providers/ToastProvider';
import { processQueuedAnswers } from '@store/huntStore';
import NetInfo from '@react-native-community/netinfo';

jest.mock('@providers/ToastProvider', () => ({
  useToast: jest.fn(),
}));

jest.mock('@store/huntStore', () => ({
  processQueuedAnswers: jest.fn(),
}));

const mockRejectClueSubmission = jest.fn();
jest.mock('@store/useStore', () => ({
  usePlayerStore: (selector: (state: { rejectClueSubmission: jest.Mock }) => unknown) =>
    selector({ rejectClueSubmission: mockRejectClueSubmission }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}));

describe('useSyncQueue', () => {
  const showToast = jest.fn();
  let networkListener:
    | ((state: { isConnected: boolean; isInternetReachable: boolean }) => void)
    | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    networkListener = null;
    (useToast as jest.Mock).mockReturnValue({ showToast });
    (NetInfo.addEventListener as jest.Mock).mockImplementation((listener) => {
      networkListener = listener;
      return jest.fn();
    });
  });

  it('runs only one sync at a time across reconnect events', async () => {
    let resolveSync: (() => void) | undefined;
    (processQueuedAnswers as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = () => resolve({ synced: 1, pending: 0, discarded: 0, rejected: [] });
        }),
    );

    renderHook(() => useSyncQueue());

    await act(async () => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    expect(processQueuedAnswers).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync?.();
    });
  });

  it('does not show a success toast when there is nothing to sync', async () => {
    (processQueuedAnswers as jest.Mock).mockResolvedValue({
      synced: 0,
      pending: 0,
      discarded: 0,
      rejected: [],
    });

    renderHook(() => useSyncQueue());

    await act(async () => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    expect(showToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });

  it('reports partial sync outcomes as pending', async () => {
    (processQueuedAnswers as jest.Mock).mockResolvedValue({
      synced: 1,
      pending: 2,
      discarded: 0,
      rejected: [],
    });

    renderHook(() => useSyncQueue());

    await act(async () => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/pending/i),
      }),
    );
  });

  it('rewinds optimistic progress for server-rejected queued answers', async () => {
    (processQueuedAnswers as jest.Mock).mockResolvedValue({
      synced: 0,
      pending: 0,
      discarded: 1,
      rejected: [{ huntId: 4, clueIndex: 2 }],
    });

    renderHook(() => useSyncQueue());

    await act(async () => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    expect(mockRejectClueSubmission).toHaveBeenCalledWith(4, 2);
  });
});
