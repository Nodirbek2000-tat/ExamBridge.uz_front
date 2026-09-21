import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Loader2, PenLine, ListChecks, Lock, CornerDownLeft } from 'lucide-react'
import api from '../../api/client'

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: '1', label: 'Task 1' },
  { key: '2', label: 'Task 2' },
]

/* ── Card ─────────────────────────────────────────────────────────────── */
function SampleCard({ sample, index, onOpen, busy }) {
  const locked = sample.is_premium

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className="text-[15px] font-bold text-sky-600">Task {sample.task_type}</span>
        {sample.is_read && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600">
            <ListChecks size={13} /> Analyzed
          </span>
        )}
      </div>

      <p className="mb-4 line-clamp-2 min-h-[3.25rem] text-[17px] font-semibold leading-snug text-slate-900">
        {sample.prompt}
      </p>

      <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
        <span className="text-sm font-semibold text-slate-600">Band: {sample.band}</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(sample)}
          disabled={busy}
          className={`rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60 ${
            locked ? 'bg-slate-400' : 'bg-sky-500 hover:bg-sky-600'
          }`}
        >
          {busy ? (
            <Loader2 size={15} className="mx-auto animate-spin" />
          ) : locked ? (
            <span className="flex items-center gap-1.5"><Lock size={13} /> Premium</span>
          ) : sample.is_read ? (
            'View essay'
          ) : (
            'Start analyzing'
          )}
        </button>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
          {sample.word_count} words
        </span>
      </div>
    </motion.div>
  )
}

/* ── Essay reader ─────────────────────────────────────────────────────── */
function EssayReader({ sample, onClose }) {
  const [note, setNote] = useState(sample.note || '')
  const savedRef = useRef(sample.note || '')
  const timerRef = useRef(null)

  // Autosave the note ~1s after typing stops
  useEffect(() => {
    if (note === savedRef.current) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      api.put(`/study/writing-samples/${sample.id}/note/`, { note })
        .then(() => { savedRef.current = note })
        .catch(() => {})
    }, 1000)
    return () => clearTimeout(timerRef.current)
  }, [note, sample.id])

  const paragraphs = (sample.essay || '').split(/\n\s*\n/).filter(Boolean)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col bg-slate-50"
    >
      {/* Top bar */}
      <div className="flex flex-shrink-0 items-start gap-3 bg-white px-4 py-3 shadow-sm sm:px-6">
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ChevronLeft size={20} />
        </button>
        <p className="min-w-0 flex-1 text-[17px] font-bold leading-snug text-slate-900 sm:text-xl">
          {sample.prompt}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="hidden flex-shrink-0 items-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-600 sm:flex"
        >
          <CornerDownLeft size={15} /> Back to list
        </button>
      </div>

      {/* Split: essay | note */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1.35fr_1fr] sm:p-5">
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          {sample.instruction && (
            <p className="mb-6 text-[18px] font-bold leading-relaxed text-slate-900">
              {sample.instruction}
            </p>
          )}
          <div className="space-y-6">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-[18px] leading-[1.95] tracking-[0.01em] text-slate-800">{p}</p>
            ))}
          </div>
          <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-4 text-[13px] font-semibold text-slate-400">
            <span>Task {sample.task_type}</span>
            <span>·</span>
            <span>Band {sample.band}</span>
            <span>·</span>
            <span>{sample.word_count} words</span>
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-6">
          <p className="mb-2.5 text-[15px] font-semibold text-slate-400">Note</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Yozib qo'ying — foydali iboralar, tuzilma, o'z fikringiz…"
            className="min-h-0 flex-1 resize-none rounded-xl bg-transparent text-[17px] leading-[1.8] text-slate-800 placeholder-slate-300 focus:outline-none"
          />
        </div>
      </div>
    </motion.div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function WritingSamplesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { sampleId } = useParams()
  const [tab, setTab] = useState('ALL')
  const [open, setOpen] = useState(null)
  const [opening, setOpening] = useState(null)

  const { data: samples = [], isLoading } = useQuery({
    queryKey: ['writing-samples'],
    queryFn: () => api.get('/study/writing-samples/').then((r) => r.data),
  })

  // The URL drives which essay is open; fetching it also marks it analyzed.
  useEffect(() => {
    if (!sampleId) { setOpen(null); return }
    if (open?.id === Number(sampleId)) return

    let cancelled = false
    setOpening(Number(sampleId))
    api.get(`/study/writing-samples/${sampleId}/`)
      .then(({ data }) => {
        if (cancelled) return
        setOpen(data)
        queryClient.invalidateQueries({ queryKey: ['writing-samples'] })
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 403) alert('Bu namuna Premium foydalanuvchilar uchun.')
        navigate('/study/writing-samples', { replace: true })
      })
      .finally(() => { if (!cancelled) setOpening(null) })

    return () => { cancelled = true }
  }, [sampleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = tab === 'ALL' ? samples : samples.filter((s) => String(s.task_type) === tab)

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Writing Samples</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Yuqori ball olgan namunali insholar — o'qing, tuzilmasini o'rganing, o'zingizga eslatma yozing.
        </p>
      </div>

      {/* Task filter */}
      <div className="mb-6 inline-flex rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <PenLine size={38} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">Hozircha namuna yo'q</p>
          <p className="mt-1 text-sm text-slate-400">Admin panel → Study Tools → Writing Samples orqali qo'shing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <SampleCard
              key={s.id}
              sample={s}
              index={i}
              busy={opening === s.id}
              onOpen={(sample) => navigate(`/study/writing-samples/${sample.id}`)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && <EssayReader sample={open} onClose={() => navigate('/study/writing-samples')} />}
      </AnimatePresence>
    </div>
  )
}
