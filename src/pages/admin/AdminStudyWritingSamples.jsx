import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Plus, Trash2, Loader2, X, Save, Star, ListChecks } from 'lucide-react'
import api from '../../api/client'

const EMPTY = {
  task_type: '2',
  prompt: '',
  instruction: '',
  essay: '',
  band: '8.0+',
  is_premium: false,
  order: 0,
}

/* ── Create / edit form ───────────────────────────────────────────────── */
function SampleForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? {
    task_type: String(initial.task_type),
    prompt: initial.prompt || '',
    instruction: initial.instruction || '',
    essay: initial.essay || '',
    band: initial.band || '8.0+',
    is_premium: !!initial.is_premium,
    order: initial.order ?? 0,
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const wordCount = form.essay.trim() ? form.essay.trim().split(/\s+/).length : 0

  const save = async () => {
    if (!form.prompt.trim() || !form.essay.trim()) {
      setError('Savol (prompt) va insho matni majburiy')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, task_type: Number(form.task_type), order: Number(form.order) || 0 }
      if (initial) await api.patch(`/admin/study/writing-samples/${initial.id}/`, payload)
      else await api.post('/admin/study/writing-samples/', payload)
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.error || 'Saqlashda xato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="fixed left-1/2 top-1/2 z-[80] flex max-h-[92vh] w-[min(94vw,760px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">
            {initial ? 'Namunani tahrirlash' : 'Yangi writing sample'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="col-span-1">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Task</span>
              <select
                value={form.task_type}
                onChange={(e) => set('task_type', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
              >
                <option value="1">Task 1</option>
                <option value="2">Task 2</option>
              </select>
            </label>
            <label className="col-span-1">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Band</span>
              <input
                value={form.band}
                onChange={(e) => set('band', e.target.value)}
                placeholder="8.0+"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="col-span-1">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Tartib</span>
              <input
                type="number"
                value={form.order}
                onChange={(e) => set('order', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="col-span-1 flex items-end pb-1">
              <button
                type="button"
                onClick={() => set('is_premium', !form.is_premium)}
                className={`flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  form.is_premium
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Star size={13} fill={form.is_premium ? 'currentColor' : 'none'} />
                Premium
              </button>
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">Savol (prompt) *</span>
            <textarea
              value={form.prompt}
              onChange={(e) => set('prompt', e.target.value)}
              rows={3}
              placeholder="Some people believe that…"
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">
              Ko'rsatma (ixtiyoriy) — savol ostidagi qator
            </span>
            <input
              value={form.instruction}
              onChange={(e) => set('instruction', e.target.value)}
              placeholder="Give reasons for your answer and include any relevant examples…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-gray-500">
              <span>Insho matni *</span>
              <span className="text-gray-400">{wordCount} so'z</span>
            </span>
            <textarea
              value={form.essay}
              onChange={(e) => set('essay', e.target.value)}
              rows={14}
              placeholder={'Paragraflarni bo\'sh qator bilan ajrating.\n\nBirinchi paragraf…\n\nIkkinchi paragraf…'}
              className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:border-sky-400 focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>
          )}
        </div>

        <div className="flex flex-shrink-0 gap-3 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Bekor
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Saqlash
          </button>
        </div>
      </motion.div>
    </>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function AdminStudyWritingSamples() {
  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: samples = [], isLoading } = useQuery({
    queryKey: ['admin-writing-samples'],
    queryFn: () => api.get('/admin/study/writing-samples/').then((r) => r.data),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-writing-samples'] })

  const remove = async (id) => {
    setDeleting(id)
    try {
      await api.delete(`/admin/study/writing-samples/${id}/`)
      refresh()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100">
            <PenLine size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Writing Samples</h1>
            <p className="text-sm text-gray-500">{samples.length} ta namuna</p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600"
        >
          <Plus size={16} /> Yangi qo'shish
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={26} className="animate-spin text-gray-300" />
        </div>
      ) : samples.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <PenLine size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">Hozircha namuna yo'q</p>
          <p className="mt-1 text-sm text-gray-400">"Yangi qo'shish" tugmasi orqali birinchisini kiriting.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {samples.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sky-50/30">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sm font-black text-sky-600">
                T{s.task_type}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">{s.prompt}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Band {s.band}
                  </span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {s.word_count} so'z
                  </span>
                  {s.is_premium && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      <Star size={9} fill="currentColor" /> Premium
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setEditing(s); setFormOpen(true) }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                title="Tahrirlash"
              >
                <ListChecks size={16} />
              </button>
              <button
                onClick={() => remove(s.id)}
                disabled={deleting === s.id}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="O'chirish"
              >
                {deleting === s.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <SampleForm
            initial={editing}
            onClose={() => setFormOpen(false)}
            onSaved={() => { setFormOpen(false); refresh() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
