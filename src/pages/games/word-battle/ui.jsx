/* Small shared pieces of Word Battle: top bar, buttons, card, sound switch. */
import { useState } from 'react'
import { ChevronLeft, Loader2, Volume2, VolumeX } from 'lucide-react'
import { setSound, soundOn, unlockSfx } from './sfx'

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

export function PrimaryButton({ children, onClick, disabled, busy, className = '', type = 'button' }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled || busy}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#5CC2FF] px-6 text-[16px] font-bold text-[#04121D] shadow-[0_14px_36px_-16px_rgba(92,194,255,0.95)] transition hover:bg-[#7DD0FF] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}>
      {busy && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  )
}

export function GhostButton({ children, onClick, disabled, busy, className = '' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy}
      className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-[#111118] px-5 text-[15px] font-semibold text-white/85 transition hover:bg-[#17171F] hover:text-white disabled:opacity-50 ${className}`}>
      {busy && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-white/[0.08] bg-[#111118] ${className}`}>{children}</div>
}

export function SoundToggle() {
  const [on, setOn] = useState(soundOn)
  const flip = () => {
    unlockSfx()
    setSound(!on)
    setOn(!on)
  }
  return (
    <button type="button" onClick={flip} aria-pressed={on} aria-label={on ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/70 transition hover:bg-[#17171F] hover:text-white">
      {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  )
}

export function Spinner({ className = '' }) {
  return <Loader2 size={22} className={`animate-spin text-[#5CC2FF] ${className}`} />
}
