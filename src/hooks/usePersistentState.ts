import { useCallback, useState } from 'react'

function read<V>(key: string, fallback: V): V {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw === 'undefined') return fallback
    const stored = JSON.parse(raw) as V
    // settings objects gain new keys over time: keep the defaults for keys not stored yet
    const isObject = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v)
    return isObject(stored) && isObject(fallback) ? { ...fallback, ...stored } : stored
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or blocked: the setting just won't survive a reload
  }
}

/** `useState` that survives reloads, stored as JSON in localStorage under `key`. */
export function usePersistentState<V>(key: string, initial: V) {
  const [value, setValue] = useState<V>(() => read(key, initial))
  const set = useCallback(
    (next: V | ((current: V) => V)) => {
      setValue((current) => {
        const value = next instanceof Function ? next(current) : next
        write(key, value)
        return value
      })
    },
    [key],
  )
  return [value, set] as const
}

export type Setter<V> = (next: V | ((current: V) => V)) => void
