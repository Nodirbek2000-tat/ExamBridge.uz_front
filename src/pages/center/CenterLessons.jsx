/**
 * CenterLessons — every lesson given in the center (a teacher sees their own).
 * Open a lesson to see each student against each task; the teacher who gave
 * it can delete a single task or the whole lesson.
 */
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CalendarClock, ChevronDown, Loader2, Plus, Trash2, Users, User } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import CreateLessonPanel from './CreateLessonPanel'
import { examTint, taskMeta } from './taskTypes'
import { Avatar, Bar, Card, Empty, PageHeader, PrimaryButton, ResultChip, STATE, StateBadge, dayLabel } from './ui'

function LessonDetail({ centerId, lesson, canEdit }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['center-lesson', centerId, lesson.id],
    queryFn: () => api.get(`/centers/${centerId}/lessons/${lesson.id}/`).then((r) => r.data),
  })
  const removeTask = useMutation({
    mutationFn: (id) => api.delete(`/centers/${centerId}/assignments/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-lessons', centerId] })
      qc.invalidateQueries({ queryKey: ['center-lesson', centerId, lesson.id] })
    },
  })

  if (isLoading || !data) {
    return <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
  }
  return (
    <div className="border-t border-slate-100">
      {lesson.description && <p className="px-5 pt-4 text-sm text-slate-600">{lesson.description}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Student</th>
              {data.tasks.map((t) => (
                <th key={t.id} className="px-3 py-3 align-bottom min-w-[150px]">
                  <div className="flex items-start gap-1.5">
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${examTint(t.task_type).chip.split(' ')[0]}`}>
                        {taskMeta(t.task_type).label}
                      </p>
                      <p className="text-xs font-semibold text-slate-700 truncate max-w-[160px]" title={t.task_title}>{t.task_title}</p>
                    </div>
                    {canEdit && (
                      <button title="Delete this task" onClick={() => window.confirm('Delete this task for everyone?') && removeTask.mutate(t.id)}
                        className="p-1 text-slate-300 hover:text-rose-500 flex-shrink-0"><Trash2 size={12} /></button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.students.map((row) => (
              <tr key={row.student.id}>
                <td className="px-5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={row.student.full_name} size="w-7 h-7 text-[10px]" />
                    <span className="font-medium text-slate-800 whitespace-nowrap">{row.student.full_name}</span>
                  </div>
                </td>
                {data.tasks.map((t) => {
                  const cell = row.tasks[t.id]
                  if (!cell) return <td key={t.id} className="px-3 text-slate-300">—</td>
                  return (
                    <td key={t.id} className="px-3 py-2.5">
                      {cell.state === 'done' || cell.state === 'late'
                        ? <div className="flex items-center gap-1.5"><ResultChip type={t.task_type} detail={cell.detail || 'Done'} />
                            {cell.state === 'late' && <span className="text-[10px] font-semibold text-amber-600">late</span>}</div>
                        : <StateBadge state={cell.state} />}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LessonCard({ centerId, lesson, canEdit }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const remove = useMutation({
    mutationFn: () => api.delete(`/centers/${centerId}/lessons/${lesson.id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-lessons', centerId] })
      qc.invalidateQueries({ queryKey: ['center-monitoring', centerId] })
    },
  })
  const pct = lesson.students_total ? Math.round((lesson.students_done / lesson.students_total) * 100) : 0

  return (
    <Card className="overflow-hidden">
      <div className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors" onClick={() => setOpen((v) => !v)}>
        <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-semibold text-slate-900">{lesson.topic}</h3>
            {lesson.is_overdue && pct < 100 && <span className="text-[11px] font-semibold text-rose-600">deadline passed</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              {lesson.group ? <Users size={12} /> : <User size={12} />}{lesson.group?.name || lesson.student?.name}
            </span>
            <span>{lesson.teacher.name}</span>
            {lesson.deadline && (
              <span className="inline-flex items-center gap-1"><CalendarClock size={12} />
                {new Date(lesson.deadline).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lesson.tasks.map((t) => (
              <span key={t.id} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold ring-1 ${examTint(t.task_type).chip}`}>
                {taskMeta(t.task_type).label}
                <span className="opacity-60 tabular-nums">{t.done}/{t.total}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="w-36 flex-shrink-0 hidden sm:block">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-xs text-slate-500">Finished</span>
            <span className="text-sm font-semibold text-slate-900 tabular-nums">{lesson.students_done}/{lesson.students_total}</span>
          </div>
          <Bar value={pct} />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canEdit && (
            <button title="Delete lesson" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${lesson.topic}" and all its tasks?`)) remove.mutate() }}
              className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
              {remove.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <LessonDetail centerId={centerId} lesson={lesson} canEdit={canEdit} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default function CenterLessons() {
  const { centerId, myRole } = useOutletContext()
  const me = useAuthStore((s) => s.user)
  const [creating, setCreating] = useState(false)
  const [groupFilter, setGroupFilter] = useState('')
  const isTeacher = myRole === 'teacher'
  const canGive = isTeacher || (myRole === 'staff' && me?.admin_tier && ['super', 1].includes(me.admin_tier))

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['center-lessons', centerId, groupFilter],
    queryFn: () => api.get(`/centers/${centerId}/lessons/${groupFilter ? `?group_id=${groupFilter}` : ''}`).then((r) => r.data),
  })
  const { data: groups = [] } = useQuery({
    queryKey: ['center-groups', centerId],
    queryFn: () => api.get(`/centers/${centerId}/groups/`).then((r) => r.data),
  })

  const byDay = useMemo(() => {
    const m = new Map()
    lessons.forEach((l) => { if (!m.has(l.date)) m.set(l.date, []); m.get(l.date).push(l) })
    return [...m.entries()]
  }, [lessons])

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        eyebrow={isTeacher ? 'My lessons' : 'All lessons'}
        title="Lessons"
        subtitle={isTeacher ? 'Give a topic with several tests at once and follow who finished.' : 'Lessons teachers gave and how students did.'}
        action={canGive && <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>New lesson</PrimaryButton>}
      />

      {groups.length > 1 && (
        <div className="mb-5 flex gap-1.5 overflow-x-auto">
          {[{ id: '', name: 'All groups' }, ...groups].map((g) => (
            <button key={g.id} onClick={() => setGroupFilter(String(g.id))}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                groupFilter === String(g.id) ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'}`}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
      ) : lessons.length === 0 ? (
        <Card><Empty icon={BookOpen} title="No lessons yet"
          text={canGive ? 'Give your first lesson: a topic and a few tests.' : 'Lessons appear here when teachers give them.'}
          action={canGive && <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>New lesson</PrimaryButton>} /></Card>
      ) : (
        <div className="space-y-7">
          {byDay.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{dayLabel(day)}</h2>
              <div className="space-y-3">
                {items.map((l) => (
                  <LessonCard key={l.id} centerId={centerId} lesson={l}
                    canEdit={l.teacher.id === me?.id || (myRole === 'staff' && canGive)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center gap-3 text-[11px] text-slate-400">
        {['done', 'late', 'partial', 'missed', 'pending'].map((s) => (
          <span key={s} className="inline-flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${STATE[s].dot}`} />{STATE[s].label}</span>
        ))}
      </p>

      <AnimatePresence>
        {creating && <CreateLessonPanel centerId={centerId} onClose={() => setCreating(false)} />}
      </AnimatePresence>
    </div>
  )
}
