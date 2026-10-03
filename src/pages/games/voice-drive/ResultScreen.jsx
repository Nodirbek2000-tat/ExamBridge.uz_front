import { useEffect, useRef, useState } from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import {
  Check, Coins, Crown, Flag, Gamepad2, Loader2, RotateCcw, Route, Sliders, Sparkles, Star, Target, Trophy, Volume2, Warehouse,
} from 'lucide-react'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { ACTION_TONE, STAR_AT, formatDistance, levelById, missionText } from './content'
import { CARS, carById } from './cars'
import { finishRun } from './progress'
import ActionIcon from './ActionIcon'
import CarSvg from './CarSvg'

const wait = (ms) => new Promise(r => setTimeout(r, ms))
const CONFETTI = ['#f43f5e', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c']
const h = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }

/* A number that counts up once it is shown. */
function CountUp({ to, from = 0, ms = 900 }) {
  const [v, setV] = useState(from)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - t0) / ms)
      setV(Math.round(from + (to - from) * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, from, ms])
  return <>{v}</>
}

function Confetti() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 42 }, (_, i) => (
        <Motion.span key={i} className="absolute top-0 block h-2.5 w-1.5 rounded-sm"
          style={{ left: `${h(i) * 100}%`, background: CONFETTI[i % CONFETTI.length] }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: [-20, 420], rotate: h(i + 7) * 720 - 360, x: (h(i + 3) - 0.5) * 120, opacity: [1, 1, 0] }}
          transition={{ duration: 2.2 + h(i + 11) * 1.4, delay: h(i + 5) * 0.6, ease: 'easeIn' }} />
      ))}
    </div>
  )
}

function Stat({ icon, label, value, tone }) {
  const Icon = icon
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/45 lg:text-xs">
        <Icon size={13} className={tone} /> {label}
      </p>
      <p className="mt-1 text-xl font-black tabular-nums lg:text-3xl">{value}</p>
    </div>
  )
}

function CommandRow({ c, tone, note, heard, playing, onListen }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 lg:p-3">
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <ActionIcon action={c.action} size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-black leading-snug lg:text-lg">{c.text}</p>
        {heard && <p className="truncate text-[13px] font-semibold text-rose-200/90 lg:text-sm">Siz: «{heard}»</p>}
        <p className="text-[13px] font-semibold text-white/55">{note}</p>
      </div>
      <button type="button" onClick={() => onListen(c.text)} aria-label={`Listen: ${c.text}`}
        className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-bold hover:bg-white/20 lg:h-11 lg:px-4">
        {playing === c.text ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
        <span className="hidden min-[380px]:inline">Listen</span>
      </button>
    </div>
  )
}

export default function ResultScreen({ summary, knownBest, garage, onBest, onGarageChange, onAgain, onLevels, onHub, onGarage }) {
  const [res, setRes] = useState(null)
  const [playing, setPlaying] = useState('')
  const reqRef = useRef(null)
  const level = levelById(summary.level)
  // the missions the run started with (the saved board is refreshed once they are credited)
  const [missionDefs] = useState(() => garage?.missions || [])

  // one save per finished run (survives StrictMode's double effect)
  useEffect(() => {
    if (!reqRef.current || reqRef.current.id !== summary.id) {
      reqRef.current = { id: summary.id, p: finishRun(summary, knownBest) }
    }
    let alive = true
    reqRef.current.p.then((r) => {
      if (!alive) return
      setRes(r)
      onBest?.(r.best)
      onGarageChange?.(r.garage)
    })
    return () => { alive = false }
  }, [summary, knownBest, onBest, onGarageChange])

  useEffect(() => () => stopVoice(), [])

  const listenTo = (text) => {
    setPlaying(text)
    Promise.race([sayLine(text), wait(6000)]).then(() => setPlaying(p => (p === text ? '' : p)))
  }

  const cmds = summary.cmds || []
  const good = cmds.filter(c => c.ok > 0)
    .sort((a, b) => (b.ok - b.fail) - (a.ok - a.fail) || b.best - a.best).slice(0, 3)
  const practise = cmds.filter(c => c.fail + c.skip > 0)
    .sort((a, b) => (b.fail + b.skip) - (a.fail + a.skip)).slice(0, 4)
  const levelBest = res ? res.best[summary.level] : Math.max(knownBest?.[summary.level] || 0, summary.score)
  // rows are { name, score } (+ is_me when the server sends it); otherwise find me by my rank
  const myRank = res?.board?.me?.rank || null
  const isMe = (r, i) => (typeof r.is_me === 'boolean' ? r.is_me : myRank === i + 1 && r.score === res.board.me?.best_score)
  const next = STAR_AT.find(s => summary.score < s)
  const credit = res?.credit
  const bankAfter = res?.garage?.bank ?? null
  const doneMissions = (summary.missions || []).filter(m => m.done).map(m => missionDefs.find(d => d.id === m.id)).filter(Boolean)
  const openMissions = (summary.missions || []).filter(m => !m.done).map(m => ({ ...m, def: missionDefs.find(d => d.id === m.id) })).filter(m => m.def)
  // a car that just became affordable
  const affordable = credit && bankAfter != null
    ? CARS.find(c => !res.garage.owned.includes(c.id) && c.price <= bankAfter && c.price > credit.bankBefore) : null
  const car = carById(summary.car || garage?.car)
  const isNew = res?.isNew && summary.score > 0

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8 lg:pb-10 lg:pt-8">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <Motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-indigo-600 via-sky-600 to-cyan-500 p-5 text-center shadow-2xl lg:rounded-[40px] lg:p-10">
            {isNew && <Confetti />}
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80 lg:text-sm">Voice Drive · {level.title} {level.cefr}</p>
            <p className="mt-1 text-2xl font-black lg:text-4xl">O‘yin tugadi</p>
            <Motion.div className="mx-auto mt-2 w-48 lg:w-80" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <CarSvg model={car.id} up={garage?.up?.[car.id] || [1, 1]} className="w-full drop-shadow-xl" />
            </Motion.div>
            <p className="mt-1 text-6xl font-black tabular-nums drop-shadow lg:text-8xl"><CountUp to={summary.score} /></p>
            <p className="text-xs font-bold uppercase tracking-wider text-white/75 lg:text-sm">ochko</p>
            <div className="mt-2 flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <Motion.span key={i} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + i * 0.18, type: 'spring' }}>
                  <Star className={`h-9 w-9 lg:h-12 lg:w-12 ${i < summary.stars ? 'fill-yellow-300 text-yellow-300' : 'text-white/30'}`} />
                </Motion.span>
              ))}
            </div>
            {next && <p className="mt-1 text-xs font-semibold text-white/80 lg:text-sm">Keyingi yulduz: {next} ochko</p>}
            {isNew && (
              <Motion.p initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-yellow-300 px-4 py-1.5 text-base font-black text-black lg:text-xl">
                <Crown size={17} /> Yangi rekord!
              </Motion.p>
            )}
          </Motion.div>

          {/* coins → bank */}
          <div className="mt-4 rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-500/15 to-orange-500/10 p-4 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200/80 lg:text-sm">Tangalar</p>
                <p className="mt-1 text-sm font-bold text-white/80 lg:text-lg">
                  Yo‘ldan +{summary.coins}{credit?.reward ? ` · vazifalardan +${credit.reward}` : ''}
                </p>
              </div>
              <p className="flex flex-shrink-0 items-center gap-2 text-3xl font-black text-amber-300 lg:text-5xl">
                <Coins className="h-7 w-7 lg:h-10 lg:w-10" />
                {credit && bankAfter != null ? <CountUp from={credit.bankBefore} to={bankAfter} ms={1200} /> : <Loader2 size={24} className="animate-spin" />}
              </p>
            </div>
            {affordable && (
              <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="mt-3 flex items-center gap-3 rounded-2xl bg-black/30 p-3">
                <CarSvg model={affordable.id} className="w-24 flex-shrink-0 lg:w-32" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-base font-black text-amber-200 lg:text-xl"><Sparkles size={17} /> Yangi mashina ochildi!</p>
                  <p className="text-sm font-semibold text-white/75 lg:text-base">Endi <b>{affordable.name}</b>ni garajda sotib olishingiz mumkin.</p>
                </div>
                <button type="button" onClick={onGarage} className="btn-glass flex h-11 flex-shrink-0 items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 text-sm font-black text-black lg:h-12 lg:px-5 lg:text-base">
                  <Warehouse size={16} /> Garaj
                </button>
              </Motion.div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <Stat icon={Route} label="Masofa" value={formatDistance(summary.meters)} tone="text-sky-300" />
            <Stat icon={Coins} label="Tangalar" value={summary.coins} tone="text-amber-300" />
            <Stat icon={Target} label="Aniqlik" value={`${Math.round(summary.accuracy * 100)}%`} tone="text-emerald-300" />
            <Stat icon={Trophy} label="Rekord" value={levelBest} tone="text-yellow-300" />
          </div>
          <p className="mt-2 text-center text-[13px] font-semibold text-white/50 lg:text-base">
            {summary.linesSaid} ta buyruq to‘g‘ri aytildi · {summary.perfect} tasi a’lo · {summary.duration} s
          </p>

          <h2 className="mb-2 mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:text-sm">Vazifalar</h2>
          <div className="space-y-2">
            {doneMissions.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><Check size={18} /></span>
                <p className="min-w-0 flex-1 text-[15px] font-bold lg:text-base">{missionText(m)}</p>
                <span className="flex-shrink-0 rounded-full bg-amber-400/20 px-2.5 py-1 text-sm font-black text-amber-300">+{m.reward}</span>
              </div>
            ))}
            {openMissions.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60"><Flag size={17} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold lg:text-base">{missionText(m.def)}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(1, m.value / m.n) * 100}%` }} />
                  </div>
                </div>
                <span className="flex-shrink-0 text-sm font-black text-white/45">+{m.def.reward}</span>
              </div>
            ))}
            {!doneMissions.length && !openMissions.length && (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-white/60">Vazifalar keyingi o‘yinda.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <h2 className="mb-2 mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:mt-0 lg:text-sm">Xatolar — to‘g‘risini tinglang</h2>
          {practise.length ? (
            <div className="space-y-2">
              {practise.map(c => (
                <CommandRow key={c.text} c={c} tone="bg-rose-500/20 text-rose-300" playing={playing} onListen={listenTo} heard={c.heard}
                  note={`${c.fail} marta xato${c.skip ? ` · ${c.skip} marta o‘tkazildi` : ''}`} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold text-white/70 lg:text-base">Xato bo‘lmadi — barakalla!</p>
          )}

          {good.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:text-sm">Zo‘r aytdingiz</h2>
              <div className="space-y-2">
                {good.map(c => (
                  <CommandRow key={c.text} c={c} tone={`bg-gradient-to-br ${ACTION_TONE[c.action] || 'from-emerald-400 to-green-600'} text-white`} playing={playing} onListen={listenTo}
                    note={`${c.ok} marta to‘g‘ri · eng yaxshisi ${Math.round(c.best * 100)}%`} />
                ))}
              </div>
            </>
          )}

          <h2 className="mb-2 mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:text-sm">Haftalik reyting</h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            {!res ? (
              <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-white/40" /></div>
            ) : !res.board ? (
              <p className="py-2 text-center text-sm font-semibold text-white/60">
                Reyting hozir yuklanmadi. Natijangiz shu qurilmada saqlandi.
              </p>
            ) : res.board.top.length === 0 ? (
              <p className="py-2 text-center text-sm font-semibold text-white/60">Bu hafta hali hech kim o‘ynamadi — birinchi bo‘ling!</p>
            ) : (
              <>
                <ol className="space-y-1">
                  {res.board.top.map((r, i) => (
                    <li key={`${r.name}-${i}`}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-bold lg:text-base ${isMe(r, i) ? 'bg-sky-500/20 text-white' : 'text-white/80'}`}>
                      <span className={`w-6 text-center font-black ${i === 0 ? 'text-yellow-300' : i === 1 ? 'text-slate-200' : i === 2 ? 'text-amber-500' : 'text-white/40'}`}>{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{r.name}{isMe(r, i) ? ' (siz)' : ''}</span>
                      <span className="tabular-nums">{r.score}</span>
                    </li>
                  ))}
                </ol>
                {myRank && !res.board.top.some(isMe) && (
                  <p className="mt-2 border-t border-white/10 pt-2 text-center text-sm font-bold text-white/70">
                    Sizning o‘rningiz: #{res.board.me.rank} · {res.board.me.best_score} ochko
                  </p>
                )}
              </>
            )}
          </div>

          <div className="mt-6 space-y-2.5">
            <button type="button" onClick={onAgain}
              className="btn-glass flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-xl font-black text-white lg:h-20 lg:text-2xl">
              <RotateCcw size={21} /> Yana o‘ynash
            </button>
            <div className="grid grid-cols-3 gap-2.5">
              <button type="button" onClick={onGarage}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/10 text-sm font-black hover:bg-white/15 lg:h-14 lg:text-base">
                <Warehouse size={16} /> Garaj
              </button>
              <button type="button" onClick={onLevels}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/10 text-sm font-black hover:bg-white/15 lg:h-14 lg:text-base">
                <Sliders size={16} /> Daraja
              </button>
              <button type="button" onClick={onHub}
                className="flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-white/10 text-sm font-black hover:bg-white/15 lg:h-14 lg:text-base">
                <Gamepad2 size={16} /> O‘yinlar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* phones: "play again" always at hand */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#08080F] via-[#08080F]/95 to-transparent px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-6 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2.5">
          <button type="button" onClick={onAgain}
            className="btn-glass flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-lg font-black text-white">
            <RotateCcw size={19} /> Yana o‘ynash
          </button>
          <button type="button" onClick={onGarage} aria-label="Garaj"
            className="flex h-14 w-16 items-center justify-center rounded-2xl bg-white/10 hover:bg-white/15">
            <Warehouse size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
