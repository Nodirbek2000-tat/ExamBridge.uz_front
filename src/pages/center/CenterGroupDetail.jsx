/**
 * CenterGroupDetail — reworked group analytics page.
 *
 * Features:
 *  • Mini calendar — assignment deadlines shown as dots; click a date → tasks for that day
 *  • Assignment cards — progress bar, time-remaining badge, per-submission detail
 *  • Student cards — click → side panel with their full submission history
 *  • Today's focus — auto-highlights today's deadline tasks
 */
import { useState, useMemo } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Loader2, Users, ClipboardList, CheckCircle2, Clock,
  AlertTriangle, Target, GraduationCap, FolderOpen, Plus,
  ChevronLeft, ChevronRight, X, BookOpen, CheckCheck,
  Calendar, Flame,
} from 'lucide-react'
import api from '../../api/client'
import { CreateAssignmentPanel, taskColor, taskLabel } from './CenterAssignments'

const fadeUp = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.25, delay: i * 0.04 } }),
}

/* ─── helpers ──────────────────────────────────────────────── */
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAY_H  = ['Mo','Tu','We','Th','Fr','Sa','Su']
const pad2   = n => String(n).padStart(2,'0')

function deadlineText(iso) {
  if (!iso) return null
  const diff = (new Date(iso) - Date.now()) / 1000
  if (diff < 0) return { txt: 'Overdue', cls: 'text-red-500', icon: <AlertTriangle size={11} /> }
  if (diff < 3600)  return { txt: `${Math.ceil(diff/60)}m left`,     cls: 'text-red-400',   icon: <Flame size={11} /> }
  if (diff < 86400) return { txt: `${Math.floor(diff/3600)}h left`,  cls: 'text-amber-500', icon: <Clock size={11} /> }
  const days = Math.ceil(diff/86400)
  return { txt: `${days}d left`, cls: days <= 3 ? 'text-amber-500' : 'text-gray-400', icon: <Clock size={11} /> }
}

function timeAgo(iso) {
  if (!iso) return '—'
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return new Date(iso).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})
}

const STATUS_CHIP = {
  completed: 'bg-green-50 text-green-700 border-green-200',
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  overdue:   'bg-red-50  text-red-700   border-red-200',
}

/* ─── Mini Calendar ────────────────────────────────────────── */
function MiniCalendar({ deadlineDates, selectedDate, onSelect }) {
  const today = new Date()
  const [vy, setVy] = useState(today.getFullYear())
  const [vm, setVm] = useState(today.getMonth())

  const prev = () => vm === 0 ? (setVy(y=>y-1), setVm(11)) : setVm(m=>m-1)
  const next = () => vm === 11 ? (setVy(y=>y+1), setVm(0))  : setVm(m=>m+1)

  const daysInMonth  = new Date(vy, vm+1, 0).getDate()
  const startOffset  = (() => { const d = new Date(vy,vm,1).getDay(); return d===0?6:d-1 })()

  // Map YYYY-MM-DD → count
  const dotMap = useMemo(() => {
    const m = {}
    deadlineDates.forEach(iso => {
      const d = new Date(iso)
      const k = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`
      m[k] = (m[k]||0)+1
    })
    return m
  }, [deadlineDates])

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="w-7 h-7 rounded-lg hover:bg-sky-50 flex items-center justify-center text-gray-400 hover:text-sky-600">
          <ChevronLeft size={14}/>
        </button>
        <span className="text-sm font-bold text-gray-800">{MONTHS[vm]} {vy}</span>
        <button onClick={next} className="w-7 h-7 rounded-lg hover:bg-sky-50 flex items-center justify-center text-gray-400 hover:text-sky-600">
          <ChevronRight size={14}/>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_H.map(d => (
          <div key={d} className="h-5 flex items-center justify-center text-[9px] font-black text-sky-400 uppercase">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({length: startOffset}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length: daysInMonth},(_,i)=>i+1).map(day => {
          const isToday = day===today.getDate() && vm===today.getMonth() && vy===today.getFullYear()
          const key = `${vy}-${pad2(vm+1)}-${pad2(day)}`
          const dotCount = dotMap[key] || 0
          const isSel = selectedDate === key
          return (
            <button key={day} onClick={() => onSelect(isSel ? null : key)}
              className={`relative h-8 rounded-lg text-xs font-medium transition-all flex flex-col items-center justify-center ${
                isSel      ? 'bg-sky-500 text-white shadow-sm shadow-sky-200' :
                isToday    ? 'border-2 border-sky-300 text-sky-600 font-bold' :
                dotCount>0 ? 'hover:bg-sky-50 text-gray-700 font-semibold' :
                             'hover:bg-gray-50 text-gray-500'
              }`}
            >
              <span className="leading-none">{day}</span>
              {dotCount > 0 && !isSel && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-sky-400' : 'bg-rose-400'}`}/>
              )}
              {dotCount > 1 && !isSel && (
                <span className="absolute top-0.5 right-0.5 text-[8px] font-black text-rose-400 leading-none">{dotCount}</span>
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <button onClick={()=>onSelect(null)}
          className="mt-3 w-full text-[10px] text-gray-400 hover:text-red-400 transition-colors flex items-center justify-center gap-1">
          <X size={10}/> Clear filter
        </button>
      )}
    </div>
  )
}

/* ─── Assignment Card ──────────────────────────────────────── */
function AssignmentCard({ a, index }) {
  const [expanded, setExpanded] = useState(false)
  const dl = deadlineText(a.deadline)
  const pct = a.total ? Math.round(a.completed / a.total * 100) : 0

  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
        a.is_overdue && a.completed < a.total ? 'border-red-200' : 'border-gray-100'
      }`}>
      <div className="p-4 cursor-pointer" onClick={()=>setExpanded(e=>!e)}>
        <div className="flex items-start gap-3">
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 mt-0.5 ${taskColor(a.task_type)}`}>
            {taskLabel(a.task_type)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{a.task_title}</p>
            {a.description && <p className="text-xs text-gray-400 truncate mt-0.5">{a.description}</p>}
            {dl && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold mt-1 ${dl.cls}`}>
                {dl.icon} {dl.txt}
                {a.deadline && <span className="text-gray-300 ml-1">· {new Date(a.deadline).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>}
              </span>
            )}
          </div>
          {/* Completion count */}
          <div className="flex-shrink-0 text-right">
            <p className={`text-sm font-black ${pct===100?'text-green-600':a.is_overdue&&pct<100?'text-red-500':'text-gray-800'}`}>
              {a.completed}/{a.total}
            </p>
            <p className="text-[9px] text-gray-400">done</p>
          </div>
        </div>

        {/* Progress bar */}
        {a.total > 0 && (
          <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${
              pct===100 ? 'bg-green-400' : a.is_overdue&&pct<100 ? 'bg-red-400' : 'bg-sky-400'
            }`} style={{width:`${pct}%`}}/>
          </div>
        )}
      </div>

      {/* Expanded: per-student submission detail */}
      <AnimatePresence>
        {expanded && a.submissions.length > 0 && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}}
            exit={{height:0,opacity:0}} transition={{duration:0.2}}
            className="overflow-hidden border-t border-gray-50">
            <div className="p-3 space-y-1.5">
              {a.submissions.map(s => (
                <div key={s.student_id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    s.status==='completed'?'bg-green-100 text-green-700':
                    s.status==='overdue'  ?'bg-red-100 text-red-500':
                                           'bg-amber-50 text-amber-600'
                  }`}>{s.student_name[0]?.toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{s.student_name}</p>
                    {s.submitted_at && <p className="text-[10px] text-gray-400">{timeAgo(s.submitted_at)}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.score_detail && <span className="text-[10px] font-bold text-sky-600">{s.score_detail}</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${STATUS_CHIP[s.status]||STATUS_CHIP.pending}`}>
                      {s.status==='completed'?'✓':s.status==='overdue'?'✗':'…'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ─── Student Detail Panel ─────────────────────────────────── */
function StudentPanel({ student, onClose }) {
  const completedSubs = student.submissions.filter(s=>s.status==='completed')
  const pendingSubs   = student.submissions.filter(s=>s.status==='pending')
  const overdueSubs   = student.submissions.filter(s=>s.status==='overdue')
  const pct = student.submissions.length
    ? Math.round(completedSubs.length / student.submissions.length * 100) : 0

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose}/>
      <motion.div
        initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}}
        transition={{type:'spring',damping:26,stiffness:260}}
        className="fixed right-0 top-0 h-full w-[400px] max-w-[100vw] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-sky-50 to-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {student.full_name?.[0]?.toUpperCase()||'?'}
            </div>
            <div>
              <p className="font-bold text-gray-900">{student.full_name}</p>
              <p className="text-xs text-gray-400">{student.email}</p>
            </div>
          </div>

          {/* Summary chips */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {[
              {label:`${completedSubs.length} done`,  cls:'bg-green-50 text-green-700 border-green-200'},
              {label:`${pendingSubs.length} pending`,  cls:'bg-amber-50 text-amber-700 border-amber-200'},
              {label:`${overdueSubs.length} overdue`,  cls:'bg-red-50 text-red-600 border-red-200'},
              {label:`${pct}% done`,                   cls:'bg-sky-50 text-sky-700 border-sky-200'},
            ].map(c=>(
              <span key={c.label} className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${c.cls}`}>{c.label}</span>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct===100?'bg-green-400':'bg-sky-400'}`} style={{width:`${pct}%`}}/>
          </div>
        </div>

        {/* Submission list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {student.submissions.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <ClipboardList size={28} className="mx-auto mb-2 text-gray-200"/>
              <p className="text-sm">No tasks assigned</p>
            </div>
          ) : (
            student.submissions.map((sub, i) => {
              const dl = deadlineText(sub.deadline)
              return (
                <motion.div key={sub.assignment_id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                  className={`rounded-2xl border p-3.5 ${
                    sub.status==='completed' ? 'border-green-100 bg-green-50/30' :
                    sub.status==='overdue'   ? 'border-red-100   bg-red-50/30'   :
                                               'border-gray-100  bg-white'
                  }`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 mt-0.5 ${taskColor(sub.task_type)}`}>
                      {taskLabel(sub.task_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{sub.task_title}</p>
                      {dl && (
                        <span className={`text-[10px] font-medium inline-flex items-center gap-1 mt-0.5 ${dl.cls}`}>
                          {dl.icon} {dl.txt}
                          {sub.deadline && <span className="text-gray-300">· {new Date(sub.deadline).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</span>}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-xl border capitalize flex-shrink-0 ${STATUS_CHIP[sub.status]||STATUS_CHIP.pending}`}>
                      {sub.status==='completed'?<span className="flex items-center gap-1"><CheckCircle2 size={10}/>Done</span>:
                       sub.status==='overdue'  ?<span className="flex items-center gap-1"><AlertTriangle size={10}/>Late</span>:
                                                <span className="flex items-center gap-1"><Clock size={10}/>Wait</span>}
                    </span>
                  </div>
                  {sub.submitted_at && (
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span>Submitted: <span className="font-semibold text-gray-700">{timeAgo(sub.submitted_at)}</span></span>
                      {sub.score_detail && <span className="font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-lg">{sub.score_detail}</span>}
                    </div>
                  )}
                </motion.div>
              )
            })
          )}
        </div>
      </motion.div>
    </>
  )
}

/* ─── Main Page ────────────────────────────────────────────── */
export default function CenterGroupDetail() {
  const { centerId, groupId } = useParams()
  const navigate = useNavigate()
  const { myRole } = useOutletContext()
  const qc = useQueryClient()

  const [showAssign, setShowAssign]     = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)   // 'YYYY-MM-DD' | null
  const [activeTab, setActiveTab]       = useState('tasks') // 'tasks' | 'students'
  const [openStudent, setOpenStudent]   = useState(null)    // student object | null

  const { data, isLoading, isError } = useQuery({
    queryKey: ['group-detail', centerId, groupId],
    queryFn: () => api.get(`/centers/${centerId}/groups/${groupId}/detail/`).then(r => r.data),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  if (myRole && !['director','admin','teacher'].includes(myRole)) {
    return <div className="text-center py-20 text-gray-400">Access denied.</div>
  }
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-400" size={28}/></div>
  if (isError || !data) return <div className="text-center py-20 text-gray-400">Group not found.</div>

  const { group, stats, students, assignments } = data
  const isTeacher = myRole === 'teacher'

  // Calendar: collect all deadline dates
  const deadlineDates = assignments.filter(a=>a.deadline).map(a=>a.deadline)

  // Filter assignments by selected date
  const filteredAssignments = selectedDate
    ? assignments.filter(a => {
        if (!a.deadline) return false
        const d = new Date(a.deadline)
        return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` === selectedDate
      })
    : assignments

  // Today's deadlines
  const todayKey = (() => { const t=new Date(); return `${t.getFullYear()}-${pad2(t.getMonth()+1)}-${pad2(t.getDate())}` })()
  const todayAssignments = assignments.filter(a => {
    if (!a.deadline) return false
    const d = new Date(a.deadline)
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}` === todayKey
  })

  return (
    <div>
      {/* Breadcrumb */}
      <button onClick={() => navigate(`/center/${centerId}/groups`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-sky-600 mb-5 transition-colors">
        <ArrowLeft size={16}/> Back to Groups
      </button>

      {/* Header card */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white flex-shrink-0">
          <FolderOpen size={24}/>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
          <p className="text-sm text-gray-400">{group.student_count} students</p>
          {group.teacher && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">
              <GraduationCap size={11}/> {group.teacher.full_name}
            </span>
          )}
        </div>
        <button onClick={() => setShowAssign('group')}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors flex-shrink-0">
          <Plus size={15}/> Assign Task
        </button>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {i:0, icon:Users,        label:'Students',   value:stats.students,              color:'text-green-500 bg-green-50'},
          {i:1, icon:ClipboardList,label:'Assignments',value:stats.assignments,           color:'text-purple-500 bg-purple-50'},
          {i:2, icon:CheckCircle2, label:'Completed',  value:stats.completed,             color:'text-sky-500 bg-sky-50'},
          {i:3, icon:Target,       label:'Completion', value:`${stats.completion_rate}%`, color:'text-amber-500 bg-amber-50'},
        ].map(({i,icon:Icon,label,value,color})=>(
          <motion.div key={label} custom={i} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}><Icon size={17}/></div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400 font-medium">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Today's Focus ── */}
      {todayAssignments.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible"
          className="mb-5 p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200">
          <div className="flex items-center gap-2 mb-2">
            <Flame size={15} className="text-rose-500"/>
            <p className="text-sm font-bold text-rose-700">Today's Deadlines ({todayAssignments.length})</p>
          </div>
          <div className="space-y-1.5">
            {todayAssignments.map(a=>(
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${taskColor(a.task_type)}`}>{taskLabel(a.task_type)}</span>
                <span className="font-medium text-gray-800 truncate flex-1">{a.task_title}</span>
                <span className={`text-xs font-bold ${a.completed===a.total&&a.total>0?'text-green-600':a.is_overdue?'text-red-500':'text-amber-600'}`}>
                  {a.completed}/{a.total}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Two-column: Calendar + content ── */}
      <div className="flex gap-5 items-start">

        {/* Left: calendar */}
        <div className="w-52 flex-shrink-0 space-y-3">
          <MiniCalendar
            deadlineDates={deadlineDates}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
          {selectedDate && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-1">
                {new Date(selectedDate).toLocaleDateString('en-GB',{day:'numeric',month:'long'})}
              </p>
              <p className="text-xs text-sky-700">
                {filteredAssignments.length} task{filteredAssignments.length!==1?'s':''} due
              </p>
            </div>
          )}
        </div>

        {/* Right: tabs */}
        <div className="flex-1 min-w-0">
          {/* Tab selector */}
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
            {[
              {key:'tasks',    label:`Tasks (${assignments.length})`},
              {key:'students', label:`Students (${students.length})`},
            ].map(t=>(
              <button key={t.key} onClick={()=>setActiveTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab===t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
                }`}>{t.label}</button>
            ))}
          </div>

          {/* ── Tasks tab ── */}
          {activeTab === 'tasks' && (
            <div className="space-y-2.5">
              {filteredAssignments.length === 0 ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <Calendar size={36} className="mx-auto mb-3 text-gray-200"/>
                  <p className="font-medium">{selectedDate ? 'No tasks on this date' : 'No assignments yet'}</p>
                  {selectedDate && <button onClick={()=>setSelectedDate(null)} className="text-sm text-sky-500 mt-2 hover:underline">Show all</button>}
                </div>
              ) : (
                filteredAssignments.map((a,i) => <AssignmentCard key={a.id} a={a} index={i}/>)
              )}
            </div>
          )}

          {/* ── Students tab ── */}
          {activeTab === 'students' && (
            <div className="space-y-2">
              {students.length === 0 ? (
                <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
                  <Users size={36} className="mx-auto mb-3 text-gray-200"/>
                  <p className="font-medium">No students yet</p>
                </div>
              ) : (
                students.map((s,i) => {
                  const pct = s.submissions?.length
                    ? Math.round((s.submissions.filter(x=>x.status==='completed').length / s.submissions.length)*100) : 0
                  return (
                    <motion.div key={s.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all group"
                      onClick={() => setOpenStudent(s)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-indigo-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {s.full_name?.[0]?.toUpperCase()||'?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{s.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">{s.email}</p>
                        {/* Mini progress bar */}
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden w-32">
                          <div className={`h-full rounded-full ${pct===100?'bg-green-400':'bg-sky-400'}`} style={{width:`${pct}%`}}/>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-center"><p className="text-sm font-bold text-green-600">{s.completed}</p><p className="text-[9px] text-gray-400">done</p></div>
                        <div className="text-center"><p className="text-sm font-bold text-amber-500">{s.pending}</p><p className="text-[9px] text-gray-400">pending</p></div>
                        <div className="text-center"><p className="text-sm font-bold text-red-500">{s.overdue}</p><p className="text-[9px] text-gray-400">overdue</p></div>
                        {s.avg_score != null && (
                          <div className="text-center min-w-[36px]"><p className="text-sm font-bold text-sky-600">{s.avg_score}</p><p className="text-[9px] text-gray-400">avg</p></div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setShowAssign({studentId:String(s.id),studentName:s.full_name}) }}
                          className="p-2 rounded-xl bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors"
                          title="Assign task"
                        ><ClipboardList size={14}/></button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Student detail side panel */}
      <AnimatePresence>
        {openStudent && <StudentPanel student={openStudent} onClose={() => setOpenStudent(null)}/>}
      </AnimatePresence>

      {/* Assign task panel */}
      <AnimatePresence>
        {showAssign && (
          <CreateAssignmentPanel
            centerId={centerId}
            myRole={myRole}
            preGroupId={showAssign === 'group' ? groupId : undefined}
            preStudentId={showAssign?.studentId}
            onClose={() => setShowAssign(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
