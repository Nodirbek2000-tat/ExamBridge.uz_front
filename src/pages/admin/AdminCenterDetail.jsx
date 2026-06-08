/**
 * AdminCenterDetail — full-page detail for a single learning center.
 * Route: /admin-panel/centers/:centerId
 *
 * Shows: stats, students table (active/inactive, tests done), staff list.
 */
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Users, GraduationCap, Crown, ShieldCheck,
  Phone, MapPin, Activity, BookOpen, ClipboardList,
  CheckCircle2, Loader2, ToggleLeft, ToggleRight, Trash2,
  Eye, EyeOff, Copy, Check, CalendarDays, Wifi, WifiOff,
  Building2,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.25, delay: i * 0.04 } }),
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
}

function StatCard({ icon: Icon, label, value, color, sub, index }) {
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-gray-300 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

function PasswordChip({ value }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)
  if (!value) return <span className="text-[10px] text-gray-300 italic">—</span>
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <code className="text-[11px] font-mono bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
        {show ? value : '•'.repeat(Math.min(value.length, 10))}
      </code>
      <button onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-sky-500">
        {show ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button onClick={() => { navigator.clipboard?.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="text-gray-400 hover:text-sky-500">
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </button>
    </div>
  )
}

/* ── Student Row ─────────────────────────────────────────────── */
function StudentRow({ m, index }) {
  const isActive = m.is_active_user
  return (
    <motion.tr custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
          }`}>
            {m.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate max-w-[140px]">{m.full_name}</p>
            <p className="text-xs text-gray-400 truncate max-w-[140px]">{m.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        {m.phone ? (
          <span className="text-xs text-gray-600">{m.phone}</span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="py-3 px-3">
        <PasswordChip value={m.password} />
      </td>
      <td className="py-3 px-3">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
          isActive
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-50 text-gray-400 border border-gray-200'
        }`}>
          {isActive ? <Wifi size={10} /> : <WifiOff size={10} />}
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-3 px-3">
        <span className="text-xs text-gray-500">{timeAgo(m.last_login)}</span>
      </td>
      <td className="py-3 px-4 text-right">
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl ${
          m.tests_count > 0 ? 'bg-sky-50 text-sky-700' : 'bg-gray-50 text-gray-400'
        }`}>
          <BookOpen size={11} /> {m.tests_count}
        </span>
      </td>
    </motion.tr>
  )
}

/* ── Staff Member Row ────────────────────────────────────────── */
const ROLE_CFG = {
  director: { color: 'bg-amber-100 text-amber-700',  border: 'border-amber-200', label: 'Director' },
  admin:    { color: 'bg-purple-100 text-purple-700', border: 'border-purple-200', label: 'Admin' },
  teacher:  { color: 'bg-sky-100 text-sky-700',       border: 'border-sky-200',   label: 'Teacher' },
}

function StaffRow({ m }) {
  const cfg = ROLE_CFG[m.role] || { color: 'bg-gray-100 text-gray-700', border: 'border-gray-200', label: m.role }
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center text-sm font-bold flex-shrink-0`}>
        {m.full_name?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{m.full_name}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
        </div>
        <p className="text-xs text-gray-400 truncate">{m.email}</p>
        {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
        <PasswordChip value={m.password} />
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs text-gray-400">{timeAgo(m.last_login)}</p>
        <p className="text-[10px] text-gray-300 mt-0.5">last seen</p>
        {m.tests_count > 0 && (
          <p className="text-[10px] text-sky-500 font-bold mt-1">{m.tests_count} tests</p>
        )}
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function AdminCenterDetail() {
  const { centerId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('students')
  const [studentFilter, setStudentFilter] = useState('all') // all | active | inactive

  const { data, isLoading } = useQuery({
    queryKey: ['admin-center-detail', centerId],
    queryFn: () => api.get(`/centers/admin/${centerId}/`).then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: () => api.patch(`/centers/admin/${centerId}/`, { is_active: !data?.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-center-detail', centerId] }),
  })

  const deleteCenter = useMutation({
    mutationFn: () => api.delete(`/centers/admin/${centerId}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-centers'] })
      navigate('/admin-panel/centers')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={28} className="animate-spin text-sky-400" />
    </div>
  )

  const members = data?.members || []
  const stats   = data?.stats || {}
  const groups  = data?.groups || []

  const students = members.filter(m => m.role === 'student')
  const staff    = members.filter(m => m.role !== 'student')

  const filteredStudents = studentFilter === 'active'
    ? students.filter(s => s.is_active_user)
    : studentFilter === 'inactive'
      ? students.filter(s => !s.is_active_user)
      : students

  const TABS = [
    { key: 'students', label: 'Students', count: students.length },
    { key: 'staff',    label: 'Staff',    count: staff.length },
    { key: 'groups',   label: 'Groups',   count: groups.length },
  ]

  return (
    <div>
      {/* Breadcrumb */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 mb-5">
        <button onClick={() => navigate('/admin-panel/centers')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-sky-600 transition-colors">
          <ArrowLeft size={15} /> Learning Centers
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-700">{data?.name || '...'}</span>
      </motion.div>

      {/* Center header */}
      <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 flex items-start gap-4">
        {data?.logo
          ? <img src={data.logo} alt="" className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
          : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xl">{data?.name?.[0] || 'C'}</span>
            </div>
          )
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-black text-gray-900">{data?.name}</h1>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
              data?.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {data?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {data?.phone && <p className="text-sm text-gray-400 flex items-center gap-1.5"><Phone size={12} />{data.phone}</p>}
          {data?.address && <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5"><MapPin size={12} />{data.address}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            title={data?.is_active ? 'Deactivate' : 'Activate'}
          >
            {data?.is_active ? <ToggleRight size={16} className="text-green-500" /> : <ToggleLeft size={16} />}
            {data?.is_active ? 'Active' : 'Inactive'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${data?.name}"? This will remove all memberships.`)) deleteCenter.mutate()
            }}
            disabled={deleteCenter.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            {deleteCenter.isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { icon: Users,         label: 'Students',     value: stats.total_students   ?? 0, color: 'bg-sky-100 text-sky-600',    sub: 'total enrolled' },
          { icon: Activity,      label: 'Active',        value: stats.active_students  ?? 0, color: 'bg-green-100 text-green-600',sub: 'last 30 days' },
          { icon: WifiOff,       label: 'Inactive',      value: stats.inactive_students ?? 0, color: 'bg-gray-100 text-gray-500',  sub: 'not seen 30d' },
          { icon: BookOpen,      label: 'Tests Done',    value: stats.total_tests      ?? 0, color: 'bg-purple-100 text-purple-600', sub: 'by students' },
          { icon: ClipboardList, label: 'Assignments',   value: stats.total_assignments ?? 0, color: 'bg-amber-100 text-amber-600', sub: 'total given' },
          { icon: CheckCircle2,  label: 'Completed',     value: stats.completed_subs   ?? 0, color: 'bg-teal-100 text-teal-600',   sub: 'submissions done' },
        ].map((s, i) => <StatCard key={s.label} {...s} index={i} />)}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              activeTab === t.key ? 'bg-sky-100 text-sky-600' : 'bg-gray-200 text-gray-400'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Students tab ─────────────────────────────────────── */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Filter bar */}
          <div className="flex items-center gap-2 p-3 border-b border-gray-50">
            {['all', 'active', 'inactive'].map(f => (
              <button key={f} onClick={() => setStudentFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  studentFilter === f ? 'bg-sky-500 text-white' : 'text-gray-400 hover:bg-gray-100'
                }`}>
                {f === 'all' ? `All (${students.length})` : f === 'active' ? `Active (${stats.active_students ?? 0})` : `Inactive (${stats.inactive_students ?? 0})`}
              </button>
            ))}
          </div>
          {filteredStudents.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No students</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                    <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Password</th>
                    <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Seen</th>
                    <th className="text-right py-3 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Tests</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((m, i) => <StudentRow key={m.id} m={m} index={i} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Staff tab ────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-3">
          {staff.length === 0 ? (
            <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              <ShieldCheck size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No staff members</p>
            </div>
          ) : (
            // Group by role
            ['director', 'admin', 'teacher'].map(role => {
              const roleStaff = staff.filter(m => m.role === role)
              if (!roleStaff.length) return null
              const cfg = ROLE_CFG[role] || { label: role }
              return (
                <div key={role}>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{cfg.label}s</p>
                  <div className="space-y-2">
                    {roleStaff.map(m => <StaffRow key={m.id} m={m} />)}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Groups tab ───────────────────────────────────────── */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {groups.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Users size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium">No groups yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {groups.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                    <Users size={15} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.student_count} students</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
