/*
 * TOBY RUN — this week's boards (RUNNER_PLAN §B7 "Leaderboard"): the best score, and "Eng ko‘p
 * gapirganlar" — the most lines said (?by=said), a speaking-first board. Only voice runs are ranked
 * (Listen / Card runs and flagged runs are not). Names as "Ism F."; the player count only from 30 up.
 */
import { useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { Loader2, Mic, Trophy } from 'lucide-react'
import { getBoard } from './api'
import { Medal, RunnerLook } from './art'
import { CARD, Screen, Tabs, TopBar } from './ui'

const TABS = [
  { id: 'score', label: 'Eng yuqori ball' },
  { id: 'said', label: 'Eng ko‘p gapirgan' },
]

export default function LeaderboardScreen({ progress, onBack }) {
  const [by, setBy] = useState('score')
  const [data, setData] = useState({})               // by → the board, or 'error'

  useEffect(() => {
    let alive = true
    getBoard(by).then((d) => { if (alive) setData(x => ({ ...x, [by]: d })) }).catch(() => { if (alive) setData(x => ({ ...x, [by]: x[by] || 'error' })) })
    return () => { alive = false }
  }, [by])

  const err = data[by] === 'error'
  const d = err ? null : data[by]
  const unit = by === 'said' ? 'gap' : 'ball'
  const meIn = d?.top?.some(r => r.is_me)
  return (
    <Screen wide="lg:max-w-[1100px]">
      <TopBar title="Haftalik reyting" coins={progress.coins} onBack={onBack} />
      <div className="lg:grid lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_30%_0%,#2c2547_0%,#15141d_65%)] p-5 lg:p-7">
            <div className="flex items-center gap-4">
              <RunnerLook runner={progress.equip.runner} outfit={progress.equip.outfit} cheer className="h-[120px] w-[104px] flex-shrink-0 lg:h-[150px] lg:w-[130px]" />
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#A98BFF]">Bu hafta</p>
                <p className="mt-1 text-[34px] font-black leading-none tabular-nums">{d?.me?.rank ? `#${d.me.rank}` : '—'}</p>
                <p className="mt-1.5 text-[14px] font-semibold text-white/60">
                  {d?.me?.value ? `${d.me.value.toLocaleString('en-US')} ${unit}` : 'Hali yugurmadingiz'}
                </p>
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium leading-snug text-white/45">
              Faqat ovoz bilan o‘ynalgan o‘yinlar kiradi. Ball serverda hisoblanadi: har birinchi urinishdagi javob ko‘paytiruvchini oshiradi.
            </p>
            {d?.players != null && <p className="mt-2 text-[13px] font-bold text-white/60">{d.players.toLocaleString('en-US')} o‘yinchi bu hafta</p>}
          </div>
        </div>
        <div className="mt-5 lg:col-span-7 lg:mt-0">
          <Tabs tabs={TABS} value={by} onChange={setBy} />
          <div className="mt-3 space-y-2">
            {!d && !err && <div className={`${CARD} flex h-40 items-center justify-center`}><Loader2 className="animate-spin text-white/40" /></div>}
            {err && !d && <p className={`${CARD} p-4 text-[14px] font-medium text-white/55`}>Reytingni yuklab bo‘lmadi. Internetni tekshiring.</p>}
            {d && !d.top?.length && (
              <p className={`${CARD} p-5 text-center text-[15px] font-semibold text-white/60`}>Bu hafta hali hech kim yo‘q — birinchi bo‘ling!</p>
            )}
            {d?.top?.map((r, i) => (
              <Motion.div key={`${by}-${i}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`${CARD} flex items-center gap-3 px-3.5 py-3 ${r.is_me ? 'border-[#A98BFF]/50 bg-[#A98BFF]/[0.08]' : ''}`}>
                <span className="flex w-9 flex-shrink-0 justify-center">
                  {r.rank <= 3 ? <Medal rank={r.rank} size={28} /> : <span className="text-[16px] font-black tabular-nums text-white/50">{r.rank}</span>}
                </span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{r.name}{r.is_me && <span className="ml-2 text-[12px] font-black text-[#cbb9ff]">siz</span>}</span>
                <span className="flex items-center gap-1.5 text-[16px] font-black tabular-nums">
                  {by === 'said' ? <Mic size={15} className="text-[#A98BFF]" /> : <Trophy size={15} className="text-[#F5B14C]" />}
                  {r.value.toLocaleString('en-US')}
                </span>
              </Motion.div>
            ))}
            {d?.me?.rank && !meIn && (
              <div className={`${CARD} flex items-center gap-3 border-[#A98BFF]/50 bg-[#A98BFF]/[0.08] px-3.5 py-3`}>
                <span className="w-9 text-center text-[16px] font-black tabular-nums text-white/60">{d.me.rank}</span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-bold">Siz</span>
                <span className="text-[16px] font-black tabular-nums">{d.me.value.toLocaleString('en-US')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Screen>
  )
}
