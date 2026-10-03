/*
 * TOBY'S DAY — the big mic of the play screen and the status line above it.
 *
 * One tap opens the mic; it closes by itself when the line is heard. While it
 * listens: a yellow ring runs down the time left, a red glow and little bars
 * follow the voice (the bars keep a gentle wave when the browser gives no
 * level, e.g. Android Chrome).
 */
import { motion as Motion } from 'framer-motion'
import { Loader2, Mic, MicOff } from 'lucide-react'

/* state: 'idle' | 'listening' | 'busy' | 'disabled' · ms: listening time (time ring) · runKey: restarts the ring */
export function PlayMic({ state = 'idle', onPress, level = 0, ms = 0, runKey = 0, label, reduced = false }) {
  const listening = state === 'listening'
  const busy = state === 'busy'
  const disabled = state === 'disabled'
  const lv = Math.min(1, level)
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[92px] w-[92px] sm:h-[100px] sm:w-[100px] lg:h-[128px] lg:w-[128px]">
        {state === 'idle' && !reduced && [0, 1].map(i => (
          <Motion.span key={i} className="absolute inset-0 rounded-full bg-sky-400/35"
            initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 1, ease: 'easeOut' }} />
        ))}
        {listening && (
          <span className="absolute inset-0 rounded-full bg-rose-500/35 transition-transform duration-100 ease-out"
            style={{ transform: `scale(${1.06 + lv * 0.6})` }} />
        )}
        {listening && ms > 0 && (
          <svg className="pointer-events-none absolute -inset-[8px] h-[calc(100%+16px)] w-[calc(100%+16px)] -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="3.5" />
            <Motion.circle key={runKey} cx="50" cy="50" r="47" fill="none" stroke="#FDE047" strokeWidth="3.5" strokeLinecap="round"
              initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: ms / 1000, ease: 'linear' }} />
          </svg>
        )}
        <Motion.button type="button" onClick={onPress} disabled={disabled || busy}
          whileTap={disabled || busy ? undefined : { scale: 0.92 }}
          aria-label={listening ? 'To‘xtatish' : 'Gapirish'}
          className={`relative flex h-full w-full items-center justify-center rounded-full text-white shadow-2xl ring-4 transition-colors
            ${listening ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-600/40 ring-rose-200/40'
              : busy ? 'cursor-wait bg-gradient-to-br from-sky-500 to-indigo-600 ring-sky-200/25'
                : disabled ? 'cursor-not-allowed bg-slate-600/70 ring-white/10'
                  : 'bg-gradient-to-br from-sky-400 to-indigo-600 shadow-sky-500/40 ring-white/25 hover:brightness-110'}`}>
          {busy ? <Loader2 className="h-[40%] w-[40%] animate-spin" />
            : disabled ? <MicOff className="h-[40%] w-[40%]" />
              : (
                <Motion.span className="flex h-[44%] w-[44%]" animate={listening && !reduced ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={listening ? { duration: 0.9, repeat: Infinity } : { duration: 0.2 }}>
                  <Mic className="h-full w-full" strokeWidth={2.4} />
                </Motion.span>
              )}
        </Motion.button>
      </div>
      {label && <p className="mt-2 text-[13px] font-bold text-white/75 lg:mt-3 lg:text-lg">{label}</p>}
    </div>
  )
}

const BARS = [0.45, 0.8, 1, 0.7, 0.95, 0.6, 0.4]

/* "I can hear you": little bars that follow the mic level */
export function VoiceBars({ level = 0, reduced = false }) {
  const quiet = level < 0.04
  return (
    <span className="ml-2 inline-flex h-5 items-center gap-[3px] align-middle lg:h-7 lg:gap-1" aria-hidden>
      {BARS.map((k, i) => (
        <Motion.span key={i} className="h-full w-[3px] rounded-full bg-rose-300 lg:w-[4px]" style={{ originY: 0.5 }}
          initial={false}
          animate={quiet ? (reduced ? { scaleY: 0.3 } : { scaleY: [0.2, 0.5, 0.2] }) : { scaleY: Math.max(0.18, Math.min(1, level * k * 2.4)) }}
          transition={quiet && !reduced ? { duration: 1, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' } : { duration: 0.1 }} />
      ))}
    </span>
  )
}

const TONES = { calm: 'text-white/65', live: 'text-rose-100', info: 'text-sky-200', warn: 'text-amber-200', bad: 'text-rose-200', good: 'text-emerald-300' }

/* the line above the mic: what is happening now, and what was heard */
export function PlayStatus({ text, tone = 'calm', sub, meter = false, level = 0, reduced }) {
  return (
    <div className="flex min-h-[42px] flex-col items-center justify-center px-2 text-center lg:min-h-[64px]" aria-live="polite">
      <p className={`line-clamp-2 text-[15px] font-bold leading-snug lg:text-xl ${TONES[tone] || TONES.calm}`}>
        {text}{meter && <VoiceBars level={level} reduced={reduced} />}
      </p>
      {sub && <p className="mt-0.5 line-clamp-1 max-w-full text-[13px] font-semibold italic text-white/50 lg:mt-1 lg:text-base">{sub}</p>}
    </div>
  )
}
