import { useState, useMemo, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardList, Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle,
  Users, User, Calendar, Search, ChevronRight, ChevronLeft, ChevronDown,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.05 } }),
}

export const TASK_TYPES = [
  { value: 'sat_mock',        label: 'SAT Mock',      short: 'SAT',   color: 'bg-sky-500'    },
  { value: 'sat_english',     label: 'SAT English',   short: 'ENG',   color: 'bg-sky-400'    },
  { value: 'sat_math',        label: 'SAT Math',      short: 'MATH',  color: 'bg-sky-400'    },
  { value: 'ielts_reading',   label: 'IELTS Reading', short: 'READ',  color: 'bg-purple-500' },
  { value: 'ielts_listening', label: 'IELTS Listen',  short: 'LIST',  color: 'bg-purple-500' },
  { value: 'ielts_writing',   label: 'IELTS Writing', short: 'WRIT',  color: 'bg-purple-400' },
  { value: 'ielts_speaking',  label: 'IELTS Speak',   short: 'SPEK',  color: 'bg-purple-400' },
  { value: 'cefr_test',       label: 'CEFR Test',     short: 'CEFR',  color: 'bg-indigo-500' },
  { value: 'cefr_reading',    label: 'CEFR Reading',  short: 'CREAD', color: 'bg-indigo-400' },
  { value: 'cefr_listening',  label: 'CEFR Listen',   short: 'CLIST', color: 'bg-indigo-400' },
]

export function taskLabel(type) { return TASK_TYPES.find(t => t.value === type)?.label || type }
export function taskColor(type) {
  const colorMap = {
    sat_mock: 'text-sky-600 bg-sky-50', sat_english: 'text-sky-600 bg-sky-50', sat_math: 'text-sky-600 bg-sky-50',
    ielts_reading: 'text-purple-600 bg-purple-50', ielts_listening: 'text-purple-600 bg-purple-50',
    ielts_writing: 'text-purple-600 bg-purple-50', ielts_speaking: 'text-purple-600 bg-purple-50',
    cefr_test: 'text-indigo-600 bg-indigo-50', cefr_reading: 'text-indigo-600 bg-indigo-50',
    cefr_listening: 'text-indigo-600 bg-indigo-50',
  }
  return colorMap[type] || 'text-gray-600 bg-gray-50'
}

/* ── Custom Deadline Date-Time Picker ───────────────────────── */
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Mo','Tu','We','Th','Fr','Sa','Su']
const pad2 = n => String(n).padStart(2, '0')

function DeadlinePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const hourRef = useRef(null)
  const minRef = useRef(null)
  const secRef = useRef(null)

  const parsed = value ? (() => { const d = new Date(value); return isNaN(d) ? null : d })() : null
  const now = new Date()

  const [viewYear,  setViewYear]  = useState(() => parsed?.getFullYear() ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => parsed?.getMonth()    ?? now.getMonth())
  const [selYear,   setSelYear]   = useState(() => parsed?.getFullYear() ?? null)
  const [selMonth,  setSelMonth]  = useState(() => parsed?.getMonth()    ?? null)
  const [selDay,    setSelDay]    = useState(() => parsed?.getDate()     ?? null)
  const [hour,      setHour]      = useState(() => parsed?.getHours()    ?? 23)
  const [minute,    setMinute]    = useState(() => parsed?.getMinutes()  ?? 59)
  const [second,    setSecond]    = useState(() => parsed?.getSeconds()  ?? 0)

  /* Auto-scroll to selected hour/minute/second when picker opens */
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      hourRef.current?.children[hour]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      minRef.current?.children[minute]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      secRef.current?.children[second]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 180)
    return () => clearTimeout(t)
  }, [open])

  const emit = (d, mo, y, h, m, s) => {
    if (d == null || mo == null || y == null) return
    onChange(`${y}-${pad2(mo + 1)}-${pad2(d)}T${pad2(h)}:${pad2(m)}:${pad2(s)}`)
  }

  const selectDay = (day) => {
    setSelDay(day); setSelYear(viewYear); setSelMonth(viewMonth)
    emit(day, viewMonth, viewYear, hour, minute, second)
  }

  const changeHour   = (h) => { setHour(h);   emit(selDay, selMonth, selYear, h, minute, second) }
  const changeMinute = (m) => { setMinute(m); emit(selDay, selMonth, selYear, hour, m, second)  }
  const changeSecond = (s) => { setSecond(s); emit(selDay, selMonth, selYear, hour, minute, s)  }

  const goToday = () => {
    setViewYear(now.getFullYear()); setViewMonth(now.getMonth())
    setSelYear(now.getFullYear());  setSelMonth(now.getMonth()); setSelDay(now.getDate())
    emit(now.getDate(), now.getMonth(), now.getFullYear(), hour, minute, second)
  }

  const doClear = () => { setSelDay(null); setSelYear(null); setSelMonth(null); onChange('') }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const startOffset = (() => { const d = new Date(viewYear, viewMonth, 1).getDay(); return d === 0 ? 6 : d - 1 })()

  const displayStr = parsed
    ? `${pad2(parsed.getDate())} ${MONTHS_FULL[parsed.getMonth()].slice(0,3)} ${parsed.getFullYear()}  ·  ${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}:${pad2(parsed.getSeconds())}`
    : null

  return (
    <div>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 border rounded-xl text-sm transition-all text-left ${
          value
            ? 'border-sky-300 bg-sky-50 text-sky-700 font-semibold hover:border-sky-400'
            : 'border-gray-200 text-gray-400 hover:border-sky-300 hover:bg-gray-50'
        }`}
      >
        <Calendar size={14} className={value ? 'text-sky-500 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
        <span className="flex-1">{displayStr || 'Set deadline date & time...'}</span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={e => { e.stopPropagation(); doClear() }}
            className="text-sky-400 hover:text-red-400 transition-colors"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={13} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* ── Inline picker ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 border border-sky-100 rounded-2xl bg-white shadow-lg overflow-hidden">
              <div className="flex">

                {/* ── Calendar side ── */}
                <div className="flex-1 p-4">
                  {/* Month navigation */}
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" onClick={prevMonth}
                      className="w-8 h-8 rounded-xl hover:bg-sky-50 flex items-center justify-center text-gray-400 hover:text-sky-600 transition-colors">
                      <ChevronLeft size={15} />
                    </button>
                    <span className="text-sm font-bold text-gray-800">
                      {MONTHS_FULL[viewMonth]} {viewYear}
                    </span>
                    <button type="button" onClick={nextMonth}
                      className="w-8 h-8 rounded-xl hover:bg-sky-50 flex items-center justify-center text-gray-400 hover:text-sky-600 transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_HEADERS.map(d => (
                      <div key={d} className="h-6 flex items-center justify-center text-[10px] font-extrabold text-sky-400 uppercase">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                      const isSel = day === selDay && viewMonth === selMonth && viewYear === selYear
                      const isToday = day === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear()
                      return (
                        <button key={day} type="button" onClick={() => selectDay(day)}
                          className={`h-8 rounded-lg text-xs font-medium transition-all ${
                            isSel
                              ? 'bg-sky-500 text-white font-bold shadow-sm shadow-sky-200'
                              : isToday
                                ? 'border-2 border-sky-300 text-sky-600 font-bold'
                                : 'hover:bg-sky-50 text-gray-700 hover:text-sky-600'
                          }`}>
                          {day}
                        </button>
                      )
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between mt-3 pt-2 border-t border-gray-100">
                    <button type="button" onClick={doClear}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors px-1">
                      Clear
                    </button>
                    <button type="button" onClick={goToday}
                      className="text-xs font-bold text-sky-500 hover:text-sky-700 transition-colors px-1">
                      Today
                    </button>
                  </div>
                </div>

                {/* ── Time picker side ── */}
                <div className="border-l border-gray-100 bg-gradient-to-b from-sky-50/40 to-white px-3 py-4 flex flex-col items-center gap-2" style={{ minWidth: 150 }}>
                  <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Time</p>

                  {/* Large selected time display */}
                  <div className="bg-sky-500 rounded-xl px-3 py-2 text-center mb-1 shadow-sm shadow-sky-200">
                    <span className="text-lg font-black text-white tabular-nums tracking-tight">
                      {pad2(hour)}<span className="opacity-60 animate-pulse">:</span>{pad2(minute)}<span className="opacity-60 animate-pulse">:</span>{pad2(second)}
                    </span>
                  </div>

                  {/* Scroll columns */}
                  <div className="flex gap-1 items-start">
                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1">HH</span>
                      <div
                        ref={hourRef}
                        className="h-36 overflow-y-auto flex flex-col gap-0.5 rounded-xl"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bae6fd transparent' }}
                      >
                        {Array.from({ length: 24 }, (_, i) => (
                          <button key={i} type="button" onClick={() => changeHour(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                              i === hour
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'hover:bg-sky-100 text-gray-600'
                            }`}>
                            {pad2(i)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="text-gray-300 font-bold mt-9 leading-none">:</span>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1">MM</span>
                      <div
                        ref={minRef}
                        className="h-36 overflow-y-auto flex flex-col gap-0.5 rounded-xl"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bae6fd transparent' }}
                      >
                        {Array.from({ length: 60 }, (_, i) => (
                          <button key={i} type="button" onClick={() => changeMinute(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                              i === minute
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'hover:bg-sky-100 text-gray-600'
                            }`}>
                            {pad2(i)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <span className="text-gray-300 font-bold mt-9 leading-none">:</span>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-bold text-gray-400 mb-1">SS</span>
                      <div
                        ref={secRef}
                        className="h-36 overflow-y-auto flex flex-col gap-0.5 rounded-xl"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#bae6fd transparent' }}
                      >
                        {Array.from({ length: 60 }, (_, i) => (
                          <button key={i} type="button" onClick={() => changeSecond(i)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold flex-shrink-0 transition-colors ${
                              i === second
                                ? 'bg-sky-500 text-white shadow-sm'
                                : 'hover:bg-sky-100 text-gray-600'
                            }`}>
                            {pad2(i)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Create Assignment Panel (beautiful redesign) ───────────── */
export function CreateAssignmentPanel({ centerId, myRole, preGroupId, preStudentId, onClose }) {
  const qc = useQueryClient()
  const isTeacher = myRole === 'teacher'

  const [taskType, setTaskType] = useState('ielts_reading')
  const [selectedTest, setSelectedTest] = useState(null)   // {id, title, kind}
  const [freeTitle, setFreeTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [target, setTarget] = useState(preGroupId ? 'group' : preStudentId ? 'student' : 'group')
  const [studentId, setStudentId] = useState(preStudentId || '')
  const [groupId, setGroupId] = useState(preGroupId || '')
  const [searchQ, setSearchQ] = useState('')
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /* groups & students */
  const { data: groups = [] } = useQuery({
    queryKey: ['center-groups', centerId],
    queryFn: () => api.get(`/centers/${centerId}/groups/`).then(r => r.data),
  })
  const { data: allStudents = [] } = useQuery({
    queryKey: ['center-members', centerId, 'student'],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=student`).then(r => r.data),
    enabled: !isTeacher,
  })
  const teacherStudents = isTeacher
    ? Array.from(new Map(groups.flatMap(g => (g.students || []).map(s => [s.id, s]))).values())
    : []
  const students = isTeacher ? teacherStudents : allStudents

  /* available tests */
  const { data: availableTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['available-tasks', centerId, taskType],
    queryFn: () => api.get(`/centers/${centerId}/available-tasks/?type=${taskType}`).then(r => r.data),
    enabled: !!centerId,
    staleTime: 60_000,
  })

  const filteredTasks = useMemo(() =>
    availableTasks.filter(t =>
      !searchQ || t.title.toLowerCase().includes(searchQ.toLowerCase())
    ), [availableTasks, searchQ]
  )

  const changeType = (t) => { setTaskType(t); setSelectedTest(null); setFreeTitle(''); setSearchQ('') }

  /* submit */
  const handleSubmit = async () => {
    setErr('')
    const title = selectedTest?.title || freeTitle.trim()
    if (!title) { setErr('Please select a test or enter a title'); return }
    if (target === 'group' && !groupId) { setErr('Please select a group'); return }
    if (target === 'student' && !studentId) { setErr('Please select a student'); return }

    setSubmitting(true)
    try {
      await api.post(`/centers/${centerId}/assignments/`, {
        task_type: taskType,
        task_title: title,
        task_ref_id: selectedTest?.id || undefined,
        task_ref_kind: selectedTest?.kind || undefined,
        description: description || undefined,
        deadline: deadline || undefined,
        student_id: target === 'student' ? studentId : undefined,
        group_id: target === 'group' ? groupId : undefined,
      })
      qc.invalidateQueries({ queryKey: ['center-assignments', centerId] })
      qc.invalidateQueries({ queryKey: ['group-detail', centerId] })
      qc.invalidateQueries({ queryKey: ['my-assignments'] })   // refresh student's task list instantly
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'Error creating assignment')
    } finally {
      setSubmitting(false)
    }
  }

  const typeCfg = TASK_TYPES.find(t => t.value === taskType)
  const canSubmit = !submitting && (selectedTest || freeTitle.trim())

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-[440px] bg-white shadow-2xl z-50 flex flex-col"
      >
        {/* ── Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Task</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isTeacher ? 'Assign to your students or group' : 'Assign a task to a student or group'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {err && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium">
                {err}
              </div>
            )}

            {/* ── Assign to */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Assign to</p>
              <div className="flex gap-2 mb-3">
                {[
                  { key: 'group', icon: Users, label: 'Whole Group' },
                  { key: 'student', icon: User, label: 'Individual' },
                ].map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => setTarget(key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                      target === key
                        ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {target === 'group' ? (
                <select value={groupId} onChange={e => setGroupId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 bg-white transition">
                  <option value="">— Select group —</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.student_count} students)</option>
                  ))}
                </select>
              ) : (
                <select value={studentId} onChange={e => setStudentId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 bg-white transition">
                  <option value="">— Select student —</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              )}
            </div>

            {/* ── Task Type pills */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Task Type</p>
              <div className="flex flex-wrap gap-1.5">
                {TASK_TYPES.map(t => (
                  <button key={t.value} onClick={() => changeType(t.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      taskType === t.value
                        ? `${t.color} text-white border-transparent shadow-sm`
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Test picker */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Select Test
                {selectedTest && (
                  <span className="ml-2 normal-case text-sky-600 font-semibold">— {selectedTest.title}</span>
                )}
              </p>

              {/* Search */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Search tests..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition"
                />
              </div>

              {/* Test cards list */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-sky-400" />
                  </div>
                ) : filteredTasks.length > 0 ? (
                  filteredTasks.map(t => {
                    const isSelected = selectedTest?.id === t.id && selectedTest?.kind === t.kind
                    return (
                      <button
                        key={`${t.kind || 'x'}-${t.id}`}
                        onClick={() => setSelectedTest(isSelected ? null : t)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isSelected ? 'bg-sky-500 text-white' : 'bg-white hover:bg-sky-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-black ${
                          isSelected ? 'bg-sky-400 text-white' : `${typeCfg?.color || 'bg-gray-400'} text-white`
                        }`}>
                          {typeCfg?.short || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                            {t.title}
                          </p>
                          {t.kind && (
                            <p className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-sky-100' : 'text-gray-400'}`}>
                              {t.kind === 'mock' ? 'Full Mock Test' : t.kind === 'passage' ? 'Practice Passage' : t.kind}
                            </p>
                          )}
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="text-white flex-shrink-0" />}
                      </button>
                    )
                  })
                ) : searchQ ? (
                  <div className="text-center py-6 text-sm text-gray-400">No tests found for "{searchQ}"</div>
                ) : (
                  /* Free-text fallback when no DB tests */
                  <div className="p-3">
                    <input
                      value={freeTitle}
                      onChange={e => setFreeTitle(e.target.value)}
                      placeholder="Enter task title manually..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 bg-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Instructions */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Instructions <span className="normal-case text-gray-400 font-normal">(optional)</span></p>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Write instructions for students..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 resize-none transition"
              />
            </div>

            {/* ── Deadline */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Deadline <span className="normal-case text-gray-400 font-normal">(optional)</span>
              </p>
              <DeadlinePicker value={deadline} onChange={setDeadline} />
            </div>

          </div>
        </div>

        {/* ── Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {selectedTest && (
            <div className="mb-3 p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={15} className="text-sky-500 flex-shrink-0" />
              <p className="text-xs font-semibold text-sky-700 truncate">{selectedTest.title}</p>
              <button onClick={() => setSelectedTest(null)} className="ml-auto text-sky-400 hover:text-sky-600">
                <X size={13} />
              </button>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-200 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {submitting ? 'Assigning...' : 'Assign Task'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

/* ── Assignment Card ─────────────────────────────────────────── */
function AssignmentCard({ a, index }) {
  const [expanded, setExpanded] = useState(false)
  const total = a.total_submissions
  const completed = a.completed_count
  const pct = total ? Math.round((completed / total) * 100) : 0
  const isOverdue = a.is_overdue && completed < total

  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50/60 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${taskColor(a.task_type)}`}>
          {taskLabel(a.task_type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight">{a.task_title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {a.group && (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                <Users size={10} />{a.group.name}
              </span>
            )}
            {a.student && (
              <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                <User size={10} />{a.student.full_name}
              </span>
            )}
            {a.deadline && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                isOverdue ? 'text-red-600 bg-red-50' : 'text-gray-400 bg-gray-50'
              }`}>
                <Calendar size={10} />{new Date(a.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {isOverdue
            ? <AlertTriangle size={15} className="text-red-400" />
            : completed === total && total > 0
              ? <CheckCircle2 size={15} className="text-green-500" />
              : <Clock size={15} className="text-amber-400" />}
          <p className="text-xs text-gray-400 font-medium">{completed}/{total}</p>
        </div>
      </div>

      {total > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                isOverdue ? 'bg-red-400' : pct === 100 ? 'bg-green-500' : 'bg-sky-400'
              }`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 font-medium flex-shrink-0">{pct}%</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {expanded && a.submissions && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100">
            <div className="p-3 space-y-1.5">
              {a.submissions?.map(s => (
                <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                  s.status === 'completed' ? 'bg-green-50' : s.status === 'overdue' ? 'bg-red-50' : 'bg-gray-50'
                }`}>
                  {s.status === 'completed' ? <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
                    : s.status === 'overdue' ? <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                    : <Clock size={13} className="text-amber-400 flex-shrink-0" />}
                  <p className="flex-1 text-xs font-medium text-gray-700 truncate">{s.student?.full_name}</p>
                  {s.score != null && <span className="text-xs font-bold text-sky-600">{s.score}</span>}
                  {s.score_detail && <span className="text-[10px] text-gray-400">{s.score_detail}</span>}
                  <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full flex-shrink-0 ${
                    s.status === 'completed' ? 'bg-green-100 text-green-600'
                    : s.status === 'overdue' ? 'bg-red-100 text-red-500'
                    : 'bg-gray-100 text-gray-500'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ── Main ─────────────────────────────────────────────────────── */
export default function CenterAssignments() {
  const { centerId, myRole } = useOutletContext()
  const [showCreate, setShowCreate] = useState(false)

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['center-assignments', centerId],
    queryFn: () => api.get(`/centers/${centerId}/assignments/`).then(r => r.data),
  })

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tasks</h2>
          <p className="text-sm text-gray-400">{assignments.length} tasks assigned</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm">
          <Plus size={15} /> New Task
        </button>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-400" size={24} /></div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No tasks yet</p>
          <p className="text-sm mt-1">Click "New Task" to assign work to your students</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a, i) => <AssignmentCard key={a.id} a={a} index={i} />)}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateAssignmentPanel centerId={centerId} myRole={myRole} onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
