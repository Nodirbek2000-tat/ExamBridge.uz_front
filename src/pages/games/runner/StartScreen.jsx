/*
 * TOBY RUN — start (RUNNER_PLAN §B9.1 StartScreen): the same 3D world in attract mode (the learner's
 * runner, outfit and carpet, a slow orbit), level, topic (→ the metro map), today's missions, the shop
 * and the weekly board, the settings sheet (§B9.6: Avval eshitish · Sokin · Tugmalar · Tinglash ·
 * Harakatni kamaytirish · Tovush · Musiqa) and Boshlash — the tap that primes the mic (iOS) and the sound.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ChevronRight, Ear, Gamepad2, Hand, Loader2, Mic, Music, Play, Settings2, Snail, Sparkles, Trophy, Volume2, Wind, X } from 'lucide-react'
import { RunnerEngine } from './engine/engine.js'
import { LEVEL_ORDER } from './engine/levels.js'
import { ACCENT, LEVELS_LIST, TAGLINE, TITLE, TOPICS } from './content'
import { getMe } from './api'
import { MissionList } from './MissionsScreen'
import { Medal, RunnerLook } from './art'
import { CARD, CoinPill, LABEL } from './ui'
import RunnerView from './RunnerView'

const TOPIC_LIST = ['all', 'metro', 'bozor', 'park', 'home', 'food', 'general']

const STEPS = [
  { icon: Hand, text: 'Barmoq bilan suring: chapga, o‘ngga, tepaga — sakrash, pastga — yumalash.' },
  { icon: Mic, text: 'Darvozadan o‘tsangiz Toby sharni ushlab uchadi — rasmdagi so‘zni inglizcha ayting.' },
  { icon: Volume2, text: 'Bekatda yo‘lovchi gapiradi: takrorlang yoki savoliga javob bering.' },
  { icon: Gamepad2, text: 'Yiqilsangiz — xato qilgan so‘zingizni aytib, qaytadan turasiz.' },
]

function Toggle({ on, onChange, icon, title, note }) {
  const Glyph = icon
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
      className="flex w-full items-center gap-3 rounded-[20px] p-3 text-left transition hover:bg-white/[0.04]">
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${on ? 'bg-[#A98BFF]/15 text-[#A98BFF]' : 'bg-white/[0.06] text-white/50'}`}><Glyph size={19} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold">{title}</span>
        <span className="block text-[13px] font-medium leading-snug text-white/45">{note}</span>
      </span>
      <span className={`relative h-7 w-12 flex-shrink-0 rounded-full transition ${on ? 'bg-[#A98BFF]' : 'bg-white/[0.12]'}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  )
}

function SettingsSheet({ open, settings, noMic, onSet, onClose }) {
  const s = settings
  return createPortal(
    <AnimatePresence>
      {open && (
        <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center" onClick={onClose}>
          <Motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            onClick={e => e.stopPropagation()} role="dialog" aria-label="Sozlamalar"
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-white/[0.08] bg-[#111118] p-3 pb-[max(16px,env(safe-area-inset-bottom))] text-white sm:rounded-[28px]">
            <div className="flex items-center justify-between px-3 pb-1 pt-2">
              <p className="text-xl font-black">Sozlamalar</p>
              <button type="button" onClick={onClose} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06]"><X size={20} /></button>
            </div>
            <Toggle on={!!s.hearAlways} onChange={(v) => onSet('hearAlways', v)} icon={Volume2} title="Avval eshitish" note="O‘qituvchi har so‘zni avval aytib beradi" />
            <Toggle on={!!s.calm} onChange={(v) => onSet('calm', v)} icon={Snail} title="Sokin rejim" note="25% sekinroq va to‘siqlar kamroq" />
            <Toggle on={!!s.buttons} onChange={(v) => onSet('buttons', v)} icon={Gamepad2} title="Tugmalar" note="Ekranda 4 ta katta tugma (64 px)" />
            <Toggle on={!!s.listen || noMic} onChange={(v) => onSet('listen', v)} icon={Ear} title="Tinglash rejimi"
              note={noMic ? 'Bu brauzerda mikrofon yo‘q — sharlarni tanlaysiz' : 'Mikrofonsiz: eshitib, to‘g‘ri sharga o‘tasiz (reytingga kirmaydi)'} />
            <Toggle on={!!s.reduce} onChange={(v) => onSet('reduce', v)} icon={Wind} title="Harakatni kamaytirish" note="Silkinish va tezlik chiziqlarisiz, 15% sekinroq" />
            <div className="mx-3 my-1 h-px bg-white/[0.06]" />
            <Toggle on={s.sound !== false} onChange={(v) => onSet('sound', v)} icon={Sparkles} title="Tovush effektlari" note="Tanga, sakrash, shar" />
            <Toggle on={s.music !== false} onChange={(v) => onSet('music', v)} icon={Music} title="Musiqa" note="Gapirganda musiqa avtomatik pasayadi" />
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>, document.body)
}

function Hero({ level, best, week, equip }) {
  const [ref] = useState(() => ({
    current: new RunnerEngine({ attract: true, level: 'A1', noWorld: true, outfit: equip.outfit || '', carpet: equip.carpet, runner: equip.runner }),
  }))
  useEffect(() => () => ref.current?.halt(), [ref])
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0d0d12] lg:rounded-[32px]">
      <div className="relative aspect-[4/3.4] w-full sm:aspect-[16/10] lg:aspect-auto lg:h-[min(62vh,620px)]">
        <RunnerView gameRef={ref} attract />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,16,0.72)_0%,rgba(11,11,16,0)_38%,rgba(11,11,16,0)_62%,rgba(11,11,16,0.85)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 px-5 pt-5 lg:px-9 lg:pt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] lg:text-xs" style={{ color: ACCENT }}>Speak &amp; run</p>
          <h1 className="mt-1 text-[38px] font-black leading-none tracking-tight text-white sm:text-5xl lg:text-7xl">{TITLE}</h1>
          <p className="mt-2 text-[16px] font-semibold text-white/75 lg:text-xl">{TAGLINE}</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 px-5 pb-4 lg:px-9 lg:pb-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-semibold text-white/85 backdrop-blur lg:text-sm">
            <Trophy size={14} className="text-[#F5B14C]" /> Rekord · {level}: <span className="tabular-nums text-white">{(best || 0).toLocaleString('en-US')}</span>
          </span>
          {week && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-semibold text-white/75 backdrop-blur lg:text-sm">
              Bu hafta: <b className="text-white">{week.lines}</b> gap · <b className="text-white">{week.mastered_total}</b> so‘z yodda
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

/* a small metro-map drawing for the topic button */
function MapGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
      <rect width="48" height="48" rx="14" fill="#17171F" />
      <path d="M6 14h14l8 8h14" stroke="#D94A5A" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 30h10l8-8M24 22v20" stroke="#2E5AAC" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 6v10l6 6v20" stroke="#3BAA6B" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {[[20, 14], [24, 22], [36, 22], [16, 30], [36, 34]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.2" fill="#F6EBD9" stroke="#0B0B10" strokeWidth="1.4" />)}
    </svg>
  )
}

function Tile({ onClick, title, note, art }) {
  return (
    <button type="button" onClick={onClick}
      className={`${CARD} flex min-w-0 items-center gap-3 p-3 text-left transition hover:bg-[#17171F]`}>
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_50%_60%,#2a2440_0%,#17171F_80%)]">{art}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-black">{title}</span>
        <span className="block truncate text-[12px] font-semibold text-white/45">{note}</span>
      </span>
      <ChevronRight size={18} className="flex-shrink-0 text-white/35" />
    </button>
  )
}

export default function StartScreen({ progress, config, speech, loading, onChange, onStart, onBack, onScreen }) {
  const level = progress.level
  const s = progress.settings
  const [week, setWeek] = useState(null)
  const [sheet, setSheet] = useState(false)
  const allowed = config?.levels?.length ? config.levels : LEVEL_ORDER
  useEffect(() => {
    let alive = true
    getMe(level).then((d) => { if (alive) setWeek(d?.week || null) }).catch(() => {})
    return () => { alive = false }
  }, [level])
  const setSetting = (k, v) => onChange({ settings: { ...s, [k]: v } })
  const noMic = !speech.supported
  const flags = [s.listen || noMic ? 'Tinglash rejimi' : '', s.calm ? 'Sokin' : '', s.hearAlways ? 'Avval eshitish' : '', s.buttons ? 'Tugmalar' : ''].filter(Boolean)
  const done = progress.missions.done_today

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-6 pt-[max(14px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8 lg:pb-10">
        <div className="mb-4 flex items-center gap-2.5">
          <button type="button" onClick={onBack} aria-label="Orqaga"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-white/[0.06]">
            <ChevronRight size={21} className="rotate-180" />
          </button>
          <div className="min-w-0 flex-1">
            <p className={LABEL}>O‘yinlar</p>
            <p className="truncate text-base font-bold lg:text-lg">{TITLE}</p>
          </div>
          <button type="button" onClick={() => setSheet(true)} aria-label="Sozlamalar"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-white/[0.06]">
            <Settings2 size={19} />
          </button>
          <CoinPill coins={progress.coins} />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            <Hero level={level} best={progress.best[level]} week={week} equip={progress.equip} />
            <h2 className={`${LABEL} mb-2.5 mt-6 hidden lg:block`}>Qanday o‘ynaladi</h2>
            <ol className={`${CARD} mt-0 hidden space-y-3 p-5 lg:block`}>
              {STEPS.map((st, i) => (
                <li key={i} className="flex gap-3 text-[15px] font-medium leading-snug text-white/70">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#A98BFF]/12 text-[#A98BFF]"><st.icon size={16} /></span>
                  <span className="pt-1">{st.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-5 lg:flex lg:flex-col">
            <h2 className={`${LABEL} mb-2.5 mt-6 lg:mt-1`}>Daraja</h2>
            <div className="grid grid-cols-5 gap-1.5 lg:gap-2">
              {LEVELS_LIST.filter(l => allowed.includes(l.id)).map(l => {
                const on = l.id === level
                return (
                  <Motion.button key={l.id} type="button" onClick={() => onChange({ level: l.id })} aria-pressed={on} whileTap={{ scale: 0.96 }}
                    className={`rounded-[18px] border px-1 py-2.5 text-center transition lg:py-3.5 ${on ? 'border-[#A98BFF]/70 bg-[#A98BFF]/[0.1]' : 'border-white/[0.08] bg-[#111118] hover:bg-[#17171F]'}`}>
                    <span className="mx-auto mb-1 block h-1 w-6 rounded-full" style={{ background: l.color }} />
                    <span className="block text-[17px] font-black lg:text-xl" style={{ color: on ? ACCENT : undefined }}>{l.id}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-white/45 lg:text-[11px]">{(progress.best[l.id] || 0).toLocaleString('en-US')}</span>
                  </Motion.button>
                )
              })}
            </div>
            <p className="mt-2 px-1 text-[13px] font-medium text-white/55 lg:text-sm">
              <b className="font-bold text-white/85">{LEVELS_LIST.find(l => l.id === level)?.title}</b> · {LEVELS_LIST.find(l => l.id === level)?.note}
            </p>

            <h2 className={`${LABEL} mb-2.5 mt-5`}>Mavzu</h2>
            <button type="button" onClick={() => onScreen('map')}
              className={`${CARD} flex w-full items-center gap-3 p-2.5 text-left transition hover:bg-[#17171F]`}>
              <MapGlyph />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-black">{TOPICS[progress.topic] || 'Boshqa'}</span>
                <span className="block text-[12px] font-semibold text-white/45">Metro xaritasi — mavzuni tanlang</span>
              </span>
              <ChevronRight size={18} className="text-white/35" />
            </button>
            <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
              {TOPIC_LIST.map(t => {
                const on = (progress.topic || 'all') === t
                return (
                  <button key={t} type="button" onClick={() => onChange({ topic: t })} aria-pressed={on}
                    className={`h-10 flex-shrink-0 rounded-full border px-4 text-[14px] font-bold transition ${on ? 'border-[#A98BFF]/70 bg-[#A98BFF]/[0.12] text-white' : 'border-white/[0.08] bg-[#111118] text-white/70 hover:bg-[#17171F]'}`}>
                    {TOPICS[t]}
                  </button>
                )
              })}
            </div>

            <div className="mb-2.5 mt-5 flex items-end justify-between">
              <h2 className={LABEL}>Bugungi missiyalar</h2>
              <button type="button" onClick={() => onScreen('missions')} className="text-[12px] font-bold text-[#cbb9ff] hover:text-white">{done}/6 · Hammasi</button>
            </div>
            <div className={`${CARD} p-3.5`}>
              <MissionList missions={progress.missions} compact />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Tile onClick={() => onScreen('shop')} title="Do‘kon" note="Kiyim, gilam, kuchlar"
                art={<RunnerLook runner={progress.equip.runner} outfit={progress.equip.outfit} className="mt-3 h-[58px] w-[50px]" />} />
              <Tile onClick={() => onScreen('board')} title="Reyting" note="Haftalik" art={<Medal rank={1} size={30} />} />
            </div>

            <div className="sticky bottom-0 z-10 -mx-4 mt-5 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10]/95 to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 lg:static lg:mx-0 lg:mt-auto lg:bg-none lg:px-0 lg:pb-0 lg:pt-6">
              {flags.length > 0 && (
                <button type="button" onClick={() => setSheet(true)} className="mb-2 flex w-full flex-wrap items-center justify-center gap-1.5 text-[12px] font-bold text-white/55">
                  {flags.map(f => <span key={f} className="rounded-full bg-white/[0.07] px-2.5 py-1">{f}</span>)}
                </button>
              )}
              <Motion.button type="button" onClick={onStart} disabled={loading} whileTap={{ scale: 0.985 }}
                className="flex h-16 w-full items-center justify-center gap-2.5 rounded-[20px] text-lg font-black text-[#0B0B10] shadow-[0_18px_40px_-18px_rgba(169,139,255,0.75)] transition hover:brightness-105 disabled:opacity-70 lg:h-[72px] lg:text-xl"
                style={{ background: ACCENT }}>
                {loading ? <Loader2 size={22} className="animate-spin" /> : <Play size={22} className="fill-current" />}
                {loading ? 'Tayyorlanmoqda…' : `Boshlash · ${level}`}
              </Motion.button>
            </div>
          </div>
        </div>

        <div className="mt-8 lg:hidden">
          <h2 className={`${LABEL} mb-2.5`}>Qanday o‘ynaladi</h2>
          <ol className={`${CARD} space-y-3 p-4`}>
            {STEPS.map((st, i) => (
              <li key={i} className="flex gap-3 text-[14px] font-medium leading-snug text-white/70">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#A98BFF]/12 text-[#A98BFF]"><st.icon size={16} /></span>
                <span className="pt-1">{st.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <SettingsSheet open={sheet} settings={s} noMic={noMic} onSet={setSetting} onClose={() => setSheet(false)} />
    </div>
  )
}
