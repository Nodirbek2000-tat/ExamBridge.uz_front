/*
 * The model voice for the voice games: one fixed voice, so every line is
 * synthesized once on the server, kept in its disk cache and shared by
 * every player. Falls back to the browser's own voice when offline.
 *
 * sayLine() always resolves — when the line ends, fails, or is interrupted by
 * stopVoice() / another sayLine(). A line whose audio is still downloading when
 * it is stopped is never played afterwards (so the mic cannot hear it).
 */
import api from '../../api/client'
import { preloadTts } from '../../utils/ttsPreload'

export const VOICE = 'nova'
export const SPEED = 0.95
const cache = new Map()            // `${voice}:${text}` → object URL (same keys as preloadTts)
let current = null                 // the <audio> playing now
let release = null                 // resolves the sayLine() waiting on it
let generation = 0                 // bumped by every stop, so late downloads are dropped

export function stopVoice() {
  generation++
  try { current?.pause() } catch { /* nothing playing */ }
  current = null
  window.speechSynthesis?.cancel()
  const r = release
  release = null
  r?.()
}

export async function sayLine(text, { rate = 1 } = {}) {
  if (!text) return
  stopVoice()
  const gen = generation
  const key = `${VOICE}:${text}`
  let url = cache.get(key)
  if (!url) {
    try {
      const r = await api.post('/ielts/speaking/tts/', { text, voice: VOICE, speed: SPEED }, { responseType: 'blob' })
      url = URL.createObjectURL(r.data)
      cache.set(key, url)
    } catch {
      url = null
    }
  }
  if (gen !== generation) return                       // stopped while downloading
  await new Promise((resolve) => {
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      if (release === done) release = null
      resolve()
    }
    release = done
    if (url) {
      const el = new Audio(url)
      el.playbackRate = rate
      current = el
      el.onended = () => { if (current === el) current = null; done() }
      el.onerror = done
      el.play().catch(done)
      setTimeout(done, 20000)                          // never wait forever on a broken clip
    } else if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-GB'
      u.rate = 0.95 * rate
      u.onend = done
      u.onerror = done
      window.speechSynthesis.speak(u)
      setTimeout(done, 1500 + text.length * 80)
    } else {
      done()
    }
  })
}

/* Fetch upcoming lines a few at a time; returns a cancel function. */
export function preloadLines(lines) {
  return preloadTts(lines.filter(Boolean), { voice: VOICE, speed: SPEED, cache })
}
