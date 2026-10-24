/**
 * OlympiadAlert — wherever a center student is on the site, five minutes
 * before one of their olympiads a big full-screen card appears with the
 * countdown and an "Enter" button. It stays (minimised to a bar if closed)
 * while the olympiad is running and the student has not started it.
 */
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Trophy, X } from 'lucide-react'
import api from '../../api/client'
import { pad, splitDuration, syncServerClock, useNow } from './clock'

export default function OlympiadAlert({ enabled }) {
  const navigate = useNavigate()
  const location = useLocation()
  const now = useNow(1000)
  const [hidden, setHidden] = useState(() => new Set())

  const { data } = useQuery({
    queryKey: ['my-olympiads'],
    queryFn: () => api.get('/centers/my-olympiads/').then((r) => { syncServerClock(r.data.server_now); return r.data }),
    enabled,
    refetchInterval: 30_000,
  })

  const due = (data?.olympiads || []).find((o) => {
    const starts = new Date(o.starts_at).getTime()
    const ends = new Date(o.ends_at).getTime()
    return !o.me.started && now >= starts - 300_000 && now < ends
  })
  if (!enabled || !due || location.pathname.startsWith('/exam/')) return null

  const starts = new Date(due.starts_at).getTime()
  const live = now >= starts
  const { m, s } = splitDuration(starts - now)
  const enter = () => navigate(`/exam/olympiad/${due.id}`)

  if (hidden.has(due.id)) {
    return (
      <button onClick={enter}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-3 pl-4 pr-5 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl">
        <Trophy size={16} className="text-amber-300" />
        <span className="text-sm font-semibold">{due.title} — {live ? 'started!' : `${pad(m)}:${pad(s)}`}</span>
        <span className="text-sm font-bold text-amber-300">Enter →</span>
      </button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-5 bg-slate-950/95 backdrop-blur text-white">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(800px 480px at 20% 10%, rgba(99,102,241,.4), transparent 60%), radial-gradient(700px 460px at 85% 95%, rgba(244,63,94,.25), transparent 60%)' }} />
        <button onClick={() => setHidden((h) => new Set(h).add(due.id))} title="Minimise"
          className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10"><X size={22} /></button>
        <motion.div initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative text-center max-w-2xl">
          <Trophy size={44} className="mx-auto text-amber-300" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">{live ? 'Olympiad has started' : 'Olympiad starts in'}</p>
          {!live && (
            <p className="mt-4 text-7xl sm:text-9xl font-bold tabular-nums">{pad(m)}<span className="text-white/30">:</span>{pad(s)}</p>
          )}
          <h2 className="mt-5 text-2xl sm:text-4xl font-bold">{due.title}</h2>
          <p className="mt-2 text-white/60">{due.task.title} · {due.duration_minutes} min</p>
          <button onClick={enter}
            className="mt-10 inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-slate-100 shadow-xl">
            {live ? 'Start now' : 'Enter the waiting room'} <ArrowRight size={20} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
