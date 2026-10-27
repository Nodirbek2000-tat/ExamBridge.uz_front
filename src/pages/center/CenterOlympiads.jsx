/**
 * CenterOlympiads — schedule and follow olympiads.
 * Route: /center/:centerId/olympiads
 *
 * Admin: all students, chosen classes or groups. Teacher: own groups.
 * The test can be any type — IELTS / CEFR / SAT, a part or a full mock —
 * from the center's own tests or ExamBridge's. Live view shows who joined,
 * who is writing and who finished; after the end, the podium and ranking.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CalendarClock, Check, Loader2, Plus, Radio, Search, Trash2, Trophy, Users, X } from 'lucide-react'
import api from '../../api/client'
import { EXAMS, KIND_LABEL, TASK_TYPES, examTint, taskMeta } from './taskTypes'
import { Card, Empty, PageHeader, PrimaryButton } from './ui'
import Leaderboard, { Podium } from '../olympiad/Leaderboard'
import { shortUntil, syncServerClock, useNow, whenLabel } from '../olympiad/clock'

const EXAMS_WITH_SAT = EXAMS
const LABEL = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2'
const INPUT = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

const PHASE = {
  live: { label: 'Live now', cls: 'bg-rose-500 text-white', dot: true },
  soon: { label: 'Starting soon', cls: 'bg-amber-100 text-amber-800' },
  upcoming: { label: 'Scheduled', cls: 'bg-slate-100 text-slate-600' },
  finished: { label: 'Finished', cls: 'bg-emerald-50 text-emerald-700' },
}

function PhaseChip({ phase }) {
  const p = PHASE[phase]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${p.cls}`}>
      {p.dot && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}{p.label}
    </span>
  )
}

const pad = (n) => String(n).padStart(2, '0')
const localInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/* ── create ────────────────────────────────────────────────── */
function CreatePanel({ centerId, myRole, onClose }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const isTeacher = myRole === 'teacher'
  const tomorrow = new Date(Date.now() + 86400000)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [day, setDay] = useState(localInput(tomorrow))
  const [time, setTime] = useState('10:00')
  const [duration, setDuration] = useState(60)
  const [mode, setMode] = useState(isTeacher ? 'groups' : 'all')
  const [classes, setClasses] = useState([])
  const [groups, setGroups] = useState([])
  const [taskType, setTaskType] = useState('ielts_reading')
  const [test, setTest] = useState(null)
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: classList = [] } = useQuery({
    queryKey: ['center-classes', centerId],
    queryFn: () => api.get(`/centers/${centerId}/classes/`).then((r) => r.data),
    enabled: !isTeacher,
  })
  const { data: groupList = [] } = useQuery({
    queryKey: ['center-groups', centerId],
    queryFn: () => api.get(`/centers/${centerId}/groups/`).then((r) => r.data),
  })
  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['available-tasks', centerId, taskType],
    queryFn: () => api.get(`/centers/${centerId}/available-tasks/?type=${taskType}`).then((r) => r.data),
    staleTime: 60_000,
  })
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? tests.filter((x) => `${x.title} ${x.meta || ''}`.toLowerCase().includes(t)) : tests
  }, [tests, q])
  const exam = taskMeta(taskType).exam
  const tint = examTint(taskType)
  const toggle = (list, setList, v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const save = async () => {
    setErr('')
    if (!title.trim()) return setErr('Give the olympiad a title')
    if (!test) return setErr('Pick a test')
    const audience = mode === 'all' ? { all: true } : mode === 'classes' ? { classes } : { groups }
    if (mode === 'classes' && !classes.length) return setErr('Pick at least one class')
    if (mode === 'groups' && !groups.length) return setErr('Pick at least one group')
    setSaving(true)
    try {
      await api.post(`/centers/${centerId}/olympiads/`, {
        title: title.trim(), description, starts_at: new Date(`${day}T${time}`).toISOString(), duration_minutes: duration,
        task_type: taskType, task_ref_id: test.id, task_ref_kind: test.kind, task_title: test.title, audience,
      })
      qc.invalidateQueries({ queryKey: ['center-olympiads', centerId] })
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not create the olympiad')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full max-w-[620px] bg-slate-50 shadow-2xl z-50 flex flex-col">
        <header className="px-6 py-5 bg-white border-b border-slate-200/70 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New olympiad</h2>
            <p className="text-xs text-slate-500 mt-0.5">Everyone starts the same test at the same moment.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {err && <p className="p-3 rounded-xl bg-rose-50 text-sm font-medium text-rose-700">{err}</p>}
          <div>
            <label className={LABEL}>Title</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="e.g. Spring IELTS Olympiad" className={INPUT} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3">
            <div><label className={LABEL}>Day</label><input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={INPUT} /></div>
            <div><label className={LABEL}>Start time</label><input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={INPUT} /></div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL}>Minutes</label>
              <input type="number" min={5} max={300} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={`${INPUT} sm:w-24`} />
            </div>
          </div>
          <p className="-mt-3 text-xs text-slate-500">
            {test?.minutes
              ? <>Set from the test: <b>{test.minutes} min</b>{duration !== test.minutes && <> · <button type="button" onClick={() => setDuration(test.minutes)} className="font-semibold text-indigo-600 hover:underline">use it</button></>}</>
              : 'Pick a test below — its time is filled in automatically.'}
          </p>

          {/* Who */}
          <div>
            <label className={LABEL}>Who takes part</label>
            {!isTeacher && (
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/60 rounded-xl mb-3">
                {[['all', 'All students'], ['classes', 'Classes'], ['groups', 'Groups']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setMode(k)}
                    className={`py-2 rounded-lg text-sm font-semibold ${mode === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
                ))}
              </div>
            )}
            {mode === 'classes' && (
              classList.length === 0
                ? <p className="text-sm text-slate-400">No classes yet — set students' classes on the Students page.</p>
                : <div className="flex flex-wrap gap-1.5">
                    {classList.map((c) => (
                      <button key={c.label} type="button" onClick={() => toggle(classes, setClasses, c.label)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${classes.includes(c.label) ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200'}`}>
                        {c.label} <span className="font-medium opacity-60">{c.students}</span>
                      </button>
                    ))}
                  </div>
            )}
            {mode === 'groups' && (
              groupList.length === 0
                ? <p className="text-sm text-slate-400">No groups yet.</p>
                : <div className="flex flex-wrap gap-1.5">
                    {groupList.map((g) => (
                      <button key={g.id} type="button" onClick={() => toggle(groups, setGroups, g.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${groups.includes(g.id) ? 'bg-indigo-600 text-white border-transparent' : 'bg-white text-slate-700 border-slate-200'}`}>
                        {g.name} <span className="font-medium opacity-60">{g.student_count}</span>
                      </button>
                    ))}
                  </div>
            )}
            {mode === 'all' && <p className="text-sm text-slate-500">Every student of the center is invited.</p>}
          </div>

          {/* Test */}
          <div>
            <label className={LABEL}>Test {test && <span className="normal-case font-semibold text-slate-700">— {test.title}</span>}</label>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <div className="p-3 space-y-2.5 border-b border-slate-100">
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl">
                  {EXAMS_WITH_SAT.map((e) => (
                    <button key={e.key} type="button" onClick={() => { setTaskType(TASK_TYPES.find((t) => t.exam === e.key).value); setTest(null) }}
                      className={`py-1.5 rounded-lg text-xs font-bold ${exam === e.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{e.label}</button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TASK_TYPES.filter((t) => t.exam === exam).map((t) => (
                    <button key={t.value} type="button" onClick={() => { setTaskType(t.value); setTest(null) }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${taskType === t.value ? `${tint.solid} text-white border-transparent` : 'bg-white text-slate-600 border-slate-200'}`}>
                      {t.skill}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <Search size={14} className="text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="flex-1 bg-transparent text-sm outline-none" />
                </label>
              </div>
              <ul className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                {isLoading ? <li className="py-8 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-300" /></li>
                  : shown.length === 0 ? <li className="py-8 text-center text-sm text-slate-400">Nothing here yet</li>
                  : shown.map((t) => {
                    const on = test && test.id === t.id && test.kind === t.kind
                    return (
                      <li key={`${t.kind}-${t.id}`}>
                        <button type="button" onClick={() => { setTest(on ? null : t); if (!on && t.minutes) setDuration(t.minutes) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${on ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-white' : tint.dot}`} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium truncate">{t.title}</span>
                            <span className={`block text-[11px] ${on ? 'text-white/60' : 'text-slate-400'}`}>{t.meta || KIND_LABEL[t.kind]}{t.minutes ? ` · ${t.minutes} min` : ''}</span>
                          </span>
                          {on && <Check size={15} />}
                        </button>
                      </li>
                    )
                  })}
              </ul>
            </div>
            <button type="button" onClick={() => navigate(`/center/${centerId}/tests`)} className="mt-2 text-xs font-semibold text-indigo-600 hover:underline">
              + Add your own test on the Tests page
            </button>
          </div>

          <div>
            <label className={LABEL}>Note for students <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${INPUT} resize-none`} />
          </div>
        </div>
        <footer className="px-6 py-4 bg-white border-t border-slate-200/70">
          <PrimaryButton className="w-full" icon={saving ? Loader2 : Trophy} disabled={saving} onClick={save}>Schedule olympiad</PrimaryButton>
        </footer>
      </motion.aside>
    </>
  )
}

/* ── detail (live board) ───────────────────────────────────── */
function Detail({ centerId, id, canCancel, onBack }) {
  const qc = useQueryClient()
  const now = useNow()
  const { data } = useQuery({
    queryKey: ['center-olympiad', centerId, id],
    queryFn: () => api.get(`/centers/${centerId}/olympiads/${id}/`).then((r) => { syncServerClock(r.data.server_now); return r.data }),
    refetchInterval: 10_000,
  })
  const cancel = useMutation({
    mutationFn: () => api.delete(`/centers/${centerId}/olympiads/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['center-olympiads', centerId] }); onBack() },
  })
  if (!data) return <div className="py-24 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>

  const starts = new Date(data.starts_at).getTime()
  const ends = new Date(data.ends_at).getTime()
  const phase = now < starts ? (starts - now < 300000 ? 'soon' : 'upcoming') : now < ends ? 'live' : 'finished'
  const counts = data.board.reduce((a, r) => ({ ...a, [r.state]: (a[r.state] || 0) + 1 }), {})

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700"><ArrowLeft size={14} />All olympiads</button>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <PhaseChip phase={phase} />
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{data.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{whenLabel(data.starts_at)} · {data.duration_minutes} min · {taskMeta(data.task.type).label}: {data.task.title} · {data.audience_label}</p>
        </div>
        <div className="text-right">
          {phase !== 'finished' && (
            <p className="text-3xl font-bold text-slate-900 tabular-nums">{shortUntil((phase === 'live' ? ends : starts) - now)}</p>
          )}
          <p className="text-xs text-slate-400">{phase === 'live' ? 'until the end' : phase === 'finished' ? '' : 'until the start'}</p>
          {canCancel && phase !== 'finished' && (
            <button onClick={() => window.confirm('Cancel this olympiad? Students will no longer see it.') && cancel.mutate()}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:underline"><Trash2 size={12} />Cancel</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[['Invited', data.participants], ['In waiting room', counts.waiting || 0], ['Taking the test', counts.testing || 0],
          ['Finished', (counts.scored || 0) + (counts.scoring || 0)]].map(([l, v]) => (
          <Card key={l} className="p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{v}</p></Card>
        ))}
      </div>

      {phase === 'finished' && data.board.some((r) => r.rank) && (
        <Card className="p-6 mb-4"><Podium board={data.board} /></Card>
      )}
      <Card className="overflow-hidden"><Leaderboard board={data.board} /></Card>
    </div>
  )
}

/* ── page ──────────────────────────────────────────────────── */
export default function CenterOlympiads() {
  const { centerId, myRole } = useOutletContext()
  const now = useNow(30_000)
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState(null)
  const canCreate = myRole === 'admin' || myRole === 'teacher' || myRole === 'staff'
  const canCancel = myRole === 'admin' || myRole === 'teacher' || myRole === 'staff'

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['center-olympiads', centerId],
    queryFn: () => api.get(`/centers/${centerId}/olympiads/`).then((r) => r.data),
    refetchInterval: 30_000,
  })

  if (openId) return <Detail centerId={centerId} id={openId} canCancel={canCancel} onBack={() => setOpenId(null)} />

  const groups = [
    ['Live now', list.filter((o) => o.phase === 'live')],
    ['Coming up', list.filter((o) => o.phase === 'soon' || o.phase === 'upcoming').reverse()],
    ['Finished', list.filter((o) => o.phase === 'finished')],
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader eyebrow="Competitions" title="Olympiads"
        subtitle="Pick a day, a time and a test — everyone starts together and the ranking appears at the end."
        action={canCreate && <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>New olympiad</PrimaryButton>} />

      {isLoading ? <div className="py-20 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        : list.length === 0 ? (
          <Card><Empty icon={Trophy} title="No olympiads yet" text="Schedule the first one — students get a notice and a countdown."
            action={canCreate && <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>New olympiad</PrimaryButton>} /></Card>
        ) : (
          <div className="space-y-7">
            {groups.filter(([, items]) => items.length).map(([label, items]) => (
              <section key={label}>
                <h2 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {items.map((o) => {
                    const starts = new Date(o.starts_at).getTime()
                    return (
                      <button key={o.id} onClick={() => setOpenId(o.id)} className="text-left">
                        <Card className={`p-5 h-full hover:border-slate-300 transition-colors ${o.phase === 'live' ? 'ring-2 ring-rose-200' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate">{o.title}</p>
                              <p className="mt-0.5 text-xs text-slate-500 inline-flex items-center gap-1"><CalendarClock size={12} />{whenLabel(o.starts_at)} · {o.duration_minutes} min</p>
                            </div>
                            <PhaseChip phase={o.phase} />
                          </div>
                          <p className="mt-3 text-sm text-slate-600 truncate">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${examTint(o.task.type).dot}`} />
                            {taskMeta(o.task.type).label} · {o.task.title}
                          </p>
                          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1"><Users size={12} />{o.participants} · {o.audience_label}</span>
                            {o.phase === 'live' && <span className="inline-flex items-center gap-1 text-rose-600"><Radio size={12} />{o.entered} in</span>}
                            {o.phase === 'finished' && <span className="inline-flex items-center gap-1 text-emerald-700"><Trophy size={12} />{o.finished} finished</span>}
                            {(o.phase === 'upcoming' || o.phase === 'soon') && <span className="ml-auto font-semibold text-slate-700 tabular-nums">in {shortUntil(starts - now)}</span>}
                          </div>
                        </Card>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

      <AnimatePresence>
        {creating && <CreatePanel centerId={centerId} myRole={myRole} onClose={() => setCreating(false)} />}
      </AnimatePresence>
    </div>
  )
}
