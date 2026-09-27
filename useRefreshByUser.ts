import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * A hook to handle pull-to-refresh state for async actions (e.g., React Query refetch).
 */
export function useRefreshByUser(refetch: () => Promise<any>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      logger.error('Refresh operation failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  return {
    isRefreshing,
    onRefresh,
  };
}