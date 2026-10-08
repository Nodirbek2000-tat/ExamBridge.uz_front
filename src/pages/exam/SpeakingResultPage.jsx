/*
 * Speaking result — shared by IELTS and CEFR (`exam` prop only changes links).
 *
 * Each answer is shown as the student said it, with the examiner's quotes
 * marked red / amber / green, next to the AI's upgraded version.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, RotateCcw, Mic, Volume2, BookMarked, AlignLeft, MessagesSquare, ListChecks, Wand2 } from 'lucide-react'
import api from '../../api/client'
import {
  ResultHeader, LoadingCard, ErrorCard, ScoreHero, CriterionCard, HighlightedText, MarkLegend, SectionTitle, AudioPlayer,
} from '../../components/feedback/FeedbackKit'
import { buildMarks, matchedMarks, txt } from '../../components/feedback/feedbackUtils'
import { SpeakingLimitCard } from '../../components/exam/SpeakingLimitNotice'
import { speakingLimit } from '../../utils/speakingLimit'

// red = grammar / vocabulary mistakes, amber = fluency & pronunciation notes
const CRITERIA = [
  { key: 'fluency_coherence', label: 'Fluency & Coherence', icon: Volume2, kind: 'weak' },
  { key: 'lexical_resource', label: 'Lexical Resource', icon: BookMarked, kind: 'error' },
  { key: 'grammatical_range', label: 'Grammatical Range & Accuracy', icon: AlignLeft, kind: 'error' },
  { key: 'pronunciation', label: 'Pronunciation', icon: Mic, kind: 'weak' },
]
const EXAMS = {
  ielts: { name: 'IELTS Speaking', home: '/app/ielts/skills?tab=speaking', redo: (id) => `/exam/ielts/speaking/${id}` },
  cefr: { name: 'CEFR Speaking', home: '/app/cefr/skills?tab=speaking', redo: (id) => `/exam/cefr/speaking/${id}` },
}

// the attempt pages store "(no transcript)" when nothing was recognised
const spoken = (t) => {
  const s = String(t?.transcript || '').trim()
  return s.toLowerCase() === '(no transcript)' ? '' : s
}
const wordsIn = (s) => (s ? s.split(/\s+/).length : 0)

function fromStored(data) {
  const c = data.ai_criteria || {}
  return {
    overall_band: parseFloat(data.ai_band) || 0,
    fluency_coherence: c.fluency_coherence,
    lexical_resource: c.lexical_resource,
    grammatical_range: c.grammatical_range,
    pronunciation: c.pronunciation,
    answer_corrections: c.answer_corrections || [],
    good_phrases: c.good_phrases || [],
  }
}

function AnswerCard({ index, item, marks, correction }) {
  const said = spoken(item)
  const words = wordsIn(said)
  // never show an "improved" answer for a question the student did not answer
  const better = said ? txt(correction?.corrected) : ''
  return (
    <motion.article initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-lg font-black text-white shadow-md shadow-sky-500/25">
          {index + 1}
        </span>
        <p className="whitespace-pre-line pt-1.5 text-[17px] font-semibold leading-snug text-gray-900">{item.question || `Question ${index + 1}`}</p>
      </div>

      {item.audio_url && <div className="mt-4"><AudioPlayer src={item.audio_url} /></div>}

      <div className={`mt-4 grid gap-4 ${better ? 'lg:grid-cols-2' : ''}`}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
          <p className="mb-2 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-gray-500">
            <span>What you said</span>
            <span className="font-semibold normal-case tracking-normal text-gray-400">{words} words</span>
          </p>
          {said
            ? <HighlightedText text={said} marks={marks} />
            : <p className="text-[16px] italic text-gray-400">Nothing was recorded for this question.</p>}
        </div>
        {better && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700">
              <Wand2 size={16} /> A stronger answer
            </p>
            <p className="text-[17px] leading-[2] text-emerald-950">{better}</p>
            {txt(correction.note) && (
              <p className="mt-3 border-t border-emerald-100 pt-3 text-[15px] leading-relaxed text-emerald-700">{txt(correction.note)}</p>
            )}
          </div>
        )}
      </div>
    </motion.article>
  )
}

export default function SpeakingResultPage({ exam = 'ielts' }) {
  const cfg = EXAMS[exam] || EXAMS.ielts
  const { responseId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const hasId = !!responseId && responseId !== '0'

  const [result, setResult] = useState(null)
  const [transcripts, setTranscripts] = useState([])
  const [taskInfo, setTaskInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [limit, setLimit] = useState(null)       // unsaved answers are not scored while the daily limit is reached

  const runAnalysis = useCallback(async (txs, task, respId) => {
    setLoading(true)
    setError(null)
    setLimit(null)
    const testType = task?.test_type || task?.task_test_type || 'PART'
    const part = task?.part || task?.task_part
    try {
      const r = await api.post('/ielts/speaking/analyze/', {
        transcripts: txs,
        test_type: testType,
        parts_info: testType === 'MOCK' ? 'Full Mock (Parts 1, 2 & 3)' : `Part ${part}`,
        response_id: respId || null,
      })
      setResult(r.data)
    } catch (e) {
      const lim = speakingLimit(e)
      if (lim) setLimit(lim)
      else setError(e.response?.data?.error || e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Without an id (no account / failed save) the answers come in router state
    if (!hasId) {
      const { transcripts: txs = [], task } = location.state || {}
      setTranscripts(txs)
      setTaskInfo(task || null)
      if (txs.length) runAnalysis(txs, task, null)
      else setLoading(false)
      return
    }
    let cancelled = false
    api.get(`/ielts/speaking/review/${responseId}/`)
      .then(({ data }) => {
        if (cancelled) return
        setTranscripts(data.transcripts || [])
        setTaskInfo({ title: data.task_title, part: data.task_part, test_type: data.task_test_type, id: data.task_id })
        // band 0 is a real (stored) result — only a missing band means "not analysed yet"
        if (data.ai_band != null) { setResult(fromStored(data)); setLoading(false) }
        else runAnalysis(data.transcripts || [], data, responseId)
      })
      .catch(() => { if (!cancelled) { setError('Result not found'); setLoading(false) } })
    return () => { cancelled = true }
    // location.state is only read on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [responseId, hasId, runAnalysis])

  const marks = useMemo(() => (result ? buildMarks(result, CRITERIA) : []), [result])
  const found = useMemo(() => matchedMarks(transcripts.map(spoken), marks), [transcripts, marks])
  const totalWords = useMemo(() => transcripts.reduce((n, t) => n + wordsIn(spoken(t)), 0), [transcripts])

  if (!hasId && !transcripts.length && !loading && !result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertCircle size={40} className="text-gray-300" />
        <p className="text-lg font-semibold text-gray-500">Result not found</p>
        <button type="button" onClick={() => navigate(cfg.home)}
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700">Back to Speaking</button>
      </div>
    )
  }

  const redo = taskInfo?.id ? () => navigate(cfg.redo(taskInfo.id), { replace: true }) : null
  const part = taskInfo?.test_type === 'MOCK' ? 'Full mock' : taskInfo?.part ? `Part ${taskInfo.part}` : null

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-sky-50/60 via-white to-white">
      <ResultHeader eyebrow={`${cfg.name} result`} title={taskInfo?.title || 'Speaking result'} onBack={() => navigate(cfg.home)}
        actions={redo && (
          <button type="button" onClick={redo}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-100">
            <RotateCcw size={16} /> <span className="hidden sm:inline">Try again</span>
          </button>
        )} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
          {loading && <LoadingCard title="Listening to your answers…" steps={['Fluency', 'Vocabulary', 'Grammar', 'Pronunciation']} />}
          {limit && !loading && (
            <div className="flex justify-center">
              <SpeakingLimitCard message={limit.message} onBack={() => navigate(cfg.home)} backLabel="Speaking bo'limiga qaytish" />
            </div>
          )}
          {error && !loading && (
            <ErrorCard message={error} onRetry={transcripts.length ? () => runAnalysis(transcripts, taskInfo, hasId ? responseId : null) : null} />
          )}

          {result && !loading && (
            <>
              <ScoreHero band={result.overall_band} badge={[cfg.name, part].filter(Boolean).join(' · ')} title={taskInfo?.title}
                criteria={CRITERIA.filter(c => result[c.key]).map(c => ({ key: c.key, label: c.label, band: result[c.key].band }))}
                stats={[{ value: transcripts.length, label: transcripts.length === 1 ? 'answer' : 'answers' }, { value: totalWords, label: 'words spoken' }]} />

              <section className="space-y-4">
                <SectionTitle icon={MessagesSquare} title="Your answers"
                  hint="Tap a highlighted phrase to see what to change." right={<MarkLegend marks={marks} found={found} />} />
                {transcripts.map((t, i) => (
                  <AnswerCard key={i} index={i} item={t} marks={marks}
                    correction={(result.answer_corrections || []).find(c => Number(c?.q_index) === i + 1)} />
                ))}
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
                <button type="button" onClick={() => navigate(cfg.home)}
                  className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-base font-bold text-gray-700 transition hover:bg-slate-50">
                  Back to Speaking
                </button>
                {redo && (
                  <button type="button" onClick={redo}
                    className="btn-glass flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700">
                    <RotateCcw size={18} /> Try this task again
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
