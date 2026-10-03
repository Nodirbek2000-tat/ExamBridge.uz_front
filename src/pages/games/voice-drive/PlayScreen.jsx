/*
 * VOICE DRIVE play screen: the canvas road, the HUD and the command card.
 * One tap on the mic starts the run; after that the game listens by itself for
 * every command (continuous recognition, judged on every interim result) and the
 * car reacts the moment the right words are heard.
 */
import { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  Check, ChevronLeft, CloudRain, Coins, Flag, Fuel, Heart, Loader2, LogOut, Moon, Mountain, Pause, Play, RotateCcw,
  Shield, SkipForward, Snowflake, Sun, Sunset, Target, Trophy, Volume2, VolumeX, X,
} from 'lucide-react'
import { useSpeech } from '../../../games/voice/useSpeech'
import { MicButton, VerdictBurst, VoiceNotice } from '../../../games/voice/VoiceUI'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { ACTION_TONE, LIVES, missionText } from './content'
import { THEMES } from './art'
import { carSetup } from './cars'
import { DriveGame } from './engine'
import { warmTheme } from './render'
import { playSfx, unlockSfx } from './sfx'
import { LevelBars } from './ui'
import { useWide } from './useWide'
import ActionIcon from './ActionIcon'
import Road from './Road'

const INITIAL = {
  phase: 'ready',      // ready | arming | countdown | running | over
  card: null,
  pop: null,
  burst: null,
  lives: LIVES,
  shield: 0,
  mult: 1,
  count: null,
  saying: false,
  paused: false,
  fatal: '',
  missions: [],
  toast: null,
  zone: null,
  hint: null,
}

const wait = (ms) => new Promise(r => setTimeout(r, ms))
const fmtMult = (m) => `x${Number.isInteger(m) ? m : m.toFixed(1)}`
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200))
const ZONE_ICON = { day: Sun, sunset: Sunset, night: Moon, desert: Sun, snow: Snowflake, rain: CloudRain }

/* Ask for the microphone once, on the first press (the browser needs a gesture). */
async function warmupMic() {
  if (!navigator.mediaDevices?.getUserMedia) return ''
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(t => t.stop())
    return ''
  } catch (e) {
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') return 'not-allowed'
    if (e?.name === 'NotFoundError' || e?.name === 'NotReadableError') return 'audio-capture'
    return ''
  }
}

const WORD_TONE = {
  ok: 'text-emerald-300',
  close: 'text-amber-300 underline decoration-amber-400 decoration-2 underline-offset-4',
  miss: 'text-rose-300 underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-4',
}

// short lines are shown huge; the long B1 lines a step smaller so they do not wrap into a tower on a 1024 px screen
const LINE_SIZE = (n) => (n <= 12 ? 'text-[36px] sm:text-5xl lg:text-6xl xl:text-7xl'
  : n <= 22 ? 'text-[30px] sm:text-4xl lg:text-5xl xl:text-6xl'
    : 'text-[26px] sm:text-[32px] lg:text-4xl xl:text-5xl 2xl:text-6xl')

/* The line to say, big; after an attempt each word is coloured. */
function BigLine({ text, match }) {
  const words = match?.words || String(text || '').split(/\s+/).filter(Boolean).map(w => ({ text: w }))
  return (
    <p className={`text-balance font-black leading-[1.1] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${LINE_SIZE(String(text || '').length)}`}>
      {words.map((w, i) => (
        <span key={i} className={`${w.status ? WORD_TONE[w.status] : ''} transition-colors`}>{w.text}{i < words.length - 1 ? ' ' : ''}</span>
      ))}
    </p>
  )
}

const CommandCard = memo(function CommandCard({ card, barRef, interim, listening, saying, busy, serverMode, onSkip, micLevel }) {
  const fail = card.mode === 'fail'
  const ok = card.mode === 'ok'
  const intro = card.mode === 'intro'
  const open = card.mode === 'open'
  const tone = fail ? (card.bonus ? 'border-amber-300/40 bg-amber-950/75' : 'border-rose-400/50 bg-rose-950/80')
    : ok ? 'border-emerald-400/60 bg-emerald-950/75'
      : 'border-white/15 bg-slate-950/75'
  const label = ok ? (card.verdict === 'perfect' ? 'A’lo!' : 'Yaxshi!')
    : fail ? (card.bonus ? 'Bonus o‘tib ketdi' : card.reason === 'wrong' ? 'Boshqa buyruq aytildi' : card.heard ? 'Noto‘g‘ri' : 'Vaqt tugadi')
      : intro ? 'Tinglang…'
        : card.mode === 'judging' ? 'Tekshirilmoqda…'
          : card.mode === 'skip' ? 'O‘tkazib yuborildi'
            : card.bonus ? 'Bonus! Ayting' : 'Ayting!'
  return (
    <Motion.div
      initial={{ y: -16, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -8, opacity: 0, transition: { duration: 0.1 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className={`pointer-events-auto relative mx-auto w-full max-w-md overflow-hidden rounded-[26px] border px-4 pb-3.5 pt-3 shadow-2xl backdrop-blur-md sm:max-w-xl lg:max-w-4xl lg:rounded-[34px] lg:px-8 lg:pb-6 lg:pt-5 ${tone}`}>
      <div className="flex items-center gap-3 lg:gap-6">
        <Motion.span key={card.mode}
          initial={{ scale: 0.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg lg:h-24 lg:w-24 lg:rounded-3xl ${ok ? 'from-emerald-400 to-green-600' : fail ? (card.bonus ? 'from-amber-400 to-orange-600' : 'from-rose-500 to-red-700') : ACTION_TONE[card.action] || 'from-sky-400 to-indigo-600'}`}>
          {ok ? <Check className="h-8 w-8 lg:h-14 lg:w-14" strokeWidth={3.4} />
            : fail ? <X className="h-8 w-8 lg:h-14 lg:w-14" strokeWidth={3.4} />
              : (
                <>
                  <ActionIcon action={card.action === 'slow' && card.scene === 'school' ? 'school' : card.action} size={30} strokeWidth={2.6} className="lg:hidden" />
                  <ActionIcon action={card.action === 'slow' && card.scene === 'school' ? 'school' : card.action} size={52} strokeWidth={2.4} className="hidden lg:block" />
                </>
              )}
        </Motion.span>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className={`truncate text-[13px] font-black uppercase tracking-[0.14em] lg:text-lg ${fail ? (card.bonus ? 'text-amber-200' : 'text-rose-300') : ok ? 'text-emerald-300' : card.bonus ? 'text-cyan-200' : 'text-white/70'}`}>
              {label}
            </span>
            {open && card.attempt > 0 && (
              <span className="flex-shrink-0 rounded-full bg-amber-400/20 px-2 py-0.5 text-xs font-black text-amber-300 lg:text-base">{card.attempt + 1}-urinish</span>
            )}
          </div>
          {fail && <p className="text-xs font-bold text-white/55 lg:text-base">To‘g‘ri buyruq:</p>}
          <BigLine text={card.text} match={fail || ok ? card.match : null} />
        </div>
      </div>

      {open && (
        <>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10 lg:mt-5 lg:h-4">
            <div ref={barRef} data-low="0"
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 data-[low=1]:from-rose-500 data-[low=1]:to-amber-400" />
          </div>
          <div className="mt-2.5 flex min-h-[30px] items-center justify-center gap-2.5 lg:mt-4 lg:min-h-[40px]">
            {listening && !busy && <LevelBars level={micLevel} active />}
            {busy && <Loader2 size={18} className="animate-spin text-sky-200" />}
            <p className="min-w-0 truncate text-center text-base font-bold text-white/80 lg:text-2xl">
              {interim ? <span className="text-white">“{interim}”</span>
                : busy ? 'Tekshirilmoqda…'
                  : listening ? (serverMode ? 'Tinglayapman… ayting va biroz jim turing' : 'Tinglayapman… gapiring!')
                    : 'Mikrofonni bosing va ayting'}
            </p>
          </div>
          {card.canSkip && (
            <div className="mt-1.5 flex justify-center">
              <button type="button" onClick={onSkip}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-4 text-sm font-bold text-white/85 hover:bg-white/20 lg:h-12 lg:px-6 lg:text-base">
                <SkipForward size={16} /> O‘tkazib yuborish
              </button>
            </div>
          )}
        </>
      )}
      {intro && (
        <p className="mt-2.5 flex items-center justify-center gap-2 text-base font-bold text-sky-200 lg:mt-4 lg:text-2xl">
          <Volume2 size={20} className="animate-pulse" /> Avval eshiting, keyin o‘zingiz ayting
        </p>
      )}
      {fail && (
        <div className="mt-2.5 grid gap-1.5 text-center text-[15px] font-semibold lg:mt-4 lg:text-xl">
          <p className="text-white/80">
            {card.heard ? <>Siz aytdingiz: <span className="font-black text-rose-200">«{card.heard}»</span></> : 'Hech narsa eshitilmadi'}
          </p>
          <p className={card.bonus ? 'text-amber-100' : card.shielded ? 'text-sky-200' : 'text-rose-200'}>
            {card.bonus ? 'Bonus — jon ketmadi' : card.shielded ? 'Qalqon sizni saqlab qoldi!' : card.lost ? '−1 jon' : ''}
          </p>
          {saying && (
            <p className="flex items-center justify-center gap-1.5 font-bold text-sky-300">
              <Volume2 size={17} /> To‘g‘ri aytilishini tinglang…
            </p>
          )}
        </div>
      )}
      {card.mode === 'judging' && (
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-base font-semibold text-sky-200 lg:text-xl">
          <Loader2 size={17} className="animate-spin" /> Javobingiz tekshirilmoqda…
        </p>
      )}
      {card.mode === 'skip' && <p className="mt-2 text-center text-sm font-semibold text-white/60 lg:text-lg">Mashina o‘zi bajardi — 0 ball</p>}
    </Motion.div>
  )
})

function Overlay({ children }) {
  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/65 px-5 backdrop-blur-sm">
      <Motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm lg:max-w-md">
        {children}
      </Motion.div>
    </Motion.div>
  )
}

const BTN = 'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-black transition lg:h-16 lg:text-lg'
const PILL = 'flex items-center rounded-full bg-black/45 backdrop-blur'

function MissionChips({ missions, list }) {
  if (!missions.length) return null
  return (
    <div className="pointer-events-none absolute left-6 top-44 z-10 hidden w-56 space-y-2 lg:block xl:w-64">
      {missions.map(m => {
        const def = list.find(x => x.id === m.id)
        if (!def) return null
        const frac = Math.min(1, m.value / m.n)
        return (
          <div key={m.id} className={`rounded-2xl border px-3.5 py-2.5 backdrop-blur ${m.done ? 'border-emerald-400/50 bg-emerald-950/60' : 'border-white/10 bg-black/40'}`}>
            <p className="flex items-start gap-2 text-sm font-bold leading-snug text-white/90">
              <Target size={16} className={`mt-0.5 flex-shrink-0 ${m.done ? 'text-emerald-300' : 'text-amber-300'}`} />
              <span className="min-w-0 flex-1">{missionText(def)}</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${m.done ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${frac * 100}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PlayScreen({ level, garage, best = 0, hearFirst = false, sound = true, onSound, onExit, onRestart, onOver }) {
  const { listen, stop, prime, listening, interim, supported, level: micLevel, mode, busy } = useSpeech()
  const [view, setView] = useState(INITIAL)
  // the game still wants the mic: the recogniser stopped by itself and starts again in a moment —
  // keep showing "listening" across that gap instead of flashing the idle mic
  const [micWanted, setMicWanted] = useState(false)
  const wide = useWide()
  const gameRef = useRef(null)
  const barRef = useRef(null)
  const scoreRef = useRef(null)
  const coinsRef = useRef(null)
  const distRef = useRef(null)
  const fuelRef = useRef(null)
  const onOverRef = useRef(onOver)
  const serverRef = useRef(mode === 'server')
  const busyRef = useRef(false)
  const soundRef = useRef(sound)
  const startRef = useRef({ garage, best, hearFirst })
  useEffect(() => { onOverRef.current = onOver })
  useEffect(() => { soundRef.current = sound }, [sound])
  useEffect(() => { busyRef.current = busy }, [busy])
  // no browser recogniser (or it failed): speech is transcribed on the server — slower, so the game waits for it
  useEffect(() => {
    serverRef.current = mode === 'server'
    gameRef.current?.setServerMode(serverRef.current)
  }, [mode])

  useEffect(() => {
    let seq = 0
    let active = 0          // seq of the listen whose answer is still on its way (0 = none)
    let gapTimer = 0
    const { garage: g, best: b, hearFirst: hf } = startRef.current
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const set = (patch) => setView(v => ({ ...v, ...(typeof patch === 'function' ? patch(v) : patch) }))
    const stopListening = () => { seq++; active = 0; clearTimeout(gapTimer); setMicWanted(false); stop({ discard: true }) }
    const game = new DriveGame({
      level,
      reduced,
      car: carSetup(g),
      missions: g?.missions || [],
      best: b,
      hearFirst: hf,
      ui: { bar: barRef, score: scoreRef, coins: coinsRef, dist: distRef, fuel: fuelRef },
      hooks: {
        set,
        listen: (id, ms) => {
          const mine = ++seq
          active = mine
          clearTimeout(gapTimer)
          setMicWanted(true)
          stopVoice()                                   // the mic must never hear the model voice
          listen({ continuous: true, maxMs: Math.max(400, Math.round(ms)), onInterim: (alts) => game.heard(id, alts) })
            .then(({ alternatives, error }) => {
              if (active === mine) active = 0
              if (mine !== seq) return
              game.listenEnded(id, alternatives, error)
              // no new listen within a moment (time is up, or a fatal error): the mic really is off
              if (!active && !game.halted) {
                clearTimeout(gapTimer)
                gapTimer = setTimeout(() => { if (!active) setMicWanted(false) }, 700)
              }
            })
        },
        stopListening,
        // end listening but still deliver the last words (server mode judges them); false = nothing to wait for
        finishListening: () => {
          if (!active) return false
          stop()
          return true
        },
        isListening: () => active !== 0,
        isBusy: () => busyRef.current,
        // sayLine can stay pending if it is interrupted — never wait on it forever, and never let
        // a late clip play on into the next command (the mic would hear the model voice)
        say: (text) => {
          if (active) stopListening()
          return Promise.race([sayLine(text), wait(6000)]).then(() => { if (!game.halted) stopVoice() })
        },
        stopVoice,
        sfx: (name) => { if (soundRef.current && !active) playSfx(name) },
        warm: (theme) => idle(() => warmTheme(theme)),
        over: (summary) => onOverRef.current?.(summary),
      },
    })
    game.setServerMode(serverRef.current)
    gameRef.current = game
    const onHidden = () => { if (document.hidden) game.pause() }
    document.addEventListener('visibilitychange', onHidden)
    const cancelPreload = preloadLines(level.commands.map(c => c.text))
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      cancelPreload()
      clearTimeout(gapTimer)
      game.halt()
      if (gameRef.current === game) gameRef.current = null
    }
  }, [level, listen, stop])

  const onMic = () => {
    const game = gameRef.current
    if (!game) return
    const primed = prime()                // inside the tap: iOS opens the mic only here
    unlockSfx()
    if (view.phase === 'ready') {
      setView(v => ({ ...v, phase: 'arming', fatal: '' }))
      Promise.resolve(primed).then(async (m) => {
        const err = m ? '' : await warmupMic()
        if (gameRef.current !== game) return
        if (err) { setView(v => ({ ...v, phase: 'ready', fatal: err })); return }
        game.start()
      })
      return
    }
    game.kickListen()
  }

  // "Davom etish" / "Qayta urinish": a tap — open the mic and the sounds inside it (iOS, a tab that was hidden)
  const onResume = () => {
    prime()
    unlockSfx()
    gameRef.current?.resume()
  }

  const { phase, card, lives, shield, mult, count, saying, paused, fatal, missions, toast, zone, hint } = view
  const playing = phase === 'countdown' || phase === 'running'
  const judging = card?.mode === 'judging'
  const intro = card?.mode === 'intro'
  const hearing = listening || (micWanted && card?.mode === 'open' && !paused && !fatal)
  const micState = phase === 'arming' || judging || (busy && card?.mode === 'open') ? 'busy'
    : phase === 'ready' ? 'idle'
      : intro || saying ? 'disabled'
        : hearing ? 'listening'
          : card?.mode === 'open' && !paused ? 'idle'
            : 'disabled'
  const micLabel = phase === 'ready' ? 'Bosing — boshlaymiz!'
    : phase === 'arming' ? 'Mikrofon ochilmoqda…'
      : phase === 'countdown' ? 'Tayyorlaning…'
        : judging || (busy && card?.mode === 'open') ? 'Tekshirilmoqda…'
          : intro || saying ? 'Tinglang…'
            : hearing ? (mode === 'server' ? 'Tinglayapman… tugatsangiz bosing' : 'Tinglayapman…')
              : card?.mode === 'open' ? 'Bosing va ayting'
                : ' '
  const missionDefs = garage?.missions || []
  const toastMission = toast?.kind === 'mission' ? missionDefs.find(m => m.id === toast.mission) : null
  const zoneTheme = zone ? THEMES[zone.theme] : null
  const ZoneIcon = zone ? ZONE_ICON[zone.theme] || Mountain : null

  if (!supported) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5">
        <VoiceNotice error="unsupported" />
        <button type="button" onClick={onExit} className={`${BTN} max-w-sm bg-white/10 hover:bg-white/15`}>
          <ChevronLeft size={18} /> Orqaga
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#08080F] text-white [touch-action:manipulation]">
      <Road gameRef={gameRef} />

      {/* HUD */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] lg:px-6 lg:pt-5">
        <div className="flex flex-col items-start gap-1.5 lg:gap-2.5">
          <div className="flex items-center gap-2">
            <button type="button" aria-label={playing ? 'Pauza' : 'Chiqish'}
              onClick={() => (playing ? gameRef.current?.pause() : onExit())}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 lg:h-14 lg:w-14">
              {playing ? <Pause size={20} className="fill-white" /> : <ChevronLeft size={22} />}
            </button>
            <div className={`${PILL} gap-0.5 px-2.5 py-2 lg:gap-1 lg:px-4 lg:py-3`} aria-label={`${lives} jon`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Motion.span key={i} animate={i < lives ? { scale: 1 } : { scale: [1.5, 1] }}>
                  <Heart className={`h-[18px] w-[18px] lg:h-7 lg:w-7 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-white/25'}`} />
                </Motion.span>
              ))}
              {shield > 0 && <Shield className="ml-1 h-[18px] w-[18px] fill-sky-400/40 text-sky-300 lg:h-7 lg:w-7" aria-label="Qalqon" />}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`${PILL} gap-1.5 px-2.5 py-1.5 lg:px-4 lg:py-2`} aria-label="Yoqilg‘i">
              <Fuel className="h-3.5 w-3.5 text-orange-300 lg:h-5 lg:w-5" />
              <span className="h-2 w-14 overflow-hidden rounded-full bg-white/15 lg:h-3 lg:w-28">
                <span ref={fuelRef} data-low="0"
                  className="block h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-300 to-emerald-400 data-[low=1]:animate-pulse data-[low=1]:from-rose-500 data-[low=1]:to-orange-400" />
              </span>
            </div>
            {missions.length > 0 && (
              <div className={`${PILL} gap-1 px-2.5 py-1.5 lg:hidden`} aria-label="Vazifalar">
                <Target size={13} className="text-amber-300" />
                {missions.map(m => (
                  <span key={m.id} className="h-1.5 w-4 overflow-hidden rounded-full bg-white/15">
                    <span className={`block h-full rounded-full ${m.done ? 'bg-emerald-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(1, m.value / m.n) * 100}%` }} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 lg:gap-2.5">
          <div className="flex items-center gap-2 rounded-2xl bg-black/45 px-3 py-1 backdrop-blur lg:rounded-3xl lg:px-5 lg:py-2">
            <AnimatePresence>
              {mult > 1 && (
                <Motion.span key={mult} initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[11px] font-black text-black lg:px-2.5 lg:text-base">{fmtMult(mult)}</Motion.span>
              )}
            </AnimatePresence>
            <span ref={scoreRef} className="text-xl font-black tabular-nums lg:text-4xl">0</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold lg:gap-2 lg:text-lg">
            <span className={`${PILL} gap-1 px-2 py-1 lg:px-3.5 lg:py-1.5`}>
              <Coins className="h-3.5 w-3.5 text-amber-300 lg:h-5 lg:w-5" /><span ref={coinsRef} className="tabular-nums">0</span>
            </span>
            <span ref={distRef} className={`${PILL} px-2 py-1 tabular-nums lg:px-3.5 lg:py-1.5`}>0 m</span>
          </div>
          <button type="button" onClick={() => onSound?.(!sound)} aria-label={sound ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
            className={`${PILL} hidden h-11 w-11 justify-center text-white/80 hover:bg-black/60 lg:flex`}>
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </div>
      </div>

      <MissionChips missions={missions} list={missionDefs} />

      {/* the command to say */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(max(10px,env(safe-area-inset-top))+86px)] z-10 px-3 lg:top-5 lg:px-[260px] xl:px-[300px]">
        <AnimatePresence mode="wait">
          {card && (
            <CommandCard key={`${card.id}-${card.mode}`} card={card} barRef={barRef} interim={interim}
              listening={hearing} saying={saying} busy={busy} serverMode={mode === 'server'} micLevel={micLevel}
              onSkip={() => gameRef.current?.skip()} />
          )}
        </AnimatePresence>
      </div>

      {/* ready: one press on the mic starts the drive */}
      <AnimatePresence>
        {(phase === 'ready' || phase === 'arming') && !fatal && (
          <Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="pointer-events-none absolute inset-x-0 top-[20%] z-10 flex justify-center px-5">
            <div className="max-w-sm rounded-[28px] border border-white/15 bg-slate-950/75 px-6 py-5 text-center shadow-2xl backdrop-blur-md lg:max-w-xl lg:px-10 lg:py-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60 lg:text-base">{level.title} · {level.cefr}</p>
              <p className="mt-1 text-3xl font-black lg:text-5xl">Tayyormisiz?</p>
              <p className="mt-2 text-base font-semibold leading-snug text-white/80 lg:mt-3 lg:text-2xl">
                Mikrofonni <b className="text-sky-300">bir marta</b> bosing — keyin o‘yin o‘zi tinglaydi. Buyruq chiqishi bilan uni baland ayting!
              </p>
              {hearFirst && (
                <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold text-sky-200 lg:text-lg">
                  <Volume2 size={16} /> Har buyruqni avval o‘yin o‘zi aytib beradi
                </p>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* 3 · 2 · 1 · GO */}
      <AnimatePresence>
        {count != null && (
          <Motion.div key={String(count)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 20 }}
            className="pointer-events-none absolute inset-x-0 top-[32%] z-20 flex justify-center">
            <span className={`text-8xl font-black drop-shadow-[0_6px_20px_rgba(0,0,0,0.5)] lg:text-[11rem] ${count === 'GO' ? 'text-emerald-300' : 'text-white'}`}>{count}</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ✓ pop / ✗ burst */}
      <AnimatePresence>
        {view.pop && (
          <Motion.div key={view.pop.id} initial={{ opacity: 0, y: 18, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="pointer-events-none absolute inset-x-0 top-[47%] z-10 flex flex-col items-center gap-1.5 lg:top-[44%]">
            <span className={`rounded-full bg-gradient-to-r px-6 py-2 text-3xl font-black text-white shadow-xl lg:px-10 lg:py-3 lg:text-5xl ${view.pop.verdict === 'perfect' ? 'from-emerald-400 to-green-600' : 'from-teal-400 to-sky-500'}`}>
              {view.pop.near ? 'Zo‘r! Oxirgi soniyada!' : view.pop.verdict === 'perfect' ? 'Perfect!' : 'Good!'}
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3.5 py-1 text-lg font-black text-amber-300 backdrop-blur lg:px-5 lg:text-2xl">
              +{view.pop.points}{view.pop.mult > 1 ? ` (${fmtMult(view.pop.mult)})` : ''} · +{view.pop.coins} <Coins size={18} />
            </span>
          </Motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-x-0 top-[44%] z-10 flex justify-center lg:scale-150">
        <VerdictBurst verdict="wrong" show={view.burst != null} />
      </div>

      {/* a new theme rolls in */}
      <AnimatePresence>
        {zoneTheme && (
          <Motion.div key={zone.key} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            className="pointer-events-none absolute inset-x-0 bottom-[30%] z-10 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/55 py-2 pl-2 pr-5 backdrop-blur lg:gap-4 lg:py-3 lg:pl-3 lg:pr-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-pink-500 lg:h-14 lg:w-14"><ZoneIcon size={22} /></span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60 lg:text-sm">Yangi yo‘l</p>
                <p className="text-lg font-black leading-tight lg:text-3xl">{zoneTheme.uz} <span className="text-white/60">· {zoneTheme.en}</span></p>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* mission done / new best */}
      <AnimatePresence>
        {toast && (
          <Motion.div key={toast.id} initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute inset-x-0 top-[38%] z-30 flex justify-center px-4">
            {toast.kind === 'best' ? (
              <span className="flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-2.5 text-2xl font-black text-black shadow-2xl lg:text-4xl">
                <Trophy size={28} /> Yangi rekord!
              </span>
            ) : (
              <div className="max-w-md rounded-3xl border border-emerald-300/50 bg-emerald-600/90 px-5 py-3 text-center shadow-2xl lg:max-w-xl lg:px-8 lg:py-4">
                <p className="flex items-center justify-center gap-2 text-lg font-black lg:text-2xl"><Flag size={20} /> Vazifa bajarildi! +{toast.reward} <Coins size={20} /></p>
                {toastMission && <p className="mt-0.5 text-sm font-semibold text-white/90 lg:text-lg">{missionText(toastMission)}</p>}
              </div>
            )}
          </Motion.div>
        )}
      </AnimatePresence>

      {hint && card?.id === hint.id && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[26%] z-10 flex justify-center px-4">
          <span className="rounded-full bg-sky-500/90 px-4 py-1.5 text-base font-black lg:text-xl">{hint.text}</span>
        </div>
      )}

      <AnimatePresence>
        {phase === 'over' && (
          <Motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute inset-x-0 top-[34%] z-20 flex justify-center">
            <span className="rounded-3xl bg-black/55 px-6 py-3 text-4xl font-black backdrop-blur lg:px-10 lg:py-5 lg:text-6xl">O‘yin tugadi</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* the mic */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-4 pb-[max(14px,env(safe-area-inset-bottom))] lg:pb-6 [@media(max-height:520px)]:items-end">
        <MicButton state={micState} onPress={onMic} size={wide ? 112 : 80} level={micLevel} />
        <p className={`mt-2 text-center text-[15px] font-black drop-shadow lg:text-xl ${hearing ? 'text-rose-200' : 'text-white/90'}`}>{micLabel}</p>
      </div>

      {/* pause */}
      <AnimatePresence>
        {paused && !fatal && (
          <Overlay>
            <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5 text-center shadow-2xl lg:p-7">
              <p className="text-3xl font-black lg:text-4xl">Pauza</p>
              <p className="mt-1 text-sm font-semibold text-white/60 lg:text-base">Mikrofon o‘chirildi. Davom etsangiz, buyruq qaytadan boshlanadi.</p>
              <div className="mt-5 space-y-2.5">
                <button type="button" onClick={onResume} className={`${BTN} btn-glass bg-emerald-500 text-white`}>
                  <Play size={18} className="fill-white" /> Davom etish
                </button>
                <button type="button" onClick={() => gameRef.current?.quit()} className={`${BTN} bg-amber-500/90 text-black hover:bg-amber-400`}>
                  <Flag size={18} /> Yakunlash — tangalarni olish
                </button>
                <button type="button" onClick={onRestart} className={`${BTN} bg-white/10 hover:bg-white/15`}>
                  <RotateCcw size={18} /> Qaytadan boshlash
                </button>
                <button type="button" onClick={onExit} className={`${BTN} bg-white/5 text-white/80 hover:bg-white/10`}>
                  <LogOut size={18} /> Chiqish
                </button>
                <button type="button" onClick={() => onSound?.(!sound)}
                  className="mx-auto flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-white/70 hover:bg-white/10">
                  {sound ? <Volume2 size={17} /> : <VolumeX size={17} />} O‘yin tovushlari: {sound ? 'yoqilgan' : 'o‘chirilgan'}
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </AnimatePresence>

      {/* mic blocked / lost */}
      <AnimatePresence>
        {fatal && (
          <Overlay>
            <VoiceNotice error={fatal} />
            <div className="mt-4 space-y-2.5">
              <button type="button" onClick={() => (phase === 'ready' ? onMic() : onResume())}
                className={`${BTN} btn-glass bg-sky-500 text-white`}>
                <RotateCcw size={18} /> Qayta urinish
              </button>
              <button type="button" onClick={onExit} className={`${BTN} bg-white/10 hover:bg-white/15`}>
                <LogOut size={18} /> Chiqish
              </button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  )
}
