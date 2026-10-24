/**
 * FullMockList — the published full mocks of one exam (IELTS or CEFR),
 * shown in the exam hub's "Full Exam" tab. Start / Continue opens the
 * rehearsal page, which runs the four sections in exam order.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BookOpen, Clock, Crown, Headphones, Loader2, Mic, PenLine, Play, RotateCcw, Trophy } from 'lucide-react'
import api from '../../api/client'

export const SKILL_ICON = { listening: Headphones, reading: BookOpen, writing: PenLine, speaking: Mic }
const ICON_FOR_STEP = (key) => SKILL_ICON[key.replace(/\d$/, '')] || PenLine

export function hours(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

function MockCard({ mock, exam, index }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const last = mock.history?.[0]

  const open = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const { data } = await api.post(`/${exam}/full-mocks/${mock.id}/start/`)
      navigate(`/exam/full-mock/${data.attempt_id}`)
    } catch (e) {
      setErr(e.response?.data?.error === 'premium_required' ? 'This full mock is for Premium members.' : 'Could not start. Try again.')
      setBusy(false)
    }
  }

  return (
    <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl border border-gray-200/80 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{mock.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 inline-flex items-center gap-1"><Clock size={12} />{hours(mock.total_minutes)} · all four sections</p>
        </div>
        {mock.is_premium && <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md"><Crown size={11} />Premium</span>}
      </div>
      {mock.description && <p className="mt-2 text-sm text-gray-600 line-clamp-2">{mock.description}</p>}

      <ol className="mt-4 flex flex-wrap gap-1.5">
        {mock.steps.map((s, i) => {
          const Icon = ICON_FOR_STEP(s.key)
          return (
            <li key={s.key} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-50 text-[11px] font-semibold text-gray-600">
              <span className="text-gray-400 tabular-nums">{i + 1}</span><Icon size={12} />{s.label}
            </li>
          )
        })}
      </ol>

      <div className="mt-auto pt-5 flex items-center gap-3">
        {last?.result?.label && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
            <Trophy size={13} />Last: {last.result.label}
          </span>
        )}
        <button onClick={open} disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700 disabled:opacity-60 transition-colors">
          {busy ? <Loader2 size={14} className="animate-spin" /> : mock.in_progress ? <Play size={14} /> : last ? <RotateCcw size={14} /> : <Play size={14} />}
          {mock.in_progress ? 'Continue' : last ? 'Take again' : 'Start'}
        </button>
      </div>
      {mock.in_progress && <p className="mt-2 text-right text-[11px] text-gray-400">You have one in progress — continue where you stopped.</p>}
      {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
    </motion.article>
  )
}

export default function FullMockList({ exam = 'ielts' }) {
  const { data: mocks = [], isLoading } = useQuery({
    queryKey: ['full-mocks', exam],
    queryFn: () => api.get(`/${exam}/full-mocks/`).then((r) => r.data),
  })
  const order = exam === 'ielts'
    ? 'Listening → Reading → Writing (Task 1 & 2) → Speaking'
    : 'Listening → Reading → Writing → Speaking'

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gray-900 text-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/50">Real exam rehearsal</p>
        <h2 className="mt-1 text-xl font-bold">Full {exam === 'ielts' ? 'IELTS' : 'CEFR'} mock</h2>
        <p className="mt-1 text-sm text-white/70">{order}. Same order and timing as the real exam, one overall result at the end.
          You can stop between sections and continue later.</p>
      </div>
      {isLoading ? (
        <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-gray-300" /></div>
      ) : mocks.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-gray-200/80">
          <Trophy size={32} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-600">No full mocks yet</p>
          <p className="text-sm text-gray-400 mt-1">They appear here as soon as they are published.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {mocks.map((m, i) => <MockCard key={m.id} mock={m} exam={exam} index={i} />)}
        </div>
      )}
    </div>
  )
}
