/*
 * TOBY RUN — the run (RUNNER_PLAN §B9.1 PlayScreen): the 3D world, a minimal HUD written through refs,
 * the prompt card, the Bekat panel, the revive card, toasts, the pause sheet and the swipe layer.
 * It adapts useSpeech / voiceTts / sfx to the engine's hooks (§B9.3): one continuous listen per window,
 * judged on every interim result; the model voice never plays while the mic is open.
 *
 * Test hooks (§B9.7): window.__rnDebug → window.__rnGame · window.__rnAuto → the autopilot dodges ·
 * window.__rnLockQuality → no auto quality · window.__rnStats (RunnerScene).
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Ear, Flag, LogOut, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX, X,
} from 'lucide-react'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { RunnerEngine } from './engine/engine.js'
import { Deck } from './engine/deck.js'
import { Autopilot } from './engine/autopilot.js'
import { bindInput } from './engine/input.js'
import { BIOME_TITLES, LEVEL_INFO, TOAST_TEXT, starterDeck } from './content'
import { duck, playSfx, setMusic, unlockSfx } from './sfx'
import { PowerBadge, ShovqinArt } from './art'
import RunnerView from './RunnerView'
import PromptCard, { Bar, MicRow, Picture, WordLine } from './PromptCard'
import StationPanel from './StationPanel'

const INITIAL = {
  phase: 'ready', count: null, card: null, station: null, revive: null, toast: null, paused: false,
  shovqin: false, powers: null, listenMode: false, hint: '',
}
const GLASS = 'border border-white/[0.08] bg-[#0B0B10]/70 backdrop-blur-md'
const BTN = 'flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold transition lg:h-[60px] lg:text-lg'
const wait = (ms) => new Promise(r => setTimeout(r, ms))

function CoinDot({ size = 16 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="#F5B14C" />
      <circle cx="10" cy="10" r="6.2" fill="none" stroke="#FFE3A6" strokeWidth="1.6" />
      <path d="M10 6.2v7.6" stroke="#B7791F" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function PowerChip({ kind, until, now, label }) {
  const left = Math.max(0, Math.ceil(until - now))
  if (!left) return null
  return (
    <span className={`flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-[12px] font-bold ${GLASS}`} aria-label={`${label}: ${left} s`}>
      <PowerBadge kind={kind} size={26} />
      {label} <span className="tabular-nums text-white/60">{left}</span>
    </span>
  )
}

function Toast({ toast, onListen }) {
  const t = toast
  const text = t.kind === 'listen' ? TOAST_TEXT.listen[t.reason] || TOAST_TEXT.listen.choice : TOAST_TEXT[t.kind] || ''
  return (
    <Motion.div key={t.id} initial={{ opacity: 0, y: -10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
      className={`pointer-events-auto mx-auto flex max-w-[360px] items-center gap-3 rounded-2xl px-4 py-3 lg:max-w-md ${GLASS} bg-[#0B0B10]/85`}>
      {t.kind === 'magnet' || t.kind === 'gilam' || t.kind === 'varrak' ? <PowerBadge kind={t.kind} size={36} className="flex-shrink-0" /> : (
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#A98BFF]/15 text-[#A98BFF]">
          {t.kind === 'listen' || t.kind === 'mic-tip' ? <Ear size={18} /> : <Sparkles size={18} />}
        </span>
      )}
      <p className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-white/90">{text}</p>
      {t.offerListen && (
        <button type="button" onClick={onListen} className="flex-shrink-0 rounded-full bg-white/[0.1] px-3 py-1.5 text-[13px] font-bold text-white hover:bg-white/[0.16]">Tinglash</button>
      )}
    </Motion.div>
  )
}

function ReviveCard({ revive, barRef, interim, listening, busy, serverMode, level, onSkip, onChoice }) {
  const r = revive
  const open = r.mode === 'open' || r.mode === 'hold'
  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]">
      <Motion.div initial={{ scale: 0.94, y: 10 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-[380px] rounded-[28px] border border-white/[0.08] bg-[#111118] p-5 text-center shadow-2xl lg:max-w-[440px] lg:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A98BFF]">{r.nth ? 'Oxirgi imkoniyat' : 'Toby yiqildi!'}</p>
        <p className="mt-1 text-[22px] font-black tracking-tight lg:text-[26px]">{r.mode === 'ok' ? 'Turdi! Davom etamiz' : r.mode === 'fail' ? 'Bu safar bo‘lmadi' : 'Turg‘azish uchun ayting'}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {r.picture ? <Picture name={r.picture} size={68} /> : null}
          <div className="min-w-0 text-left">
            {r.mode !== 'listen' && <WordLine text={r.text} words={r.words} className="text-[30px] lg:text-[36px]" />}
            {r.uz && <p className="text-[14px] font-semibold text-white/50">{r.uz}</p>}
          </div>
        </div>
        {r.options && r.mode === 'listen' && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {r.options.map((o, i) => (
              <button key={i} type="button" onClick={() => onChoice(i)} className="rounded-2xl border border-white/[0.1] bg-white/[0.05] px-2 py-3 text-[15px] font-black text-white hover:bg-white/[0.09]">{o.text}</button>
            ))}
          </div>
        )}
        {r.mode === 'fail' && r.heard && <p className="mt-3 text-[14px] font-semibold text-rose-200">Toby eshitdi: «{r.heard}»</p>}
        {open && (
          <div className="mt-4 space-y-2 text-left">
            <Bar barRef={barRef} />
            <MicRow listening={listening} busy={busy || r.mode === 'hold'} interim={interim} level={level} serverMode={serverMode} idleText="Ayting!" />
          </div>
        )}
        {r.mode !== 'ok' && (
          <button type="button" onClick={onSkip} className="mt-4 h-11 rounded-full px-5 text-sm font-semibold text-white/55 hover:bg-white/[0.06]">Tugatish</button>
        )}
      </Motion.div>
    </Motion.div>
  )
}

function Overlay({ children }) {
  return (
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-5 backdrop-blur-sm">
      <Motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-sm lg:max-w-md">{children}</Motion.div>
    </Motion.div>
  )
}

export default function PlayScreen({ level, deckData, settings, outfit, carpet, runner, upgrades, speech, sound = true, onSound, onOver, onExit, onRestart }) {
  const { listen, stop, listening, interim, level: micLevel, mode, busy } = speech
  const [view, setView] = useState(INITIAL)
  const [now, setNow] = useState(0)
  const gameRef = useRef(null)
  const layerRef = useRef(null)
  const scoreRef = useRef(null)
  const coinsRef = useRef(null)
  const distRef = useRef(null)
  const barRef = useRef(null)
  const onOverRef = useRef(onOver)
  const busyRef = useRef(false)
  const soundRef = useRef(sound)
  const startRef = useRef({ level, deckData, settings, outfit, carpet, runner, upgrades, mode })
  useEffect(() => { onOverRef.current = onOver })
  useEffect(() => { soundRef.current = sound; setMusic(sound && settings.music !== false) }, [sound, settings.music])
  useEffect(() => { busyRef.current = busy }, [busy])
  // the browser's recogniser failed / is missing: speech goes to the server — longer windows, the hold
  useEffect(() => { gameRef.current?.director?.setServerMode(mode === 'server') }, [mode])

  useEffect(() => {
    const { level: lv, deckData: dd, settings: st, outfit: of, carpet: cp, runner: rn, upgrades: up, mode: md } = startRef.current
    let active = 0
    const reduced = !!st.reduce || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const set = (patch) => setView(v => ({ ...v, ...patch }))
    // tests: window.__rnCfg overrides the server's config (e.g. Bekats closer together)
    // server_stt rides along: a recogniser that breaks mid-run must not fall back to Whisper when the admin switched it off
    const cfg = { ...(dd?.config || {}), ...(dd ? { server_stt: dd.server_stt !== false } : {}), ...(window.__rnDebug && window.__rnCfg ? window.__rnCfg : {}) }
    // no recogniser here and no server speech (admin switch, or nothing left today): Listen mode
    const serverOff = md === 'server' && (dd ? dd.server_stt === false || (dd.clips_left ?? 1) <= 0 : false)
    const listenMode = !!st.listen || serverOff
    const stopListening = () => {
      if (!active) return
      active = 0
      stop({ discard: true })
      duck(false)
    }
    let sayGen = 0
    const hooks = {
      set,
      listen: (lid, ms, onInterim) => {
        active = lid
        stopVoice()                                       // the mic must never hear the model voice
        duck(true)
        listen({ continuous: true, maxMs: Math.max(400, Math.round(ms)), onInterim }).then(({ alternatives, error }) => {
          if (active === lid) { active = 0; duck(false) }
          gameRef.current?.director?.listenEnded(lid, alternatives, error)
        })
      },
      stopListening,
      finishListening: () => {
        if (!active) return false
        stop()
        return true
      },
      isListening: () => active !== 0,
      isBusy: () => busyRef.current,
      // a line that hangs (interrupted, offline) never blocks the game, and never plays into the mic
      // (only the latest line may stop the voice: an older line that ends — or is cut by the next one — never
      // silences the line that replaced it)
      say: (text, voice) => {
        if (active) stopListening()
        const my = ++sayGen
        return Promise.race([sayLine(text, { voice }), wait(6000)]).then(() => { if (my === sayGen && !gameRef.current?.halted && !active) stopVoice() })
      },
      stopVoice,
      sfx: (name) => { if (soundRef.current && !active) playSfx(name) },
      prefetch: (lines) => { preloadLines(lines) },
      finish: (summary) => onOverRef.current?.(summary),
    }
    const items = dd?.items?.length ? dd.items : []
    const seed = dd?.seed || Math.floor(Math.random() * 1e9) + 1
    const deck = new Deck(items, { level: lv, seed, starter: starterDeck(lv) })
    const game = new RunnerEngine({
      level: lv, deck, config: cfg, hooks, ui: { score: scoreRef, coins: coinsRef, dist: distRef, bar: barRef }, seed, sttMode: md === 'server' ? 'server' : 'browser',
      reduced, calm: !!st.calm, listenMode, hearAlways: !!st.hearAlways, outfit: of || '', upgrades: up || {},
      carpet: cp || 'carpet-klassik', runner: rn || 'toby',
      startBiome: window.__rnDebug && Number.isInteger(window.__rnBiome) ? window.__rnBiome : 0,
    })
    gameRef.current = game
    if (listenMode) set({ listenMode: true, toast: serverOff ? { kind: 'listen', reason: 'server', id: 1 } : null })
    if (window.__rnDebug) window.__rnGame = game
    if (window.__rnAuto) game.auto = new Autopilot({ answer: true, every: 0.15 })
    const unbind = bindInput(layerRef.current, {
      onAction: (a) => game.input(a),
      onPause: () => (game.paused ? game.resume() : game.pause()),
    })
    const onHidden = () => { if (document.hidden) game.pause() }
    document.addEventListener('visibilitychange', onHidden)
    const cancel = preloadLines(deck.peek(4).map(it => ({ text: it.kind === 'answer' ? it.prompt : it.text, voice: it.kind === 'word' ? 'teacher' : it.voice || 'narrator' })))
    // a short breath, then 3-2-1
    const t = setTimeout(() => game.start(), 700)
    return () => {
      clearTimeout(t)
      cancel()
      unbind()
      document.removeEventListener('visibilitychange', onHidden)
      stopListening()
      stopVoice()
      duck(false)
      game.halt()
      if (gameRef.current === game) gameRef.current = null
      if (window.__rnGame === game) window.__rnGame = null
    }
  }, [listen, stop])

  // power-up timers on screen
  useEffect(() => {
    if (!view.powers) return undefined
    const id = setInterval(() => setNow(gameRef.current?.clock || 0), 250)
    return () => clearInterval(id)
  }, [view.powers])

  // toasts fade by themselves
  useEffect(() => {
    if (!view.toast) return undefined
    const id = setTimeout(() => setView(v => ({ ...v, toast: null })), view.toast.offerListen ? 6000 : 2600)
    return () => clearTimeout(id)
  }, [view.toast])

  const G = () => gameRef.current
  const { phase, count, card, station, revive, toast, paused, powers, listenMode, pauseInfo } = view
  const running = phase === 'running' || phase === 'ride' || phase === 'station' || phase === 'crash' || phase === 'countdown'
  const serverMode = mode === 'server'
  const resume = () => { unlockSfx(); speech.prime(); G()?.resume() }
  const toListen = () => { G()?.director?.chooseListenMode(); setView(v => ({ ...v, toast: null })) }
  const tap = (i) => G()?.director?.tapChoice(i)
  const L = LEVEL_INFO[level]
  const pressed = (a) => (e) => { e.preventDefault(); G()?.input(a) }

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-[#0B0B10] text-white [touch-action:manipulation]">
      <RunnerView gameRef={gameRef} reduced={!!settings.reduce} />
      {/* swipes: anywhere over the world */}
      <div ref={layerRef} className="absolute inset-0 z-[5] [touch-action:none]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[6] h-36 bg-gradient-to-b from-black/45 to-transparent lg:h-44" />

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 px-3 pt-[max(10px,env(safe-area-inset-top))] lg:px-6 lg:pt-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <button type="button" aria-label={running ? 'Pauza' : 'Chiqish'} onClick={() => (running ? G()?.pause() : onExit())}
            className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-black/70 ${GLASS}`}>
            {running ? <Pause size={18} className="fill-white" /> : <X size={20} />}
          </button>
          <span className={`flex h-12 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-bold ${GLASS}`}>
            <CoinDot /><span ref={coinsRef} className="tabular-nums">0</span>
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`flex h-12 items-center gap-2 rounded-full pl-4 pr-4 ${GLASS}`}>
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-white/45 sm:inline">{level}</span>
            <span ref={scoreRef} className="text-xl font-black tabular-nums lg:text-2xl">0</span>
          </span>
          <span ref={distRef} className={`rounded-full px-2.5 py-1 text-[13px] font-semibold tabular-nums text-white/80 ${GLASS}`}>0 m</span>
          {powers && (
            <div className="flex flex-col items-end gap-1">
              <PowerChip kind="magnet" until={powers.magnet} now={now} label="Magnit" />
              <PowerChip kind="x2" until={powers.x2} now={now} label="x2 tanga" />
              <PowerChip kind="gilam" until={powers.gilam} now={now} label="Gilam" />
            </div>
          )}
        </div>
      </div>

      {/* Shovqin is chasing: say the next word right to blow it away */}
      <AnimatePresence>
        {view.shovqin && running && !card && !station && (
          <Motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`pointer-events-none absolute left-3 top-[max(70px,calc(env(safe-area-inset-top)+64px))] z-20 flex items-center gap-2 rounded-2xl py-1.5 pl-1.5 pr-3 lg:left-6 lg:top-24 ${GLASS}`}>
            <ShovqinArt size={40} />
            <span className="text-[13px] font-bold leading-tight text-white/85">Shovqin quvyapti!<br /><span className="font-semibold text-white/55">Keyingi so‘zni to‘g‘ri ayting</span></span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* the prompt card */}
      {/* phones: at the bottom (Toby and his balloon stay in view above it); desktop: top left */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] z-10 px-3 lg:inset-x-auto lg:bottom-auto lg:left-8 lg:top-24 lg:w-[500px] lg:px-0">
        <AnimatePresence mode="wait">
          {card && (
            <PromptCard key={card.id} card={card} barRef={barRef} interim={interim} listening={listening} busy={busy}
              serverMode={serverMode} level={micLevel} onChoice={tap} />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {toast && !card && <div className="mt-2"><Toast toast={toast} onListen={toListen} /></div>}
        </AnimatePresence>
      </div>

      {/* the Bekat */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(14px,env(safe-area-inset-bottom))] lg:bottom-6 lg:left-auto lg:right-8 lg:w-[500px] lg:px-0">
        <AnimatePresence>
          {station && (
            <StationPanel key="station" station={station} barRef={barRef} interim={interim} listening={listening} busy={busy}
              serverMode={serverMode} level={micLevel} onChoice={tap} />
          )}
        </AnimatePresence>
      </div>

      {/* 3 · 2 · 1 */}
      <AnimatePresence>
        {count != null && (
          <Motion.div key={String(count)} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="pointer-events-none absolute inset-x-0 top-[30%] z-20 flex flex-col items-center">
            <span className={`text-[96px] font-black leading-none tracking-tight drop-shadow-[0_8px_30px_rgba(0,0,0,0.55)] lg:text-[150px] ${count === 'GO' ? 'text-[#A98BFF]' : 'text-white'}`}>{count === 'GO' ? 'Yugur!' : count}</span>
          </Motion.div>
        )}
      </AnimatePresence>
      {phase === 'ready' && (
        <div className="pointer-events-none absolute inset-x-0 top-[24%] z-20 flex justify-center px-5">
          <div className={`rounded-[28px] px-6 py-5 text-center ${GLASS} bg-[#0B0B10]/80`}>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: L?.color || '#A98BFF' }}>{level} · {L?.title}</p>
            <p className="mt-1 text-2xl font-black tracking-tight lg:text-3xl">Tayyormisiz?</p>
            <p className="mt-1.5 text-[14px] font-medium text-white/60">Barmoq bilan surib boshqaring — sharda gapiring</p>
          </div>
        </div>
      )}

      {/* revive by voice */}
      <AnimatePresence>
        {revive && (
          <ReviveCard key="revive" revive={revive} barRef={barRef} interim={interim} listening={listening} busy={busy} serverMode={serverMode}
            level={micLevel} onSkip={() => G()?.director?.skipRevive()} onChoice={tap} />
        )}
      </AnimatePresence>

      {phase === 'over' && (
        <div className="pointer-events-none absolute inset-x-0 top-[36%] z-20 flex justify-center">
          <span className={`rounded-3xl px-7 py-4 text-3xl font-black lg:text-5xl ${GLASS} bg-[#0B0B10]/85`}>Yugurish tugadi</span>
        </div>
      )}

      {/* on-screen buttons (setting "Tugmalar") */}
      {settings.buttons && running && !station && !revive && !card && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between px-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <button type="button" aria-label="Chapga" onPointerDown={pressed('left')} className={`flex h-16 w-16 items-center justify-center rounded-2xl ${GLASS}`}><ArrowLeft size={26} /></button>
            <button type="button" aria-label="O‘ngga" onPointerDown={pressed('right')} className={`flex h-16 w-16 items-center justify-center rounded-2xl ${GLASS}`}><ArrowRight size={26} /></button>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Yumalash" onPointerDown={pressed('roll')} className={`flex h-16 w-16 items-center justify-center rounded-2xl ${GLASS}`}><ArrowDown size={26} /></button>
            <button type="button" aria-label="Sakrash" onPointerDown={pressed('jump')} className={`flex h-16 w-16 items-center justify-center rounded-2xl ${GLASS}`}><ArrowUp size={26} /></button>
          </div>
        </div>
      )}

      {/* biome name when a new one rolls in */}
      {listenMode && !card && running && (
        <div className="pointer-events-none absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 z-10 -translate-x-1/2">
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold text-white/70 ${GLASS}`}><Ear size={14} /> Tinglash rejimi</span>
        </div>
      )}

      {/* pause */}
      <AnimatePresence>
        {paused && (
          <Overlay>
            <div className="rounded-[28px] border border-white/[0.08] bg-[#111118] p-5 text-center shadow-2xl lg:p-7">
              <p className="text-3xl font-black tracking-tight lg:text-4xl">Pauza</p>
              <p className="mt-1 text-sm font-medium text-white/50 lg:text-base">{BIOME_TITLES[pauseInfo?.biome] || ''} · {pauseInfo?.meters ?? 0} m</p>
              <div className="mt-5 space-y-2.5">
                <button type="button" onClick={resume} className={`${BTN} bg-[#A98BFF] text-[#0B0B10] hover:brightness-105`}>
                  <Play size={18} className="fill-current" /> Davom etish
                </button>
                {!listenMode && (
                  <button type="button" onClick={() => { toListen(); resume() }} className={`${BTN} bg-white/[0.08] text-white hover:bg-white/[0.12]`}>
                    <Ear size={18} /> Tinglash rejimi (mikrofonsiz)
                  </button>
                )}
                <button type="button" onClick={() => G()?.quit()} className={`${BTN} bg-white/[0.08] text-white hover:bg-white/[0.12]`}>
                  <Flag size={18} /> Yakunlash — natijani ko‘rish
                </button>
                <button type="button" onClick={onRestart} className={`${BTN} bg-white/[0.05] text-white/85 hover:bg-white/[0.09]`}>
                  <RotateCcw size={18} /> Qaytadan
                </button>
                <button type="button" onClick={onExit} className={`${BTN} text-white/60 hover:bg-white/[0.05]`}>
                  <LogOut size={18} /> Chiqish
                </button>
                <button type="button" onClick={() => onSound?.(!sound)}
                  className="mx-auto flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white/55 hover:bg-white/[0.06]">
                  {sound ? <Volume2 size={17} /> : <VolumeX size={17} />} Tovushlar: {sound ? 'yoqilgan' : 'o‘chirilgan'}
                </button>
              </div>
            </div>
          </Overlay>
        )}
      </AnimatePresence>
    </div>
  )
}
