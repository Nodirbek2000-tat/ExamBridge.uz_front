/*
 * Plays the learner's recording: the whole take, or exactly one word (by its Whisper times).
 *
 *   const p = useClipPlayer(blob, { duration })
 *   p.toggle() · p.seek(sec) · p.playRange(start, end) · p.pause()
 *   p.playing ('full' | 'range' | false) · p.time · p.duration · p.peaks (0–1 bars, or null) · p.ready
 *
 * An <audio> element (not Web Audio) so the iPhone silent switch behaves like every
 * other sound on the site. Chrome's recordings carry no duration (it reads Infinity and
 * seeking fails) — jumping far ahead once makes the browser measure the file.
 * The waveform comes from decoding the file; if the browser cannot decode it the
 * caller draws bars from the word times instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { stopVoice } from '../../../games/voice/voiceTts'

const BARS = 72

function peaksOf(buffer, n = BARS) {
  const data = buffer.getChannelData(0)
  const step = Math.max(1, Math.floor(data.length / n))
  const out = []
  for (let b = 0; b < n; b++) {
    let sum = 0
    const from = b * step
    const to = Math.min(data.length, from + step)
    for (let k = from; k < to; k += 16) sum += data[k] * data[k]
    out.push(Math.sqrt(sum / Math.max(1, (to - from) / 16)))
  }
  const max = Math.max(...out, 1e-4)
  return out.map(v => Math.max(0.06, Math.sqrt(v / max)))
}

// decoded at 16 kHz in an offline context: a 3-minute take is ~11 MB of samples instead of
// ~35 MB at 48 kHz (and no live audio context is opened); older Safari falls back
function decodeContext() {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext
  if (OAC) { try { return new OAC(1, 1, 16000) } catch { /* rate not supported */ } }
  const AC = window.AudioContext || window.webkitAudioContext
  return AC ? new AC() : null
}

async function decodePeaks(blob) {
  const ctx = decodeContext()
  if (!ctx) return null
  try {
    const buf = await blob.arrayBuffer()
    const audio = await new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(buf, resolve, reject)   // callback form for older Safari
      if (p?.then) p.then(resolve, reject)
    })
    return { peaks: peaksOf(audio), duration: audio.duration }
  } finally {
    ctx.close?.().catch(() => {})
  }
}

export function useClipPlayer(blob, { duration: hint = 0 } = {}) {
  const audio = useRef(null)
  const rangeEnd = useRef(null)
  const raf = useRef(0)
  const pending = useRef(null)                                // a word tapped before the file was ready
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [measured, setMeasured] = useState(0)
  const [peaks, setPeaks] = useState(null)

  useEffect(() => {
    if (!blob) return undefined
    let alive = true
    const url = URL.createObjectURL(blob)
    const el = new Audio()
    el.preload = 'auto'
    let fixing = false
    const known = () => Number.isFinite(el.duration) && el.duration > 0
    el.onloadedmetadata = () => {
      if (known()) { setMeasured(el.duration); setReady(true); return }
      fixing = true
      try { el.currentTime = 1e7 } catch { setReady(true) }
    }
    el.ondurationchange = () => {
      if (!known()) return
      setMeasured(el.duration)
      if (fixing) {
        fixing = false
        try { el.currentTime = 0 } catch { /* ignore */ }
      }
      setReady(true)
    }
    el.onended = () => { rangeEnd.current = null; setPlaying(false) }
    el.onpause = () => { if (!fixing) setPlaying(p => (p === 'range' && rangeEnd.current ? p : false)) }
    el.onerror = () => { setFailed(true); setPlaying(false) }
    el.src = url
    try { el.load() } catch { /* ignore */ }                  // iOS ignores preload until asked
    audio.current = el
    decodePeaks(blob).then((r) => {
      if (!alive || !r) return
      setPeaks(r.peaks)
      if (r.duration) setMeasured(m => m || r.duration)
    }).catch(() => {})
    return () => {
      alive = false
      cancelAnimationFrame(raf.current)
      el.onloadedmetadata = el.ondurationchange = el.onended = el.onpause = el.onerror = null
      try { el.pause() } catch { /* ignore */ }
      el.removeAttribute('src')
      URL.revokeObjectURL(url)
      if (audio.current === el) audio.current = null
    }
  }, [blob])

  const run = useCallback((mode) => {
    const el = audio.current
    if (!el) return
    setPlaying(mode)
    const tick = () => {
      if (audio.current !== el) return
      setTime(el.currentTime)
      if (rangeEnd.current != null && el.currentTime >= rangeEnd.current) {
        rangeEnd.current = null
        el.pause()
        setPlaying(false)
        return
      }
      if (!el.paused) raf.current = requestAnimationFrame(tick)
    }
    const p = el.play()
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(tick)
    if (p?.catch) p.catch(() => { rangeEnd.current = null; setPlaying(false) })
  }, [])

  const pause = useCallback(() => {
    rangeEnd.current = null
    pending.current = null
    try { audio.current?.pause() } catch { /* ignore */ }
    setPlaying(false)
  }, [])

  const toggle = useCallback(() => {
    const el = audio.current
    if (!el) return
    if (playing) { pause(); return }
    stopVoice()
    rangeEnd.current = null
    if (el.ended || (Number.isFinite(el.duration) && el.currentTime >= el.duration - 0.05)) el.currentTime = 0
    run('full')
  }, [playing, pause, run])

  const seek = useCallback((sec) => {
    const el = audio.current
    if (!el) return
    rangeEnd.current = null
    try { el.currentTime = Math.max(0, sec) } catch { /* not seekable yet */ }
    setTime(Math.max(0, sec))
  }, [])

  // exactly one word: a little air before and after (Whisper's word times are often a
  // little tight), so the first and last sounds are not clipped
  const playRange = useCallback((start, end) => {
    const el = audio.current
    if (!el || start == null || end == null) return
    stopVoice()
    // before the length is known a seek is ignored (iOS) or undone by the length fix (Chrome),
    // and the take would play from 0:00 — wait for it
    if (!ready) { pending.current = [start, end]; setPlaying('range'); return }
    try { el.currentTime = Math.max(0, start - 0.1) } catch { return }
    rangeEnd.current = Math.max(end + 0.18, start + 0.5)          // a word is never shorter than ~0.4 s
    run('range')
  }, [run, ready])

  useEffect(() => {
    if (!ready || !pending.current) return
    const [start, end] = pending.current
    pending.current = null
    playRange(start, end)
  }, [ready, playRange])

  return {
    ready, failed, playing, time, peaks, toggle, seek, pause, playRange,
    duration: measured || hint || 0,
    available: !!blob && !failed,
  }
}
