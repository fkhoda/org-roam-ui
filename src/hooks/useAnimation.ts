import { useCallback, useEffect, useRef } from 'react'

/**
 * Runs `onFrame(progress)` on every animation frame for `duration` ms, with `progress` going
 * from 0 to 1 through `easing`. Returns [start, cancel]; starting again restarts it.
 */
export function useAnimation(
  onFrame: (progress: number) => void,
  { duration, easing }: { duration: number; easing: (t: number) => number },
) {
  const frame = useRef(0)
  const latest = useRef({ onFrame, duration, easing })
  useEffect(() => {
    latest.current = { onFrame, duration, easing }
  })

  const cancel = useCallback(() => cancelAnimationFrame(frame.current), [])
  const start = useCallback(() => {
    cancelAnimationFrame(frame.current)
    const begin = performance.now()
    const tick = (now: number) => {
      const { onFrame, duration, easing } = latest.current
      const t = duration > 0 ? Math.min((now - begin) / duration, 1) : 1
      onFrame(easing(t))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => cancel, [cancel])
  return [start, cancel] as const
}
