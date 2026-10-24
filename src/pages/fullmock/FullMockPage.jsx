/**
 * FullMockPage — one full mock, section by section, like exam day.
 * Route: /exam/full-mock/:attemptId
 *
 * Before each section the student sees what is coming (time, rules) and
 * starts it. The section opens in its normal exam screen; when that screen
 * finishes it comes back here (utils/fullMockFlow) and the next section is
 * offered. After the last one the overall result is shown — writing and
 * speaking scores arrive a little later, so the page waits for them.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, ExternalLink, Loader2, Lock, LogOut, Trophy } from 'lucide-react'
import api from '../../api/client'
import { startTest } from '../center/taskTypes'
import { fullMockReturn, rememberFullMockStep } from '../../utils/fullMockFlow'
import { SKILL_ICON, hours } from './FullMockList'

const RULES = {
  ielts: {
    listening: ['Four recordings, 40 questions.', 'Each recording plays once — answer while you listen.', 'Have headphones on and the volume set before you start.'],
    reading: ['Three passages, 40 questions.', 'No extra time to transfer answers.', 'Spend about 20 minutes on each passage.'],
    writing1: ['Describe the visual information (Academic) or write a letter (General).', 'Write at least 150 words.', 'Leave about 40 minutes for Task 2 — it counts twice as much.'],
    writing2: ['Write an essay in response to the question.', 'Write at least 250 words.', 'This task counts twice as much as Task 1.'],
    speaking: ['Three parts: interview, long turn (1 minute to prepare), discussion.', 'Your microphone records every answer.', 'Find a quiet room and speak naturally.'],
  },
  cefr: {
    listening: ['Several parts with different task types.', 'The audio plays once — answer while you listen.', 'Have headphones on and the volume set before you start.'],
    reading: ['Several texts with different task types.', 'Manage your time across all parts.'],
    writing: ['Task 1.1 — informal letter, Task 1.2 — formal letter, Part 2 — essay.', 'Mind the word counts shown for each task.'],
    speaking: ['Parts 1.1, 1.2, 2 and 3 — questions, pictures, long turn and discussion.', 'Your microphone records every answer.', 'Find a quiet room and speak naturally.'],
  },
}

const iconFor = (key) => SKILL_ICON[key.replace(/\d$/, '')]

function Stepper({ steps }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const Icon = iconFor(s.key)
        const done = s.state === 'done'
        const now = s.state === 'todo' || s.state === 'in_progress'
        return (
          <li key={s.key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <span className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              done ? 'bg-emerald-500/15 text-emerald-300' : now ? 'bg-white text-gray-900' : 'bg-white/5 text-white/40'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-emerald-500 text-white' : now ? 'bg-gray-900 text-white' : 'bg-white/10'}`}>
                {done ? <Check size={11} /> : s.state === 'locked' ? <Lock size={10} /> : <Icon size={11} />}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </span>
            {i < steps.length - 1 && <span className="w-3 sm:w-6 h-px bg-white/15" />}
          </li>
        )
      })}
    </ol>
  )
}

function NextSection({ data, step, index, onStart, starting, error }) {
  const Icon = iconFor(step.key)
  const rules = RULES[data.mock.exam]?.[step.key] || []
  return (
    <motion.div key={step.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xl bg-white rounded-3xl p-7 sm:p-9 text-gray-900 shadow-2xl">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Section {index + 1} of {data.steps.length}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center"><Icon size={22} /></span>
        <div>
          <h2 className="text-2xl font-bold">{step.label}</h2>
          <p className="text-sm text-gray-500 inline-flex items-center gap-1"><Clock size={13} />{step.minutes} minutes · {step.test.title}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-2.5">
        {rules.map((r) => (
          <li key={r} className="flex gap-2.5 text-sm text-gray-600"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />{r}</li>
        ))}
      </ul>
      {error && <p className="mt-5 p-3 rounded-xl bg-rose-50 text-sm text-rose-700">{error}</p>}
      <button onClick={onStart} disabled={starting}
        className="mt-7 w-full py-3.5 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-700 disabled:opacity-60 inline-flex items-center justify-center gap-2 transition-colors">
        {starting ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
        {starting ? 'Opening…' : step.state === 'in_progress' ? `Continue ${step.label}` : `Start ${step.label}`}
      </button>
      {index > 0 && <p className="mt-3 text-center text-xs text-gray-400">Need a break? Leave now — this mock waits for you.</p>}
    </motion.div>
  )
}

function Results({ data, onExit }) {
  const { result, steps, mock } = data
  const ielts = mock.exam === 'ielts'
  const fmt = (v) => (v == null ? '…' : ielts ? Number(v).toFixed(1) : v)   // IELTS bands read 6.0, not 6
  const sections = ['listening', 'reading', 'writing', 'speaking']
  const stepOf = (k) => steps.filter((s) => s.key.replace(/\d$/, '') === k)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl">
      <div className="text-center text-white">
        <Trophy size={30} className="mx-auto text-amber-300" />
        <p className="mt-3 text-sm font-semibold uppercase tracking-wider text-white/50">{mock.title}</p>
        {result.complete ? (
          <>
            <p className="mt-2 text-6xl font-bold tabular-nums">{fmt(result.overall)}</p>
            <p className="mt-1 text-lg text-white/70">{ielts ? 'Overall band' : `out of 75 · ${result.level}`}</p>
          </>
        ) : (
          <>
            <p className="mt-3 text-3xl font-bold">All sections done 🎉</p>
            <p className="mt-2 text-white/60 inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Writing and speaking are being scored — this takes a minute.</p>
          </>
        )}
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        {sections.map((k) => {
          const Icon = SKILL_ICON[k]
          const score = result.sections[k]
          const parts = stepOf(k)
          return (
            <div key={k} className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600"><Icon size={16} />{k[0].toUpperCase() + k.slice(1)}</span>
                {score != null
                  ? <span className="text-2xl font-bold text-gray-900 tabular-nums">{fmt(score)}{!ielts && <span className="text-sm font-medium text-gray-400">/75</span>}</span>
                  : <Loader2 size={18} className="animate-spin text-gray-300" />}
              </div>
              {!ielts && result.levels?.[k] && <p className="mt-1 text-xs font-semibold text-gray-500">{result.levels[k]}</p>}
              {parts.length > 1 && (
                <p className="mt-1 text-xs text-gray-500">{parts.map((p) => `${p.label.replace('Writing ', '')}: ${fmt(p.score)}`).join(' · ')}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-3">
                {parts.filter((p) => p.review_url).map((p) => (
                  <a key={p.key} href={p.review_url} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
                    {parts.length > 1 ? p.label.replace('Writing ', '') : 'Feedback'} <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-8 text-center">
        <button onClick={onExit} className="px-6 py-3 rounded-2xl bg-white text-gray-900 font-bold hover:bg-gray-100">Back to full mocks</button>
      </div>
    </motion.div>
  )
}

export default function FullMockPage() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const scoredSpeaking = useRef(new Set())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['full-mock-attempt', attemptId],
    queryFn: () => api.get(`/full-mocks/attempts/${attemptId}/`).then((r) => r.data),
    refetchOnMount: 'always',
    refetchInterval: (q) => {
      const d = q.state.data
      return d && d.status === 'COMPLETED' && !d.result?.complete ? 5000 : false
    },
  })

  // IELTS speaking is scored when its answers are analysed; in a full mock
  // nobody opens the speaking result page, so ask for the score here.
  useEffect(() => {
    const sp = data?.mock?.exam === 'ielts' && data.steps.find((s) => s.key === 'speaking')
    if (!sp || sp.state !== 'done' || sp.scored || !sp.response_id || scoredSpeaking.current.has(sp.response_id)) return
    scoredSpeaking.current.add(sp.response_id)
    ;(async () => {
      try {
        const { data: r } = await api.get(`/ielts/speaking/review/${sp.response_id}/`)
        if (r.ai_band == null) {
          await api.post('/ielts/speaking/analyze/', {
            transcripts: r.transcripts || [],
            test_type: r.task_test_type || 'PART',
            parts_info: r.task_test_type === 'MOCK' ? 'Full Mock (Parts 1, 2 & 3)' : `Part ${r.task_part}`,
            response_id: sp.response_id,
          })
        }
      } catch { /* the speaking result page can still score it later */ }
      refetch()
    })()
  }, [data, refetch])

  // a full mock opened from an olympiad goes back there
  const exit = () => navigate(fullMockReturn(`${data?.mock?.exam}_full_mock`, attemptId)
    || `/app/${data?.mock?.exam || 'ielts'}/skills?tab=mock`)

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center bg-gray-950"><Loader2 size={26} className="animate-spin text-white/40" /></div>
  }
  if (isError || !data) {
    return <div className="flex-1 flex items-center justify-center bg-gray-950 text-white/60">This full mock is not available.</div>
  }

  const index = data.steps.findIndex((s) => s.key === data.current)
  const step = index >= 0 ? data.steps[index] : null
  const totalMinutes = data.steps.reduce((n, s) => n + s.minutes, 0)

  const start = async () => {
    if (!step || starting) return
    setStarting(true)
    setError('')
    try {
      const { url, ref } = await startTest(step.test)
      await api.post(`/full-mocks/attempts/${attemptId}/link/`, { step: step.key, ref_id: ref })
      rememberFullMockStep(step.test.type, ref, `/exam/full-mock/${attemptId}`)
      navigate(url)
    } catch (e) {
      const msg = e.response?.data?.error
      setError(typeof msg === 'string' ? msg : 'Could not open this section. Check your connection and try again.')
      setStarting(false)
      refetch()
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-gray-950">
      <header className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <span className="px-2 py-1 rounded-md bg-white/10 text-[11px] font-bold text-white tracking-wider">{data.mock.exam.toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{data.mock.title}</p>
            <p className="text-[11px] text-white/40">Full mock · {hours(totalMinutes)}</p>
          </div>
          <button onClick={exit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10">
            <LogOut size={14} />{step ? 'Save & exit' : 'Exit'}
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4"><Stepper steps={data.steps} /></div>
      </header>

      <main className="min-h-[70vh] px-4 py-10 sm:py-14 flex items-start justify-center">
        {step
          ? <NextSection data={data} step={step} index={index} onStart={start} starting={starting} error={error} />
          : <Results data={data} onExit={exit} />}
      </main>
    </div>
  )
}
