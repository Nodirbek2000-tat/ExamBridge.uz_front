import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trophy, BarChart3, Eye, RotateCcw, Calendar, Trash2, X, AlertTriangle } from 'lucide-react'
import api from '../../api/client'

const MOD_ORDER = ['ENGLISH_M1','ENGLISH_M2_EASY','ENGLISH_M2_MEDIUM','ENGLISH_M2_HARD','MATH_M1','MATH_M2_EASY','MATH_M2_MEDIUM','MATH_M2_HARD']
const MOD_LABELS = {
  ENGLISH_M1: 'English M1',
  ENGLISH_M2_EASY: 'English M2 Easy',
  ENGLISH_M2_MEDIUM: 'English M2 Medium',
  ENGLISH_M2_HARD: 'English M2 Hard',
  MATH_M1: 'Math M1',
  MATH_M2_EASY: 'Math M2 Easy',
  MATH_M2_MEDIUM: 'Math M2 Medium',
  MATH_M2_HARD: 'Math M2 Hard',
}
const MOD_COLORS = {
  ENGLISH: 'bg-sky-500',
  MATH: 'bg-amber-500',
}

function modKey(stat) {
  return `${stat.section}_M${stat.module_number}_${stat.difficulty_variant}`
    .replace('_STANDARD', '')
    .replace('M1_', 'M1')
    .replace('M2_', 'M2_')
}

function modLabel(stat) {
  const section = stat.section === 'ENGLISH' ? 'English' : 'Math'
  if (stat.module_number === 1) return `${section} M1`
  const v = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }[stat.difficulty_variant] || stat.difficulty_variant
  return `${section} M2 ${v}`
}

function ScoreRing({ score, max = 800, size = 80, color = '#3b82f6' }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const dash = (score / max) * circ
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="7" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black text-gray-900 leading-none">{score}</span>
        <span className="text-[10px] text-gray-400">{max}</span>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({ onConfirm, onCancel, isPending }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div>
            <div className="font-bold text-gray-900">Natijani o'chirish</div>
            <div className="text-sm text-gray-500">Bu amalni qaytarib bo'lmaydi</div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Ushbu test natijasi va barcha javoblar bazadan butunlay o'chiriladi.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-60"
          >
            {isPending ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function AttemptCard({ result, idx, onViewResult, onDeleted }) {
  const [expanded, setExpanded] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/sat/result/${result.result_id}/delete/`),
    onSuccess: () => {
      setShowConfirm(false)
      onDeleted()
    },
  })

  const date = result.completed_at
    ? new Date(result.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  // Sort module_stats in display order
  const sortedMods = [...(result.module_stats || [])].sort((a, b) => {
    const la = modLabel(a)
    const lb = modLabel(b)
    return la.localeCompare(lb)
  })

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Attempt header */}
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center">
          <span className="text-xs font-black text-sky-600">#{idx + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-3xl text-gray-900 tabular-nums">{result.total_score}</span>
            <span className="text-sm text-gray-400 font-medium">/ 1600</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400 mt-0.5">
            <Calendar size={11} />
            {date}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreRing score={result.english_score} color="#3b82f6" size={64} />
          <ScoreRing score={result.math_score} color="#f59e0b" size={64} />
        </div>

        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <button
            onClick={() => onViewResult(result.result_id)}
            className="flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3.5 py-2 rounded-lg transition-colors"
          >
            <Eye size={12} />
            View Detail
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 px-3.5 py-2 rounded-lg transition-colors"
          >
            <BarChart3 size={12} />
            {expanded ? 'Hide' : 'Analysis'}
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            O'chirish
          </button>
        </div>
      </div>

      {/* Module breakdown */}
      {expanded && sortedMods.length > 0 && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-gray-100 px-5 py-4"
        >
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Modullar bo'yicha tahlil
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sortedMods.map((stat, si) => {
              const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0
              const isEng = stat.section === 'ENGLISH'
              return (
                <div key={si} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="text-sm font-bold text-gray-700">{modLabel(stat)}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900">{stat.correct}</span>
                    <span className="text-sm text-gray-400">/ {stat.total}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isEng ? 'bg-sky-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">{pct}% correct</div>
                </div>
              )
            })}
          </div>

          {/* Score labels */}
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-sky-500 rounded-full" />
              English: {result.english_score} / 800 (raw {result.english_raw}/54)
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 bg-amber-500 rounded-full" />
              Math: {result.math_score} / 800 (raw {result.math_raw}/44)
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>

    <AnimatePresence>
      {showConfirm && (
        <ConfirmDeleteModal
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setShowConfirm(false)}
          isPending={deleteMutation.isPending}
        />
      )}
    </AnimatePresence>
    </>
  )
}

export default function SATTestResults() {
  const { testId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sat-test-results', testId],
    queryFn: () => api.get(`/sat/tests/${testId}/results/`).then(r => r.data),
  })

  const handleDeleted = () => {
    queryClient.invalidateQueries({ queryKey: ['sat-test-results', testId] })
  }

  const startMutation = useMutation({
    mutationFn: () => api.post(`/sat/tests/${testId}/start/`).then(r => r.data),
    onSuccess: (d) => navigate(`/exam/sat/${d.attempt_id}`),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  const { test, attempts_count, best_score, results = [] } = data || {}

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 space-y-7">
      {/* Back */}
      <button onClick={() => navigate('/app/sat/tests')}
        className="flex items-center gap-1.5 text-[15px] text-gray-500 hover:text-gray-900 transition-colors">
        <ArrowLeft size={16} />
        Back to Tests
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{test}</h1>
          <p className="text-[15px] text-gray-500 mt-1.5">
            {attempts_count} ta urinish · Eng yuqori ball: <strong className="text-gray-900">{best_score ?? '—'}</strong>
          </p>
        </div>
        <button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 text-white font-bold text-[15px] hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/25 disabled:opacity-50 flex-shrink-0"
        >
          <RotateCcw size={15} />
          Qayta yechish
        </button>
      </div>

      {/* Best score banner */}
      {best_score && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Trophy size={22} className="text-white" />
          </div>
          <div>
            <div className="text-xs font-bold text-sky-200 uppercase tracking-wider">Eng yuqori ball</div>
            <div className="text-5xl font-black tabular-nums">{best_score}</div>
            <div className="text-sky-200 text-sm mt-0.5">400 – 1600</div>
          </div>
        </motion.div>
      )}

      {/* Progress chart — score trend (always shown) */}
      {results.length >= 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-bold text-gray-700">Ballar dinamikasi</div>
            <div className="text-xs text-gray-400">{results.length} ta urinish</div>
          </div>
          {/* Chart */}
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[9px] text-gray-400 pr-1" style={{ width: 32 }}>
              {[1600, 1400, 1200, 1000, 800, 600, 400].map(v => (
                <span key={v} className="text-right leading-none">{v}</span>
              ))}
            </div>
            {/* Bars */}
            <div className="ml-8">
              {/* Grid lines */}
              <div className="relative h-48 border-l border-b border-gray-200">
                {[1400, 1200, 1000, 800, 600].map(v => (
                  <div key={v} className="absolute left-0 right-0 border-t border-dashed border-gray-100"
                    style={{ bottom: `${((v - 400) / 1200) * 100}%` }} />
                ))}
                {/* Bar group */}
                <div className="absolute inset-0 flex items-end gap-1.5 px-2 pb-0">
                  {[...results].reverse().map((r, i) => {
                    const totalPct = ((r.total_score - 400) / 1200) * 100
                    const engPct   = ((r.english_score - 200) / 600) * 100
                    const mathPct  = ((r.math_score - 200) / 600) * 100
                    const date = r.completed_at
                      ? new Date(r.completed_at).toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' })
                      : `#${i + 1}`
                    return (
                      <div key={r.result_id} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                        {/* Score tooltip */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {r.total_score}
                        </div>
                        {/* Total bar (background) */}
                        <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '100%', position: 'relative' }}>
                          {/* English */}
                          <div className="flex-1 rounded-t-sm bg-sky-400 transition-all duration-500"
                            style={{ height: `${Math.max(engPct, 2)}%` }} title={`English: ${r.english_score}`} />
                          {/* Math */}
                          <div className="flex-1 rounded-t-sm bg-amber-400 transition-all duration-500"
                            style={{ height: `${Math.max(mathPct, 2)}%` }} title={`Math: ${r.math_score}`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* X-axis labels */}
              <div className="flex gap-1.5 px-2 mt-1">
                {[...results].reverse().map((r, i) => {
                  const date = r.completed_at
                    ? new Date(r.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : `#${i + 1}`
                  return (
                    <div key={r.result_id} className="flex-1 text-center">
                      <div className="text-[9px] text-gray-400 leading-tight">{date}</div>
                      <div className="text-[10px] font-black text-gray-700">{r.total_score}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-sky-400" /> R&W</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2.5 rounded-sm bg-amber-400" /> Math</div>
          </div>
        </div>
      )}

      {/* Attempts list */}
      <div className="space-y-3">
        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Barcha urinishlar</div>
        {results.map((r, i) => (
          <AttemptCard
            key={r.result_id}
            result={r}
            idx={i}
            onViewResult={(rid) => navigate(`/app/sat/result/${rid}`)}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  )
}
