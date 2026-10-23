/**
 * CenterGroupDetail — a group's journal.
 *
 * Rows are students, columns are the group's lessons (newest first); each
 * cell shows whether the student finished that lesson, finished late,
 * started, missed it or still has it to do. Next to it: tasks done, missed,
 * late and on how many days of the last 30 the student actually studied.
 *
 * The teacher gives lessons from here; only the admin adds or removes
 * students.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Loader2, Plus, Search, UserMinus, UserPlus, Users, X } from 'lucide-react'
import api from '../../api/client'
import CreateLessonPanel from './CreateLessonPanel'
import {
  Avatar, Card, CardTitle, Columns, Empty, PageHeader, PrimaryButton, STATE, Stat, ago, weekLabel,
} from './ui'

function AddStudentModal({ centerId, groupId, current, onClose }) {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const { data: all = [], isLoading } = useQuery({
    queryKey: ['center-members', centerId, 'student'],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=student`).then((r) => r.data),
  })
  const add = useMutation({
    mutationFn: (sid) => api.post(`/centers/${centerId}/groups/${groupId}/students/`, { student_id: sid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['group-journal', centerId, groupId] })
      qc.invalidateQueries({ queryKey: ['center-groups', centerId] })
    },
  })
  const list = all.filter((s) => !current.has(s.id) && (!q || `${s.full_name} ${s.email}`.toLowerCase().includes(q.toLowerCase())))

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
        className="fixed z-50 inset-x-4 top-[12vh] mx-auto max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Add students</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="p-4">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70">
            <Search size={14} className="text-slate-400" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students"
              className="flex-1 bg-transparent text-sm outline-none" />
          </label>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100 border-t border-slate-100">
          {isLoading ? <li className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-300" /></li>
            : list.length === 0 ? <li className="py-8 text-center text-sm text-slate-400">Everyone is already here</li>
            : list.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={s.full_name} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{s.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.email}</p>
                </div>
                <button onClick={() => add.mutate(s.id)} disabled={add.isPending}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700">Add</button>
              </li>
            ))}
        </ul>
      </motion.div>
    </>
  )
}

export default function CenterGroupDetail() {
  const { centerId, groupId } = useParams()
  const { myRole } = useOutletContext()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [lessonOpen, setLessonOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['group-journal', centerId, groupId],
    queryFn: () => api.get(`/centers/${centerId}/groups/${groupId}/journal/`).then((r) => r.data),
  })
  const remove = useMutation({
    mutationFn: (sid) => api.delete(`/centers/${centerId}/groups/${groupId}/students/${sid}/remove/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['group-journal', centerId, groupId] }),
  })
  const memberIds = useMemo(() => new Set((data?.students || []).map((s) => s.id)), [data])

  if (isLoading) return <div className="py-24 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
  if (isError || !data) return <p className="py-24 text-center text-sm text-slate-400">This group is not available.</p>

  const { group, stats, columns, students, weekly } = data
  const back = myRole === 'teacher' ? 'dashboard' : 'groups'

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={() => navigate(`/center/${centerId}/${back}`)}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> Back
      </button>
      <PageHeader
        eyebrow="Group journal"
        title={group.name}
        subtitle={group.teacher ? `Teacher: ${group.teacher.name}` : 'No teacher yet'}
        action={
          <div className="flex gap-2">
            {data.can_manage_members && (
              <button onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300">
                <UserPlus size={15} /> Add students
              </button>
            )}
            {data.can_teach && <PrimaryButton icon={Plus} onClick={() => setLessonOpen(true)}>New lesson</PrimaryButton>}
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat index={0} label="Students" value={students.length} sub={`${stats.lessons.total} lessons given`} />
        <Stat index={1} label="Tasks finished" value={stats.rate == null ? '—' : `${stats.rate}%`} sub={`${stats.done} of ${stats.total}`} />
        <Stat index={2} label="Missed" value={stats.missed} tone={stats.missed ? 'text-rose-600' : 'text-slate-900'} sub={`${stats.late} done late`} />
        <Stat index={3} label="Study days" value={stats.study_days} sub="avg per student · last 30 days" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 lg:col-span-2">
          <CardTitle>Tasks finished by week</CardTitle>
          <Columns data={weekly.map((w) => ({ label: weekLabel(w.week), value: w.rate, title: `${w.done}/${w.given}` }))} />
        </Card>
        <Card className="p-5">
          <CardTitle>Who is behind</CardTitle>
          {students.filter((s) => s.missed > 0).length === 0 ? (
            <p className="text-sm text-slate-400">Nobody missed a task. 👏</p>
          ) : (
            <ul className="space-y-2.5">
              {students.filter((s) => s.missed > 0).sort((a, b) => b.missed - a.missed).slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <Avatar name={s.name} />
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">{s.name}</span>
                  <span className="text-xs font-semibold text-rose-600">{s.missed} missed</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Journal</h2>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {['done', 'late', 'partial', 'missed', 'pending'].map((s) => (
              <span key={s} className="inline-flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded ${STATE[s].cell}`} />{STATE[s].label}</span>
            ))}
          </div>
        </div>
        {students.length === 0 ? (
          <Empty icon={Users} title="No students in this group"
            text={data.can_manage_members ? 'Add students to start.' : 'The admin adds students to groups.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-left">
                  <th className="sticky left-0 bg-slate-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 min-w-[200px]">Student</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">Done</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">Missed</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center">Late</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center" title="Days studied in the last 30">Days</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-1 py-2.5 text-center" title={`${c.title} · ${c.date}`}>
                      <span className="block text-[10px] font-semibold text-slate-500 w-9 truncate mx-auto">
                        {new Date(`${c.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </th>
                  ))}
                  {data.can_manage_members && <th />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50">
                    <td className="sticky left-0 bg-white px-5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={s.name} size="w-7 h-7 text-[10px]" />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{s.name}</p>
                          <p className="text-[11px] text-slate-400">seen {ago(s.last_seen)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 text-center tabular-nums font-semibold text-slate-700">{s.done}<span className="text-slate-300 font-normal">/{s.total}</span></td>
                    <td className={`px-3 text-center tabular-nums ${s.missed ? 'text-rose-600 font-semibold' : 'text-slate-300'}`}>{s.missed || '—'}</td>
                    <td className={`px-3 text-center tabular-nums ${s.late ? 'text-amber-600 font-semibold' : 'text-slate-300'}`}>{s.late || '—'}</td>
                    <td className="px-3 text-center tabular-nums text-slate-600">{s.study_days}</td>
                    {columns.map((c) => {
                      const st = s.cells[c.key]
                      return (
                        <td key={c.key} className="px-1 py-2.5">
                          <span title={`${c.title}: ${st ? STATE[st].label : 'not given'}`}
                            className={`block w-7 h-7 mx-auto rounded-lg ${st ? STATE[st].cell : 'bg-white border border-dashed border-slate-200'}`} />
                        </td>
                      )
                    })}
                    {data.can_manage_members && (
                      <td className="px-3">
                        <button title="Remove from group" onClick={() => window.confirm(`Remove ${s.name} from ${group.name}?`) && remove.mutate(s.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><UserMinus size={14} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {columns.length > 0 && (
          <p className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400">
            Columns are lessons, newest first. Hover a square for the topic.
          </p>
        )}
      </Card>

      <AnimatePresence>
        {lessonOpen && <CreateLessonPanel centerId={centerId} preGroupId={Number(groupId)} onClose={() => setLessonOpen(false)} />}
        {adding && <AddStudentModal centerId={centerId} groupId={groupId} current={memberIds} onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </div>
  )
}
