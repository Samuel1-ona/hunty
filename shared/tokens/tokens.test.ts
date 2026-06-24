/**
 * Unit tests for shared tokens and type exports.
 * Validates the structure and invariants of the design token objects.
 */
import { describe, it, expect } from 'vitest'
import { colors } from './colors'
import { spacing, radius } from './spacing'
import { fontSizes, fontWeights, lineHeights } from './typography'
import * as sharedIndex from '../index'

// ── Colors ────────────────────────────────────────────────────────────────

describe('colors token', () => {
  it('has a primary color that is a valid hex string', () => {
    expect(colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('has all required semantic colors', () => {
    const required = ['primary', 'secondary', 'success', 'warning', 'error', 'info'] as const
    for (const key of required) {
      expect(colors[key]).toBeTruthy()
    }
  })

  it('has dark-mode variants for semantic colors', () => {
    expect(colors.primaryDark).toBeTruthy()
    expect(colors.secondaryDark).toBeTruthy()
  })

  it('has all badge variant color pairs', () => {
    const variants = ['primary', 'success', 'warning', 'error', 'gray'] as const
    for (const v of variants) {
      const bgKey = `badge${v.charAt(0).toUpperCase() + v.slice(1)}` as keyof typeof colors
      const textKey = `badge${v.charAt(0).toUpperCase() + v.slice(1)}Text` as keyof typeof colors
      expect(colors[bgKey]).toBeTruthy()
      expect(colors[textKey]).toBeTruthy()
    }
  })
})

// ── Spacing ───────────────────────────────────────────────────────────────

describe('spacing token', () => {
  it('has numeric values for all keys', () => {
    for (const val of Object.values(spacing)) {
      expect(typeof val).toBe('number')
    }
  })

  it('is monotonically increasing', () => {
    const values = Object.values(spacing)
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
    }
  })

  it('spacing[4] equals 16 (standard base-4 unit)', () => {
    expect(spacing[4]).toBe(16)
  })
})

describe('radius token', () => {
  it('full radius is a large number representing pill shape', () => {
    expect(radius.full).toBeGreaterThan(100)
  })

  it('none is zero', () => {
    expect(radius.none).toBe(0)
  })
})

// ── Typography ────────────────────────────────────────────────────────────

describe('fontSizes token', () => {
  it('has numeric values', () => {
    for (const val of Object.values(fontSizes)) {
      expect(typeof val).toBe('number')
    }
  })

  it('md (body) size is 16px', () => {
    expect(fontSizes.md).toBe(16)
  })
})

describe('fontWeights token', () => {
  it('values are numeric strings', () => {
    for (const val of Object.values(fontWeights)) {
      expect(Number.isInteger(Number(val))).toBe(true)
    }
  })

  it('bold is 700', () => {
    expect(fontWeights.bold).toBe('700')
  })
})

describe('lineHeights token', () => {
  it('all line-heights are greater than their matching font sizes', () => {
    // every line-height key maps to a value larger than the same-key font size
    for (const key of Object.keys(fontSizes) as Array<keyof typeof fontSizes>) {
      if (key in lineHeights) {
        expect(lineHeights[key as keyof typeof lineHeights]).toBeGreaterThanOrEqual(fontSizes[key])
      }
    }
  })
})

// ── Barrel exports ────────────────────────────────────────────────────────

describe('shared/index barrel', () => {
  it('re-exports colors', () => {
    expect(sharedIndex.colors).toBeDefined()
  })

  it('re-exports spacing and radius', () => {
    expect(sharedIndex.spacing).toBeDefined()
    expect(sharedIndex.radius).toBeDefined()
  })

  it('re-exports fontSizes, fontWeights, lineHeights', () => {
    expect(sharedIndex.fontSizes).toBeDefined()
    expect(sharedIndex.fontWeights).toBeDefined()
    expect(sharedIndex.lineHeights).toBeDefined()
  })

  it('re-exports hooks', () => {
    expect(sharedIndex.useCountdown).toBeDefined()
    expect(sharedIndex.useLocalStorage).toBeDefined()
  })
})
