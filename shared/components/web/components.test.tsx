/**
 * Unit tests for shared/components/web — Button, Badge, Card, EmptyState.
 * Runs in jsdom via vitest.
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'
import { Badge } from './Badge'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card'
import { EmptyState } from './EmptyState'

// ── Button ────────────────────────────────────────────────────────────────

describe('Button (web)', () => {
  it('renders the label', () => {
    render(<Button label="Click me" />)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button label="Go" onClick={onClick} />)
    fireEvent.click(screen.getByText('Go'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is disabled when disabled=true', () => {
    render(<Button label="Off" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled and shows spinner when loading=true', () => {
    render(<Button label="Saving" loading />)
    expect(screen.getByRole('button')).toBeDisabled()
    // spinner has aria-hidden, not role; just confirm button is busy
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('uses accessibilityLabel as aria-label when provided', () => {
    render(<Button label="X" accessibilityLabel="Close dialog" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Close dialog')
  })

  it('falls back to label as aria-label', () => {
    render(<Button label="Submit" />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Submit')
  })

  it('renders testID as data-testid', () => {
    render(<Button label="T" testID="btn-test" />)
    expect(screen.getByTestId('btn-test')).toBeInTheDocument()
  })

  it.each(['primary', 'secondary', 'ghost', 'outline', 'destructive'] as const)(
    'renders variant %s without error',
    (variant) => {
      render(<Button label={variant} variant={variant} />)
      expect(screen.getByText(variant)).toBeInTheDocument()
    }
  )
})

// ── Badge ─────────────────────────────────────────────────────────────────

describe('Badge (web)', () => {
  it('renders the label', () => {
    render(<Badge label="Active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it.each(['primary', 'success', 'warning', 'error', 'gray'] as const)(
    'renders variant %s without error',
    (variant) => {
      render(<Badge label={variant} variant={variant} />)
      expect(screen.getByText(variant)).toBeInTheDocument()
    }
  )

  it('renders testID as data-testid', () => {
    render(<Badge label="Tag" testID="badge-test" />)
    expect(screen.getByTestId('badge-test')).toBeInTheDocument()
  })
})

// ── Card ──────────────────────────────────────────────────────────────────

describe('Card (web)', () => {
  it('renders children', () => {
    render(<Card><p>Content</p></Card>)
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('calls onPress when clicked', () => {
    const onPress = vi.fn()
    render(<Card onPress={onPress}><span>Tap</span></Card>)
    fireEvent.click(screen.getByText('Tap').parentElement!)
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('activates onPress via Enter key', () => {
    const onPress = vi.fn()
    render(<Card onPress={onPress}><span>Tap</span></Card>)
    const card = screen.getByRole('button')
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('activates onPress via Space key', () => {
    const onPress = vi.fn()
    render(<Card onPress={onPress}><span>Tap</span></Card>)
    fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('renders subcomponents', () => {
    render(
      <Card>
        <CardHeader><CardTitle>Title</CardTitle></CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('renders testID as data-testid', () => {
    render(<Card testID="card-test"><span /></Card>)
    expect(screen.getByTestId('card-test')).toBeInTheDocument()
  })
})

// ── EmptyState ────────────────────────────────────────────────────────────

describe('EmptyState (web)', () => {
  it('renders icon, title and description', () => {
    render(
      <EmptyState icon="🗺️" title="No hunts" description="Nothing here yet." />
    )
    expect(screen.getByText('🗺️')).toBeInTheDocument()
    expect(screen.getByText('No hunts')).toBeInTheDocument()
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('renders an action button when action is provided', () => {
    const onPress = vi.fn()
    render(
      <EmptyState
        icon="🔍"
        title="Empty"
        description="No results."
        action={{ label: 'Retry', onPress }}
      />
    )
    const btn = screen.getByRole('button', { name: 'Retry' })
    expect(btn).toBeInTheDocument()
    fireEvent.click(btn)
    expect(onPress).toHaveBeenCalledOnce()
  })

  it('does not render a button when no action is provided', () => {
    render(<EmptyState icon="🗺️" title="Empty" description="No results." />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders testID as data-testid', () => {
    render(
      <EmptyState icon="!" title="T" description="D" testID="empty-test" />
    )
    expect(screen.getByTestId('empty-test')).toBeInTheDocument()
  })
})
