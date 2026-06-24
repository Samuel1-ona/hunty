import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'
import type { StorageAdapter } from './useLocalStorage'

// ── in-memory storage adapter ──────────────────────────────────────────────
function makeAdapter(initial: Record<string, string> = {}): StorageAdapter {
  const store = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
  }
}

describe('useLocalStorage', () => {
  it('returns initialValue when storage has no entry', () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() =>
      useLocalStorage('key', 0, adapter)
    )
    expect(result.current[0]).toBe(0)
  })

  it('loads the persisted value from storage on mount', async () => {
    const adapter = makeAdapter({ theme: JSON.stringify('dark') })
    const { result } = renderHook(() =>
      useLocalStorage('theme', 'light', adapter)
    )
    // the useEffect is async, flush it
    await act(async () => {})
    expect(result.current[0]).toBe('dark')
  })

  it('persists the new value when setValue is called', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() =>
      useLocalStorage('count', 0, adapter)
    )

    act(() => { result.current[1](5) })
    expect(result.current[0]).toBe(5)
    expect(JSON.parse(adapter.getItem('count') as string)).toBe(5)
  })

  it('supports functional updater form', () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() =>
      useLocalStorage('n', 1, adapter)
    )

    act(() => { result.current[1]((prev) => prev + 1) })
    expect(result.current[0]).toBe(2)
  })

  it('works with object values', async () => {
    const adapter = makeAdapter()
    const { result } = renderHook(() =>
      useLocalStorage<{ x: number }>('obj', { x: 0 }, adapter)
    )

    act(() => { result.current[1]({ x: 42 }) })
    expect(result.current[0]).toEqual({ x: 42 })
  })

  it('returns initialValue and skips storage when adapter is null', async () => {
    const { result } = renderHook(() =>
      useLocalStorage('key', 'default', null)
    )
    await act(async () => {})
    expect(result.current[0]).toBe('default')

    // setValue should not throw when adapter is null
    act(() => { result.current[1]('changed') })
    expect(result.current[0]).toBe('changed')
  })

  it('keeps initialValue on corrupt JSON in storage', async () => {
    const adapter = makeAdapter({ bad: 'not-json{{{' })
    const { result } = renderHook(() =>
      useLocalStorage('bad', 99, adapter)
    )
    await act(async () => {})
    expect(result.current[0]).toBe(99)
  })
})
