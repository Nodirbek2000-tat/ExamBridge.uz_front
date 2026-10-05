/*
 * TOBY RUN — today's missions (RUNNER_PLAN §B7): three at a time, at least two about speaking, a reward
 * of 100–200 coins each, at most 6 a day, a new set every day (Tashkent time). MissionList is also the
 * compact strip on the start and result screens.
 */
import { motion as Motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { MAX_PER_DAY, missionInfo } from './missions'
import { Coin, MissionArt } from './art'
import { CARD, LABEL, Meter, Screen, TopBar } from './ui'

function fmt(id, v) {
  if (id === 'run2000' || id === 'roof200') return `${Math.floor(v).toLocaleString('en-US')} m`
  return Math.floor(v).toLocaleString('en-US')
}

export function MissionRow({ a, compact = false, done = false }) {
  const info = missionInfo(a.id)
  if (!info) return null
  const p = done ? info.goal : Math.min(a.p, info.goal)
  return (
    <div className={`flex items-center gap-3 ${compact ? '' : `${CARD} p-3.5`}`}>
      <MissionArt id={a.id} kind={info.kind} size={compact ? 40 : 52} className="flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={`font-bold leading-snug ${compact ? 'text-[14px]' : 'text-[15px]'} ${done ? 'text-white/55 line-through decoration-white/30' : 'text-white'}`}>{info.title}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Meter value={p} max={info.goal} color={done ? '#34D3A0' : info.kind === 'speak' ? '#A98BFF' : '#2BB3C0'} className="flex-1" />
          <span className="flex-shrink-0 text-[12px] font-bold tabular-nums text-white/50">{fmt(a.id, p)} / {fmt(a.id, info.goal)}</span>
        </div>
      </div>
      {done ? (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#0B0B10]"><Check size={16} strokeWidth={3} /></span>
      ) : (
        <span className="flex flex-shrink-0 items-center gap-1 text-[13px] font-black tabular-nums text-[#F5B14C]"><Coin size={14} />{info.reward}</span>
      )}
    </div>
  )
}

export function MissionList({ missions, compact = false }) {
  const active = missions?.active || []
  if (!active.length) {
    return <p className="text-[14px] font-semibold text-white/55">Bugungi missiyalar tugadi — ertaga yangilari!</p>
  }
  return (
    <div className={compact ? 'space-y-3' : 'space-y-2'}>
      {active.map(a => <MissionRow key={a.id} a={a} compact={compact} />)}
    </div>
  )
}

export default function MissionsScreen({ progress, onBack }) {
  const m = progress.missions
  return (
    <Screen wide="lg:max-w-[900px]">
      <TopBar title="Bugungi missiyalar" coins={progress.coins} onBack={onBack} />
      <div className="mb-4 flex items-end justify-between px-1">
        <p className={LABEL}>Faol · {m.active.length}</p>
        <p className="text-[13px] font-bold text-white/50">Bugun bajarildi: <span className="text-white">{m.done_today}</span> / {MAX_PER_DAY}</p>
      </div>
      <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <MissionList missions={m} />
      </Motion.div>
      {m.done?.length > 0 && (
        <>
          <p className={`${LABEL} mb-2.5 mt-6 px-1`}>Bajarilganlar</p>
          <div className="space-y-2">
            {m.done.map(id => <MissionRow key={id} a={{ id, p: 0 }} done />)}
          </div>
        </>
      )}
      <p className="mt-6 px-1 text-[13px] font-medium leading-snug text-white/40">
        Missiya bajarilishi bilan tanga hamyoningizga tushadi va o‘rniga yangisi chiqadi. Kuniga ko‘pi bilan {MAX_PER_DAY} ta. Har kuni Toshkent vaqti bilan yangilanadi.
      </p>
    </Screen>
  )
}
