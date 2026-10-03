/*
 * Small shared pieces of the VOICE DRIVE screens: the mic-level bars, the car
 * turntable, stat bars and the coin badge.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { Coins } from 'lucide-react'
import CarSvg from './CarSvg'

const BAR_K = [0.55, 0.85, 1, 0.8, 0.6]
const WAVE_CSS = '@keyframes vdWave{0%,100%{height:24%}50%{height:92%}}.vd-wave{animation:vdWave .9s ease-in-out infinite;height:40%}@media (prefers-reduced-motion:reduce){.vd-wave{animation:none}}'

/* Five bars that move with the voice. With no level meter (Android Chrome's own recogniser) they sway by themselves. */
export function LevelBars({ level = 0, active = false, className = '' }) {
  const sway = active && level < 0.02
  return (
    <span className={`flex h-6 items-end gap-[3px] lg:h-9 lg:gap-1 ${className}`} aria-hidden="true">
      {BAR_K.map((k, i) => (
        <span key={i}
          className={`w-[5px] rounded-full bg-gradient-to-t from-rose-500 to-amber-300 lg:w-[7px] ${sway ? 'vd-wave' : 'transition-[height] duration-100'}`}
          style={sway ? { animationDelay: `${i * 0.12}s` } : { height: `${Math.round(18 + Math.min(1, level * 1.6) * 82 * k)}%` }} />
      ))}
      <style>{WAVE_CSS}</style>
    </span>
  )
}

/*
 * The car on a turning platform: side → rear → other side → rear …
 * (a 2D "turntable"), bobbing gently. Still when reduced motion is asked for.
 */
export function Turntable({ model, up, locked = false, glow = '#38bdf8', className = '' }) {
  const reduce = useReducedMotion()
  const [face, setFace] = useState(0)
  const spin = !reduce && !locked
  useEffect(() => {
    if (!spin) return undefined
    const t = setInterval(() => setFace(f => (f + 1) % 4), 2300)
    return () => clearInterval(t)
  }, [spin])
  const f = spin ? face : 0
  const rear = f % 2 === 1
  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute inset-x-[6%] bottom-[2%] h-[26%] rounded-[50%] opacity-70 blur-2xl" style={{ background: glow }} />
      <svg viewBox="0 0 400 60" className="absolute inset-x-0 bottom-0 w-full" aria-hidden="true">
        <ellipse cx="200" cy="34" rx="190" ry="24" fill="#0f172a" />
        <ellipse cx="200" cy="30" rx="190" ry="24" fill="#1e293b" />
        <Motion.ellipse cx="200" cy="30" rx="170" ry="19" fill="none" stroke="#475569" strokeWidth="3" strokeDasharray="14 18"
          animate={spin ? { strokeDashoffset: [0, -64] } : undefined} transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} />
        <ellipse cx="200" cy="30" rx="120" ry="12" fill="none" stroke={glow} strokeOpacity="0.5" strokeWidth="2" />
      </svg>
      <Motion.div className="relative flex aspect-[16/8] items-end justify-center pb-[5%]"
        animate={spin ? { y: [0, -5, 0] } : undefined} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
        <AnimatePresence mode="wait" initial={false}>
          <Motion.div key={f} className={`flex items-end justify-center ${rear ? 'w-[46%]' : 'w-[92%]'}`}
            initial={{ scaleX: 0.08, opacity: 0.4 }} animate={{ scaleX: 1, opacity: 1 }} exit={{ scaleX: 0.08, opacity: 0.4 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}>
            <CarSvg model={model} up={up} locked={locked} view={rear ? 'rear' : 'side'} flip={f === 2} className="w-full drop-shadow-2xl" />
          </Motion.div>
        </AnimatePresence>
      </Motion.div>
    </div>
  )
}

/* 0–5 stat bar for the garage. */
export function StatBar({ label, value, tone = 'from-sky-400 to-indigo-500' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-black uppercase tracking-wider text-white/60 lg:text-sm">
        <span>{label}</span><span className="tabular-nums text-white/80">{value.toFixed(1).replace('.0', '')}/5</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => {
          const fill = Math.max(0, Math.min(1, value - i))
          return (
            <span key={i} className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10 lg:h-3">
              <span className={`block h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${fill * 100}%` }} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

/* The coin bank badge. */
export function CoinBadge({ value, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1.5 text-sm font-black text-amber-300 ring-1 ring-amber-300/30 lg:px-4 lg:py-2 lg:text-lg ${className}`}>
      <Coins size={16} /> <span className="tabular-nums">{value}</span>
    </span>
  )
}
