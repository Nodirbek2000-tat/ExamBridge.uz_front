import { useEffect, useRef, useState } from 'react'
import { motion as Motion, useReducedMotion } from 'framer-motion'
import { Check, Crown, Gamepad2, Loader2, RotateCcw, Sliders, Sparkles, Star, Volume2, Warehouse } from 'lucide-react'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { STAR_AT, VOICE, formatDistance, levelById, missionText } from './content'
import { CARS, carById } from './cars'
import { finishRun } from './progress'
import ActionIcon, { CoinIcon } from './ActionIcon'
import CarStage from './CarStage'

const CARD = 'rounded-[24px] border border-white/[0.08] bg-[#111118]'
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 lg:text-xs'

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

function Stat({ label, value }) {
  return (
    <div className={`${CARD} p-3.5 lg:p-4`}>
      <p className={LABEL}>{label}</p>
      <p className="mt-1.5 text-xl font-black tabular-nums lg:text-3xl">{value}</p>
    </div>
  )
}

function CommandRow({ c, bad, note, heard, playing, onListen }) {
  return (
    <div className={`${CARD} flex items-center gap-3 p-3`}>
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${bad ? 'bg-rose-500/12 text-rose-300' : 'bg-[#FFB224]/10 text-[#FFB224]'}`}>
        <ActionIcon action={c.action} size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold leading-snug lg:text-[17px]">{c.text}</p>
        {heard && <p className="truncate text-[13px] font-medium text-rose-200/90 lg:text-sm">Siz: «{heard}»</p>}
        <p className="text-[13px] font-medium text-white/45">{note}</p>
      </div>
      <button type="button" onClick={() => onListen(c.text)} aria-label={`Listen: ${c.text}`}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] min-[380px]:w-auto min-[380px]:gap-1.5 min-[380px]:px-3.5">
        {playing === c.text ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
        <span className="hidden text-sm font-semibold min-[380px]:inline">Listen</span>
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
    Promise.race([sayLine(text, { voice: VOICE }), wait(6000)]).then(() => setPlaying(p => (p === text ? '' : p)))
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
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <div className="mx-auto w-full max-w-lg px-4 pb-28 pt-[max(16px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8 lg:pb-10 lg:pt-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            <Motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_70%,#262631_0%,#14141b_55%,#0d0d12_100%)] px-5 pb-6 pt-5 text-center lg:rounded-[32px] lg:px-10 lg:pb-9 lg:pt-8">
              {isNew && <Confetti />}
              <p className={LABEL}>Voice Drive · {level.title} {level.cefr}</p>
              <p className="mt-1.5 text-2xl font-black tracking-tight lg:text-4xl">O‘yin tugadi</p>
              <CarStage carId={car.id} up={garage?.up?.[car.id] || [1, 1]} className="mx-auto -mb-1 aspect-[16/9] w-full max-w-[560px]" />
              <p className="text-6xl font-black leading-none tabular-nums tracking-tight lg:text-8xl"><CountUp to={summary.score} /></p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/45 lg:text-xs">ochko</p>
              <div className="mt-3 flex justify-center gap-2">
                {[0, 1, 2].map(i => (
                  <Motion.span key={i} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + i * 0.18, type: 'spring' }}>
                    <Star className={`h-8 w-8 lg:h-11 lg:w-11 ${i < summary.stars ? 'fill-[#FFB224] text-[#FFB224]' : 'text-white/15'}`} strokeWidth={1.6} />
                  </Motion.span>
                ))}
              </div>
              {next && <p className="mt-2 text-[13px] font-medium text-white/50 lg:text-sm">Keyingi yulduz: {next} ochko</p>}
              {isNew && (
                <Motion.p initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#FFB224] px-4 py-1.5 text-base font-black text-[#0B0B10] lg:text-lg">
                  <Crown size={17} /> Yangi rekord!
                </Motion.p>
              )}
            </Motion.div>

            {/* coins → bank */}
            <div className={`${CARD} mt-4 p-4 lg:p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={LABEL}>Tangalar</p>
                  <p className="mt-1 text-[15px] font-semibold text-white/75 lg:text-lg">
                    Yo‘ldan +{summary.coins}{credit?.reward ? ` · vazifalardan +${credit.reward}` : ''}
                  </p>
                </div>
                <p className="flex flex-shrink-0 items-center gap-2 text-3xl font-black tabular-nums lg:text-5xl">
                  <CoinIcon size={30} />
                  {credit && bankAfter != null ? <CountUp from={credit.bankBefore} to={bankAfter} ms={1200} /> : <Loader2 size={24} className="animate-spin text-white/40" />}
                </p>
              </div>
              {affordable && (
                <Motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                  className="mt-4 flex items-center gap-3 rounded-2xl bg-[#FFB224]/[0.08] p-3">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFB224]/15 text-[#FFB224]"><Sparkles size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-[#FFB224] lg:text-lg">Yangi mashina ochildi</p>
                    <p className="text-[13px] font-medium text-white/65 lg:text-base">Endi <b className="text-white">{affordable.name}</b>ni garajda sotib olishingiz mumkin.</p>
                  </div>
                  <button type="button" onClick={onGarage} className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full bg-[#FFB224] px-4 text-sm font-bold text-[#0B0B10] lg:h-11 lg:text-base">
                    Garaj
                  </button>
                </Motion.div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-2.5">
              <Stat label="Masofa" value={formatDistance(summary.meters)} />
              <Stat label="Tangalar" value={summary.coins} />
              <Stat label="Aniqlik" value={`${Math.round(summary.accuracy * 100)}%`} />
              <Stat label="Rekord" value={levelBest} />
            </div>
            <p className="mt-2.5 text-center text-[13px] font-medium text-white/45 lg:text-sm">
              {summary.linesSaid} ta buyruq to‘g‘ri aytildi · {summary.perfect} tasi a’lo · {summary.duration} s
            </p>

            <h2 className={`${LABEL} mb-2.5 mt-6`}>Vazifalar</h2>
            <div className={`${CARD} divide-y divide-white/[0.06]`}>
              {doneMissions.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"><Check size={15} strokeWidth={3} /></span>
                  <p className="min-w-0 flex-1 text-[14px] font-semibold lg:text-[15px]">{missionText(m)}</p>
                  <span className="flex-shrink-0 text-sm font-bold tabular-nums text-[#FFB224]">+{m.reward}</span>
                </div>
              ))}
              {openMissions.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-3.5 py-3">
                  <span className="h-7 w-7 flex-shrink-0 rounded-full border border-white/[0.12]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-white/80 lg:text-[15px]">{missionText(m.def)}</p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                      <div className="h-full rounded-full bg-[#FFB224]" style={{ width: `${Math.min(1, m.value / m.n) * 100}%` }} />
                    </div>
                  </div>
                  <span className="flex-shrink-0 text-sm font-bold tabular-nums text-white/35">+{m.def.reward}</span>
                </div>
              ))}
              {!doneMissions.length && !openMissions.length && (
                <p className="p-3.5 text-sm font-medium text-white/50">Vazifalar keyingi o‘yinda.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-5">
            <h2 className={`${LABEL} mb-2.5 mt-6 lg:mt-0`}>Xatolar — to‘g‘risini tinglang</h2>
            {practise.length ? (
              <div className="space-y-2">
                {practise.map(c => (
                  <CommandRow key={c.text} c={c} bad playing={playing} onListen={listenTo} heard={c.heard}
                    note={`${c.fail} marta xato${c.skip ? ` · ${c.skip} marta o‘tkazildi` : ''}`} />
                ))}
              </div>
            ) : (
              <p className={`${CARD} p-4 text-sm font-medium text-white/65 lg:text-base`}>Xato bo‘lmadi — barakalla!</p>
            )}

            {good.length > 0 && (
              <>
                <h2 className={`${LABEL} mb-2.5 mt-6`}>Zo‘r aytdingiz</h2>
                <div className="space-y-2">
                  {good.map(c => (
                    <CommandRow key={c.text} c={c} playing={playing} onListen={listenTo}
                      note={`${c.ok} marta to‘g‘ri · eng yaxshisi ${Math.round(c.best * 100)}%`} />
                  ))}
                </div>
              </>
            )}

            <h2 className={`${LABEL} mb-2.5 mt-6`}>Haftalik reyting</h2>
            <div className={`${CARD} p-2.5`}>
              {!res ? (
                <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-white/35" /></div>
              ) : !res.board ? (
                <p className="py-3 text-center text-sm font-medium text-white/50">
                  Reyting hozir yuklanmadi. Natijangiz shu qurilmada saqlandi.
                </p>
              ) : res.board.top.length === 0 ? (
                <p className="py-3 text-center text-sm font-medium text-white/50">Bu hafta hali hech kim o‘ynamadi — birinchi bo‘ling!</p>
              ) : (
                <>
                  <ol className="space-y-0.5">
                    {res.board.top.map((r, i) => (
                      <li key={`${r.name}-${i}`}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold lg:text-base ${isMe(r, i) ? 'bg-[#FFB224]/10 text-white' : 'text-white/75'}`}>
                        <span className={`w-6 text-center font-black tabular-nums ${i < 3 ? 'text-[#FFB224]' : 'text-white/35'}`}>{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{r.name}{isMe(r, i) ? ' (siz)' : ''}</span>
                        <span className="tabular-nums">{r.score}</span>
                      </li>
                    ))}
                  </ol>
                  {myRank && !res.board.top.some(isMe) && (
                    <p className="mt-2 border-t border-white/[0.06] pt-2 text-center text-sm font-semibold text-white/60">
                      Sizning o‘rningiz: #{res.board.me.rank} · {res.board.me.best_score} ochko
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 hidden space-y-2.5 lg:block">
              <button type="button" onClick={onAgain}
                className="flex h-[68px] w-full items-center justify-center gap-2 rounded-[20px] bg-[#FFB224] text-xl font-black text-[#0B0B10] transition hover:brightness-105">
                <RotateCcw size={21} /> Yana o‘ynash
              </button>
              <div className="grid grid-cols-3 gap-2.5">
                {[[onGarage, <Warehouse key="g" size={17} />, 'Garaj'], [onLevels, <Sliders key="l" size={17} />, 'Daraja'], [onHub, <Gamepad2 key="h" size={17} />, 'O‘yinlar']].map(([fn, icon, label]) => (
                  <button key={label} type="button" onClick={fn}
                    className="flex h-14 items-center justify-center gap-1.5 rounded-[18px] border border-white/[0.08] bg-[#111118] text-base font-bold text-white/85 transition hover:bg-[#17171F]">
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5 lg:hidden">
              <button type="button" onClick={onLevels} className="flex h-12 items-center justify-center gap-1.5 rounded-[16px] border border-white/[0.08] bg-[#111118] text-sm font-bold text-white/80"><Sliders size={16} /> Daraja</button>
              <button type="button" onClick={onHub} className="flex h-12 items-center justify-center gap-1.5 rounded-[16px] border border-white/[0.08] bg-[#111118] text-sm font-bold text-white/80"><Gamepad2 size={16} /> O‘yinlar</button>
            </div>
          </div>
        </div>
      </div>

      {/* phones: "play again" always at hand */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10]/95 to-transparent px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-6 lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2.5">
          <button type="button" onClick={onAgain}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] bg-[#FFB224] text-lg font-black text-[#0B0B10]">
            <RotateCcw size={19} /> Yana o‘ynash
          </button>
          <button type="button" onClick={onGarage} aria-label="Garaj"
            className="flex h-14 w-16 items-center justify-center rounded-[18px] border border-white/[0.08] bg-[#111118] text-white/85">
            <Warehouse size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
