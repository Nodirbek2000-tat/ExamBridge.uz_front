import { useOutletContext, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, GraduationCap, FolderOpen, ClipboardList,
  CheckCircle2, Crown, Clock, AlertTriangle, Target,
  TrendingUp, ChevronRight,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.06 } }),
}

function StatCard({ icon: Icon, label, value, color, bg, index }) {
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={color} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
      </div>
    </motion.div>
  )
}

/* ── Teacher-specific dashboard ─────────────────────────────── */
function TeacherDashboard({ center, stats, teacherGroups = [], recentSubs = [] }) {
  const navigate = useNavigate()
  const centerId = center?.id

  const TASK_COLORS = {
    sat_mock: 'text-sky-600 bg-sky-50', sat_english: 'text-sky-600 bg-sky-50', sat_math: 'text-sky-600 bg-sky-50',
    ielts_reading: 'text-purple-600 bg-purple-50', ielts_listening: 'text-purple-600 bg-purple-50',
    cefr_test: 'text-indigo-600 bg-indigo-50', cefr_reading: 'text-indigo-600 bg-indigo-50',
  }

  return (
    <div>
      {/* Welcome banner */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
        <div className="flex items-center gap-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
          {center?.logo
            ? <img src={center.logo} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 flex-shrink-0" />
            : <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {center?.name?.[0] || 'C'}
              </div>
          }
          <div className="flex-1">
            <p className="text-sm font-medium text-white/70 mb-0.5">Welcome,</p>
            <h1 className="text-xl font-bold">{center?.name}</h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
              Teacher Panel
            </span>
          </div>
        </div>
      </motion.div>

      {/* My stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: FolderOpen,   label: 'My Groups',    value: stats?.groups,      color: 'text-sky-500',    bg: 'bg-sky-50' },
          { icon: Users,        label: 'My Students',  value: stats?.students,    color: 'text-green-500',  bg: 'bg-green-50' },
          { icon: ClipboardList,label: 'Tasks Given',  value: stats?.assignments, color: 'text-purple-500', bg: 'bg-purple-50' },
          { icon: CheckCircle2, label: 'Completed',    value: stats?.completed,   color: 'text-emerald-500',bg: 'bg-emerald-50' },
        ].map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
      </div>

      {/* Groups with progress */}
      {teacherGroups.length > 0 && (
        <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible" className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">My Groups</h2>
            <button onClick={() => navigate(`/center/${centerId}/groups`)}
              className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1">
              View all <ChevronRight size={13} />
            </button>
          </div>
          <div className="grid gap-3">
            {teacherGroups.map((g, i) => {
              const total = g.completed + g.pending + g.overdue
              const pct = total ? Math.round(g.completed / total * 100) : 0
              return (
                <motion.div key={g.id} custom={5 + i} variants={fadeUp} initial="hidden" animate="visible"
                  onClick={() => navigate(`/center/${centerId}/groups/${g.id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:border-sky-200 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                      <FolderOpen size={18} className="text-sky-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{g.name}</p>
                      <p className="text-xs text-gray-400">{g.student_count} students · {g.tasks} tasks</p>
                    </div>
                    <span className="text-sm font-bold text-sky-600">{pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-green-600">
                      <CheckCircle2 size={11} /> {g.completed} done
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-500">
                      <Clock size={11} /> {g.pending} pending
                    </span>
                    {g.overdue > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-red-500">
                        <AlertTriangle size={11} /> {g.overdue} overdue
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Recent completed submissions */}
      {recentSubs.length > 0 && (
        <motion.div variants={fadeUp} custom={8} initial="hidden" animate="visible">
          <h2 className="font-bold text-gray-900 mb-3">Recent Completions</h2>
          <div className="space-y-2">
            {recentSubs.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {s.student?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.student}</p>
                  <p className="text-xs text-gray-400 truncate">{s.task_title}</p>
                </div>
                <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
                {s.score != null && (
                  <span className="text-sm font-bold text-sky-600 flex-shrink-0">{s.score}</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state if no groups */}
      {teacherGroups.length === 0 && (
        <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible"
          className="text-center py-16 text-gray-400">
          <FolderOpen size={44} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-lg">No groups assigned yet</p>
          <p className="text-sm mt-1">Ask your director to assign groups to you</p>
        </motion.div>
      )}
    </div>
  )
}

/* ── Director / Admin dashboard ─────────────────────────────── */
function ManagerDashboard({ center, myRole, stats }) {
  const statItems = [
    { icon: Users,        label: 'Students',  value: stats?.students,    color: 'text-sky-500',    bg: 'bg-sky-50' },
    { icon: GraduationCap,label: 'Teachers',  value: stats?.teachers,    color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Crown,        label: 'Admins',    value: stats?.admins,      color: 'text-amber-500',  bg: 'bg-amber-50' },
    { icon: FolderOpen,   label: 'Groups',    value: stats?.groups,      color: 'text-emerald-500',bg: 'bg-emerald-50' },
    { icon: ClipboardList,label: 'Tasks',     value: stats?.assignments,  color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { icon: CheckCircle2, label: 'Completed', value: stats?.completed,   color: 'text-green-500',  bg: 'bg-green-50' },
  ]

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-6">
        <div className="flex items-center gap-4 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-2xl p-6 text-white shadow-lg">
          {center?.logo
            ? <img src={center.logo} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30" />
            : <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                {center?.name?.[0] || 'C'}
              </div>
          }
          <div>
            <p className="text-sm font-medium text-white/70 mb-0.5">Welcome back,</p>
            <h1 className="text-xl font-bold">{center?.name}</h1>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-semibold capitalize">
              {myRole} Panel
            </span>
          </div>
        </div>
      </motion.div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statItems.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────── */
export default function CenterDashboard() {
  const { center, myRole, stats, dashData } = useOutletContext()

  if (myRole === 'teacher') {
    return (
      <TeacherDashboard
        center={center}
        stats={stats}
        teacherGroups={dashData?.teacher_groups || []}
        recentSubs={dashData?.recent_submissions || []}
      />
    )
  }

  return <ManagerDashboard center={center} myRole={myRole} stats={stats} />
}
