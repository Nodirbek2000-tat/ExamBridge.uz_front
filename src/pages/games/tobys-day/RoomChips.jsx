/*
 * TOBY'S PLAY ROOM — the command chips. Tap a chip to hear the line (model
 * voice); say it into the mic and Toby does it. Desktop: a side panel with
 * groups. Phone: two rows that scroll sideways under the mic. Every command
 * has its own drawn picture (room-icons.jsx) on a softly tinted tile.
 */
import { memo } from 'react'
import { motion as Motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { COMMANDS, COMMAND_COUNT, GROUPS } from './room'
import { CommandArt } from './room-icons'

const TONE = {
  move: 'bg-sky-400/[0.14]',
  day: 'bg-amber-300/[0.14]',
  kind: 'bg-pink-400/[0.14]',
  dont: 'bg-rose-500/[0.16]',
}

export function CommandIcon({ k, size = 20, className = '' }) {
  const group = COMMANDS.find(c => c.key === k)?.group || 'move'
  return (
    <span className={`flex flex-shrink-0 items-center justify-center rounded-xl ${TONE[group]} ${className}`}>
      <CommandArt k={k} size={Math.round(size * 1.45)} />
    </span>
  )
}

function Chip({ cmd, said, today, speaking, highlight, onTap, big }) {
  return (
    <Motion.button type="button" onClick={() => onTap(cmd.key)} whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2.5 rounded-2xl text-left transition
        ${big ? 'min-h-[60px] w-full px-2.5 py-2' : 'h-[54px] flex-shrink-0 px-2 pr-3'}
        ${highlight ? 'bg-[#FFB020]/[0.14] ring-2 ring-[#FFB020]' : speaking ? 'bg-white/[0.10] ring-1 ring-white/40' : 'bg-[#17171F] ring-1 ring-white/[0.06] hover:bg-[#1D1D27]'}`}
      aria-label={`${cmd.say} — tinglash`}>
      <CommandIcon k={cmd.key} size={big ? 20 : 18} className={big ? 'h-10 w-10' : 'h-9 w-9'} />
      <span className={big ? 'min-w-0 flex-1' : 'min-w-0'}>
        <span className={`block font-bold leading-tight text-white ${big ? 'truncate text-[15px] xl:text-[15.5px]' : 'whitespace-nowrap text-[15px]'}`}>{cmd.say}</span>
        <span className={`block truncate font-medium leading-tight text-white/50 ${big ? 'text-[12.5px]' : 'text-[11.5px]'}`}>{cmd.uz}</span>
      </span>
      {said && (
        <span className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full shadow ${today ? 'bg-emerald-400 text-emerald-950' : 'bg-white/80 text-slate-700'}`}
          title={today ? 'Bugun aytildi' : 'Avval aytilgan'}>
          <Check size={12} strokeWidth={3.5} />
        </span>
      )}
    </Motion.button>
  )
}

/* desktop: the side panel */
export const RoomPanel = memo(function RoomPanel({ said, today, speaking, highlight, onTap }) {
  const todaySet = new Set(today)
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#111118]">
      <div className="border-b border-white/[0.06] px-5 pb-4 pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-extrabold tracking-tight">Buyruqlar</h2>
          <span className="text-[13px] font-semibold tabular-nums text-white/45">bugun <b className="text-emerald-300">{today.length}</b> / {COMMAND_COUNT}</span>
        </div>
        <p className="mt-0.5 text-[13px] font-medium text-white/45">Bosib tinglang — keyin mikrofonga ayting</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-500" style={{ width: `${(today.length / COMMAND_COUNT) * 100}%` }} />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {GROUPS.map(g => (
          <section key={g.key}>
            <h3 className={`mb-2 px-1 text-[11.5px] font-bold uppercase tracking-[0.14em] ${g.key === 'dont' ? 'text-rose-300/80' : 'text-white/40'}`}>{g.title}</h3>
            <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
              {COMMANDS.filter(c => c.group === g.key).map(c => (
                <Chip key={c.key} cmd={c} big said={said[c.key] > 0} today={todaySet.has(c.key)} speaking={speaking === c.key}
                  highlight={highlight === c.key} onTap={onTap} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
})

/* phone: two rows that scroll sideways (the mischief fix first when there is one) */
export const RoomChipRow = memo(function RoomChipRow({ said, today, speaking, highlight, onTap }) {
  const todaySet = new Set(today)
  const list = highlight ? [...COMMANDS.filter(c => c.key === highlight), ...COMMANDS.filter(c => c.key !== highlight)] : COMMANDS
  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-1 pt-2 [scrollbar-width:none] sm:-mx-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
      <div className="grid w-max auto-cols-max grid-flow-col grid-rows-2 gap-2 pr-3">
        {list.map(c => (
          <Chip key={c.key} cmd={c} said={said[c.key] > 0} today={todaySet.has(c.key)} speaking={speaking === c.key}
            highlight={highlight === c.key} onTap={onTap} />
        ))}
      </div>
    </div>
  )
})
