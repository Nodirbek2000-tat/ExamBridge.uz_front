import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw, ChevronLeft, Home, ListChecks, BookOpen } from 'lucide-react'
import api from '../../api/client'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />
}

function displayUserAnswer(v) {
  const s = v == null ? '' : String(v).trim()
  return s || 'N/A'
}

export default function CEFRReadingResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  const title = decodeURIComponent(searchParams.get('title') || 'CEFR Reading')
  const passageId = Number(searchParams.get('passage') || 0)
  const attemptId = location.pathname.split('/').filter(Boolean).at(-2)
  const result = location.state?.result

  const summary = useMemo(() => {
    if (!result) return null
    const correct = result.correct ?? 0
    const total = result.total ?? 0
    const scorePercent = result.score_percent ?? (total ? Math.round((correct / total) * 100) : 0)
    const cefrScore = result.cefr_score ?? null
    const cefrLevel = result.cefr_level ?? '—'
    return { correct, total, scorePercent, cefrScore, cefrLevel, results: result.results ?? [] }
  }, [result])

  if (!summary) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-sky-100">
          <button
            type="button"
            onClick={() => navigate('/app/cefr/reading')}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 transition"
          >
            <ChevronLeft size={16} />
            Back
          </button>
          <p className="font-semibold text-sm truncate">{title}</p>
        </div>
        <div className="flex-1 p-4 max-w-3xl w-full mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="font-bold text-gray-900">Natija topilmadi</p>
            <p className="text-sm text-gray-500 mt-1">Refreshdan keyin state yo‘qoladi. Ro‘yxatdan testni qayta yakunlang.</p>
            <button
              type="button"
              onClick={() => navigate('/app/cefr/reading')}
              className="mt-4 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition"
            >
              Reading testlar
            </button>
          </div>
        </div>
      </div>
    )
  }

  const scoreColor = summary.cefrLevel === 'C1' ? 'text-indigo-600' : summary.cefrLevel === 'B2' ? 'text-emerald-600' : 'text-sky-600'
  const bandBg = summary.cefrLevel === 'C1' ? 'bg-indigo-50 border-indigo-100' : summary.cefrLevel === 'B2' ? 'bg-emerald-50 border-emerald-100' : 'bg-sky-50 border-sky-100'
  const iconBg = summary.cefrLevel === 'C1' ? 'bg-indigo-100 text-indigo-500' : summary.cefrLevel === 'B2' ? 'bg-emerald-100 text-emerald-500' : 'bg-sky-100 text-sky-500'

  const handleTryAgain = async () => {
    if (!passageId) return
    setRetrying(true)
    try {
      const res = await api.post(`/cefr/reading/${passageId}/start/`)
      navigate(`/exam/cefr/reading/${res.data.attempt_id}?passage=${passageId}&title=${encodeURIComponent(title)}`)
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
    <div className="h-full flex flex-col bg-white">
      <div className="h-14 px-4 flex items-center gap-3 bg-white border-b border-sky-100">
        <button
          type="button"
          onClick={() => navigate('/app/cefr/reading')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 transition"
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <p className="flex-1 font-semibold text-sm truncate">{title}</p>
        <button
          type="button"
          onClick={() => navigate('/app/cefr/reading')}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto w-full space-y-4">
          <div className={`bg-white border rounded-2xl p-6 ${bandBg}`}>
            <div className="text-center">
              <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${iconBg}`}>
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mt-3">Test Complete!</h2>
              <p className="text-sm text-gray-400">Here are your CEFR Reading results</p>
            </div>

            <div className={`mt-6 rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${bandBg}`}>
              <div>
                <p className="text-gray-600 font-medium">Your Score</p>
                <p className={`text-sm mt-0.5 ${scoreColor}`}>{summary.correct} correct of {summary.total}</p>
              </div>
              <div className="text-right">
                {summary.cefrScore != null && (
                  <p className={`text-6xl font-black ${scoreColor}`}>{summary.cefrScore}</p>
                )}
                <p className={`text-2xl font-black mt-1 ${scoreColor}`}>
                  CEFR {summary.cefrLevel}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">{summary.scorePercent}%</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { label: 'CEFR Score', value: summary.cefrScore ?? '—', color: scoreColor },
                { label: 'Level', value: `CEFR ${summary.cefrLevel}`, color: scoreColor },
                { label: 'Correct', value: `${summary.correct}/${summary.total}`, color: 'text-gray-700' },
              ].map((s, i) => (
                <div key={i} className="bg-white/70 rounded-xl py-3 text-center border border-white">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-2xl font-black text-gray-900">Answer Sheet</p>
              <button
                type="button"
                onClick={() => setShowCorrectAnswers((p) => !p)}
                className={`inline-flex items-center gap-2 text-sm font-semibold ${showCorrectAnswers ? 'text-emerald-700' : 'text-gray-500'}`}
              >
                <span className={`w-11 h-6 rounded-full p-0.5 transition ${showCorrectAnswers ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  <span className={`block w-5 h-5 rounded-full bg-white transition ${showCorrectAnswers ? 'translate-x-5' : 'translate-x-0'}`} />
                </span>
                Show Correct Answers
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
              {summary.results.length === 0 ? (
                <div className="md:col-span-2 space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                summary.results.map((r) => (
                  <div key={r.question_id} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">{r.number}</div>
                    <span className="text-sm text-gray-600 truncate max-w-[40%]">{displayUserAnswer(r.user_answer)}</span>
                    <span className={r.is_correct ? 'text-emerald-600' : 'text-red-500'}>{r.is_correct ? '✓' : '✕'}</span>
                    {showCorrectAnswers && (
                      <span className="text-sm">
                        <span className="text-emerald-600 font-semibold">Correct:</span>{' '}
                        <span className="font-semibold text-gray-800">{r.correct_answer}</span>
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xl font-black text-gray-900 mb-3">Leave Your Feedback</p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Please leave feedback..."
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
            />
            <button
              type="button"
              onClick={handleFeedbackSubmit}
              disabled={!feedbackText.trim()}
              className="mt-3 w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-200 text-white font-bold transition"
            >
              {feedbackSent ? 'Feedback Sent' : 'Submit Feedback'}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate('/app')}
              className="h-14 rounded-xl bg-gray-100 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition"
            >
              <Home size={16} /> Back to Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/cefr/reading')}
              className="h-14 rounded-xl bg-gray-100 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition"
            >
              <BookOpen size={16} /> Reading tests
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/exam/cefr/reading/${attemptId}?passage=${passageId}&title=${encodeURIComponent(title)}`, {
                  state: { reviewData: result },
                })
              }
              className="h-14 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 font-semibold flex items-center justify-center gap-2 hover:bg-sky-100 transition"
            >
              <ListChecks size={16} /> Review Test
            </button>
            <button
              type="button"
              onClick={handleTryAgain}
              disabled={retrying}
              className="h-14 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition"
            >
              <RotateCcw size={16} /> {retrying ? 'Loading...' : 'Try Again'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



