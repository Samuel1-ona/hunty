import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface FeedbackStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: StateAction;
  variant?: "default" | "error";
}

function FeedbackState({ icon, title, description, action, variant = "default" }: FeedbackStateProps) {
  const isError = variant === "error";

  return (
    <div
      className={`rounded-3xl border border-dashed p-8 text-center shadow-sm dark:bg-slate-900/60 ${
        isError
          ? "border-red-300 bg-red-50/50 dark:border-red-900/50"
          : "border-slate-300 bg-slate-50/90 dark:border-slate-700"
      }`}
    >
      <div
        className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full shadow-sm dark:bg-slate-800 ${
          isError
            ? "bg-red-100 text-red-600 dark:text-red-400"
            : "bg-white text-slate-700 dark:text-slate-200"
        }`}
      >
        {icon}
      </div>
      <h2
        className={`mt-6 text-xl font-semibold ${
          isError ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
        }`}
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button
              asChild
              variant={isError ? "destructive" : "default"}
              className="rounded-full px-6 py-3 text-sm font-semibold"
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              variant={isError ? "destructive" : "default"}
              onClick={action.onClick}
              className="rounded-full px-6 py-3 text-sm font-semibold"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyState(props: Omit<FeedbackStateProps, "variant">) {
  return <FeedbackState {...props} variant="default" />;
}

interface ErrorStateProps {
  error?: Error | unknown;
  onRetry: () => void;
  title?: string;
  description?: string;
}

export function ErrorState({ error, onRetry, title = "Something went wrong", description }: ErrorStateProps) {
  const errorMessage =
    description ||
    (error instanceof Error ? error.message : "An unexpected error occurred while fetching data.");

  return (
    <FeedbackState
      variant="error"
      icon={<AlertTriangle className="h-10 w-10" />}
      title={title}
      description={errorMessage}
      action={{
        label: "Try Again",
        onClick: onRetry,
      }}
    />
  );
}

interface QueryStateWrapperProps<TData, TError> {
  query: UseQueryResult<TData, TError>;
  skeleton: ReactNode;
  emptyProps: Omit<FeedbackStateProps, "variant">;
  children: (data: NonNullable<TData>) => ReactNode;
  isEmpty?: (data: NonNullable<TData>) => boolean;
}

export function QueryStateWrapper<TData, TError>({
  query,
  skeleton,
  emptyProps,
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
    return <EmptyState {...emptyProps} />;
  }

  return <>{children(data as NonNullable<TData>)}</>;
}