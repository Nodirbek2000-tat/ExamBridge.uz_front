import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Newspaper, Plus, Trash2, Loader2, Upload, X, Eye,
  FileText, Image as ImageIcon, Star, Save,
} from 'lucide-react'
import api from '../../api/client'

const LEVELS = ['', 'A2', 'B1', 'B2', 'C1']

/* ── Upload form ──────────────────────────────────────────────────────── */
function ArticleForm({ onClose }) {
  const queryClient = useQueryClient()
  const coverRef = useRef(null)
  const pdfRef = useRef(null)

  const [form, setForm] = useState({ title: '', excerpt: '', topic: '', level: '', is_premium: false, order: 0 })
  const [cover, setCover] = useState(null)
  const [pdf, setPdf] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const pickCover = (file) => {
    if (!file) return
    setCover(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const create = useMutation({
    mutationFn: () => {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
      if (cover) fd.append('cover', cover)
      if (pdf) fd.append('pdf', pdf)
      return api.post('/admin/study/articles/', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study-articles'] })
      onClose()
    },
    onError: (err) => setError(err?.response?.data?.error || 'Saqlashda xato yuz berdi'),
  })

  const submit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('Sarlavha kiritilishi shart'); return }
    create.mutate()
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 py-10">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                <Newspaper size={19} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Yangi maqola</h2>
                <p className="text-xs text-gray-400">Rasm, sarlavha, qisqa matn va PDF fayl</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>

          {/* Cover */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Bosh rasm</label>
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              className="relative flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              {coverPreview ? (
                <img src={coverPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-gray-400">
                  <ImageIcon size={26} />
                  <span className="text-sm font-semibold">Rasm tanlash</span>
                </span>
              )}
            </button>
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickCover(e.target.files?.[0])}
            />
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Sarlavha *</label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Article 1. Are you ADDICTED to your PHONE ?"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Excerpt */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
              Qisqa matn (kartada ko‘rinadi)
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              rows={3}
              placeholder="Ever pick up your phone, maybe to check the time or answer a message, only to find…"
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Meta row */}
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Mavzu</label>
              <input
                value={form.topic}
                onChange={(e) => set('topic', e.target.value)}
                placeholder="Health"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Daraja</label>
              <select
                value={form.level}
                onChange={(e) => set('level', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              >
                {LEVELS.map((l) => <option key={l} value={l}>{l || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Tartib</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => set('order', e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>

          {/* PDF */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">PDF fayl</label>
            <button
              type="button"
              onClick={() => pdfRef.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40"
            >
              <FileText size={20} className={pdf ? 'text-blue-500' : 'text-gray-400'} />
              <span className={`flex-1 truncate text-sm font-semibold ${pdf ? 'text-gray-800' : 'text-gray-400'}`}>
                {pdf ? pdf.name : 'PDF tanlash'}
              </span>
              <Upload size={16} className="text-gray-400" />
            </button>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setPdf(e.target.files?.[0] || null)}
            />
          </div>

          {/* Premium */}
          <label className="mb-5 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.is_premium}
              onChange={(e) => set('is_premium', e.target.checked)}
              className="h-4 w-4 rounded accent-amber-500"
            />
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <Star size={13} className="text-amber-500" /> Premium maqola
            </span>
          </label>

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Bekor
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {create.isPending ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Saqlash
            </button>
          </div>
        </motion.form>
      </div>
    </>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function AdminStudyArticles() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['admin-study-articles'],
    queryFn: () => api.get('/admin/study/articles/').then((r) => r.data),
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/study/articles/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study-articles'] })
      setDeleteId(null)
    },
  })

  const togglePremium = useMutation({
    mutationFn: ({ id, is_premium }) => {
      const fd = new FormData()
      fd.append('is_premium', String(is_premium))
      return api.patch(`/admin/study/articles/${id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-study-articles'] }),
  })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
            <Newspaper size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Articles</h1>
            <p className="text-sm text-gray-500">{articles.length} ta maqola bazada</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} /> Maqola qo‘shish
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={26} className="animate-spin text-gray-300" />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <Newspaper size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">Hozircha maqola yo‘q</p>
          <p className="mt-1 text-sm text-gray-400">“Maqola qo‘shish” tugmasi orqali birinchisini yuklang.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {articles.map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4 transition-colors hover:bg-gray-50/60">
              <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {a.cover_url ? (
                  <img src={a.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon size={18} className="text-gray-300" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-gray-900">{a.title}</p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{a.excerpt || '—'}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {a.level && <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-600">{a.level}</span>}
                  {a.topic && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{a.topic}</span>}
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                    <Eye size={11} /> {a.views_count}
                  </span>
                  {a.pdf_url ? (
                    <span className="flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      <FileText size={10} /> PDF
                    </span>
                  ) : (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">PDF yo‘q</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => togglePremium.mutate({ id: a.id, is_premium: !a.is_premium })}
                className={`flex flex-shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  a.is_premium
                    ? 'border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100'
                    : 'border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-600'
                }`}
              >
                <Star size={12} fill={a.is_premium ? 'currentColor' : 'none'} />
                {a.is_premium ? 'Premium ✓' : 'Premium'}
              </button>

              <button
                type="button"
                onClick={() => setDeleteId(a.id)}
                className="flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>{showForm && <ArticleForm onClose={() => setShowForm(false)} />}</AnimatePresence>

      {/* Delete confirm */}
      {deleteId && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <p className="font-bold text-gray-900">Maqolani o‘chirasizmi?</p>
              <p className="mt-1 text-sm text-gray-500">Bu amalni qaytarib bo‘lmaydi.</p>
              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(deleteId)}
                  disabled={remove.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                >
                  {remove.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  O‘chirish
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  )
}
