/**
 * MyTasks — a center student's lessons and progress. Route: /app/my-tasks
 *
 *  - My progress: tasks finished (and the change since last week), days
 *    studied, streak, the last 14 days, and how scores moved per section.
 *  - Today: today's lessons (topic + tests).
 *  - Still to finish: earlier lessons with tests left.
 *  - Finished.
 *
 * "Start" opens the exact test (taskTypes.startUrl). Finishing it completes
 * the task by itself; writing and speaking show "Being scored" until the AI
 * score arrives.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowDownRight, ArrowUpRight, BookOpen, CalendarClock, CheckCircle2, Flame, Hourglass, Loader2, Play,
} from 'lucide-react'
import api from '../../api/client'
import { examTint, listUrl, startUrl, taskMeta } from './taskTypes'

const isToday = (iso) => iso && new Date(`${iso}T00:00:00`).toDateString() === new Date().toDateString()
const localDay = (dt) => {
  const d = new Date(dt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dueText(deadline, overdue) {
  if (!deadline) return null
  if (overdue) return 'Deadline passed'
  const hours = (new Date(deadline) - new Date()) / 3_600_000
  if (hours < 24) return `Due ${new Date(deadline).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  const days = Math.ceil(hours / 24)
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`
}

/* ── progress ──────────────────────────────────────────────── */
function ProgressCard({ p }) {
  if (!p || !p.total) return null
  const up = p.rate_change != null && p.rate_change >= 0
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-slate-200/70 p-6 mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">My progress</p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-slate-900 tabular-nums">{p.rate ?? 0}%</span>
            {p.rate_change != null && (
              <span className={`inline-flex items-center gap-0.5 text-sm font-semibold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
                {up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{Math.abs(p.rate_change)}% vs last week
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">of tasks finished · {p.done} of {p.total}</p>
        </div>
        <div className="grid grid-cols-4 gap-5 text-center">
          {[
            { v: p.study_days, l: 'days studied', s: 'last 30' },
            { v: p.streak, l: 'day streak', icon: Flame, tone: p.streak ? 'text-orange-500' : 'text-slate-900' },
            { v: p.lessons.done, l: 'lessons done', s: `of ${p.lessons.total}` },
            { v: p.missed, l: 'missed', tone: p.missed ? 'text-rose-600' : 'text-slate-900' },
          ].map((x) => (
            <div key={x.l}>
              <p className={`text-2xl font-semibold tabular-nums inline-flex items-center gap-1 ${x.tone || 'text-slate-900'}`}>
                {x.icon && <x.icon size={18} />}{x.v}
              </p>
              <p className="text-[11px] text-slate-500 leading-tight">{x.l}</p>
              {x.s && <p className="text-[10px] text-slate-400">{x.s}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-1.5">
        {p.last_14.map((d) => (
          <span key={d.date} title={d.date}
            className={`flex-1 h-2 rounded-full ${d.studied ? 'bg-emerald-500' : 'bg-slate-100'}`} />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">Last 14 days — green means you studied that day.</p>

      {p.growth.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {p.growth.map((g) => (
            <span key={g.type} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ring-1 ${examTint(g.type).chip}`}>
              {taskMeta(g.type).label}
              <span className="tabular-nums">{g.first} → {g.last}</span>
              <span className={g.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{g.delta >= 0 ? '+' : ''}{g.delta}</span>
            </span>
          ))}
        </div>
      )}
    </motion.section>
  )
}

/* ── lesson card ───────────────────────────────────────────── */
function TaskLine({ task }) {
  const navigate = useNavigate()
  const [starting, setStarting] = useState(false)
  const done = task.status === 'completed'
  const scoring = done && task.score == null && task.score_detail === 'Being scored'
  const tint = examTint(task.task_type)

  const start = async () => {
    if (starting) return
    setStarting(true)
    try { navigate(await startUrl(task)) } catch { navigate(listUrl(task.task_type)) } finally { setStarting(false) }
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-50' : 'bg-slate-50'}`}>
        {done ? <CheckCircle2 size={16} className="text-emerald-500" /> : <span className={`w-2 h-2 rounded-full ${tint.dot}`} />}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${done ? 'text-slate-500' : 'text-slate-900'}`}>{task.task_title}</p>
        <p className="text-xs text-slate-400">{taskMeta(task.task_type).label}{task.is_late ? ' · finished late' : ''}</p>
      </div>
      {done ? (
        scoring
          ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><Hourglass size={13} />Being scored</span>
          : <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${tint.chip}`}>{task.score_detail || 'Done'}</span>
      ) : (
        <button onClick={start} disabled={starting}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-60 transition-colors">
          {starting ? <Loader2 size={13} className="animate-spin" /> : <Play size={12} />}{starting ? 'Opening…' : 'Start'}
        </button>
      )}
    </li>
  )
}

function LessonCard({ unit }) {
  const doneCount = unit.tasks.filter((t) => t.status === 'completed').length
  const all = unit.tasks.length
  const finished = doneCount === all
  const overdue = unit.tasks.some((t) => t.status === 'overdue')
  const due = !finished && dueText(unit.deadline, overdue)

  return (
    <motion.article initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border p-5 ${overdue && !finished ? 'border-rose-200' : 'border-slate-200/70'}`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400">
            {unit.teacher}{unit.date && ` · ${new Date(`${unit.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-slate-900">{unit.title}</h3>
          {unit.description && <p className="mt-1 text-sm text-slate-600">{unit.description}</p>}
          {due && (
            <p className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${overdue ? 'text-rose-600' : 'text-amber-600'}`}>
              <CalendarClock size={12} />{due}
            </p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-semibold tabular-nums ${finished ? 'text-emerald-600' : 'text-slate-900'}`}>{doneCount}/{all}</p>
          <p className="text-[11px] text-slate-400">done</p>
        </div>
      </div>
      <div className="mt-3 h-1 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${finished ? 'bg-emerald-500' : 'bg-slate-900'}`} style={{ width: `${(doneCount / all) * 100}%` }} />
      </div>
      <ul className="mt-1 divide-y divide-slate-100">
        {unit.tasks.map((t) => <TaskLine key={t.submission_id} task={t} />)}
      </ul>
    </motion.article>
  )
}

function Section({ title, hint, units, children }) {
  if (!units.length) return null
  return (
    <section>
      <div className="mb-3 px-1 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title} <span className="text-slate-300 font-medium">{units.length}</span></h2>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      <div className="space-y-3">{children || units.map((u) => <LessonCard key={u.key} unit={u} />)}</div>
    </section>
  )
}

export default function MyTasks() {
  const [showAllDone, setShowAllDone] = useState(false)
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: () => api.get('/centers/my-assignments/').then((r) => r.data),
    staleTime: 0, refetchInterval: 20_000, refetchOnMount: 'always', refetchOnWindowFocus: true,
  })
  const { data: progress } = useQuery({
    queryKey: ['my-progress'],
    queryFn: () => api.get('/centers/my-progress/').then((r) => r.data),
    refetchInterval: 60_000,
  })

  // One card per lesson; an older single task is its own card.
  const units = useMemo(() => {
    const map = new Map()
    tasks.forEach((t) => {
      const key = t.lesson ? `l${t.lesson.id}` : `t${t.submission_id}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: t.lesson?.topic || t.task_title,
          description: t.lesson?.description || t.description,
          date: t.lesson?.date || localDay(t.created_at),
          deadline: t.deadline,
          teacher: t.assigned_by?.full_name || 'Teacher',
          tasks: [],
        })
      }
      map.get(key).tasks.push(t)
    })
    return [...map.values()].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  }, [tasks])

  const open = (u) => u.tasks.some((t) => t.status !== 'completed')
  const today = units.filter((u) => isToday(u.date))
  const earlier = units.filter((u) => !isToday(u.date) && open(u))
    .sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'))
  const finished = units.filter((u) => !isToday(u.date) && !open(u))

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My lessons</h1>
        <p className="mt-1 text-sm text-slate-500">Lessons from your teacher. Finish a test and it is marked done by itself.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/70">
          <BookOpen size={34} className="mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-600">No lessons yet</p>
          <p className="text-sm text-slate-400 mt-1">When your teacher gives a lesson, it appears here.</p>
        </div>
      ) : (
        <>
          <ProgressCard p={progress} />
          <div className="space-y-8">
            <Section title="Today" hint={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} units={today} />
            {today.length === 0 && (
              <p className="px-1 text-sm text-slate-400">No new lesson today{earlier.length ? ' — finish the ones below.' : '. 🎉'}</p>
            )}
            <Section title="Still to finish" hint="from earlier days" units={earlier} />
            <Section title="Finished" units={finished}>
              {(showAllDone ? finished : finished.slice(0, 3)).map((u) => <LessonCard key={u.key} unit={u} />)}
              {finished.length > 3 && !showAllDone && (
                <button onClick={() => setShowAllDone(true)} className="w-full py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-900">
                  Show all {finished.length}
                </button>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  )
}
