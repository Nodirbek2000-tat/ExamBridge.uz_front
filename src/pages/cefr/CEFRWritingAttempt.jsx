/*
 * CEFR multilevel Writing exam: Task 1.1 + 1.2 (one situation) and Part 2.
 * Task on the left, the answer on the right, the tasks in the bottom bar.
 * Text and time are kept on this device, so a refresh continues the test;
 * spell-check is off like in the real exam.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Clock, Loader2, PenLine, Play, Send } from 'lucide-react'
import api from '../../api/client'
import { clearExam, examKey, loadExam, saveExam } from '../../utils/examPersist'

const HOME = '/app/cefr/skills?tab=writing'
// upper limits are only a reminder — the examiner judges length together with the content
const MAX_WORDS = { '1.1': 80, '1.2': 150, '2': 200 }
const REGISTER = {
  '1.1': 'Informal — you are writing to a friend',
  '1.2': 'Formal — you are writing to someone you do not know',
  '2': 'Formal — give a clear opinion with reasons and examples',
}

const countWords = (t) => (String(t || '').trim() ? String(t).trim().split(/\s+/).length : 0)
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function lengthState(key, words, min) {
  if (!words) return { tone: 'text-gray-400', bar: 'bg-gray-200', note: 'Not started' }
  if (words < min * 0.8) return { tone: 'text-amber-600', bar: 'bg-amber-400', note: `${min - words} more words needed` }
  if (words > (MAX_WORDS[key] || 999) * 1.15) return { tone: 'text-amber-600', bar: 'bg-amber-400', note: 'Longer than asked' }
  return { tone: 'text-emerald-600', bar: 'bg-emerald-500', note: 'Good length' }
}

function Intro({ data, onStart }) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto bg-gradient-to-b from-sky-50 to-white p-4">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-500/10 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md"><PenLine size={22} /></span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600">CEFR Writing</p>
            <h1 className="truncate text-xl font-black text-gray-900">{data.test.title}</h1>
          </div>
        </div>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
          {data.tasks.map(t => (
            <li key={t.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-[16px] font-bold text-gray-900">{t.label} <span className="font-semibold text-gray-500">· {t.genre}</span></p>
                <p className="text-sm text-gray-500">{t.target}</p>
              </div>
              <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-bold text-sky-700">{t.points} pts</span>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 text-[15px] text-gray-600">
          <p className="flex items-center gap-2"><Clock size={17} className="text-sky-600" /> {data.test.time_limit} minutes for the whole test — the timer starts when you press Start.</p>
          <p className="flex items-center gap-2"><Check size={17} className="text-sky-600" /> Your text is saved on this device; a refresh will not lose it.</p>
          <p className="flex items-center gap-2"><Check size={17} className="text-sky-600" /> Spell-check is off, as in the real exam. A strict AI examiner scores you out of 75.</p>
        </div>
        <button type="button" onClick={onStart}
          className="btn-glass flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-700">
          <Play size={18} /> Start
        </button>
      </motion.div>
    </div>
  )
}

export default function CEFRWritingAttempt() {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const pKey = examKey('cefr_writing', responseId)
  const [saved] = useState(() => loadExam(pKey) || {})

  const [answers, setAnswers] = useState(saved.answers || {})
  const [active, setActive] = useState(saved.active || 0)
  const [started, setStarted] = useState(!!saved.started)
  const [elapsed, setElapsed] = useState(saved.elapsed || 0)
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const textRef = useRef(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['cefr-writing-attempt', responseId],
    queryFn: () => api.get(`/cefr/writing/responses/${responseId}/`).then(r => r.data),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  // already submitted (e.g. opened from history) → the result page
  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS') navigate(`/exam/cefr/writing/result/${responseId}`, { replace: true })
  }, [data, responseId, navigate])

  const limit = (data?.test?.time_limit || 60) * 60
  const remaining = Math.max(0, limit - elapsed)

  useEffect(() => {
    if (!started || submitting || !data) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [started, submitting, data])

  useEffect(() => {
    if (started) saveExam(pKey, { answers, active, started, elapsed })
  }, [answers, active, started, elapsed, pKey])

  const tasks = useMemo(() => data?.tasks || [], [data])
  const task = tasks[Math.min(active, Math.max(tasks.length - 1, 0))]
  const words = useMemo(() => Object.fromEntries(tasks.map(t => [t.key, countWords(answers[t.key])])), [tasks, answers])

  const submit = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = Object.fromEntries(tasks.map(t => [t.key, answers[t.key] || '']))
      await api.post(`/cefr/writing/responses/${responseId}/submit/`, { answers: payload })
      clearExam(pKey)
      navigate(`/exam/cefr/writing/result/${responseId}`, { replace: true })
    } catch (e) {
      setSubmitError(e.response?.data?.detail || 'Could not submit. Check your connection and try again — your text is saved.')
      setSubmitting(false)
      setConfirm(true)          // an automatic hand-in that failed must stay visible
    }
  }

  // time is up → hand in what is written
  const submitRef = useRef(submit)
  useEffect(() => { submitRef.current = submit })
  useEffect(() => {
    if (started && data && remaining === 0) submitRef.current()
  }, [started, data, remaining])

  // focus the answer when switching tasks
  useEffect(() => { textRef.current?.focus({ preventScroll: true }) }, [active])

  if (isLoading) return <div className="flex flex-1 items-center justify-center"><Loader2 size={26} className="animate-spin text-sky-500" /></div>
  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle size={36} className="text-gray-300" />
        <p className="text-lg font-semibold text-gray-600">This test could not be opened.</p>
        <button type="button" onClick={() => navigate(HOME)} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white">Back to Writing</button>
      </div>
    )
  }
  if (!started) return <Intro data={data} onStart={() => setStarted(true)} />

  const urgent = remaining <= 300
  const st = lengthState(task.key, words[task.key], task.min_words)
  const showSituation = data.test.situation && (task.key === '1.1' || task.key === '1.2')

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      {/* header */}
      <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
        <button type="button" onClick={() => navigate(HOME)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-50">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Exit</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600">CEFR Writing</p>
          <p className="truncate text-[15px] font-bold text-gray-900">{data.test.title}</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-base font-extrabold tabular-nums ${urgent ? 'animate-pulse bg-red-50 text-red-600' : 'bg-sky-50 text-sky-700'}`}>
          <Clock size={16} /> {fmt(remaining)}
        </span>
      </header>

      {/* task + answer */}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,40%)_minmax(0,1fr)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:grid-rows-1">
        <section className="min-h-0 overflow-y-auto border-b border-slate-200 bg-white px-5 py-5 md:border-b-0 md:border-r sm:px-7 sm:py-7">
          <AnimatePresence mode="wait">
            <motion.div key={task.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
              className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-sky-600 px-2.5 py-1 text-sm font-black text-white">{task.label}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-gray-700">{task.genre}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold text-gray-600">{task.target}</span>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-bold text-sky-700">{task.points} pts</span>
              </div>
              {showSituation && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-700">Situation</p>
                  <p className="whitespace-pre-line text-[16px] leading-relaxed text-gray-800">{data.test.situation}</p>
                </div>
              )}
              <p className="whitespace-pre-line text-[17px] font-semibold leading-relaxed text-gray-900">{task.prompt}</p>
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-[15px] text-gray-600"><b className="text-gray-800">Style: </b>{REGISTER[task.key]}</p>
            </motion.div>
          </AnimatePresence>
        </section>

        <section className="flex min-h-0 flex-col gap-3 p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-500">Your answer</p>
            <p className={`text-sm font-bold ${st.tone}`}>
              <span className="tabular-nums">{words[task.key]}</span> words · {st.note}
            </p>
          </div>
          <textarea
            ref={textRef}
            key={task.key}
            value={answers[task.key] || ''}
            onChange={(e) => setAnswers(a => ({ ...a, [task.key]: e.target.value }))}
            spellCheck={false} autoCorrect="off" autoCapitalize="sentences" autoComplete="off"
            placeholder={task.key === '2' ? 'Write your essay here…' : 'Write your letter here…'}
            className="min-h-[180px] w-full flex-1 resize-none rounded-2xl border border-slate-200 bg-white p-5 text-[17px] leading-8 text-gray-900 shadow-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />
        </section>
      </div>

      {/* tasks */}
      <nav className="flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <div className="mx-auto flex w-max items-center gap-3 px-4 py-3">
            {tasks.map((t, i) => {
              const s = lengthState(t.key, words[t.key], t.min_words)
              const on = i === active
              return (
                <button key={t.key} type="button" onClick={() => setActive(i)} aria-current={on ? 'step' : undefined}
                  className={`min-w-[9.5rem] rounded-2xl px-5 py-2 text-left transition ${on ? 'border-2 border-sky-400 bg-sky-50' : 'border border-slate-200 bg-white hover:border-sky-300'}`}>
                  <span className={`block text-[16px] font-bold ${on ? 'text-sky-700' : 'text-gray-800'}`}>{t.label}</span>
                  <span className={`block text-sm font-semibold ${s.tone}`}>{words[t.key]} / {t.target.replace(' words', '')}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${s.bar}`} style={{ width: `${Math.min(100, (words[t.key] / t.min_words) * 100)}%` }} />
                  </span>
                </button>
              )
            })}
            <button type="button" onClick={() => setConfirm(true)}
              className="btn-glass ml-2 inline-flex h-12 items-center gap-2 rounded-2xl bg-sky-600 px-6 text-[15px] font-bold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-700">
              <Send size={17} /> Finish test
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="w-full max-w-md space-y-5 rounded-3xl bg-white p-6 shadow-2xl">
              <div>
                <h2 className="text-xl font-black text-gray-900">Submit your writing?</h2>
                <p className="mt-1 text-[15px] text-gray-500">You cannot change it after this. The AI examiner usually needs 15–30 seconds.</p>
              </div>
              <ul className="space-y-2">
                {tasks.map(t => {
                  const s = lengthState(t.key, words[t.key], t.min_words)
                  return (
                    <li key={t.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5 text-[15px]">
                      <span className="font-bold text-gray-800">{t.label}</span>
                      <span className={`font-semibold ${s.tone}`}>{words[t.key]} words · {s.note}</span>
                    </li>
                  )
                })}
              </ul>
              {submitError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{submitError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setConfirm(false)} disabled={submitting}
                  className="flex-1 rounded-2xl border-2 border-slate-200 py-3 font-bold text-gray-700 hover:bg-slate-50">Keep writing</button>
                <button type="button" onClick={submit} disabled={submitting}
                  className="btn-glass flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3 font-bold text-white hover:bg-sky-700 disabled:opacity-70">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={17} />} Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
