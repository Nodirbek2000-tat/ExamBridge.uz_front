/*
 * TOBY'S DAY — small UI pieces shared by the map, play and end screens.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, Star } from 'lucide-react'

export function Coin({ size = 18, className = '' }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} className={className} aria-hidden>
      <circle r="9" fill="#FACC15" stroke="#EAB308" strokeWidth="1.6" />
      <circle r="5.6" fill="none" stroke="#FEF08A" strokeWidth="1.3" />
      <path d="M-1.6-3.8h3.2v7.6h-3.2z" fill="#CA8A04" />
    </svg>
  )
}

/* n of 3 stars, optionally popping in one by one */
export function Medal({ n = 0, size = 16, pop = false, gap = 'gap-0.5' }) {
  return (
    <span className={`inline-flex items-center ${gap}`} aria-label={`${n} / 3`}>
      {[0, 1, 2].map(i => (
        <Motion.span key={i} initial={pop ? { scale: 0, rotate: -40 } : false} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: pop ? 0.35 + i * 0.22 : 0, type: 'spring', stiffness: 320, damping: 14 }}>
          <Star size={size} className={i < n ? 'fill-yellow-300 text-yellow-300 drop-shadow' : 'fill-white/10 text-white/25'} />
        </Motion.span>
      ))}
    </span>
  )
}

/* ✓ for a line that passed after a failed try — worth 1 star (VerdictBurst always shows 2–3) */
export function RetryBurst({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <Motion.div key="retry" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }} className="pointer-events-none flex flex-col items-center gap-2">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-2xl">
            <Check size={44} strokeWidth={3} />
          </span>
          <span className="rounded-full bg-black/40 px-4 py-1 text-lg font-black text-white backdrop-blur">Barakalla!</span>
          <Medal n={1} size={26} pop />
        </Motion.div>
      )}
    </AnimatePresence>
  )
}

const CONFETTI = ['#FDE047', '#F472B6', '#A5F3FC', '#86EFAC', '#C4B5FD', '#FDBA74', '#93C5FD']

/* one burst of confetti from the middle of its (relative) parent — remount (key) to fire again */
export function ConfettiBurst({ reduced, n = 18, spread = 120 }) {
  if (reduced) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.25
        const d = spread * (0.6 + (i % 4) * 0.18)
        return (
          <Motion.span key={i} className={`absolute left-1/2 top-1/2 h-2.5 w-2.5 ${i % 3 ? 'rounded-[3px]' : 'rounded-full'}`}
            style={{ background: CONFETTI[i % CONFETTI.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.5 }}
            animate={{ x: Math.cos(a) * d, y: [0, Math.sin(a) * d - 34, Math.sin(a) * d + 46], opacity: [1, 1, 0], rotate: 300 + i * 37, scale: 1 }}
            transition={{ duration: 1.25, ease: 'easeOut' }} />
        )
      })}
    </div>
  )
}

/* confetti falling through its (relative, overflow-hidden) parent, again and again */
export function ConfettiRain({ reduced, n = 22, height = 560 }) {
  if (reduced) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <Motion.span key={i} className={`absolute top-0 ${i % 4 === 0 ? 'h-2 w-2 rounded-full' : 'h-3 w-1.5 rounded-sm'}`}
          style={{ left: `${(i * 37 + 7) % 97}%`, background: CONFETTI[i % CONFETTI.length] }}
          initial={{ y: -24, opacity: 0, rotate: 0 }}
          animate={{ y: [-24, height], x: [0, (i % 2 ? 14 : -14), 0], opacity: [0, 1, 1, 0.2], rotate: i % 2 ? 540 : -540 }}
          transition={{ duration: 2.8 + (i % 5) * 0.35, delay: (i % 8) * 0.3, repeat: Infinity, repeatDelay: 0.4 + (i % 3) * 0.5, ease: 'linear' }} />
      ))}
    </div>
  )
}

/* thin progress bar */
export function Bar({ pct, className = 'from-sky-400 to-violet-500', height = 'h-2', reduced }) {
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-white/10`}>
      <Motion.div className={`h-full rounded-full bg-gradient-to-r ${className}`} initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }} />
    </div>
  )
}
