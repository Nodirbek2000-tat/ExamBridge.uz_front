/* TOBY RUN — small shared pieces of the screens around the run (dark, minimal, one violet accent). */
import { motion as Motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { Coin } from './art'

export const ACCENT = '#A98BFF'
export const CARD = 'rounded-[24px] border border-white/[0.08] bg-[#111118]'
export const LABEL = 'text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 lg:text-xs'

export function CoinPill({ coins, className = '' }) {
  return (
    <span className={`flex h-11 items-center gap-2 rounded-full border border-white/[0.08] bg-[#111118] px-4 text-[15px] font-bold tabular-nums ${className}`}>
      <Coin size={18} />{(coins || 0).toLocaleString('en-US')}
    </span>
  )
}

export function TopBar({ label = 'TOBY RUN', title, coins, onBack, right = null }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <button type="button" onClick={onBack} aria-label="Orqaga"
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-white/[0.06]">
        <ChevronLeft size={21} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={LABEL}>{label}</p>
        <p className="truncate text-base font-bold lg:text-lg">{title}</p>
      </div>
      {right}
      {coins != null && <CoinPill coins={coins} />}
    </div>
  )
}

export function Screen({ children, wide = 'lg:max-w-[1200px]' }) {
  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <div className={`mx-auto w-full max-w-lg px-4 pb-10 pt-[max(14px,env(safe-area-inset-top))] lg:px-8 ${wide}`}>{children}</div>
    </div>
  )
}

/* a row of tabs (segmented control) */
export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div role="tablist" className={`flex gap-1 rounded-[18px] border border-white/[0.08] bg-[#111118] p-1 ${className}`}>
      {tabs.map(t => {
        const on = t.id === value
        return (
          <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.id)}
            className={`relative h-11 min-w-0 flex-1 rounded-[14px] px-2 text-[14px] font-bold transition lg:text-[15px] ${on ? 'text-[#0B0B10]' : 'text-white/60 hover:text-white'}`}>
            {on && <Motion.span layoutId="rn-tab" className="absolute inset-0 rounded-[14px]" style={{ background: ACCENT }} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            <span className="relative truncate">{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/* a thin progress bar */
export function Meter({ value, max, color = ACCENT, className = '' }) {
  const k = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/[0.08] ${className}`}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${k * 100}%`, background: color }} />
    </div>
  )
}
