/* Small shared pieces of the Speaking game: top bar, badges, buttons, card. */
import { ChevronLeft, Loader2 } from 'lucide-react'
import { tone } from './theme'

export function TopBar({ onBack, title, right, backLabel = 'Orqaga' }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 bg-[#0B0B10]/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex h-10 items-center gap-3">
        {onBack && (
          <button type="button" onClick={onBack} aria-label={backLabel}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-[#17171F] hover:text-white">
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/90">{title}</div>
        {right}
      </div>
    </header>
  )
}

const LEVEL_TEXT = { A: 'text-emerald-300', B: 'text-sky-300', C: 'text-violet-300' }
export function LevelBadge({ level, className = '' }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 text-[12px] font-bold tracking-wide ${LEVEL_TEXT[level?.[0]] || 'text-white/70'} ${className}`}>
      {level}
    </span>
  )
}

export function ScoreBadge({ score, className = '' }) {
  const t = tone(score)
  return (
    <span className={`inline-flex h-6 min-w-[2.75rem] items-center justify-center rounded-md border px-1.5 text-[12px] font-bold tabular-nums ${t.soft} ${t.ring} ${t.text} ${className}`}>
      {score}%
    </span>
  )
}

export function PrimaryButton({ children, onClick, disabled, busy, className = '' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] px-6 text-[16px] font-bold text-white shadow-[0_12px_32px_-14px_rgba(124,58,237,0.9)] transition hover:bg-[#8B5CF6] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
      {busy && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, disabled, className = '' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111118] px-5 text-[15px] font-semibold text-white/85 transition hover:bg-[#17171F] disabled:opacity-50 ${className}`}>
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-white/[0.08] bg-[#111118] ${className}`}>{children}</div>
}
