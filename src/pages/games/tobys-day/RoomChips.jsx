/*
 * TOBY'S PLAY ROOM — the command chips. Tap a chip to hear the line (model
 * voice); say it into the mic and Toby does it. Desktop: a side panel with
 * groups. Phone: two rows that scroll sideways under the mic.
 */
import { memo } from 'react'
import { motion as Motion } from 'framer-motion'
import {
  Apple, ArrowBigUp, ArrowBigUpDash, Armchair, Ban, BedSingle, CakeSlice, Cat, Check, Droplets, Footprints, GraduationCap,
  Hand, Heart, Laugh, MicVocal, Milk, Moon, Music, OctagonX, PersonStanding, RotateCw, SmilePlus, Sparkles, Sunrise,
  ThumbsUp, VolumeX, Waves, Wind,
} from 'lucide-react'
import { COMMANDS, COMMAND_COUNT, GROUPS } from './room'

const ICONS = {
  stand: PersonStanding, sit: Armchair, jump: ArrowBigUpDash, dance: Music, turn: RotateCw, run: Footprints, lie: BedSingle,
  raise: ArrowBigUp, clap: Sparkles, five: Hand, hello: SmilePlus, nose: Cat, eat: Apple, drink: Milk, sleep: Moon, wake: Sunrise,
  hat_on: GraduationCap, hat_off: Wind, sing: MicVocal, laugh: Laugh, good: ThumbsUp, love: Heart, calm: Waves, stop: OctagonX,
  quiet: VolumeX, dont_cry: Droplets, dont_jump: Ban, dont_eat: CakeSlice,
}
const TONE = {
  move: 'from-sky-400 to-blue-600',
  day: 'from-amber-400 to-orange-500',
  kind: 'from-pink-400 to-rose-500',
  dont: 'from-rose-500 to-red-700',
}

export function CommandIcon({ k, size = 20, className = '' }) {
  const Icon = ICONS[k] || Sparkles
  const group = COMMANDS.find(c => c.key === k)?.group || 'move'
  return (
    <span className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${TONE[group]} ${className}`}>
      <Icon size={size} strokeWidth={2.4} />
    </span>
  )
}

function Chip({ cmd, said, today, speaking, highlight, onTap, big }) {
  return (
    <Motion.button type="button" onClick={() => onTap(cmd.key)} whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2.5 rounded-2xl text-left transition
        ${big ? 'min-h-[60px] w-full px-2.5 py-2' : 'h-[54px] flex-shrink-0 px-2 pr-3'}
        ${highlight ? 'bg-amber-300/20 ring-2 ring-amber-300' : speaking ? 'bg-sky-400/20 ring-2 ring-sky-300' : 'bg-white/[0.07] hover:bg-white/[0.12]'}`}
      aria-label={`${cmd.say} — tinglash`}>
      <CommandIcon k={cmd.key} size={big ? 20 : 18} className={big ? 'h-10 w-10' : 'h-9 w-9'} />
      <span className="min-w-0">
        <span className={`block whitespace-nowrap font-black leading-tight text-white ${big ? 'text-[16px] xl:text-[17px]' : 'text-[15px]'}`}>{cmd.say}</span>
        <span className={`block truncate font-semibold leading-tight text-white/55 ${big ? 'text-[12.5px]' : 'text-[11.5px]'}`}>{cmd.uz}</span>
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
    <div className="flex h-full flex-col overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
      <div className="border-b border-white/10 px-5 pb-3 pt-4">
        <h2 className="text-[20px] font-black tracking-tight">Buyruqlar</h2>
        <p className="mt-0.5 text-[14px] font-bold text-white/60">Bugun aytilgan buyruqlar: <b className="tabular-nums text-emerald-300">{today.length} / {COMMAND_COUNT}</b></p>
        <p className="mt-0.5 text-[13px] font-semibold text-white/50">Bosib tinglang — keyin mikrofonga ayting</p>
        <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-[width] duration-500" style={{ width: `${(today.length / COMMAND_COUNT) * 100}%` }} />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {GROUPS.map(g => (
          <section key={g.key}>
            <h3 className={`mb-2 px-1 text-[12px] font-black uppercase tracking-[0.14em] ${g.key === 'dont' ? 'text-rose-300' : 'text-white/45'}`}>{g.title}</h3>
            <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
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
