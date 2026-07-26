import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @sentry/nextjs so the test suite doesn't require the package to be installed
vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((cb: (s: unknown) => void) => cb({ setExtra: vi.fn(), setTag: vi.fn() })),
  setUser: vi.fn(),
  replayIntegration: vi.fn(() => ({})),
}))

import { scrubPII, captureException, captureMessage } from '../errorTracking'

// Stellar test keys (valid format: G + 55 chars of [A-Z2-7])
const WALLET_A = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI'
const WALLET_B = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37'

describe('scrubPII', () => {
  it('replaces Stellar wallet addresses with [WALLET_REDACTED]', () => {
    const input = `Player ${WALLET_A} completed the hunt`
    const result = scrubPII(input)
    expect(result).toBe('Player [WALLET_REDACTED] completed the hunt')
  })

  it('replaces multiple wallet addresses in one string', () => {
    const input = `${WALLET_A} traded with ${WALLET_B}`
    const result = scrubPII(input)
    expect(result).toBe('[WALLET_REDACTED] traded with [WALLET_REDACTED]')
  })

  it('replaces email addresses with [EMAIL_REDACTED]', () => {
    const input = 'Contact us at support@hunty.app or admin@example.com'
    const result = scrubPII(input)
    expect(result).toBe('Contact us at [EMAIL_REDACTED] or [EMAIL_REDACTED]')
  })

  it('scrubs wallet addresses from nested objects', () => {
    const input = { user: { address: WALLET_A, name: 'Alice' }, score: 42 }
    const result = scrubPII(input) as typeof input
    expect(result.user.address).toBe('[WALLET_REDACTED]')
    expect(result.user.name).toBe('Alice')
    expect(result.score).toBe(42)
  })

  it('scrubs wallet addresses from arrays', () => {
    const input = [WALLET_A, 'some text', WALLET_B]
    const result = scrubPII(input) as string[]
    expect(result[0]).toBe('[WALLET_REDACTED]')
    expect(result[1]).toBe('some text')
    expect(result[2]).toBe('[WALLET_REDACTED]')
  })

  it('does not modify strings that contain no PII', () => {
    const clean = 'The quick brown fox jumps over the lazy dog'
    expect(scrubPII(clean)).toBe(clean)
  })

  it('handles null and undefined without throwing', () => {
    expect(scrubPII(null)).toBeNull()
    expect(scrubPII(undefined)).toBeUndefined()
  })

  it('handles numbers and booleans without throwing', () => {
    expect(scrubPII(42)).toBe(42)
    expect(scrubPII(true)).toBe(true)
  })

  it('scrubs wallet addresses inside deeply nested structures', () => {
    const input = {
      level1: {
        level2: {
          wallet: WALLET_A,
          note: `Owner: ${WALLET_B}`,
        },
      },
    }
    const result = scrubPII(input) as typeof input
    expect(result.level1.level2.wallet).toBe('[WALLET_REDACTED]')
    expect(result.level1.level2.note).toBe('Owner: [WALLET_REDACTED]')
  })

  it('scrubs both wallets and emails in mixed content', () => {
    const input = `Wallet ${WALLET_A} belongs to user@example.com`
    const result = scrubPII(input)
    expect(result).toBe('Wallet [WALLET_REDACTED] belongs to [EMAIL_REDACTED]')
  })
})

describe('captureException (no DSN)', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Ensure NEXT_PUBLIC_SENTRY_DSN is not set
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    // Spy on console.error (used by logger.error in non-production)
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('calls logger.error when no DSN is configured', () => {
    const err = new Error('test error')
    captureException(err)
    // Should have logged via console (logger delegates to console.error)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('does not leak wallet address in the logged message', () => {
    const err = new Error(`Transaction failed for ${WALLET_A}`)
    captureException(err)
    const calls = errorSpy.mock.calls.flat().map(String).join(' ')
    expect(calls).not.toContain(WALLET_A)
  })
})

describe('captureMessage (no DSN)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  let infoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    infoSpy.mockRestore()
  })

  it('calls logger.warn for warning level', () => {
    captureMessage('something sketchy', 'warning')
    expect(warnSpy).toHaveBeenCalled()
  })

  it('calls logger.info for info level', () => {
    captureMessage('just info')
    expect(infoSpy).toHaveBeenCalled()
  })

  it('scrubs wallet address from message before logging', () => {
    captureMessage(`User ${WALLET_A} joined`, 'info')
    const allCalls = infoSpy.mock.calls.flat().map(String).join(' ')
    expect(allCalls).not.toContain(WALLET_A)
    expect(allCalls).toContain('[WALLET_REDACTED]')
  })
})
