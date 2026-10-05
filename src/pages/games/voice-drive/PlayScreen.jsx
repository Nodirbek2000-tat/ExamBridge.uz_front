/*
 * VOICE DRIVE play screen: the 3D road (2D canvas fallback), a minimal HUD and
 * the command card. One tap on the mic starts the run; after that the game
 * listens by itself for every command (continuous recognition, judged on every
 * interim result) and the car reacts the moment the right words are heard.
 * Commands are spoken in the 'coach' voice.
 */
import { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Check, ChevronLeft, Flag, Heart, Loader2, LogOut, Mic, Pause, Play, RotateCcw, Shield, SkipForward, Trophy, Volume2, VolumeX, X } from 'lucide-react'
import { useSpeech } from '../../../games/voice/useSpeech'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { LIVES, missionText } from './content'
import { THEMES } from './art'
import { carSetup } from './cars'
import { DriveGame } from './engine'
import { warmTheme } from './render'
import { playSfx, unlockSfx } from './sfx'
import { useWide } from './useWide'
import ActionIcon, { CoinIcon, ThemeIcon } from './ActionIcon'
import DriveView from './DriveView'

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

const COACH = 'coach'
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const fmtMult = (m) => `x${Number.isInteger(m) ? m : m.toFixed(1)}`
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 200))
const GLASS = 'border border-white/[0.08] bg-[#0B0B10]/70 backdrop-blur-md'

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
  close: 'text-amber-300 underline decoration-amber-400/80 decoration-2 underline-offset-[6px]',
  miss: 'text-rose-300 underline decoration-rose-400 decoration-wavy decoration-2 underline-offset-[6px]',
}

// short lines are shown huge; the long B1 lines a step smaller so they do not wrap into a tower
const LINE_SIZE = (n) => (n <= 12 ? 'text-[34px] sm:text-5xl lg:text-6xl'
  : n <= 22 ? 'text-[28px] sm:text-4xl lg:text-5xl'
    : 'text-[24px] sm:text-[30px] lg:text-4xl xl:text-[44px]')

/* The line to say, big; after an attempt each word is coloured. */
function BigLine({ text, match }) {
  const words = match?.words || String(text || '').split(/\s+/).filter(Boolean).map(w => ({ text: w }))
  return (
    <p className={`text-balance font-black leading-[1.08] tracking-tight text-white ${LINE_SIZE(String(text || '').length)}`}>
      {words.map((w, i) => (
        <span key={i} className={`${w.status ? WORD_TONE[w.status] : ''} transition-colors`}>{w.text}{i < words.length - 1 ? ' ' : ''}</span>
      ))}
    </p>
  )
}

/*
 * A voice-memo style waveform drawn from the mic level history (newest on the right).
 * With no level meter (Android Chrome's own recogniser) it breathes gently instead.
 */
function Waveform({ level = 0, active = false, className = '' }) {
  const canvasRef = useRef(null)
  const levelRef = useRef(0)
  useEffect(() => { levelRef.current = level }, [level])
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !active) return undefined
    const g = c.getContext('2d')
    const hist = new Array(44).fill(0.04)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = 0
    let quiet = 0
    const draw = (now) => {
      raf = requestAnimationFrame(draw)
      if (now - last < 40) return
      last = now
      const L = levelRef.current
      quiet = L > 0.02 ? 0 : quiet + 1
      const v = L > 0.02 ? Math.min(1, 0.08 + L * 1.7) : quiet > 12 && !reduce ? 0.07 + 0.06 * Math.abs(Math.sin(now / 260) * Math.sin(now / 590)) : 0.05
      hist.push(v)
      hist.shift()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = c.clientWidth
      const h = c.clientHeight
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      const n = hist.length
      const bw = w / n
      for (let i = 0; i < n; i++) {
        const bh = Math.max(2.5, hist[i] * h)
        g.fillStyle = `rgba(255,178,36,${(0.25 + 0.75 * (i / n)).toFixed(3)})`
        const x = i * bw + bw * 0.22
        const y = (h - bh) / 2
        const r = Math.min(bw * 0.28, bh / 2)
        g.beginPath()
        if (g.roundRect) g.roundRect(x, y, bw * 0.56, bh, r)
        else g.rect(x, y, bw * 0.56, bh)
        g.fill()
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [active])
  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

const CommandCard = memo(function CommandCard({ card, barRef, interim, listening, saying, busy, serverMode, onSkip, micLevel }) {
  const fail = card.mode === 'fail'
  const ok = card.mode === 'ok'
  const intro = card.mode === 'intro'
  const open = card.mode === 'open'
  const tone = fail ? (card.bonus ? 'border-amber-300/25' : 'border-rose-400/30') : ok ? 'border-emerald-400/30' : 'border-white/[0.08]'
  const label = ok ? (card.verdict === 'perfect' ? 'A’lo!' : 'Yaxshi!')
    : fail ? (card.bonus ? 'Bonus o‘tib ketdi' : card.reason === 'wrong' ? 'Boshqa buyruq aytildi' : card.heard ? 'Noto‘g‘ri' : 'Vaqt tugadi')
      : intro ? 'Tinglang'
        : card.mode === 'judging' ? 'Tekshirilmoqda'
          : card.mode === 'skip' ? 'O‘tkazib yuborildi'
            : card.bonus ? 'Bonus · ayting' : 'Ayting'
  const icon = card.action === 'slow' && card.scene === 'school' ? 'school' : card.action
  return (
    <Motion.div
      initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      exit={{ y: -6, opacity: 0, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={`pointer-events-auto relative mx-auto w-full max-w-md overflow-hidden rounded-[24px] border bg-[#0B0B10]/78 px-4 pb-3.5 pt-3.5 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:max-w-xl lg:max-w-3xl lg:rounded-[30px] lg:px-7 lg:pb-5 lg:pt-5 ${tone}`}>
      <div className="flex items-center gap-3.5 lg:gap-5">
        <Motion.span key={card.mode}
          initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl lg:h-20 lg:w-20 lg:rounded-[22px] ${ok ? 'bg-emerald-400/15 text-emerald-300' : fail ? (card.bonus ? 'bg-amber-400/15 text-amber-300' : 'bg-rose-500/15 text-rose-300') : 'bg-[#FFB224]/15 text-[#FFB224]'}`}>
          {ok ? <Check className="h-7 w-7 lg:h-10 lg:w-10" strokeWidth={3} />
            : fail ? <X className="h-7 w-7 lg:h-10 lg:w-10" strokeWidth={3} />
              : <ActionIcon action={icon} className="h-9 w-9 lg:h-14 lg:w-14" />}
        </Motion.span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className={`truncate text-[11px] font-bold uppercase tracking-[0.2em] lg:text-[13px] ${fail ? (card.bonus ? 'text-amber-200/90' : 'text-rose-300') : ok ? 'text-emerald-300' : card.bonus ? 'text-[#FFB224]' : 'text-white/50'}`}>
              {label}
            </span>
            {open && card.attempt > 0 && (
              <span className="flex-shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold text-white/70 lg:text-sm">{card.attempt + 1}-urinish</span>
            )}
          </div>
          {fail && <p className="text-xs font-semibold text-white/45 lg:text-sm">To‘g‘ri buyruq</p>}
          <BigLine text={card.text} match={fail || ok ? card.match : null} />
        </div>
      </div>

      {open && (
        <>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08] lg:mt-4 lg:h-1.5">
            <div ref={barRef} data-low="0"
              className="h-full w-full origin-left rounded-full bg-[#FFB224] transition-colors data-[low=1]:bg-rose-400" />
          </div>
          <div className="mt-2.5 flex min-h-[32px] items-center gap-3 lg:mt-3.5 lg:min-h-[40px]">
            {busy ? <Loader2 size={18} className="flex-shrink-0 animate-spin text-white/60" />
              : <Waveform level={micLevel} active={listening} className={`h-7 w-24 flex-shrink-0 lg:h-9 lg:w-36 ${listening ? 'opacity-100' : 'opacity-30'}`} />}
            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/60 lg:text-lg">
              {interim ? <span className="text-white">“{interim}”</span>
                : busy ? 'Tekshirilmoqda…'
                  : listening ? (serverMode ? 'Ayting va biroz jim turing' : 'Tinglayapman…')
                    : 'Mikrofonni bosing va ayting'}
            </p>
            {card.canSkip && (
              <button type="button" onClick={onSkip}
                className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.07] px-3.5 text-sm font-semibold text-white/80 hover:bg-white/[0.12] lg:h-10">
                <SkipForward size={15} /> <span className="hidden sm:inline">O‘tkazish</span>
              </button>
            )}
          </div>
        </>
      )}
      {intro && (
        <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-white/70 lg:text-lg">
          <Volume2 size={18} className="animate-pulse text-[#FFB224]" /> Avval eshiting, keyin o‘zingiz ayting
        </p>
      )}
      {fail && (
        <div className="mt-3 space-y-1 text-[15px] font-medium lg:text-lg">
          <p className="text-white/70">
            {card.heard ? <>Siz aytdingiz: <span className="font-bold text-rose-200">«{card.heard}»</span></> : 'Hech narsa eshitilmadi'}
          </p>
          <p className={`font-semibold ${card.bonus ? 'text-amber-200/90' : card.shielded ? 'text-sky-300' : 'text-rose-300'}`}>
            {card.bonus ? 'Bonus — jon ketmadi' : card.shielded ? 'Qalqon sizni saqlab qoldi' : card.lost ? '−1 jon' : ''}
          </p>
          {saying && (
            <p className="flex items-center gap-1.5 font-semibold text-white/70">
              <Volume2 size={16} className="text-[#FFB224]" /> To‘g‘ri aytilishini tinglang…
            </p>
          )}
        </div>
      )}
      {card.mode === 'judging' && (
        <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold text-white/70 lg:text-lg">
          <Loader2 size={16} className="animate-spin" /> Javobingiz tekshirilmoqda…
        </p>
      )}
      {card.mode === 'skip' && <p className="mt-2 text-sm font-semibold text-white/50 lg:text-base">Mashina o‘zi bajardi — 0 ball</p>}
    </Motion.div>
  )
})

/* The mic: amber when it waits for a tap, dark with a breathing ring while it listens. */
function DriveMic({ state, onPress, level = 0, size = 76 }) {
  const listening = state === 'listening'
  const disabled = state === 'disabled' || state === 'busy'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {listening && (
        <>
          <span className="absolute inset-0 rounded-full bg-[#FFB224]/20 transition-transform duration-100" style={{ transform: `scale(${1.08 + Math.min(1, level * 1.5) * 0.45})` }} />
          <span className="absolute inset-[-6px] animate-ping rounded-full border border-[#FFB224]/40 [animation-duration:1.8s] motion-reduce:animate-none" />
        </>
      )}
      <Motion.button type="button" onClick={onPress} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.93 }}
        aria-label={listening ? 'Stop' : 'Speak'}
        className={`relative flex h-full w-full items-center justify-center rounded-full shadow-[0_14px_40px_-12px_rgba(0,0,0,0.7)] transition-colors
          ${listening ? 'border border-[#FFB224]/60 bg-[#17171F] text-[#FFB224]'
            : disabled ? 'cursor-not-allowed border border-white/[0.08] bg-[#17171F]/80 text-white/35'
              : 'bg-[#FFB224] text-[#0B0B10] hover:brightness-105'}`}>
        {state === 'busy' ? <Loader2 size={size * 0.36} className="animate-spin" /> : <Mic size={size * 0.38} strokeWidth={2.2} />}
      </Motion.button>
    </div>
  )
}

function Overlay({ children }) {
  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
      <Motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm lg:max-w-md">
        {children}
      </Motion.div>
    </Motion.div>
  )
}

const BTN = 'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition lg:h-[60px] lg:text-lg'

function MissionChips({ missions, list }) {
  if (!missions.length) return null
  return (
    <div className="pointer-events-none absolute left-6 top-40 z-10 hidden w-60 space-y-2 lg:block">
      {missions.map(m => {
        const def = list.find(x => x.id === m.id)
        if (!def) return null
        const frac = Math.min(1, m.value / m.n)
        return (
          <div key={m.id} className={`rounded-2xl px-3.5 py-3 ${GLASS} ${m.done ? 'border-emerald-400/30' : ''}`}>
            <p className="text-[13px] font-semibold leading-snug text-white/80">{missionText(def)}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className={`h-full rounded-full ${m.done ? 'bg-emerald-400' : 'bg-[#FFB224]'}`} style={{ width: `${frac * 100}%` }} />
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
          return Promise.race([sayLine(text, { voice: COACH }), wait(6000)]).then(() => { if (!game.halted) stopVoice() })
        },
        stopVoice,
        sfx: (name) => { if (soundRef.current && !active) playSfx(name) },
        // the 2D road draws each theme's sprites ahead of time; the 3D road needs nothing
        warm: (theme) => { if (window.__vdStats?.mode !== '3d') idle(() => warmTheme(theme)) },
        over: (summary) => onOverRef.current?.(summary),
      },
    })
    game.setServerMode(serverRef.current)
    gameRef.current = game
    if (window.__vdDebug) window.__vdGame = game      // tests drive the engine directly
    const onHidden = () => { if (document.hidden) game.pause() }
    document.addEventListener('visibilitychange', onHidden)
    const cancelPreload = preloadLines(level.commands.map(c => ({ text: c.text, voice: COACH })))
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
  const micLabel = phase === 'ready' ? 'Bosing — boshlaymiz'
    : phase === 'arming' ? 'Mikrofon ochilmoqda…'
      : phase === 'countdown' ? 'Tayyorlaning…'
        : judging || (busy && card?.mode === 'open') ? 'Tekshirilmoqda…'
          : intro || saying ? 'Tinglang…'
            : hearing ? (mode === 'server' ? 'Tugatsangiz bosing' : 'Tinglayapman')
              : card?.mode === 'open' ? 'Bosing va ayting'
                : ' '
  const missionDefs = garage?.missions || []
  const toastMission = toast?.kind === 'mission' ? missionDefs.find(m => m.id === toast.mission) : null
  const zoneTheme = zone ? THEMES[zone.theme] : null

  if (!supported) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0B0B10] px-5">
        <VoiceNotice error="unsupported" />
        <button type="button" onClick={onExit} className={`${BTN} max-w-sm bg-white/[0.08] text-white hover:bg-white/[0.12]`}>
          <ChevronLeft size={18} /> Orqaga
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0B0B10] text-white [touch-action:manipulation]">
      <DriveView gameRef={gameRef} />
      {/* a soft vignette keeps the HUD readable on a bright sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent lg:h-48" />

      {/* HUD */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] lg:px-6 lg:pt-5">
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2">
            <button type="button" aria-label={playing ? 'Pauza' : 'Chiqish'}
              onClick={() => (playing ? gameRef.current?.pause() : onExit())}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-black/70 lg:h-12 lg:w-12 ${GLASS}`}>
              {playing ? <Pause size={18} className="fill-white" /> : <ChevronLeft size={21} />}
            </button>
            <div className={`flex h-11 items-center gap-1 rounded-full px-3 lg:h-12 lg:px-4 ${GLASS}`} aria-label={`${lives} jon`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Motion.span key={i} animate={i < lives ? { scale: 1 } : { scale: [1.4, 1] }}>
                  <Heart className={`h-[17px] w-[17px] lg:h-5 lg:w-5 ${i < lives ? 'fill-rose-500 text-rose-500' : 'text-white/20'}`} />
                </Motion.span>
              ))}
              {shield > 0 && <Shield className="ml-1 h-[17px] w-[17px] fill-sky-400/30 text-sky-300 lg:h-5 lg:w-5" aria-label="Qalqon" />}
            </div>
          </div>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${GLASS}`} aria-label="Yoqilg‘i">
            <ActionIcon action="fuel" className="h-4 w-4 text-white/70" />
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/[0.12] lg:w-24">
              <span ref={fuelRef} data-low="0"
                className="block h-full w-full origin-left rounded-full bg-emerald-400 data-[low=1]:animate-pulse data-[low=1]:bg-rose-400" />
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`flex h-11 items-center gap-2 rounded-full pl-4 pr-4 lg:h-12 lg:pl-5 ${GLASS}`}>
            <AnimatePresence>
              {mult > 1 && (
                <Motion.span key={mult} initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-full bg-[#FFB224] px-1.5 py-0.5 text-[11px] font-black text-[#0B0B10] lg:px-2 lg:text-sm">{fmtMult(mult)}</Motion.span>
              )}
            </AnimatePresence>
            <span ref={scoreRef} className="text-xl font-black tabular-nums lg:text-[26px]">0</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold lg:text-[15px]">
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${GLASS}`}>
              <CoinIcon size={15} /><span ref={coinsRef} className="tabular-nums">0</span>
            </span>
            <span ref={distRef} className={`rounded-full px-2.5 py-1 tabular-nums text-white/85 ${GLASS}`}>0 m</span>
          </div>
          <button type="button" onClick={() => onSound?.(!sound)} aria-label={sound ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
            className={`hidden h-10 w-10 items-center justify-center rounded-full text-white/75 hover:text-white lg:flex ${GLASS}`}>
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>
      </div>

      <MissionChips missions={missions} list={missionDefs} />

      {/* the command to say */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(max(10px,env(safe-area-inset-top))+98px)] z-10 px-3 lg:top-5 lg:px-[280px]">
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
          <Motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute inset-x-0 top-[17%] z-10 flex justify-center px-5 lg:top-[14%]">
            <div className={`max-w-sm rounded-[28px] px-6 py-5 text-center shadow-2xl lg:max-w-lg lg:px-9 lg:py-7 ${GLASS} bg-[#0B0B10]/78`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45 lg:text-[13px]">{level.title} · {level.cefr}</p>
              <p className="mt-1.5 text-3xl font-black tracking-tight lg:text-5xl">Tayyormisiz?</p>
              <p className="mt-2 text-[15px] font-medium leading-snug text-white/70 lg:mt-3 lg:text-xl">
                Mikrofonni <b className="font-bold text-[#FFB224]">bir marta</b> bosing — keyin o‘yin o‘zi tinglaydi. Buyruq chiqishi bilan uni baland ayting.
              </p>
              {hearFirst && (
                <p className="mt-3 text-balance text-sm font-semibold text-white/60 lg:text-base">
                  <Volume2 size={16} className="mr-1.5 inline-block align-[-3px] text-[#FFB224]" />Har buyruqni avval murabbiy aytib beradi
                </p>
              )}
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* 3 · 2 · 1 · GO */}
      <AnimatePresence>
        {count != null && (
          <Motion.div key={String(count)} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="pointer-events-none absolute inset-x-0 top-[30%] z-20 flex justify-center">
            <span className={`text-[96px] font-black leading-none tracking-tight drop-shadow-[0_8px_30px_rgba(0,0,0,0.55)] lg:text-[160px] ${count === 'GO' ? 'text-[#FFB224]' : 'text-white'}`}>{count}</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ✓ pop */}
      <AnimatePresence>
        {view.pop && (
          <Motion.div key={view.pop.id} initial={{ opacity: 0, y: 14, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -24 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="pointer-events-none absolute inset-x-0 top-[44%] z-10 flex justify-center lg:top-[42%]">
            <span className={`flex items-center gap-3 rounded-full py-2 pl-2 pr-5 shadow-2xl lg:py-2.5 lg:pr-7 ${GLASS} bg-[#0B0B10]/80`}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-[#0B0B10] lg:h-11 lg:w-11"><Check size={20} strokeWidth={3.2} /></span>
              <span className="text-2xl font-black lg:text-4xl">{view.pop.near ? 'Oxirgi soniyada!' : view.pop.verdict === 'perfect' ? 'Perfect' : 'Good'}</span>
              <span className="flex items-center gap-1 text-base font-bold text-[#FFB224] lg:text-xl">
                +{view.pop.points}{view.pop.mult > 1 ? ` ${fmtMult(view.pop.mult)}` : ''} · +{view.pop.coins} <CoinIcon size={17} />
              </span>
            </span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* ✗ burst: a red edge glow (the card says the rest) */}
      <AnimatePresence>
        {view.burst != null && (
          <Motion.div key={view.burst} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_120px_20px_rgba(244,63,94,0.45)]" />
        )}
      </AnimatePresence>

      {/* a new theme rolls in */}
      <AnimatePresence>
        {zoneTheme && (
          <Motion.div key={zone.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute inset-x-0 bottom-[25%] z-10 flex justify-center px-4 lg:bottom-[22%]">
            <div className={`flex items-center gap-3 rounded-full py-2 pl-2 pr-5 lg:gap-4 lg:py-2.5 lg:pl-2.5 lg:pr-7 ${GLASS}`}>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFB224]/15 text-[#FFB224] lg:h-12 lg:w-12"><ThemeIcon theme={zone.theme} size={24} /></span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45 lg:text-xs">Yangi yo‘l</p>
                <p className="text-base font-bold leading-tight lg:text-2xl">{zoneTheme.uz} <span className="font-semibold text-white/45">· {zoneTheme.en}</span></p>
              </div>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* mission done / new best */}
      <AnimatePresence>
        {toast && (
          <Motion.div key={toast.id} initial={{ opacity: 0, y: -14, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            className="pointer-events-none absolute inset-x-0 top-[36%] z-30 flex justify-center px-4">
            {toast.kind === 'best' ? (
              <span className={`flex items-center gap-2.5 rounded-full px-6 py-3 text-2xl font-black lg:text-4xl ${GLASS} bg-[#0B0B10]/85`}>
                <Trophy size={26} className="text-[#FFB224]" /> Yangi rekord!
              </span>
            ) : (
              <div className={`max-w-md rounded-3xl px-5 py-3.5 text-center lg:max-w-xl lg:px-7 ${GLASS} bg-[#0B0B10]/85 border-emerald-400/30`}>
                <p className="flex items-center justify-center gap-2 text-lg font-bold lg:text-2xl"><Flag size={19} className="text-emerald-300" /> Vazifa bajarildi · +{toast.reward} <CoinIcon size={19} /></p>
                {toastMission && <p className="mt-0.5 text-sm font-medium text-white/65 lg:text-base">{missionText(toastMission)}</p>}
              </div>
            )}
          </Motion.div>
        )}
      </AnimatePresence>

      {hint && card?.id === hint.id && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[26%] z-10 flex justify-center px-4">
          <span className={`rounded-full px-4 py-2 text-base font-bold lg:text-xl ${GLASS}`}>{hint.text}</span>
        </div>
      )}

      <AnimatePresence>
        {phase === 'over' && (
          <Motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute inset-x-0 top-[34%] z-20 flex justify-center">
            <span className={`rounded-3xl px-7 py-4 text-4xl font-black lg:px-10 lg:py-5 lg:text-6xl ${GLASS} bg-[#0B0B10]/80`}>O‘yin tugadi</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* the mic: bottom centre on phones; bottom right on desktop, clear of the car */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col items-center px-4 pb-[max(14px,env(safe-area-inset-bottom))] lg:inset-x-auto lg:right-8 lg:flex-row-reverse lg:items-center lg:gap-4 lg:pb-8 [@media(max-height:520px)]:items-end">
        <DriveMic state={micState} onPress={onMic} size={wide ? 92 : 74} level={micLevel} />
        <p className={`mt-2 rounded-full px-3 py-1 text-center text-[13px] font-semibold lg:mt-0 lg:text-base ${hearing ? 'text-[#FFB224]' : 'text-white/80'} ${micLabel.trim() ? GLASS : ''}`}>{micLabel}</p>
      </div>

      {/* pause */}
      <AnimatePresence>
        {paused && !fatal && (
          <Overlay>
            <div className="rounded-[28px] border border-white/[0.08] bg-[#111118] p-5 text-center shadow-2xl lg:p-7">
              <p className="text-3xl font-black tracking-tight lg:text-4xl">Pauza</p>
              <p className="mt-1 text-sm font-medium text-white/50 lg:text-base">Mikrofon o‘chirildi. Davom etsangiz, buyruq qaytadan boshlanadi.</p>
              <div className="mt-5 space-y-2.5">
                <button type="button" onClick={onResume} className={`${BTN} bg-[#FFB224] text-[#0B0B10] hover:brightness-105`}>
                  <Play size={18} className="fill-current" /> Davom etish
                </button>
                <button type="button" onClick={() => gameRef.current?.quit()} className={`${BTN} bg-white/[0.08] text-white hover:bg-white/[0.12]`}>
                  <Flag size={18} /> Yakunlash — tangalarni olish
                </button>
                <button type="button" onClick={onRestart} className={`${BTN} bg-white/[0.05] text-white/85 hover:bg-white/[0.09]`}>
                  <RotateCcw size={18} /> Qaytadan boshlash
                </button>
                <button type="button" onClick={onExit} className={`${BTN} text-white/60 hover:bg-white/[0.05]`}>
                  <LogOut size={18} /> Chiqish
                </button>
                <button type="button" onClick={() => onSound?.(!sound)}
                  className="mx-auto flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white/55 hover:bg-white/[0.06]">
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
                className={`${BTN} bg-[#FFB224] text-[#0B0B10]`}>
                <RotateCcw size={18} /> Qayta urinish
              </button>
              <button type="button" onClick={onExit} className={`${BTN} bg-white/[0.08] text-white hover:bg-white/[0.12]`}>
                <LogOut size={18} /> Chiqish
              </button>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  )
}
