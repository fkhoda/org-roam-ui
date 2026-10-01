import { useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}
// one string snapshot, so React sees a change only when a dimension changes
const snapshot = () => `${window.innerWidth}x${window.innerHeight}`

export function useWindowSize(): [width: number, height: number] {
  const [width, height] = useSyncExternalStore(subscribe, snapshot).split('x').map(Number)
  return [width, height]
}
