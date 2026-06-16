import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, Loader2, ChevronLeft, Leaf, Clock, Layers, Star,
  History, Play, Pause, Square, ChevronDown, ChevronUp, CheckCircle2, Lock, RotateCcw,
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
  const navigate = useNavigate()
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
                  {t.transcript && t.transcript !== '(no transcript)' && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Transcript</p>
                      <p className="text-xs text-gray-700 italic leading-relaxed">{t.transcript}</p>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => navigate(`/exam/ielts/speaking/result/${entry.id}`)}
                className="w-full mt-1 py-2 rounded-xl bg-slate-500 text-white text-xs font-bold hover:bg-slate-600 transition"
              >
                View full result
              </button>
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


  const filtered = useMemo(() => {
    let list = data
    if (filter === 'mock') list = data.filter((t) => t.test_type === 'MOCK')
    else if (filter !== 'all') list = data.filter((t) => t.part === Number(filter))
    return [...list.filter(t => !t.is_premium), ...list.filter(t => t.is_premium)]
  }, [data, filter])

  const handleStart = async (task) => {
    if (task.is_premium && !user?.is_premium) return
    setStarting(task.id)
    try {
      const res = await api.post('/ielts/attempt/start/', { task_type: 'speaking', task_id: task.id })
      navigate(`/exam/ielts/speaking/${task.id}?attempt=${res.data.attempt_id}`)
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
                    {locked && <Lock size={14} className="text-amber-500 flex-shrink-0" />}
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
                      <Leaf size={12} className="text-emerald-600" /> {meta.badge}
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
                  {locked ? (
                    <button
                      type="button"
                      onClick={() => navigate('/app/subscription')}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-semibold whitespace-nowrap transition-colors hover:bg-sky-100 hover:border-sky-300"
                    >
                      <Lock size={10} /> Premium
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStart(task)}
                      disabled={isStarting}
                      className="w-full sm:w-auto px-5 h-10 rounded-lg text-sm font-bold transition disabled:opacity-60 bg-sky-500 hover:bg-sky-600 text-white"
                    >
                      {isStarting
                        ? <Loader2 size={15} className="animate-spin mx-auto" />
                        : isCompleted ? 'Re-do test' : 'Start test'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

