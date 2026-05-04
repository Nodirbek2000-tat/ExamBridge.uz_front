import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, X, Save, Image as ImageIcon, Sparkles } from 'lucide-react'
import api from '../../api/client'

const SUBJECTS = ['SAT', 'IELTS', 'CEFR', 'GENERAL']
const SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'math', label: 'Math' },
  { key: 'reading_writing', label: 'Reading & Writing' },
  { key: 'reading', label: 'Reading' },
  { key: 'listening', label: 'Listening' },
  { key: 'writing', label: 'Writing' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'grammar', label: 'Grammar' },
]

function StructureModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({
    subject: item?.subject || 'SAT',
    section: item?.section || 'general',
    title: item?.title || '',
    content: item?.content || '',
    is_active: item?.is_active ?? true,
  })
  const [imageFile, setImageFile] = useState(null)
  const [preview, setPreview] = useState(item?.image || null)
  const [saving, setSaving] = useState(false)

  const handleImageSelect = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setImageFile(f)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(f)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (imageFile) fd.append('image', imageFile)

      if (item?.id) {
        await api.put(`/admin/ai/structures/${item.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.post('/admin/ai/structures/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      onSaved()
      onClose()
    } catch (e) {
      alert('Error saving: ' + (e?.response?.data?.detail || e.message))
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900">{item ? 'Edit Structure' : 'New Structure'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Subject</label>
              <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400">
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Section</label>
              <select value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400">
                {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. IELTS Task 2 Essay Structure"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Content</label>
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              placeholder="Write the structure/template content in English..."
              rows={10}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400 font-mono resize-y" />
            <p className="text-[10px] text-gray-400 mt-1">The AI will use this content when explaining this topic to students.</p>
          </div>

          {/* Image */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-1 block">Diagram / Image (optional)</label>
            <div className="flex items-center gap-3">
              {preview && (
                <img src={preview} alt="Preview" className="h-20 rounded-xl border border-gray-200 object-contain" />
              )}
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-gray-300 hover:border-sky-400 text-sm text-gray-500 hover:text-sky-600 transition-colors">
                <ImageIcon size={16} />
                {preview ? 'Change image' : 'Upload image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="rounded" />
            <label htmlFor="is_active" className="text-sm text-gray-700">Active (AI will use this structure)</label>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function AdminAIStructures() {
  const qc = useQueryClient()
  const [filterSubject, setFilterSubject] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | {item}
  const [deleting, setDeleting] = useState(null)

  const { data: structures = [], isLoading } = useQuery({
    queryKey: ['admin-ai-structures', filterSubject, filterSection],
    queryFn: () => api.get('/admin/ai/structures/', {
      params: { subject: filterSubject, section: filterSection }
    }).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/ai/structures/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai-structures'] })
      setDeleting(null)
    },
  })

  const onSaved = () => qc.invalidateQueries({ queryKey: ['admin-ai-structures'] })

  const subjectColor = {
    SAT: 'bg-sky-100 text-sky-700',
    IELTS: 'bg-emerald-100 text-emerald-700',
    CEFR: 'bg-violet-100 text-violet-700',
    GENERAL: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-sky-500" />
          <h1 className="text-xl font-black text-gray-900">AI Teaching Structures</h1>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition shadow-sm"
        >
          <Plus size={14} />
          Add Structure
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Structures are teaching templates the AI uses when explaining topics to students.
        Add grammar rules, essay frameworks, problem-solving strategies, etc.
      </p>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400">
          <option value="">All subjects</option>
          {SUBJECTS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-400">
          <option value="">All sections</option>
          {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : structures.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No structures yet. Add your first teaching structure.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {structures.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start gap-3">
                {s.image && (
                  <img src={s.image} alt={s.title} className="w-16 h-16 rounded-xl border border-gray-200 object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${subjectColor[s.subject] || 'bg-gray-100 text-gray-600'}`}>
                      {s.subject}
                    </span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {SECTIONS.find(x => x.key === s.section)?.label || s.section}
                    </span>
                    {!s.is_active && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Inactive</span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{s.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 font-mono">{s.content}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setModal(s)}
                    className="p-2 rounded-xl text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleting(s.id)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <StructureModal
            item={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSaved={onSaved}
          />
        )}
        {deleting && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onMouseDown={() => setDeleting(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onMouseDown={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 mb-2">Delete structure?</h3>
              <p className="text-sm text-gray-500 mb-5">The AI will no longer use this structure.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={() => deleteMutation.mutate(deleting)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-60">
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
