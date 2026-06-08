import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Plus, Users, GraduationCap, Phone, MapPin,
  Loader2, X, CheckCircle2, ChevronRight, ToggleLeft, ToggleRight,
  Trash2, Eye, EyeOff, UserPlus, Crown, Copy, Check,
} from 'lucide-react'
import api from '../../api/client'

/* ── helpers ─────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.32, delay: i * 0.05 } }),
}

function Initials({ name, size = 'md' }) {
  const letters = name?.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  const dim = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm'
  return (
    <div className={`${dim} rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {letters}
    </div>
  )
}

/* ── Create Center Modal ─────────────────────────────────────── */
function CreateModal({ onClose, onCreated }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', phone: '', address: '',
    director_first_name: '', director_last_name: '',
    director_email: '', director_phone: '', director_password: '',
  })
  const [logo, setLogo] = useState(null)
  const [err, setErr] = useState('')

  const mut = useMutation({
    mutationFn: async () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (logo) fd.append('logo', logo)
      const { data } = await api.post('/centers/admin/create/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-centers'] })
      onCreated(data)
      onClose()
    },
    onError: (e) => setErr(e.response?.data?.error || 'Error'),
  })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }} transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 my-4"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <Building2 size={18} className="text-sky-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">New Learning Center</h2>
                <p className="text-xs text-gray-400">Fill center info & director account</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          {err && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{err}</div>
          )}

          <div className="space-y-4">
            {/* Center info */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Center Info</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Center Name *</label>
                <input
                  value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="ABC Learning Center"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Phone</label>
                <input
                  value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="+998 90 000 00 00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Logo</label>
                <input type="file" accept="image/*" onChange={e => setLogo(e.target.files[0])}
                  className="w-full text-xs text-gray-500 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-sky-50 file:text-sky-600 file:text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Address</label>
                <input
                  value={form.address} onChange={e => set('address', e.target.value)}
                  placeholder="Tashkent, Chilonzor..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* Director info */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">Director Account</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">First Name</label>
                <input
                  value={form.director_first_name} onChange={e => set('director_first_name', e.target.value)}
                  placeholder="Alisher"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Last Name</label>
                <input
                  value={form.director_last_name} onChange={e => set('director_last_name', e.target.value)}
                  placeholder="Karimov"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 mb-1 block">Email *</label>
                <input
                  type="email"
                  value={form.director_email} onChange={e => set('director_email', e.target.value)}
                  placeholder="director@center.uz"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Password *</label>
                <input
                  type="password"
                  value={form.director_password} onChange={e => set('director_password', e.target.value)}
                  placeholder="Strong password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Director Phone</label>
                <input
                  value={form.director_phone} onChange={e => set('director_phone', e.target.value)}
                  placeholder="+998 90 000 00 00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {mut.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Center
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}

/* ── Center Card ─────────────────────────────────────────────── */
function CenterCard({ center, index, onClick }) {
  return (
    <motion.div
      custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {center.logo
            ? <img src={center.logo} alt={center.name} className="w-14 h-14 rounded-2xl object-cover border border-gray-100" />
            : <Initials name={center.name} size="lg" />
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-gray-900 truncate">{center.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                center.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {center.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {center.phone && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Phone size={11} />
                <span>{center.phone}</span>
              </div>
            )}
            {center.address && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                <MapPin size={11} />
                <span className="truncate">{center.address}</span>
              </div>
            )}
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-sky-400 transition-colors mt-1 flex-shrink-0" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { icon: Users, label: 'Students', value: center.student_count, color: 'text-sky-500 bg-sky-50' },
            { icon: GraduationCap, label: 'Teachers', value: center.teacher_count, color: 'text-purple-500 bg-purple-50' },
            { icon: Crown, label: 'Admins', value: center.admin_count, color: 'text-amber-500 bg-amber-50' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="text-center p-2 rounded-xl bg-gray-50">
              <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center mx-auto mb-1`}>
                <Icon size={13} />
              </div>
              <p className="text-sm font-bold text-gray-800">{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Director */}
        {center.director && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
            <Crown size={13} className="text-amber-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-700 truncate">
                {center.director.full_name}
              </p>
              <p className="text-[10px] text-amber-500 truncate">{center.director.email}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Password reveal/copy chip ───────────────────────────────── */
function PasswordChip({ value }) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!value) {
    return <span className="text-[10px] text-gray-300 italic">no password saved</span>
  }

  const copy = () => {
    navigator.clipboard?.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-1.5 mt-1">
      <code className="text-[11px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
        {show ? value : '•'.repeat(Math.min(value.length, 10))}
      </code>
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="text-gray-400 hover:text-sky-500 transition-colors"
        title={show ? 'Hide' : 'Show'}
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button
        type="button"
        onClick={copy}
        className="text-gray-400 hover:text-sky-500 transition-colors"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
    </div>
  )
}

/* ── Center Detail Panel ─────────────────────────────────────── */
function CenterDetailPanel({ center, onClose, onRefresh }) {
  const qc = useQueryClient()
  const [tab, setTab] = useState('members')

  const { data: detail, isLoading } = useQuery({
    queryKey: ['admin-center-detail', center.id],
    queryFn: () => api.get(`/centers/admin/${center.id}/`).then(r => r.data),
  })

  const toggleActive = useMutation({
    mutationFn: () => api.patch(`/centers/admin/${center.id}/`, { is_active: !detail?.is_active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-centers'] })
      qc.invalidateQueries({ queryKey: ['admin-center-detail', center.id] })
    },
  })

  const deleteCenter = useMutation({
    mutationFn: () => api.delete(`/centers/admin/${center.id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-centers'] })
      onClose()
    },
  })

  const TABS = [
    { key: 'members', label: 'Members' },
    { key: 'groups', label: 'Groups' },
  ]

  const byRole = (role) => detail?.members?.filter(m => m.role === role) || []

  return (
    <motion.div
      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-2xl z-40 flex flex-col border-l border-gray-100"
    >
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleActive.mutate()}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-sky-500 transition-colors"
              title="Toggle active"
            >
              {detail?.is_active ? <ToggleRight size={18} className="text-green-500" /> : <ToggleLeft size={18} />}
            </button>
            <button
              onClick={() => { if (confirm('Delete this center?')) deleteCenter.mutate() }}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {center.logo
            ? <img src={center.logo} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            : <Initials name={center.name} size="lg" />
          }
          <div>
            <h2 className="font-bold text-gray-900">{center.name}</h2>
            {center.phone && <p className="text-xs text-gray-400">{center.phone}</p>}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              detail?.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {detail?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 px-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-sky-400" /></div>
        ) : tab === 'members' ? (
          <div className="space-y-4">
            {[
              { role: 'director', label: 'Director', color: 'text-amber-600 bg-amber-50' },
              { role: 'admin', label: 'Admins', color: 'text-purple-600 bg-purple-50' },
              { role: 'teacher', label: 'Teachers', color: 'text-sky-600 bg-sky-50' },
              { role: 'student', label: 'Students', color: 'text-green-600 bg-green-50' },
            ].map(({ role, label, color }) => {
              const members = byRole(role)
              if (!members.length) return null
              return (
                <div key={role}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
                  <div className="space-y-1.5">
                    {members.map(m => (
                      <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                        <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                          {m.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{m.full_name}</p>
                          <p className="text-xs text-gray-400 truncate">{m.email}</p>
                          <PasswordChip value={m.password} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {(detail?.groups || []).map(g => (
              <div key={g.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="font-medium text-gray-800 text-sm">{g.name}</p>
                <p className="text-xs text-gray-400">{g.student_count} students</p>
              </div>
            ))}
            {!detail?.groups?.length && (
              <p className="text-sm text-gray-400 text-center py-6">No groups yet</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Main Component ──────────────────────────────────────────── */
export default function AdminCenters() {
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState(null)
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ['admin-centers'],
    queryFn: () => api.get('/centers/admin/').then(r => r.data),
  })

  return (
    <div>
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Learning Centers</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage O'quv Markazlar — create, assign directors, monitor</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={16} />
          New Center
        </button>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Centers', value: centers.length, color: 'bg-sky-50 text-sky-600' },
          { label: 'Active', value: centers.filter(c => c.is_active).length, color: 'bg-green-50 text-green-600' },
          { label: 'Total Students', value: centers.reduce((a, c) => a + c.student_count, 0), color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, color }, i) => (
          <motion.div key={label} custom={i} variants={fadeUp} initial="hidden" animate="visible"
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color.split(' ')[1]}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Centers grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-sky-400" />
        </div>
      ) : centers.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible"
          className="text-center py-20 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No learning centers yet</p>
          <p className="text-sm mt-1">Click "New Center" to create the first one</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {centers.map((c, i) => (
            <CenterCard key={c.id} center={c} index={i} onClick={() => navigate(`/admin-panel/centers/${c.id}`)} />
          ))}
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onCreated={() => {}} />
        )}
      </AnimatePresence>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setSelected(null)} />
            <CenterDetailPanel
              center={selected}
              onClose={() => setSelected(null)}
              onRefresh={() => qc.invalidateQueries({ queryKey: ['admin-centers'] })}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
