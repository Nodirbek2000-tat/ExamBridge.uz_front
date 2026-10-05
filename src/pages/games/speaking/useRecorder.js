/*
 * Records one reading (up to maxSec) as ONE file.
 *
 *   const rec = useRecorder({ maxSec: 180, onAutoStop: (take, reason) => … })
 *   await rec.start()            // call from the tap (iOS)
 *   const take = await rec.stop() // → { blob, mime, seconds } | null
 *   rec.cancel()                 // throw the take away
 *   rec.state 'idle' | 'starting' | 'recording' · rec.elapsed (s) · rec.level 0–1 · rec.error
 *
 * Why it is built like this (iPhone):
 *  - Safari records 'audio/mp4'; Chrome / Android 'audio/webm;codecs=opus'.
 *  - recorder.start() WITHOUT a timeslice: one piece for the whole reading. Sliced
 *    recordings on iOS come out as fragments whose header announces only the first
 *    seconds, so players and Whisper heard only the beginning.
 *  - No SpeechRecognition runs next to it: on iOS the recogniser ends after a pause
 *    and takes the audio session (and the recording) with it.
 *  - No AudioContext on Apple devices (the level meter is decoration; WebKit has
 *    garbled recordings that shared the mic with Web Audio).
 *  - The mic is released when the take ends, so iOS drops its red recording bar.
 *  - The screen is kept awake while recording (Wake Lock): a C1 text takes over a
 *    minute without a touch, and a dimmed / locked phone would end the take.
 *  - 64 kbps mono is plenty for Whisper and keeps a 3-minute upload around 1.5 MB.
 *  - onAutoStop fires at most once per take, and never after the learner pressed stop.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const isApple = () => {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(ua))
}

export const recorderSupported = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  && typeof window.MediaRecorder !== 'undefined'

function pickMime() {
  const MR = window.MediaRecorder
  if (!MR?.isTypeSupported) return ''
  // (no 'audio/aac': Whisper does not read raw ADTS, and the server refuses it)
  const order = isApple()
    ? ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return order.find((m) => { try { return MR.isTypeSupported(m) } catch { return false } }) || ''
}

function release(s) {
  clearInterval(s.timer)
  if (s.onVis) document.removeEventListener('visibilitychange', s.onVis)
  s.stream?.getTracks().forEach((t) => { t.onended = null; try { t.stop() } catch { /* already stopped */ } })
  s.ctx?.close?.().catch(() => {})
  s.released = true
  s.wake?.release?.().catch(() => {})
  s.wake = null
}

// keep the screen on while reading (Chrome 84+, Safari 16.4+); silently nothing elsewhere
async function keepAwake(s) {
  try {
    const lock = await navigator.wakeLock?.request?.('screen')
    if (!lock) return
    if (s.released) lock.release().catch(() => {})
    else s.wake = lock
  } catch { /* not allowed (battery saver, iframe) — the take still works */ }
}

const BITRATE = 64000

export function useRecorder({ maxSec = 180, onAutoStop } = {}) {
  const [state, setState] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const session = useRef(null)
  const autoStop = useRef(onAutoStop)
  useEffect(() => { autoStop.current = onAutoStop })

  // stop one take → its recording (or null when discarded / empty)
  const end = useCallback((s, { discard = false } = {}) => new Promise((resolve) => {
    if (s.ending) { s.ending.then(resolve); return }
    s.ending = new Promise((done) => {
      const seconds = s.startedAt ? (performance.now() - s.startedAt) / 1000 : 0
      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        release(s)
        if (session.current === s) {
          session.current = null
          setState('idle')
          setLevel(0)
        }
        const type = (s.mime || 'audio/webm').split(';')[0]
        done(discard || !s.chunks.length ? null : { blob: new Blob(s.chunks, { type }), mime: type, seconds })
      }
      if (!s.rec || s.rec.state === 'inactive') { finish(); return }
      // dataavailable (the whole take) arrives before stop; the extra tick is for Safari
      s.rec.onstop = () => setTimeout(finish, 0)
      try { s.rec.stop() } catch { finish() }
      setTimeout(finish, 5000)                                // never hang on a broken recorder
    })
    s.ending.then(resolve)
  }), [])

  const start = useCallback(async () => {
    if (session.current) return false
    setError('')
    if (!recorderSupported()) { setError('unsupported'); return false }
    let ctx = null
    if (!isApple()) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        ctx = AC ? new AC() : null                            // created inside the tap
        ctx?.resume?.().catch(() => {})
      } catch { ctx = null }
    }
    const s = { chunks: [], ctx, rec: null, stream: null, startedAt: 0 }
    session.current = s
    setState('starting')
    setElapsed(0)
    setLevel(0)
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      })
    } catch (e) {
      const name = e?.name || ''
      release(s)
      if (session.current === s) { session.current = null; setState('idle') }
      setError(name === 'NotAllowedError' || name === 'SecurityError' ? 'not-allowed' : 'audio-capture')
      return false
    }
    if (session.current !== s) { release(s); return false }    // cancelled while the browser asked
    const mime = pickMime()
    const tries = [
      mime ? { mimeType: mime, audioBitsPerSecond: BITRATE } : { audioBitsPerSecond: BITRATE },
      mime ? { mimeType: mime } : undefined,
      undefined,
    ]
    for (const opts of tries) {
      try { s.rec = new window.MediaRecorder(s.stream, opts); break } catch { s.rec = null }
    }
    if (!s.rec) {
      release(s)
      session.current = null
      setState('idle')
      setError('unsupported')
      return false
    }
    s.mime = s.rec.mimeType || mime || 'audio/webm'
    s.rec.ondataavailable = (e) => { if (e.data && e.data.size) s.chunks.push(e.data) }
    // the take ended by itself (limit, mic lost, error): hand it over once — unless it was
    // already ending because the learner pressed stop (then stop() returns it)
    const auto = (reason) => {
      if (s.ending) return
      end(s).then((take) => autoStop.current?.(take, reason))
    }
    s.rec.onerror = () => auto('error')
    if (ctx) {
      try {
        s.analyser = ctx.createAnalyser()
        s.analyser.fftSize = 512
        ctx.createMediaStreamSource(s.stream).connect(s.analyser)
        s.buf = new Uint8Array(s.analyser.fftSize)
      } catch { s.analyser = null }
    }
    try {
      s.rec.start()                                           // one piece — see the note at the top
    } catch {
      release(s)
      session.current = null
      setState('idle')
      setError('audio-capture')
      return false
    }
    s.startedAt = performance.now()
    keepAwake(s)
    // the mic was taken away (a call, another app): keep what was read
    s.stream.getAudioTracks().forEach((t) => { t.onended = () => auto('ended') })
    // the app went to the background: iOS stops feeding the mic — start again later
    s.onVis = () => {
      if (document.visibilityState === 'hidden') {
        end(s, { discard: true })
        setError('interrupted')
      }
    }
    document.addEventListener('visibilitychange', s.onVis)
    s.timer = setInterval(() => {
      const sec = (performance.now() - s.startedAt) / 1000
      setElapsed(sec)
      if (s.analyser) {
        s.analyser.getByteTimeDomainData(s.buf)
        let sum = 0
        for (const v of s.buf) sum += ((v - 128) / 128) ** 2
        setLevel(Math.min(1, Math.sqrt(sum / s.buf.length) * 4))
      }
      if (sec >= maxSec) auto('limit')                      // (ticks until the recorder stops: once only)
    }, 100)
    setState('recording')
    return true
  }, [end, maxSec])

  const stop = useCallback(() => (session.current ? end(session.current) : Promise.resolve(null)), [end])
  const cancel = useCallback(() => { if (session.current) end(session.current, { discard: true }) }, [end])
  const clearError = useCallback(() => setError(''), [])

  useEffect(() => () => {
    const s = session.current
    if (s) {
      session.current = null
      try { if (s.rec && s.rec.state !== 'inactive') s.rec.stop() } catch { /* already stopped */ }
      release(s)
    }
  }, [])

  return { start, stop, cancel, clearError, state, elapsed, level, error, supported: recorderSupported() }
}
