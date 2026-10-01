import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Printer, BookOpen, Link2, BookMarked, AlignLeft, PenLine, ListChecks, ChevronDown, FileText } from 'lucide-react'
import api from '../../api/client'
import { analyzeWriting } from '../../utils/writingAnalysis'
import { downloadAnalysisPdf } from '../../utils/downloadPdf'
import {
  ResultHeader, LoadingCard, ErrorCard, ScoreHero, CriterionCard, HighlightedText, MarkLegend, SectionTitle,
} from '../../components/feedback/FeedbackKit'
import { buildMarks, matchedMarks, txt } from '../../components/feedback/feedbackUtils'

// red = grammar / vocabulary mistakes, amber = task & organisation notes
const CRITERIA = [
  { key: 'task_achievement', label: 'Task Achievement', icon: BookOpen, kind: 'weak' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion', icon: Link2, kind: 'weak' },
  { key: 'lexical_resource', label: 'Lexical Resource', icon: BookMarked, kind: 'error' },
  { key: 'grammatical_range', label: 'Grammatical Range & Accuracy', icon: AlignLeft, kind: 'error' },
]
const HOME = '/app/ielts/skills?tab=writing'
const POLL_MS = 3000
const POLL_GIVE_UP_MS = 4 * 60 * 1000

// Old rows store plain numbers ({task_achievement: 6}) — shape them like the AI result
function fromStored(data) {
  const out = { overall_band: parseFloat(data.ai_band) || 0, good_phrases: data.ai_criteria?.good_phrases || [] }
  for (const c of CRITERIA) {
    const v = data.ai_criteria?.[c.key]
    out[c.key] = v && typeof v === 'object' ? v : { band: Number(v) || 0, label: c.label, feedback: '', strengths: [], errors: [] }
  }
  return out
}

function TaskCard({ task }) {
  const [open, setOpen] = useState(false)
  if (!txt(task?.prompt)) return null
  return (
    <div className="rounded-3xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-left">
        <FileText size={20} className="flex-shrink-0 text-sky-600" />
        <span className="flex-1 text-[16px] font-bold text-gray-900">
          The task{task.task_type ? ` · Task ${task.task_type}` : ''}
        </span>
        <span className="text-sm font-semibold text-sky-700">{open ? 'Hide' : 'Show'}</span>
        <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }} className="overflow-hidden">
            <p className="whitespace-pre-line border-t border-slate-100 px-5 pb-5 pt-4 text-[16px] leading-relaxed text-gray-700">{txt(task.prompt)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function IELTSWritingResult() {
  const { responseId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const stateData = location.state || {}
  const hasId = !!responseId && responseId !== '0'

  const [task, setTask] = useState(stateData.task || null)
  const [text, setText] = useState(stateData.text || '')
  const [wordCount, setWordCount] = useState(stateData.wordCount || 0)
  const [ownTitle] = useState(stateData.ownTitle || '')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  const runLocal = (args) => {
    setError(null)
    setLoading(true)
    analyzeWriting(args)
      .then(r => setResult(r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    // Own writing / failed submit: analyse the text from router state
    if (!hasId) {
      if (stateData.text) runLocal({ text: stateData.text, task: stateData.task, wordCount: stateData.wordCount, ownTitle: stateData.ownTitle })
      else setLoading(false)
      return
    }
    // Saved essay: Celery scores it, we poll until it is ready
    const started = Date.now()
    const stop = () => clearInterval(pollRef.current)
    const poll = async () => {
      try {
        const { data } = await api.get(`/ielts/writing/result/${responseId}/`)
        setTask({ title: data.task_title, task_type: data.task_type, prompt: data.task_prompt })
        setText(data.response_text || '')
        setWordCount(data.word_count || 0)
        if (data.status === 'ready' && data.ai_band != null) {
          stop()
          setResult(fromStored(data))
          setLoading(false)
        } else if (Date.now() - started > POLL_GIVE_UP_MS) {
          stop()
          setError('Scoring is taking longer than usual. Open this page again in a few minutes.')
          setLoading(false)
        }
      } catch {
        stop()
        setError('Result not found')
        setLoading(false)
      }
    }
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return stop
    // router state is only read on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseId, hasId])

  const marks = useMemo(() => (result ? buildMarks(result, CRITERIA) : []), [result])
  const found = useMemo(() => matchedMarks([text], marks), [text, marks])
  const title = task?.title || ownTitle || 'Writing analysis'
  const pdf = () => downloadAnalysisPdf({ task, text, wordCount, result, ownTitle })

  if (!hasId && !stateData.text) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-lg font-semibold text-gray-500">No result found.</p>
        <button type="button" onClick={() => navigate(HOME)}
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700">Back to Writing</button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-sky-50/60 via-white to-white">
      <ResultHeader eyebrow="IELTS Writing result" title={title} onBack={() => navigate(HOME)}
        actions={result && !loading && (
          <button type="button" onClick={pdf}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-100">
            <Printer size={16} /> PDF
          </button>
        )} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
          {loading && <LoadingCard title="Reading your essay…" steps={['Task', 'Cohesion', 'Vocabulary', 'Grammar']} />}
          {error && !loading && (
            <ErrorCard message={error} onRetry={!hasId && text ? () => runLocal({ text, task, wordCount, ownTitle }) : null} />
          )}

          {result && !loading && (
            <>
              <ScoreHero band={result.overall_band}
                badge={['IELTS Writing', task?.task_type ? `Task ${task.task_type}` : null].filter(Boolean).join(' · ')} title={title}
                criteria={CRITERIA.filter(c => result[c.key]).map(c => ({ key: c.key, label: c.label, band: result[c.key].band }))}
                stats={[{ value: wordCount, label: 'words' }]} />

              <section className="space-y-4">
                <SectionTitle icon={PenLine} title="Your essay"
                  hint="Tap a highlighted phrase to see what to change." right={<MarkLegend marks={marks} found={found} />} />
                <TaskCard task={task} />
                <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45 }}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                  <p className="mb-4 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-gray-500">
                    <span>What you wrote</span>
                    <span className="font-semibold normal-case tracking-normal text-gray-400">{wordCount} words</span>
                  </p>
                  {text.trim()
                    ? <HighlightedText text={text} marks={marks} />
                    : <p className="text-[16px] italic text-gray-400">The essay is empty.</p>}
                </motion.div>
              </section>

              <section className="space-y-4">
                <SectionTitle icon={ListChecks} title="Examiner feedback" hint="How each band score was decided." />
                <div className="grid items-start gap-4 lg:grid-cols-2">
                  {CRITERIA.map((c, i) => result[c.key] && (
                    <CriterionCard key={c.key} index={i} icon={c.icon} kind={c.kind} defaultOpen
                      data={{ ...result[c.key], label: txt(result[c.key].label) || c.label }} />
                  ))}
                </div>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => navigate(HOME)}
                  className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-base font-bold text-gray-700 transition hover:bg-slate-50">
                  Back to Writing
                </button>
                <button type="button" onClick={pdf}
                  className="btn-glass flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700">
                  <Printer size={18} /> Download PDF
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
