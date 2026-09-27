import { useState, useEffect } from 'react'

/**
 * Platform-agnostic localStorage wrapper.
 * Falls back gracefully when `window.localStorage` is unavailable (SSR/mobile).
 *
 * On mobile, consumers should pass an async storage adapter via the optional
 * `storage` argument rather than relying on `window.localStorage`.
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
}

const webStorage: StorageAdapter | null =
  typeof window !== 'undefined' ? window.localStorage : null

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  storage: StorageAdapter | null = webStorage
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    if (!storage) return

    const load = async () => {
      try {
        const item = await storage.getItem(key)
        if (item != null) setStoredValue(JSON.parse(item) as T)
      } catch {
        // keep initialValue on parse errors
      }
    }

    void load()
  }, [key, storage])

  const setValue = (value: T | ((prev: T) => T)) => {
    const next = value instanceof Function ? value(storedValue) : value
    setStoredValue(next)
    if (storage) {
      void storage.setItem(key, JSON.stringify(next))
    }
  }

  return [storedValue, setValue]
}
