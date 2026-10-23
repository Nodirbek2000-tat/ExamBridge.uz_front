/**
 * CenterDashboard — the overview every center role lands on.
 *
 *   director — trends (tasks finished per week, students studying per day),
 *              teachers compared, groups compared, every student
 *   admin    — what needs fixing (students without a group, groups without
 *              a teacher…), who studies, groups, every student
 *   teacher  — my latest lessons, who is behind, my groups, my students
 *
 * ExamBridge staff see the director's view. Data: GET /centers/:id/monitoring/.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence } from 'framer-motion'
import {
  AlertCircle, BookOpen, ChevronDown, ChevronRight, Loader2, Plus, Search, Trophy, UserPlus, Wrench,
} from 'lucide-react'
import api from '../../api/client'
import CreateLessonPanel from './CreateLessonPanel'
import { examTint, taskMeta } from './taskTypes'
import {
  Avatar, Bar, Card, CardTitle, Columns, PageHeader, PrimaryButton, Progress, ResultChip, StateBadge,
  Stat, Tabs, ago, dayLabel, weekLabel,
} from './ui'

const TH = 'px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400'
const TD = 'px-4 py-3 align-middle'

/* ── students table (all roles) ────────────────────────────── */
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
        <td className={`${TD} text-center text-sm tabular-nums ${s.missed ? 'text-rose-600 font-semibold' : 'text-slate-300'}`}>{s.missed || '—'}</td>
        <td className={`${TD} text-center text-sm tabular-nums hidden sm:table-cell ${s.late ? 'text-amber-600 font-semibold' : 'text-slate-300'}`}>{s.late || '—'}</td>
        <td className={`${TD} text-center text-sm tabular-nums text-slate-600 hidden sm:table-cell`}>{s.study_days}</td>
        <td className={`${TD} hidden md:table-cell`}>
          {s.last_result ? <ResultChip type={s.last_result.type} detail={s.last_result.detail || 'Done'} /> : <span className="text-xs text-slate-300">—</span>}
        </td>
        <td className={`${TD} hidden lg:table-cell text-xs whitespace-nowrap ${s.inactive ? 'text-amber-600' : 'text-slate-500'}`}>{ago(s.last_seen)}</td>
        <td className={`${TD} w-8 text-slate-300`}><ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} /></td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="bg-slate-50/60 px-4 py-3">
            {s.tasks.length === 0 ? <p className="pl-11 text-xs text-slate-400">No tasks yet.</p> : (
              <ul className="pl-11 space-y-1.5">
                {s.tasks.map((t, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full ${examTint(t.type).dot}`} />
                    <span className="flex-1 min-w-0 truncate text-slate-700">
                      {t.lesson && <span className="text-slate-400">{t.lesson} · </span>}
                      <span className="font-semibold">{t.title}</span>
                      <span className="text-slate-400"> · {taskMeta(t.type).label}</span>
                    </span>
                    {t.state === 'done' || t.state === 'late'
                      ? <span className="flex items-center gap-1.5"><ResultChip type={t.type} detail={t.detail || 'Done'} />
                          {t.state === 'late' && <span className="font-semibold text-amber-600">late</span>}</span>
                      : <StateBadge state={t.state} />}
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
      {rows.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-400">No students{q ? ' match' : ' yet'}.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              <th className={TH}>Student</th><th className={TH}>Tasks</th>
              <th className={`${TH} text-center`}>Missed</th>
              <th className={`${TH} text-center hidden sm:table-cell`}>Late</th>
              <th className={`${TH} text-center hidden sm:table-cell`} title="Days studied in the last 30">Days</th>
              <th className={`${TH} hidden md:table-cell`}>Last result</th>
              <th className={`${TH} hidden lg:table-cell`}>Last seen</th><th />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((s) => <StudentRow key={s.id} s={s} />)}</tbody>
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

function GroupsTable({ groups, onOpen }) {
  return (
    <SimpleTable head={['Group', 'Teacher', 'Students', 'Tasks finished', 'Missed', 'Study days', '']} empty="No groups yet."
      rows={groups.map((g) => (
        <tr key={g.id} onClick={() => onOpen(g.id)} className="cursor-pointer hover:bg-slate-50/70 transition-colors">
          <td className={`${TD} text-sm font-semibold text-slate-900`}>{g.name}</td>
          <td className={`${TD} text-sm ${g.teacher ? 'text-slate-500' : 'text-amber-600'}`}>{g.teacher || 'No teacher'}</td>
          <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{g.students}</td>
          <td className={TD}><Progress done={g.done} total={g.total} rate={g.rate ?? 0} /></td>
          <td className={`${TD} text-sm tabular-nums ${g.missed ? 'text-rose-600 font-semibold' : 'text-slate-300'}`}>{g.missed || '—'}</td>
          <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{g.study_days}</td>
          <td className={`${TD} w-8 text-slate-300`}><ChevronRight size={15} /></td>
        </tr>
      ))} />
  )
}

/* ── side cards ────────────────────────────────────────────── */
function NeedsAttention({ students }) {
  const list = students.filter((s) => s.missed > 0 || (s.inactive && s.total > 0)).slice(0, 6)
  return (
    <Card className="p-4">
      <CardTitle icon={AlertCircle} tone="text-amber-500">Needs attention</CardTitle>
      {list.length === 0 ? <p className="text-xs text-slate-400 py-2">Nobody is behind. 👌</p> : (
        <ul className="space-y-2.5">
          {list.map((s) => (
            <li key={s.id} className="flex items-center gap-3">
              <Avatar name={s.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                <p className="text-xs text-slate-400 truncate">
                  {s.missed > 0 && <span className="text-rose-600 font-medium">{s.missed} missed</span>}
                  {s.missed > 0 && s.inactive && ' · '}
                  {s.inactive && <span className="text-amber-600">{s.last_seen ? `last seen ${ago(s.last_seen)}` : 'never signed in'}</span>}
                </p>
              </div>
              <span className="text-xs text-slate-400 tabular-nums" title="Days studied, last 30">{s.study_days}d</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function LatestResults({ recent }) {
  return (
    <Card className="p-4">
      <CardTitle icon={Trophy} tone="text-emerald-500">Latest results</CardTitle>
      {recent.length === 0 ? <p className="text-xs text-slate-400 py-2">Results appear as soon as students finish a test.</p> : (
        <ul className="space-y-3">
          {recent.slice(0, 8).map((r, i) => (
            <li key={i} className="flex items-start gap-3">
              <Avatar name={r.student} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{r.student}</p>
                <p className="text-xs text-slate-400 truncate">{r.lesson ? `${r.lesson} · ` : ''}{taskMeta(r.type).label}</p>
                <div className="mt-1 flex items-center gap-2">
                  <ResultChip type={r.type} detail={r.detail || 'Done'} />
                  <span className="text-[11px] text-slate-400">{ago(r.at)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function ToFix({ data, centerId, navigate }) {
  const items = [
    { key: 'students_without_group', title: 'Students without a group', to: 'groups' },
    { key: 'groups_without_teacher', title: 'Groups without a teacher', to: 'groups' },
    { key: 'teachers_without_group', title: 'Teachers without a group', to: 'groups' },
  ]
  const total = items.reduce((n, i) => n + data[i.key].length, 0)
  return (
    <Card className="p-4">
      <CardTitle icon={Wrench} tone="text-indigo-500" right={<span className="text-xs text-slate-400">{total ? `${total} to fix` : 'All set'}</span>}>To fix</CardTitle>
      {total === 0 ? <p className="text-xs text-slate-400 py-2">Every student has a group and every group a teacher. ✅</p> : (
        <div className="space-y-3">
          {items.filter((i) => data[i.key].length).map((i) => (
            <button key={i.key} onClick={() => navigate(`/center/${centerId}/${i.to}`)} className="w-full text-left group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{i.title}</span>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">{data[i.key].length}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400 truncate group-hover:text-slate-600">
                {data[i.key].slice(0, 4).map((x) => x.name).join(', ')}{data[i.key].length > 4 ? '…' : ''}
              </p>
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

function LessonsStrip({ lessons, centerId, navigate, onNew }) {
  return (
    <Card className="p-4">
      <CardTitle icon={BookOpen} tone="text-indigo-500"
        right={<button onClick={() => navigate(`/center/${centerId}/lessons`)} className="text-xs font-semibold text-slate-500 hover:text-slate-900">All lessons →</button>}>
        Latest lessons
      </CardTitle>
      {lessons.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-slate-500">No lessons yet.</p>
          {onNew && <button onClick={onNew} className="mt-2 text-sm font-semibold text-indigo-600 hover:underline">Give the first one</button>}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {lessons.map((l) => {
            const pct = l.students ? Math.round((l.done / l.students) * 100) : 0
            return (
              <button key={l.id} onClick={() => navigate(`/center/${centerId}/lessons`)}
                className="text-left p-4 rounded-xl border border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/50 transition-colors">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{dayLabel(l.date)} · {l.group || 'Personal'}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{l.topic}</p>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="flex-1"><Bar value={pct} /></div>
                  <span className="text-xs font-semibold text-slate-600 tabular-nums">{l.done}/{l.students}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}

/* ── page ──────────────────────────────────────────────────── */
export default function CenterDashboard() {
  const { centerId, myRole } = useOutletContext()
  const navigate = useNavigate()
  const [tab, setTab] = useState('students')
  const [lessonOpen, setLessonOpen] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['center-monitoring', centerId],
    queryFn: () => api.get(`/centers/${centerId}/monitoring/`).then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
  if (isError || !data) return <p className="py-24 text-center text-sm text-slate-400">Could not load the overview.</p>

  const role = data.my_role
  const isTeacher = role === 'teacher'
  const isAdmin = role === 'admin'
  const { kpis, students, groups, lessons, recent_results: recent } = data
  const openGroup = (gid) => navigate(`/center/${centerId}/groups/${gid}`)

  const header = {
    director: ['Director overview', 'How the whole center is doing'],
    staff: ['ExamBridge view', 'How the whole center is doing'],
    admin: ['Admin desk', 'Students, groups and what needs fixing'],
    teacher: ['My classes', 'Your lessons, groups and students'],
  }[role] || ['Overview', '']

  const tabs = [
    { key: 'students', label: 'Students', count: students.length },
    { key: 'groups', label: 'Groups', count: groups.length },
    ...(!isTeacher && !isAdmin ? [{ key: 'teachers', label: 'Teachers', count: data.teachers.length }] : []),
  ]

  const weeklyChart = (
    <Card className="p-5">
      <CardTitle right={<span className="text-xs text-slate-400">last 6 weeks</span>}>Tasks finished by week</CardTitle>
      <Columns data={data.weekly.map((w) => ({ label: weekLabel(w.week), value: w.rate, title: `${w.done}/${w.given} finished` }))} />
    </Card>
  )
  const dailyChart = data.daily && (
    <Card className="p-5">
      <CardTitle right={<span className="text-xs text-slate-400">last 14 days</span>}>Students studying per day</CardTitle>
      <Columns tone="bg-emerald-500" data={data.daily.map((d) => ({
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric' }),
        value: kpis.students ? Math.round((d.students / kpis.students) * 100) : 0,
        display: d.students || '',
        title: `${d.students} students on ${d.date}`,
      }))} />
    </Card>
  )

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader eyebrow={header[0]} title={data.center.name} subtitle={header[1]}
        action={
          isTeacher ? <PrimaryButton icon={Plus} onClick={() => setLessonOpen(true)}>New lesson</PrimaryButton>
          : isAdmin ? <PrimaryButton icon={UserPlus} onClick={() => navigate(`/center/${centerId}/students`)}>Add student</PrimaryButton>
          : null
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat index={0} label="Students" value={kpis.students} sub={`${kpis.active_7d} studied this week`} />
        <Stat index={1} label="Tasks finished" value={kpis.rate == null ? '—' : `${kpis.rate}%`} sub={`${kpis.done} of ${kpis.tasks} · ${kpis.pending} to do`}>
          <div className="mt-3"><Bar value={kpis.rate} tone="bg-emerald-500" /></div>
        </Stat>
        <Stat index={2} label="Missed" value={kpis.missed} tone={kpis.missed ? 'text-rose-600' : 'text-slate-900'} sub={`${kpis.late} finished late`} />
        <Stat index={3} label="Study days" value={kpis.study_days_avg} sub={`avg per student · 30 days · ${kpis.lessons_7d} lessons this week`} />
      </div>

      {/* Role-specific top section */}
      {isTeacher && (
        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2"><LessonsStrip lessons={lessons} centerId={centerId} navigate={navigate} onNew={() => setLessonOpen(true)} /></div>
          <NeedsAttention students={students} />
        </div>
      )}
      {isAdmin && (
        <div className="grid lg:grid-cols-3 gap-4 mb-4">
          <ToFix data={data.to_fix} centerId={centerId} navigate={navigate} />
          <div className="lg:col-span-2">{dailyChart}</div>
        </div>
      )}
      {!isTeacher && !isAdmin && (
        <div className="grid lg:grid-cols-2 gap-4 mb-4">{weeklyChart}{dailyChart}</div>
      )}
      {isTeacher && groups.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {groups.map((g) => (
            <button key={g.id} onClick={() => openGroup(g.id)}
              className="text-left bg-white rounded-2xl border border-slate-200/70 p-5 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{g.name}</p>
                <ChevronRight size={15} className="text-slate-300" />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{g.students} students · {g.lessons} lessons · {g.study_days} study days avg</p>
              <div className="mt-4 flex items-center gap-2.5">
                <div className="flex-1"><Bar value={g.rate} /></div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums">{g.rate == null ? '—' : `${g.rate}%`}</span>
              </div>
              {g.missed > 0 && <p className="mt-2 text-xs font-medium text-rose-600">{g.missed} missed tasks</p>}
            </button>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 overflow-hidden">
          <Tabs id="overview-tabs" tabs={tabs} value={tab} onChange={setTab} />
          {tab === 'students' && <StudentsTable students={students} />}
          {tab === 'groups' && <GroupsTable groups={groups} onOpen={openGroup} />}
          {tab === 'teachers' && (
            <SimpleTable head={['Teacher', 'Groups', 'Students', 'Lessons', 'Tasks finished', 'Last lesson']} empty="No teachers yet."
              rows={data.teachers.map((t, i) => (
                <tr key={t.id} onClick={() => navigate(`/center/${centerId}/teachers/${t.id}`)} className="cursor-pointer hover:bg-slate-50/70 transition-colors">
                  <td className={TD}>
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-xs font-semibold text-slate-300 tabular-nums">{i + 1}</span>
                      <Avatar name={t.name} />
                      <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{t.name}</span>
                    </div>
                  </td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{t.groups}</td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>{t.students}</td>
                  <td className={`${TD} text-sm text-slate-600 tabular-nums`}>
                    {t.lessons}{t.lessons_7d > 0 && <span className="ml-1.5 text-xs text-emerald-600 whitespace-nowrap">+{t.lessons_7d} this week</span>}
                  </td>
                  <td className={TD}><Progress done={t.done} total={t.total} rate={t.rate ?? 0} /></td>
                  <td className={`${TD} text-xs ${t.last_lesson ? 'text-slate-500' : 'text-amber-600'}`}>{t.last_lesson ? ago(t.last_lesson) : 'never'}</td>
                </tr>
              ))} />
          )}
        </Card>
        <div className="space-y-4">
          {!isTeacher && <NeedsAttention students={students} />}
          {isTeacher && weeklyChart}
          <LatestResults recent={recent} />
        </div>
      </div>

      <AnimatePresence>
        {lessonOpen && <CreateLessonPanel centerId={centerId} onClose={() => setLessonOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}
