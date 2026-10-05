/*
 * Small shared pieces of the VOICE DRIVE screens: the coin badge and the
 * garage stat bars.
 */
import { CoinIcon } from './ActionIcon'

/* 0–5 stat bar for the garage. */
export function StatBar({ label, value }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-white/45 lg:text-xs">
        <span>{label}</span><span className="tabular-nums text-white/75">{value.toFixed(1).replace('.0', '')}</span>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => {
          const fill = Math.max(0, Math.min(1, value - i))
          return (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <span className="block h-full rounded-full bg-[#FFB224]" style={{ width: `${fill * 100}%` }} />
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
    <span className={`inline-flex h-10 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#111118] px-3.5 text-[15px] font-bold text-white lg:h-11 lg:px-4 lg:text-base ${className}`}>
      <CoinIcon size={17} /> <span className="tabular-nums">{value}</span>
    </span>
  )
}
