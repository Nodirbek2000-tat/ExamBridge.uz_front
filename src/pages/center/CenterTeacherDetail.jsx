/**
 * CenterTeacherDetail — analytics page for a single teacher.
 * Director / admin only.
 */
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, Users, FolderOpen, ClipboardList,
  CheckCircle2, Clock, AlertTriangle, Target, GraduationCap,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.05 } }),
}

const TASK_COLORS = {
  sat_mock: 'text-sky-600 bg-sky-50', sat_english: 'text-sky-600 bg-sky-50', sat_math: 'text-sky-600 bg-sky-50',
  ielts_reading: 'text-purple-600 bg-purple-50', ielts_listening: 'text-purple-600 bg-purple-50',
  ielts_writing: 'text-purple-600 bg-purple-50', ielts_speaking: 'text-purple-600 bg-purple-50',
  cefr_test: 'text-indigo-600 bg-indigo-50', cefr_reading: 'text-indigo-600 bg-indigo-50',
  cefr_listening: 'text-indigo-600 bg-indigo-50',
}

function StatCard({ icon: Icon, label, value, color, i }) {
  return (
    <motion.div custom={i} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
    </motion.div>
  )
}

export default function CenterTeacherDetail() {
  const { centerId, teacherId } = useParams()
  const navigate = useNavigate()
  const { myRole } = useOutletContext()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['teacher-detail', centerId, teacherId],
    queryFn: () => api.get(`/centers/${centerId}/teachers/${teacherId}/`).then(r => r.data),
  })

  if (myRole && !['director', 'admin'].includes(myRole)) {
    return <div className="text-center py-20 text-gray-400">Only directors and admins can view this page.</div>
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-sky-400" size={28} /></div>
  }
  if (isError || !data) {
    return <div className="text-center py-20 text-gray-400">Teacher not found.</div>
  }

  const { teacher, stats, groups, recent_assignments } = data

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate(`/center/${centerId}/teachers`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-sky-600 mb-5 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Teachers
      </button>

      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
          {teacher.full_name?.[0]?.toUpperCase() || 'T'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{teacher.full_name}</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">
              <GraduationCap size={11} /> Teacher
            </span>
          </div>
          <p className="text-sm text-gray-400">{teacher.email}</p>
          {teacher.phone && <p className="text-xs text-gray-400 mt-0.5">{teacher.phone}</p>}
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard i={0} icon={FolderOpen} label="Groups" value={stats.groups} color="text-sky-500 bg-sky-50" />
        <StatCard i={1} icon={Users} label="Total Students" value={stats.students} color="text-green-500 bg-green-50" />
        <StatCard i={2} icon={ClipboardList} label="Assignments" value={stats.assignments} color="text-purple-500 bg-purple-50" />
        <StatCard i={3} icon={Target} label="Completion" value={`${stats.completion_rate}%`} color="text-amber-500 bg-amber-50" />
      </div>

      {/* Completion breakdown */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Task Completion</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { icon: CheckCircle2, label: 'Completed', value: stats.completed, color: 'text-green-600 bg-green-50' },
            { icon: Clock, label: 'Pending', value: stats.pending, color: 'text-amber-600 bg-amber-50' },
            { icon: AlertTriangle, label: 'Overdue', value: stats.overdue, color: 'text-red-600 bg-red-50' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}><Icon size={15} /></div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stats.completion_rate}%` }} />
        </div>
        {stats.avg_score != null && (
          <p className="text-xs text-gray-400 mt-2">Average score: <span className="font-semibold text-gray-700">{stats.avg_score}</span></p>
        )}
      </motion.div>

      {/* Groups */}
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 text-sm mb-3">Groups ({groups.length})</h3>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">This teacher has no groups yet.</p>
        ) : (
          <div className="grid gap-2">
            {groups.map((g, i) => (
              <motion.button key={g.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                onClick={() => navigate(`/center/${centerId}/groups/${g.id}`)}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-sky-200 transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                  <FolderOpen size={18} className="text-sky-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-sm">{g.name}</p>
                  <p className="text-xs text-gray-400">{g.student_count} students</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Recent assignments */}
      <div>
        <h3 className="font-bold text-gray-900 text-sm mb-3">Recent Assignments</h3>
        {recent_assignments.length === 0 ? (
          <p className="text-sm text-gray-400">No assignments created yet.</p>
        ) : (
          <div className="space-y-2">
            {recent_assignments.map((a, i) => (
              <motion.div key={a.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex-shrink-0 ${TASK_COLORS[a.task_type] || 'text-gray-600 bg-gray-50'}`}>
                  {a.task_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{a.task_title}</p>
                  <p className="text-xs text-gray-400">→ {a.target}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{a.completed}/{a.total}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
