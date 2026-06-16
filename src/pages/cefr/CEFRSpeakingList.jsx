import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Mic, Loader2, ChevronLeft, Clock, Layers, CheckCircle2, RotateCcw } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

function speakingMeta(task) {
  if (task.test_type === 'MOCK') return { time: '11–14 min', detail: '3 Parts', badge: 'Full Mock' }
  const n = task.question_count || 0
  return { time: '~4–5 min', detail: n ? `${n} questions` : 'Speaking', badge: `Part ${task.part}` }
}

export default function CEFRSpeakingList() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const [filter, setFilter] = useState('all')
  const [starting, setStarting] = useState(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['cefr-speaking-tasks'],
    queryFn: () => api.get('/ielts/speaking/?source=CEFR').then(r => r.data),
  })

  const filtered = useMemo(() => {
    if (filter === 'all') return data
    if (filter === 'mock') return data.filter(t => t.test_type === 'MOCK')
    return data.filter(t => t.part === Number(filter))
  }, [data, filter])

  const handleStart = async (task) => {
    if (task.is_premium && !user?.is_premium) return
    setStarting(task.id)
    try {
      const res = await api.post('/ielts/attempt/start/', { task_type: 'speaking', task_id: task.id })
      navigate(`/exam/cefr/speaking/${task.id}?attempt=${res.data.attempt_id}`)
    } catch {
      navigate(`/exam/cefr/speaking/${task.id}`)
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="min-h-[60vh] max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button type="button" onClick={() => navigate('/app/cefr')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 transition w-fit">
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:pointer-events-none">
          CEFR Speaking
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['all','All'],['1','Part 1'],['2','Part 2'],['3','Part 3'],['mock','Full Mock']].map(([val,label]) => (
          <button key={val} type="button" onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filter === val
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl border border-gray-100 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-2xl">
          <Mic size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No CEFR speaking tasks yet</p>
          <p className="text-sm mt-1">Admin paneldan CEFR speaking task qo'shing</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((task) => {
            const meta = speakingMeta(task)
            const locked = task.is_premium && !user?.is_premium
            const isStarting = starting === task.id
            const attemptsCount = task.attempts_count ?? 0
            const isCompleted = !locked && Boolean(task.attempted || attemptsCount > 0)
            return (
              <div
                key={task.id}
                className="rounded-xl border border-gray-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className={`font-bold ${locked ? 'text-gray-500' : 'text-gray-900'}`}>{task.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      task.is_premium ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {task.is_premium ? 'Premium' : 'Free'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{meta.badge} · Speaking</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                      <Mic size={12} className="text-emerald-600" /> {meta.badge}
                    </span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock size={14} /> {meta.time}</span>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap"><Layers size={14} /> {meta.detail}</span>
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold ${attemptsCount > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                      <RotateCcw size={12} /> {attemptsCount} attempt{attemptsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-0 w-full sm:w-auto sm:items-end shrink-0">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 -translate-y-1.5 mb-2 text-[11px] font-semibold text-emerald-700 leading-none">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" strokeWidth={2.25} />
                      Completed
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleStart(task)}
                    disabled={locked || isStarting}
                    className={`w-full sm:w-auto px-5 h-10 rounded-lg text-sm font-bold transition disabled:opacity-60 ${
                      locked ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isStarting ? <Loader2 size={15} className="animate-spin mx-auto" />
                      : locked ? 'Locked'
                      : isCompleted ? 'Re-do test'
                      : 'Start test'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
