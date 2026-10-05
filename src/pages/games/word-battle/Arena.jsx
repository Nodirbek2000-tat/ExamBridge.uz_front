/*
 * The fight on top of the play screen: the two bears, their scores, the 7-second ring between
 * them and the combo meter. The ring runs on requestAnimationFrame and writes to the DOM
 * directly, so a question never re-renders React sixty times a second.
 */
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Bear } from './Bears'
import { ACCENT, RIVAL, fmtNum } from './theme'

const R = 40
const C = 2 * Math.PI * R

/* timer: { endAt (performance.now ms), total (ms) } · running: count down · onTick(secondsLeft) · onEnd() */
export function TimerRing({ timer, running, onTick, onEnd, listening, className = '' }) {
  const arc = useRef(null)
  const text = useRef(null)
  const cbs = useRef({ onTick, onEnd })
  useEffect(() => { cbs.current = { onTick, onEnd } })

  useEffect(() => {
    if (!timer || !arc.current || !text.current) return undefined
    const { endAt, total } = timer
    let raf = 0
    let lastSec = null
    let ended = false
    const paint = () => {
      const left = endAt - performance.now()
      const frac = Math.max(0, Math.min(1, left / total))
      arc.current.style.strokeDashoffset = String(C * (1 - frac))
      const sec = Math.max(0, Math.min(Math.ceil(total / 1000), Math.ceil(left / 1000)))
      if (sec !== lastSec) {
        lastSec = sec
        text.current.textContent = String(sec)
        const col = sec <= 1 ? '#FB7185' : sec <= 3 ? '#F5B14C' : ACCENT
        arc.current.setAttribute('stroke', col)
        if (running) cbs.current.onTick?.(sec)
      }
      if (!running) return
      if (left <= 0) {
        if (!ended) { ended = true; cbs.current.onEnd?.() }
        return
      }
      raf = requestAnimationFrame(paint)
    }
    paint()
    return () => cancelAnimationFrame(raf)
  }, [timer, running])

  return (
    <div className={`relative flex items-center justify-center ${className}`} role="timer" aria-live="off">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="#0B0B10" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle ref={arc} cx="50" cy="50" r={R} fill="none" stroke={ACCENT} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset="0" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span ref={text} className={`text-[26px] font-black tabular-nums leading-none text-white sm:text-[32px] ${listening ? 'opacity-0' : ''}`}>
          {timer ? Math.ceil(timer.total / 1000) : ''}
        </span>
        {listening && (
          <span className="absolute flex items-end gap-[3px]" aria-label="Tinglang">
            {[0, 1, 2, 3].map(i => (
              <span key={i} className="wb-wave w-[4px] rounded-full bg-[#5CC2FF]" style={{ height: 18, animationDelay: `${i * 0.12}s` }} />
            ))}
          </span>
        )}
      </span>
    </div>
  )
}

export function ComboMeter({ streak, align = 'left' }) {
  const hot = streak >= 3
  return (
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`} aria-label={hot ? `Seriya ${streak}: ×1.5` : `Seriya ${streak} / 3`}>
      {[0, 1, 2].map(i => (
        <span key={i} className={`h-1.5 w-4 rounded-full transition-colors duration-300 sm:w-5 ${i < Math.min(3, streak) ? (hot ? 'bg-[#F5B14C]' : 'bg-[#5CC2FF]') : 'bg-white/[0.1]'}`} />
      ))}
      <span className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-black tabular-nums transition-all duration-300 ${hot
        ? 'bg-[#F5B14C]/15 text-[#FFD08A] shadow-[0_0_18px_-4px_rgba(245,177,76,.8)]' : 'text-white/30'}`}>
        ×1.5
      </span>
    </div>
  )
}

function Side({ side, name, badge, score, gain, pose, dim, answered, streak, children }) {
  const me = side === 'me'
  return (
    <div className={`flex w-full min-w-0 max-w-[132px] flex-col sm:max-w-[200px] lg:max-w-[224px] ${me ? 'items-start justify-self-end' : 'items-end justify-self-start'}`}>
      <div className="relative w-full">
        <Bear kind={me ? 'polar' : 'brown'} pose={pose} flip={!me} dim={dim} />
        <AnimatePresence>
          {answered && (
            <Motion.span key="ans" initial={{ opacity: 0, y: 6, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className={`absolute top-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-bold ${me ? 'left-0' : 'right-0'}
                border-[#FF9F43]/40 bg-[#1A140E] text-[#FFC48A]`}>
              javob berdi
            </Motion.span>
          )}
        </AnimatePresence>
        {dim && (
          <span className="absolute inset-0 flex items-center justify-center text-[34px] font-black text-white/50">?</span>
        )}
        {/* a phone has no room for the badge beside the name: it becomes a name plate on the bear */}
        {badge && (
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.1] bg-[#0B0B10]/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/60 sm:hidden">
            {badge}
          </span>
        )}
      </div>
      <div className={`mt-1.5 flex w-full items-center gap-1.5 ${me ? '' : 'flex-row-reverse'}`}>
        <span className="truncate text-[13px] font-semibold text-white/80 sm:text-[14px]">{name}</span>
        {badge && <span className="hidden flex-shrink-0 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/45 sm:inline">{badge}</span>}
      </div>
      <div className={`relative flex w-full items-baseline gap-2 ${me ? '' : 'flex-row-reverse'}`}>
        <Motion.span key={score} initial={{ scale: 1.18 }} animate={{ scale: 1 }} transition={{ duration: 0.3 }}
          className="text-[24px] font-black tabular-nums leading-tight sm:text-[30px]" style={{ color: me ? '#fff' : '#FFD9B5' }}>
          {fmtNum(score)}
        </Motion.span>
        <AnimatePresence>
          {gain && gain.n > 0 && (
            <Motion.span key={gain.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: -4 }} exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.35 }} className="text-[14px] font-black tabular-nums" style={{ color: me ? ACCENT : RIVAL }}>
              +{gain.n}
            </Motion.span>
          )}
        </AnimatePresence>
      </div>
      {me && streak != null && <div className="mt-1"><ComboMeter streak={streak} /></div>}
      {children}
    </div>
  )
}

/* shot: { from: 'me' | 'opp', id } — the thrown ball (snowball from the polar bear, honey from the brown one) */
export function Arena({ me, opp, center, shot, reduced }) {
  return (
    <div className="relative mx-auto w-full max-w-[860px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[78%] bg-[radial-gradient(closest-side_at_24%_50%,rgba(92,194,255,0.11),transparent),radial-gradient(closest-side_at_76%_50%,rgba(255,159,67,0.08),transparent)]" />
      <div className="relative grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 sm:gap-10">
        <Side side="me" {...me} />
        <div className="flex flex-col items-center pt-4 sm:pt-10">{center}</div>
        <Side side="opp" {...opp} />
        <AnimatePresence>
          {shot && !reduced && (
            <Motion.span key={shot.id} aria-hidden="true"
              className="pointer-events-none absolute top-[22%] z-20 h-5 w-5 rounded-full sm:h-7 sm:w-7"
              style={{
                background: shot.from === 'me' ? 'radial-gradient(circle at 35% 35%, #fff, #BFE7FF 55%, #5CC2FF)' : 'radial-gradient(circle at 35% 35%, #FFE3B8, #FFB255 55%, #E07B1A)',
                boxShadow: `0 0 22px ${shot.from === 'me' ? 'rgba(92,194,255,.8)' : 'rgba(255,159,67,.8)'}`,
              }}
              initial={{ left: shot.from === 'me' ? '26%' : '70%', opacity: 0, scale: 0.6 }}
              animate={{ left: shot.from === 'me' ? '72%' : '24%', opacity: [0, 1, 1, 0], scale: [0.6, 1, 1.1, 1.8] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.36, ease: 'easeIn', times: [0, 0.12, 0.82, 1] }} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
