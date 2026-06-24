import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountdown } from './useCountdown'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useCountdown', () => {
  it('returns null when endUnixSeconds is undefined', () => {
    const { result } = renderHook(() => useCountdown(undefined))
    expect(result.current).toBeNull()
  })

  it('returns null when endUnixSeconds is null', () => {
    const { result } = renderHook(() => useCountdown(null))
    expect(result.current).toBeNull()
  })

  it('returns null when deadline is in the past', () => {
    const past = Math.floor(Date.now() / 1000) - 60
    const { result } = renderHook(() => useCountdown(past))
    expect(result.current).toBeNull()
  })

  it('formats seconds-only countdown (< 60 s remaining)', () => {
    const end = Math.floor(Date.now() / 1000) + 45
    const { result } = renderHook(() => useCountdown(end))
    expect(result.current).toBe('45s')
  })

  it('formats minutes+seconds countdown (< 1 h remaining)', () => {
    const end = Math.floor(Date.now() / 1000) + 125 // 2m 5s
    const { result } = renderHook(() => useCountdown(end))
    expect(result.current).toBe('2m 5s')
  })

  it('formats hours+minutes+seconds countdown (>= 1 h remaining)', () => {
    const end = Math.floor(Date.now() / 1000) + 3661 // 1h 1m 1s
    const { result } = renderHook(() => useCountdown(end))
    expect(result.current).toBe('1h 1m 1s')
  })

  it('ticks down every second', () => {
    const end = Math.floor(Date.now() / 1000) + 5
    const { result } = renderHook(() => useCountdown(end))
    expect(result.current).toBe('5s')

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe('4s')

    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe('3s')
  })

  it('becomes null when the countdown expires', () => {
    const end = Math.floor(Date.now() / 1000) + 2
    const { result } = renderHook(() => useCountdown(end))
    expect(result.current).toBe('2s')

    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current).toBeNull()
  })

  it('resets when endUnixSeconds changes', () => {
    const firstEnd = Math.floor(Date.now() / 1000) + 10
    const { result, rerender } = renderHook(
      ({ end }) => useCountdown(end),
      { initialProps: { end: firstEnd } }
    )
    expect(result.current).toBe('10s')

    const secondEnd = Math.floor(Date.now() / 1000) + 30
    rerender({ end: secondEnd })
    expect(result.current).toBe('30s')
  })
})
