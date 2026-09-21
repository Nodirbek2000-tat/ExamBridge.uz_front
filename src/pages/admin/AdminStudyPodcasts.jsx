import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, Video, Plus, Trash2, Loader2, X, Save, Star, Upload, Sparkles, Pencil,
} from 'lucide-react'
import api from '../../api/client'

/* ── Upload / edit form ───────────────────────────────────────────────── */
function PodcastForm({ initial, onClose, onSaved, section, videoOnly }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [author, setAuthor] = useState(initial?.author || '')
  const [isPremium, setIsPremium] = useState(!!initial?.is_premium)
  const [order, setOrder] = useState(initial?.order ?? 0)
  // 'audio' → Shadowing shelf, 'video' → Podcasts shelf
  const [kind, setKind] = useState(videoOnly ? 'video' : (initial?.media_kind || 'audio'))
  const [media, setMedia] = useState(null)
  const [cover, setCover] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const mediaInput = useRef(null)
  const coverInput = useRef(null)

  const save = async () => {
    if (!title.trim()) { setError('Nom majburiy'); return }
    if (!initial && !media) {
      setError(kind === 'video' ? 'Video fayl (MP4) majburiy' : 'Audio fayl (MP3) majburiy')
      return
    }

    setSaving(true)
    setError('')
    try {
      const form = new FormData()
      form.append('title', title.trim())
      form.append('author', author.trim())
      form.append('is_premium', isPremium ? 'true' : 'false')
      form.append('order', String(Number(order) || 0))
      form.append('section', section)
      if (media) form.append(kind, media)
      if (cover) form.append('cover', cover)

      const cfg = { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 900000 }
      if (initial) await api.patch(`/admin/study/podcasts/${initial.id}/`, form, cfg)
      else await api.post('/admin/study/podcasts/', form, cfg)
      onSaved()
    } catch (e) {
      setError(e?.response?.data?.error || 'Saqlashda xato yuz berdi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={saving ? undefined : onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="fixed left-1/2 top-1/2 z-[80] w-[min(94vw,600px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">
            {initial ? 'Audioni tahrirlash' : 'Yangi podcast / qo\'shiq'}
          </h2>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">Nom *</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="You're your own worst enemy — Robert Greene"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Muallif / ijrochi</span>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Robert Greene"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Tartib</span>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-sky-400 focus:outline-none"
              />
            </label>
          </div>

          {/* Media kind — Shadowing accepts both, Podcasts is video only */}
          {!videoOnly && (
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-gray-500">Turi</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'audio', label: 'Audio', icon: Headphones },
                  { key: 'video', label: 'Video', icon: Video },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setKind(key); setMedia(null) }}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition ${
                      kind === key
                        ? 'border-sky-400 bg-sky-50 text-sky-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Media file */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">
              {kind === 'video' ? 'Video (MP4)' : 'Audio (MP3)'}{' '}
              {initial ? '— almashtirish uchun tanlang' : '*'}
            </span>
            <input
              ref={mediaInput}
              type="file"
              accept={kind === 'video' ? 'video/*' : 'audio/*'}
              onChange={(e) => setMedia(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => mediaInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3.5 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <Upload size={18} className="flex-shrink-0 text-sky-500" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-600">
                {media
                  ? media.name
                  : `${kind === 'video' ? 'MP4' : 'MP3'} faylni tanlang — uzunligi cheklanmagan`}
              </span>
              {media && (
                <span className="flex-shrink-0 text-xs text-gray-400">
                  {(media.size / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
            </button>
          </div>

          {/* Cover */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-gray-500">Rasm (ixtiyoriy)</span>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverInput.current?.click()}
              className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              <Upload size={16} className="flex-shrink-0 text-gray-400" />
              <span className="min-w-0 flex-1 truncate text-sm text-gray-500">
                {cover ? cover.name : 'Rasm tanlang'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPremium((p) => !p)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              isPremium
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Star size={14} fill={isPremium ? 'currentColor' : 'none'} />
            {isPremium ? 'Premium — faqat obunachilar' : 'Bepul — hamma uchun'}
          </button>

          {/* Transcription notice */}
          {(media || !initial) && (
            <div className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
              <Sparkles size={15} className="mt-0.5 flex-shrink-0 text-sky-500" />
              <p className="text-xs leading-relaxed text-sky-700">
                Yuklagandan so'ng AI (Whisper) matnni avtomatik yozib, <b>har bir so'zning vaqtini</b> aniqlaydi —
                shu tufayli matn audio bilan birga harakatlanadi. Bu <b>bir marta</b> bajariladi.
                Uzun fayllar avtomatik bo'laklarga bo'linadi, shuning uchun 1–2 soatlik podkast ham bo'ladi
                (10 daqiqa ≈ 1 daqiqa kutiladi).
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600">{error}</p>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-100 p-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            Bekor
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'AI matnni yozmoqda…' : 'Saqlash'}
          </button>
        </div>
      </motion.div>
    </>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
/**
 * One screen serving both Study Tools shelves:
 *   section="shadowing" → audio or video
 *   section="podcast"   → video only
 */
export default function AdminStudyPodcasts({ section = 'shadowing' }) {
  const videoOnly = section === 'podcast'
  const label = videoOnly ? 'Podcasts' : 'Shadowing'
  const HeaderIcon = videoOnly ? Video : Headphones

  const queryClient = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data: podcasts = [], isLoading } = useQuery({
    queryKey: ['admin-podcasts', section],
    queryFn: () => api.get(`/admin/study/podcasts/?section=${section}`).then((r) => r.data),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-podcasts'] })

  const remove = async (id) => {
    setDeleting(id)
    try {
      await api.delete(`/admin/study/podcasts/${id}/`)
      refresh()
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100">
            <HeaderIcon size={20} className="text-sky-600" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">{label}</h1>
            <p className="text-sm text-gray-500">
              {podcasts.length} ta {videoOnly ? 'video' : 'media'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true) }}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-600"
        >
          <Plus size={16} /> {videoOnly ? 'Video yuklash' : 'Audio / video yuklash'}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={26} className="animate-spin text-gray-300" />
        </div>
      ) : podcasts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <HeaderIcon size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-semibold text-gray-600">
            Hozircha {videoOnly ? 'video' : 'media'} yo'q
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {videoOnly ? 'MP4' : 'MP3 yoki MP4'} yuklang — matn avtomatik yoziladi.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {podcasts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-sky-50/30">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-50">
                {p.cover_url
                  ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                  : <Headphones size={18} className="text-sky-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">{p.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {p.author && <span className="text-xs text-gray-400">{p.author}</span>}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {p.duration_label}
                  </span>
                  {p.has_transcript ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                      <Sparkles size={9} /> Transkript bor
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
                      Transkript yo'q
                    </span>
                  )}
                  {p.is_premium && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                      <Star size={9} fill="currentColor" /> Premium
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setEditing(p); setFormOpen(true) }}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                title="Tahrirlash"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => remove(p.id)}
                disabled={deleting === p.id}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                title="O'chirish"
              >
                {deleting === p.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {formOpen && (
          <PodcastForm
            initial={editing}
            section={section}
            videoOnly={videoOnly}
            onClose={() => setFormOpen(false)}
            onSaved={() => { setFormOpen(false); refresh() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
