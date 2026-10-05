/*
 * One round: 15 questions × 7 s against the opponent (a recorded real player, a bot, or a duel rival).
 *
 *   intro (opponent card, 3-2-1) → next question → answer → feedback (bears react) → … → finish
 *
 * The server serves one question at a time and judges every answer; the key arrives only in the
 * reply to the learner's own answer. The visible clock starts when the question arrives; the
 * server allows 1.5 s more for the network. A listen question first plays the word (teacher voice).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { errorCode, errorText, finishRound, nextQuestion, sendAnswer } from './api'
import { Arena, TimerRing } from './Arena'
import { Bear } from './Bears'
import { Options, QuestionCard } from './Question'
import { buzz, sfx } from './sfx'
import { LEVEL_META, fmtSec } from './theme'
import { GhostButton, PrimaryButton, SoundToggle } from './ui'

const INTRO_STEP = 650
const FEEDBACK_OK = 1250
const FEEDBACK_BAD = 2300
const say = (text) => sayLine(text, { voice: 'teacher' })

function Progress({ n, marks, current }) {
  return (
    <div className="flex flex-1 items-center gap-[3px]" aria-label={`Savol ${Math.min(n, current + 1)} / ${n}`}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
          marks[i] === true ? 'bg-emerald-400' : marks[i] === false ? 'bg-rose-400' : i === current ? 'bg-white/60' : 'bg-white/[0.1]'}`} />
      ))}
    </div>
  )
}

function FeedbackLine({ q, fb }) {
  if (!fb || !q) return <div className="h-[52px]" aria-hidden="true" />
  const opp = q.opp
  return (
    <Motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5" aria-live="polite">
      <span className={`text-[15px] font-black ${fb.correct ? 'text-emerald-300' : 'text-rose-300'}`}>
        {fb.timeout ? 'Vaqt tugadi' : fb.correct ? `+${fb.points}` : 'Noto‘g‘ri'}
      </span>
      {fb.correct && fb.bonus > 0 && <span className="text-[13px] text-white/50">tezlik +{fb.bonus}</span>}
      {fb.correct && fb.mult > 1 && <span className="rounded-md bg-[#F5B14C]/15 px-1.5 py-0.5 text-[12px] font-bold text-[#FFD08A]">seriya ×1.5</span>}
      {/* a phone gives the word and its meaning a line of their own (no "…" on the thing to learn) */}
      <span className="order-last basis-full text-[14px] leading-snug text-white/70 sm:order-none sm:min-w-0 sm:flex-1 sm:basis-0 sm:truncate">
        <b className="font-semibold text-white" lang="en">{fb.word}</b> — {fb.uz}
      </span>
      {opp && (
        <span className={`ml-auto text-[13px] font-semibold sm:ml-0 ${opp.ok ? 'text-[#FFC48A]' : 'text-white/40'}`}>
          Raqib: {opp.ok ? `✓ ${fmtSec(opp.ms)}` : opp.ms == null ? 'vaqt tugadi' : '✗'}
        </span>
      )}
    </Motion.div>
  )
}

function Intro({ round, count }) {
  const o = round.opponent
  const wait = o.kind === 'wait'
  return (
    <Motion.div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0B0B10]/80 px-4 backdrop-blur-md"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#111118] p-6 text-center shadow-2xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/40">{round.level} · {LEVEL_META[round.level]?.title} · {round.n} savol</p>
        <div className="mx-auto mt-3 w-28"><Bear kind="brown" pose={wait ? 'idle' : 'ready'} flip dim={wait} /></div>
        <p className="mt-2 text-[20px] font-bold">{o.name}</p>
        <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] text-white/50">
          <span className="flex-shrink-0 whitespace-nowrap rounded-md border border-[#FF9F43]/30 bg-[#FF9F43]/10 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#FFC48A]">{o.label}</span>
          <span>{o.kind === 'ghost' ? 'haqiqiy o‘yinchi, xuddi shu savollar' : o.kind === 'bot' ? 'kompyuter raqib' : o.kind === 'duel' ? 'do‘stingizning o‘yini' : 'hali o‘ynamagan'}</span>
        </p>
        {o.note && <p className="mt-2 text-[13px] leading-relaxed text-white/45">{o.note}</p>}
        <div className="mt-5 h-16">
          <AnimatePresence mode="wait">
            <Motion.span key={count} className="block text-[56px] font-black leading-none text-[#5CC2FF]"
              initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.25 }}>
              {count > 0 ? count : 'Boshla!'}
            </Motion.span>
          </AnimatePresence>
        </div>
      </div>
    </Motion.div>
  )
}

export default function PlayScreen({ round, onFinished, onExit }) {
  const reduced = useReducedMotion()
  const opp = round.opponent
  const [phase, setPhase] = useState('intro')          // intro · loading · question · feedback · finishing · error
  const [count, setCount] = useState(round.cursor > 0 ? 0 : 3)
  const [q, setQ] = useState(null)
  const [fb, setFb] = useState(null)
  const [picked, setPicked] = useState(null)
  const [timer, setTimer] = useState(null)
  const [listening, setListening] = useState(false)
  const [score, setScore] = useState({ me: round.score || 0, opp: round.opp_score || 0 })
  const [gain, setGain] = useState(null)
  const [streak, setStreak] = useState(round.streak || 0)
  const [marks, setMarks] = useState(() => round.marks || [])
  const [poses, setPoses] = useState({ me: 'idle', opp: 'idle' })
  const [oppAnswered, setOppAnswered] = useState(false)
  const [shot, setShot] = useState(null)
  const [error, setError] = useState('')
  const [quit, setQuit] = useState(false)
  const later = useRef(new Set())
  const busy = useRef(false)
  const alive = useRef(true)
  const done = useRef(onFinished)
  useEffect(() => { done.current = onFinished })

  const wait = useCallback((fn, ms) => {
    const t = setTimeout(() => { later.current.delete(t); if (alive.current) fn() }, ms)
    later.current.add(t)
  }, [])
  const clearLater = useCallback(() => {
    later.current.forEach(clearTimeout)
    later.current.clear()
  }, [])

  useEffect(() => {
    alive.current = true
    return () => { alive.current = false; clearLater(); stopVoice() }
  }, [clearLater])

  const fail = useCallback((e) => {
    if (!alive.current) return
    setError(errorText(e))
    setPhase('error')
  }, [])

  const finish = useCallback(async () => {
    clearLater()
    stopVoice()
    setQuit(false)
    setPhase('finishing')
    try {
      const res = await finishRound(round.id)
      if (alive.current) done.current(res)
    } catch (e) { fail(e) }
  }, [round.id, clearLater, fail])

  const loadNext = useCallback(async () => {
    setPhase('loading')
    let nq
    try {
      nq = await nextQuestion(round.id)
    } catch (e) {
      if (['done', 'finished', 'expired'].includes(errorCode(e))) return finish()
      return fail(e)
    }
    if (!alive.current) return
    busy.current = false
    const now = performance.now()
    setQ(nq)
    setFb(null)
    setPicked(null)
    setGain(null)
    setShot(null)
    setOppAnswered(false)
    setPoses({ me: 'idle', opp: 'idle' })
    setTimer({ endAt: now + nq.left_ms, total: nq.question_ms })
    setPhase('question')
    if (nq.t === 'listen') {
      if (!nq.resumed) {
        setListening(true)
        wait(() => setListening(false), nq.extra_ms)
      }
      say(nq.prompt)
    }
    if (nq.opp && nq.opp.ms != null) {
      const elapsed = nq.question_ms + nq.extra_ms - nq.left_ms
      wait(() => { setOppAnswered(true); setPoses(p => ({ ...p, opp: 'ready' })) }, Math.max(0, nq.opp.ms - elapsed))
    }
  }, [round.id, finish, fail, wait])

  const reveal = useCallback((cur, res) => {
    clearLater()
    stopVoice()
    setListening(false)
    setFb(res)
    setPhase('feedback')
    setMarks(m => { const next = [...m]; next[res.idx] = res.correct; return next })
    const oppPts = cur.opp?.pts || 0
    setScore(s => ({ me: res.score, opp: s.opp + oppPts }))
    setGain({ id: res.idx, me: res.points, opp: oppPts })
    setStreak(res.streak)
    setOppAnswered(false)

    const meOk = res.correct
    const oppOk = cur.opp ? cur.opp.ok : null
    let attacker = null
    if (meOk && oppOk) attacker = (res.ms ?? Infinity) <= (cur.opp.ms ?? Infinity) ? 'me' : 'opp'
    else if (meOk) attacker = 'me'
    else if (oppOk) attacker = 'opp'
    if (attacker) {
      const defender = attacker === 'me' ? 'opp' : 'me'
      const defended = attacker === 'me' ? oppOk : meOk
      const target = defender === 'me' || Boolean(cur.opp)          // a duel rival who has not played is not there
      setPoses({ [attacker]: 'hit', [defender]: 'idle' })
      setShot(target ? { from: attacker, id: `s${res.idx}` } : null)
      wait(() => {
        if (target) sfx('hit')
        setPoses(p => ({ ...p, [defender]: target ? (defended ? 'block' : 'hurt') : 'idle' }))
      }, reduced ? 0 : 300)
    } else {
      setPoses({ me: 'think', opp: cur.opp ? 'think' : 'idle' })
    }
    if (meOk) sfx(res.mult > 1 ? 'combo' : 'right')
    else { sfx('wrong'); buzz(40) }
    wait(() => setPoses({ me: 'idle', opp: 'idle' }), 1050)
    wait(() => (res.last ? finish() : loadNext()), meOk ? FEEDBACK_OK : FEEDBACK_BAD)
  }, [clearLater, wait, finish, loadNext, reduced])

  const pick = useCallback(async (choice) => {
    if (busy.current || phase !== 'question' || !q) return
    busy.current = true
    setPicked(choice)
    if (choice != null) sfx('tap')
    let res
    try {
      res = await sendAnswer(round.id, q.idx, choice)
    } catch (e) {
      busy.current = false
      return fail(e)
    }
    if (alive.current) reveal(q, res)
  }, [phase, q, round.id, reveal, fail])

  // the intro: the opponent's card and 3-2-1 (a resumed round goes straight on). Runs once per round.
  const first = useRef(loadNext)
  useEffect(() => { first.current = loadNext })
  const [resumed] = useState(() => round.cursor > 0)
  useEffect(() => {
    if (resumed) {
      const t = setTimeout(() => first.current(), 250)
      return () => clearTimeout(t)
    }
    const ts = [
      setTimeout(() => setCount(2), INTRO_STEP),
      setTimeout(() => setCount(1), INTRO_STEP * 2),
      setTimeout(() => setCount(0), INTRO_STEP * 3),
      setTimeout(() => first.current(), INTRO_STEP * 3 + 450),
    ]
    return () => ts.forEach(clearTimeout)
  }, [round.id, resumed])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.closest?.('input, textarea, [role="dialog"]')) return
      const k = e.key.toLowerCase()
      if (quit) {                                   // the stop sheet is open: only Escape (close it)
        if (k === 'escape') setQuit(false)
        return
      }
      const i = '1234'.includes(k) && k.length === 1 ? Number(k) - 1 : 'abcd'.includes(k) && k.length === 1 ? 'abcd'.indexOf(k) : -1
      if (i >= 0 && phase === 'question') { e.preventDefault(); pick(i) }
      else if ((k === 'r' || k === ' ') && q?.t === 'listen' && phase === 'question') { e.preventDefault(); say(q.prompt) }
      else if (k === 'escape') setQuit(v => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, pick, q, quit])

  const onTick = useCallback((sec) => { if (sec > 0 && sec <= 3) sfx('tick') }, [])
  const onEnd = useCallback(() => pick(null), [pick])
  const current = q ? q.idx : (round.cursor || 0)

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[908px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:px-6">
      <header className="flex items-center gap-3 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <button type="button" onClick={() => setQuit(true)} aria-label="Raundni to‘xtatish"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/70 transition hover:text-white">
          <X size={18} />
        </button>
        <Progress n={round.n} marks={marks} current={current} />
        <span className="w-12 text-right text-[13px] font-bold tabular-nums text-white/60">{Math.min(round.n, current + 1)}/{round.n}</span>
        <SoundToggle />
      </header>

      <Arena
        reduced={reduced}
        shot={shot}
        me={{ name: 'Siz', score: score.me, gain: gain && { id: gain.id, n: gain.me }, pose: poses.me, streak }}
        opp={{
          name: opp.name, badge: opp.label, score: score.opp, gain: gain && { id: gain.id, n: gain.opp },
          pose: poses.opp, dim: opp.kind === 'wait', answered: oppAnswered && phase === 'question',
        }}
        center={(
          <TimerRing className="h-[76px] w-[76px] sm:h-[104px] sm:w-[104px]" timer={timer} running={phase === 'question'}
            listening={listening} onTick={onTick} onEnd={onEnd} />
        )}
      />

      <main className="mt-3 flex flex-1 flex-col gap-3 sm:mt-6 sm:gap-4">
        {q ? (
          <>
            <QuestionCard q={q} fb={fb} listening={listening} onReplay={() => say(q.prompt)} />
            <Options q={q} picked={picked} fb={fb} locked={phase !== 'question'} onPick={pick} />
            <FeedbackLine q={q} fb={fb} />
          </>
        ) : phase !== 'error' && (
          <div className="space-y-3" aria-hidden="true">
            <div className="h-[120px] animate-pulse rounded-3xl bg-white/[0.04]" />
            <div className="grid gap-2.5 sm:grid-cols-2">{[0, 1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
          </div>
        )}
        {phase === 'finishing' && (
          <p className="flex items-center justify-center gap-2 text-[14px] text-white/55"><Loader2 size={16} className="animate-spin" /> Natija hisoblanmoqda…</p>
        )}
        {phase === 'error' && (
          <div className="mx-auto mt-6 max-w-sm text-center">
            <p className="text-lg font-bold">Aloqa uzildi</p>
            <p className="mt-1 text-[15px] text-white/55">{error}</p>
            <PrimaryButton className="mt-4" onClick={() => { setError(''); loadNext() }}>Davom ettirish</PrimaryButton>
            <GhostButton className="mt-2" onClick={onExit}>Chiqish</GhostButton>
          </div>
        )}
      </main>

      <AnimatePresence>{phase === 'intro' && <Intro round={round} count={count} />}</AnimatePresence>

      <AnimatePresence>
        {quit && (
          <Motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuit(false)}>
            <Motion.div role="dialog" aria-modal="true" aria-labelledby="wb-quit" onClick={e => e.stopPropagation()}
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-t-3xl border border-white/[0.08] bg-[#17171F] px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-6 text-center sm:rounded-3xl">
              <h3 id="wb-quit" className="text-xl font-bold">Raundni to‘xtatasizmi?</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-white/60">
                {round.mode === 'duel'
                  ? 'Duel shu holicha yakunlanadi: javob berilmagan savollar xato hisoblanadi.'
                  : 'Javob berilmagan savollar hisoblanmaydi, natija reytingga kirmaydi.'}
              </p>
              <PrimaryButton className="mt-5" onClick={() => setQuit(false)}>Davom etish</PrimaryButton>
              <button type="button" onClick={finish} className="mt-2 h-11 w-full text-[15px] font-semibold text-rose-300/90 hover:text-rose-200">To‘xtatish</button>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
