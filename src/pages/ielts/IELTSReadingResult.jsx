import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CheckCircle2, XCircle, RotateCcw, ChevronLeft, Home, ListChecks, BookOpen } from 'lucide-react'
import api from '../../api/client'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />
}

function bandColor(band) {
  if (band >= 7) return 'text-emerald-600'
  if (band >= 5) return 'text-sky-600'
  return 'text-orange-500'
}

function displayAnswer(v) {
  return String(v ?? '').trim() || 'N/A'
}

export default function IELTSReadingResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [retrying, setRetrying] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [showCorrect, setShowCorrect] = useState(true)

  const title = decodeURIComponent(searchParams.get('title') || 'Reading')
  const passageId = Number(searchParams.get('passage') || 0)
  const parts = searchParams.get('parts') || ''
  const partsQuery = parts ? `&parts=${parts}` : ''
  const attemptId = location.pathname.split('/').filter(Boolean).at(-2)
  const result = location.state?.result

  const summary = useMemo(() => {
    if (!result) return null
    const correct = result.correct ?? 0
    const total = result.total ?? 0
    const scorePercent = result.score_percent ?? (total ? Math.round((correct / total) * 100) : 0)
    const band = result.band ?? 0
    const isFull = result.is_full ?? false
    return { correct, total, scorePercent, band, isFull, results: result.results ?? [] }
  }, [result])

  if (!summary) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-sky-100">
          <button onClick={() => navigate('/app/ielts/reading')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 transition">
            <ChevronLeft size={16} /> Back
          </button>
          <p className="font-semibold text-sm truncate">{title}</p>
        </div>
        <div className="flex-1 p-4 max-w-3xl w-full mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="font-bold text-gray-900">Natija topilmadi</p>
            <p className="text-sm text-gray-500 mt-1">
              Bu sahifani refresh qilsangiz, frontend state yo'qoladi. "Back" bosib qaytib, testni yana yakunlang.
            </p>
            <button onClick={() => navigate('/app/ielts/reading')}
              className="mt-4 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition">
              Back to list
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleTryAgain = async () => {
    if (!passageId) return
    setRetrying(true)
    try {
      const res = await api.post(`/ielts/reading/${passageId}/start/`)
      navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${passageId}${partsQuery}&title=${encodeURIComponent(title)}`)
    } finally {
      setRetrying(false)
    }
  }

  const handleFeedbackSubmit = () => {
    if (!feedbackText.trim()) return
    setFeedbackSent(true)
    setTimeout(() => setFeedbackSent(false), 2000)
    setFeedbackText('')
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-sky-100">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 transition">
          <ChevronLeft size={16} /> Back
        </button>
        <p className="flex-1 font-semibold text-sm truncate">{title}</p>
        <button onClick={() => navigate('/app/ielts/history')}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto w-full space-y-4">

          {/* Score card */}
          <div className="bg-white border border-sky-100 rounded-2xl p-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-sky-100 mx-auto flex items-center justify-center">
                <CheckCircle2 size={28} className="text-sky-500" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mt-3">Test Complete!</h2>
              <p className="text-sm text-gray-400">Here are your results</p>
            </div>

            <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50/40 px-5 py-4 flex items-center justify-between">
              <p className="text-gray-600 font-medium">Your Score:</p>
              <div className="text-right">
                <p className={`text-5xl font-black text-sky-600`}>
                  {summary.correct} / {summary.total}
                </p>
                {summary.isFull ? (
                  <p className={`text-xl font-bold mt-1 ${bandColor(summary.band)}`}>
                    Band {Number(summary.band).toFixed(1)}
                    <span className="text-sm font-normal text-gray-500 ml-2">• {summary.scorePercent}%</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">{summary.scorePercent}%</p>
                )}
              </div>
            </div>

            {/* Band info — only for full test */}
            {summary.isFull && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { label: 'Band Score', value: Number(summary.band).toFixed(1), color: bandColor(summary.band) },
                  { label: 'Correct', value: `${summary.correct}/${summary.total}`, color: 'text-gray-700' },
                  { label: 'Percentage', value: `${summary.scorePercent}%`, color: 'text-gray-700' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl py-3 text-center">
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Answer sheet */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-black text-gray-900">Answer Sheet</p>
                <p className="text-sm text-gray-400 mt-0.5">{summary.correct} correct · {summary.total - summary.correct} wrong</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
                <div
                  onClick={() => setShowCorrect(p => !p)}
                  className={`w-10 h-6 rounded-full relative transition-colors ${showCorrect ? 'bg-sky-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${showCorrect ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">Show Correct Answers</span>
              </label>
            </div>
            <div className="p-4">
              {summary.results.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.results.map(r => {
                    const ua = displayAnswer(r.user_answer)
                    const ca = (r.correct_answers_list?.length > 0 ? r.correct_answers_list : [r.correct_answer]).filter(Boolean).join(' / ')
                    return (
                      <div key={r.question_id} className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-gray-50 border-gray-100 text-sm">
                        <span className="w-7 h-7 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 bg-slate-400 text-white">{r.number}</span>
                        <span className="font-semibold text-gray-600">{ua}</span>
                        {r.is_correct
                          ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                          : <XCircle size={15} className="text-red-400 flex-shrink-0" />}
                        {showCorrect && !r.is_correct && ca && (
                          <>
                            <span className="text-gray-300 flex-shrink-0">|</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">Correct:</span>
                            <span className="font-bold text-emerald-600">{ca}</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Feedback */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xl font-black text-gray-900 mb-3">Leave Your Feedback</p>
            <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)}
              placeholder="Please leave feedback..." rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400" />
            <button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}
              className="mt-3 w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-200 text-white font-bold transition">
              {feedbackSent ? 'Feedback Sent ✓' : 'Submit Feedback'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4">
            <button onClick={() => navigate('/app')}
              className="h-14 rounded-xl bg-gray-100 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition">
              <Home size={16} /> Back to Home
            </button>
            <button onClick={() => navigate('/app/ielts/reading')}
              className="h-14 rounded-xl bg-gray-100 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition">
              <BookOpen size={16} /> Reading tests
            </button>
            <button
              onClick={() => navigate(`/exam/ielts/reading/${attemptId}?passage=${passageId}${partsQuery}&title=${encodeURIComponent(title)}&mode=review`)}
              className="h-14 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-semibold flex items-center justify-center gap-2 hover:bg-sky-100 transition">
              <ListChecks size={16} /> Review Test
            </button>
            <button onClick={handleTryAgain} disabled={retrying}
              className="h-14 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition">
              <RotateCcw size={16} /> {retrying ? 'Loading...' : 'Try Again'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
