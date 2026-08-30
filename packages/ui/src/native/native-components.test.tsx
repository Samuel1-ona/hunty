/**
 * Unit tests for @hunty/ui native components — Button, Badge, Card, EmptyState.
 * Runs in jsdom via vitest with mocked react-native.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './Card';
import { EmptyState } from './EmptyState';

// ── Button ────────────────────────────────────────────────────────────────

describe('Button (native)', () => {
  it('renders the label', () => {
    render(<Button label="Native Click" />);
    expect(screen.getByText('Native Click')).toBeInTheDocument();
  });

  it('calls onPress when clicked', () => {
    const onPress = vi.fn();
    render(<Button label="Press" onPress={onPress} />);
    fireEvent.click(screen.getByText('Press'));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('is disabled when disabled=true', () => {
    render(<Button label="Disabled" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading indicator when loading=true', () => {
    render(<Button label="Loading" loading />);
    expect(screen.getByTestId('activity-indicator')).toBeInTheDocument();
  });

  it('uses accessibilityLabel as aria-label', () => {
    render(<Button label="Icon" accessibilityLabel="Custom Label" />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('renders testID as data-testid', () => {
    render(<Button label="Test" testID="native-btn" />);
    expect(screen.getByTestId('native-btn')).toBeInTheDocument();
  });

  it.each(['primary', 'secondary', 'ghost', 'outline', 'destructive'] as const)(
    'renders variant %s without error',
    (variant) => {
      render(<Button label={variant} variant={variant} />);
      expect(screen.getByText(variant)).toBeInTheDocument();
    }
  );
});

// ── Badge ─────────────────────────────────────────────────────────────────

describe('Badge (native)', () => {
  it('renders the label', () => {
    render(<Badge label="Native Badge" />);
    expect(screen.getByText('Native Badge')).toBeInTheDocument();
  });

  it.each(['primary', 'success', 'warning', 'error', 'gray'] as const)(
    'renders variant %s without error',
    (variant) => {
      render(<Badge label={variant} variant={variant} />);
      expect(screen.getByText(variant)).toBeInTheDocument();
    }
  );

  it('renders testID as data-testid', () => {
    render(<Badge label="Badge" testID="native-badge" />);
    expect(screen.getByTestId('native-badge')).toBeInTheDocument();
  });
});

// ── Card ──────────────────────────────────────────────────────────────────

describe('Card (native)', () => {
  it('renders children', () => {
    render(
      <Card>
        <p>Native Card Body</p>
      </Card>
    );
    expect(screen.getByText('Native Card Body')).toBeInTheDocument();
  });

  it('calls onPress when clicked if clickable', () => {
    const onPress = vi.fn();
    render(
      <Card onPress={onPress}>
        <span>Clickable Card</span>
      </Card>
    );
    fireEvent.click(screen.getByText('Clickable Card'));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('renders subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Native Title</CardTitle>
        </CardHeader>
        <CardContent>Native Content</CardContent>
        <CardFooter>Native Footer</CardFooter>
      </Card>
    );
    expect(screen.getByText('Native Title')).toBeInTheDocument();
    expect(screen.getByText('Native Content')).toBeInTheDocument();
    expect(screen.getByText('Native Footer')).toBeInTheDocument();
  });

  it('renders testID as data-testid', () => {
    render(
      <Card testID="native-card">
        <span />
      </Card>
    );
    expect(screen.getByTestId('native-card')).toBeInTheDocument();
  });
});

// ── EmptyState ────────────────────────────────────────────────────────────

describe('EmptyState (native)', () => {
  it('renders icon, title and description', () => {
    render(<EmptyState icon="⚡" title="No Items" description="Nothing here." />);
    expect(screen.getByText('⚡')).toBeInTheDocument();
    expect(screen.getByText('No Items')).toBeInTheDocument();
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const onPress = vi.fn();
    render(
      <EmptyState
        icon="⚡"
        title="Empty"
        description="No data."
        action={{ label: 'Reload', onPress }}
      />
    );
    const btn = screen.getByRole('button', { name: 'Reload' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('renders testID as data-testid', () => {
    render(<EmptyState icon="!" title="T" description="D" testID="native-empty" />);
    expect(screen.getByTestId('native-empty')).toBeInTheDocument();
  });
});
