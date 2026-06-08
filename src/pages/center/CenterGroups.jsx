import { useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Plus, X, Loader2, Trash2, UserPlus, ChevronRight,
} from 'lucide-react'
import api from '../../api/client'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.05 } }),
}

/* ── Add Student to Group Sidebar ───────────────────────────── */
function AddStudentPanel({ group, centerId, onClose }) {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)

  const { data: students = [] } = useQuery({
    queryKey: ['center-members', centerId, 'student'],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=student`).then(r => r.data),
  })

  // Filter out already in group
  const groupStudentIds = new Set(group.students.map(s => s.id))
  const available = students.filter(s => !groupStudentIds.has(s.id))

  const addMut = useMutation({
    mutationFn: (sid) => api.post(`/centers/${centerId}/groups/${group.id}/students/`, { student_id: sid }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-groups', centerId] })
      onClose()
    },
  })

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
            <h3 className="font-bold text-gray-900">Add to {group.name}</h3>
            <p className="text-xs text-gray-400">Select a student to add</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {available.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">All students are already in this group</p>
          ) : available.map(s => (
            <button
              key={s.id}
              onClick={() => addMut.mutate(s.id)}
              disabled={addMut.isPending}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-sky-300 hover:bg-sky-50 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {s.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{s.full_name}</p>
                <p className="text-xs text-gray-400">{s.email}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  )
}

/* ── Create Group Modal ─────────────────────────────────────── */
function CreateGroupModal({ centerId, onClose }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [teacherId, setTeacherId] = useState('')

  const { data: teachers = [] } = useQuery({
    queryKey: ['center-members', centerId, 'teacher'],
    queryFn: () => api.get(`/centers/${centerId}/members/?role=teacher`).then(r => r.data),
  })

  const mut = useMutation({
    mutationFn: () => api.post(`/centers/${centerId}/groups/`, {
      name, teacher_id: teacherId || undefined
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['center-groups', centerId] })
      onClose()
    },
  })

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">New Group</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Group Name *</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Group A, 10-B, Morning class..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Teacher (optional)</label>
              <select
                value={teacherId} onChange={e => setTeacherId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-sky-400 bg-white"
              >
                <option value="">— Select teacher —</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600">Cancel</button>
            <button
              onClick={() => mut.mutate()}
              disabled={!name.trim() || mut.isPending}
              className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}

/* ── Main ───────────────────────────────────────────────────── */
export default function CenterGroups() {
  const { centerId, myRole } = useOutletContext()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [addStudentGroup, setAddStudentGroup] = useState(null)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['center-groups', centerId],
    queryFn: () => api.get(`/centers/${centerId}/groups/`).then(r => r.data),
  })

  const deleteGroup = useMutation({
    mutationFn: (gid) => api.delete(`/centers/${centerId}/groups/${gid}/delete/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['center-groups', centerId] }),
  })

  return (
    <div>
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Groups</h2>
          <p className="text-sm text-gray-400">{groups.length} groups</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus size={15} />
          New Group
        </button>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-400" size={24} /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FolderOpen size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No groups yet</p>
          <p className="text-sm mt-1">Create groups to organize your students</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <motion.div
              key={g.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
              onClick={() => navigate(`/center/${centerId}/groups/${g.id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-sky-200 hover:shadow-md transition-all group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:from-sky-200 group-hover:to-indigo-200 transition-colors">
                <FolderOpen size={20} className="text-sky-600" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{g.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">
                    <span className="font-semibold text-gray-600">{g.student_count}</span> students
                  </span>
                  {g.teacher && (
                    <span className="text-xs text-gray-400">
                      · {g.teacher.full_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setAddStudentGroup(g)}
                  className="p-2 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors"
                  title="Add student"
                >
                  <UserPlus size={15} />
                </button>
                {(myRole === 'director' || myRole === 'admin') && (
                  <button
                    onClick={() => { if (confirm('Delete this group?')) deleteGroup.mutate(g.id) }}
                    className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <ChevronRight size={16} className="text-gray-300 group-hover:text-sky-400 transition-colors flex-shrink-0" />
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreate && <CreateGroupModal centerId={centerId} onClose={() => setShowCreate(false)} />}
        {addStudentGroup && (
          <AddStudentPanel
            group={addStudentGroup}
            centerId={centerId}
            onClose={() => setAddStudentGroup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
