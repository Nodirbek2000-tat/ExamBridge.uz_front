/**
 * CenterDashboard — the monitoring screen every center manager lands on.
 *
 * Director, admin and platform staff see the whole center (with a Teachers
 * tab); a teacher sees only the students in their own groups. Data comes
 * from GET /centers/:id/monitoring/, which also completes tasks whose test
 * the student has finished, so results appear here without anyone pressing
 * a button.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle, ChevronDown, ChevronRight, Clock, Loader2, Plus, Search,
} from 'lucide-react'
import api from '../../api/client'
import { examTint, taskMeta } from './taskTypes'

/* ── small helpers ─────────────────────────────────────────── */
function ago(iso) {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso)) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

function Avatar({ name }) {
  return (
    <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
      {initials(name)}
    </span>
  )
}

function Progress({ done, total, rate }) {
  if (!total) return <span className="text-xs text-slate-300">No tasks</span>
  const tone = rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-sky-500' : 'bg-amber-400'
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${rate}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 tabular-nums w-9 text-right">{done}/{total}</span>
    </div>
  )
}

function ResultChip({ type, detail }) {
  if (!detail) return null
  const scoring = detail === 'Being scored'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${
      scoring ? 'text-slate-500 bg-slate-50 ring-slate-100' : examTint(type).chip
    }`}>
      {scoring && <Clock size={10} />}{detail}
    </span>
  )
}

function Kpi({ label, value, sub, tone = 'text-slate-900', children, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-slate-200/70 p-5"
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {children}
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </motion.div>
  )
}

/* ── tables ────────────────────────────────────────────────── */
const TH = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const TD = 'px-4 py-3 align-middle'

function StudentRow({ s }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr onClick={() => setOpen((v) => !v)} className="cursor-pointer hover:bg-slate-50/70 transition-colors">
        <td className={TD}>
          <div className="flex items-center gap-3">
            <Avatar name={s.name} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
              <p className="text-xs text-slate-400 truncate">{s.groups.join(', ') || 'No group'}</p>
            </div>
          </div>
        </td>
        <td className={TD}><Progress done={s.done} total={s.total} rate={s.rate ?? 0} /></td>
        <td className={`${TD} text-center`}>
          {s.overdue > 0
            ? <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">{s.overdue}</span>
            : <span className="text-xs text-slate-300">—</span>}
        </td>
        <td className={`${TD} hidden md:table-cell`}>
          {s.last_result
            ? <ResultChip type={s.last_result.type} detail={s.last_result.detail || 'Done'} />
            : <span className="text-xs text-slate-300">—</span>}
        </td>
        <td className={`${TD} hidden lg:table-cell text-xs ${s.inactive ? 'text-amber-600' : 'text-slate-500'}`}>
          {ago(s.last_seen)}
        </td>
        <td className={`${TD} w-8 text-slate-300`}>
          <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="bg-slate-50/60 px-4 py-3">
            {s.tasks.length === 0 ? (
              <p className="text-xs text-slate-400 px-11">No tasks assigned yet.</p>
            ) : (
              <ul className="pl-11 space-y-1.5">
                {s.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${examTint(t.type).dot}`} />
                    <span className="flex-1 min-w-0 truncate text-slate-700">
                      <span className="font-semibold">{t.title}</span>
                      <span className="text-slate-400"> · {taskMeta(t.type).label}</span>
                    </span>
                    {t.status === 'completed'
                      ? <ResultChip type={t.type} detail={t.detail || 'Done'} />
                      : <span className={`font-semibold ${t.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'}`}>
                          {t.status === 'overdue' ? 'Overdue' : 'To do'}
                        </span>}
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

function StudentsTable({ students }) {
  const [q, setQ] = useState('')
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? students.filter((s) => `${s.name} ${s.email} ${s.groups.join(' ')}`.toLowerCase().includes(term)) : students
  }, [students, q])

  return (
    <>
      <div className="px-4 pt-3 pb-2">
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70 focus-within:border-slate-300">
          <Search size={14} className="text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students or groups"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none" />
        </label>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-slate-400">No students{q ? ' match' : ' yet'}.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className={TH}>Student</th><th className={TH}>Tasks</th>
              <th className={`${TH} text-center`}>Overdue</th>
              <th className={`${TH} hidden md:table-cell`}>Last result</th>
              <th className={`${TH} hidden lg:table-cell`}>Last seen</th><th />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => <StudentRow key={s.id} s={s} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function SimpleTable({ head, rows, empty }) {
  if (!rows.length) return <p className="px-4 py-10 text-center text-sm text-slate-400">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead><tr className="border-b border-slate-100">{head.map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">{rows}</tbody>
      </table>
    </div>
  )
}

/* ── page ──────────────────────────────────────────────────── */
export default function CenterDashboard() {
  const { centerId, myRole } = useOutletContext()
  const navigate = useNavigate()
  const isTeacher = myRole === 'teacher'
  const canOpenTeachers = myRole === 'director' || myRole === 'admin' || myRole === 'staff'
  const [tab, setTab] = useState('students')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['center-monitoring', centerId],
    queryFn: () => api.get(`/centers/${centerId}/monitoring/`).then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  }
  if (isError || !data) {
    return <p className="py-24 text-center text-sm text-slate-400">Could not load the overview.</p>
  }

  const { kpis, students, groups, teachers, recent_results: recent } = data
  const attention = students.filter((s) => s.overdue > 0 || (s.inactive && s.total > 0)).slice(0, 6)
  const tabs = [
    { key: 'students', label: 'Students', count: students.length },
    { key: 'groups', label: 'Groups', count: groups.length },
    ...(isTeacher ? [] : [{ key: 'teachers', label: 'Teachers', count: teachers.length }]),
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isTeacher ? 'My students' : 'Center overview'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{data.center.name}</h1>
        </div>
        {myRole !== 'staff' && (
          <button onClick={() => navigate(`/center/${centerId}/assignments`)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors">
            <Plus size={15} /> New task
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi index={0} label="Students" value={kpis.students} sub={`${kpis.active_7d} active this week`} />
        <Kpi index={1} label="Tasks completed" value={kpis.rate == null ? '—' : `${kpis.rate}%`}
          sub={`${kpis.done} of ${kpis.total} · ${kpis.pending} to do`}>
          <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${kpis.rate || 0}%` }} />
          </div>
        </Kpi>
        <Kpi index={2} label="Overdue" value={kpis.overdue} tone={kpis.overdue ? 'text-rose-600' : 'text-slate-900'}
          sub={kpis.overdue ? 'Need a reminder' : 'Everyone on time'} />
        <Kpi index={3} label="Results this week" value={kpis.results_7d} sub={`${kpis.tasks} tasks given`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Tables */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
          <div className="flex gap-1 px-3 pt-3 border-b border-slate-100">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`relative px-3 pb-2.5 pt-1 text-sm font-semibold transition-colors ${
                  tab === t.key ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}>
                {t.label} <span className="text-xs font-medium text-slate-300">{t.count}</span>
                {tab === t.key && <motion.span layoutId="mon-tab" className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-slate-900" />}
              </button>
            ))}
          </div>

          {tab === 'students' && <StudentsTable students={students} />}

          {tab === 'groups' && (
            <SimpleTable
              head={['Group', 'Teacher', 'Students', 'Tasks', 'Overdue', '']}
              empty="No groups yet."
              rows={groups.map((g) => (
                <tr key={g.id} onClick={() => navigate(`/center/${centerId}/groups/${g.id}`)}
                  className="cursor-pointer hover:bg-slate-50/70 transition-colors">
                  <td className={`${TD} text-sm font-semibold text-slate-900`}>{g.name}</td>
                  <td className={`${TD} text-sm text-slate-500`}>{g.teacher || '—'}</td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{g.students}</td>
                  <td className={TD}><Progress done={g.done} total={g.total} rate={g.rate ?? 0} /></td>
                  <td className={`${TD} text-sm tabular-nums ${g.overdue ? 'text-rose-600 font-semibold' : 'text-slate-300'}`}>{g.overdue || '—'}</td>
                  <td className={`${TD} w-8 text-slate-300`}><ChevronRight size={15} /></td>
                </tr>
              ))}
            />
          )}

          {tab === 'teachers' && (
            <SimpleTable
              head={['Teacher', 'Groups', 'Students', 'Tasks given', 'Completion', 'Last seen']}
              empty="No teachers yet."
              rows={teachers.map((t) => (
                <tr key={t.id}
                  onClick={canOpenTeachers ? () => navigate(`/center/${centerId}/teachers/${t.id}`) : undefined}
                  className={canOpenTeachers ? 'cursor-pointer hover:bg-slate-50/70 transition-colors' : ''}>
                  <td className={TD}>
                    <div className="flex items-center gap-3"><Avatar name={t.name} />
                      <span className="text-sm font-semibold text-slate-900">{t.name}</span></div>
                  </td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{t.groups}</td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{t.students}</td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>
                    {t.tasks}{t.overdue > 0 && <span className="ml-2 text-xs font-semibold text-rose-600">{t.overdue} overdue</span>}
                  </td>
                  <td className={TD}><Progress done={t.done} total={t.total} rate={t.rate ?? 0} /></td>
                  <td className={`${TD} text-xs text-slate-500`}>{ago(t.last_seen)}</td>
                </tr>
              ))}
            />
          )}
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <AlertCircle size={15} className="text-amber-500" /> Needs attention
            </h2>
            {attention.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Nobody is behind. 👌</p>
            ) : (
              <ul className="space-y-2.5">
                {attention.map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <Avatar name={s.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {s.overdue > 0 && <span className="text-rose-600 font-medium">{s.overdue} overdue</span>}
                        {s.overdue > 0 && s.inactive && ' · '}
                        {s.inactive && <span className="text-amber-600">{s.last_seen ? `last seen ${ago(s.last_seen)}` : 'never signed in'}</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/70 p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Latest results</h2>
            {recent.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Results appear here as soon as students finish their tests.</p>
            ) : (
              <AnimatePresence initial={false}>
                <ul className="space-y-3">
                  {recent.map((r, i) => (
                    <motion.li key={`${r.student_id}-${r.at}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-start gap-3">
                      <Avatar name={r.student} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800 truncate">
                          <span className="font-semibold">{r.student}</span>
                        </p>
                        <p className="text-xs text-slate-400 truncate">{r.title} · {taskMeta(r.type).label}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <ResultChip type={r.type} detail={r.detail || 'Done'} />
                          <span className="text-[11px] text-slate-400">{ago(r.at)}</span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
              </AnimatePresence>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
