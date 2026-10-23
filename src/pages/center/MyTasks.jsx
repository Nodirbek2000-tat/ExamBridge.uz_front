/**
 * MyTasks — student view of the tasks their learning center assigned.
 * Route: /app/my-tasks
 *
 * "Start" opens the exact assigned test (see taskTypes.startUrl). There is no
 * manual "Done": when the test is finished the backend finds the result and
 * the task moves to Completed with its score. Writing and speaking show
 * "Being scored" until the AI score arrives.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ClipboardList, CheckCircle2, Loader2, Play, CalendarClock, Hourglass,
} from 'lucide-react'
import api from '../../api/client'
import { EXAMS, examTint, listUrl, startUrl, taskMeta } from './taskTypes'

const STATUS = {
  overdue:   { label: 'Overdue',   text: 'text-rose-600' },
  pending:   { label: 'To do',     text: 'text-amber-600' },
  completed: { label: 'Completed', text: 'text-emerald-600' },
}

function deadlineText(task) {
  if (!task.deadline) return null
  if (task.status === 'overdue') return 'Deadline passed'
  const days = Math.ceil((new Date(task.deadline) - new Date()) / 86_400_000)
  if (days <= 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `Due in ${days} days`
}

function TaskRow({ task }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const meta = taskMeta(task.task_type)
  const tint = examTint(task.task_type)
  const done = task.status === 'completed'
  const scoring = done && task.score == null && task.score_detail === 'Being scored'
  const due = deadlineText(task)

  const start = async () => {
    if (starting) return
    setStarting(true)
    try {
      navigate(await startUrl(task))
    } catch {
      navigate(listUrl(task.task_type))
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="flex items-center gap-4 px-4 py-3.5 bg-white">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tint.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{task.task_title || meta.label}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
          <span className="font-medium text-slate-500">{meta.label}</span>
          {task.assigned_by?.full_name && <><span>·</span><span>{task.assigned_by.full_name}</span></>}
          {due && !done && (
            <>
              <span>·</span>
              <span className={`inline-flex items-center gap-1 ${task.status === 'overdue' ? 'text-rose-500' : ''}`}>
                <CalendarClock size={11} /> {due}
              </span>
            </>
          )}
        </div>
        {task.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{task.description}</p>}
      </div>

      {done ? (
        scoring ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Hourglass size={13} /> Being scored
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
            <CheckCircle2 size={13} /> {task.score_detail || 'Done'}
          </span>
        )
      ) : (
        <button
          onClick={start}
          disabled={starting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          {starting ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} />}
          {starting ? 'Opening…' : 'Start'}
        </button>
      )}
    </div>
  )
}

function Section({ status, tasks }) {
  if (!tasks.length) return null
  const cfg = STATUS[status]
  return (
    <section>
      <h2 className={`mb-2 px-1 text-xs font-semibold uppercase tracking-wider ${cfg.text}`}>
        {cfg.label} <span className="text-slate-300 font-medium">{tasks.length}</span>
      </h2>
      <div className="rounded-2xl border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        {tasks.map((t) => <TaskRow key={t.submission_id} task={t} />)}
      </div>
    </section>
  )
}

export default function MyTasks() {
  const [exam, setExam] = useState('all')
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => api.get('/centers/my-assignments/').then((r) => r.data),
    staleTime: 0,
    refetchInterval: 20_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const examsPresent = EXAMS.filter((e) => tasks.some((t) => taskMeta(t.task_type).exam === e.key))
  const shown = exam === 'all' ? tasks : tasks.filter((t) => taskMeta(t.task_type).exam === exam)
  const by = (s) => shown.filter((t) => t.status === s)
  const doneCount = shown.filter((t) => t.status === 'completed').length
  const pct = shown.length ? Math.round((doneCount / shown.length) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">Tasks from your teacher. Finish the test and it is marked done automatically.</p>

        {tasks.length > 0 && (
          <div className="mt-5 flex items-center gap-4">
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
            <span className="text-xs font-semibold text-slate-600 tabular-nums">{doneCount}/{shown.length} done</span>
          </div>
        )}

        {examsPresent.length > 1 && (
          <div className="mt-4 flex gap-1.5">
            {[{ key: 'all', label: 'All' }, ...examsPresent].map((e) => (
              <button
                key={e.key}
                onClick={() => setExam(e.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  exam === e.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        )}
      </motion.header>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList size={36} className="mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-600">No tasks yet</p>
          <p className="text-sm text-slate-400 mt-1">When your teacher assigns a test, it appears here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section status="overdue" tasks={by('overdue')} />
          <Section status="pending" tasks={by('pending')} />
          <Section status="completed" tasks={by('completed')} />
        </div>
      )}
    </div>
  )
}
