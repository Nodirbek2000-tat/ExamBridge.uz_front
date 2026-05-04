import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, FileText, Play,
} from 'lucide-react'
import api from '../../api/client'

const SECTION_LABEL = { ENGLISH: 'R&W', MATH: 'Math' }
const VARIANT_SHORT = { STANDARD: 'M1', EASY: 'Easy', MEDIUM: 'Med', HARD: 'Hard' }
function moduleLabel(a) {
  const sec = a.section === 'ENGLISH' ? 'Reading & Writing' : 'Math'
  if (a.module_number === 1) return `${sec} — Module 1`
  const v = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }[a.difficulty_variant] || a.difficulty_variant
  return `${sec} — Module 2 (${v})`
}

function shortLabel(a) {
  const sec = SECTION_LABEL[a.section] || a.section
  const v = VARIANT_SHORT[a.difficulty_variant] || a.difficulty_variant
  return a.module_number === 1 ? `${sec} M1` : `${sec} M2 ${v}`
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateFull(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// ── Review Answers Tab ───────────────────────────────────────────────────────
function ReviewAnswersTab({ attempts, navigate, testName }) {
  if (!attempts.length) return (
    <div className="text-center py-16 text-gray-400">
      <FileText size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-semibold">No attempts yet</p>
      <p className="text-sm mt-1">Complete a module to review your answers here</p>
    </div>
  )

  const sorted = useMemo(() => [...attempts].sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at)), [attempts])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-black text-gray-900">Module practice results</h2>
        <p className="text-sm text-gray-500 mt-1 leading-snug">
          {sorted.length} attempt{sorted.length !== 1 ? 's' : ''}. Tap a card for full review.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {sorted.map((att, idx) => {
          const title = testName ? `${testName} — ${shortLabel(att)}` : shortLabel(att)
          const go = () => navigate(`/app/sat/module-result/${att.attempt_id}`)
          return (
            <motion.div
              key={att.attempt_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
            >
              <button
                type="button"
                onClick={go}
                className="w-full text-left rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm flex flex-col min-h-[220px] hover:border-gray-300 hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
              >
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm sm:text-[15px] leading-snug line-clamp-2">{title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1.5 line-clamp-2">{moduleLabel(att)}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(att.finished_at)}</p>
                </div>

                <div className="mt-4 flex flex-col items-center text-center py-2 flex-1 justify-center">
                  <p className="text-xs font-medium text-gray-500">Questions correct</p>
                  <p className="text-3xl sm:text-4xl font-black tabular-nums text-gray-900 leading-none mt-1">
                    {att.correct}/{att.total}
                  </p>
                </div>

                <div className="mt-4 w-full rounded-full py-2.5 px-3 text-center text-sm font-bold bg-sky-50 text-sky-800 border border-sky-100/80 pointer-events-none">
                  Score details
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function SATModuleHistory() {
  const { testId } = useParams()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['sat-individual-stats', testId],
    queryFn: () => api.get(`/sat/tests/${testId}/individual-stats/`).then(r => r.data),
  })

  if (isLoading) return (
    <div className="min-h-screen bg-[#f8f9fb] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  const { test, total_attempts = 0, attempts = [] } = data || {}

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-6">
        {/* Back */}
        <button onClick={() => navigate('/app/sat/tests')}
          className="flex items-center gap-1.5 text-[15px] text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft size={16} />
          Back to Tests
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-gray-900">{test}</h1>
            <p className="text-[15px] text-gray-500 mt-1">
              Individual module history · {total_attempts} attempt{total_attempts !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => navigate(`/app/sat/modules/${testId}`)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 text-white font-bold text-[15px] hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25 flex-shrink-0"
          >
            <Play size={14} />
            Practice
          </button>
        </div>

        <div className="flex items-center gap-2 text-gray-800">
          <FileText size={16} className="text-gray-500" />
          <h2 className="text-lg font-bold">Review Answers</h2>
        </div>

        <ReviewAnswersTab attempts={attempts} navigate={navigate} testName={test} />
      </div>
    </div>
  )
}
