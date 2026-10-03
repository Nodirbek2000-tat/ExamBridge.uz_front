import { useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, Gauge, Heart, Loader2, Mic, Play, Target, Timer, Trophy, Volume2, Warehouse, X } from 'lucide-react'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { ACTION_TONE, ACTION_UZ, LEVELS, LIVES, levelById, missionText } from './content'
import { carById, nextCar } from './cars'
import { CoinBadge, Turntable } from './ui'
import ActionIcon from './ActionIcon'

const HERO = {
  easy: 'from-sky-500 via-sky-400 to-cyan-200',
  medium: 'from-indigo-950 via-fuchsia-700 to-orange-400',
  hard: 'from-[#02040f] via-indigo-950 to-blue-800',
}
const LEVEL_TONE = {
  easy: 'from-emerald-400 to-teal-500',
  medium: 'from-amber-400 to-orange-500',
  hard: 'from-fuchsia-500 to-indigo-500',
}
const SAMPLE = {
  easy: ['Left', 'Stop', 'Beep beep'],
  medium: ['Turn left', 'Honk the horn'],
  hard: ['Turn left at the bank'],
}

const wait = (ms) => new Promise(r => setTimeout(r, ms))

function Skyline({ level }) {
  const night = level === 'hard'
  return (
    <svg viewBox="0 0 400 80" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[22%] h-[30%] w-full opacity-70" aria-hidden="true">
      {[[0, 40, 26], [30, 22, 44], [60, 50, 18], [84, 30, 34], [118, 14, 52], [150, 44, 22], [176, 26, 40], [210, 54, 16], [230, 20, 48], [262, 36, 30], [296, 12, 56], [330, 42, 24], [356, 28, 38], [384, 46, 16]].map(([x, y, w], i) => (
        <rect key={i} x={x} y={y} width={w} height={80 - y} fill={night ? '#0c1230' : level === 'medium' ? '#2c1640' : '#a9c9e2'} />
      ))}
      {night && [[40, 30], [124, 22], [128, 40], [240, 30], [300, 20], [306, 44], [360, 36]].map(([x, y], i) => <rect key={i} x={x} y={y} width="3" height="4" fill="#ffd27a" />)}
    </svg>
  )
}

function Hero({ level, garage, best, onGarage }) {
  const car = carById(garage.car)
  const up = garage.up[garage.car] || [1, 1]
  return (
    <div className={`relative overflow-hidden rounded-[30px] bg-gradient-to-b ${HERO[level.id]} shadow-2xl lg:h-full lg:min-h-[560px] lg:rounded-[40px]`}>
      <Skyline level={level.id} />
      <div className="absolute inset-x-0 bottom-0 h-[24%] bg-gradient-to-b from-slate-700 to-slate-900" />
      <div className="relative px-5 pt-4 lg:px-10 lg:pt-9">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/80 lg:text-sm">Speak &amp; Play</p>
        <h1 className="mt-0.5 text-4xl font-black tracking-tight text-white drop-shadow sm:text-5xl lg:text-7xl">VOICE DRIVE</h1>
        <p className="mt-1 max-w-[20rem] text-[15px] font-bold text-white/95 drop-shadow lg:max-w-xl lg:text-2xl">Mashinani ovozing bilan boshqar — inglizcha buyruq ber!</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-1.5 text-sm font-black text-yellow-200 backdrop-blur lg:text-lg">
            <Trophy size={16} /> Rekord: {best?.[level.id] || 0}
          </span>
          <CoinBadge value={garage.bank} className="bg-black/35 backdrop-blur" />
        </div>
      </div>
      <div className="relative mx-auto mt-2 w-[88%] max-w-[560px] pb-4 lg:mt-6 lg:w-[80%] lg:max-w-[760px] lg:pb-10">
        <Turntable model={car.id} up={up} glow={level.id === 'hard' ? '#6366f1' : '#38bdf8'} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xl font-black text-white drop-shadow lg:text-3xl">{car.name}</p>
            <p className="truncate text-xs font-bold text-white/75 lg:text-base">{car.perkUz}</p>
          </div>
          <button type="button" onClick={onGarage}
            className="btn-glass flex h-12 flex-shrink-0 items-center gap-2 rounded-2xl bg-white px-4 text-base font-black text-slate-900 lg:h-14 lg:px-6 lg:text-lg">
            <Warehouse size={19} /> Garaj
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StartScreen({ levelId, onLevel, best, garage, hear, onHear, onStart, onBack, onGarage, supported }) {
  const level = levelById(levelId)
  const [playing, setPlaying] = useState('')
  const [showAll, setShowAll] = useState(false)
  const hearOn = !!hear?.[level.id]
  const upcoming = nextCar(garage)

  useEffect(() => preloadLines(level.commands.map(c => c.text)), [level])
  useEffect(() => () => stopVoice(), [])

  const listenTo = (text) => {
    setPlaying(text)
    Promise.race([sayLine(text), wait(6000)]).then(() => setPlaying(p => (p === text ? '' : p)))
  }
  const commands = showAll ? level.commands : level.commands.slice(0, 5)

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pt-[max(16px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8 lg:pb-8">
      <div className="mb-4 flex items-center gap-3">
        <button type="button" onClick={onBack} aria-label="Orqaga"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10 lg:h-12 lg:w-12">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/40 lg:text-xs">O‘yinlar</p>
          <p className="truncate text-base font-black lg:text-xl">Voice Drive</p>
        </div>
        <CoinBadge value={garage.bank} />
      </div>

      <div className="lg:grid lg:flex-1 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7">
          <Hero level={level} garage={garage} best={best} onGarage={onGarage} />
          {upcoming && (
            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/75 lg:text-base">
              {garage.bank >= upcoming.price
                ? <>Tangalar yetadi — garajda <b className="text-amber-300">{upcoming.name}</b>ni oching!</>
                : <>Keyingi mashina: <b className="text-white">{upcoming.name}</b> — yana <b className="text-amber-300">{upcoming.price - garage.bank}</b> tanga kerak.</>}
            </p>
          )}
        </div>

        <div className="lg:col-span-5 lg:flex lg:flex-col">
          <h2 className="mb-2 mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:mt-0 lg:text-sm">Darajani tanlang</h2>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            {LEVELS.map(l => {
              const on = l.id === level.id
              return (
                <Motion.button key={l.id} type="button" onClick={() => onLevel(l.id)} aria-pressed={on} whileTap={{ scale: 0.97 }}
                  className={`relative overflow-hidden rounded-2xl border p-3 text-left transition lg:rounded-3xl lg:p-4 ${on ? 'border-white/50 bg-white/12 ring-2 ring-white/30' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07]'}`}>
                  <span className={`inline-block rounded-full bg-gradient-to-r ${LEVEL_TONE[l.id]} px-2 py-0.5 text-[11px] font-black text-white lg:text-sm`}>{l.cefr}</span>
                  <p className="mt-1.5 text-base font-black leading-tight lg:text-2xl">{l.title}</p>
                  <p className="mt-0.5 text-[11px] font-semibold leading-tight text-white/55 lg:text-sm">{l.uz}</p>
                  <p className="mt-1.5 hidden truncate text-sm font-bold italic text-sky-200 lg:block">“{SAMPLE[l.id][0]}”</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-300/90 lg:text-sm">
                    <Trophy size={12} /> {best?.[l.id] || 0}
                  </p>
                </Motion.button>
              )
            })}
          </div>
          <p className="mt-2 text-[13px] font-semibold text-white/55 lg:text-base">{level.note} · masalan: <span className="text-sky-200">{SAMPLE[level.id].map(s => `“${s}”`).join(', ')}</span></p>

          <button type="button" onClick={() => onHear(level.id, !hearOn)} aria-pressed={hearOn}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07] lg:p-4">
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${hearOn ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/60'}`}><Volume2 size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-black lg:text-lg">Avval eshitib, keyin aytish</span>
              <span className="block text-[13px] font-semibold text-white/55 lg:text-sm">O‘yin har buyruqni o‘zi aytib beradi — bolalar uchun qulay</span>
            </span>
            <span className={`relative h-7 w-12 flex-shrink-0 rounded-full transition ${hearOn ? 'bg-sky-500' : 'bg-white/15'}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${hearOn ? 'left-6' : 'left-1'}`} />
            </span>
          </button>

          <h2 className="mb-2 mt-6 flex items-center justify-between text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:text-sm">
            <span>Bu o‘yindagi vazifalar</span><span className="normal-case tracking-normal text-white/40">har biri — tanga</span>
          </h2>
          <div className="space-y-2">
            {garage.missions.map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 lg:p-3.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300"><Target size={18} /></span>
                <p className="min-w-0 flex-1 text-[15px] font-bold leading-snug lg:text-base">{missionText(m)}</p>
                <span className="flex-shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-sm font-black text-amber-300">+{m.reward}</span>
              </div>
            ))}
          </div>

          {!supported && <div className="mt-6"><VoiceNotice error="unsupported" /></div>}

          <div className="sticky bottom-0 z-10 -mx-4 mt-5 bg-gradient-to-t from-[#08080F] via-[#08080F]/95 to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 lg:static lg:mx-0 lg:bg-none lg:px-0 lg:pb-0">
            <Motion.button type="button" onClick={onStart} disabled={!supported} whileTap={{ scale: 0.98 }}
              className={`btn-glass flex h-16 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r ${LEVEL_TONE[level.id]} text-xl font-black text-white shadow-2xl disabled:cursor-not-allowed disabled:opacity-40 lg:h-20 lg:rounded-3xl lg:text-2xl`}>
              <Play size={24} className="fill-white" /> Boshlash · {level.title}
            </Motion.button>
          </div>
        </div>
      </div>

      <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-8">
          <div className="mb-2 flex items-end justify-between gap-3">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:text-sm">Buyruqlar · {level.commands.length} ta</h2>
            <p className="flex items-center gap-1 text-[12px] font-bold text-white/50 lg:text-sm"><Timer size={13} /> har biriga {level.window} s</p>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {commands.map(c => (
              <div key={c.text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ACTION_TONE[c.action]} text-white`}>
                  <ActionIcon action={c.scene === 'school' ? 'school' : c.action} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-black leading-snug lg:text-lg">{c.text}</p>
                  <p className="text-[13px] font-semibold text-white/55">{ACTION_UZ[c.action]}{c.action === 'go' ? ' (to‘xtagandan keyin)' : ''}</p>
                </div>
                <button type="button" onClick={() => listenTo(c.text)} aria-label={`Listen: ${c.text}`}
                  className="flex h-11 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm font-bold text-white/90 transition hover:bg-white/20">
                  {playing === c.text ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  <span className="hidden min-[380px]:inline">Listen</span>
                </button>
              </div>
            ))}
          </div>
          {level.commands.length > 5 && (
            <button type="button" onClick={() => setShowAll(v => !v)}
              className="mx-auto mt-2 flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold text-white/70 hover:bg-white/5">
              {showAll ? 'Kamroq' : `Hammasini ko‘rish (${level.commands.length})`} <ChevronDown size={16} className={showAll ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
        <div className="lg:col-span-4">
          <h2 className="mb-2 mt-6 text-xs font-black uppercase tracking-[0.18em] text-white/50 lg:mt-0 lg:text-sm">Qanday o‘ynaladi</h2>
          <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-[14px] font-semibold text-white/80 lg:text-base">
            <p className="flex gap-3"><Mic size={18} className="mt-0.5 flex-shrink-0 text-sky-300" /> Mikrofonni bir marta bosing — keyin o‘yin o‘zi tinglaydi.</p>
            <p className="flex gap-3"><Play size={18} className="mt-0.5 flex-shrink-0 text-emerald-300" /> Tepada buyruq chiqadi. Uni ovoz chiqarib ayting — mashina darhol bajaradi.</p>
            <p className="flex gap-3"><X size={18} className="mt-0.5 flex-shrink-0 text-rose-300" /> Xato yoki kech — ✗, bitta jon ketadi va o‘sha buyruq yana chiqadi.</p>
            <p className="flex gap-3"><Heart size={18} className="mt-0.5 flex-shrink-0 text-rose-400" /> {LIVES} ta jon. Ketma-ket to‘g‘ri aytsangiz — kombo, ochko ko‘payadi.</p>
            <p className="flex gap-3"><Gauge size={18} className="mt-0.5 flex-shrink-0 text-amber-300" /> Tangalarni yig‘ing va garajda yangi, kuchliroq mashinalarni oching!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
