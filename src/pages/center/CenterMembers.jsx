/**
 * CenterMembers — shows students / teachers / admins
 * Props via URL: role param (students | teachers | admins)
 */
import { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, UserPlus, X, Loader2, Trash2, Mail, Phone, Search, BarChart3, ChevronRight,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.04 } }),
}

const ROLE_COLORS = {
  director: 'bg-amber-100 text-amber-700',
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-sky-100 text-sky-700',
  student: 'bg-green-100 text-green-700',
}

function MemberAvatar({ name, role }) {
  const initials = name?.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${ROLE_COLORS[role] || 'bg-gray-100 text-gray-600'}`}>
      {initials}
    </div>
  )
}

/* ── Add Member Sidebar ─────────────────────────────────────── */
function AddMemberPanel({ role, centerId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '', role,
  })
  const [avatar, setAvatar] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [err, setErr] = useState('')

  const handleAvatar = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const mut = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (avatar) fd.append('avatar', avatar)
      return api.post(`/centers/${centerId}/members/add/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-members', centerId] })
      onClose()
    },
    onError: e => setErr(e.response?.data?.error || 'Error adding member'),
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const roleLabel = { student: 'Student', teacher: 'Teacher', admin: 'Admin' }[role] || role

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
      >
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Add {roleLabel}</h3>
            <p className="text-xs text-gray-400">Create new account & add to center</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {err && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{err}</div>}

          {/* Photo upload */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Photo (optional)</label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xl text-gray-300">👤</span>
                }
              </div>
              <label className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-500 cursor-pointer transition-colors">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                Upload photo
              </label>
            </div>
          </div>

          {[
            { key: 'first_name', label: 'First Name', placeholder: 'Alisher' },
            { key: 'last_name', label: 'Last Name', placeholder: 'Karimov' },
            { key: 'email', label: 'Email *', placeholder: 'user@example.com', type: 'email' },
            { key: 'phone', label: 'Phone', placeholder: '+998 90 000 00 00' },
            { key: 'password', label: 'Password *', placeholder: '••••••••', type: 'password' },
          ].map(({ key, label, placeholder, type = 'text' }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {mut.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            Add {roleLabel}
          </button>
        </div>
      </motion.div>
    </>
  )
}

/* ── Main Component ─────────────────────────────────────────── */
export default function CenterMembers({ targetRole }) {
  const { centerId, myRole } = useOutletContext()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')

  // Teachers can no longer add members — only director/admin can
  const canAdd = myRole === 'director' ||
    (myRole === 'admin' && ['teacher', 'student'].includes(targetRole))

  // Director/admin can open a teacher's analytics page
  // Director/admin can open admin/director profile page
  const canAnalyze = targetRole === 'teacher' && ['director', 'admin'].includes(myRole)
  const canViewProfile = targetRole === 'admin' && myRole === 'director'

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['center-members', centerId, targetRole],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=${targetRole}`).then(r => r.data),
  })

  const removeMut = useMutation({
    mutationFn: (uid) => api.delete(`/centers/${centerId}/members/${uid}/remove/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['center-members', centerId, targetRole] }),
  })

  const filtered = members.filter(m =>
    !search ||
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  const ROLE_LABEL = { student: 'Students', teacher: 'Teachers', admin: 'Admins', director: 'Directors' }

  return (
    <div>
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{ROLE_LABEL[targetRole] || targetRole}</h2>
          <p className="text-sm text-gray-400">{members.length} total</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <UserPlus size={15} />
            Add {ROLE_LABEL[targetRole]?.slice(0, -1)}
          </button>
        )}
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${ROLE_LABEL[targetRole] || 'members'}...`}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 bg-white"
          />
        </div>
      </motion.div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-400" size={24} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No {ROLE_LABEL[targetRole]} yet</p>
          {canAdd && <p className="text-sm mt-1">Click "Add" to get started</p>}
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((m, i) => (
            <motion.div key={m.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              onClick={
                canAnalyze ? () => navigate(`/center/${centerId}/teachers/${m.id}`) :
                canViewProfile ? () => navigate(`/center/${centerId}/members/${m.id}/profile`) :
                undefined
              }
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-sky-200 transition-colors ${canAnalyze || canViewProfile ? 'cursor-pointer' : ''}`}>
              {/* Avatar / initials */}
              {m.avatar
                ? <img src={m.avatar} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
                : <MemberAvatar name={m.full_name} role={m.role} />
              }
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{m.full_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Mail size={11} />{m.email}
                  </span>
                  {m.phone && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone size={11} />{m.phone}
                    </span>
                  )}
                </div>
              </div>
              {canAnalyze && (
                <span className="flex items-center gap-1 text-xs font-semibold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg flex-shrink-0">
                  <BarChart3 size={13} /> Analytics
                </span>
              )}
              {canViewProfile && (
                <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg flex-shrink-0">
                  <BarChart3 size={13} /> Profile
                </span>
              )}
              {(myRole === 'director' || (myRole === 'admin' && targetRole !== 'director')) && (
                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${m.full_name}?`)) removeMut.mutate(m.id) }}
                  className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              )}
              {(canAnalyze || canViewProfile) && <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />}
            </motion.div>
          ))}
        </div>
      )}

      {/* Add panel */}
      <AnimatePresence>
        {showAdd && (
          <AddMemberPanel
            role={targetRole}
            centerId={centerId}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
