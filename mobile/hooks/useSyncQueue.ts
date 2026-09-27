import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processQueuedAnswers } from '@store/huntStore';
import { useToast } from '@providers/ToastProvider';

export const useSyncQueue = () => {
  const { showToast } = useToast();
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        processQueuedAnswers()
          .then(() => {
            showToast({ message: 'Queued answers synced.', type: 'success' });
          })
          .catch(() => {
            showToast({ message: 'Failed to sync queued answers.', type: 'error' });
          });
      }
    });
    return () => unsubscribe();
  }, []);
};
