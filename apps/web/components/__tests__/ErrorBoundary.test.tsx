/**
 * Tests for ErrorBoundary component with Sentry integration.
 *
 * Verifies:
 *  - Sentry.captureException is called when a child throws
 *  - The boundary name tag is forwarded
 *  - The custom onError callback is still invoked
 *  - The default fallback UI renders
 *  - The reset function clears the error state
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

import { ErrorBoundary } from '@/components/ErrorBoundary';

// ---------------------------------------------------------------------------
// Mock @sentry/nextjs so no real HTTP calls are made during tests.
// ---------------------------------------------------------------------------
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Import after mock registration so we get the mocked version.
import * as Sentry from '@sentry/nextjs';

// ---------------------------------------------------------------------------
// Helper: a component that throws on render when `shouldThrow` is true.
// ---------------------------------------------------------------------------
function Bomb({ shouldThrow }: { shouldThrow: boolean }): React.ReactElement {
  if (shouldThrow) throw new Error('Bomb exploded!');
  return <div>All good</div>;
}

// Suppress React's console.error spam for expected thrown errors in tests.
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
  vi.clearAllMocks();
});
afterEach(() => {
  console.error = originalConsoleError;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeInTheDocument();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('calls Sentry.captureException when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(Sentry.captureException).toHaveBeenCalledOnce();
    const [capturedError, options] = (Sentry.captureException as ReturnType<typeof vi.fn>).mock
      .calls[0];
    expect(capturedError).toBeInstanceOf(Error);
    expect(capturedError.message).toBe('Bomb exploded!');
    expect(options?.tags?.boundary).toBe('ErrorBoundary');
  });

  it('forwards the boundaryName as the Sentry tag', () => {
    render(
      <ErrorBoundary boundaryName="MyPageBoundary">
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    const [, options] = (Sentry.captureException as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options?.tags?.boundary).toBe('MyPageBoundary');
  });

  it('calls the onError prop when a child throws', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('renders the default fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it("resets the error state when 'Try again' is clicked", async () => {
    // Start with a throwing component.
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click "Try again" — calls setState({ hasError: false, error: null })
    // and re-renders the children.  We need to provide a non-throwing child
    // BEFORE clicking, then the boundary will successfully render after reset.
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    // Still in error state (rerender alone doesn't clear it).
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    // Now the boundary re-renders its children which no longer throw.
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  it('renders the fallbackRender prop with error and reset', () => {
    const fallbackRender = vi.fn(({ error }: { error: Error; reset: () => void }) => (
      <div>Custom render: {error.message}</div>
    ));
    render(
      <ErrorBoundary fallbackRender={fallbackRender}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Custom render: Bomb exploded!')).toBeInTheDocument();
    // fallbackRender may be called more than once due to React's reconciliation.
    expect(fallbackRender).toHaveBeenCalled();
  });
});
