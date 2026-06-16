import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ArrowLeft, RotateCcw,
  ChevronDown, ChevronUp, CheckCircle2, TriangleAlert,
  ThumbsUp, Mic, Volume2, BookMarked, AlignLeft, Sparkles, Wand2, Leaf,
  Play, Pause, Square,
} from 'lucide-react'
import api from '../../api/client'

function bandColor(band) {
  if (band >= 8)   return { text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200' }
  if (band >= 7)   return { text: 'text-green-600',   light: 'bg-green-50',   border: 'border-green-200' }
  if (band >= 6)   return { text: 'text-lime-600',    light: 'bg-lime-50',    border: 'border-lime-200' }
  if (band >= 5)   return { text: 'text-slate-600',   light: 'bg-slate-50',   border: 'border-slate-200' }
  return             { text: 'text-red-600',     light: 'bg-red-50',     border: 'border-red-200' }
}

function bandLabel(band) {
  if (band >= 8)   return 'Excellent'
  if (band >= 7)   return 'Good'
  if (band >= 6)   return 'Competent'
  if (band >= 5)   return 'Modest'
  return 'Limited'
}

const ICONS = {
  fluency_coherence: Volume2,
  lexical_resource: BookMarked,
  grammatical_range: AlignLeft,
  pronunciation: Mic,
}

function collectErrorQuotes(result) {
  const quotes = []
  const keys = ['fluency_coherence', 'lexical_resource', 'grammatical_range', 'pronunciation']
  keys.forEach(k => {
    const cr = result?.[k]
    if (cr?.errors) {
      cr.errors.forEach(e => { if (e.quote) quotes.push(e.quote) })
    }
  })
  return quotes
}

function splitWithHighlights(text, errorQuotes) {
  if (!text || !errorQuotes.length) return [{ t: text || '', err: false }]
  let parts = [{ t: text, err: false }]
  errorQuotes.forEach(quote => {
    if (!quote) return
    const next = []
    parts.forEach(p => {
      if (p.err) { next.push(p); return }
      const idx = p.t.indexOf(quote)
      if (idx === -1) { next.push(p); return }
      if (idx > 0) next.push({ t: p.t.slice(0, idx), err: false })
      next.push({ t: quote, err: true })
      if (idx + quote.length < p.t.length) next.push({ t: p.t.slice(idx + quote.length), err: false })
    })
    parts = next
  })
  return parts
}

function TranscriptText({ text, errorQuotes }) {
  const parts = splitWithHighlights(text, errorQuotes)
  return (
    <p className="text-sm text-gray-700 leading-relaxed italic">
      {parts.map((p, i) =>
        p.err
          ? <mark key={i} className="bg-red-100 text-red-700 not-italic font-semibold rounded px-0.5">{p.t}</mark>
          : <span key={i}>{p.t}</span>
      )}
    </p>
  )
}

function AudioPlayer({ src, label }) {
  const [audio] = useState(() => new Audio(src))
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    audio.onended = () => { setPlaying(false); setProgress(0) }
    audio.ontimeupdate = () => setProgress(audio.currentTime)
    audio.onloadedmetadata = () => setDuration(audio.duration)
    return () => { audio.pause() }
  }, [audio])

  if (!src) return null

  const toggle = () => {
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
  }
  const stop = () => { audio.pause(); audio.currentTime = 0; setPlaying(false); setProgress(0) }
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
      <button type="button" onClick={toggle}
        className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 hover:bg-emerald-600 transition">
        {playing ? <Pause size={13} className="text-white" /> : <Play size={13} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1">{label || 'Audio response'}</p>
        <div className="relative h-1.5 bg-emerald-100 rounded-full overflow-hidden cursor-pointer"
          onClick={e => {
            if (!duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration
          }}>
          <div className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>
      </div>
      <span className="text-[10px] text-emerald-500 font-mono flex-shrink-0">
        {duration ? fmt(playing ? progress : duration) : '--:--'}
      </span>
      {playing && (
        <button type="button" onClick={stop}
          className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center hover:bg-emerald-200 transition">
          <Square size={10} className="text-emerald-600" fill="currentColor" />
        </button>
      )}
    </div>
  )
}

function CriterionCard({ keyName, data, delay }) {
  const [open, setOpen] = useState(true)
  const c = bandColor(data.band)
  const Icon = ICONS[keyName] || Mic

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay }} className={`bg-white rounded-2xl shadow-md border ${c.border} overflow-hidden`}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/40 transition">
        <div className={`w-10 h-10 rounded-xl ${c.light} flex items-center justify-center flex-shrink-0`}>
          <Icon size={18} className={c.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">{data.label}</p>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{data.feedback}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`font-black text-xl ${c.text}`}>{data.band}</span>
          {open ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
        </div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="px-5 pb-5 pt-0 space-y-4 border-t border-gray-50">
              <p className="text-sm text-gray-700 leading-relaxed pt-4">{data.feedback}</p>
              {data.strengths?.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ThumbsUp size={12} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Strengths</span>
                  </div>
                  {data.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />{s}
                    </div>
                  ))}
                </div>
              )}
              {data.errors?.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TriangleAlert size={12} className="text-slate-500" />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Recommendations</span>
                  </div>
                  <div className="space-y-2">
                    {data.errors.map((e, i) => (
                      <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
                        {e.quote && <p className="text-xs font-mono text-red-600 italic bg-red-50 rounded px-2 py-1">"{e.quote}"</p>}
                        <p className="text-xs text-red-600 font-semibold">{e.issue}</p>
                        {e.suggestion && <p className="text-xs text-green-700">✓ {e.suggestion}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function CEFRSpeakingResult() {
  const { responseId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [result, setResult]         = useState(null)
  const [reviewData, setReviewData] = useState(null)
  const [transcripts, setTranscripts] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [taskInfo, setTaskInfo]     = useState(null)

  const CRITERIA = ['fluency_coherence', 'lexical_resource', 'grammatical_range', 'pronunciation']

  const runAnalysis = useCallback(async (txs, task, respId) => {
    setLoading(true)
    setError(null)
    const partsInfo = task?.test_type === 'MOCK' ? 'Full Mock (Parts 1, 2 & 3)' : `Part ${task?.part || task?.task_part}`
    try {
      const r = await api.post('/ielts/speaking/analyze/', {
        transcripts: txs,
        test_type: task?.test_type || task?.task_test_type || 'PART',
        parts_info: partsInfo,
        response_id: respId || null,
      })
      setResult(r.data)
      setLoading(false)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = responseId

    if (!id || id === '0') {
      const state = location.state || {}
      const { transcripts: txs = [], task } = state
      setTranscripts(txs)
      setTaskInfo(task)
      if (!txs.length) { setLoading(false); return }
      runAnalysis(txs, task, null)
      return
    }

    ;(async () => {
      try {
        const data = await api.get(`/ielts/speaking/review/${id}/`).then(r => r.data)
        setReviewData(data)
        setTranscripts(data.transcripts || [])
        setTaskInfo({
          title: data.task_title,
          part: data.task_part,
          test_type: data.task_test_type,
          id: data.task_id,
        })

        if (data.ai_band) {
          const criteria = data.ai_criteria || {}
          setResult({
            overall_band: parseFloat(data.ai_band),
            fluency_coherence: criteria.fluency_coherence,
            lexical_resource: criteria.lexical_resource,
            grammatical_range: criteria.grammatical_range,
            pronunciation: criteria.pronunciation,
            answer_corrections: criteria.answer_corrections || [],
          })
          setLoading(false)
        } else {
          runAnalysis(data.transcripts || [], data, id)
        }
      } catch {
        setError('Result not found')
        setLoading(false)
      }
    })()
  }, [responseId])

  const errorQuotes = result ? collectErrorQuotes(result) : []

  if ((!responseId || responseId === '0') && !transcripts.length && !loading && !result) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <AlertCircle size={36} className="text-gray-300 mx-auto" />
          <p className="text-gray-400 text-sm">Result not found</p>
          <button onClick={() => navigate('/app/cefr/speaking')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold">
            Back to Speaking
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 glass border-b border-emerald-100 px-5 h-14 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate('/app/cefr/speaking')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
          <ArrowLeft size={14} /> List
        </button>
        <div className="flex-1 text-sm font-semibold text-gray-800 truncate">
          {taskInfo?.title || 'CEFR Speaking Result'}
        </div>
        {taskInfo?.id && (
          <button onClick={() => navigate(`/exam/cefr/speaking/${taskInfo.id}`, { replace: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-50 transition">
            <RotateCcw size={13} /> Redo
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-12">
        <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">

          {/* Loading */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 sm:p-10 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin" />
                <Sparkles size={20} className="text-emerald-500 absolute inset-0 m-auto" />
              </div>
              <p className="font-bold text-gray-800">Analyzing with AI...</p>
              <p className="text-sm text-gray-400">Scoring across four criteria</p>
            </motion.div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle size={28} className="text-red-400 mx-auto" />
              <p className="font-semibold text-red-700">Analysis failed</p>
              <p className="text-sm text-red-500">{error}</p>
              <button onClick={() => runAnalysis(transcripts, taskInfo, responseId !== '0' ? responseId : null)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold mx-auto">
                <RotateCcw size={13} /> Try again
              </button>
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <>
              {/* Overall score */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
                <div className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4">
                  <Leaf size={14} className="text-emerald-600 shrink-0" />
                  CEFR Speaking Results
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-full border-8 border-emerald-100 flex items-center justify-center">
                    <span className={`font-black text-3xl ${bandColor(result.overall_band).text}`}>
                      {result.overall_band}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Overall Band</p>
                    <p className="text-2xl font-black text-gray-900">{bandLabel(result.overall_band)}</p>
                    <p className="text-sm text-gray-400 mt-0.5">{taskInfo?.title}</p>
                    <div className="flex gap-3 mt-3 flex-wrap">
                      {CRITERIA.map(k => {
                        const cr = result[k]; if (!cr) return null
                        const c = bandColor(cr.band)
                        return (
                          <div key={k} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${c.light}`}>
                            <span className="text-[10px] text-gray-400">{cr.label?.split(' ')[0]}</span>
                            <span className={`text-sm font-black ${c.text}`}>{cr.band}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 4 criteria cards */}
              {CRITERIA.map((k, i) => {
                const cr = result[k]; if (!cr) return null
                return <CriterionCard key={k} keyName={k} data={cr} delay={0.1 + i * 0.07} />
              })}

              {/* Transcripts + audio + corrections */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Wand2 size={14} className="text-emerald-500" />
                  <p className="text-sm font-bold text-gray-700">Javoblar, audio va tuzatishlar</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {transcripts.map((t, i) => {
                    const correction = result.answer_corrections?.find(c => c.q_index === i + 1)
                    return (
                      <div key={i} className="px-5 py-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-600">Q{i + 1}: {t.question}</p>

                        {t.audio_url && (
                          <AudioPlayer src={t.audio_url} label="Recorded response" />
                        )}

                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Transcript</p>
                          <TranscriptText text={t.transcript || '(not recorded)'} errorQuotes={errorQuotes} />
                        </div>

                        {correction?.corrected && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Wand2 size={11} className="text-emerald-600" />
                              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Improved version</p>
                            </div>
                            <p className="text-sm text-emerald-900 leading-relaxed">{correction.corrected}</p>
                            {correction.note && (
                              <p className="text-[11px] text-emerald-600 border-t border-emerald-100 pt-1.5 mt-1">{correction.note}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="flex gap-3">
                <button onClick={() => navigate('/app/cefr/speaking')}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Back to list
                </button>
                {taskInfo?.id && (
                  <button onClick={() => navigate(`/exam/cefr/speaking/${taskInfo.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">
                    <RotateCcw size={14} /> Redo Test
                  </button>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
