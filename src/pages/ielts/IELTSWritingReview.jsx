import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, PenLine, Star, FileText, AlignLeft, Loader2 } from 'lucide-react'
import api from '../../api/client'

const CRITERIA_LABELS = {
  task_achievement: 'Task Achievement',
  task_response: 'Task Response',
  coherence_cohesion: 'Coherence & Cohesion',
  lexical_resource: 'Lexical Resource',
  grammatical_range: 'Grammatical Range & Accuracy',
}

function BandCircle({ value, label }) {
  const n = parseFloat(value)
  const color = n >= 7 ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
    : n >= 5 ? 'text-sky-600 border-sky-300 bg-sky-50'
    : 'text-orange-500 border-orange-300 bg-orange-50'
  return (
    <div className={`rounded-2xl border p-4 text-center ${color}`}>
      <p className="text-3xl font-black">{isNaN(n) ? value : n.toFixed(1)}</p>
      <p className="text-xs font-medium mt-1 opacity-70 leading-tight">{label}</p>
    </div>
  )
}

export default function IELTSWritingReview() {
  const { responseId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['writing-review', responseId],
    queryFn: () => api.get(`/ielts/writing/result/${responseId}/`).then(r => r.data),
    enabled: !!responseId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-sky-400" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">Review not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold">
          Go Back
        </button>
      </div>
    )
  }

  const criteria = data.ai_criteria || {}
  const hasCriteria = Object.keys(criteria).length > 0

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-sky-600 transition">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <PenLine size={16} className="text-amber-500" />
        </div>
        <div>
          <h1 className="font-black text-gray-900 text-lg leading-tight">
            {data.task_title || `Writing Task ${data.task_type}`}
          </h1>
          <p className="text-xs text-gray-400">Task {data.task_type} · {data.word_count} words</p>
        </div>
      </div>

      {/* Score overview */}
      {data.ai_band && (
        <div className={`rounded-2xl border p-5 text-center ${
          parseFloat(data.ai_band) >= 7 ? 'bg-emerald-50 border-emerald-200'
          : parseFloat(data.ai_band) >= 5 ? 'bg-sky-50 border-sky-200'
          : 'bg-orange-50 border-orange-200'
        }`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Overall Band</p>
          <p className={`text-5xl font-black ${
            parseFloat(data.ai_band) >= 7 ? 'text-emerald-600'
            : parseFloat(data.ai_band) >= 5 ? 'text-sky-600'
            : 'text-orange-500'
          }`}>
            {parseFloat(data.ai_band).toFixed(1)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{data.word_count} words written</p>
        </div>
      )}

      {/* Criteria breakdown */}
      {hasCriteria && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-bold text-gray-800 mb-4">Criteria Scores</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(criteria).map(([key, val]) => (
              <BandCircle key={key} value={val} label={CRITERIA_LABELS[key] || key.replace(/_/g, ' ')} />
            ))}
          </div>
        </div>
      )}

      {/* Task prompt */}
      {data.task_prompt && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FileText size={15} className="text-gray-400" /> Task Prompt
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">{data.task_prompt}</p>
        </div>
      )}

      {/* User's response */}
      {data.response_text && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-bold text-gray-800 mb-2 flex items-center gap-2">
            <AlignLeft size={15} className="text-gray-400" /> Your Response
          </p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{data.response_text}</p>
          <p className="text-xs text-gray-400 mt-2">{data.word_count} words</p>
        </div>
      )}

      {/* AI Feedback */}
      {data.ai_feedback && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Star size={16} className="text-yellow-400" /> AI Feedback
          </p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{data.ai_feedback}</p>
        </div>
      )}
    </div>
  )
}
