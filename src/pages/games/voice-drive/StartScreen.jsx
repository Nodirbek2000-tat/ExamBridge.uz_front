/*
 * VOICE DRIVE start: the selected car on a 3D turntable, the level, the
 * "hear it first" switch, this run's missions and every command of the level
 * (each can be heard in the coach's voice).
 */
import { useEffect, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, Play, Trophy, Volume2 } from 'lucide-react'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { ACTION_UZ, LEVELS, LIVES, VOICE, levelById, missionText } from './content'
import { carById, nextCar } from './cars'
import { CoinBadge } from './ui'
import ActionIcon from './ActionIcon'
import CarStage from './CarStage'
import { preloadDriveScene } from './webgl'

const SAMPLE = {
  easy: ['Left', 'Stop', 'Beep beep'],
  medium: ['Turn left', 'Honk the horn'],
  hard: ['Turn left at the bank'],
}
const STEPS = [
  'Mikrofonni bir marta bosing — keyin o‘yin o‘zi tinglaydi.',
  'Tepada buyruq chiqadi: uni ovoz chiqarib ayting — mashina darhol bajaradi.',
  `Xato yoki kech — bitta jon ketadi va o‘sha buyruq yana chiqadi. ${LIVES} ta jon bor.`,
  'Ketma-ket to‘g‘ri — kombo. Tangalarga garajda yangi mashina oling.',
]

const wait = (ms) => new Promise(r => setTimeout(r, ms))
const CARD = 'rounded-[24px] border border-white/[0.08] bg-[#111118]'
const LABEL = 'text-[11px] font-bold uppercase tracking-[0.2em] text-white/40 lg:text-xs'

function Hero({ level, garage, best, onGarage }) {
  const car = carById(garage.car)
  const up = garage.up[garage.car] || [1, 1]
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_50%_78%,#262631_0%,#14141b_52%,#0d0d12_100%)] lg:flex lg:h-full lg:min-h-[600px] lg:flex-col lg:rounded-[32px]">
      <div className="relative px-5 pt-5 lg:px-9 lg:pt-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#FFB224] lg:text-xs">Speak &amp; drive</p>
        <h1 className="mt-1 text-[34px] font-black leading-none tracking-tight text-white sm:text-5xl lg:text-6xl">Voice Drive</h1>
        <p className="mt-2 max-w-[22rem] text-[15px] font-medium leading-snug text-white/60 lg:max-w-lg lg:text-lg">Mashinani ovozing bilan boshqar — inglizcha buyruq ber.</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold text-white/75 lg:text-sm">
          <Trophy size={14} className="text-[#FFB224]" /> Rekord · {level.title}: <span className="tabular-nums text-white">{best?.[level.id] || 0}</span>
        </p>
      </div>
      <CarStage carId={car.id} up={up} className="mx-auto -mt-2 aspect-[16/10] w-full max-w-[680px] lg:mt-0 lg:flex-1" />
      <div className="relative flex items-center justify-between gap-3 px-5 pb-5 lg:px-9 lg:pb-8">
        <div className="min-w-0">
          <p className="truncate text-xl font-black tracking-tight lg:text-3xl">{car.name}</p>
          <p className="truncate text-[13px] font-medium text-white/50 lg:text-base">{car.perkUz}</p>
        </div>
        <button type="button" onClick={onGarage}
          className="flex h-11 flex-shrink-0 items-center gap-1 rounded-full border border-white/[0.1] bg-white/[0.06] pl-4 pr-3 text-[15px] font-bold text-white transition hover:bg-white/[0.1] lg:h-12 lg:pl-5 lg:text-base">
          Garaj <ChevronRight size={18} />
        </button>
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

  useEffect(() => preloadLines(level.commands.map(c => ({ text: c.text, voice: VOICE }))), [level])
  useEffect(() => () => stopVoice(), [])
  // the 3D road downloads while the player chooses (Start then opens without a wait)
  useEffect(() => {
    const id = window.requestIdleCallback ? window.requestIdleCallback(preloadDriveScene, { timeout: 2500 }) : setTimeout(preloadDriveScene, 1200)
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id))
  }, [])

  const listenTo = (text) => {
    setPlaying(text)
    Promise.race([sayLine(text, { voice: VOICE }), wait(6000)]).then(() => setPlaying(p => (p === text ? '' : p)))
  }
  const commands = showAll ? level.commands : level.commands.slice(0, 6)

  return (
    <div className="min-h-screen bg-[#0B0B10] text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col px-4 pb-6 pt-[max(14px,env(safe-area-inset-top))] lg:max-w-[1440px] lg:px-8 lg:pb-10">
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={onBack} aria-label="Orqaga"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/80 transition hover:bg-white/[0.06]">
            <ChevronLeft size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={LABEL}>O‘yinlar</p>
            <p className="truncate text-base font-bold lg:text-lg">Voice Drive</p>
          </div>
          <CoinBadge value={garage.bank} />
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            <Hero level={level} garage={garage} best={best} onGarage={onGarage} />
            {upcoming && (
              <p className="mt-3 px-1 text-[13px] font-medium text-white/50 lg:text-sm">
                {garage.bank >= upcoming.price
                  ? <>Tangalar yetadi — garajda <b className="font-bold text-[#FFB224]">{upcoming.name}</b>ni oching.</>
                  : <>Keyingi mashina: <b className="font-bold text-white/80">{upcoming.name}</b> — yana <b className="font-bold text-[#FFB224]">{upcoming.price - garage.bank}</b> tanga.</>}
              </p>
            )}
          </div>

          <div className="lg:col-span-5 lg:flex lg:flex-col">
            <h2 className={`${LABEL} mb-2.5 mt-6 lg:mt-1`}>Daraja</h2>
            <div className="grid grid-cols-3 gap-2 lg:gap-2.5">
              {LEVELS.map(l => {
                const on = l.id === level.id
                return (
                  <Motion.button key={l.id} type="button" onClick={() => onLevel(l.id)} aria-pressed={on} whileTap={{ scale: 0.97 }}
                    className={`relative rounded-[20px] border p-3 text-left transition lg:p-4 ${on ? 'border-[#FFB224]/70 bg-[#FFB224]/[0.07]' : 'border-white/[0.08] bg-[#111118] hover:bg-[#17171F]'}`}>
                    <span className={`text-[11px] font-bold tracking-wider lg:text-xs ${on ? 'text-[#FFB224]' : 'text-white/45'}`}>{l.cefr}</span>
                    <p className="mt-1 text-base font-black leading-tight lg:text-xl">{l.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-tight text-white/45 lg:text-[13px]">{l.uz}</p>
                    <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white/50 lg:text-[13px]">
                      <Trophy size={11} className="text-[#FFB224]/80" /> <span className="tabular-nums">{best?.[l.id] || 0}</span>
                    </p>
                  </Motion.button>
                )
              })}
            </div>
            <p className="mt-2.5 px-1 text-[13px] font-medium text-white/50 lg:text-sm">{level.note} · masalan: <span className="text-white/80">{SAMPLE[level.id].map(s => `“${s}”`).join(', ')}</span></p>

            <button type="button" onClick={() => onHear(level.id, !hearOn)} aria-pressed={hearOn}
              className={`${CARD} mt-4 flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-[#17171F] lg:p-4`}>
              <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${hearOn ? 'bg-[#FFB224]/15 text-[#FFB224]' : 'bg-white/[0.06] text-white/50'}`}><Volume2 size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-bold lg:text-base">Avval eshitib, keyin aytish</span>
                <span className="block text-[13px] font-medium text-white/45">Murabbiy har buyruqni o‘zi aytib beradi — bolalar uchun qulay</span>
              </span>
              <span className={`relative h-7 w-12 flex-shrink-0 rounded-full transition ${hearOn ? 'bg-[#FFB224]' : 'bg-white/[0.12]'}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${hearOn ? 'left-6' : 'left-1'}`} />
              </span>
            </button>

            <h2 className={`${LABEL} mb-2.5 mt-6 flex items-center justify-between`}>
              <span>Vazifalar</span><span className="normal-case tracking-normal text-white/35">har biri — tanga</span>
            </h2>
            <div className={`${CARD} divide-y divide-white/[0.06]`}>
              {garage.missions.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 px-3.5 py-3 lg:px-4">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-bold text-white/60">{i + 1}</span>
                  <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-white/85 lg:text-[15px]">{missionText(m)}</p>
                  <span className="flex-shrink-0 text-sm font-bold tabular-nums text-[#FFB224]">+{m.reward}</span>
                </div>
              ))}
            </div>

            {!supported && <div className="mt-6"><VoiceNotice error="unsupported" /></div>}

            <div className="sticky bottom-0 z-10 -mx-4 mt-5 bg-gradient-to-t from-[#0B0B10] via-[#0B0B10]/95 to-transparent px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-5 lg:static lg:mx-0 lg:mt-auto lg:bg-none lg:px-0 lg:pb-0 lg:pt-6">
              <Motion.button type="button" onClick={onStart} disabled={!supported} whileTap={{ scale: 0.985 }}
                className="flex h-16 w-full items-center justify-center gap-2.5 rounded-[20px] bg-[#FFB224] text-lg font-black text-[#0B0B10] shadow-[0_18px_40px_-18px_rgba(255,178,36,0.7)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 lg:h-[72px] lg:text-xl">
                <Play size={22} className="fill-current" /> Boshlash · {level.title}
              </Motion.button>
            </div>
          </div>
        </div>

        <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-8">
            <div className="mb-2.5 flex items-end justify-between gap-3">
              <h2 className={LABEL}>Buyruqlar · {level.commands.length} ta</h2>
              <p className="text-[12px] font-semibold text-white/40 lg:text-sm">har biriga {level.window} soniya</p>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {commands.map(c => (
                <div key={c.text} className={`${CARD} flex items-center gap-3 p-3`}>
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#FFB224]/10 text-[#FFB224]">
                    <ActionIcon action={c.scene === 'school' ? 'school' : c.action} size={26} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold leading-snug lg:text-[17px]">{c.text}</p>
                    <p className="text-[13px] font-medium text-white/45">{ACTION_UZ[c.action]}{c.action === 'go' ? ' (to‘xtagandan keyin)' : ''}</p>
                  </div>
                  <button type="button" onClick={() => listenTo(c.text)} aria-label={`Listen: ${c.text}`}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] min-[380px]:w-auto min-[380px]:gap-1.5 min-[380px]:px-3.5">
                    {playing === c.text ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                    <span className="hidden text-sm font-semibold min-[380px]:inline">Listen</span>
                  </button>
                </div>
              ))}
            </div>
            {level.commands.length > 6 && (
              <button type="button" onClick={() => setShowAll(v => !v)}
                className="mx-auto mt-2 flex h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white/60 hover:bg-white/[0.05]">
                {showAll ? 'Kamroq' : `Hammasini ko‘rish (${level.commands.length})`} <ChevronDown size={16} className={showAll ? 'rotate-180' : ''} />
              </button>
            )}
          </div>
          <div className="lg:col-span-4">
            <h2 className={`${LABEL} mb-2.5 mt-6 lg:mt-0`}>Qanday o‘ynaladi</h2>
            <ol className={`${CARD} space-y-3 p-4 lg:p-5`}>
              {STEPS.map((s, i) => (
                <li key={i} className="flex gap-3 text-[14px] font-medium leading-snug text-white/70 lg:text-[15px]">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#FFB224]/12 text-xs font-bold text-[#FFB224]">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
