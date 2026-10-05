/* Lesson list: level chips, numbered rows, done / next / premium. */
import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { errorText, fetchLessons } from './api'
import { DoneMark, EmptyArt, HeroArt, LockMark, PremiumArt } from './art'
import { LEVEL_NAMES, LEVELS, aboutTime } from './theme'
import { GhostButton, LevelBadge, PrimaryButton, ScoreBadge, TopBar } from './ui'

function Row({ item, n, isNext, onOpen }) {
  const done = item.done
  return (
    <button type="button" onClick={() => onOpen(item)}
      className={`group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-white/[0.03] sm:px-5 ${isNext ? 'bg-[#7C3AED]/[0.07]' : ''}`}>
      <span className="flex-shrink-0">
        {item.locked ? <LockMark /> : done ? <DoneMark /> : (
          <span className={`flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-bold tabular-nums
            ${isNext ? 'bg-[#7C3AED] text-white shadow-[0_8px_24px_-10px_rgba(124,58,237,0.9)]' : 'border border-white/10 text-white/60'}`}>
            {n}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[16px] font-semibold ${item.locked ? 'text-white/55' : 'text-white'}`}>{item.title}</span>
        <span className="mt-1 flex items-center gap-2 text-[13px] text-white/45">
          <LevelBadge level={item.level} />
          {done ? <span className="font-semibold text-emerald-300/90">Tugatildi</span>
            : isNext ? <span className="font-semibold text-[#C4B5FD]">Keyingi dars</span>
              : <span className="truncate">{item.topic || `${item.words} so‘z`}</span>}
          <span className="hidden text-white/30 sm:inline">· {aboutTime(item.seconds)}</span>
        </span>
      </span>
      <span className="flex flex-shrink-0 items-center gap-2">
        {item.locked ? <span className="rounded-md bg-amber-300/10 px-2 py-1 text-[12px] font-bold text-amber-200">Premium</span>
          : done && item.best_accuracy != null ? <ScoreBadge score={item.best_accuracy} />
            : null}
        <ChevronRight size={18} className="text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/50" />
      </span>
    </button>
  )
}

export default function LessonList({ level, onLevel, onOpen, onExit, onPremium }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ['speaking-lessons'], queryFn: fetchLessons })
  const [premiumAsk, setPremiumAsk] = useState(null)
  const all = useMemo(() => data?.lessons || [], [data])
  const nextId = useMemo(() => all.find(l => !l.done && !l.locked)?.id, [all])
  const groups = useMemo(() => {
    const shown = LEVELS.filter(lv => !level || lv === level)
    return shown.map(lv => ({ level: lv, items: all.filter(l => l.level === lv) })).filter(g => g.items.length)
  }, [all, level])
  const done = data?.done || 0
  const total = data?.total || 0

  const open = (item) => (item.locked ? setPremiumAsk(item) : onOpen(item.id))
  // the chosen level chip is always visible, even C2 on a narrow phone
  const activeChip = useCallback((el) => { el?.scrollIntoView?.({ inline: 'center', block: 'nearest' }) }, [])

  const chips = (wide) => ['', ...LEVELS].map(lv => {
    const active = (level || '') === lv
    return (
      <button key={lv || 'all'} ref={active && !wide ? activeChip : undefined} type="button" role="tab" aria-selected={active} onClick={() => onLevel(lv)}
        className={`h-10 flex-shrink-0 rounded-full px-4 text-[14px] font-semibold transition
          ${active ? 'bg-[#7C3AED] text-white' : 'border border-white/[0.08] bg-[#111118] text-white/65 hover:text-white'}`}>
        {lv || 'Barchasi'}
      </button>
    )
  })

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+40px)]">
      <TopBar onBack={onExit} backLabel="O‘yinlarga qaytish" title="" />

      <div className="lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-12">
      {/* the header; on a wide screen a column of its own that stays in view */}
      <aside className="lg:sticky lg:top-[84px]">
        <section className="flex items-center gap-4 pb-2 pt-1 lg:flex-col-reverse lg:items-start lg:gap-6">
          <div className="min-w-0 flex-1 lg:w-full">
            <h1 className="text-[30px] font-bold leading-none tracking-tight sm:text-[36px] lg:text-[40px]">Speaking</h1>
            <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-white/55">
              Matnni ovoz chiqarib o‘qing — AI har bir so‘zingizni tekshiradi.
            </p>
            {total > 0 && (
              <div className="mt-4 max-w-xs lg:mt-6 lg:max-w-none">
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-white/45">Tugatilgan darslar</span>
                  <span className="font-bold tabular-nums text-white/85">{done} / {total}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                  <Motion.div className="h-full rounded-full bg-[#A78BFA]" initial={{ width: 0 }}
                    animate={{ width: `${(done / total) * 100}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                </div>
              </div>
            )}
          </div>
          <HeroArt className="w-[120px] flex-shrink-0 sm:w-[168px] lg:w-[200px]" />
        </section>

        <div className="mt-7 hidden flex-wrap gap-2 lg:flex" role="tablist" aria-label="Daraja">{chips(true)}</div>

        <ol className="mt-8 hidden space-y-3.5 border-t border-white/[0.06] pt-6 lg:block">
          {[
            ['Matnni o‘qing', 'Mikrofonni bosing va boshidan oxirigacha ovoz chiqarib o‘qing.'],
            ['AI tekshiradi', 'Har bir so‘z: yashil — to‘g‘ri, sariq — noaniq, qizil — aytilmagan.'],
            ['Mashq qiling', 'So‘zni bosing: o‘zingizni va to‘g‘ri talaffuzni eshiting, qayta ayting.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-[#A78BFA]/30 text-[12px] font-bold text-[#C4B5FD]">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-white/85">{t}</span>
                <span className="mt-0.5 block text-[13px] leading-relaxed text-white/45">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </aside>

      <div className="min-w-0">
      <div className="sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 -mx-4 mt-4 bg-[#0B0B10]/90 py-2 backdrop-blur-xl sm:-mx-6 lg:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Daraja">
          {chips(false)}
        </div>
      </div>

      {isLoading && (
        <div className="mt-4 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111118]" aria-hidden="true">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3.5 border-b border-white/[0.05] px-4 py-4 last:border-0">
              <div className="h-10 w-10 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="flex-1 space-y-2"><div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.07]" /><div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" /></div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mx-auto mt-10 max-w-sm text-center">
          <p className="text-lg font-bold">Darslar yuklanmadi</p>
          <p className="mt-1 text-[15px] text-white/55">{errorText(error)}</p>
          <GhostButton className="mx-auto mt-4 max-w-[220px]" onClick={() => refetch()} disabled={isFetching}><RotateCcw size={16} /> Qayta urinish</GhostButton>
        </div>
      )}

      {!isLoading && !error && !groups.length && (
        <div className="mx-auto mt-12 max-w-sm text-center">
          <div className="flex justify-center"><EmptyArt size={120} /></div>
          <p className="mt-3 text-lg font-bold">{level ? `${level} darajasida hali dars yo‘q` : 'Hali dars yo‘q'}</p>
          <p className="mt-1 text-[15px] text-white/55">Tez orada yangi matnlar qo‘shiladi.</p>
        </div>
      )}

      <div className="mt-3 space-y-6 lg:mt-2">
        {groups.map(g => (
          <section key={g.level}>
            {!level && (
              <h2 className="mb-2 flex items-baseline gap-2 px-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/40">
                {g.level} <span className="normal-case tracking-normal text-white/30">· {LEVEL_NAMES[g.level]}</span>
              </h2>
            )}
            <div className="divide-y divide-white/[0.05] overflow-hidden rounded-3xl border border-white/[0.08] bg-[#111118]">
              {g.items.map((item, i) => <Row key={item.id} item={item} n={i + 1} isNext={item.id === nextId} onOpen={open} />)}
            </div>
          </section>
        ))}
      </div>
      </div>
      </div>

      <AnimatePresence>
        {premiumAsk && (
          <Motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPremiumAsk(null)}>
            <Motion.div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl border border-white/[0.08] bg-[#17171F] px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 text-center sm:rounded-3xl">
              <div className="flex justify-center"><PremiumArt size={104} /></div>
              <h3 className="mt-3 text-xl font-bold">«{premiumAsk.title}» — Premium dars</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">Premium bilan barcha darajadagi matnlar ochiladi.</p>
              <PrimaryButton className="mt-5" onClick={onPremium}>Premium olish</PrimaryButton>
              <button type="button" onClick={() => setPremiumAsk(null)} className="mt-2 h-11 w-full text-[15px] font-semibold text-white/55 hover:text-white">Keyinroq</button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
