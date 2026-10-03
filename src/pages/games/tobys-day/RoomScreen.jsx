/*
 * TOBY'S PLAY ROOM — "My Talking Tom" mode.
 *
 * One tap on the mic → it listens by itself (up to 15 s). The moment a known
 * command is heard ("Jump!", "Don't cry!") Toby does it and the mic switches
 * off; he answers by voice (the mic is never open while he talks).
 * Something unknown → Toby tilts his head, shows what he heard and two lines
 * to try. Left alone for 20–30 s he gets up to mischief (cries, jumps on the
 * sofa, goes for the cake, bangs the drum, runs around) until the learner says
 * the right "don't" command.
 *
 * Rewards: the first time each of the 28 commands is said → +1 ★ (room stars,
 * saved in data.room through onSaid).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ChevronLeft, CloudOff, Star, Volume2, X } from 'lucide-react'
import { FATAL, useSpeech } from '../../../games/voice/useSpeech'
import { preloadLines, sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { MicButton, VoiceNotice } from '../../../games/voice/VoiceUI'
import RoomScene from './RoomScene'
import { CommandIcon, RoomChipRow, RoomPanel } from './RoomChips'
import { AccIcon, WardrobeButton } from './Wardrobe'
import {
  BY_KEY, COMMANDS, COMMAND_COUNT, HELLO, MISCHIEFS, MISCHIEF_BY_KIND, MISCHIEF_GIVE_UP_MS, MISCHIEF_MAX_MS, MISCHIEF_MIN_MS,
  DIZZY, HAT_ALREADY, NO_HAT, POKES, POKE_DIZZY_MS, POKE_DIZZY_N, REFUSE, ROOM_LINES, SLEEPY, SORRY, WONT, fixesMischief, readToday,
  accName, accUnlocks, allStars, resolveAlternatives, roomSaid, roomStars, suggestions, writeToday,
} from './room'

const LISTEN_MS = 15000
const QUIET_MS = { browser: 2600, server: 4200 }   // something was heard but no command for this long → show it
const POSITIVE_WAIT_MS = 900                         // during mischief a positive command waits: "don't" may still come
const ACT_MS = 2600
const STOP_GRACE_MS = 700                            // a second tap this soon is a double tap, not "stop"
const SLEEP_MS = 45000                               // Toby wakes up by himself
const HATS = new Set(['cap', 'crown', 'party'])
const CONFETTI = [
  [8, '#FDE047'], [18, '#F472B6'], [28, '#A5F3FC'], [38, '#86EFAC'], [48, '#FDBA74'], [58, '#C4B5FD'],
  [68, '#FDE047'], [78, '#F9A8D4'], [88, '#93C5FD'], [13, '#FCA5A5'], [53, '#A7F3D0'], [83, '#FDE68A'],
]
const rand = (a, b) => a + Math.random() * (b - a)

/* a handler that never changes identity but always runs the latest code (keeps memo'd children still) */
function useStable(fn) {
  const ref = useRef(fn)
  useEffect(() => { ref.current = fn })
  return useCallback((...args) => ref.current(...args), [])
}

/* five bars that follow the mic level */
function Meter({ level }) {
  return (
    <span className="ml-2 inline-flex h-5 items-end gap-[3px] align-middle" aria-hidden>
      {[0.35, 0.7, 1, 0.7, 0.35].map((k, i) => (
        <span key={i} className="w-[4px] rounded-full bg-rose-300 transition-[height] duration-100"
          style={{ height: `${Math.max(4, Math.min(20, 4 + level * k * 26))}px` }} />
      ))}
    </span>
  )
}

/* a line on a small pill: tap → hear it */
function SayChip({ k, onTap, big = false }) {
  const cmd = BY_KEY[k]
  if (!cmd) return null
  return (
    <button type="button" onClick={() => onTap(k)}
      className={`inline-flex items-center gap-2 rounded-2xl bg-white font-black text-slate-800 shadow-lg transition hover:scale-[1.03] ${big ? 'px-3.5 py-2 text-[17px] lg:text-[22px]' : 'px-2.5 py-1.5 text-[14px] lg:text-[17px]'}`}>
      <CommandIcon k={k} size={big ? 16 : 14} className={big ? 'h-8 w-8 rounded-lg' : 'h-6 w-6 rounded-lg'} />
      “{cmd.say}”
      <Volume2 size={big ? 17 : 14} className="text-slate-400" />
    </button>
  )
}

export default function RoomScreen({ progress, acc = null, online = null, paused = false, onExit, onSaid, onWardrobe, reduced = false }) {
  const { listen, stop, prime, listening, busy, interim, level, supported, mode } = useSpeech()
  const said = roomSaid(progress)
  const stars = roomStars(progress)

  const [micOn, setMicOn] = useState(false)
  const [listenKey, setListenKey] = useState(0)
  const [act, setAct] = useState(null)            // what Toby is doing now: { id, key, mood, pose, right, motion, fx, stage, walking }
  const [posture, setPosture] = useState('stand') // stand · sit · lie · sleep
  const [hat, setHat] = useState('worn')          // worn · on (the cap) · off (no hat)
  const [mischief, setMischief] = useState(null)  // { kind, id, since }
  const [spot, setSpot] = useState('center')
  const [walking, setWalking] = useState(false)
  const [talking, setTalking] = useState(false)
  const [bubble, setBubble] = useState(null)      // { id, text }
  const [heard, setHeard] = useState(null)        // { id, text, key?, unknown?, sugg?, sleepy? }
  const [notice, setNotice] = useState('')
  const [fatal, setFatal] = useState(supported ? '' : 'unsupported')
  const [gain, setGain] = useState(null)          // { id, star, praise, key }
  const [unlock, setUnlock] = useState(null)      // { id, acc } — this star opened a new accessory
  const [today, setToday] = useState(readToday)
  const [calmed, setCalmed] = useState(0)
  const [chipVoice, setChipVoice] = useState(null)
  const [hint, setHint] = useState(0)
  const [wiggle, setWiggle] = useState(0)

  const alive = useRef(true)
  const seq = useRef(0)
  const listenId = useRef(0)
  const firedId = useRef(0)
  const heardAt = useRef({ text: '', at: 0 })
  const pending = useRef(null)
  const voiceId = useRef(0)
  const voiceEnd = useRef(null)
  const timers = useRef(new Set())
  const actTimer = useRef(0)
  const sleepTimer = useRef(0)
  const walkTimer = useRef(0)
  const nextMischief = useRef(0)
  const lastMischief = useRef('')
  const ignored = useRef(0)                       // mischief nobody reacted to, in a row
  const live = useRef({})
  const tickRef = useRef(null)
  const pokes = useRef({ n: 0, times: [] })
  const hearing = useRef(false)                   // the mic is open right now (set without waiting for a render)
  const micStart = useRef(0)

  // the latest state for callbacks that outlive a render (onInterim, timers)
  useEffect(() => {
    live.current = { micOn, act, talking, posture, mischief, said, today, level, busy, mode, paused, fatal, onSaid, acc, hat, progress }
  })

  const later = useCallback((fn, ms) => {
    const id = setTimeout(() => { timers.current.delete(id); if (alive.current) fn() }, ms)
    timers.current.add(id)
    return id
  }, [])

  // the learner did something: the next mischief is 20–30 s away
  const bump = useCallback(() => {
    ignored.current = 0
    nextMischief.current = Date.now() + rand(MISCHIEF_MIN_MS, MISCHIEF_MAX_MS)
  }, [])

  /* Toby's voice: his mouth moves and the line shows in a bubble. Always resolves.
     Never while the mic is open: it would hear him ("Wheee! Jump…" → jump → …). A reply that
     was queued just before the learner tapped the mic again is simply dropped. */
  const speak = useCallback(async (text) => {
    if (hearing.current) return
    const id = ++voiceId.current
    voiceEnd.current?.()
    setTalking(true)
    setBubble({ id, text })
    await new Promise((resolve) => {
      let t = 0
      const end = () => {
        clearTimeout(t)
        if (voiceEnd.current === end) voiceEnd.current = null
        resolve()
      }
      voiceEnd.current = end
      t = setTimeout(end, 3500 + text.length * 90)
      sayLine(text).then(end, end)
    })
    if (!alive.current || id !== voiceId.current) return
    setTalking(false)
    later(() => setBubble(b => (b?.id === id ? null : b)), 1100)
  }, [later])

  const hush = useCallback(() => {
    voiceId.current += 1
    voiceEnd.current?.()
    stopVoice()
    setTalking(false)
    setBubble(null)
  }, [])

  const walkTo = useCallback((where) => {
    setSpot(where)
    setWalking(true)
    clearTimeout(walkTimer.current)
    walkTimer.current = setTimeout(() => { if (alive.current) setWalking(false) }, reduced ? 50 : 800)
  }, [reduced])

  /* Toby does something for a while, then goes back to his posture */
  const doAct = useCallback((a, ms = ACT_MS) => {
    const id = ++seq.current
    clearTimeout(actTimer.current)
    setAct({ id, ...a })
    actTimer.current = setTimeout(() => { if (alive.current) setAct(x => (x?.id === id ? null : x)) }, ms)
    return id
  }, [])

  /* ── mount / unmount ── */
  useEffect(() => {
    alive.current = true
    const pend = timers.current
    nextMischief.current = Date.now() + rand(MISCHIEF_MIN_MS, MISCHIEF_MAX_MS)
    const cancel = preloadLines(ROOM_LINES)
    const hello = setTimeout(() => {
      doAct({ mood: 'happy', pose: 'wave' }, 2400)
      speak(HELLO)
    }, reduced ? 200 : 650)
    return () => {
      alive.current = false
      listenId.current += 1
      clearTimeout(hello)
      cancel()
      pend.forEach(clearTimeout)
      pend.clear()
      clearTimeout(actTimer.current)
      clearTimeout(sleepTimer.current)
      clearTimeout(walkTimer.current)
      voiceEnd.current?.()
      stopVoice()
      stop({ discard: true })
    }
  }, [doAct, speak, stop, reduced])

  /* ── rewards ── */
  const reward = useCallback((key) => {
    const s = live.current
    const first = !(s.said?.[key] > 0)
    const keys = s.today.includes(key) ? s.today : [...s.today, key]
    if (keys !== s.today) { setToday(keys); writeToday(keys) }
    s.onSaid?.(key, keys.length)
    if (first) {
      setGain({ id: ++seq.current, star: true, key })
      // this star reaches an accessory's threshold → it is unlocked now
      const opened = accUnlocks.find(a => a.need === allStars(s.progress) + 1)
      if (opened) setUnlock({ id: ++seq.current, acc: opened.acc })
    }
    return first
  }, [])

  /* ── mischief ── */
  const startMischief = useCallback(() => {
    const pool = MISCHIEFS.filter(m => m.kind !== lastMischief.current)
    const m = pool[Math.floor(Math.random() * pool.length)]
    lastMischief.current = m.kind
    clearTimeout(actTimer.current)
    setAct(null)
    setHeard(null)
    setNotice('')
    setPosture('stand')                               // he gets up to be naughty
    setMischief({ kind: m.kind, id: ++seq.current, since: Date.now() })
    walkTo(m.spot)
    later(() => { if (live.current.mischief?.kind === m.kind && !live.current.micOn) speak(m.line) }, reduced ? 100 : 850)
  }, [later, speak, walkTo, reduced])

  const endMischief = useCallback(() => {
    setMischief(null)
    walkTo('center')
    bump()
  }, [walkTo, bump])

  // every second: start mischief after a quiet while, or let it fade out when nobody reacts
  useEffect(() => {
    tickRef.current = () => {
      const s = live.current
      const now = Date.now()
      if (document.hidden || s.paused || s.fatal) { nextMischief.current = Math.max(nextMischief.current, now + MISCHIEF_MIN_MS); return }
      if (s.mischief) {
        if (now - s.mischief.since > MISCHIEF_GIVE_UP_MS && !s.micOn && !s.talking) {
          // nobody reacted: he gets bored; after two in a row he waits until the learner is back
          ignored.current += 1
          setMischief(null)
          walkTo('center')
          nextMischief.current = ignored.current >= 2 ? Infinity : now + rand(MISCHIEF_MIN_MS, MISCHIEF_MAX_MS)
        }
        return
      }
      if (s.micOn || s.talking || s.act || s.posture === 'sleep') return
      if (now >= nextMischief.current) startMischief()
    }
  })
  useEffect(() => {
    const iv = setInterval(() => tickRef.current?.(), 1000)
    return () => clearInterval(iv)
  }, [])

  // the idle hint ("Ayting: …") changes every few seconds
  useEffect(() => {
    if (reduced) return undefined
    const iv = setInterval(() => setHint(h => h + 1), 3600)
    return () => clearInterval(iv)
  }, [reduced])

  // hide the "heard" card after a while
  useEffect(() => {
    if (!heard) return undefined
    const t = setTimeout(() => setHeard(h => (h?.id === heard.id ? null : h)), heard.unknown || heard.sleepy ? 9000 : 2600)
    return () => clearTimeout(t)
  }, [heard])

  useEffect(() => {
    if (!gain) return undefined
    const t = setTimeout(() => setGain(g => (g?.id === gain.id ? null : g)), 2600)
    return () => clearTimeout(t)
  }, [gain])

  useEffect(() => {
    if (!unlock) return undefined
    const t = setTimeout(() => setUnlock(u => (u?.id === unlock.id ? null : u)), 6000)
    return () => clearTimeout(t)
  }, [unlock])

  /* ── a command was heard ── */
  const perform = useCallback((cmd) => {
    const a = cmd.act
    const standUp = a.motion === 'hop' || a.motion === 'sway' || a.motion === 'run' || a.motion === 'turn'
    walkTo('center')
    // hats: only one on the head, and nothing to take off when there is none
    const { hat: hatNow, acc: worn } = live.current
    const hatOn = hatNow === 'on' || (hatNow === 'worn' && HATS.has(worn))
    if ((cmd.key === 'hat_off' && !hatOn) || (cmd.key === 'hat_on' && hatOn)) {
      doAct({ mood: cmd.key === 'hat_off' ? 'confused' : 'proud', pose: cmd.key === 'hat_off' ? 'shrug' : 'up' }, 2000)
      later(() => speak(cmd.key === 'hat_off' ? NO_HAT : HAT_ALREADY), 280)
      return
    }
    if (cmd.key === 'sleep') {
      clearTimeout(sleepTimer.current)
      later(() => { setPosture('sleep'); doAct({ fx: 'puff' }, 900) }, reduced ? 300 : 1400)
      sleepTimer.current = setTimeout(() => {
        if (!alive.current || live.current.posture !== 'sleep' || live.current.micOn) return
        setPosture('stand')
        doAct({ mood: 'yawn', pose: 'up', fx: 'puff' }, 2200)
        speak(BY_KEY.wake.reply)
      }, SLEEP_MS)
    } else if (a.posture) {
      setPosture(a.posture)
      if (cmd.key === 'wake') clearTimeout(sleepTimer.current)
    } else if (standUp) {
      setPosture('stand')
    }
    if (a.fx === 'hatOn') later(() => setHat('on'), reduced ? 0 : 700)
    if (a.fx === 'hatOff') setHat('off')
    const id = doAct({ key: cmd.key, mood: a.mood, pose: a.pose, right: a.right, motion: a.motion, fx: a.fx, stage: a.stage, walking: a.walking }, a.dur || ACT_MS)
    if (a.then) later(() => setAct(x => (x?.id === id ? { ...x, mood: a.then, pose: 'rest', motion: null, fx: null } : x)), 1000)
    later(() => speak(cmd.reply), 280)
  }, [doAct, later, speak, walkTo, reduced])

  const fire = useCallback((hit) => {
    bump()
    const s = live.current
    const cmd = hit.key ? BY_KEY[hit.key] : null
    setHeard({ id: ++seq.current, text: hit.heard, key: hit.key || null })
    const m = s.mischief
    if (m && fixesMischief(m.kind, hit)) {
      const first = hit.key ? reward(hit.key) : false
      endMischief()
      setCalmed(c => c + 1)
      doAct({ mood: 'shy', pose: 'rest', fx: 'hearts' }, 2400)
      if (!first) setGain({ id: ++seq.current, praise: true })
      later(() => speak(SORRY), 300)
      return
    }
    if (hit.key) reward(hit.key)
    if (m) {
      // he is busy being naughty: only the right "don't" command works
      setWiggle(w => w + 1)
      doAct({ mood: 'angry', pose: 'shrug' }, 1500)
      later(() => speak(REFUSE), 250)
      return
    }
    if (!cmd) {
      doAct({ mood: 'wink', pose: 'rest' }, 1800)
      later(() => speak(WONT), 250)
      return
    }
    if (s.posture === 'sleep' && cmd.key !== 'wake') {
      doAct({ mood: 'stir' }, 1800)
      setHeard({ id: ++seq.current, text: hit.heard, sleepy: true, sugg: ['wake'] })
      later(() => speak(SLEEPY), 250)
      return
    }
    perform(cmd)
  }, [bump, doAct, endMischief, later, perform, reward, speak])

  const unknownSpeech = useCallback((text) => {
    bump()
    const s = live.current
    setHeard({ id: ++seq.current, text, unknown: true, sugg: suggestions({ mischief: s.mischief?.kind, asleep: s.posture === 'sleep', said: s.said }) })
    doAct({ mood: 'confused', pose: 'shrug' }, 2600)
  }, [bump, doAct])

  /* ── the mic: one tap, listens until a command is heard ── */
  const run = async () => {
    const id = ++listenId.current
    firedId.current = 0
    heardAt.current = { text: '', at: 0 }
    pending.current = null
    hearing.current = true
    micStart.current = Date.now()
    setMicOn(true)
    setListenKey(id)
    // a command was heard: the mic goes off at once (no server "last bit" upload), then Toby acts
    const fireNow = (hit) => {
      pending.current = null
      firedId.current = id
      hearing.current = false
      stop({ discard: true })
      setMicOn(false)
      fire(hit)
    }
    const tick = setInterval(() => {
      if (id !== listenId.current || firedId.current === id) return
      const p = pending.current
      if (p) {
        if (Date.now() - p.at > POSITIVE_WAIT_MS) fireNow(p.hit)
        return
      }
      const h = heardAt.current
      const s = live.current
      if (h.text && Date.now() - h.at > (QUIET_MS[s.mode] || QUIET_MS.browser) && !s.busy && s.level < 0.12) stop()
    }, 250)
    let guard = 0
    let res = null
    try {
      res = await Promise.race([
        listen({
          maxMs: LISTEN_MS,
          continuous: true,
          onInterim: (alts) => {
            if (id !== listenId.current || firedId.current === id) return true
            heardAt.current = { text: alts[0] || '', at: Date.now() }
            const hit = resolveAlternatives(alts)
            if (!hit) { pending.current = null; return false }
            const m = live.current.mischief
            if (m && hit.key && !hit.neg && !fixesMischief(m.kind, hit)) {
              if (!pending.current || pending.current.hit.key !== hit.key) pending.current = { hit, at: Date.now() }
              return false
            }
            fireNow(hit)
            return true
          },
        }),
        new Promise((r) => { guard = setTimeout(() => { stop(); r({ alternatives: [], error: 'server-failed' }) }, LISTEN_MS + 30000) }),
      ])
    } catch {
      res = { alternatives: [], error: 'server-failed' }
    } finally {
      clearTimeout(guard)
      clearInterval(tick)
    }
    if (!alive.current || id !== listenId.current) return
    hearing.current = false
    setMicOn(false)
    if (firedId.current === id) return                 // Toby already did it (onInterim)
    const alternatives = res?.alternatives || []
    const error = res?.error || ''
    if (FATAL.has(error)) { setFatal(error); return }
    const hit = resolveAlternatives(alternatives)     // server mode: the words arrive only now
    if (hit) { firedId.current = id; fire(hit); return }
    if (pending.current) { const p = pending.current; pending.current = null; firedId.current = id; fire(p.hit); return }
    if (alternatives.length) { unknownSpeech(alternatives[0]); return }
    setNotice(error === 'retry' ? 'retry' : error === 'server-failed' ? 'server' : error === 'network' ? 'network' : 'no-speech')
  }

  const onMic = () => {
    prime()                                          // inside the tap: iOS opens the mic only here
    if (micOn) {
      if (Date.now() - micStart.current < STOP_GRACE_MS) return   // a double tap is not "stop"
      stop()                                         // ends now; what was heard is still judged
      return
    }
    if (!supported) { setFatal('unsupported'); return }
    hush()
    bump()
    setFatal('')
    setNotice('')
    setHeard(null)
    run()
  }

  /* tap a chip → hear the line (the mic would hear it too, so it stops first) */
  const onChip = (key) => {
    const cmd = BY_KEY[key]
    if (!cmd) return
    if (micOn) {
      listenId.current += 1
      hearing.current = false
      stop({ discard: true })
      setMicOn(false)
    }
    hush()
    bump()
    setChipVoice(key)
    sayLine(cmd.say).then(() => { if (alive.current) setChipVoice(k => (k === key ? null : k)) })
  }

  /* a tap on Toby: giggle → surprised → love → wink …, five quick taps → dizzy; asleep → he mumbles */
  const onPoke = () => {
    if (micOn) return
    if (mischief) { setWiggle(w => w + 1); return }   // too busy being naughty: the banner shakes — "say it!"
    bump()
    if (posture === 'sleep') {
      doAct({ mood: 'stir' }, 1600)
      speak(SLEEPY)
      return
    }
    const now = Date.now()
    const p = pokes.current
    p.times = [...p.times.filter(t => now - t < POKE_DIZZY_MS), now]
    let r
    if (p.times.length >= POKE_DIZZY_N) { r = DIZZY; p.times = [] }
    else { r = POKES[p.n % POKES.length]; p.n += 1 }
    doAct({ mood: r.mood, pose: r.pose, motion: r.motion, fx: r.fx }, r === DIZZY ? 2600 : 1900)
    speak(r.line)
  }

  const retryFatal = () => {
    setFatal('')
    onMic()
  }

  /* ── what Toby looks like now ── */
  const m = mischief ? MISCHIEF_BY_KIND[mischief.kind] : null
  const toby = useMemo(() => {
    let mood = 'idle'
    let pose = posture === 'sit' ? 'sit' : posture === 'lie' || posture === 'sleep' ? 'lie' : 'rest'
    if (posture === 'sleep') mood = 'sleep'
    let right = null
    let walk = walking
    if (m) { mood = m.toby.mood; pose = m.toby.pose; walk = walk || !!m.toby.walking }
    else if (micOn && posture !== 'sleep') mood = 'listening'
    if (act) {
      mood = act.mood || mood
      pose = act.pose || pose
      right = act.right || null
      walk = walk || !!act.walking
    }
    const asleep = posture === 'sleep'
    let wear = acc
    if (hat === 'on') wear = 'cap'
    else if (hat === 'off' && HATS.has(acc)) wear = null
    return {
      mood, pose, right, walking: walk,
      outfit: asleep ? 'pyjamas' : 'tshirt',
      cap: asleep,
      acc: asleep ? null : wear,
      talking: talking && !asleep,
      pokes: false,                                  // the room chooses the reaction to a poke (onPoke)
    }
  }, [posture, m, micOn, act, walking, acc, hat, talking])

  const body = useMemo(() => (act?.motion ? { kind: act.motion, id: act.id } : !act && m?.motion ? { kind: m.motion, id: mischief.id } : null), [act, m, mischief])
  const fx = useMemo(() => (act?.fx ? { kind: act.fx, id: `${act.id}-${act.fx}` } : null), [act])
  const tapChip = useStable(onChip)
  const poke = useStable(onPoke)
  const micKey = useStable(onMic)

  // computer: the space bar works like the mic button
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' || e.repeat || paused) return
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || e.target?.isContentEditable) return
      e.preventDefault()
      micKey()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [micKey, paused])

  // the wardrobe opened over the room: the mic must not keep listening behind it
  const pauseMic = useStable(() => {
    if (!micOn) return
    listenId.current += 1
    hearing.current = false
    stop({ discard: true })
    setMicOn(false)
  })
  useEffect(() => { if (paused) pauseMic() }, [paused, pauseMic])
  const asleep = posture === 'sleep'

  /* ── status line ── */
  const fresh = COMMANDS.filter(c => !said[c.key] && !c.neg)
  const pool = fresh.length ? fresh : COMMANDS
  const example = pool[hint % pool.length]
  let status
  if (micOn && (busy || !listening)) status = { text: 'Tekshirilmoqda…', tone: 'text-sky-200' }
  else if (micOn && interim && interim !== '…') status = { text: `“${interim}”`, tone: 'text-white italic', meter: true }
  else if (micOn) status = { text: 'Tinglayapman… buyruq bering!', tone: 'text-rose-200', meter: true }
  else if (notice === 'no-speech') status = { text: 'Hech narsa eshitilmadi — bosing va balandroq ayting', tone: 'text-amber-200' }
  else if (notice === 'retry') status = { text: 'Yana bir bor bosing — endi ishlaydi', tone: 'text-amber-200' }
  else if (notice === 'network') status = { text: 'Internetni tekshiring — ovozni tanish uchun internet kerak', tone: 'text-amber-200' }
  else if (notice === 'server') status = { text: 'Ovozni tekshirib bo‘lmadi — yana urinib ko‘ring', tone: 'text-amber-200' }
  else if (m) status = { text: 'Toby nima qilyapti? Unga ayting:', say: m.fix, tone: 'text-amber-200' }
  else if (asleep) status = { text: 'Toby uxlayapti. Uyg‘otish uchun ayting:', say: 'wake', tone: 'text-indigo-200' }
  else status = { text: 'Mikrofonni bosing va ayting:', say: example.key, tone: 'text-white/75' }

  const micState = fatal ? 'disabled' : micOn ? (listening ? 'listening' : 'busy') : 'idle'
  const micLabel = micState === 'listening' ? 'To‘xtatish' : micState === 'busy' ? 'Kuting…' : 'Bosing va ayting'
  const highlight = m ? m.fix : asleep ? 'wake' : null

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col overflow-x-hidden px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5 lg:px-8 lg:pt-5">
      {/* header */}
      <header className="flex items-center gap-3">
        <button type="button" onClick={onExit} aria-label="Xaritaga qaytish"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/15 lg:h-12 lg:w-12">
          <ChevronLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-300 lg:text-[13px]">Play Room</p>
          <h1 className="truncate text-[20px] font-black leading-tight tracking-tight lg:text-[30px]">Toby bilan o‘yna</h1>
        </div>
        {online === false && (
          <span className="hidden items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white/60 sm:flex" title="Natijalar shu qurilmada saqlanadi">
            <CloudOff size={13} /> Offline
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-2 text-[14px] font-black tabular-nums text-amber-200 lg:text-[16px]" title="O‘yin xonasi yulduzlari">
          <Star size={16} className="fill-amber-300 text-amber-300" /> {stars}/{COMMAND_COUNT}
        </span>
        <WardrobeButton progress={progress} onClick={onWardrobe} compact className="sm:hidden" />
        <WardrobeButton progress={progress} onClick={onWardrobe} className="hidden sm:flex" />
      </header>

      <div className="mt-3 flex flex-1 flex-col lg:mt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col">
          {/* the room */}
          <div className="relative aspect-square max-h-[56dvh] w-full overflow-hidden rounded-[28px] bg-[#FCD6B4] shadow-2xl ring-1 ring-white/10 sm:aspect-[4/3] lg:aspect-auto lg:h-[min(calc(100dvh-260px),760px)] lg:max-h-none lg:min-h-[440px] lg:rounded-[36px]">
            <RoomScene toby={toby} spot={spot} motion={body} fx={fx} mischief={mischief?.kind || null} night={asleep}
              stage={act?.stage || null} bubble={bubble} onPoke={poke} reduced={reduced} />

            {/* counters */}
            <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5 lg:left-5 lg:top-5">
              <span className="rounded-full bg-black/45 px-3 py-1 text-[12px] font-black text-white backdrop-blur lg:text-[15px]">
                Bugun<span className="hidden min-[480px]:inline"> aytilgan buyruqlar</span>: <span className="tabular-nums text-emerald-300">{today.length}</span> / {COMMAND_COUNT}
              </span>
              {calmed > 0 && (
                <span className="rounded-full bg-black/45 px-3 py-1 text-[12px] font-black text-sky-200 backdrop-blur lg:text-[14px]">Tinchlantirdingiz: {calmed}</span>
              )}
            </div>

            {/* mischief banner */}
            <AnimatePresence>
              {m && (
                <Motion.div key={`${mischief.id}-${wiggle}`} initial={{ opacity: 0, y: -16, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1, x: wiggle && !reduced ? [0, -10, 10, -6, 6, 0] : 0 }} exit={{ opacity: 0, y: -12 }}
                  className="absolute inset-x-3 top-12 z-10 mx-auto max-w-[620px] rounded-3xl bg-gradient-to-r from-amber-400 to-orange-500 p-2.5 text-center shadow-2xl lg:top-16 lg:p-4">
                  <p className="text-[14px] font-black leading-tight text-amber-950 lg:text-[20px]">Toby nima qilyapti? {m.what}</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                    <span className="text-[13px] font-bold text-amber-950/80 lg:text-[17px]">Unga ayting:</span>
                    <SayChip k={m.fix} onTap={onChip} big />
                    {m.fix !== 'stop' && <span className="text-[12px] font-bold text-amber-950/70 lg:text-[15px]">yoki “Stop!”</span>}
                  </div>
                </Motion.div>
              )}
            </AnimatePresence>

            {/* +1 star / praise */}
            <AnimatePresence>
              {gain && (
                <Motion.div key={gain.id} initial={{ opacity: 0, y: -10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 px-3 py-1.5 text-[13px] font-black text-amber-950 shadow-xl lg:right-5 lg:top-5 lg:text-[17px]">
                  {gain.star ? <><Star size={16} className="fill-amber-700 text-amber-700" /> +1 ★ Yangi buyruq!</> : 'Barakalla! Toby sizni tingladi'}
                </Motion.div>
              )}
            </AnimatePresence>
            {/* a new accessory was unlocked by this star */}
            <AnimatePresence>
              {unlock && (
                <Motion.div key={unlock.id} initial={{ opacity: 0, scale: 0.6, y: 20, x: '-50%' }} animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, scale: 0.8, x: '-50%' }} transition={{ type: 'spring', stiffness: 320, damping: 20, delay: reduced ? 0 : 0.5 }}
                  className="absolute left-1/2 top-[22%] z-30 flex w-[min(92%,420px)] items-center gap-3 rounded-[26px] bg-gradient-to-br from-violet-600 to-fuchsia-600 p-3 shadow-2xl ring-4 ring-white/60 lg:p-4">
                  <Motion.span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white lg:h-20 lg:w-20"
                    animate={reduced ? undefined : { rotate: [0, -10, 10, -6, 0], scale: [1, 1.12, 1] }} transition={{ duration: 1.2, delay: 0.7 }}>
                    <AccIcon acc={unlock.acc} size={52} />
                  </Motion.span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-black uppercase tracking-[0.14em] text-amber-200 lg:text-[13px]">Yangi kiyim ochildi!</p>
                    <p className="truncate text-[18px] font-black leading-tight text-white lg:text-[22px]">{accName(unlock.acc)}</p>
                    <button type="button" onClick={() => { setUnlock(null); onWardrobe?.() }}
                      className="mt-1.5 rounded-full bg-white px-3 py-1 text-[13px] font-black text-fuchsia-700 shadow lg:text-[15px]">
                      Kiyib ko‘rish
                    </button>
                  </div>
                  <button type="button" onClick={() => setUnlock(null)} aria-label="Yopish"
                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg">
                    <X size={15} />
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>

            {gain?.star && !reduced && (
              <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden>
                {CONFETTI.map(([x, c], i) => (
                  <Motion.span key={`${gain.id}-${i}`} className="absolute top-0 h-3 w-2 rounded-sm" style={{ left: `${x}%`, background: c }}
                    initial={{ y: -20, opacity: 1, rotate: 0 }} animate={{ y: [-20, 260 + (i % 4) * 60], opacity: [1, 1, 0], rotate: [0, 200 + i * 40] }}
                    transition={{ duration: 1.6, delay: (i % 6) * 0.06, ease: 'easeOut' }} />
                ))}
              </div>
            )}

            {/* what was heard */}
            <AnimatePresence>
              {heard && (
                <Motion.div key={heard.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className={`absolute bottom-3 left-3 z-20 max-w-[calc(100%-24px)] rounded-3xl shadow-2xl lg:bottom-5 lg:left-5 lg:max-w-[560px]
                    ${heard.unknown || heard.sleepy ? 'bg-white p-3 text-slate-800 lg:p-4' : 'bg-emerald-500 px-3 py-2 text-white'}`}>
                  {heard.unknown || heard.sleepy ? (
                    <>
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 text-[13px] font-semibold text-slate-500 lg:text-[16px]">
                          {heard.sleepy ? 'Toby uxlayapti' : 'Eshitildi'}: <span className="font-black italic text-slate-800">“{heard.text}”</span>
                        </p>
                        <button type="button" onClick={() => setHeard(null)} aria-label="Yopish" className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                          <X size={15} />
                        </button>
                      </div>
                      <p className="mt-1 text-[13px] font-black text-violet-600 lg:text-[16px]">{heard.sleepy ? 'Avval uni uyg‘oting:' : 'Toby tushunmadi. Shunday deb ko‘ring:'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(heard.sugg || []).map(k => <SayChip key={k} k={k} onTap={onChip} />)}
                      </div>
                    </>
                  ) : (
                    <p className="text-[14px] font-black lg:text-[18px]">✓ “{heard.key ? BY_KEY[heard.key].say : heard.text}”</p>
                  )}
                </Motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* status + mic */}
          {fatal ? (
            <div className="mt-3 space-y-3">
              <VoiceNotice error={fatal} />
              {fatal !== 'unsupported' && (
                <div className="flex justify-center">
                  <button type="button" onClick={retryFatal} className="rounded-full bg-gradient-to-r from-sky-400 to-indigo-600 px-5 py-2.5 text-sm font-bold">Qayta urinish</button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-1 items-center gap-1 lg:mt-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
              <div className="flex min-h-[48px] flex-col items-center justify-center text-center lg:min-h-[108px] lg:items-start lg:text-left" aria-live="polite">
                <p className={`line-clamp-2 text-[15px] font-bold leading-snug lg:text-[22px] ${status.tone}`}>
                  {status.text}{status.meter && <Meter level={level} />}
                </p>
                {status.say && <div className="mt-1.5"><SayChip k={status.say} onTap={onChip} /></div>}
                {micOn && (
                  <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-white/10 lg:w-64">
                    <Motion.div key={listenKey} className="h-full rounded-full bg-rose-400" initial={{ width: '100%' }} animate={{ width: '0%' }}
                      transition={{ duration: LISTEN_MS / 1000, ease: 'linear' }} />
                  </div>
                )}
              </div>
              <div className="flex justify-center py-1">
                <div className="lg:hidden"><MicButton state={micState} onPress={onMic} size={84} label={micLabel} level={level} /></div>
                <div className="hidden lg:block"><MicButton state={micState} onPress={onMic} size={108} label={micLabel} level={level} /></div>
              </div>
              <div className="hidden lg:block">
                <div className="ml-auto max-w-[300px] rounded-3xl bg-white/[0.05] p-4 text-[15px] font-semibold leading-snug text-white/65">
                  <p><b className="text-white">Bir marta bosing</b> (yoki <b className="text-white">Probel</b>) — Toby o‘zi tinglaydi. Buyruqni eshitishi bilan bajaradi!</p>
                  <p className="mt-1.5">Uzoq jim tursangiz, Toby sho‘xlik qiladi — <b className="text-rose-300">“Don’t …!”</b> deb to‘xtating.</p>
                </div>
              </div>
            </div>
          )}

          {/* phone: chips under the mic */}
          <div className="lg:hidden">
            <RoomChipRow said={said} today={today} speaking={chipVoice} highlight={highlight} onTap={tapChip} />
          </div>
        </div>

        {/* desktop: side panel */}
        <aside className="hidden lg:block lg:h-[min(calc(100dvh-120px),900px)] lg:min-h-[560px]">
          <RoomPanel said={said} today={today} speaking={chipVoice} highlight={highlight} onTap={tapChip} />
        </aside>
      </div>
    </div>
  )
}
