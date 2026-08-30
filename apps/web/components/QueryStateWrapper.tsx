import React from 'react';
import { UseQueryResult } from '@tanstack/react-query';
import { EmptyState, ErrorState } from './QueryState';

interface QueryStateWrapperProps<TData, TError> {
  query: UseQueryResult<TData, TError>;
  skeleton: React.ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  customEmptyState?: React.ReactNode;
  children: (data: NonNullable<TData>) => React.ReactNode;
  isEmpty?: (data: NonNullable<TData>) => boolean;
}

export function QueryStateWrapper<TData, TError>({
  query,
  skeleton,
  emptyTitle,
  emptyMessage,
  customEmptyState,
  children,
  isEmpty,
}: QueryStateWrapperProps<TData, TError>) {
  const { isPending, isError, error, data, refetch } = query;

  if (isPending) {
    return <>{skeleton}</>;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const isDataEmpty = isEmpty
    ? isEmpty(data as NonNullable<TData>)
    : (Array.isArray(data) && data.length === 0) || !data;

  if (isDataEmpty) {
    return <>{customEmptyState || <EmptyState title={emptyTitle} message={emptyMessage} />}</>;
  }

  return <>{children(data as NonNullable<TData>)}</>;
}
