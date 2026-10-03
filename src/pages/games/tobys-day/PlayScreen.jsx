/*
 * TOBY'S DAY — one zone, step by step.
 *
 * ONE TAP. The mic opens and stays open (continuous) while the learner speaks;
 * the words light up like karaoke as they are recognised. The moment the line
 * passes, the mic closes by itself and Toby does it AT ONCE — no second tap —
 * then the other character answers and the game moves on. If time runs out,
 * the learner stops talking for a few seconds, or taps the mic again, whatever
 * was heard is judged: ✗, red / amber words, a confused Toby, one tap to retry.
 * After 2 failed tries the Uzbek hint grows and «Tinglash» pulses; after 3 the
 * line can be skipped (0 ★).
 *
 * Phone: the line on top, Toby's scene as tall as it fits, the mic at the bottom.
 * Desktop (≥ 1024 px): a huge scene on the left, the line + mic panel on the right.
 */
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, Flame, SkipForward, Volume2, X } from 'lucide-react'
import { useSpeech, FATAL } from '../../../games/voice/useSpeech'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { VerdictBurst, VoiceNotice } from '../../../games/voice/VoiceUI'
import { zoneLines } from './content'
import { coinsFor, earlyPass, judge, levelInfo, listenMs, patchFor, starsFor, xpFor } from './logic'
import Scene from './scenes'
import { TobyAvatar } from './Toby'
import { Bar, Coin, ConfettiBurst, RetryBurst } from './ui'
import { PlayLine } from './PlayLine'
import { PlayMic, PlayStatus } from './PlayMic'

// the mic level re-renders this screen ~10× a second while listening: the big SVG scene must not
const SceneView = memo(Scene)

const AUTO_NEXT_MS = 2000      // after Toby (and the other character) finished speaking
const SILENCE_MS = 3200        // this long without new words (and without voice) ends a try
const SAFETY_MS = 10000        // the recogniser's own limit is set this much past ours
const STOP_GRACE_MS = 700      // a second tap this soon after the first is a double tap, not "stop"
const wait = (ms) => new Promise(r => setTimeout(r, ms))

export default function PlayScreen({ zone, startXp = 0, onExit, onFinish, reduced = false, acc = null }) {
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
  const [burst, setBurst] = useState(null)           // { id, verdict, retry }
  const [party, setParty] = useState(0)              // confetti burst id
  const [speaker, setSpeaker] = useState(null)       // 'toby' | 'other' — whose mouth moves
  const [reply, setReply] = useState('')
  const [notice, setNotice] = useState('')           // 'unheard'
  const [fatal, setFatal] = useState('')
  const [hud, setHud] = useState({ coins: 0, combo: 0, xp: 0 })
  const [gain, setGain] = useState(null)             // { id, coins, stars, combo }
  const [levelUp, setLevelUp] = useState(0)
  const [tickle, setTickle] = useState(false)
  const [bounce, setBounce] = useState(0)            // +1 = Toby hops once
  const [confirmExit, setConfirmExit] = useState(false)

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
  const timers = useRef(new Set())
  const stats = useRef({ coins: 0, stars: 0, combo: 0, said: 0, xp: 0, scores: [], start: 0 })
  const stepBest = useRef(0)
  const keysRef = useRef(null)

  const step = steps[index]
  const last = index === steps.length - 1
  const acting = phase === 'success' || phase === 'done'
  const fails = tries + blanks
  const canSkip = !acting && phase !== 'listening' && fails >= 3
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

  /* the model voice; Toby's (or the shopkeeper's) mouth moves while it plays.
     Always resolves: when the line ends, after a timeout, or as soon as it is cut off. */
  const speak = useCallback(async (text, who = 'toby') => {
    const id = ++voiceRef.current
    voiceEnd.current?.()
    setSpeaker(who)
    await new Promise((resolve) => {
      let timer = 0
      const end = () => {
        clearTimeout(timer)
        if (voiceEnd.current === end) voiceEnd.current = null
        resolve()
      }
      voiceEnd.current = end
      timer = setTimeout(end, 4000 + text.length * 90)
      sayLine(text).then(end, end)
    })
    if (alive.current && id === voiceRef.current) setSpeaker(null)
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
  }, [])

  const showExit = (open) => {
    confirmRef.current = open
    setConfirmExit(open)
  }

  const showBurst = (verdict, retry) => {
    const id = ++burstRef.current
    setBurst({ id, verdict, retry })
    later(() => setBurst(b => (b?.id === id ? null : b)), 1500)
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
    setReply('')
    setNotice('')
    setTickle(false)
  }

  /* the line passed: rewards, Toby does it at once, says it back, the other character answers */
  const succeed = (r, opt, attempt) => {
    const token = attempt.token
    const s = stats.current
    const stars = starsFor(r.verdict, tries)
    const combo = tries === 0 ? s.combo + 1 : 0
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
    setBounce(b => b + 1)
    setParty(p => p + 1)
    showBurst(r.verdict, tries > 0)
    if (after > before) setLevelUp(after)

    later(async () => {
      // never talk into an open mic: wait until the recogniser has really let go
      await Promise.race([attempt.settled || Promise.resolve(), wait(1500)])
      if (!alive.current || token !== runRef.current) return
      await speak(opt ? opt.say : step.say, 'toby')
      if (!alive.current || token !== runRef.current) return
      if (step.reply) {
        setReply(step.reply)
        await speak(step.reply, 'other')
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
    showBurst(r.verdict === 'almost' ? 'almost' : 'wrong', false)
  }

  /* one judged try → pass or fail (called once per try: `attempt.landed` guards it) */
  const settle = (j, attempt) => {
    stepBest.current = Math.max(stepBest.current, j.result.score)
    setResult(j.result)
    setOption(j.option)
    setLive(null)
    setWaiting(false)
    if (j.result.passed) succeed(j.result, j.option, attempt)
    else fail(j.result)
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
    if (!supported) { setFatal('unsupported'); return }
    prime()                                       // opens the mic inside this tap (iOS)
    hush()                                        // never listen while a voice line plays
    setNotice('')
    setBurst(null)
    setFatal('')
    setReply('')
    setResult(null)
    setOption(null)
    setLive(null)
    setWaiting(false)

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
      if (text && text !== a.text) { a.text = text; a.heardAt = Date.now() }
      const j = judge(step, alts)
      if (earlyPass(j.result)) {
        a.landed = true
        stopWatch()
        // close the mic now and skip the server's "last bit" upload (nothing needs it): the
        // listen resolves at once, so Toby's voice is not held back behind a transcription
        stop({ discard: true })
        settle(j, a)
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
    settle(judge(step, alternatives), a)
  }

  const skip = () => {
    if (finishedRef.current) return
    const s = stats.current
    stats.current = { ...s, combo: 0, scores: [...s.scores, stepBest.current] }
    setHud(h => ({ ...h, combo: 0 }))
    setWorld(w => ({ ...w, ...patchFor(step, w, null) }))
    goNext()
  }

  const sayText = step.choice ? (step.choice.find(o => o.key === focus) || step.choice[0]).say : step.say
  const onListen = () => {
    if (phase === 'listening' || finishedRef.current) return
    speak(sayText, 'toby')
  }
  const onPick = (o) => {
    if (phase === 'listening' || acting) return
    setFocus(o.key)
    // after a failed try the coloured sentence belongs to the old card: show the new one
    if (option) { setOption(null); setResult(null) }
    speak(o.say, 'toby')
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
  const micLabel = micState === 'listening' ? 'Tinglayapman…' : micState === 'busy' ? 'Tekshirilmoqda…' : tries || blanks ? 'Yana bir bosing' : 'Bosing va ayting'

  // the line above the mic
  let status = { text: step.choice ? 'Bittasini tanlang, mikrofonni bir marta bosing va ayting' : 'Mikrofonni bir marta bosing va gapni ayting', tone: 'calm' }
  if (phase === 'listening') {
    status = (!listening || waiting)
      ? { text: 'Tekshirilmoqda…', tone: 'info' }
      : { text: busy ? 'Tekshirilmoqda… gapirishda davom eting' : 'Gapiring — Toby tinglayapti', tone: 'live', meter: true, sub: live?.text ? `“${live.text}”` : '' }
  } else if (notice === 'unheard') {
    status = { text: 'Eshitilmadi — yana bir bor bosing va balandroq ayting', tone: 'warn', sub: canSkip ? 'Qiyin bo‘lsa — o‘tkazib yuborishingiz mumkin' : '' }
  } else if (phase === 'fail') {
    status = {
      text: result?.verdict === 'almost' ? 'Deyarli! Qizil so‘zlarni aniqroq ayting' : 'Qaytadan ayting — bir marta bosing',
      tone: 'bad',
      sub: canSkip ? 'Qiyin bo‘lsa — o‘tkazib yuborishingiz mumkin' : tries >= 2 ? 'Avval «Tinglash» ni bosib eshiting' : result?.heard ? `Eshitildi: “${result.heard}”` : '',
    }
  } else if (phase === 'success') {
    status = { text: 'Barakalla! Toby bajaryapti…', tone: 'good' }
  } else if (phase === 'done') {
    status = { text: last ? 'Zo‘r! Kun tugadi' : 'Zo‘r! Keyingi gapga o‘tamiz', tone: 'good' }
  }

  const xpRow = (cls) => (
    <div className={`items-center gap-2 ${cls}`}>
      <span className="flex-shrink-0 whitespace-nowrap rounded-md bg-gradient-to-r from-sky-500 to-violet-600 px-1.5 py-0.5 text-[11px] font-black lg:px-2.5 lg:py-1 lg:text-sm">Lv {lv.level}</span>
      <Bar pct={lv.pct} reduced={reduced} height="h-2 lg:h-3" />
      <span className="flex-shrink-0 text-[11px] font-bold text-white/45 lg:text-sm">Speaking</span>
      {hud.combo >= 2 && (
        <span className="flex flex-shrink-0 items-center gap-0.5 rounded-full bg-orange-500/20 px-2 py-0.5 text-[11px] font-black text-orange-300 lg:px-3 lg:py-1 lg:text-sm">
          <Flame size={14} /> x{hud.combo}
        </span>
      )}
    </div>
  )

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-xl flex-col px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 sm:px-4 lg:max-w-[1440px] lg:px-6 lg:pb-6 lg:pt-5">
      {/* header */}
      <header className="flex flex-shrink-0 items-center gap-3 lg:gap-5">
        <button type="button" onClick={openExit} aria-label="Orqaga"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15 lg:h-12 lg:w-12">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-white/60 lg:text-base">
            <span className="truncate"><span className="text-white lg:text-lg">{zone.title}</span> · {zone.uz}</span>
            <span className="tabular-nums lg:text-lg">{index + 1}/{steps.length}</span>
          </div>
          <div className="mt-1.5 flex gap-1 lg:mt-2 lg:gap-1.5">
            {steps.map((s, i) => (
              <span key={s.id || i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 lg:h-2.5 ${i < index || (i === index && acting) ? 'bg-amber-400' : i === index ? 'bg-white/70' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>
        <div className="relative flex flex-shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-black tabular-nums lg:px-4 lg:py-2 lg:text-xl">
          <Coin size={20} /> {hud.coins}
          <AnimatePresence>
            {gain && acting && (
              <Motion.span key={gain.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 26 }} exit={{ opacity: 0 }}
                className="absolute right-1 top-full whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[12px] font-black text-amber-950 shadow-lg lg:text-base">
                +{gain.coins}
              </Motion.span>
            )}
          </AnimatePresence>
        </div>
      </header>

      {xpRow('mt-2 flex flex-shrink-0 lg:hidden')}

      {/* phone: line / scene / controls stacked · desktop: scene | panel (line + controls) */}
      <div className="mt-2 grid min-h-0 flex-1 grid-rows-[auto_minmax(150px,1fr)_auto] gap-2.5 [grid-template-areas:'line'_'scene'_'controls']
        lg:mt-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(400px,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-6 lg:[grid-template-areas:'scene_panel']">

        {/* Toby's scene */}
        <div className="relative flex min-h-0 items-center justify-center [grid-area:scene]">
          <div className="relative h-full max-h-[min(100%,calc(100vw-16px))] w-full overflow-hidden rounded-[28px] bg-white/5 shadow-2xl ring-1 ring-white/10
            lg:aspect-square lg:h-auto lg:max-h-full lg:rounded-[36px]">
            <SceneView step={step} world={world} phase={phase} speaker={speaker} tickle={tickle} bounce={bounce}
              onPoke={onPoke} reduced={reduced} acc={acc} />
            {party > 0 && <ConfettiBurst key={party} reduced={reduced} spread={140} />}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center lg:scale-125">
              {burst?.retry ? <RetryBurst show /> : <VerdictBurst verdict={burst?.verdict} show={!!burst} />}
            </div>
            <AnimatePresence>
              {reply && (
                <Motion.div key={reply} initial={{ opacity: 0, scale: 0.8, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="pointer-events-none absolute right-3 top-3 max-w-[66%] rounded-2xl rounded-br-md bg-white px-3 py-2 text-[14px] font-extrabold leading-snug text-slate-800 shadow-xl
                    lg:right-5 lg:top-5 lg:rounded-3xl lg:px-5 lg:py-3.5 lg:text-2xl">
                  {reply}
                </Motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {gain && acting && gain.stars > 0 && (
                <Motion.div key={`s${gain.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5 lg:left-5 lg:top-5 lg:gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[13px] font-black text-yellow-300 lg:px-4 lg:py-2 lg:text-xl">
                    +{gain.stars} ★ <span className="text-sky-300">+{xpFor(gain.stars)} XP</span>
                  </span>
                  {/* a streak of first-try lines: a hot little badge */}
                  {gain.combo >= 2 && (
                    <Motion.span initial={reduced ? false : { scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 12, delay: 0.25 }}
                      className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-400 to-rose-500 px-2.5 py-1 text-[13px] font-black text-white shadow-lg shadow-orange-500/30 lg:px-4 lg:py-1.5 lg:text-lg">
                      <Flame size={15} className="fill-yellow-200 text-yellow-200" /> Ketma-ket x{gain.combo}!
                    </Motion.span>
                  )}
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* desktop panel (on a phone its two parts sit in the grid directly) */}
        <div className="contents lg:flex lg:min-h-0 lg:flex-col lg:overflow-y-auto lg:rounded-[36px] lg:bg-white/[0.05] lg:p-7 lg:ring-1 lg:ring-white/10 lg:[grid-area:panel] xl:p-9">
          {/* the line to say */}
          <section className="rounded-[24px] border border-white/10 bg-white/[0.06] px-3.5 py-3 shadow-lg [grid-area:line]
            lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <AnimatePresence mode="wait" initial={false}>
              <Motion.div key={step.id || index} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                <PlayLine step={step} phase={phase} live={live} result={result} option={option} focus={focus} tries={tries}
                  onPick={onPick} reduced={reduced} />
              </Motion.div>
            </AnimatePresence>
          </section>

          {/* mic & co */}
          <section className="[grid-area:controls] lg:mt-6 lg:flex-shrink-0">
            {fatalErr ? (
              <div className="space-y-3 pb-1">
                <VoiceNotice error={fatalErr} />
                <div className="flex flex-wrap justify-center gap-2">
                  {fatalErr !== 'unsupported' && (
                    <button type="button" onClick={onMic} className="rounded-full bg-gradient-to-r from-sky-400 to-indigo-600 px-4 py-2.5 text-sm font-bold lg:px-6 lg:py-3 lg:text-base">Qayta urinish</button>
                  )}
                  <button type="button" onClick={leave} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15 lg:px-6 lg:py-3 lg:text-base">Xaritaga qaytish</button>
                  {(canSkip || fatalErr === 'unsupported') && (
                    <button type="button" onClick={skip} className="rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15 lg:px-6 lg:py-3 lg:text-base">O‘tkazib yuborish</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <PlayStatus {...status} level={level} reduced={reduced} />
                <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:mt-3 lg:gap-4">
                  <div className="justify-self-start">
                    {!acting && (
                      <button type="button" onClick={onListen} aria-label="Tinglash" disabled={phase === 'listening'}
                        className={`relative flex h-12 w-12 items-center justify-center gap-2 rounded-full transition disabled:opacity-40 lg:h-14 lg:w-auto lg:px-5
                          ${speaker === 'toby' ? 'bg-sky-400/30 text-sky-100' : tries >= 2 ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-white/85 hover:bg-white/15'}`}>
                        {tries >= 2 && phase !== 'listening' && !reduced && (
                          <Motion.span className="absolute inset-0 rounded-full ring-4 ring-amber-300" initial={{ opacity: 0.8, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.35 }} transition={{ duration: 1.2, repeat: Infinity }} />
                        )}
                        <Volume2 size={22} className="relative" />
                        <span className="relative hidden text-lg font-black lg:inline">Tinglash</span>
                      </button>
                    )}
                  </div>
                  {acting ? (
                    <Motion.button type="button" onClick={goNext} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileTap={{ scale: 0.95 }}
                      className="relative my-1 flex h-[70px] min-w-[170px] items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-7 text-lg font-black text-emerald-950 shadow-2xl shadow-emerald-500/30
                        lg:h-[88px] lg:min-w-[250px] lg:text-2xl">
                      {phase === 'done' && (
                        <Motion.span className="absolute inset-y-0 left-0 bg-white/30" initial={{ width: '0%' }} animate={{ width: '100%' }}
                          transition={{ duration: (last ? AUTO_NEXT_MS + 1400 : AUTO_NEXT_MS) / 1000, ease: 'linear' }} />
                      )}
                      <span className="relative">{last ? 'Yakunlash' : 'Keyingi'}</span>
                      <ArrowRight size={24} className="relative" />
                    </Motion.button>
                  ) : (
                    <PlayMic state={micState} onPress={onMic} level={level} ms={ring.ms} runKey={ring.id} label={micLabel} reduced={reduced} />
                  )}
                  <div className="justify-self-end">
                    {canSkip && (
                      <Motion.button type="button" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} onClick={skip}
                        className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2.5 text-left text-[13px] font-bold leading-tight text-white/85 hover:bg-white/15 lg:px-5 lg:py-3 lg:text-base">
                        <SkipForward size={16} className="flex-shrink-0" /> O‘tkazib yuborish
                      </Motion.button>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>

          {xpRow('mt-6 hidden flex-shrink-0 lg:flex')}
        </div>
      </div>

      {/* level up toast (does not block the game) */}
      <AnimatePresence>
        {levelUp > 0 && (
          <Motion.div key={`lvl${levelUp}`} initial={{ opacity: 0, y: -30, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: reduced ? 0 : 1.1 }} role="status"
            className="pointer-events-none fixed inset-x-0 top-3 z-50 mx-auto flex w-[min(92vw,380px)] items-center gap-3 rounded-3xl bg-gradient-to-r from-sky-500 to-violet-600 py-2 pl-2 pr-4 shadow-2xl shadow-violet-900/50">
            <TobyAvatar mood="happy" pose="cheer" acc={acc} className="h-14 w-14 flex-shrink-0 rounded-2xl bg-white/15" reduced={reduced} />
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/80">Level up!</p>
              <p className="text-xl font-black leading-tight text-white">Speaking Lv {levelUp}</p>
              <p className="truncate text-[12px] font-semibold text-white/85">Toby gapirishda kuchliroq bo‘ldi!</p>
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
              className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#141428] p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-center shadow-2xl">
              <button type="button" onClick={() => showExit(false)} aria-label="Yopish" className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><X size={16} /></button>
              <p className="-mt-2 text-lg font-black">Chiqasizmi?</p>
              <p className="mt-1 text-sm text-white/60">Bu zonadagi natija saqlanmaydi.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => showExit(false)} className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 font-black text-amber-950">Davom etish</button>
                <button type="button" onClick={leave} className="rounded-2xl bg-white/10 py-3 font-bold hover:bg-white/15">Chiqish</button>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
