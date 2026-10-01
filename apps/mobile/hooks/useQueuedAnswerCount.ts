import { getQueuedAnswerCount, subscribeToAnswerQueue } from '@store/answerQueue';
import { useEffect, useState } from 'react';

/** Number of clue answers waiting in the offline queue, kept live. */
export const useQueuedAnswerCount = (): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    // A change event is fresher than the initial read, so once one arrives
    // the initial read result is ignored.
    let receivedUpdate = false;

    const unsubscribe = subscribeToAnswerQueue((next) => {
      receivedUpdate = true;
      if (active) setCount(next);
    });

    getQueuedAnswerCount().then((initial) => {
      if (active && !receivedUpdate) setCount(initial);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return count;
};
