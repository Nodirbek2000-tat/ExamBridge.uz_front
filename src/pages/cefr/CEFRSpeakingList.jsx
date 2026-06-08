import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mic, Loader2, ChevronLeft, Clock, Layers, Star, CheckCircle2, History, Eye } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

function bandColor(b) {
  const n = parseFloat(b)
  if (n >= 7) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (n >= 5) return 'text-sky-600 bg-sky-50 border-sky-200'
  return 'text-orange-500 bg-orange-50 border-orange-200'
}

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

  const { data: history = [] } = useQuery({
    queryKey: ['cefr-speaking-history'],
    queryFn: () => api.get('/ielts/speaking/history/?source=CEFR').then(r => r.data),
    staleTime: 30_000,
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
      navigate(`/exam/cefr/speaking/${task.id}?attempt=${res.data.id}`)
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task, i) => {
            const meta = speakingMeta(task)
            const locked = task.is_premium && !user?.is_premium
            const isStarting = starting === task.id
            return (
              <motion.article key={task.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-md hover:shadow-lg transition-shadow ${
                  locked ? 'opacity-75 border-gray-100' : 'border-gray-100'
                }`}>
                {task.is_premium && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                      <Star size={10} className="fill-slate-500 text-slate-500" /> Premium
                    </span>
                  </div>
                )}
                {task.attempted && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Completed
                    </span>
                  </div>
                )}

                <div className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4">
                  <Mic size={13} className="text-emerald-600" /> {meta.badge}
                </div>

                <h3 className="font-bold text-gray-900 text-lg leading-snug pr-14 min-h-[3rem]">{task.title}</h3>

                <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5"><Clock size={14} className="text-gray-400" />{meta.time}</span>
                  <span className="inline-flex items-center gap-1.5"><Layers size={14} className="text-gray-400" />{meta.detail}</span>
                </div>

                <button type="button" onClick={() => handleStart(task)}
                  disabled={locked || isStarting}
                  className={`mt-6 w-full py-3.5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 ${
                    locked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  }`}>
                  {isStarting ? <Loader2 size={18} className="animate-spin" />
                    : locked ? 'Locked'
                    : task.attempted ? 'Restart Test'
                    : 'Start Test'}
                </button>
              </motion.article>
            )
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
              <History size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-gray-900">O'tgan sinovlar</h2>
            <span className="text-xs font-semibold text-gray-400 ml-1">({history.length})</span>
          </div>
          <div className="space-y-2">
            {history.map(entry => {
              const band = parseFloat(entry.ai_band) || 0
              return (
                <div key={entry.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Mic size={15} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{entry.task_title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Part {entry.task_part} · {entry.created_at?.slice(0, 10)}</p>
                  </div>
                  {entry.ai_band && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-black border flex-shrink-0 ${bandColor(entry.ai_band)}`}>
                      {parseFloat(entry.ai_band).toFixed(1)}
                    </span>
                  )}
                  <button onClick={() => navigate(`/exam/cefr/speaking/result/${entry.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition flex-shrink-0">
                    <Eye size={12} /> Review
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
