import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Loader2, ChevronLeft, Leaf, Clock, Layers, Star,
  History, Play, Pause, Square, ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

// ── Mini audio player ────────────────────────────────────────────────────────
function MiniAudioPlayer({ src }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  if (!src) return null

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause(); setPlaying(false) }
    else { a.play(); setPlaying(true) }
  }

  const fmt = s => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => { setPlaying(false); setProgress(0) }}
        onTimeUpdate={e => setProgress(e.target.currentTime)}
        onLoadedMetadata={e => setDuration(e.target.duration)}
      />
      <button type="button" onClick={toggle}
        className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 hover:bg-sky-600 transition">
        {playing
          ? <Pause size={11} className="text-white" />
          : <Play size={11} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="relative h-1.5 bg-sky-100 rounded-full overflow-hidden cursor-pointer"
          onClick={e => {
            const a = audioRef.current
            if (!a || !duration) return
            const rect = e.currentTarget.getBoundingClientRect()
            a.currentTime = ((e.clientX - rect.left) / rect.width) * duration
          }}>
          <div className="h-full bg-sky-400 rounded-full"
            style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>
      </div>
      <span className="text-[10px] text-sky-500 font-mono flex-shrink-0">
        {duration ? fmt(playing ? progress : duration) : '--:--'}
      </span>
      {playing && (
        <button type="button" onClick={() => {
          const a = audioRef.current; if (!a) return
          a.pause(); a.currentTime = 0; setPlaying(false); setProgress(0)
        }} className="w-5 h-5 rounded flex items-center justify-center text-sky-400 hover:text-sky-600">
          <Square size={9} fill="currentColor" />
        </button>
      )}
    </div>
  )
}

function bandColor(b) {
  if (b >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (b >= 7) return 'text-green-600 bg-green-50 border-green-200'
  if (b >= 6) return 'text-lime-600 bg-lime-50 border-lime-200'
  if (b >= 5) return 'text-slate-600 bg-slate-50 border-slate-200'
  return 'text-red-500 bg-red-50 border-red-200'
}

// ── History entry (collapsible) ───────────────────────────────────────────────
function HistoryEntry({ entry, index }) {
  const [open, setOpen] = useState(false)
  const band = parseFloat(entry.overall_band) || 0
  const bc = bandColor(band)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 transition"
      >
        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Mic size={15} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{entry.task_title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Part {entry.task_part} · {entry.created_at}
          </p>
        </div>
        {entry.overall_band && (
          <span className={`px-2.5 py-1 rounded-full text-sm font-black border flex-shrink-0 ${bc}`}>
            {entry.overall_band}
          </span>
        )}
        {open ? <ChevronUp size={16} className="text-gray-300 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-300 flex-shrink-0" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-50">
              {(entry.transcripts || []).map((t, i) => (
                <div key={i} className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-600">Q{i + 1}: {t.question}</p>
                  {t.audio_url && <MiniAudioPlayer src={t.audio_url} />}
                  {t.transcript && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Transkript</p>
                      <p className="text-xs text-gray-700 italic leading-relaxed">{t.transcript}</p>
                    </div>
                  )}
                </div>
              ))}
              {(!entry.transcripts || entry.transcripts.length === 0) && (
                <p className="text-xs text-gray-400">Audio yozilmagan</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function speakingMeta(task) {
  if (task.test_type === 'MOCK') {
    return { time: '11–14 min', detail: '3 Parts', badge: 'Full Mock' }
  }
  const n = task.question_count || 0
  return {
    time: '~4–5 min',
    detail: n ? `${n} questions` : 'Speaking',
    badge: `Part ${task.part}`,
  }
}

export default function IELTSSpeakingList() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [filter, setFilter] = useState('all')
  const [starting, setStarting] = useState(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['speaking-tasks'],
    queryFn: () => api.get('/ielts/speaking/').then((r) => r.data),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['speaking-history'],
    queryFn: () => api.get('/ielts/speaking/history/').then(r => r.data),
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    if (filter === 'all') return data
    if (filter === 'mock') return data.filter((t) => t.test_type === 'MOCK')
    return data.filter((t) => t.part === Number(filter))
  }, [data, filter])

  const handleStart = async (task) => {
    if (task.is_premium && !user?.is_premium) return
    setStarting(task.id)
    try {
      const res = await api.post('/ielts/attempt/start/', { task_type: 'speaking', task_id: task.id })
      navigate(`/exam/ielts/speaking/${task.id}?attempt=${res.data.id}`)
    } catch {
      navigate(`/exam/ielts/speaking/${task.id}`)
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="min-h-[60vh] max-w-6xl mx-auto space-y-6">
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
          Speaking
        </h1>
        <div className="hidden sm:block w-[72px]" aria-hidden />
      </div>

      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900">Choose a speaking test</h2>
        <p className="text-sm text-gray-500 mt-1">Pick a part or full mock — same layout as Writing tasks.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ['all', 'All'],
          ['1', 'Part 1'],
          ['2', 'Part 2'],
          ['3', 'Part 3'],
          ['mock', 'Full Mock'],
        ].map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setFilter(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filter === val
                ? 'bg-slate-500 text-white border-slate-500 shadow-sm'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
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
          <p className="font-medium">No tasks match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task, i) => {
            const meta = speakingMeta(task)
            const locked = task.is_premium && !user?.is_premium
            const isStarting = starting === task.id
            const isCompleted = Boolean(task.attempted)
            return (
              <motion.article
                key={task.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 sm:p-8 shadow-md hover:shadow-lg transition-shadow ${
                  locked ? 'opacity-75 border-gray-100' : 'border-gray-100'
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

                <div className="inline-flex items-center gap-1.5 w-fit px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-4">
                  <Leaf size={14} className="text-emerald-600 shrink-0" />
                  {meta.badge}
                </div>

                <h3 className="font-bold text-gray-900 text-lg leading-snug pr-14 min-h-[3.25rem]">
                  {task.title}
                </h3>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2 flex-1">
                  Complete the speaking task as described.
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-5 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5 text-gray-600">
                    <Clock size={14} className="text-gray-400 shrink-0" />
                    {meta.time}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-gray-600">
                    <Layers size={14} className="text-gray-400 shrink-0" />
                    {meta.detail}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleStart(task)}
                  disabled={locked || isStarting}
                  className={`mt-6 w-full py-3.5 rounded-2xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-glow ${
                    locked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'gradient-primary text-white hover:opacity-95'
                  }`}
                >
                  {isStarting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : locked ? (
                    'Locked'
                  ) : isCompleted ? (
                    'Restart Test'
                  ) : (
                    'Start Test'
                  )}
                </button>
              </motion.article>
            )
          })}
        </div>
      )}

      {/* ── Speaking History ─────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <History size={16} className="text-slate-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900">O'tgan sinovlar</h2>
            <span className="text-xs font-semibold text-gray-400 ml-1">({history.length})</span>
          </div>
          <div className="space-y-2">
            {history.map((entry, i) => (
              <HistoryEntry key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

