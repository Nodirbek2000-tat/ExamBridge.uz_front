/**
 * StudentQuizzes — a center student's Tests section: the center's active
 * A/B/C tests. Route: /app/tests
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Clock, ListChecks, Loader2, Play, RotateCcw, Trophy } from 'lucide-react'
import api from '../../api/client'

const GRADIENTS = ['from-indigo-500 to-violet-600', 'from-emerald-500 to-teal-600', 'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600']

function Ring({ percent }) {
  const r = 22
  const c = 2 * Math.PI * r
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="700" fill="white">{percent}%</text>
    </svg>
  )
}

function QuizCard({ quiz, index }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setBusy(true)
    try {
      const { data } = await api.post(`/centers/quizzes/${quiz.id}/start/`)
      navigate(`/exam/quiz/${data.attempt_id}`)
    } catch {
      setBusy(false)
    }
  }
  return (
    <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className={`relative overflow-hidden rounded-3xl p-6 text-white bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} shadow-sm`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="relative flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/70">{quiz.center}</p>
          <h3 className="mt-1 text-xl font-bold leading-tight">{quiz.title}</h3>
          {quiz.description && <p className="mt-1 text-sm text-white/80 line-clamp-2">{quiz.description}</p>}
        </div>
        {quiz.best && <Ring percent={quiz.best.percent} />}
      </div>
      <div className="relative mt-5 flex items-center gap-4 text-sm text-white/85">
        <span className="inline-flex items-center gap-1.5"><ListChecks size={15} />{quiz.questions} questions</span>
        <span className="inline-flex items-center gap-1.5"><Clock size={15} />{quiz.time_minutes} min</span>
        {quiz.attempts > 0 && <span className="inline-flex items-center gap-1.5"><Trophy size={15} />{quiz.attempts}×</span>}
      </div>
      <button onClick={start} disabled={busy}
        className="relative mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-slate-900 font-bold hover:bg-white/90 disabled:opacity-70">
        {busy ? <Loader2 size={16} className="animate-spin" /> : quiz.attempts ? <RotateCcw size={16} /> : <Play size={16} />}
        {quiz.attempts ? 'Take again' : 'Start'}
      </button>
    </motion.article>
  )
}

export default function StudentQuizzes() {
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['my-quizzes'],
    queryFn: () => api.get('/centers/my-quizzes/').then((r) => r.data),
  })
  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tests</h1>
        <p className="mt-1 text-sm text-slate-500">Tests from your learning center. Pick one and check yourself.</p>
      </header>
      {isLoading ? <div className="py-20 flex justify-center"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        : list.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200/70">
            <ListChecks size={34} className="mx-auto mb-3 text-slate-200" />
            <p className="font-semibold text-slate-600">No tests yet</p>
            <p className="text-sm text-slate-400 mt-1">Your teachers' tests appear here when they switch them on.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">{list.map((q, i) => <QuizCard key={q.id} quiz={q} index={i} />)}</div>
        )}
    </div>
  )
}
