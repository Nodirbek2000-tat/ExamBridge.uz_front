/**
 * CreateLessonPanel — a teacher gives one lesson: a topic, a day, and any
 * number of tests picked from anywhere (IELTS, CEFR, SAT; reading, writing,
 * speaking…). The chosen tests sit in a "basket" until the lesson is sent.
 */
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, Loader2, Plus, Search, Trash2, Users, User, X } from 'lucide-react'
import api from '../../api/client'
import DeadlinePicker from './DeadlinePicker'
import { EXAMS, KIND_LABEL, TASK_TYPES, examTint, taskMeta } from './taskTypes'

const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const LABEL = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2'
const INPUT = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition'

export default function CreateLessonPanel({ centerId, preGroupId, preStudentId, onClose }) {
  const qc = useQueryClient()
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIso())
  const [deadline, setDeadline] = useState('')
  const [target, setTarget] = useState(preStudentId ? 'student' : 'group')
  const [groupId, setGroupId] = useState(preGroupId ? String(preGroupId) : '')
  const [studentId, setStudentId] = useState(preStudentId ? String(preStudentId) : '')
  const [taskType, setTaskType] = useState('ielts_reading')
  const [q, setQ] = useState('')
  const [basket, setBasket] = useState([])
  const [err, setErr] = useState('')
  const [sending, setSending] = useState(false)

  const { data: groups = [] } = useQuery({
    queryKey: ['center-groups', centerId],
    queryFn: () => api.get(`/centers/${centerId}/groups/`).then((r) => r.data),
  })
  const students = useMemo(() => Array.from(
    new Map(groups.flatMap((g) => (g.students || []).map((s) => [s.id, s]))).values(),
  ).sort((a, b) => a.full_name.localeCompare(b.full_name)), [groups])

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['available-tasks', centerId, taskType],
    queryFn: () => api.get(`/centers/${centerId}/available-tasks/?type=${taskType}`).then((r) => r.data),
    staleTime: 60_000,
  })
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? tests.filter((t) => `${t.title} ${t.meta || ''}`.toLowerCase().includes(term)) : tests
  }, [tests, q])

  const exam = taskMeta(taskType).exam
  const tint = examTint(taskType)
  const keyOf = (type, t) => `${type}-${t.kind}-${t.id}`
  const inBasket = new Set(basket.map((b) => b.key))

  const toggle = (t) => {
    const key = keyOf(taskType, t)
    setBasket((b) => b.some((x) => x.key === key) ? b.filter((x) => x.key !== key) : [...b, {
      key, task_type: taskType, task_ref_id: t.id, task_ref_kind: t.kind, task_title: t.title, meta: t.meta,
    }])
  }

  const send = async () => {
    setErr('')
    if (!topic.trim()) return setErr('Write the lesson topic')
    if (target === 'group' && !groupId) return setErr('Choose a group')
    if (target === 'student' && !studentId) return setErr('Choose a student')
    if (!basket.length) return setErr('Add at least one task')
    setSending(true)
    try {
      await api.post(`/centers/${centerId}/lessons/`, {
        topic: topic.trim(), description: description.trim(), date, deadline: deadline || undefined,
        group_id: target === 'group' ? groupId : undefined,
        student_id: target === 'student' ? studentId : undefined,
        tasks: basket.map(({ task_type, task_ref_id, task_ref_kind, task_title }) =>
          ({ task_type, task_ref_id, task_ref_kind, task_title })),
      })
      ;['center-lessons', 'center-monitoring', 'group-journal', 'my-assignments'].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }))
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not send the lesson')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] z-40" onClick={onClose} />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-slate-50 shadow-2xl z-50 flex flex-col"
      >
        <header className="px-6 py-5 bg-white border-b border-slate-200/70 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">New lesson</h2>
            <p className="text-xs text-slate-500 mt-0.5">A topic and the tests that go with it — from any section.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm font-medium text-rose-700">{err}</div>}

          {/* Topic + day */}
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className={LABEL}>Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200}
                placeholder="e.g. Present Perfect · Task 2 opinion essays" className={INPUT} autoFocus />
            </div>
            <div>
              <label className={LABEL}>Day</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${INPUT} w-40`} />
            </div>
          </div>

          {/* Who */}
          <div>
            <label className={LABEL}>For</label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/60 rounded-xl mb-2">
              {[{ k: 'group', icon: Users, label: 'A group' }, { k: 'student', icon: User, label: 'One student' }].map(({ k, icon: Icon, label }) => (
                <button key={k} type="button" onClick={() => setTarget(k)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    target === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Icon size={14} />{label}
                </button>
              ))}
            </div>
            {target === 'group' ? (
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className={INPUT}>
                <option value="">Choose a group…</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name} · {g.student_count} students</option>)}
              </select>
            ) : (
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={INPUT}>
                <option value="">Choose a student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            )}
          </div>

          {/* Picker */}
          <div>
            <label className={LABEL}>Add tests</label>
            <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
              <div className="p-3 space-y-2.5 border-b border-slate-100">
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                  {EXAMS.map((e) => (
                    <button key={e.key} type="button"
                      onClick={() => { setTaskType(TASK_TYPES.find((t) => t.exam === e.key).value); setQ('') }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        exam === e.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {e.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TASK_TYPES.filter((t) => t.exam === exam).map((t) => (
                    <button key={t.value} type="button" onClick={() => { setTaskType(t.value); setQ('') }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        taskType === t.value ? `${tint.solid} text-white border-transparent` : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                      {t.skill}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70">
                  <Search size={14} className="text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
                </label>
              </div>
              <ul className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {isLoading ? (
                  <li className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-300" /></li>
                ) : shown.length === 0 ? (
                  <li className="py-8 text-center text-sm text-slate-400">Nothing here yet</li>
                ) : shown.map((t) => {
                  const added = inBasket.has(keyOf(taskType, t))
                  return (
                    <li key={`${t.kind}-${t.id}`}>
                      <button type="button" onClick={() => toggle(t)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${added ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${tint.dot}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-slate-800 truncate">{t.title}</span>
                          <span className="block text-[11px] text-slate-400">{t.meta || KIND_LABEL[t.kind]}</span>
                        </span>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          added ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-400'}`}>
                          {added ? <Check size={14} /> : <Plus size={14} />}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {/* Basket */}
          <div>
            <label className={LABEL}>In this lesson · {basket.length}</label>
            {basket.length === 0 ? (
              <p className="text-sm text-slate-400 px-1">Pick tests above — you can mix sections and exams.</p>
            ) : (
              <ol className="bg-white rounded-2xl border border-slate-200/70 divide-y divide-slate-100">
                {basket.map((b, i) => (
                  <li key={b.key} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 text-xs font-semibold text-slate-400 tabular-nums">{i + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-800 truncate">{b.task_title}</span>
                      <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-semibold ring-1 ${examTint(b.task_type).chip}`}>
                        {taskMeta(b.task_type).label}
                      </span>
                    </span>
                    <button type="button" onClick={() => setBasket((x) => x.filter((y) => y.key !== b.key))}
                      className="p-1.5 text-slate-300 hover:text-rose-500"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div>
            <label className={LABEL}>Note for students <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What to focus on…" className={`${INPUT} resize-none`} />
          </div>

          <div>
            <label className={LABEL}>Deadline <span className="normal-case font-normal text-slate-400">(optional)</span></label>
            <DeadlinePicker value={deadline} onChange={setDeadline} />
          </div>
        </div>

        <footer className="px-6 py-4 bg-white border-t border-slate-200/70">
          <button onClick={send} disabled={sending}
            className="w-full py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {sending ? 'Sending…' : `Give lesson${basket.length ? ` · ${basket.length} task${basket.length > 1 ? 's' : ''}` : ''}`}
          </button>
        </footer>
      </motion.aside>
    </>
  )
}
