/**
 * CenterMembers — students / teachers / admins of a center.
 *
 * Who adds whom (the server checks the same): the director hires admins and
 * teachers, the admin adds teachers and students. Teachers add nobody.
 */
import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, ChevronRight, Loader2, Mail, Phone, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { canWrite, tierOf } from '../admin/adminAccess'
import { Avatar, Card, Empty, PageHeader, PrimaryButton } from './ui'

const TITLES = { student: 'Students', teacher: 'Teachers', admin: 'Admins' }
const SINGULAR = { student: 'student', teacher: 'teacher', admin: 'admin' }
const MANAGES = { director: ['admin', 'teacher'], admin: ['teacher', 'student'] }
const INPUT = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

function AddMemberPanel({ role, centerId, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', role })
  const [avatar, setAvatar] = useState(null)
  const [err, setErr] = useState('')
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const add = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (avatar) fd.append('avatar', avatar)
      return api.post(`/centers/${centerId}/members/add/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-members', centerId] })
      qc.invalidateQueries({ queryKey: ['center-monitoring', centerId] })
      onClose()
    },
    onError: (e) => setErr(e.response?.data?.error || 'Could not add'),
  })

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col">
        <header className="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Add {SINGULAR[role]}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Creates the account and adds it to the center.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {err && <p className="p-3 rounded-xl bg-rose-50 text-sm font-medium text-rose-700">{err}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="First name" className={INPUT} />
            <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Last name" className={INPUT} />
          </div>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Email *" className={INPUT} />
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Phone" className={INPUT} />
          <input type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)}
            placeholder="Password *" className={INPUT} />
          <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 cursor-pointer hover:border-slate-300">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAvatar(e.target.files[0] || null)} />
            {avatar
              ? <img src={URL.createObjectURL(avatar)} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <span className="w-10 h-10 rounded-full bg-slate-100" />}
            <span className="text-sm text-slate-500">{avatar ? avatar.name : 'Photo (optional)'}</span>
          </label>
        </div>
        <footer className="px-6 py-4 border-t border-slate-100">
          <PrimaryButton className="w-full" icon={add.isPending ? Loader2 : UserPlus}
            disabled={add.isPending || !form.email || !form.password} onClick={() => add.mutate()}>
            Add {SINGULAR[role]}
          </PrimaryButton>
        </footer>
      </motion.aside>
    </>
  )
}

export default function CenterMembers({ targetRole }) {
  const { centerId, myRole } = useOutletContext()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [q, setQ] = useState('')

  const support = myRole === 'staff' && canWrite(tierOf(user))
  const canManage = support || (MANAGES[myRole] || []).includes(targetRole)
  const canAnalyze = targetRole === 'teacher' && ['director', 'admin'].includes(myRole)
  const canViewProfile = targetRole === 'admin' && myRole === 'director'

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['center-members', centerId, targetRole],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=${targetRole}`).then((r) => r.data),
  })
  const remove = useMutation({
    mutationFn: (uid) => api.delete(`/centers/${centerId}/members/${uid}/remove/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-members', centerId, targetRole] })
      qc.invalidateQueries({ queryKey: ['center-monitoring', centerId] })
    },
  })

  const term = q.trim().toLowerCase()
  const shown = term ? members.filter((m) => `${m.full_name} ${m.email} ${m.phone}`.toLowerCase().includes(term)) : members
  const open = (m) => canAnalyze ? navigate(`/center/${centerId}/teachers/${m.id}`)
    : canViewProfile ? navigate(`/center/${centerId}/members/${m.id}/profile`) : null

  return (
    <div className="max-w-4xl mx-auto">
      <PageHeader eyebrow="People" title={TITLES[targetRole]} subtitle={`${members.length} in the center`}
        action={canManage && <PrimaryButton icon={UserPlus} onClick={() => setAdding(true)}>Add {SINGULAR[targetRole]}</PrimaryButton>} />

      <label className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/70 focus-within:border-slate-300">
        <Search size={15} className="text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${TITLES[targetRole].toLowerCase()}`}
          className="flex-1 bg-transparent text-sm outline-none placeholder-slate-400" />
      </label>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
      ) : shown.length === 0 ? (
        <Card><Empty icon={Users} title={q ? 'Nobody matches' : `No ${TITLES[targetRole].toLowerCase()} yet`} /></Card>
      ) : (
        <Card className="divide-y divide-slate-100 overflow-hidden">
          {shown.map((m) => (
            <div key={m.id} onClick={() => open(m)}
              className={`flex items-center gap-4 px-5 py-3.5 ${canAnalyze || canViewProfile ? 'cursor-pointer hover:bg-slate-50/70' : ''} transition-colors`}>
              {m.avatar ? <img src={m.avatar} alt="" className="w-9 h-9 rounded-full object-cover" /> : <Avatar name={m.full_name} size="w-9 h-9 text-xs" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{m.full_name}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1"><Mail size={11} />{m.email}</span>
                  {m.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{m.phone}</span>}
                </p>
              </div>
              {canAnalyze && <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><BarChart3 size={13} />Analytics</span>}
              {canManage && (
                <button title="Remove from center" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Remove ${m.full_name} from the center?`)) remove.mutate(m.id) }}
                  className="p-2 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"><Trash2 size={15} /></button>
              )}
              {(canAnalyze || canViewProfile) && <ChevronRight size={16} className="text-slate-300" />}
            </div>
          ))}
        </Card>
      )}

      <AnimatePresence>
        {adding && <AddMemberPanel role={targetRole} centerId={centerId} onClose={() => setAdding(false)} />}
      </AnimatePresence>
    </div>
  )
}
