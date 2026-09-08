import { useToast } from '@providers/ToastProvider';
import NetInfo from '@react-native-community/netinfo';
import { processQueuedAnswers, type QueueSyncResult } from '@store/huntStore';
import { usePlayerStore } from '@store/useStore';
import { useEffect, useRef } from 'react';

export const useSyncQueue = () => {
  const { showToast } = useToast();
  const rejectClueSubmission = usePlayerStore((state) => state.rejectClueSubmission);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected || !state.isInternetReachable || syncInFlightRef.current) {
        return;
      }

      syncInFlightRef.current = true;

      processQueuedAnswers()
        .then((result: QueueSyncResult) => {
          const { synced, pending, discarded } = result;
          for (const entry of result.rejected) {
            if (entry.clueIndex !== undefined) {
              rejectClueSubmission(entry.huntId, entry.clueIndex);
            }
          }
          const touchedAnswers = synced + pending + discarded;

          if (touchedAnswers === 0) {
            return;
          }

          if (pending > 0 || discarded > 0) {
            const fragments: string[] = [];

            if (synced > 0) {
              fragments.push(`${synced} queued answer${synced === 1 ? '' : 's'} synced`);
            }

            if (pending > 0) {
              fragments.push(`${pending} pending`);
            }

            if (discarded > 0) {
              fragments.push(`${discarded} discarded`);
            }

            showToast({
              message: fragments.join(', ') + '.',
              type: 'warning',
            });
            return;
          }

          showToast({ message: 'Queued answers synced.', type: 'success' });
        })
        .catch(() => {
          showToast({ message: 'Failed to sync queued answers.', type: 'error' });
        })
        .finally(() => {
          syncInFlightRef.current = false;
        });
    });

    return () => unsubscribe();
  }, [rejectClueSubmission, showToast]);
};
