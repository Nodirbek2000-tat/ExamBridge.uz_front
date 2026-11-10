import { useSyncExternalStore } from 'react'

// One stable subscribe function per query, so React does not resubscribe on every render.
const subscribers = new Map()

function subscribeTo(query) {
  if (!subscribers.has(query)) subscribers.set(query, makeSubscribe(query))
  return subscribers.get(query)
}

function makeSubscribe(query) {
  return (onChange) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }
}

/** Live boolean for a CSS media query. */
export function useMedia(query, serverValue = false) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'
export const FINE_POINTER = '(hover: hover) and (pointer: fine)'

export const useReducedMotion = () => useMedia(REDUCED_MOTION)
