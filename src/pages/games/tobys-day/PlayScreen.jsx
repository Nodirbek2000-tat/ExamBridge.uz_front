/*
 * TOBY'S DAY — one zone, step by step.
 *
 * ONE TAP. The mic opens and stays open (continuous) while the learner speaks;
 * the words light up like karaoke as they are recognised. The moment the line
 * passes, the mic closes by itself and Toby does it AT ONCE — no second tap —
 * then Toby says it in his own voice, the other character answers in theirs,
 * and the game moves on. If time runs out, the learner stops talking for a few
 * seconds, or taps the mic again, whatever was heard is judged: ✗, red / amber
 * words, one tap to retry. After 2 failed tries the Uzbek hint grows and
 * «Tinglash» pulses; after 3 the line can be skipped (0 ★).
 *
 * Task kinds (content.js): say · choice · listen (a character speaks, tap the
 * matching picture first, then say the line) · ask (a character asks, any accepted
 * answer passes) · gap (a missing word; tapping the right picture fills it).
 * A wrong picture costs one star of that line.
 *
 * Phone: header, Toby's scene as tall as it fits, the task card, the mic.
 * Desktop (≥ 1024 px): a big scene on the left, the task + mic panel on the right.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, SkipForward, Volume2, X } from 'lucide-react'
import { useSpeech, FATAL } from '../../../games/voice/useSpeech'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { MODEL_VOICE, SPEAKERS, TOBY_VOICE, hasPortrait, promptLine, speakerOf, stepType, voiceOf, zoneLines } from './content'
import {
  coinsFor, earlyPass, judge, levelInfo, listenMs, patchFor, sameWord, starsFor, wrongWordSaid, xpFor,
} from './logic'
import Scene from './scenes'
import { Portrait } from './characters'
import { TobyAvatar } from './Toby'
import { Bar, Coin, ConfettiBurst, Verdict } from './ui'
import { PlayLine, TaskLabel } from './PlayLine'
import { MicStatus, PlayMic, Waveform } from './PlayMic'

// the mic level re-renders this screen ~10× a second while listening: the big SVG scene must not
const SceneView = memo(Scene)

const AUTO_NEXT_MS = 2000      // after Toby (and the other character) finished speaking
const SILENCE_MS = 3200        // this long without new words (and without voice) ends a try
const SAFETY_MS = 10000        // the recogniser's own limit is set this much past ours
const STOP_GRACE_MS = 700      // a second tap this soon after the first is a double tap, not "stop"
const PROMPT_DELAY_MS = 650    // a new listen / ask step: the character speaks after this
const wait = (ms) => new Promise(r => setTimeout(r, ms))

/* the other character's line over the scene (hidden = a listen task before the right picture) */
function Bubble({ bubble, talking, reduced, onReplay }) {
  return (
    <AnimatePresence>
      {bubble && (
        <Motion.div key={bubble.id} initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
          className="absolute left-3 right-3 top-3 z-10 flex justify-end lg:left-auto lg:right-6 lg:top-6 lg:max-w-[64%]">
          <div className="flex max-w-full items-center gap-2.5 rounded-[20px] rounded-tr-md bg-white py-2 pl-2 pr-3.5 text-slate-800 shadow-[0_10px_30px_rgba(0,0,0,0.25)] lg:gap-3.5 lg:rounded-[26px] lg:py-3 lg:pl-3 lg:pr-5">
            {hasPortrait(bubble.who) && (
              <span className="flex h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-slate-100 lg:h-12 lg:w-12">
                <Portrait who={bubble.who} talking={talking} reduced={reduced} className="h-full w-full" />
              </span>
            )}
            {bubble.hidden ? (
              <button type="button" onClick={onReplay} className="flex items-center gap-2 text-[14px] font-bold text-slate-600 lg:text-[18px]" aria-label="Yana tinglash">
                <span className="flex h-5 items-center gap-[3px] lg:h-6" aria-hidden>
                  {[0.5, 0.9, 0.6, 1, 0.7].map((k, i) => (
                    <Motion.span key={i} className="w-[3px] rounded-full bg-[#FFB020]" style={{ height: `${k * 100}%`, originY: 0.5 }}
                      animate={talking && !reduced ? { scaleY: [k, 0.3, 1, 0.5, k] } : { scaleY: 0.35 }}
                      transition={talking ? { duration: 0.9, repeat: Infinity, delay: i * 0.08 } : { duration: 0.2 }} />
                  ))}
                </span>
                {talking ? 'Tinglang…' : 'Yana tinglash'}
                {!talking && <Volume2 size={16} className="text-slate-400" />}
              </button>
            ) : (
              <p className="min-w-0 text-[14px] font-bold leading-snug lg:text-[20px]">
                {SPEAKERS[bubble.who]?.name && <span className="mr-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:text-[12px]">{SPEAKERS[bubble.who].name}</span>}
                {bubble.text}
              </p>
            )}
          </div>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}

export default function PlayScreen({ zone, startXp = 0, onExit, onFinish, onStep, reduced = false, acc = null }) {
  const { listen, stop, prime, listening, busy, supported, level } = useSpeech()
  const steps = zone.steps
  const [index, setIndex] = useState(0)
  const [world, setWorld] = useState(() => ({ ...zone.start }))
  const [phase, setPhase] = useState('ready')       // ready · listening · fail · success · done
  const [tries, setTries] = useState(0)              // failed tries on this line
  const [blanks, setBlanks] = useState(0)            // tries where nothing usable was heard
  const [result, setResult] = useState(null)
  const [option, setOption] = useState(null)
  const [focus, setFocus] = useState(null)
  const [live, setLive] = useState(null)             // { words, key, text } — karaoke while listening
  const [waiting, setWaiting] = useState(false)      // stop was tapped while a phrase was still at the server
  const [ring, setRing] = useState({ id: 0, ms: 0 }) // the time ring around the mic
  const [burst, setBurst] = useState(null)           // { id, verdict, stars }
  const [party, setParty] = useState(0)              // confetti burst id
  const [speaker, setSpeaker] = useState(null)       // 'toby' | 'other' | 'model' — whose voice plays
  const [talker, setTalker] = useState(null)         // which character talks (a SPEAKERS key) while speaker = 'other'
  const [bubble, setBubble] = useState(null)         // { id, text, who, hidden } — the other character's line
  const [notice, setNotice] = useState('')           // unheard · pickfirst · wrongpick · picked
  const [fatal, setFatal] = useState('')
  const [hud, setHud] = useState({ coins: 0, combo: 0, xp: 0 })
  const [gain, setGain] = useState(null)             // { id, coins, stars, combo }
  const [levelUp, setLevelUp] = useState(0)
  const [tickle, setTickle] = useState(false)
  const [bounce, setBounce] = useState(0)            // +1 = Toby hops once
  const [confirmExit, setConfirmExit] = useState(false)
  const [picked, setPicked] = useState(null)         // listen: the right picture was tapped
  const [misses, setMisses] = useState([])           // listen / gap: wrong pictures tapped
  const [gapFilled, setGapFilled] = useState(false)  // gap: the word is in
  const [wrongWord, setWrongWord] = useState(null)   // listen / gap: a wrong picture's word was said
  const [pulse, setPulse] = useState(0)              // new words recognised (the waveform's beat)

  const alive = useRef(true)
  const runRef = useRef(0)          // bumps on every step change: late async results are ignored
  const listenRef = useRef(0)       // bumps on every listen (and when one is cancelled): only the latest counts
  const micBusy = useRef(0)         // id of the listen in flight — a double tap must not start a second one
  const attemptRef = useRef(null)   // the try being listened to now (see onMic)
  const tickRef = useRef(0)         // its watchdog interval
  const busyRef = useRef(false)
  const levelRef = useRef(0)
  const finishedRef = useRef(false) // the zone is over (finished or left): no more clicks, no second onFinish
  const confirmRef = useRef(false)  // the "leave?" sheet is open: auto-advance waits
  const voiceRef = useRef(0)        // bumps on every new voice line
  const voiceEnd = useRef(null)     // ends the line being spoken now
  const burstRef = useRef(0)
  const bubbleRef = useRef(0)
  const timers = useRef(new Set())
  const stats = useRef({ coins: 0, stars: 0, combo: 0, said: 0, xp: 0, scores: [], start: 0 })
  const stepBest = useRef(0)
  const keysRef = useRef(null)
  const latest = useRef(null)       // the newest playPrompt (for the step-start timer)

  const step = steps[index]
  const type = stepType(step)
  const by = speakerOf(zone, step)
  const prompt = promptLine(step)
  const last = index === steps.length - 1
  const acting = phase === 'success' || phase === 'done'
  const fails = tries + blanks
  const canSkip = !acting && phase !== 'listening' && fails >= 3
  const needPick = type === 'listen' && !picked
  const lv = levelInfo(startXp + hud.xp)

  // the watchdog reads these between renders
  useEffect(() => {
    busyRef.current = busy
    levelRef.current = level
  })

  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => { timers.current.delete(id); fn() }, ms)
    timers.current.add(id)
  }, [])
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current.clear()
  }, [])
  const stopWatch = () => {
    clearInterval(tickRef.current)
    tickRef.current = 0
  }

  useEffect(() => {
    alive.current = true
    stats.current.start = Date.now()
    const cancel = preloadLines(zoneLines(zone))
    const pending = timers.current
    return () => {
      alive.current = false
      cancel()
      pending.forEach(clearTimeout)
      pending.clear()
      clearInterval(tickRef.current)
      voiceEnd.current?.()
      stopVoice()
      stop({ discard: true })
    }
  }, [zone, stop])

  /* a voice line; the speaking character's mouth moves while it plays.
     who: 'toby' | 'other' (by = which character) | 'model' (the narrator, nobody's mouth).
     Always resolves: when the line ends, after a timeout, or as soon as it is cut off. */
  const speak = useCallback(async (text, who = 'toby', voice = TOBY_VOICE, character = null) => {
    if (!text) return
    const id = ++voiceRef.current
    voiceEnd.current?.()
    setSpeaker(who)
    setTalker(character)
    await new Promise((resolve) => {
      let timer = 0
      const end = () => {
        clearTimeout(timer)
        if (voiceEnd.current === end) voiceEnd.current = null
        resolve()
      }
      voiceEnd.current = end
      timer = setTimeout(end, 4000 + text.length * 90)
      sayLine(text, { voice }).then(end, end)
    })
    if (alive.current && id === voiceRef.current) { setSpeaker(null); setTalker(null) }
  }, [])

  // the level-up toast hides itself (its own timer: a quick "Next" must not leave it stuck)
  useEffect(() => {
    if (!levelUp) return undefined
    const t = setTimeout(() => setLevelUp(0), 3800)
    return () => clearTimeout(t)
  }, [levelUp])

  const hush = useCallback(() => {
    voiceRef.current += 1
    voiceEnd.current?.()
    stopVoice()
    setSpeaker(null)
    setTalker(null)
  }, [])

  /* listen / ask: the character says the prompt (the bubble stays — hidden on a listen task until the right picture) */
  const playPrompt = () => {
    if (!prompt || finishedRef.current || micBusy.current) return
    const id = ++bubbleRef.current
    setBubble({ id, text: prompt, who: by, hidden: type === 'listen' && !picked })
    speak(prompt, 'other', voiceOf(by), by)
  }
  useEffect(() => { latest.current = playPrompt })

  // a new listen / ask step: the character speaks first
  useEffect(() => {
    if (!prompt) return undefined
    const token = runRef.current
    const t = setTimeout(() => {
      if (alive.current && token === runRef.current && !confirmRef.current) latest.current?.()
    }, PROMPT_DELAY_MS + (index === 0 ? 500 : 0))
    return () => clearTimeout(t)
  }, [index, prompt])

  const showExit = (open) => {
    confirmRef.current = open
    setConfirmExit(open)
  }

  /* the ✓ / ✗ pill on the scene: a pass stays until the next line, a miss fades */
  const showBurst = (verdict, stars = 0, xp = 0) => {
    const id = ++burstRef.current
    setBurst({ id, verdict, stars, xp })
    if (!xp) later(() => setBurst(b => (b?.id === id ? null : b)), 1800)
  }

  const finishZone = () => {
    const s = stats.current
    const accuracy = s.scores.length ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0
    onFinish({
      coins: s.coins,
      stars: s.stars,
      said: s.said,
      total: steps.length,
      accuracy: Math.round(accuracy * 100) / 100,
      xp: s.xp,
      duration: Math.max(1, Math.round((Date.now() - s.start) / 1000)),
    })
  }

  /* forget the try being listened to (its result, if any, is dropped) */
  const dropAttempt = () => {
    listenRef.current += 1
    micBusy.current = 0
    attemptRef.current = null
    stopWatch()
    stop({ discard: true })
    setLive(null)
    setWaiting(false)
  }

  const goNext = () => {
    // the screen stays clickable while it fades out: a second tap on "Yakunlash" must not save the run twice
    if (finishedRef.current) return
    runRef.current += 1
    clearTimers()
    dropAttempt()
    hush()
    if (last) { finishedRef.current = true; finishZone(); return }
    stepBest.current = 0
    setIndex(index + 1)
    setPhase('ready')
    setTries(0)
    setBlanks(0)
    setResult(null)
    setOption(null)
    setFocus(null)
    setBurst(null)
    setBubble(null)
    setNotice('')
    setTickle(false)
    setPicked(null)
    setMisses([])
    setGapFilled(false)
    setWrongWord(null)
  }

  /* the line passed: rewards, Toby does it at once, says it back, the other character answers */
  const succeed = (r, opt, attempt) => {
    const token = attempt.token
    const s = stats.current
    const base = starsFor(r.verdict, tries)
    const stars = misses.length ? Math.max(1, base - 1) : base     // a wrong picture costs one star
    const combo = tries === 0 && !misses.length ? s.combo + 1 : 0
    const coins = coinsFor(stars, combo)
    const xp = xpFor(stars)
    const before = levelInfo(startXp + s.xp).level
    stats.current = {
      ...s, coins: s.coins + coins, stars: s.stars + stars, combo, said: s.said + 1, xp: s.xp + xp,
      scores: [...s.scores, Math.max(stepBest.current, r.score)],
    }
    const after = levelInfo(startXp + stats.current.xp).level
    setHud({ coins: stats.current.coins, combo, xp: stats.current.xp })
    setGain({ id: burstRef.current + 1, coins, stars, combo })
    setWorld(w => ({ ...w, ...patchFor(step, w, opt) }))
    setPhase('success')
    setNotice('')
    setWrongWord(null)
    if (type === 'gap') setGapFilled(true)
    setBounce(b => b + 1)
    setParty(p => p + 1)
    showBurst(stars < base || tries > 0 ? 'retry' : r.verdict, stars, xp)
    if (after > before) setLevelUp(after)
    onStep?.({ type, stars, combo })

    later(async () => {
      // never talk into an open mic: wait until the recogniser has really let go
      await Promise.race([attempt.settled || Promise.resolve(), wait(1500)])
      if (!alive.current || token !== runRef.current) return
      await speak(opt ? opt.say : step.say, 'toby', TOBY_VOICE)
      if (!alive.current || token !== runRef.current) return
      const reply = opt?.reply || step.reply
      if (reply) {
        setBubble({ id: ++bubbleRef.current, text: reply, who: by, hidden: false })
        await speak(reply, 'other', voiceOf(by), by)
        if (!alive.current || token !== runRef.current) return
      }
      setPhase('done')
      // auto-advance, but not behind the "leave?" sheet
      const autoNext = () => (confirmRef.current ? later(autoNext, 700) : goNext())
      later(autoNext, last ? AUTO_NEXT_MS + 1400 : AUTO_NEXT_MS)
    }, reduced ? 120 : 380)
  }

  const fail = (r) => {
    setTries(t => t + 1)
    stats.current = { ...stats.current, combo: 0 }
    setHud(h => ({ ...h, combo: 0 }))
    setPhase('fail')
    showBurst(r.verdict === 'almost' ? 'almost' : 'wrong')
  }

  /* one judged try → pass or fail (called once per try: `attempt.landed` guards it) */
  const settle = (j, attempt, alternatives = []) => {
    stepBest.current = Math.max(stepBest.current, j.result.score)
    setResult(j.result)
    setOption(j.option)
    setLive(null)
    setWaiting(false)
    if (j.result.passed) succeed(j.result, j.option, attempt)
    else {
      setWrongWord(wrongWordSaid(step, alternatives))
      fail(j.result)
    }
  }

  const onMic = async () => {
    if (finishedRef.current) return
    if (phase === 'listening') {
      // second tap: stop and judge what was heard
      const a = attemptRef.current
      if (!a || a.landed || a.stopped) return
      if (Date.now() - a.startedAt < STOP_GRACE_MS) return                      // a double tap must not end the try at once
      if (busyRef.current) { a.stopAfterBusy = true; setWaiting(true); return }   // a phrase is still at the server
      a.stopped = true
      stop()
      return
    }
    if (acting || micBusy.current) return
    if (needPick) { setNotice('pickfirst'); return }   // listen: the right picture first
    if (!supported) { setFatal('unsupported'); return }
    prime()                                       // opens the mic inside this tap (iOS)
    hush()                                        // never listen while a voice line plays
    setNotice('')
    setBurst(null)
    setFatal('')
    setResult(null)
    setOption(null)
    setLive(null)
    setWaiting(false)
    setWrongWord(null)
    // the prompt stays readable on an ask task; a reply bubble goes
    setBubble(b => (b && prompt && b.text === prompt ? b : null))

    const token = runRef.current
    const id = ++listenRef.current
    micBusy.current = id
    const ms = listenMs(step)
    const a = { id, token, landed: false, stopped: false, stopAfterBusy: false, text: '', heardAt: 0, voiceAt: 0, startedAt: Date.now(), deadline: Date.now() + ms, settled: null }
    attemptRef.current = a
    const mine = () => alive.current && token === runRef.current && id === listenRef.current
    const back = tries > 0 ? 'fail' : 'ready'
    const stopNow = () => {
      if (a.stopped) return
      a.stopped = true
      stop()
    }
    setPhase('listening')
    setRing({ id, ms })

    // judged on every partial result: green words now, and the moment it passes — done
    const onInterim = (alts) => {
      if (!mine() || a.landed) return false
      const text = alts[0] || ''
      if (text && text !== a.text) { a.text = text; a.heardAt = Date.now(); setPulse(p => p + 1) }
      const j = judge(step, alts)
      if (earlyPass(j.result)) {
        a.landed = true
        stopWatch()
        // close the mic now and skip the server's "last bit" upload (nothing needs it): the
        // listen resolves at once, so Toby's voice is not held back behind a transcription
        stop({ discard: true })
        settle(j, a, alts)
        return true                               // (the recogniser ends this listen at once)
      }
      setLive({ words: j.result.words, key: j.option?.key || null, text })
      return false
    }

    // time limit, the pause after speaking, and a stop tapped while the server was busy
    stopWatch()
    tickRef.current = setInterval(() => {
      if (!mine() || a.landed || a.stopped) return
      const now = Date.now()
      if (levelRef.current > 0.12) a.voiceAt = now
      if (busyRef.current) {                      // a phrase is at the server: its answer may pass the line
        if (now > a.deadline + SAFETY_MS - 1500) stopNow()
        return
      }
      if (a.stopAfterBusy || now >= a.deadline) { stopNow(); return }
      if (a.heardAt && now - Math.max(a.heardAt, a.voiceAt) > SILENCE_MS) stopNow()
    }, 150)

    let guard = 0
    let res = null
    try {
      const p = listen({ maxMs: ms + SAFETY_MS, continuous: true, onInterim })
      a.settled = p.then(() => {}, () => {})
      res = await Promise.race([
        p,
        // listen() always ends; this only covers a recorder / upload that never finishes
        new Promise((r) => { guard = setTimeout(() => { stop(); r({ alternatives: [], error: 'server-failed' }) }, ms + SAFETY_MS + 30000) }),
      ])
    } catch {
      res = { alternatives: [], error: 'server-failed' }
    } finally {
      clearTimeout(guard)
      if (micBusy.current === id) micBusy.current = 0
      if (attemptRef.current === a) stopWatch()
    }
    if (!mine()) return
    setWaiting(false)
    if (a.landed) return                          // it passed while listening: already rewarded
    a.landed = true
    setLive(null)
    const alternatives = res?.alternatives || []
    const error = res?.error || ''
    if (FATAL.has(error)) { setFatal(error); setPhase(back); return }
    if (!alternatives.length) {
      // silence, 'retry' (the recogniser just switched to the server), server trouble
      setNotice('unheard')
      setBlanks(b => b + 1)
      setPhase(back)
      return
    }
    settle(judge(step, alternatives), a, alternatives)
  }

  const skip = () => {
    if (finishedRef.current) return
    const s = stats.current
    stats.current = { ...s, combo: 0, scores: [...s.scores, stepBest.current] }
    setHud(h => ({ ...h, combo: 0 }))
    setWorld(w => ({ ...w, ...patchFor(step, w, null) }))
    goNext()
  }

  /* «Tinglash»: listen / ask → the character again; otherwise the clear model of the line */
  const sayText = step.choice ? (step.choice.find(o => o.key === focus) || step.choice[0]).say : step.say
  const gapLocked = type === 'gap' && !gapFilled && tries < 2
  const onListen = () => {
    if (phase === 'listening' || finishedRef.current) return
    if (type === 'ask' || needPick) { playPrompt(); return }
    if (gapLocked) return
    speak(sayText, 'model', MODEL_VOICE)
  }
  const onPick = (o) => {
    if (phase === 'listening' || acting) return
    setFocus(o.key)
    // after a failed try the coloured sentence belongs to the old card: show the new one
    if (option) { setOption(null); setResult(null) }
    speak(o.say, 'model', MODEL_VOICE)
  }
  const onAnswer = (o) => {
    if (phase === 'listening' || acting) return
    setFocus(o.key)
    speak(o.say, 'model', MODEL_VOICE)
  }
  /* listen / gap: a picture was tapped */
  const onTile = (o) => {
    if (phase === 'listening' || acting || finishedRef.current) return
    const right = sameWord(o.word, type === 'listen' ? step.answer : step.gap)
    if (right) {
      if (type === 'listen') {
        setPicked(o.item)
        setBubble(b => (b?.hidden ? { ...b, hidden: false } : b))
      } else setGapFilled(true)
      setBounce(b => b + 1)
      setNotice('picked')
    } else {
      setMisses(m => (m.includes(o.item) ? m : [...m, o.item]))
      setNotice('wrongpick')
    }
  }
  const onPoke = useCallback(() => {
    if (phase !== 'ready' && phase !== 'fail') return
    setBounce(b => b + 1)
    setTickle(true)
    later(() => setTickle(false), 1300)
  }, [phase, later])

  /* "Orqaga": drop the try being listened to and the voice, then ask */
  const openExit = () => {
    if (finishedRef.current) return
    if (phase === 'listening') {
      dropAttempt()
      setPhase(tries > 0 ? 'fail' : 'ready')
    }
    hush()
    showExit(true)
  }
  /* leave for the map: nothing may run (or finish the zone) after this */
  const leave = () => {
    if (finishedRef.current) return
    finishedRef.current = true
    runRef.current += 1
    clearTimers()
    dropAttempt()
    hush()
    onExit()
  }

  // keyboard (desktop): Space = mic / next, Enter = next
  useEffect(() => { keysRef.current = { onMic, goNext, acting, open: confirmExit } })
  useEffect(() => {
    const onKey = (e) => {
      const k = keysRef.current
      if (!k || k.open || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return
      const t = e.target
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(t.tagName))) return
      if (e.code === 'Space') { e.preventDefault(); if (k.acting) k.goNext(); else k.onMic() }
      else if (e.key === 'Enter' && k.acting) { e.preventDefault(); k.goNext() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // only the last attempt's error counts: the hook keeps its own error until the next start
  const fatalErr = fatal || (!supported ? 'unsupported' : '')
  let micState = 'idle'
  if (phase === 'listening') micState = listening && !waiting ? 'listening' : 'busy'
  else if (fatalErr) micState = 'disabled'
  else if (needPick) micState = 'locked'
  const otherTalks = speaker === 'other'

  // the line above the mic
  let status
  if (phase === 'listening') {
    status = (!listening || waiting)
      ? { text: 'Tekshirilmoqda…', tone: 'info' }
      : { text: busy ? 'Tekshirilmoqda… gapirishda davom eting' : 'Tinglayapman…', tone: 'live', sub: live?.text ? `“${live.text}”` : '' }
  } else if (phase === 'success') {
    status = { text: 'Barakalla! Toby bajaryapti…', tone: 'good', mark: 'ok' }
  } else if (phase === 'done') {
    status = { text: last ? 'Zo‘r! Zona tugadi' : 'Zo‘r! Keyingi gapga o‘tamiz', tone: 'good', mark: 'ok' }
  } else if (notice === 'pickfirst') {
    status = { text: 'Avval to‘g‘ri rasmni tanlang', tone: 'warn' }
  } else if (notice === 'wrongpick') {
    status = { text: type === 'listen' ? 'Bu emas — yana tinglang' : 'Bu so‘z mos kelmaydi — boshqasini tanlang', tone: 'bad', mark: 'bad' }
  } else if (notice === 'picked') {
    status = { text: type === 'listen' ? 'To‘g‘ri! Endi gapni ayting' : 'To‘g‘ri! Endi butun gapni ayting', tone: 'good', mark: 'ok' }
  } else if (notice === 'unheard') {
    status = { text: 'Eshitilmadi — yana bosing va balandroq ayting', tone: 'warn', sub: canSkip ? 'Qiyin bo‘lsa — o‘tkazib yuborishingiz mumkin' : '' }
  } else if (phase === 'fail') {
    status = {
      text: wrongWord ? `«${wrongWord.word}» bu yerga mos emas` : result?.verdict === 'almost' ? 'Deyarli! Qizil so‘zlarni aniqroq ayting' : 'Qaytadan urinib ko‘ring',
      tone: 'bad',
      mark: 'bad',
      sub: canSkip ? 'Qiyin bo‘lsa — o‘tkazib yuborishingiz mumkin' : tries >= 2 ? 'Avval «Tinglash» ni bosib eshiting' : result?.heard ? `Eshitildi: “${result.heard}”` : '',
    }
  } else if (needPick) {
    status = { text: otherTalks ? 'Tinglang…' : 'Tinglang va to‘g‘ri rasmni tanlang', tone: 'calm' }
  } else if (type === 'ask') {
    status = { text: otherTalks ? 'Savolni tinglang…' : 'Mikrofonni bosing va javob bering', tone: 'calm' }
  } else {
    status = { text: step.choice ? 'Bittasini tanlang, mikrofonni bosing va ayting' : 'Mikrofonni bosing va gapni ayting', tone: 'calm' }
  }
  const waveTone = phase === 'listening' ? 'live' : acting ? 'ok' : phase === 'fail' ? 'bad' : 'idle'
  const listenLabel = type === 'ask' || needPick ? 'Savolni qayta tinglash' : 'Namunani tinglash'

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-xl flex-col bg-[#0B0B10] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 sm:px-4 lg:max-w-[1440px] lg:px-8 lg:pb-7 lg:pt-6">
      {/* header */}
      <header className="flex flex-shrink-0 items-center gap-3 lg:gap-5">
        <button type="button" onClick={openExit} aria-label="Orqaga"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/75 transition hover:bg-[#17171F] lg:h-11 lg:w-11">
          <ChevronLeft size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[14px] font-bold text-white lg:text-[17px]">{zone.title} <span className="font-medium text-white/40">· {zone.uz}</span></p>
            <span className="flex-shrink-0 text-[12.5px] font-semibold tabular-nums text-white/45 lg:text-[14px]">{index + 1} / {steps.length}</span>
          </div>
          <div className="mt-2 flex gap-[3px] lg:gap-1">
            {steps.map((s, i) => (
              <span key={s.id || i} className={`h-[3px] flex-1 rounded-full transition-colors duration-500 lg:h-1 ${i < index || (i === index && acting) ? 'bg-[#FFB020]' : i === index ? 'bg-white/50' : 'bg-white/[0.10]'}`} />
            ))}
          </div>
        </div>
        <div className="hidden flex-shrink-0 items-center gap-2.5 rounded-full border border-white/[0.08] bg-[#111118] py-2 pl-2 pr-3.5 lg:flex">
          <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[12px] font-bold tabular-nums text-white/80">Lv {lv.level}</span>
          <div className="w-20"><Bar pct={lv.pct} reduced={reduced} height="h-1" /></div>
        </div>
        <div className="relative flex flex-shrink-0 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#111118] px-3 py-1.5 text-[14px] font-bold tabular-nums lg:px-4 lg:py-2 lg:text-[16px]">
          <Coin size={18} /> {hud.coins}
          <AnimatePresence>
            {gain && acting && (
              // the coins fly up into the wallet and are gone (a pill parked below it sat on the panel's border)
              <Motion.span key={gain.id} initial={{ opacity: 0, y: 18 }}
                animate={reduced ? { opacity: [0, 1, 0], y: 6 } : { opacity: [0, 1, 1, 0], y: [18, 6, 6, -8] }}
                transition={{ duration: 2.2, times: reduced ? [0, 0.5, 1] : [0, 0.12, 0.78, 1], ease: 'easeOut' }} exit={{ opacity: 0 }}
                className="pointer-events-none absolute right-1 top-full whitespace-nowrap rounded-full bg-[#FFB020] px-2 py-0.5 text-[12px] font-extrabold text-[#1A1203] shadow-lg lg:text-[14px]">
                +{gain.coins}
              </Motion.span>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* phone: scene / task / controls stacked · desktop: scene | panel (task + controls) */}
      <div className="mt-3 grid min-h-0 flex-1 grid-rows-[minmax(150px,1fr)_auto_auto] gap-2.5 [grid-template-areas:'scene'_'line'_'controls']
        lg:mt-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(420px,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:[grid-template-areas:'scene_panel']">

        {/* Toby's scene */}
        <div className="relative flex min-h-0 items-center justify-center [grid-area:scene]">
          <div className="relative h-full max-h-[min(100%,calc(100vw-16px))] w-full overflow-hidden rounded-[24px] bg-[#17171F] ring-1 ring-white/[0.08]
            lg:aspect-square lg:h-auto lg:max-h-full lg:rounded-[32px]">
            <SceneView step={step} world={world} phase={phase} speaker={speaker} talker={talker} tickle={tickle} bounce={bounce}
              onPoke={onPoke} reduced={reduced} acc={acc} />
            {party > 0 && <ConfettiBurst key={party} reduced={reduced} spread={140} />}
            <Bubble bubble={bubble} talking={otherTalks} reduced={reduced} onReplay={playPrompt} />
            {/* ✓ / ✗, stars, XP and the streak: a quiet corner, so Toby's action stays in view */}
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-center gap-1.5 lg:bottom-5 lg:left-5 lg:gap-2">
              <Verdict verdict={burst?.verdict} stars={burst?.stars} xp={burst?.xp} show={!!burst} reduced={reduced} />
              <AnimatePresence>
                {gain && acting && gain.combo >= 2 && (
                  <Motion.span key={`c${gain.id}`} initial={reduced ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.25 }}
                    className="rounded-full bg-[#FFB020] px-3 py-1.5 text-[13px] font-extrabold text-[#1A1203] shadow-[0_8px_24px_rgba(0,0,0,0.25)] lg:px-4 lg:py-2 lg:text-[16px]">
                    Ketma-ket ×{gain.combo}
                  </Motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* desktop panel (on a phone its two parts sit in the grid directly) */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:rounded-[32px] lg:border lg:border-white/[0.08] lg:bg-[#111118] lg:p-7 lg:[grid-area:panel] xl:p-9">
          {/* the task */}
          <section className="rounded-[22px] border border-white/[0.08] bg-[#111118] px-3.5 pb-3.5 pt-3 [grid-area:line]
            lg:flex lg:flex-1 lg:flex-col lg:border-0 lg:bg-transparent lg:p-0">
            <TaskLabel step={step} by={by} />
            <div className="mt-2.5 lg:mt-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:py-6">
              <AnimatePresence mode="wait" initial={false}>
                <Motion.div key={step.id || index} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                  <PlayLine step={step} by={by} phase={phase} live={live} result={result} option={option} focus={focus} tries={tries}
                    picked={picked} misses={misses} gapFilled={gapFilled} talking={otherTalks}
                    onPick={onPick} onTile={onTile} onAnswer={onAnswer} reduced={reduced} />
                </Motion.div>
              </AnimatePresence>
            </div>
          </section>

          {/* mic & co */}
          <section className="[grid-area:controls] lg:flex-shrink-0 lg:border-t lg:border-white/[0.06] lg:pt-5">
            {fatalErr ? (
              <div className="space-y-3 pb-1">
                <VoiceNotice error={fatalErr} />
                <div className="flex flex-wrap justify-center gap-2">
                  {fatalErr !== 'unsupported' && (
                    <button type="button" onClick={onMic} className="rounded-full bg-[#FFB020] px-4 py-2.5 text-sm font-bold text-[#1A1203] lg:px-6 lg:py-3 lg:text-base">Qayta urinish</button>
                  )}
                  <button type="button" onClick={leave} className="rounded-full border border-white/[0.08] bg-[#17171F] px-4 py-2.5 text-sm font-semibold hover:bg-[#1D1D27] lg:px-6 lg:py-3 lg:text-base">Xaritaga qaytish</button>
                  {(canSkip || fatalErr === 'unsupported') && (
                    <button type="button" onClick={skip} className="rounded-full border border-white/[0.08] bg-[#17171F] px-4 py-2.5 text-sm font-semibold hover:bg-[#1D1D27] lg:px-6 lg:py-3 lg:text-base">O‘tkazib yuborish</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <MicStatus {...status} />
                <div className="mx-auto max-w-[360px] px-6 lg:max-w-none lg:px-2">
                  <Waveform active={phase === 'listening' && listening} level={level} pulse={pulse} tone={waveTone} />
                </div>
                <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:mt-3 lg:gap-4">
                  <div className="justify-self-start">
                    {!acting && (
                      <button type="button" onClick={onListen} aria-label={listenLabel} disabled={phase === 'listening' || gapLocked}
                        className={`relative flex h-12 items-center justify-center gap-2 rounded-full border px-3.5 transition disabled:opacity-35 lg:h-14 lg:px-5
                          ${speaker === 'model' || (otherTalks && (needPick || type === 'ask')) ? 'border-[#FFB020]/40 bg-[#FFB020]/[0.12] text-[#FFD27A]'
                            : tries >= 2 ? 'border-amber-300/50 bg-amber-300/[0.14] text-amber-100' : 'border-white/[0.08] bg-[#17171F] text-white/80 hover:bg-[#1D1D27]'}`}>
                        {tries >= 2 && phase !== 'listening' && !reduced && (
                          <Motion.span className="absolute inset-0 rounded-full ring-2 ring-amber-300/70" initial={{ opacity: 0.8, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.25 }} transition={{ duration: 1.4, repeat: Infinity }} />
                        )}
                        <Volume2 size={19} className="relative" />
                        <span className="relative text-[13px] font-semibold lg:text-[15px]">Tinglash</span>
                      </button>
                    )}
                  </div>
                  {acting ? (
                    <Motion.button type="button" onClick={goNext} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileTap={{ scale: 0.96 }}
                      className="relative my-1 flex h-[64px] min-w-[160px] items-center justify-center gap-2 overflow-hidden rounded-full bg-[#FFB020] px-7 text-[17px] font-extrabold text-[#1A1203] shadow-[0_8px_30px_rgba(255,176,32,0.25)]
                        lg:h-[76px] lg:min-w-[220px] lg:text-[20px]">
                      {phase === 'done' && (
                        <Motion.span className="absolute inset-y-0 left-0 bg-white/30" initial={{ width: '0%' }} animate={{ width: '100%' }}
                          transition={{ duration: (last ? AUTO_NEXT_MS + 1400 : AUTO_NEXT_MS) / 1000, ease: 'linear' }} />
                      )}
                      <span className="relative">{last ? 'Yakunlash' : 'Keyingi'}</span>
                      <ArrowRight size={21} className="relative" />
                    </Motion.button>
                  ) : (
                    <PlayMic state={micState} onPress={onMic} ms={ring.ms} runKey={ring.id} reduced={reduced} />
                  )}
                  <div className="justify-self-end">
                    {canSkip && (
                      <Motion.button type="button" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} onClick={skip}
                        className="flex h-12 items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#17171F] px-3.5 text-[13px] font-semibold text-white/80 hover:bg-[#1D1D27] lg:h-14 lg:px-5 lg:text-[15px]">
                        <SkipForward size={16} className="flex-shrink-0" /> O‘tkazish
                      </Motion.button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {/* level up toast (does not block the game) */}
      <AnimatePresence>
        {levelUp > 0 && (
          <Motion.div key={`lvl${levelUp}`} initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22, delay: reduced ? 0 : 1.1 }} role="status"
            className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex w-[min(92vw,360px)] items-center gap-3 rounded-[22px] border border-white/[0.10] bg-[#17171F]/95 py-2 pl-2 pr-4 shadow-2xl backdrop-blur">
            <TobyAvatar mood="happy" pose="cheer" acc={acc} className="h-12 w-12 flex-shrink-0 rounded-2xl bg-white/[0.06]" reduced={reduced} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFB020]">Yangi daraja</p>
              <p className="text-[17px] font-extrabold leading-tight text-white">Speaking Lv {levelUp}</p>
              <p className="truncate text-[12px] font-medium text-white/55">Toby gapirishda kuchliroq bo‘ldi!</p>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* leave? */}
      <AnimatePresence>
        {confirmExit && (
          <Motion.div key="exit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={() => showExit(false)}>
            <Motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-[26px] border border-white/[0.08] bg-[#111118] p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-center shadow-2xl">
              <button type="button" onClick={() => showExit(false)} aria-label="Yopish" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70"><X size={16} /></button>
              <p className="-mt-1 text-[18px] font-extrabold">Chiqasizmi?</p>
              <p className="mt-1 text-[14px] text-white/55">Bu zonadagi natija saqlanmaydi.</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => showExit(false)} className="rounded-2xl bg-[#FFB020] py-3 font-extrabold text-[#1A1203]">Davom etish</button>
                <button type="button" onClick={leave} className="rounded-2xl border border-white/[0.08] bg-[#17171F] py-3 font-semibold hover:bg-[#1D1D27]">Chiqish</button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
