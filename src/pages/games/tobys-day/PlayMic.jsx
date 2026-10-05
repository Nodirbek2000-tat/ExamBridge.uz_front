/*
 * TOBY'S DAY — the listening controls of the play screen, minimal but alive:
 *
 *  <Waveform>   a real-time waveform drawn from the HISTORY of the mic level
 *               (useSpeech().level, sampled 20×/s and scrolled left). Where the
 *               browser gives no level (Android Chrome's own recogniser), every
 *               newly recognised word sends a short decaying pulse instead — so
 *               the line only moves when something was really heard.
 *  <PlayMic>    one clean round button: idle (accent) · listening (a thin ring
 *               runs down the time left) · busy (checking) · disabled.
 *  <MicStatus>  one short line above it: Tinglayapman… / Tekshirilmoqda… / ✓ / ✗.
 */
import { useEffect, useRef } from 'react'
import { motion as Motion } from 'framer-motion'
import { Check, Mic, MicOff, X } from 'lucide-react'

export const ACCENT = '#FFB020'
const SAMPLE_MS = 50
const BARS = 56

/*
 * active: the mic is open · level: 0–1 · pulse: a number that changes whenever new
 * words were recognised · tone: 'live' | 'ok' | 'bad' | 'idle' (colour)
 */
export function Waveform({ active, level = 0, pulse = 0, tone = 'live', className = '' }) {
  const canvas = useRef(null)
  const live = useRef({ level: 0, pulse: 0, active: false, tone: 'live' })
  const loop = useRef(null)
  const repaint = useRef(null)

  // the drawing loop reads these between renders
  useEffect(() => { live.current.level = level; live.current.active = active; live.current.tone = tone })
  useEffect(() => { if (pulse) live.current.pulse = 0.85 }, [pulse])

  useEffect(() => {
    const cv = canvas.current
    const ctx = cv?.getContext?.('2d')
    if (!ctx) return undefined
    const hist = new Float32Array(BARS)
    let raf = 0
    let last = 0
    let w = 0
    let h = 0
    const resize = () => {
      const r = cv.getBoundingClientRect()
      const d = Math.min(2, window.devicePixelRatio || 1)
      w = r.width
      h = r.height
      cv.width = Math.max(1, Math.round(w * d))
      cv.height = Math.max(1, Math.round(h * d))
      ctx.setTransform(d, 0, 0, d, 0, 0)
      paint()
    }
    const colour = () => {
      const t = live.current.tone
      return t === 'ok' ? '52,211,153' : t === 'bad' ? '251,113,133' : t === 'idle' ? '255,255,255' : '255,176,32'
    }
    function paint() {
      if (!w || !h) return
      ctx.clearRect(0, 0, w, h)
      const step = w / BARS
      const bw = Math.max(2, Math.min(4, step * 0.5))
      const mid = h / 2
      const rgb = colour()
      for (let i = 0; i < BARS; i++) {
        const v = hist[i]
        const bh = Math.max(2, v * (h - 4))
        const a = live.current.active ? 0.25 + 0.75 * (i / BARS) : 0.18
        ctx.fillStyle = `rgba(${rgb},${v > 0.02 ? a : a * 0.6})`
        const x = i * step + (step - bw) / 2
        const y = mid - bh / 2
        const r = Math.min(bw / 2, bh / 2)
        ctx.beginPath()
        if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, r)
        else ctx.rect(x, y, bw, bh)
        ctx.fill()
      }
    }
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (now - last < SAMPLE_MS) return
      last = now
      const s = live.current
      // one new sample on the right: the real level (lifted a little — speech rarely passes 0.6), or a word pulse
      let v = s.active ? Math.min(1, Math.sqrt(Math.max(0, s.level)) * 1.15) : 0
      if (s.active && s.pulse > 0.03) v = Math.max(v, s.pulse)
      s.pulse *= 0.78
      hist.copyWithin(0, 1)
      hist[BARS - 1] = v
      paint()
      // nothing moving any more: stop until the mic opens again
      if (!s.active && hist.every(x => x < 0.01)) { cancelAnimationFrame(raf); raf = 0; hist.fill(0); paint() }
    }
    loop.current = () => { if (!raf) raf = requestAnimationFrame(tick) }
    repaint.current = () => { if (!raf) paint() }        // a new colour while nothing moves
    let ro = null
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(resize); ro.observe(cv) }
    resize()
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); loop.current = null; repaint.current = null }
  }, [])

  useEffect(() => { if (active) loop.current?.() }, [active])
  useEffect(() => { repaint.current?.() }, [tone])

  return <canvas ref={canvas} className={`block h-8 w-full lg:h-10 ${className}`} aria-hidden />
}

/* state: 'idle' | 'listening' | 'busy' | 'disabled' | 'locked' (needs a picture first) · ms: listening time · runKey restarts the ring */
export function PlayMic({ state = 'idle', onPress, ms = 0, runKey = 0, reduced = false }) {
  const listening = state === 'listening'
  const busy = state === 'busy'
  const off = state === 'disabled'
  const locked = state === 'locked'
  const label = listening ? 'To‘xtatish' : 'Gapirish'
  return (
    <div className="relative h-[74px] w-[74px] lg:h-[92px] lg:w-[92px]">
      {/* the time left: a thin ring that runs down */}
      <svg className="pointer-events-none absolute -inset-[5px] h-[calc(100%+10px)] w-[calc(100%+10px)] -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        {listening && ms > 0 && (
          <Motion.circle key={runKey} cx="50" cy="50" r="48" fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: reduced ? 0 : ms / 1000, ease: 'linear' }} />
        )}
        {busy && !reduced && (
          <Motion.circle cx="50" cy="50" r="48" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="60 242"
            style={{ originX: '50px', originY: '50px' }} animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} />
        )}
      </svg>
      <Motion.button type="button" onClick={onPress} disabled={off || busy}
        whileTap={off || busy ? undefined : { scale: 0.94 }}
        aria-label={label}
        className={`relative flex h-full w-full items-center justify-center rounded-full transition-colors duration-200
          ${listening ? 'bg-[#F43F5E] text-white shadow-[0_8px_30px_rgba(244,63,94,0.35)]'
            : busy ? 'cursor-wait bg-[#17171F] text-white/70'
              : off ? 'cursor-not-allowed bg-white/[0.06] text-white/30'
                : locked ? 'bg-white/[0.08] text-white/45'
                  : 'bg-[#FFB020] text-[#1A1203] shadow-[0_8px_30px_rgba(255,176,32,0.28)] hover:brightness-105'}`}>
        {off ? <MicOff className="h-[34%] w-[34%]" strokeWidth={2.2} />
          : listening ? <span className="h-[26%] w-[26%] rounded-[5px] bg-white" />
            : <Mic className="h-[36%] w-[36%]" strokeWidth={2.3} />}
      </Motion.button>
    </div>
  )
}

const TONES = { calm: 'text-white/55', live: 'text-white', info: 'text-white/70', warn: 'text-amber-200', bad: 'text-rose-300', good: 'text-emerald-300' }

/* the one line above the mic: what is happening now (+ what was heard) */
export function MicStatus({ text, tone = 'calm', sub, mark = null }) {
  return (
    <div className="flex min-h-[40px] flex-col items-center justify-center px-2 text-center lg:min-h-[52px]" aria-live="polite">
      <p className={`flex items-center justify-center gap-1.5 text-[14.5px] font-semibold leading-snug lg:text-[17px] ${TONES[tone] || TONES.calm}`}>
        {mark === 'ok' && <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#06281B]"><Check size={13} strokeWidth={3.2} /></span>}
        {mark === 'bad' && <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-rose-400 text-[#3A0A14]"><X size={13} strokeWidth={3.2} /></span>}
        <span className="line-clamp-2">{text}</span>
      </p>
      {sub && <p className="mt-0.5 line-clamp-1 max-w-full text-[12.5px] font-medium italic text-white/45 lg:text-[14px]">{sub}</p>}
    </div>
  )
}
