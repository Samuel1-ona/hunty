import { useToast } from '@providers/ToastProvider';
import NetInfo from '@react-native-community/netinfo';
import { getQueuedAnswerCount } from '@store/answerQueue';
import { processQueuedAnswers } from '@store/huntStore';
import { useEffect } from 'react';

export const useSyncQueue = () => {
  const { showToast } = useToast();
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        getQueuedAnswerCount()
          .then((count) => (count > 0 ? processQueuedAnswers().then(() => true) : false))
          .then((synced) => {
            if (synced) showToast({ message: 'Queued answers synced.', type: 'success' });
          })
          .catch(() => {
            showToast({ message: 'Failed to sync queued answers.', type: 'error' });
          });
      }
    });
    return () => unsubscribe();
  }, []);
};
