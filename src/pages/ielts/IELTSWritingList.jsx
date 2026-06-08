import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  PenLine,
  Clock,
  Star,
  Loader2,
  ChevronLeft,
  History,
  Edit3,
  Leaf,
  FileText,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

const DIFF_STYLES = {
  EASY: { tone: 'text-emerald-600', wrap: 'bg-emerald-50 border-emerald-200' },
  MEDIUM: { tone: 'text-slate-600', wrap: 'bg-slate-50 border-slate-200' },
  HARD: { tone: 'text-red-600', wrap: 'bg-red-50 border-red-200' },
}

function DifficultyBadge({ difficulty }) {
  const key = difficulty || 'MEDIUM'
  const style = DIFF_STYLES[key] || DIFF_STYLES.MEDIUM
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${style.wrap} ${style.tone}`}>
      {key}
    </span>
  )
}

export default function IELTSWritingList() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [activeTask, setActiveTask] = useState('ALL')
  const [activeDiff, setActiveDiff] = useState('ALL')
  const [starting, setStarting] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ielts-writing-tasks'],
    queryFn: () => api.get('/ielts/writing/').then((r) => r.data),
    staleTime: 60_000,
  })

  const tasks = useMemo(() => {
    const filtered = (data || []).filter((t) => {
      if (activeTask !== 'ALL' && String(t.task_type) !== activeTask) return false
      if (activeDiff !== 'ALL' && t.difficulty !== activeDiff) return false
      return true
    })
    return [...filtered.filter(t => !t.is_premium), ...filtered.filter(t => t.is_premium)]
  }, [data, activeTask, activeDiff])

  const handleStart = async (task) => {
    if (task.is_premium && !user?.is_premium) return
    setStarting(task.id)
    try {
      const res = await api.post(`/ielts/writing/${task.id}/start/`)
      navigate(`/exam/ielts/writing/${res.data.attempt_id}?task=${task.id}`)
    } catch {
      setStarting(null)
    }
  }

  return (
    <div className="min-h-[60vh] max-w-6xl mx-auto space-y-6">
      {/* Top bar — skrinshot uslubi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/app/ielts')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-sky-600 transition w-fit"
        >
          <ChevronLeft size={18} />
          Back
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 text-center sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:pointer-events-none">
          Writing
        </h1>
        <div className="flex items-center gap-2 justify-end flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/app/ielts/history')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <History size={16} />
            History
          </button>
          <button
            type="button"
            onClick={() => navigate('/exam/ielts/writing/own')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition"
          >
            <Edit3 size={16} />
            Own Writing
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Choose a writing test</h2>
        <p className="text-sm text-gray-500 mt-1">Pick a task and start when you are ready.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {['ALL', '1', '2'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTask(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTask === t ? 'gradient-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t === 'ALL' ? 'All' : `Task ${t}`}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          {['ALL', 'EASY', 'MEDIUM', 'HARD'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDiff(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeDiff === d
                  ? 'bg-sky-500 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {d === 'ALL' ? 'All' : d.charAt(0) + d.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-2xl">
          <PenLine size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task, i) => {
            const locked = task.is_premium && !user?.is_premium
            const isStarting = starting === task.id
            const isCompleted = Boolean(task.attempted)
            return (
              <motion.article
                key={task.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md transition-shadow ${
                  locked ? 'border-gray-200' : 'border-gray-200'
                }`}
              >
                {(isCompleted || task.is_premium) && (
                  <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1.5">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm">
                        <CheckCircle2 size={12} className="text-emerald-600 shrink-0" strokeWidth={2.25} />
                        Completed
                      </span>
                    )}
                    {task.is_premium && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                        <Star size={10} className="fill-slate-500 text-slate-500" />
                        Premium
                      </span>
                    )}
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-3">
                  <Leaf size={14} className="text-emerald-600" />
                  Task {task.task_type}
                </div>

                <h3 className="font-bold text-gray-900 text-base leading-snug pr-16 min-h-[3rem]">{task.title}</h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">Complete the writing task as described.</p>

                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-gray-500">
                  <DifficultyBadge difficulty={task.difficulty} />
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    {task.time_limit ?? 40} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText size={12} className="text-gray-400" />
                    Min {task.min_words ?? 150} words
                  </span>
                </div>

                {locked ? (
                  <div className="mt-5 flex justify-center">
                    <button
                      type="button"
                      onClick={() => navigate('/app/subscription')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-semibold transition-colors hover:bg-sky-100 hover:border-sky-300"
                    >
                      <Lock size={10} /> Premium
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStart(task)}
                    disabled={isStarting}
                    className="mt-5 w-full py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 gradient-primary text-white shadow-glow hover:opacity-95 disabled:opacity-60"
                  >
                    {isStarting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : isCompleted ? (
                      'Restart Test'
                    ) : (
                      'Start Test'
                    )}
                  </button>
                )}
              </motion.article>
            )
          })}
        </div>
      )}
    </div>
  )
}

