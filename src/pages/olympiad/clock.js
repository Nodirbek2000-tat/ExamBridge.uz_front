/**
 * Olympiad clock — counts against the SERVER's time, not the device's, so a
 * student whose computer clock is a few minutes off still starts with
 * everyone else. Every olympiad response carries `server_now`.
 */
import { useEffect, useState } from 'react'

let offsetMs = 0

export function syncServerClock(serverNowIso) {
  if (serverNowIso) offsetMs = new Date(serverNowIso).getTime() - Date.now()
}

export const serverNow = () => Date.now() + offsetMs

/** Re-renders every `everyMs` and returns the server-corrected "now". */
export function useNow(everyMs = 1000) {
  const [now, setNow] = useState(serverNow())
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

export function splitDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

export function shortUntil(ms) {
  const { d, h, m, s } = splitDuration(ms)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  if (m) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export const pad = (n) => String(n).padStart(2, '0')

export function whenLabel(iso) {
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export const elapsedLabel = (sec) => (sec == null ? '—' : `${Math.floor(sec / 60)}:${pad(sec % 60)}`)
