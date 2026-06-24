import { useCallback, useRef, useEffect } from 'react';
import { useAnalytics as useAnalyticsContext } from '@providers/AnalyticsProvider';

/**
 * Hook for tracking screen-specific analytics with automatic
 * performance timing and lifecycle events.
 *
 * Usage:
 *   function HuntScreen() {
 *     const { trackScreenMount, trackAction } = useScreenAnalytics('HuntDetail');
 *     useEffect(() => { trackScreenMount(); }, []);
 *     return <Button onPress={() => trackAction('claim_reward', 'claim_button')} />;
 *   }
 */

export function useScreenAnalytics(screenName: string) {
  const { trackScreen, trackAction, track, report } = useAnalyticsContext();
  const mountTimeRef = useRef<number>(0);
  const hasTrackedMount = useRef(false);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    return () => {
      hasTrackedMount.current = false;
    };
  }, [screenName]);

  const trackScreenMount = useCallback(() => {
    if (hasTrackedMount.current) return;
    hasTrackedMount.current = true;

    const duration = performance.now() - mountTimeRef.current;
    trackScreen(screenName);

    // Also track the load performance
    track({
      name: 'screen_load',
      params: {
        screen_name: screenName,
        duration_ms: Math.round(duration),
      },
    });
  }, [screenName, trackScreen, track]);

  const trackScreenAction = useCallback(
    (action: string, target?: string, value?: string | number | boolean) => {
      trackAction(action, target ?? screenName, value);
    },
    [screenName, trackAction]
  );

  const trackError = useCallback(
    (error: Error, context?: Record<string, unknown>) => {
      report(error, { screen: screenName, ...context });
    },
    [screenName, report]
  );

  return {
    trackScreenMount,
    trackAction: trackScreenAction,
    trackError,
  };
}

/**
 * Simple hook for tracking a specific user action with a callback.
 * Wraps your handler so the event is tracked on every invocation.
 *
 * Usage:
 *   const onPress = useTrackableAction('submit_answer', handleSubmit);
 */
export function useTrackableAction<T extends (...args: unknown[]) => unknown>(
  actionName: string,
  handler: T,
  target?: string
): T {
  const { trackAction } = useAnalyticsContext();

  return useCallback(
    ((...args: unknown[]) => {
      trackAction(actionName, target);
      return handler(...args);
    }) as T,
    [actionName, handler, target, trackAction]
  );
}