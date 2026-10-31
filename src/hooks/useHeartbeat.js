import { useEffect } from 'react'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const BEAT_MS = 60_000

/**
 * Keeps a visible tab "online" in the admin dashboard while the student reads
 * or thinks and nothing else hits the API. The backend window is 3 minutes
 * (accounts/presence.py).
 *
 * Plain axios on purpose: the shared client's 401 handling redirects to
 * /login, and a background ping must never throw anyone off a page.
 */
export function useHeartbeat() {
  const loggedIn = useAuthStore((s) => !!s.user)

  useEffect(() => {
    if (!loggedIn) return undefined

    const beat = () => {
      const access = localStorage.getItem('access_token')
      if (document.hidden || !access) return
      axios
        .get('/api/auth/ping/', { headers: { Authorization: `Bearer ${access}` } })
        .catch(() => {})
    }

    beat()
    const timer = setInterval(beat, BEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [loggedIn])
}
