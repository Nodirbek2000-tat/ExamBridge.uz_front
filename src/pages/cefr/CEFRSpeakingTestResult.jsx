/*
 * CEFR Speaking result: score out of 75 and level, then each part with every
 * answer (recording, transcript marked red / amber / green, a stronger
 * version) and the four criteria (0–5). Polls while the AI is still scoring.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlignLeft, BookMarked, ListChecks, MessagesSquare, RotateCcw, Target, ThumbsDown, ThumbsUp, Volume2, Wand2 } from 'lucide-react'
import api from '../../api/client'
import {
  AudioPlayer, CefrScoreHero, CriterionCard, ErrorCard, HighlightedText, LoadingCard, MarkLegend, ResultHeader, SectionTitle,
} from '../../components/feedback/FeedbackKit'
import { buildMarks, matchedMarks, scoreTheme } from '../../components/feedback/feedbackUtils'
import { SpeakingLimitDialog } from '../../components/exam/SpeakingLimitNotice'
import { speakingLimit } from '../../utils/speakingLimit'

const HOME = '/app/cefr/skills?tab=speaking'
// red = grammar / vocabulary mistakes, amber = task and fluency notes
const CRITERIA = [
  { key: 'task', label: 'Task & relevance', icon: Target, kind: 'weak' },
  { key: 'fluency', label: 'Fluency & coherence', icon: Volume2, kind: 'weak' },
  { key: 'vocabulary', label: 'Vocabulary', icon: BookMarked, kind: 'error' },
  { key: 'grammar', label: 'Grammar', icon: AlignLeft, kind: 'error' },
]
const fmtPts = (p) => (Number.isInteger(p) ? p : Number(p).toFixed(1))
const wordsIn = (s) => (String(s || '').trim() ? String(s).trim().split(/\s+/).length : 0)

function PartContext({ part }) {
  if (part.key === '1.2' && part.images?.some(Boolean)) {
    return (
      <div className="grid max-w-xl grid-cols-2 gap-3">
        {part.images.map((src, i) => src && <img key={i} src={src} alt={`Picture ${i + 1}`} className="aspect-[4/3] w-full rounded-2xl border border-slate-200 object-cover" />)}
      </div>
    )
  }
  if (part.key === '2' && part.image) {
    return <img src={part.image} alt="Part 2" className="max-h-56 rounded-2xl border border-slate-200 object-contain" />
  }
  if (part.key === '3') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-700"><ThumbsUp size={16} /> For</p>
          <ul className="space-y-1 text-[15px] text-gray-800">{(part.for || []).map((x, i) => <li key={i}>• {x}</li>)}</ul>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-red-700"><ThumbsDown size={16} /> Against</p>
          <ul className="space-y-1 text-[15px] text-gray-800">{(part.against || []).map((x, i) => <li key={i}>• {x}</li>)}</ul>
        </div>
      </div>
    )
  }
  return null
}

function AnswerCard({ index, question, answer, better, marks, speakSecs }) {
  const said = String(answer?.transcript || '').trim()
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-lg font-black text-white shadow-md shadow-sky-500/25">{index + 1}</span>
        <p className="whitespace-pre-line pt-1.5 text-[17px] font-semibold leading-snug text-gray-900">{question}</p>
      </div>
      {answer?.audio_url && <div className="mt-4"><AudioPlayer src={answer.audio_url} /></div>}
      <div className={`mt-4 grid gap-4 ${better ? 'lg:grid-cols-2' : ''}`}>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
          <p className="mb-2 flex items-center justify-between text-sm font-bold uppercase tracking-wide text-gray-500">
            <span>What you said</span>
            <span className="font-semibold normal-case tracking-normal text-gray-400">{wordsIn(said)} words{answer?.seconds ? ` · ${answer.seconds} s of ${speakSecs}` : ''}</span>
          </p>
          {said ? <HighlightedText text={said} marks={marks} /> : <p className="text-[16px] italic text-gray-400">Nothing was recorded for this question.</p>}
        </div>
        {better && (
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-700"><Wand2 size={16} /> A stronger answer</p>
            <p className="text-[17px] leading-[2] text-emerald-950">{better}</p>
          </div>
        )}
      </div>
    </motion.article>
  )
}

function PartPanel({ part, result, answers }) {
  const marks = useMemo(() => buildMarks(result, CRITERIA), [result])
  const texts = useMemo(
    () => part.steps.map(st => answers.find(a => a.part === part.key && a.q === st.q)?.transcript || ''),
    [part, answers])
  const found = useMemo(() => matchedMarks(texts, marks), [texts, marks])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PartContext part={part} />
        <MarkLegend marks={marks} found={found} />
      </div>
      {part.steps.map((st, i) => (
        <AnswerCard key={st.q} index={i} question={st.question} speakSecs={part.speak}
          answer={answers.find(a => a.part === part.key && a.q === st.q)}
          better={result?.better?.[i] || ''} marks={marks} />
      ))}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {CRITERIA.map((c, i) => result?.[c.key] && (
          <CriterionCard key={c.key} index={i} icon={c.icon} kind={c.kind} max={5} defaultOpen
            data={{ ...result[c.key], label: result[c.key].label || c.label }} />
        ))}
      </div>
    </div>
  )
}

export default function CEFRSpeakingTestResult() {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(null)
  const [busy, setBusy] = useState(false)
  const [limitMsg, setLimitMsg] = useState(null)

  const { data, error, isLoading } = useQuery({
    queryKey: ['cefr-speaking-response', responseId],
    queryFn: () => api.get(`/cefr/speaking/responses/${responseId}/`).then(r => r.data),
    refetchInterval: (q) => (q.state.data?.status === 'SCORING' ? 3000 : false),
    refetchOnWindowFocus: false,
  })

  const retry = async () => {
    await api.post(`/cefr/speaking/responses/${responseId}/retry/`)
    queryClient.invalidateQueries({ queryKey: ['cefr-speaking-response', responseId] })
  }
  const again = async () => {
    if (!data?.test?.id || busy) return
    setBusy(true)
    try {
      const r = await api.post(`/cefr/speaking/${data.test.id}/start/`)
      navigate(`/exam/cefr/speaking/test/${r.data.response_id}`)
    } catch (err) {
      const limit = speakingLimit(err)              // daily speaking limit: say so, start nothing
      if (limit) setLimitMsg(limit.message)
    } finally {
      setBusy(false)
    }
  }

  const result = data?.result || {}
  const parts = data?.script?.parts || []
  const order = result.order || parts.map(p => p.key)
  const active = tab && order.includes(tab) ? tab : order[0]
  const part = parts.find(p => p.key === active)
  const totalWords = (data?.answers || []).reduce((n, a) => n + wordsIn(a.transcript), 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-sky-50/60 via-white to-white">
      <ResultHeader eyebrow="CEFR Speaking result" title={data?.test?.title || 'Speaking result'} onBack={() => navigate(HOME)}
        actions={data?.status === 'READY' && (
          <button type="button" onClick={again} disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-bold text-sky-800 transition hover:bg-sky-100">
            <RotateCcw size={16} /> <span className="hidden sm:inline">Try again</span>
          </button>
        )} />

      <div className="min-h-0 flex-1 overflow-y-auto pb-16">
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 pt-6 sm:px-6 sm:pt-8">
          {(isLoading || data?.status === 'SCORING') && (
            <LoadingCard title="The examiner is listening to your answers…" steps={['Task', 'Fluency', 'Vocabulary', 'Grammar']} />
          )}
          {error && <ErrorCard message="This result could not be opened." />}
          {data?.status === 'FAILED' && <ErrorCard message="The AI examiner could not score this test. Your answers are saved." onRetry={retry} />}
          {data?.status === 'IN_PROGRESS' && <ErrorCard message="This test was not finished." onRetry={again} />}

          {data?.status === 'READY' && (
            <>
              <CefrScoreHero score={data.score} badge={`CEFR Speaking · ${order.length === 4 ? 'Full test' : order.map(k => `Part ${k}`).join(' + ')}`}
                title={data.test.title} summary={result.summary}
                parts={order.map(k => {
                  const p = parts.find(x => x.key === k) || {}
                  return { key: k, label: `${p.label} · ${p.name}`, points: result.parts?.[k]?.points || 0, max: result.parts?.[k]?.max_points || p.points }
                })}
                stats={[{ value: (data.answers || []).length, label: 'answers' }, { value: totalWords, label: 'words spoken' }]} />

              <section className="space-y-4">
                <SectionTitle icon={MessagesSquare} title="Your answers" hint="Listen to yourself and tap a highlighted phrase to see what to change." />
                {order.length > 1 && (
                  <div className="flex flex-wrap gap-2" role="tablist">
                    {order.map(k => {
                      const p = parts.find(x => x.key === k) || {}
                      const r = result.parts?.[k] || {}
                      const th = scoreTheme(r.points || 0, r.max_points || 1)
                      const on = k === active
                      return (
                        <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)}
                          className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 text-left transition ${on ? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10' : 'border-slate-200 bg-white hover:border-sky-300'}`}>
                          <span>
                            <span className={`block text-[16px] font-bold ${on ? 'text-sky-800' : 'text-gray-800'}`}>{p.label}</span>
                            <span className="block text-sm text-gray-500">{p.name}</span>
                          </span>
                          <span className={`text-lg font-black tabular-nums ${th.text}`}>{fmtPts(r.points || 0)}<span className="text-sm text-gray-400">/{r.max_points}</span></span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <AnimatePresence mode="wait">
                  <motion.div key={active} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    {part && <PartPanel part={part} result={result.parts?.[active]} answers={data.answers || []} />}
                  </motion.div>
                </AnimatePresence>
              </section>

              <section className="space-y-3">
                <SectionTitle icon={ListChecks} title="How the score works" />
                <p className="max-w-3xl text-[15px] leading-relaxed text-gray-600">
                  Each part is marked on four criteria from 0 to 5. Part 1.1 is worth 12 points, Part 1.2 15, Part 2 24 and Part 3 24 — 75 in total.
                  65–75 is C1, 51–64 B2, 38–50 B1. Answers are judged from a transcript of your recording, so speak clearly; the examiner is strict on purpose.
                </p>
              </section>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => navigate(HOME)}
                  className="flex-1 rounded-2xl border-2 border-slate-200 bg-white py-3.5 text-base font-bold text-gray-700 transition hover:bg-slate-50">
                  Back to Speaking
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
      {limitMsg && <SpeakingLimitDialog message={limitMsg} onClose={() => setLimitMsg(null)} />}
    </div>
  )
}
