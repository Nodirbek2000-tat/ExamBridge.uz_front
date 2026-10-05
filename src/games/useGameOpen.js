/*
 * Tell the platform that a game was opened (admin → Games shows the counts).
 * Call once in the game's root component: useGameOpen('tobys-day').
 * Fire-and-forget; the server also ignores repeats within a minute.
 */
import { useEffect } from 'react'
import api from '../api/client'

function signedIn() {
  try {
    return Boolean(localStorage.getItem('access_token'))
  } catch {
    return false
  }
}

export function useGameOpen(slug) {
  useEffect(() => {
    // a guest has nothing to count — and a 401 would send them to /login
    if (!slug || !signedIn()) return
    api.post('/games/stats/open/', { slug }).catch(() => {})
  }, [slug])
}
