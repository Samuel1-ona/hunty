import type { Clue } from '@hunty/types';
import { useEffect, useState } from 'react';

import {
  disableBackgroundProximity,
  enableBackgroundProximity,
  isBackgroundProximityEnabled,
} from '@/services/backgroundLocation';

export function useBackgroundProximity(huntId: number, clues: Clue[]) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void isBackgroundProximityEnabled().then((value) => {
      if (mounted) {
        setEnabled(value);
        setBusy(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setBackgroundEnabled = async (value: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      if (!value) {
        await disableBackgroundProximity();
        setEnabled(false);
        return true;
      }

      const result = await enableBackgroundProximity(huntId, clues);
      if (!result.enabled) {
        setEnabled(false);
        setMessage(result.reason);
        return false;
      }
      setEnabled(true);
      setMessage(`Monitoring ${result.regionCount} active proximity clue(s).`);
      return true;
    } catch {
      setEnabled(false);
      setMessage('Background tracking is unavailable on this device.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { enabled, busy, message, setBackgroundEnabled };
}
