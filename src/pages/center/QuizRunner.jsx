/**
 * QuizRunner — taking an A/B/C/D test. Route: /exam/quiz/:attemptId
 *
 * One question at a time with big option cards, a map of all questions, and
 * a timer on the server's clock. Every click is saved, so a refresh loses
 * nothing; when time runs out the answers given so far are handed in. In an
 * olympiad or a lesson flow it returns there when finished
 * (utils/fullMockFlow); otherwise it shows the score and, if the teacher
 * allows it, the right answers.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, Loader2, X, XCircle } from 'lucide-react'
import api from '../../api/client'
import { fullMockReturn } from '../../utils/fullMockFlow'
import { pad, splitDuration, syncServerClock, useNow } from '../olympiad/clock'

const LETTERS = ['A', 'B', 'C', 'D']

function Result({ data, onExit }) {
  const r = data.result
  const tone = r.percent >= 80 ? 'text-emerald-500' : r.percent >= 50 ? 'text-sky-500' : 'text-amber-500'
  const circ = 2 * Math.PI * 54
  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
        <svg width="140" height="140" viewBox="0 0 140 140" className="mx-auto">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <motion.circle cx="70" cy="70" r="54" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round"
            className={tone} strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ * (1 - r.percent / 100) }} transition={{ duration: 0.9 }} transform="rotate(-90 70 70)" />
          <text x="70" y="78" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0f172a">{r.percent}%</text>
        </svg>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">{data.quiz.title}</h1>
        <p className="mt-1 text-slate-500">{r.correct} of {r.total} correct · {Math.floor(r.seconds / 60)}:{pad(r.seconds % 60)}</p>
      </motion.div>

      {data.questions.some((q) => q.correct != null) && (
        <div className="mt-10 space-y-3">
          {data.questions.map((q, n) => {
            const right = q.chosen === q.correct
            return (
              <div key={q.id} className={`p-5 rounded-2xl border bg-white ${right ? 'border-emerald-200' : 'border-rose-200'}`}>
                <div className="flex items-start gap-3">
                  {right ? <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" /> : <XCircle size={20} className="text-rose-500 flex-shrink-0" />}
                  <p className="flex-1 font-medium text-slate-900 whitespace-pre-line">{n + 1}. {q.text}</p>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-1.5 pl-8">
                  {q.options.map((o, i) => (
                    <p key={i} className={`text-sm px-3 py-2 rounded-xl flex items-center gap-2 ${
                      i === q.correct ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : i === q.chosen ? 'bg-rose-50 text-rose-700 line-through' : 'text-slate-500'}`}>
                      <b className="w-4">{LETTERS[i]}</b>{o}
                    </p>
                  ))}
                </div>
                {q.chosen == null && <p className="mt-2 pl-8 text-xs font-semibold text-amber-600">Not answered</p>}
                {q.explanation && <p className="mt-2 pl-8 text-sm text-slate-500">💡 {q.explanation}</p>}
              </div>
            )
          })}
        </div>
      )}
      <div className="mt-10 text-center">
        <button onClick={onExit} className="px-8 py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-700">Done</button>
      </div>
    </div>
  )
}

export default function QuizRunner() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const now = useNow(500)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const submitted = useRef(false)

  const key = ['quiz-attempt', attemptId]
  const { data, isError } = useQuery({
    queryKey: key,
    queryFn: () => api.get(`/centers/quiz-attempts/${attemptId}/`).then((r) => { syncServerClock(r.data.server_now); return r.data }),
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (data && !data.finished) {
      setAnswers(Object.fromEntries(data.questions.filter((q) => q.chosen != null).map((q) => [q.id, q.chosen])))
    }
  }, [data?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const back = fullMockReturn('center_quiz', Number(attemptId))
  const exit = () => navigate(back || '/app/tests')

  const submit = async () => {
    if (submitted.current) return
    submitted.current = true
    setSubmitting(true)
    try {
      const { data: done } = await api.post(`/centers/quiz-attempts/${attemptId}/submit/`)
      qc.invalidateQueries({ queryKey: ['my-quizzes'] })
      qc.invalidateQueries({ queryKey: ['my-assignments'] })
      if (back) return navigate(back, { replace: true })
      qc.setQueryData(key, done)
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    } catch {
      submitted.current = false
    } finally {
      setSubmitting(false)
      setConfirm(false)
    }
  }

  const deadline = data ? new Date(data.deadline).getTime() : 0
  const left = deadline - now
  useEffect(() => {
    if (data && !data.finished && left <= 0) submit()
  }, [left <= 0, data?.finished]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isError) return <div className="flex-1 flex items-center justify-center text-slate-500">This test is not available.</div>
  if (!data) return <div className="flex-1 flex items-center justify-center"><Loader2 size={26} className="animate-spin text-slate-300" /></div>
  if (data.finished) {
    return <div className="flex-1 overflow-y-auto bg-slate-50"><Result data={data} onExit={exit} /></div>
  }

  const qs = data.questions
  const q = qs[index]
  const answered = Object.keys(answers).length
  const { m, s } = splitDuration(left)
  const low = left < 60_000

  const choose = (opt) => {
    setAnswers((a) => ({ ...a, [q.id]: opt }))
    api.post(`/centers/quiz-attempts/${attemptId}/answer/`, { question_id: q.id, option: opt }).catch(() => {})
    if (index < qs.length - 1) setTimeout(() => setIndex((i) => Math.min(i + 1, qs.length - 1)), 280)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
      <header className="flex-shrink-0 bg-white border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center gap-4">
          <p className="font-semibold text-slate-900 truncate flex-1">{data.quiz.title}</p>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold tabular-nums ${low ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
            <Clock size={15} />{pad(m)}:{pad(s)}
          </span>
          <button onClick={() => setConfirm(true)} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700">Finish</button>
        </div>
        <div className="h-1 bg-slate-100"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(answered / qs.length) * 100}%` }} /></div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-5 py-8">
          <p className="text-sm font-semibold text-slate-400">Question {index + 1} of {qs.length}</p>
          {/* no exit animation to wait for — the next question shows at once */}
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
              <h2 className="mt-2 text-xl sm:text-2xl font-semibold text-slate-900 leading-snug whitespace-pre-line">{q.text}</h2>
              <div className="mt-7 space-y-3">
                {q.options.map((o, i) => {
                  const on = answers[q.id] === i
                  return (
                    <button key={i} onClick={() => choose(i)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                        on ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                      <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 ${on ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                        {LETTERS[i]}
                      </span>
                      <span className="flex-1 text-base text-slate-800">{o}</span>
                      {on && <Check size={18} className="text-indigo-500" />}
                    </button>
                  )
                })}
              </div>
          </motion.div>

          <div className="mt-8 flex items-center justify-between">
            <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white disabled:opacity-30">
              <ArrowLeft size={16} />Back
            </button>
            {index < qs.length - 1
              ? <button onClick={() => setIndex((i) => i + 1)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300">
                  Next<ArrowRight size={16} />
                </button>
              : <button onClick={() => setConfirm(true)} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">Finish test</button>}
          </div>

          <div className="mt-10 flex flex-wrap gap-2 justify-center">
            {qs.map((x, i) => (
              <button key={x.id} onClick={() => setIndex(i)}
                className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
                  i === index ? 'ring-2 ring-indigo-500 ring-offset-2 ' : ''}${answers[x.id] != null ? 'bg-indigo-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {confirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-5">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
              <h3 className="text-lg font-bold text-slate-900">Finish the test?</h3>
              <p className="mt-2 text-sm text-slate-500">
                {answered < qs.length ? `${qs.length - answered} question${qs.length - answered > 1 ? 's are' : ' is'} not answered yet.` : 'All questions are answered.'}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-2">
                <button onClick={() => setConfirm(false)} className="py-3 rounded-2xl text-sm font-semibold text-slate-600 bg-slate-100"><X size={14} className="inline mr-1" />Keep going</button>
                <button onClick={submit} disabled={submitting} className="py-3 rounded-2xl text-sm font-bold text-white bg-slate-900 disabled:opacity-60">
                  {submitting ? <Loader2 size={15} className="inline animate-spin" /> : 'Finish'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
