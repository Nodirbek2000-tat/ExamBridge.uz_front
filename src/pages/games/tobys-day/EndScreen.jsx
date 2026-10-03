/*
 * TOBY'S DAY — after a zone: a party. Toby cheers (wearing his accessory),
 * the big stars fill one by one, coins count up; then lines said, accuracy,
 * record, level, what unlocked, whether the result reached the server, and
 * three clear buttons: next zone · replay · map.
 * Phone: one column · desktop (≥ 1024 px): the celebration left, the numbers right.
 */
import { useEffect, useState } from 'react'
import { animate, motion as Motion } from 'framer-motion'
import { ArrowRight, Check, CloudOff, Loader2, Lock, Map as MapIcon, RotateCcw, Sparkles } from 'lucide-react'
import { ZONES } from './content'
import { levelInfo, maxStars, medal, unlockNeed, zoneUnlocked } from './logic'
import { accUnlocks, allStars } from './room'
import { TobyAvatar } from './Toby'
import { AccIcon } from './Wardrobe'
import { Bar, Coin, ConfettiRain } from './ui'

const PRAISE = [
  'Mashq qilishda davom eting — har safar yaxshiroq bo‘ladi!',
  'Yaxshi! Yana bir bor o‘ynab, ko‘proq yulduz yig‘ing.',
  'Zo‘r natija! Toby siz bilan faxrlanadi.',
  'Ajoyib! Siz haqiqiy so‘zlovchisiz!',
]
const STAR = 'M12 1.8l3.1 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.6l-6.4 3.6 1.5-7.1L1.7 9.2l7.2-.8z'

/* 0 → n, counting up */
function CountUp({ to, delay = 0, reduced }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (reduced) return undefined
    const c = animate(0, to, { duration: 1.1, delay, ease: 'easeOut', onUpdate: x => setV(Math.round(x)) })
    return () => c.stop()
  }, [to, delay, reduced])
  return <>{reduced ? to : v}</>
}

/* the three big medal stars, filled one by one (the middle one is bigger) */
function BigStars({ n, reduced }) {
  return (
    <div className="flex items-end justify-center gap-1 sm:gap-2" aria-label={`${n} / 3`}>
      {[0, 1, 2].map(i => {
        const on = i < n
        const size = i === 1 ? 'h-[72px] w-[72px] lg:h-[104px] lg:w-[104px]' : 'h-14 w-14 lg:h-20 lg:w-20'
        return (
          <div key={i} className={`relative ${size} ${i === 1 ? '-mb-1' : ''}`}>
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full" aria-hidden>
              <path d={STAR} fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            {on && (
              <Motion.svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full drop-shadow-[0_4px_10px_rgba(250,204,21,0.55)]" aria-hidden
                initial={reduced ? false : { scale: 0, rotate: -50, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ delay: 0.55 + i * 0.38, type: 'spring', stiffness: 300, damping: 13 }}>
                <path d={STAR} fill="#FDE047" stroke="#F59E0B" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M8.5 9.5l2-3" stroke="#FEF9C3" strokeWidth="1.4" strokeLinecap="round" />
              </Motion.svg>
            )}
            {on && !reduced && (
              <Motion.span className="absolute inset-0 rounded-full border-4 border-yellow-200"
                initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.7, opacity: [0, 0.9, 0] }}
                transition={{ delay: 0.62 + i * 0.38, duration: 0.6 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Stat({ label, children, delay, reduced }) {
  return (
    <Motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className="rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/[0.06] lg:rounded-3xl lg:p-5">
      <p className="text-[12px] font-semibold text-white/50 lg:text-sm">{label}</p>
      <div className="mt-1 flex items-center gap-1.5 text-2xl font-black tabular-nums lg:text-4xl">{children}</div>
    </Motion.div>
  )
}

export default function EndScreen({ zoneIndex, run, before, after, saving, saved, onReplay, onNextZone, onMap, onWardrobe, reduced = false, acc = null }) {
  const zone = ZONES[zoneIndex] || ZONES[0]
  const nextZone = ZONES[zoneIndex + 1]
  const m = medal(run.stars, zone)
  const prevBest = before.zones[zone.key]?.best || 0
  const record = run.coins > prevBest && run.coins > 0
  const canNext = !!nextZone && zoneUnlocked(ZONES, zoneIndex + 1, after)
  const unlockedNow = canNext && !zoneUnlocked(ZONES, zoneIndex + 1, before)
  const lvBefore = levelInfo(before.xp).level
  const lv = levelInfo(after.xp)
  const finalZone = !nextZone
  const have = after.zones[zone.key]?.stars || 0
  const need = unlockNeed(zone)
  // the stars of this run opened a new accessory for Toby (room.js thresholds)
  const starsBefore = allStars(before)
  const starsAfter = allStars(after)
  const newAcc = [...accUnlocks].reverse().find(a => starsBefore < a.need && starsAfter >= a.need) || null

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-12 pt-5 lg:max-w-6xl lg:px-8 lg:pb-16 lg:pt-10">
      <div className="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-8">
        {/* the celebration */}
        <Motion.section initial={reduced ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-[32px] px-4 pb-6 pt-5 text-center shadow-2xl lg:rounded-[40px] lg:px-8 lg:py-10"
          style={{ background: `linear-gradient(160deg, ${zone.from} 0%, ${zone.to} 100%)` }}>
          <div className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-black/10 blur-3xl" />
          <ConfettiRain reduced={reduced} n={m >= 2 ? 26 : 16} height={720} />
          <p className="relative text-[12px] font-black uppercase tracking-[0.2em] text-white/85 lg:text-base">{zone.title} · tugadi</p>
          <div className="relative mx-auto mt-1 h-48 w-44 lg:mt-3 lg:h-80 lg:w-72">
            <div className="absolute inset-6 rounded-full bg-white/30 blur-2xl" />
            <TobyAvatar className="relative h-full w-full" mood={m >= 1 ? 'happy' : 'proud'} pose={m >= 1 ? 'cheer' : 'wave'}
              outfit={finalZone ? 'pyjamas' : 'tshirt'} acc={acc} jump={1} reduced={reduced} />
          </div>
          <div className="relative mt-1"><BigStars n={m} reduced={reduced} /></div>
          <h1 className="relative mt-3 text-[28px] font-black leading-tight text-white drop-shadow lg:mt-5 lg:text-5xl">
            {finalZone ? 'Good night, Toby!' : m >= 2 ? 'Great job!' : 'Well done!'}
          </h1>
          <p className="relative mx-auto mt-1.5 max-w-sm text-[14px] font-semibold leading-snug text-white/90 lg:mt-3 lg:max-w-md lg:text-xl">
            {finalZone ? 'Toby’ning kuni tugadi — siz uni boshidan oxirigacha gapirtirdingiz!' : PRAISE[m]}
          </p>
        </Motion.section>

        {/* the numbers and what next */}
        <div className="mt-4 flex flex-col lg:mt-0">
          <div className="grid grid-cols-2 gap-3 lg:gap-4">
            <Stat label="Yulduzlar" delay={0.15} reduced={reduced}>
              <span className="text-yellow-300">★</span><CountUp to={run.stars} delay={0.4} reduced={reduced} />
              <span className="text-sm font-bold text-white/35 lg:text-xl">/{maxStars(zone)}</span>
            </Stat>
            <Stat label="Tangalar" delay={0.22} reduced={reduced}>
              <Coin size={26} />+<CountUp to={run.coins} delay={0.5} reduced={reduced} />
            </Stat>
            <Stat label="Aytilgan gaplar" delay={0.29} reduced={reduced}>
              {run.said}<span className="text-sm font-bold text-white/35 lg:text-xl">/{run.total}</span>
            </Stat>
            <Stat label="Aniqlik" delay={0.36} reduced={reduced}>
              {Math.round(run.accuracy * 100)}<span className="text-sm font-bold text-white/35 lg:text-xl">%</span>
            </Stat>
          </div>

          <Motion.div initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43 }}
            className="mt-3 space-y-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/[0.06] lg:mt-4 lg:space-y-4 lg:rounded-3xl lg:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-white/60 lg:text-base">Eng yaxshi natija</span>
              <span className="flex items-center gap-2 text-[15px] font-black tabular-nums lg:text-xl">
                {record && <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-amber-950 lg:text-sm">Yangi rekord!</span>}
                <Coin size={18} />{Math.max(prevBest, run.coins)}
              </span>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px] lg:text-base">
                <span className="font-semibold text-white/60">Speaking <b className="text-white">Lv {lv.level}</b></span>
                <span className="font-black text-sky-300">+{run.xp} XP {lv.level > lvBefore && <span className="ml-1 rounded-full bg-sky-400 px-2 py-0.5 text-[11px] text-sky-950 lg:text-sm">Level up!</span>}</span>
              </div>
              <Bar pct={lv.pct} reduced={reduced} height="h-2 lg:h-3" />
            </div>
          </Motion.div>

          {unlockedNow && (
            <Motion.div initial={reduced ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: 'spring' }}
              className="mt-3 flex items-center gap-3 rounded-2xl p-3.5 shadow-lg lg:mt-4 lg:rounded-3xl lg:p-5" style={{ background: `linear-gradient(135deg, ${nextZone.from}, ${nextZone.to})` }}>
              <Sparkles size={24} className="flex-shrink-0 text-white" />
              <p className="text-[15px] font-black text-white lg:text-xl">Yangi zona ochildi: {nextZone.title}!</p>
            </Motion.div>
          )}
          {newAcc && (
            <Motion.div initial={reduced ? false : { opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: unlockedNow ? 1.2 : 0.9, type: 'spring', stiffness: 300, damping: 18 }}
              className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 p-3 shadow-lg ring-2 ring-white/40 lg:mt-4 lg:rounded-3xl lg:p-4">
              <Motion.span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white lg:h-[72px] lg:w-[72px]"
                animate={reduced ? undefined : { rotate: [0, -10, 10, -6, 0], scale: [1, 1.12, 1] }} transition={{ duration: 1.2, delay: 1.5 }}>
                <AccIcon acc={newAcc.acc} size={46} />
              </Motion.span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-200 lg:text-[13px]">Yangi kiyim ochildi!</p>
                <p className="truncate text-[17px] font-black leading-tight text-white lg:text-[22px]">{newAcc.name}</p>
              </div>
              {onWardrobe && (
                <button type="button" onClick={onWardrobe}
                  className="flex-shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-black text-fuchsia-700 shadow lg:px-5 lg:py-2.5 lg:text-[16px]">
                  Kiyib ko‘rish
                </button>
              )}
            </Motion.div>
          )}
          {nextZone && !canNext && (
            <div className="mt-3 rounded-2xl bg-white/[0.05] p-3.5 lg:mt-4 lg:rounded-3xl lg:p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-white/70 lg:text-base">
                <Lock size={15} className="flex-shrink-0" />
                «{nextZone.title}» ni ochish uchun bu zonada {need} ★ kerak — sizda {have} ★
              </p>
              <Bar pct={need ? have / need : 1} className="from-amber-300 to-orange-500" reduced={reduced} height="mt-2 h-2" />
            </div>
          )}

          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-white/45 lg:text-sm" aria-live="polite">
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saqlanmoqda…</>
              : saved ? <><Check size={13} className="text-emerald-400" /> Natija saqlandi</>
                : <><CloudOff size={13} /> Internet yo‘q — natija shu qurilmada saqlandi</>}
          </p>

          <div className="mt-5 space-y-2.5 lg:mt-auto lg:space-y-3 lg:pt-6">
            {canNext ? (
              <Motion.button type="button" onClick={onNextZone} whileTap={{ scale: 0.97 }}
                initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[17px] font-black text-white shadow-xl lg:rounded-3xl lg:py-5 lg:text-2xl"
                style={{ background: `linear-gradient(135deg, ${nextZone.from}, ${nextZone.to})` }}>
                Keyingi: {nextZone.title} <ArrowRight size={22} />
              </Motion.button>
            ) : (
              <Motion.button type="button" onClick={onReplay} whileTap={{ scale: 0.97 }}
                initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-4 text-[17px] font-black text-amber-950 shadow-xl lg:rounded-3xl lg:py-5 lg:text-2xl">
                <RotateCcw size={20} /> Qayta o‘ynash
              </Motion.button>
            )}
            <div className={`grid gap-2.5 lg:gap-3 ${canNext ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {canNext && (
                <button type="button" onClick={onReplay} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 text-[15px] font-bold hover:bg-white/15 lg:rounded-3xl lg:py-4 lg:text-lg">
                  <RotateCcw size={18} /> Qayta
                </button>
              )}
              <button type="button" onClick={onMap} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 py-3.5 text-[15px] font-bold hover:bg-white/15 lg:rounded-3xl lg:py-4 lg:text-lg">
                <MapIcon size={18} /> Xarita
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
