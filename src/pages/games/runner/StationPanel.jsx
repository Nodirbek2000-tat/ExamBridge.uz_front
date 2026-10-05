/*
 * TOBY RUN — the Bekat panel (RUNNER_PLAN §B3.4): the NPC (Toby's Day Portrait, talking while their
 * line plays), the line with karaoke word chips (matchSentence colours), the Uzbek caption, the mic,
 * and the two lines' results. No time pressure: the world is paused.
 */
import { motion as Motion } from 'framer-motion'
import { Check, Gift, Sparkles, Volume2, X } from 'lucide-react'
import { Portrait } from '../tobys-day/characters'
import { Bar, MicRow, Picture, WordLine } from './PromptCard'

const NAMES = { grandma: 'Buvijon', driver: 'Haydovchi', shopkeeper: 'Sotuvchi', teacher: 'O‘qituvchi', girl: 'Qizcha', boy: 'Bolakay', mum: 'Oyijon', brown: 'Qo‘shni' }
const GLASS = 'border border-white/[0.08] bg-[#0B0B10]/85 backdrop-blur-xl'

export default function StationPanel({ station, barRef, interim, listening, busy, serverMode, level, onChoice, reduced }) {
  const s = station
  const talking = s.mode === 'npc' || s.mode === 'model'
  const done = s.mode === 'done'
  const open = s.mode === 'open'
  const answer = s.as === 'answer'
  return (
    <Motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={`pointer-events-auto mx-auto w-full max-w-[420px] rounded-[28px] p-4 shadow-[0_24px_70px_-26px_rgba(0,0,0,0.9)] lg:max-w-[480px] lg:p-6 ${GLASS}`}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#F6EBD9] lg:h-20 lg:w-20">
          <Portrait who={s.npc} talking={talking} reduced={reduced} className="h-[118%] w-[118%] translate-y-[6%]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A98BFF] lg:text-[13px]">Bekat · {NAMES[s.npc] || 'Yo‘lovchi'}</p>
          <p className="text-[13px] font-semibold text-white/55 lg:text-sm">
            {done ? 'Rahmat! Yo‘lda davom etamiz' : talking ? (answer ? 'Savolni tinglang' : 'Tinglang…') : answer ? 'Javob bering' : s.as === 'picture' ? 'Rasmda nima bor?' : 'Takrorlang'}
          </p>
        </div>
        <div className="flex gap-1.5" aria-label={`${s.i + 1} / ${s.n}`}>
          {Array.from({ length: s.n }, (_, i) => {
            const r = s.results[i]
            return (
              <span key={i} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${r === 'ok' ? 'bg-emerald-400 text-[#0B0B10]' : r === 'close' ? 'bg-amber-300 text-[#0B0B10]' : r ? 'bg-rose-400 text-[#0B0B10]' : i === s.i && !done ? 'border border-[#A98BFF] text-[#A98BFF]' : 'bg-white/[0.07] text-white/40'}`}>
                {r === 'ok' ? <Check size={14} strokeWidth={3} /> : r === 'close' ? '~' : r ? <X size={14} strokeWidth={3} /> : i + 1}
              </span>
            )
          })}
        </div>
      </div>

      {!done && (
        <div className="mt-4">
          <div className="flex items-start gap-3">
            {s.as === 'picture' && <Picture name={s.picture} size={64} />}
            <div className="min-w-0 flex-1">
              <WordLine text={s.line} words={!answer && s.as !== 'picture' ? s.words : null} className="text-[26px] lg:text-[32px]" />
              {s.caption && <p className="mt-1.5 text-[15px] font-medium text-white/55 lg:text-base">{s.caption}</p>}
            </div>
            {talking && <Volume2 size={20} className="mt-1 flex-shrink-0 animate-pulse text-[#A98BFF]" />}
          </div>
          {(answer || s.as === 'picture') && (s.mode === 'ok' || s.mode === 'close' || s.mode === 'miss' || s.mode === 'model') && (
            <p className="mt-3 rounded-2xl bg-white/[0.05] px-3 py-2 text-[15px] font-semibold text-white/80">
              {s.heard ? <>Toby eshitdi: <span className="text-white">«{s.heard}»</span></> : 'Hech narsa eshitilmadi'}
              {answer && <span className="mt-1 block text-[13px] font-medium text-white/50">Masalan: <span className="text-emerald-200">{s.target}</span></span>}
              {s.as === 'picture' && <span className="mt-1 block text-[13px] font-medium text-white/50">To‘g‘ri: <span className="text-emerald-200">{s.target}</span></span>}
            </p>
          )}
          {s.mode === 'retry' && <p className="mt-3 text-[14px] font-semibold text-amber-200">Yana bir bor — {s.heard ? <>eshitildi «{s.heard}»</> : 'balandroq ayting'}</p>}
          {s.tip && s.mode === 'miss' && <p className="mt-2 text-[13px] font-medium leading-snug text-white/55">{s.tip}</p>}
          {s.options && (
            <div className="mt-3 space-y-2">
              <p className="text-[13px] font-semibold text-white/55">Qaysi ma’noni eshitdingiz?</p>
              {s.options.map((o, i) => (
                <button key={i} type="button" onClick={() => onChoice?.(i)}
                  className="flex w-full items-center rounded-2xl border border-white/[0.1] bg-white/[0.05] px-3.5 py-3 text-left text-[15px] font-semibold text-white transition hover:bg-white/[0.09]">
                  {o.text}
                </button>
              ))}
            </div>
          )}
          {(open || s.mode === 'hold') && (
            <div className="mt-3 space-y-2">
              <Bar barRef={barRef} />
              <MicRow listening={listening} busy={busy || s.mode === 'hold'} interim={interim} level={level} serverMode={serverMode} idleText="Ayting!" />
            </div>
          )}
        </div>
      )}

      {done && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#F5B14C]/10 px-3.5 py-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F5B14C] text-[#0B0B10]"><Gift size={22} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-white">+{s.coins} tanga</p>
            <p className="text-[13px] font-semibold text-white/55">{s.perfect ? 'Ikkalasi ham a’lo — 15 soniya x2 tanga!' : 'Sandiqcha ochildi'}</p>
          </div>
          {s.perfect && <Sparkles size={22} className="text-[#F5B14C]" />}
        </div>
      )}
    </Motion.div>
  )
}
