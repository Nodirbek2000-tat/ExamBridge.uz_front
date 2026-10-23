/**
 * CenterGroups — the center's groups. The admin creates groups, picks their
 * teacher and deletes them (students are added inside a group). Everyone
 * else opens a group to see its journal; a teacher sees only their own.
 */
import { useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Loader2, Plus, Trash2, UsersRound, X } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'
import { canWrite, tierOf } from '../admin/adminAccess'
import { Avatar, Card, Empty, PageHeader, PrimaryButton } from './ui'

const INPUT = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

function CreateGroupModal({ centerId, teachers, onClose }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [err, setErr] = useState('')
  const create = useMutation({
    mutationFn: () => api.post(`/centers/${centerId}/groups/`, { name: name.trim(), teacher_id: teacherId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['center-groups', centerId] }); onClose() },
    onError: (e) => setErr(e.response?.data?.error || 'Could not create the group'),
  })
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
        className="fixed z-50 inset-x-4 top-[15vh] mx-auto max-w-sm bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-900">New group</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        {err && <p className="mb-3 p-2.5 rounded-lg bg-rose-50 text-sm text-rose-700">{err}</p>}
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. IELTS Evening B2" className={`${INPUT} mb-4`} />
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Teacher</label>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={`${INPUT} mb-6`}>
          <option value="">Choose later</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
        </select>
        <PrimaryButton className="w-full" icon={create.isPending ? Loader2 : Plus} disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
          Create group
        </PrimaryButton>
      </motion.div>
    </>
  )
}

export default function CenterGroups() {
  const { centerId, myRole } = useOutletContext()
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [creating, setCreating] = useState(false)
  const canManage = myRole === 'admin' || (myRole === 'staff' && canWrite(tierOf(user)))

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['center-groups', centerId],
    queryFn: () => api.get(`/centers/${centerId}/groups/`).then((r) => r.data),
  })
  const { data: teachers = [] } = useQuery({
    queryKey: ['center-members', centerId, 'teacher'],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=teacher`).then((r) => r.data),
    enabled: canManage,
  })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['center-groups', centerId] })
    qc.invalidateQueries({ queryKey: ['center-monitoring', centerId] })
  }
  const setTeacher = useMutation({
    mutationFn: ({ gid, teacherId }) => api.patch(`/centers/${centerId}/groups/${gid}/delete/`, { teacher_id: teacherId || null }),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (gid) => api.delete(`/centers/${centerId}/groups/${gid}/delete/`),
    onSuccess: refresh,
  })

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        eyebrow={myRole === 'teacher' ? 'My groups' : 'Groups'}
        title="Groups"
        subtitle={canManage ? 'Create groups, give each a teacher, then add students inside the group.' : 'Open a group to see its journal.'}
        action={canManage && <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>New group</PrimaryButton>}
      />

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
      ) : groups.length === 0 ? (
        <Card><Empty icon={UsersRound} title="No groups yet"
          text={canManage ? 'Create the first group.' : 'The admin creates groups.'}
          action={canManage && <PrimaryButton icon={Plus} onClick={() => setCreating(true)}>New group</PrimaryButton>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((g) => (
            <Card key={g.id} className="p-5 flex flex-col hover:border-slate-300 transition-colors">
              <button onClick={() => navigate(`/center/${centerId}/groups/${g.id}`)} className="text-left flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{g.name}</p>
                  <ChevronRight size={16} className="text-slate-300 mt-0.5" />
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{g.student_count} students</p>
                <div className="mt-4 flex -space-x-2">
                  {(g.students || []).slice(0, 6).map((s) => (
                    <span key={s.id} className="ring-2 ring-white rounded-full"><Avatar name={s.full_name} size="w-7 h-7 text-[10px]" /></span>
                  ))}
                  {g.student_count > 6 && <span className="w-7 h-7 rounded-full bg-slate-100 ring-2 ring-white text-[10px] font-bold text-slate-500 flex items-center justify-center">+{g.student_count - 6}</span>}
                </div>
              </button>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
                {canManage ? (
                  <select value={g.teacher?.id || ''} onChange={(e) => setTeacher.mutate({ gid: g.id, teacherId: e.target.value })}
                    className={`flex-1 min-w-0 text-xs font-medium rounded-lg border px-2 py-1.5 bg-white ${g.teacher ? 'border-slate-200 text-slate-700' : 'border-amber-200 text-amber-700'}`}>
                    <option value="">No teacher</option>
                    {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                ) : (
                  <span className={`flex-1 text-xs ${g.teacher ? 'text-slate-500' : 'text-amber-600'}`}>{g.teacher?.full_name || 'No teacher'}</span>
                )}
                {canManage && (
                  <button title="Delete group" onClick={() => window.confirm(`Delete group "${g.name}"? Its lessons go too.`) && remove.mutate(g.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <AnimatePresence>
        {creating && <CreateGroupModal centerId={centerId} teachers={teachers} onClose={() => setCreating(false)} />}
      </AnimatePresence>
    </div>
  )
}
