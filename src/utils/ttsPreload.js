import api from '../api/client'

// A few requests in flight at once. Sending every examiner line together
// (20–30 requests per learner) used to tie up the backend's worker threads,
// so two or three people starting a speaking test froze the site for everyone.
const CONCURRENCY = 3

/**
 * Fetch examiner TTS clips in the order they will be spoken, a few at a time.
 *
 * `cache` is the component's Map of `${voice}:${text}` → object URL; lines
 * already in it are skipped. Returns a cancel function for useEffect cleanup,
 * so leaving the page stops queueing new requests.
 */
export function preloadTts(texts, { voice, speed, cache }) {
  const queue = [...texts]
  let cancelled = false

  const next = () => {
    while (!cancelled && queue.length) {
      const text = queue.shift()
      const key = `${voice}:${text}`
      if (cache.has(key)) continue
      api.post('/ielts/speaking/tts/', { text, voice, speed }, { responseType: 'blob' })
        .then((r) => { cache.set(key, URL.createObjectURL(r.data)) })
        .catch(() => {})
        .finally(next)
      return
    }
  }

  for (let i = 0; i < CONCURRENCY; i++) next()
  return () => { cancelled = true }
}
