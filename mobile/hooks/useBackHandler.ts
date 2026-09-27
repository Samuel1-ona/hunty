import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { registerDiagnostic, unregisterDiagnostic } from '../lib/memoryDiagnostics';

export function useBackHandler(handler: () => boolean) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    registerDiagnostic('BackHandlerSubscription');
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => handlerRef.current());

    return () => {
      subscription.remove();
      unregisterDiagnostic('BackHandlerSubscription');
    };
  }, []);
}
