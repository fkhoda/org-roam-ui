import { useCallback, useState } from 'react'

interface History<T> {
  past: T[]
  present: T
  future: T[]
}

/** A value with browser-like back/forward history. */
export function useHistory<T>(initial: T) {
  const [history, setHistory] = useState<History<T>>({ past: [], present: initial, future: [] })

  const set = useCallback(
    (value: T) =>
      setHistory(({ past, present }) =>
        value === present
          ? { past, present, future: [] }
          : { past: [...past, present], present: value, future: [] },
      ),
    [],
  )
  const back = useCallback(
    () =>
      setHistory(({ past, present, future }) =>
        past.length
          ? {
              past: past.slice(0, -1),
              present: past[past.length - 1],
              future: [present, ...future],
            }
          : { past, present, future },
      ),
    [],
  )
  const forward = useCallback(
    () =>
      setHistory(({ past, present, future }) =>
        future.length
          ? { past: [...past, present], present: future[0], future: future.slice(1) }
          : { past, present, future },
      ),
    [],
  )

  return {
    value: history.present,
    set,
    back,
    forward,
    canBack: history.past.length > 0,
    canForward: history.future.length > 0,
  }
}
