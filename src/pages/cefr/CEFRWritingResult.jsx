/*
 * CEFR Writing result: score out of 75 and level, then each task with the
 * student's text marked red / amber / green and the four criteria (0–5).
 * Polls while the AI examiner is still scoring.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlignLeft, BookMarked, ChevronDown, FileText, Link2, ListChecks, PenLine, RotateCcw, Target } from 'lucide-react'
import api from '../../api/client'
import {
  CefrScoreHero, CriterionCard, ErrorCard, HighlightedText, LoadingCard, MarkLegend, ResultHeader, SectionTitle,
} from '../../components/feedback/FeedbackKit'
import { buildMarks, matchedMarks, scoreTheme } from '../../components/feedback/feedbackUtils'

const HOME = '/app/cefr/skills?tab=writing'
// red = vocabulary / grammar mistakes, amber = task and organisation notes
const CRITERIA = [
  { key: 'task', label: 'Task fulfilment', icon: Target, kind: 'weak' },
  { key: 'organisation', label: 'Organisation & cohesion', icon: Link2, kind: 'weak' },
  { key: 'vocabulary', label: 'Vocabulary', icon: BookMarked, kind: 'error' },
  { key: 'grammar', label: 'Grammar', icon: AlignLeft, kind: 'error' },
]
const fmtPts = (p) => (Number.isInteger(p) ? p : Number(p).toFixed(1))

function TaskPrompt({ task, situation }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-3xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-3 p-5 text-left">
        <FileText size={20} className="flex-shrink-0 text-sky-600" />
        <span className="flex-1 text-[16px] font-bold text-gray-900">The task · {task.genre}, {task.target}</span>
        <span className="text-sm font-semibold text-sky-700">{open ? 'Hide' : 'Show'}</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-slate-100 px-5 pb-5 pt-4">
              {situation && (task.key === '1.1' || task.key === '1.2') && (
                <p className="whitespace-pre-line rounded-2xl bg-amber-50/70 p-4 text-[16px] leading-relaxed text-gray-800">{situation}</p>
              )}
              <p className="whitespace-pre-line text-[16px] leading-relaxed text-gray-700">{task.prompt}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TaskPanel({ task, result, text, situation }) {
  const marks = useMemo(() => buildMarks(result, CRITERIA), [result])
  const found = useMemo(() => matchedMarks([text], marks), [text, marks])
  const words = result?.words ?? 0
  return (
    <div className="space-y-5">
      <TaskPrompt task={task} situation={situation} />
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-500">
            What you wrote <span className="ml-2 font-semibold normal-case tracking-normal text-gray-400">{words} words · target {task.target}</span>
          </p>
          <MarkLegend marks={marks} found={found} />
        </div>
        {String(text || '').trim()
          ? <HighlightedText text={text} marks={marks} />
          : <p className="text-[16px] italic text-gray-400">Nothing was written for this task.</p>}
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {CRITERIA.map((c, i) => result?.[c.key] && (
          <CriterionCard key={c.key} index={i} icon={c.icon} kind={c.kind} max={5} defaultOpen
            data={{ ...result[c.key], label: result[c.key].label || c.label }} />
        ))}
      </div>
    </div>
  )
}

export default function CEFRWritingResult() {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(null)
  const [busy, setBusy] = useState(false)

  const { data, error, isLoading } = useQuery({
    queryKey: ['cefr-writing-response', responseId],
    queryFn: () => api.get(`/cefr/writing/responses/${responseId}/`).then(r => r.data),
    refetchInterval: (q) => (q.state.data?.status === 'SCORING' ? 3000 : false),
    refetchOnWindowFocus: false,
  })

  const retry = async () => {
    await api.post(`/cefr/writing/responses/${responseId}/retry/`)
    queryClient.invalidateQueries({ queryKey: ['cefr-writing-response', responseId] })
  }
  const again = async () => {
    if (!data?.test?.id || busy) return
    setBusy(true)
    try {
      const r = await api.post(`/cefr/writing/${data.test.id}/start/`)
      navigate(`/exam/cefr/writing/${r.data.response_id}`)
    } finally {
      setBusy(false)
    }
  }

  const result = data?.result || {}
  const order = result.order || (data?.tasks || []).map(t => t.key)
  const active = tab && order.includes(tab) ? tab : order[0]
  const taskMeta = (data?.tasks || []).find(t => t.key === active)
  const totalWords = Object.values(result.tasks || {}).reduce((n, t) => n + (t.words || 0), 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-sky-50/60 via-white to-white">
      <ResultHeader eyebrow="CEFR Writing result" title={data?.test?.title || 'Writing result'} onBack={() => navigate(HOME)}
        actions={data?.status === 'READY' && (
          <button type="button" onClick={again} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-100">
            <RotateCcw size={16} /> <span className="hidden sm:inline">Try again</span>
          </button>
        )} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
          {(isLoading || data?.status === 'SCORING') && (
            <LoadingCard title="The examiner is reading your writing…" steps={['Task', 'Organisation', 'Vocabulary', 'Grammar']} />
          )}
          {error && <ErrorCard message="This result could not be opened." />}
          {data?.status === 'FAILED' && <ErrorCard message="The AI examiner could not score this test. Your answers are saved." onRetry={retry} />}
          {data?.status === 'IN_PROGRESS' && (
            <ErrorCard message="This test has not been submitted yet." onRetry={() => navigate(`/exam/cefr/writing/${responseId}`)} />
          )}

          {data?.status === 'READY' && (
            <>
              <CefrScoreHero score={data.score} badge={`CEFR Writing · ${order.length === 3 ? 'Full test' : order.length === 2 ? 'Part 1' : 'Part 2'}`}
                title={data.test.title} summary={result.summary}
                parts={order.map(k => {
                  const t = (data.tasks || []).find(x => x.key === k) || {}
                  return { key: k, label: `${t.label} · ${t.genre}`, points: result.tasks?.[k]?.points || 0, max: result.tasks?.[k]?.max_points || t.points }
                })}
                stats={[{ value: totalWords, label: 'words written' }, ...(result.max_raw && result.max_raw !== 75 ? [{ value: `${fmtPts(result.raw)} / ${result.max_raw}`, label: 'points' }] : [])]} />

              <section className="space-y-4">
                <SectionTitle icon={PenLine} title="Your tasks" hint="Tap a highlighted phrase to see what to change." />
                {order.length > 1 && (
                  <div className="flex flex-wrap gap-2" role="tablist">
                    {order.map(k => {
                      const t = (data.tasks || []).find(x => x.key === k) || {}
                      const r = result.tasks?.[k] || {}
                      const th = scoreTheme(r.points || 0, r.max_points || 1)
                      const on = k === active
                      return (
                        <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)}
                          className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition ${on ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10' : 'border-slate-200 bg-white hover:border-sky-300'}`}>
                          <span>
                            <span className={`block text-[16px] font-bold ${on ? 'text-sky-800' : 'text-gray-800'}`}>{t.label}</span>
                            <span className="block text-sm text-gray-500">{t.genre}</span>
                          </span>
                          <span className={`text-lg font-black tabular-nums ${th.text}`}>{fmtPts(r.points || 0)}<span className="text-sm text-gray-400">/{r.max_points}</span></span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <AnimatePresence mode="wait">
                  <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {taskMeta && (
                      <TaskPanel task={taskMeta} result={result.tasks?.[active]} text={data.answers?.[active] || ''} situation={data.test.situation} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={ListChecks} title="How the score works" />
                <p className="max-w-3xl text-[15px] leading-relaxed text-gray-600">
                  Each task is marked on four criteria from 0 to 5. Task 1.1 is worth 15 points, Task 1.2 25 and Part 2 35 — 75 in total.
                  65–75 is C1, 51–64 B2, 38–50 B1. The examiner is strict on purpose: the real exam rewards accuracy and full task coverage.
                </p>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => navigate(HOME)}
                  className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-base font-bold text-gray-700 transition hover:bg-slate-50">
                  Back to Writing
                </button>
                <button type="button" onClick={again} disabled={busy}
                  className="btn-glass flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700">
                  <RotateCcw size={18} /> Try this test again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
