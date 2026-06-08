/**
 * MyTasks — student view of all assigned tasks from their learning center.
 * Route: /app/my-tasks
 *
 * Tasks complete AUTOMATICALLY: pressing "Start" deep-links into the exact
 * assigned test and starts it. When the student finishes and gets a result,
 * the backend marks the assignment complete and it moves to "Completed"
 * (and counts toward the progress bar). There is no manual "Done" button.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Loader2,
  BookOpen, Play, Headphones, PenLine, Mic, Calculator,
  FileText, Trophy, CalendarClock,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.05 } }),
}

/* ── Per-task-type look & label ─────────────────────────────── */
const TASK_META = {
  sat_mock:       { label: 'SAT Full Mock',     icon: Trophy,      grad: 'from-violet-500 to-indigo-500' },
  sat_english:    { label: 'SAT English',       icon: FileText,    grad: 'from-violet-500 to-fuchsia-500' },
  sat_math:       { label: 'SAT Math',          icon: Calculator,  grad: 'from-indigo-500 to-blue-500' },
  ielts_reading:  { label: 'IELTS Reading',     icon: BookOpen,    grad: 'from-sky-500 to-cyan-500' },
  ielts_listening:{ label: 'IELTS Listening',   icon: Headphones,  grad: 'from-cyan-500 to-teal-500' },
  ielts_writing:  { label: 'IELTS Writing',     icon: PenLine,     grad: 'from-emerald-500 to-green-500' },
  ielts_speaking: { label: 'IELTS Speaking',    icon: Mic,         grad: 'from-rose-500 to-pink-500' },
  cefr_test:      { label: 'CEFR Test',         icon: Trophy,      grad: 'from-amber-500 to-orange-500' },
  cefr_reading:   { label: 'CEFR Reading',      icon: BookOpen,    grad: 'from-amber-500 to-yellow-500' },
  cefr_listening: { label: 'CEFR Listening',    icon: Headphones,  grad: 'from-orange-500 to-amber-500' },
  custom:         { label: 'Custom Task',       icon: ClipboardList, grad: 'from-gray-500 to-gray-600' },
}
const metaFor = (t) => TASK_META[t] || TASK_META.custom

const STATUS_CFG = {
  pending:   { label: 'Pending',   icon: Clock,        dot: 'bg-amber-400', ring: 'ring-amber-100',  badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue:   { label: 'Overdue',   icon: AlertCircle,  dot: 'bg-red-500',   ring: 'ring-red-100',    badge: 'bg-red-50 text-red-700 border-red-200' },
  completed: { label: 'Completed', icon: CheckCircle2, dot: 'bg-green-500', ring: 'ring-green-100',  badge: 'bg-green-50 text-green-700 border-green-200' },
}

/* ── Section-list fallback for task types without deep-link ──── */
function getTaskListUrl(task_type) {
  switch (task_type) {
    case 'sat_mock':
    case 'sat_english':
    case 'sat_math':       return '/app/sat/tests'
    case 'ielts_reading':  return '/app/ielts/reading'
    case 'ielts_listening':return '/app/ielts/listening'
    case 'ielts_writing':  return '/app/ielts/writing'
    case 'ielts_speaking': return '/app/ielts/speaking'
    case 'cefr_test':      return '/app/cefr/tests'
    case 'cefr_reading':   return '/app/cefr/reading'
    case 'cefr_listening': return '/app/cefr/listening'
    default:               return '/app'
  }
}

/* ── Task Card ──────────────────────────────────────────────── */
function TaskCard({ task, index }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const cfg = STATUS_CFG[task.status] || STATUS_CFG.pending
  const meta = metaFor(task.task_type)
  const Icon = meta.icon
  const isDone = task.status === 'completed'

  const daysLeft = task.deadline
    ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null
  const deadlineText = !task.deadline ? null
    : task.status === 'overdue' ? 'Deadline passed'
    : daysLeft === 0 ? 'Due today'
    : daysLeft === 1 ? 'Due tomorrow'
    : `Due in ${daysLeft} days`

  /* Deep-link straight into the EXACT assigned test and start it. */
  const handleStart = async () => {
    if (starting) return
    setStarting(true)
    try {
      const { task_type, task_ref_id, task_ref_kind, task_title } = task
      // IELTS Reading → create the attempt and jump into the exam runner
      if (task_type === 'ielts_reading' && task_ref_id) {
        if (task_ref_kind === 'mock') {
          const res = await api.post(`/ielts/reading/mock/${task_ref_id}/start/`)
          const passages = res.data.passages || []
          const first = passages[0]
          const partIds = passages.map(p => p.id).filter(Boolean).join(',')
          navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${first?.id || task_ref_id}&parts=${partIds}&title=${encodeURIComponent(task_title || '')}`)
        } else {
          const res = await api.post(`/ielts/reading/${task_ref_id}/start/`)
          navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${task_ref_id}&title=${encodeURIComponent(task_title || '')}`)
        }
        return
      }
      // Other types → open the relevant section list
      navigate(getTaskListUrl(task_type))
    } catch {
      navigate(getTaskListUrl(task.task_type))
    } finally {
      setStarting(false)
    }
  }

  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className={`group relative rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden ring-1 ring-transparent hover:${cfg.ring}`}
    >
      {/* Accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${meta.grad}`} />

      <div className="flex items-start gap-4 p-4 pl-5">
        {/* Type icon */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${meta.grad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{meta.label}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
            </span>
          </div>

          <p className="font-bold text-gray-900 text-sm mt-0.5 truncate">
            {task.task_title || meta.label}
          </p>

          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-gray-400">
            <span className="truncate max-w-[120px]">{task.center?.name}</span>
            <span className="text-gray-300">·</span>
            <span>By {task.assigned_by?.full_name || 'Teacher'}</span>
            {deadlineText && (
              <>
                <span className="text-gray-300">·</span>
                <span className={`inline-flex items-center gap-1 font-medium ${
                  task.status === 'overdue' ? 'text-red-600' :
                  daysLeft !== null && daysLeft <= 2 ? 'text-amber-600' : 'text-gray-400'
                }`}>
                  <CalendarClock size={12} /> {deadlineText}
                </span>
              </>
            )}
          </div>

          {/* Completed result chips */}
          {isDone && (task.score != null || task.score_detail) && (
            <div className="flex items-center gap-2 mt-2">
              {task.score != null && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <Trophy size={12} /> {task.score_detail || `Score: ${task.score}`}
                </span>
              )}
              {task.score == null && task.score_detail && (
                <span className="text-xs text-gray-500 italic">{task.score_detail}</span>
              )}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0 self-center">
          {isDone ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-3 py-2 rounded-xl border border-green-200">
              <CheckCircle2 size={14} /> Done
            </span>
          ) : (
            <button
              onClick={handleStart}
              disabled={starting}
              className={`flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r ${meta.grad} text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md hover:opacity-95 transition-all disabled:opacity-60`}
            >
              {starting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {starting ? 'Starting…' : 'Start'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Main ───────────────────────────────────────────────────── */
export default function MyTasks() {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => api.get('/centers/my-assignments/').then(r => r.data),
    staleTime: 0,
    refetchInterval: 20_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const overdue   = assignments.filter(a => a.status === 'overdue')
  const pending   = assignments.filter(a => a.status === 'pending')
  const completed = assignments.filter(a => a.status === 'completed')
  const pendingTotal = pending.length + overdue.length

  const total = assignments.length
  const doneCount = completed.length
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-sm">
            <ClipboardList size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-400">{total} total · {pendingTotal} pending</p>
          </div>
        </div>

        {/* Overall progress bar */}
        {total > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">Overall Progress</span>
              <span className="text-xs font-bold text-sky-600">{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-sky-500' : 'bg-amber-400'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">{doneCount} completed</span>
              <span className="text-[10px] text-gray-400">{pendingTotal} remaining</span>
            </div>
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-sky-400" />
        </div>
      ) : assignments.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible"
          className="text-center py-20 text-gray-400">
          <BookOpen size={44} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium text-lg">No tasks yet</p>
          <p className="text-sm mt-1">Your teacher hasn't assigned any tasks</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && <Section title="Overdue" tasks={overdue} statusKey="overdue" />}
          {pending.length > 0 && <Section title="Pending" tasks={pending} statusKey="pending" />}
          {completed.length > 0 && <Section title="Completed" tasks={completed} statusKey="completed" />}
        </div>
      )}
    </div>
  )
}

function Section({ title, tasks, statusKey }) {
  const cfg = STATUS_CFG[statusKey]
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
        <span className="text-xs text-gray-400 font-medium">({tasks.length})</span>
      </div>
      <div className="space-y-2.5">
        {tasks.map((task, i) => (
          <TaskCard key={task.submission_id} task={task} index={i} />
        ))}
      </div>
    </div>
  )
}
