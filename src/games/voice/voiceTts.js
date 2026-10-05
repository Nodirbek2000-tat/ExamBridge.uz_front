/*
 * Voices for the voice games. Every line is synthesized once on the server,
 * kept in its disk cache and shared by every player; falls back to the
 * browser's own voice when offline.
 *
 * sayLine(text)                     — the default narrator voice
 * sayLine(text, { voice: 'toby' })  — a character: toby, girl, boy, mum, teacher,
 *                                     man, grandma, driver, coach, narrator
 *
 * sayLine() always resolves — when the line ends, fails, or is interrupted by
 * stopVoice() / another sayLine(). A line whose audio is still downloading when
 * it is stopped is never played afterwards (so the mic cannot hear it).
 */
import api from '../../api/client'
import { preloadTts } from '../../utils/ttsPreload'

export const VOICE = 'nova'
export const SPEED = 0.95
export const CHARACTERS = ['toby', 'girl', 'boy', 'mum', 'teacher', 'man', 'grandma', 'driver', 'coach', 'narrator']
// the browser's own voice can at least sound younger / older when the server is unreachable
const PITCH = { toby: 1.5, girl: 1.4, boy: 1.25, grandma: 0.95, man: 0.8, driver: 0.75, coach: 0.9 }
const cache = new Map()            // `${voice}:${text}` → object URL (same keys as preloadTts)
const fetchClip = (text, voice) => (voice
  ? api.post('/games/voice/tts/', { text, voice }, { responseType: 'blob' })
  : api.post('/ielts/speaking/tts/', { text, voice: VOICE, speed: SPEED }, { responseType: 'blob' }))
let current = null                 // the <audio> playing now
let release = null                 // resolves the sayLine() waiting on it
let generation = 0                 // bumped by every stop, so late downloads are dropped

/*
 * One shared <audio> for every line. iPhone Safari only lets an element start
 * sound inside a tap; once an element has played from a tap, it may play later
 * lines from timers too (a character's question, Toby answering after a pass).
 * So the first tap anywhere plays a tiny silent clip on it. (Web Audio would
 * also work but is muted by the iPhone's silent switch; <audio> is not.)
 */
let player = null
let unlocked = false
const audioEl = () => {
  if (!player && typeof Audio !== 'undefined') {
    player = new Audio()
    player.preload = 'auto'
  }
  return player
}
function silentWavUrl() {
  const n = 800                                        // 0.1 s of silence at 8 kHz, 16-bit mono
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const tag = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  tag(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); tag(8, 'WAVE'); tag(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  tag(36, 'data'); v.setUint32(40, n * 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}
const GESTURES = ['pointerdown', 'touchend', 'keydown']
function unlockAudio() {
  if (unlocked) return
  const el = audioEl()
  if (!el) return
  unlocked = true
  GESTURES.forEach(ev => document.removeEventListener(ev, unlockAudio, true))
  if (current === el) return                           // a line is already playing on it
  try {
    el.src = silentWavUrl()
    el.play().catch(() => { unlocked = false })        // not a real gesture yet — try again on the next one
  } catch { unlocked = false }
}
if (typeof document !== 'undefined') {
  GESTURES.forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true, passive: true }))
}

export function stopVoice() {
  generation++
  try { current?.pause() } catch { /* nothing playing */ }
  current = null
  window.speechSynthesis?.cancel()
  const r = release
  release = null
  r?.()
}

export async function sayLine(text, { rate = 1, voice } = {}) {
  if (!text) return
  stopVoice()
  const gen = generation
  const key = `${voice || VOICE}:${text}`
  let url = cache.get(key)
  if (!url) {
    try {
      const r = await fetchClip(text, voice)
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
    const el = url && audioEl()
    if (el) {
      el.onended = () => { if (current === el) current = null; done() }
      el.onerror = done
      el.src = url
      el.playbackRate = rate
      current = el
      el.play().catch(done)
      setTimeout(done, 20000)                          // never wait forever on a broken clip
    } else if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-GB'
      u.rate = 0.95 * rate
      u.pitch = PITCH[voice] || 1
      u.onend = done
      u.onerror = done
      window.speechSynthesis.speak(u)
      setTimeout(done, 1500 + text.length * 80)
    } else {
      done()
    }
  })
}

/* Fetch upcoming lines a few at a time; returns a cancel function.
   Lines are strings (narrator) or { text, voice } for a character. */
export function preloadLines(lines) {
  const plain = lines.filter(l => typeof l === 'string' && l)
  const voiced = lines.filter(l => l && typeof l === 'object' && l.text && l.voice)
  const cancelPlain = preloadTts(plain, { voice: VOICE, speed: SPEED, cache })
  let cancelled = false
  const queue = [...voiced]
  const next = () => {
    while (!cancelled && queue.length) {
      const { text, voice } = queue.shift()
      const key = `${voice}:${text}`
      if (cache.has(key)) continue
      fetchClip(text, voice)
        .then((r) => { cache.set(key, URL.createObjectURL(r.data)) })
        .catch(() => {})
        .finally(next)
      return
    }
  }
  next()
  next()                                               // two character clips in flight at once
  return () => { cancelled = true; cancelPlain() }
}
