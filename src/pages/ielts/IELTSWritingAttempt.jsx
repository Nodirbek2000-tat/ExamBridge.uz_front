import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  ChevronLeft,
  AlertTriangle,
  PenLine,
  Printer,
  Play,
  Pause,
  Loader2,
  Maximize2,
  Minimize2,
  Bell,
  Menu,
  GripVertical,
  GripHorizontal,
} from 'lucide-react'
import api from '../../api/client'
import { downloadWritingPdf } from '../../utils/downloadPdf'

// ── Timer ─────────────────────────────────────────────────────────────────────
function useTimer(limitSeconds) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!running) {
      clearInterval(ref.current)
      return
    }
    ref.current = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(ref.current)
  }, [running])

  const remaining = Math.max(0, limitSeconds - elapsed)
  const urgent = remaining < 120 && remaining > 0 && running
  const expired = remaining === 0 && running

  const fmt = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return {
    elapsed,
    remaining,
    fmt: fmt(remaining),
    elapsedFmt: fmt(elapsed),
    running,
    urgent,
    expired,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => {
      setRunning(false)
      setElapsed(0)
    },
  }
}

// ── Word counter ──────────────────────────────────────────────────────────────
function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

// ── PDF Print ─────────────────────────────────────────────────────────────────
function printWriting({ task, text, wordCount, isOwn, ownTitle }) {
  downloadWritingPdf({ task, text, wordCount, ownTitle: isOwn ? ownTitle : undefined })
}

// ── Breakpoint (Tailwind md = 768px) ───────────────────────────────────────────
function useMediaMd() {
  const [ok, setOk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const fn = () => setOk(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return ok
}

// ── Resizable split: desktop = chap/o‘ng (X), mobil = tepa/past (Y) ───────────
function useResizableSplit({ initialLeft = 42, initialTop = 40 } = {}) {
  const [leftPct, setLeftPct] = useState(initialLeft)
  const [topPct, setTopPct] = useState(initialTop)
  const dragging = useRef(null) // 'h' | 'v' | null

  const containerRef = useRef(null)

  const onDownHorizontal = useCallback((e) => {
    e.preventDefault()
    dragging.current = 'h'
  }, [])

  const onDownVertical = useCallback((e) => {
    e.preventDefault()
    dragging.current = 'v'
  }, [])

  useEffect(() => {
    const getPoint = (e) => {
      const t = e.touches?.[0]
      if (t) return { x: t.clientX, y: t.clientY }
      return { x: e.clientX, y: e.clientY }
    }

    const onMove = (e) => {
      if (!dragging.current || !containerRef.current) return
      if (e.cancelable && e.type === 'touchmove') e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const { x, y } = getPoint(e)
      if (dragging.current === 'h') {
        const pct = ((x - rect.left) / rect.width) * 100
        setLeftPct(Math.min(72, Math.max(22, pct)))
      } else if (dragging.current === 'v') {
        const pct = ((y - rect.top) / rect.height) * 100
        setTopPct(Math.min(68, Math.max(20, pct)))
      }
    }

    const onUp = () => {
      dragging.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    window.addEventListener('touchcancel', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
      window.removeEventListener('touchcancel', onUp)
    }
  }, [])

  return { leftPct, topPct, containerRef, onDownHorizontal, onDownVertical }
}

// ── Own Writing Mode ──────────────────────────────────────────────────────────
function OwnWritingMode() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [started, setStarted] = useState(false)
  const [timeLimit, setTimeLimit] = useState(40)
  const [menuOpen, setMenuOpen] = useState(false)
  const [fs, setFs] = useState(false)
  const timer = useTimer(timeLimit * 60)
  const words = countWords(text)
  const isDesktop = useMediaMd()
  const { leftPct, topPct, containerRef, onDownHorizontal, onDownVertical } = useResizableSplit({
    initialLeft: 40,
    initialTop: 40,
  })

  const handleStart = () => {
    if (!title.trim()) return
    setStarted(true)
    timer.start()
  }

  const toggleFs = () => {
    const el = document.getElementById('writing-shell')
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.().then(() => setFs(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setFs(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  if (!started) {
    return (
      <div className="flex items-center justify-center min-h-full p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg space-y-5 border border-sky-100"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <PenLine size={20} className="text-sky-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Own Writing</h2>
              <p className="text-xs text-gray-400">O'z mavzuingizni kiriting</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Mavzu / Savol
            </label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={4}
              placeholder="Task savoli yoki mavzusini kiriting..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
              Vaqt (daqiqa)
            </label>
            <div className="flex gap-2">
              {[20, 40, 60].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTimeLimit(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                    timeLimit === t
                      ? 'gradient-primary text-white border-transparent shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t} min
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!title.trim()}
            className="w-full py-3 gradient-primary text-white rounded-xl font-semibold text-sm hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-glow"
          >
            <Play size={15} /> Boshlash
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div id="writing-shell" className="flex flex-col h-full bg-white min-h-0">
      <div className="flex items-center justify-between gap-3 px-4 md:px-5 h-14 border-b border-sky-100 bg-white flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/app/ielts/writing')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-extrabold text-sm tabular-nums ${
              timer.urgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-50 text-sky-700'
            }`}
          >
            <Clock size={13} />
            {timer.fmt}
          </div>
          <button
            type="button"
            onClick={timer.running ? timer.pause : timer.start}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold gradient-primary text-white shadow-sm hover:opacity-95"
          >
            {timer.running ? <Pause size={14} /> : <Play size={14} />}
            {timer.running ? 'Pause' : 'Start'}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleFs}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            title="Full screen"
          >
            {fs ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button type="button" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100" title="Notifications">
            <Bell size={18} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-sky-50 flex items-center gap-2"
                  onClick={() => {
                    setMenuOpen(false)
                    printWriting({ text, wordCount: words, isOwn: true, ownTitle: title })
                  }}
                >
                  <Printer size={14} /> Print / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 overflow-hidden relative flex-col md:flex-row"
      >
        <div
          className="flex flex-col overflow-y-auto bg-white min-h-0 min-w-0 border-b md:border-b-0 md:border-r border-sky-100 flex-shrink-0"
          style={
            isDesktop ? { width: `${leftPct}%` } : { height: `${topPct}%`, width: '100%' }
          }
        >
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="rounded-xl bg-gray-100/80 border border-gray-200 px-3 py-2 mb-3">
              <span className="text-xs font-bold text-gray-600">Own task</span>
              <p className="text-[11px] text-gray-500 mt-1">
                You should spend about {timeLimit} minutes on this task. Aim for at least 150 words.
              </p>
            </div>
            <p className="text-sm leading-relaxed text-gray-900 font-semibold">{title}</p>
          </div>
          <div className="px-4 py-4 border-t border-gray-100 bg-sky-50/30 flex-shrink-0">
            <p className="text-xs font-semibold text-sky-800 uppercase tracking-wider mb-2">Recommendations</p>
            <p className="text-xs text-gray-500">Key ideas yozishda foydalaning — bu yerda sizning mavzuingiz asosida taglar keyinroq qo‘shilishi mumkin.</p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Mavzu va yozish balandligini sozlash"
          onMouseDown={onDownVertical}
          onTouchStart={onDownVertical}
          className="md:hidden min-h-[40px] flex-shrink-0 w-full bg-gray-100 hover:bg-sky-50 border-y border-gray-200 cursor-row-resize flex items-center justify-center touch-none select-none group py-1"
        >
          <span className="h-8 min-w-[64px] px-3 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-active:text-sky-600">
            <GripHorizontal size={16} />
          </span>
        </button>

        <button
          type="button"
          aria-label="Resize panes"
          onMouseDown={onDownHorizontal}
          className="hidden md:flex w-2 flex-shrink-0 bg-gray-100 hover:bg-sky-100 border-x border-gray-200 cursor-col-resize items-center justify-center group"
        >
          <span className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-sky-600">
            <GripVertical size={14} />
          </span>
        </button>

        <div className="flex-1 flex flex-col p-4 gap-2 min-w-0 min-h-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start writing your essay here..."
            className="flex-1 w-full p-4 bg-white border border-gray-200 rounded-xl text-sm leading-8 text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none min-h-[200px]"
          />
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Words:</span> {words}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between h-14 px-4 border-t border-sky-100 bg-white flex-shrink-0">
        <span className="text-sm font-medium text-gray-500">Own Writing</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => printWriting({ text, wordCount: words, isOwn: true, ownTitle: title })}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border border-sky-200 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-50"
          >
            <Printer size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={() =>
              navigate('/exam/ielts/writing/result/0', {
                state: { task: null, text, wordCount: words, ownTitle: title },
              })
            }
            disabled={words < 10}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-bold text-white gradient-primary shadow-glow hover:opacity-95 disabled:opacity-50"
          >
            Finish writing
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Attempt Page ─────────────────────────────────────────────────────────
export default function IELTSWritingAttempt() {
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const taskId = searchParams.get('task')
  const isOwn = attemptId === 'own'

  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timerStarted, setTimerStarted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [fs, setFs] = useState(false)

  const isDesktop = useMediaMd()
  const { leftPct, topPct, containerRef, onDownHorizontal, onDownVertical } = useResizableSplit({
    initialLeft: 42,
    initialTop: 38,
  })

  const { data: task, isLoading } = useQuery({
    queryKey: ['writing-task', taskId],
    queryFn: () => api.get('/ielts/writing/').then((r) => r.data.find((t) => String(t.id) === String(taskId))),
    enabled: !!taskId && !isOwn,
    staleTime: 60_000,
  })

  const timer = useTimer((task?.time_limit || 40) * 60)

  const handleStartTimer = () => {
    setTimerStarted(true)
    timer.start()
  }

  const words = countWords(text)
  const minWords = task?.min_words || 150

  const toggleFs = () => {
    const el = document.getElementById('writing-shell')
    if (!document.fullscreenElement) {
      el?.requestFullscreen?.().then(() => setFs(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setFs(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  const handleSubmit = async () => {
    setSubmitting(true)
    setShowConfirm(false)
    timer.pause()
    try {
      const resp = await api.post(`/ielts/writing/${attemptId}/submit/`, {
        task_id: Number(taskId),
        text,
      })
      navigate(`/exam/ielts/writing/result/${resp.data.id}`, { replace: true })
    } catch {
      // Fallback: pass via state if submit failed
      navigate('/exam/ielts/writing/result/0', {
        state: { task, text, wordCount: words },
        replace: true,
      })
    }
  }

  useEffect(() => {
    if (timer.expired && timerStarted && !submitting) {
      handleSubmit()
    }
  }, [timer.expired])

  if (isOwn) return <OwnWritingMode />

  if (isLoading || !task) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-sky-500" />
      </div>
    )
  }

  if (!timerStarted) {
    return (
      <div className="flex items-center justify-center h-full bg-white p-4">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-lg space-y-5 border border-sky-100"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                task.task_type === 1 ? 'bg-sky-100 text-sky-700' : 'bg-sky-100 text-sky-800'
              }`}
            >
              T{task.task_type}
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{task.title}</h2>
              <p className="text-xs text-gray-400">
                Task {task.task_type} · {task.time_limit} min · min {task.min_words} words
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
            {task.prompt}
          </div>

          {task.recommendations?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Recommendations</p>
              <div className="flex flex-wrap gap-1.5">
                {task.recommendations.map((w, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-100 font-medium"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartTimer}
            className="w-full py-3 gradient-primary text-white rounded-xl font-semibold hover:opacity-95 transition flex items-center justify-center gap-2 shadow-glow"
          >
            <Play size={16} /> Start
          </button>
        </motion.div>
      </div>
    )
  }

  const timeGuidance = `You should spend about ${task.time_limit} minutes on this task. Write at least ${task.min_words} words.`

  return (
    <div id="writing-shell" className="flex flex-col h-full bg-white min-h-0">
      <div className="flex items-center justify-between gap-2 px-4 md:px-5 h-14 border-b border-sky-100 bg-white flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/app/ielts/writing')}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition flex-shrink-0"
        >
          <ChevronLeft size={14} /> Back
        </button>

        <div className="flex items-center gap-2 flex-1 justify-center min-w-0">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-extrabold text-sm tabular-nums ${
              timer.urgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-sky-50 text-sky-700'
            }`}
          >
            <Clock size={13} />
            {timer.fmt}
          </div>
          <button
            type="button"
            onClick={timer.running ? timer.pause : timer.start}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold gradient-primary text-white shadow-sm hover:opacity-95 flex-shrink-0"
          >
            {timer.running ? <Pause size={14} /> : <Play size={14} />}
            {timer.running ? 'Pause' : 'Start'}
          </button>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={toggleFs}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            title="Full screen"
          >
            {fs ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button type="button" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hidden sm:block" title="Notifications">
            <Bell size={18} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-sky-50 flex items-center gap-2"
                  onClick={() => {
                    setMenuOpen(false)
                    printWriting({ task, text, wordCount: words })
                  }}
                >
                  <Printer size={14} /> Print / PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex flex-1 min-h-0 overflow-hidden relative flex-col md:flex-row"
      >
        <div
          className="flex flex-col overflow-y-auto bg-white min-h-0 min-w-0 border-b md:border-b-0 md:border-r border-sky-100 flex-shrink-0"
          style={
            isDesktop ? { width: `${leftPct}%` } : { height: `${topPct}%`, width: '100%' }
          }
        >
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 space-y-3">
            <div className="rounded-xl bg-gray-100/80 border border-gray-200 px-3 py-2">
              <span className="text-xs font-bold text-gray-700">Task {task.task_type}</span>
              <p className="text-[11px] text-gray-600 mt-1.5 leading-snug">{timeGuidance}</p>
            </div>
            <p className="text-sm leading-relaxed text-gray-900 font-semibold">{task.prompt}</p>
            {task.image && (
              <img
                src={task.image}
                alt="Task visual"
                className="w-full rounded-lg border border-gray-200 object-contain max-h-52"
              />
            )}
          </div>

          {task.recommendations?.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100 bg-sky-50/25 flex-shrink-0">
              <p className="text-xs font-semibold text-sky-900 uppercase tracking-wider mb-2">Recommendations</p>
              <div className="flex flex-wrap gap-1.5">
                {task.recommendations.map((w, i) => (
                  <button
                    type="button"
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-white border border-sky-200 text-sky-900 font-medium hover:bg-sky-50 transition select-none"
                    onClick={() => setText((t) => t + (t && !t.endsWith(' ') ? ' ' : '') + w + ' ')}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Click to append to your answer</p>
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Mavzu va yozish balandligini sozlash"
          onMouseDown={onDownVertical}
          onTouchStart={onDownVertical}
          className="md:hidden min-h-[40px] flex-shrink-0 w-full bg-gray-100 hover:bg-sky-50 border-y border-gray-200 cursor-row-resize flex items-center justify-center touch-none select-none group py-1"
        >
          <span className="h-8 min-w-[64px] px-3 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-active:text-sky-600">
            <GripHorizontal size={16} />
          </span>
        </button>

        <button
          type="button"
          aria-label="Resize panes"
          onMouseDown={onDownHorizontal}
          className="hidden md:flex w-2 flex-shrink-0 bg-gray-100 hover:bg-sky-100 border-x border-gray-200 cursor-col-resize items-center justify-center group"
        >
          <span className="w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-400 group-hover:text-sky-600">
            <GripVertical size={14} />
          </span>
        </button>

        <div className="flex-1 flex flex-col p-4 gap-2 min-w-0 min-h-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start writing your essay here..."
            className="flex-1 w-full p-4 bg-white border border-gray-200 rounded-xl text-sm leading-8 text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none min-h-[200px]"
          />
          <p className="text-sm text-gray-600">
            <span className="font-semibold">Words:</span> {words}
            {words < minWords && (
              <span className="text-gray-400 ml-2">
                ({minWords - words} more to reach minimum)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between h-14 px-4 border-t border-sky-100 bg-white flex-shrink-0">
        <span className="text-sm font-medium text-gray-500">
          Task {task.task_type}
          <span
            className={`ml-2 text-xs font-bold ${
              words >= minWords ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            {words} / {minWords}+ words
          </span>
        </span>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={submitting || words < 10}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white gradient-primary shadow-glow hover:opacity-95 disabled:opacity-50 min-w-[140px] justify-center"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
          Finish writing
        </button>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center space-y-4 border border-sky-100"
            >
              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle size={22} className="text-sky-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-lg">Submit your writing?</h3>
              <p className="text-sm text-gray-500">You wrote {words} words.</p>
              {words < minWords && (
                <p className="text-xs text-slate-700 font-semibold">
                  Recommended: at least {minWords} words ({minWords - words} short)
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-95"
                >
                  Yes, submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}



