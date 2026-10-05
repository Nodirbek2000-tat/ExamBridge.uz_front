/*
 * TOBY'S DAY — small UI pieces shared by the map, play and end screens:
 * the coin, the star (drawn here, not an icon font), n-of-3 medals, the
 * minimal ✓ / ✗ verdict pill on the scene, confetti, and the thin progress bar.
 */
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, RotateCcw, X } from 'lucide-react'

export function Coin({ size = 18, className = '' }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} className={className} aria-hidden>
      <circle r="9" fill="#FACC15" stroke="#EAB308" strokeWidth="1.6" />
      <circle r="5.6" fill="none" stroke="#FEF08A" strokeWidth="1.3" />
      <path d="M-1.6-3.8h3.2v7.6h-3.2z" fill="#CA8A04" />
    </svg>
  )
}

const STAR_D = 'M12 2.2l2.95 6.2 6.8.85-5 4.68 1.3 6.73L12 17.4l-6.05 3.26 1.3-6.73-5-4.68 6.8-.85z'

/* one star: on = gold with a soft highlight, off = a quiet outline */
export function StarIcon({ on = true, size = 16, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <path d={STAR_D} fill={on ? '#FDE047' : 'rgba(255,255,255,0.08)'} stroke={on ? '#F59E0B' : 'rgba(255,255,255,0.25)'} strokeWidth="1.4" strokeLinejoin="round" />
      {on && <path d="M9 9.6l1.6-2.6" stroke="#FEF9C3" strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  )
}

/* n of 3 stars, optionally popping in one by one */
export function Medal({ n = 0, size = 16, pop = false, gap = 'gap-0.5' }) {
  return (
    <span className={`inline-flex items-center ${gap}`} aria-label={`${n} / 3`}>
      {[0, 1, 2].map(i => (
        <Motion.span key={i} className="flex" initial={pop ? { scale: 0, rotate: -40 } : false} animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: pop ? 0.35 + i * 0.22 : 0, type: 'spring', stiffness: 320, damping: 14 }}>
          <StarIcon on={i < n} size={size} />
        </Motion.span>
      ))}
    </span>
  )
}

const VERDICTS = {
  perfect: { ok: true, text: 'A’lo!' },
  good: { ok: true, text: 'Yaxshi!' },
  retry: { ok: true, text: 'Barakalla!' },
  almost: { ok: false, text: 'Deyarli' },
  wrong: { ok: false, text: 'Qaytadan' },
}

/*
 * The ✓ / ✗ of a try: one calm pill in the corner of the scene (the middle stays
 * free for what Toby does) — a round mark, a word, the stars and XP won.
 */
export function Verdict({ verdict, stars = 0, xp = 0, show, reduced = false }) {
  const v = VERDICTS[verdict]
  const tone = v?.ok ? 'bg-emerald-400 text-[#06281B]' : verdict === 'almost' ? 'bg-amber-300 text-[#2B1D02]' : 'bg-rose-400 text-[#3A0A14]'
  return (
    <AnimatePresence>
      {show && v && (
        <Motion.div key={verdict} initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} role="status"
          className="pointer-events-none flex items-center gap-2 rounded-full bg-[#0B0B10]/75 py-1.5 pl-1.5 pr-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md lg:gap-3 lg:py-2 lg:pl-2 lg:pr-5">
          <Motion.span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full lg:h-11 lg:w-11 ${tone}`}
            initial={reduced ? false : { scale: 0.4, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
            {v.ok ? <Check className="h-[58%] w-[58%]" strokeWidth={3.2} /> : verdict === 'almost' ? <RotateCcw className="h-[50%] w-[50%]" strokeWidth={2.8} /> : <X className="h-[54%] w-[54%]" strokeWidth={3.2} />}
          </Motion.span>
          <span className="text-[15px] font-extrabold text-white lg:text-[20px]">{v.text}</span>
          {v.ok && stars > 0 && <Medal n={stars} size={17} pop={!reduced} gap="gap-0.5" />}
          {/* a phone scene is short: the pill stays small there and keeps clear of Toby */}
          {v.ok && xp > 0 && <span className="hidden text-[12.5px] font-bold tabular-nums text-white/55 sm:inline lg:text-[15px]">+{xp} XP</span>}
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
          <Motion.span key={i} className={`absolute left-1/2 top-1/2 h-2 w-2 ${i % 3 ? 'rounded-[2px]' : 'rounded-full'}`}
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

/* thin progress bar (one accent colour; pass `color` for another) */
export function Bar({ pct, color = '#FFB020', height = 'h-1.5', reduced, track = 'bg-white/[0.08]' }) {
  return (
    <div className={`${height} w-full overflow-hidden rounded-full ${track}`}>
      <Motion.div className="h-full rounded-full" style={{ background: color }} initial={false}
        animate={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }} transition={{ duration: reduced ? 0 : 0.6, ease: 'easeOut' }} />
    </div>
  )
}
