/*
 * Listening for the voice games — two layers, so the learner is always heard:
 *
 *  1. The browser's own recogniser (Chrome / Edge / Android Chrome): free, instant.
 *  2. The server (Whisper), from a recording made at the same time — used when the
 *     browser has no recogniser (Safari, Firefox, Yandex Browser…), when its speech
 *     service fails, or when it returned nothing although the mic clearly heard speech.
 *
 *   const { listen, stop, prime, listening, busy, interim, error, supported, level, mode } = useSpeech()
 *   prime()                                   // call from the mic tap: opens the mic inside the gesture (iOS needs it)
 *   const { alternatives, error } = await listen({ maxMs: 8000 })
 *
 * - Non-continuous (default): ends when the learner stops talking.
 * - continuous: keeps listening until maxMs or until onInterim(alts) returns true —
 *   use it to react the moment the right words are heard. ALWAYS also judge the
 *   alternatives the promise resolves with: in server mode they arrive only at the end.
 * - stop() ends early; stop({ discard: true }) also skips the server (nobody needs the result).
 * - level (0–1) moves with the voice; busy is true while the server is transcribing.
 * - useSpeech({ game: 'runner' }) tags server clips with the game (per-game cost counter);
 *   error 'limit' = the server's daily allowance is used up (switch to a no-mic mode, don't retry).
 * - Server mode records each phrase as its own clip; stop() / the time limit wait for phrases
 *   still being transcribed and also send the unfinished last one, so nothing said is lost.
 * - On Android the mic is not opened twice (it can break the recogniser): the
 *   recording/level layer starts only once the browser recogniser has failed.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'

const Ctor = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null)
const canRecord = () => typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')
// the page can listen when either layer works
export const speechSupported = () => !!Ctor() || canRecord()

// errors that mean "this device cannot listen" rather than "nothing was said"
export const FATAL = new Set(['not-allowed', 'audio-capture', 'unsupported'])
// browser recogniser failures the server can make up for
const SERVICE_ERRORS = new Set(['network', 'service-not-allowed', 'language-not-supported', 'start-failed', 'bad-grammar'])

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported(m)) || ''
}

async function transcribeOnServer(blob, game) {
  if (!blob || blob.size < 1200) return ''                 // shorter than a word
  const fd = new FormData()
  fd.append('audio', blob, `clip.${blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`)
  if (game) fd.append('game', game)                        // per-game cost counter on the server
  try {
    const r = await api.post('/games/voice/transcribe/', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 25000 })
    return String(r.data?.text || '').trim()
  } catch (e) {
    // 429 = today's allowance (the learner's or the site's) is used up — retrying will not help
    if (e?.response?.status === 429) throw Object.assign(new Error('limit'), { code: 'limit' })
    throw e
  }
}

export function useSpeech({ lang = 'en-US', game } = {}) {
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const [level, setLevel] = useState(0)
  const [mode, setMode] = useState(Ctor() ? 'browser' : 'server')
  const modeRef = useRef(mode)
  const genRef = useRef(0)                                  // the latest listen; older ones may not touch state
  const finishRef = useRef(null)
  const mic = useRef({ stream: null, ctx: null, analyser: null, buf: null })

  // one microphone stream per page — asked for once, reused for every line
  const ensureMic = useCallback(async () => {
    const m = mic.current
    if (!(m.stream && m.stream.getTracks().some(t => t.readyState === 'live'))) {
      m.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      m.analyser = null
      try {
        const AC = window.AudioContext || window.webkitAudioContext
        if (AC) {
          m.ctx = m.ctx || new AC()
          m.analyser = m.ctx.createAnalyser()
          m.analyser.fftSize = 512
          m.ctx.createMediaStreamSource(m.stream).connect(m.analyser)
          m.buf = new Uint8Array(m.analyser.fftSize)
        }
      } catch { m.analyser = null }                         // the level meter is optional
    }
    if (m.ctx?.state === 'suspended') m.ctx.resume().catch(() => {})
    return m
  }, [])

  // Open the mic inside a user gesture (tap). Needed on iOS for the level meter; harmless elsewhere.
  // Resolves with the mic, or null when it was not opened (not needed here, or refused — then `error` is set too).
  const prime = useCallback(() => {
    if (!canRecord() || (isAndroid() && modeRef.current === 'browser')) return Promise.resolve(null)
    return ensureMic().catch((e) => {
      const name = e?.name || ''
      if (name === 'NotAllowedError' || name === 'SecurityError') setError('not-allowed')
      else if (name === 'NotFoundError') setError('audio-capture')
      return null
    })
  }, [ensureMic])

  const readLevel = () => {
    const m = mic.current
    if (!m.analyser) return 0
    m.analyser.getByteTimeDomainData(m.buf)
    let sum = 0
    for (const v of m.buf) sum += ((v - 128) / 128) ** 2
    return Math.min(1, Math.sqrt(sum / m.buf.length) * 4)
  }

  const stop = useCallback((opts) => { finishRef.current?.(opts) }, [])

  const listen = useCallback(({ maxMs = 8000, continuous = false, onInterim } = {}) => new Promise((resolve) => {
    finishRef.current?.({ discard: true })                  // one listener at a time
    const gen = ++genRef.current
    const mine = () => gen === genRef.current
    const SR = Ctor()
    let useServer = modeRef.current === 'server' || !SR     // becomes true if the browser service fails mid-way
    let done = false
    let err = ''
    let recorder = null                                     // { r: MediaRecorder, chunks: Blob[] } — the clip being recorded now
    let rec = null
    let heardSpeech = false                                 // a voice was heard in the current clip
    let silentSince = 0
    let interimText = ''
    let started = Date.now()
    const finals = []
    const timers = []
    const pending = new Set()                               // phrase clips still being transcribed
    let phraseFailed = false                                // a phrase upload failed (not the same as silence)
    let phraseLimit = false                                 // …because the daily allowance is used up

    const build = () => {
      const n = Math.max(1, ...finals.map(f => f.length))
      const alts = []
      for (let k = 0; k < n; k++) alts.push([...finals.map(f => f[k] ?? f[0]), interimText].join(' ').replace(/\s+/g, ' ').trim())
      return [...new Set(alts)].filter(Boolean)
    }
    // Every clip gets its own MediaRecorder: only a recorder's first chunk carries the file header
    // (webm / mp4), so a clip cut from the middle of a recording could not be decoded.
    const newRecorder = (stream) => {
      const mime = pickMime()
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const clip = { r, chunks: [] }
      r.ondataavailable = (e) => { if (e.data?.size) clip.chunks.push(e.data) }
      r.start(250)
      return clip
    }
    const stopRecorder = (clip) => new Promise((res) => {
      const make = () => (clip?.chunks.length ? new Blob(clip.chunks, { type: clip.r.mimeType || 'audio/webm' }) : null)
      if (!clip || clip.r.state === 'inactive') return res(make())
      clip.r.onstop = () => res(make())
      try { clip.r.stop() } catch { res(make()) }
    })

    // continuous + server: the phrase just ended — keep recording into a fresh clip, transcribe this one
    const sendPhrase = (stream) => {
      const old = recorder
      try { recorder = newRecorder(stream) } catch { recorder = null }
      heardSpeech = false
      silentSince = 0
      const job = stopRecorder(old)
        .then(blob => transcribeOnServer(blob, game))
        .then((text) => {
          if (!text) return
          finals.push([text])                               // kept even if listening ends meanwhile — finish() waits for it
          if (done) return
          const alts = build()
          if (mine()) setInterim(alts[0] || '')
          if (onInterim && onInterim(alts)) finish({ discard: true })   // matched: no more server work
        })
        .catch((e) => { phraseFailed = true; if (e?.code === 'limit') phraseLimit = true })
        .finally(() => {
          pending.delete(job)
          if (mine() && !done && !pending.size) setBusy(false)
        })
      pending.add(job)
      if (mine()) setBusy(true)
    }

    // the recording + level layer (opened at once, except on Android while the browser recogniser works)
    const startRecording = () => {
      if (!canRecord() || recorder) return
      ensureMic().then((m) => {
        if (done || recorder) return
        try { recorder = newRecorder(m.stream) } catch { recorder = null }
        timers.push(setInterval(() => {
          const lv = readLevel()
          if (mine()) setLevel(lv)
          if (lv > 0.12) { heardSpeech = true; silentSince = 0 } else if (heardSpeech && !silentSince) silentSince = Date.now()
          if (!useServer) return
          if (heardSpeech && silentSince && Date.now() - silentSince > 900) {
            if (!continuous) { finish(); return }
            // continuous in server mode: transcribe each phrase as it ends and let the caller decide
            if (recorder) sendPhrase(m.stream)
          }
          if (!continuous && !heardSpeech && Date.now() - started > Math.min(maxMs, 6000)) { err = err || 'no-speech'; finish() }
        }, 100))
      }).catch((e) => {
        const name = e?.name || ''
        if (name === 'NotAllowedError' || name === 'SecurityError') err = 'not-allowed'
        else if (name === 'NotFoundError') err = 'audio-capture'
        // any other hiccup (device busy, AudioContext) only costs the recording layer
        if (useServer || FATAL.has(err)) finish()
      })
    }

    const finish = async ({ discard = false } = {}) => {
      if (done) return
      done = true
      timers.forEach(t => clearInterval(t))
      if (finishRef.current === finish) finishRef.current = null
      if (rec) {
        rec.onend = null
        rec.onresult = null
        rec.onerror = null
        try { rec.stop() } catch { /* already stopped */ }
      }
      const blob = await stopRecorder(recorder)
      if (mine()) { setListening(false); setLevel(0) }
      // phrases already on their way to the server still count (a stop() right after speaking must not lose them)
      if (!discard && pending.size) {
        if (mine()) setBusy(true)
        await Promise.race([Promise.allSettled([...pending]), new Promise(r => setTimeout(r, 15000))])
      }
      let alts = build()
      // layer 2: the browser heard nothing usable but the mic did hear a voice (or the browser cannot recognise);
      // in continuous server mode also the last phrase, cut short by stop() / the time limit
      const browserFailed = useServer || SERVICE_ERRORS.has(err) || (!alts.length && heardSpeech)
      const tail = useServer && continuous && heardSpeech
      if (!discard && blob && !FATAL.has(err) && ((!alts.length && browserFailed) || tail)) {
        if (mine()) setBusy(true)
        try {
          const text = await transcribeOnServer(blob, game)
          if (text) { finals.push([text]); alts = build(); err = '' } else if (!alts.length && !err) err = 'no-speech'
        } catch (e) {
          if (!alts.length) err = e?.code === 'limit' ? 'limit' : err || 'server-failed'
        }
      }
      if (SERVICE_ERRORS.has(err) && modeRef.current !== 'server' && canRecord()) {
        modeRef.current = 'server'                          // this browser's recogniser is broken — use the server from now on
        setMode('server')
        if (!alts.length) err = 'retry'                     // nothing was recorded this time; the next try will work
      }
      if (mine()) { setBusy(false); setInterim('') }
      if (FATAL.has(err) && mine()) setError(err)
      if (!alts.length && !err) err = phraseLimit ? 'limit' : phraseFailed ? 'server-failed' : 'no-speech'
      resolve({ alternatives: alts, error: alts.length ? '' : err })
    }
    finishRef.current = finish

    setError('')
    setInterim('')
    setBusy(false)
    setListening(true)

    if (!useServer) {
      rec = new SR()
      rec.lang = lang
      rec.continuous = continuous
      rec.interimResults = true
      rec.maxAlternatives = 3
      rec.onresult = (e) => {
        interimText = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finals.push(Array.from(r).map(a => String(a.transcript || '').trim()).filter(Boolean))
          else interimText += r[0]?.transcript || ''
        }
        const alts = build()
        if (mine()) setInterim(alts[0] || '')
        if (onInterim && onInterim(alts)) finish({ discard: true })   // matched: no more server work
      }
      rec.onsoundstart = () => { heardSpeech = true }
      rec.onerror = (e) => {
        err = e?.error || 'error'
        if (SERVICE_ERRORS.has(err)) { useServer = true; startRecording() }   // keep listening — through the server
      }
      rec.onend = () => {
        if (done) return
        // Chrome stops after a pause even in continuous mode — keep going until time is up
        if (continuous && !useServer && !FATAL.has(err)) {
          try { rec.start(); return } catch { /* fall through */ }
        }
        if (useServer && recorder && continuous) return      // the recording layer carries on
        finish()
      }
      try {
        rec.start()
      } catch {
        err = 'start-failed'
        useServer = true
      }
    }
    if (useServer || !isAndroid()) startRecording()
    timers.push(setTimeout(() => finish(), maxMs))
    started = Date.now()
  }), [lang, game, ensureMic])

  useEffect(() => () => {
    finishRef.current?.({ discard: true })
    const m = mic.current
    m.stream?.getTracks().forEach(t => t.stop())
    m.ctx?.close?.().catch(() => {})
  }, [])

  return { listen, stop, prime, listening, busy, interim, error, supported: speechSupported(), level, mode }
}
