/**
 * OlympiadPage — a student's waiting room, start and result.
 * Route: /exam/olympiad/:olympiadId (full screen, exam layout)
 *
 * Before the start: a big countdown on the server's clock. At the start the
 * test opens by itself for everyone who is in the room (late comers press
 * Start). The test screen comes back here when it is finished
 * (utils/fullMockFlow), and the page shows the student's place and the
 * ranking — the full table once the olympiad is over.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarClock, Loader2, LogOut, Trophy } from 'lucide-react'
import api from '../../api/client'
import { startTest, taskMeta } from '../center/taskTypes'
import { rememberFullMockStep } from '../../utils/fullMockFlow'
import { pad, splitDuration, syncServerClock, useNow, whenLabel } from './clock'
import Leaderboard, { Podium } from './Leaderboard'
import { useAuthStore } from '../../store/authStore'

function BigCountdown({ ms }) {
  const { d, h, m, s } = splitDuration(ms)
  const parts = d ? [[d, 'days'], [h, 'hours'], [m, 'min']] : h ? [[h, 'hours'], [m, 'min'], [s, 'sec']] : [[m, 'min'], [s, 'sec']]
  return (
    <div className="flex items-start justify-center gap-3 sm:gap-6">
      {parts.map(([v, l], i) => (
        <div key={l} className="flex items-start gap-3 sm:gap-6">
          {i > 0 && <span className="text-5xl sm:text-8xl font-light text-white/30 leading-none">:</span>}
          <div className="text-center">
            <motion.div key={v} initial={{ y: -8, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}
              className="text-6xl sm:text-9xl font-bold tabular-nums leading-none text-white">{pad(v)}</motion.div>
            <p className="mt-2 text-xs sm:text-sm uppercase tracking-[0.25em] text-white/50">{l}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function OlympiadPage() {
  const { olympiadId } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const now = useNow(250)
  const [opening, setOpening] = useState(false)
  const [err, setErr] = useState('')
  const autoStarted = useRef(false)
  const entered = useRef(false)

  const { data, isError, isFetchedAfterMount } = useQuery({
    queryKey: ['olympiad', olympiadId],
    refetchOnMount: 'always',
    queryFn: () => api.get(`/centers/olympiads/${olympiadId}/`).then((r) => { syncServerClock(r.data.server_now); return r.data }),
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d) return 5000
      return d.phase === 'finished' || d.me?.finished ? 15_000 : 5_000
    },
  })

  const starts = data ? new Date(data.starts_at).getTime() : 0
  const ends = data ? new Date(data.ends_at).getTime() : 0
  const phase = !data ? null : now < starts ? (starts - now <= 300_000 ? 'soon' : 'upcoming') : now < ends ? 'live' : 'finished'

  // tell the organiser the student is in the room
  useEffect(() => {
    if (!data || entered.current || (phase !== 'soon' && phase !== 'live')) return
    entered.current = true
    api.post(`/centers/olympiads/${olympiadId}/enter/`).catch(() => {})
  }, [data, phase, olympiadId])

  const begin = async () => {
    if (opening) return
    setOpening(true)
    setErr('')
    try {
      const { data: b } = await api.post(`/centers/olympiads/${olympiadId}/begin/`)
      const { url, ref } = await startTest(b.test)
      if (ref) rememberFullMockStep(b.test.type, ref, `/exam/olympiad/${olympiadId}`)
      navigate(url)
    } catch (e) {
      const code = e.response?.data?.error
      setErr(code === 'not_started' ? 'Not yet — a few more seconds.' : code === 'finished' ? 'The olympiad is over.' : 'Could not open the test. Try again.')
      setOpening(false)
      autoStarted.current = false
    }
  }

  // everyone in the room starts together (only on fresh data — a student coming
  // back from the test must not have it reopened from a cached answer)
  useEffect(() => {
    if (phase === 'live' && isFetchedAfterMount && data && !data.me?.started && !autoStarted.current) {
      autoStarted.current = true
      begin()
    }
  }, [phase, data, isFetchedAfterMount]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isError) return <div className="flex-1 flex items-center justify-center bg-slate-950 text-white/60">This olympiad is not available.</div>
  if (!data) return <div className="flex-1 flex items-center justify-center bg-slate-950"><Loader2 size={28} className="animate-spin text-white/40" /></div>

  const done = data.me?.finished
  const showResults = done || phase === 'finished'
  const exit = () => navigate('/app/my-tasks')

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-950 text-white relative">
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(900px 500px at 15% 0%, rgba(99,102,241,.35), transparent 60%), radial-gradient(800px 500px at 90% 100%, rgba(244,63,94,.22), transparent 60%)' }} />
      <header className="relative max-w-5xl mx-auto px-5 h-16 flex items-center gap-3">
        <Trophy size={18} className="text-amber-300" />
        <p className="text-sm font-semibold truncate flex-1">{data.title}</p>
        <button onClick={exit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10">
          <LogOut size={14} />Exit
        </button>
      </header>

      <main className="relative max-w-5xl mx-auto px-5 py-10 sm:py-16 text-center">
        {!showResults && (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
              {phase === 'upcoming' ? 'Olympiad' : phase === 'soon' ? 'Get ready' : 'Started'}
            </p>
            <h1 className="mt-3 text-3xl sm:text-5xl font-bold">{data.title}</h1>
            <p className="mt-3 text-white/60 inline-flex items-center gap-2"><CalendarClock size={16} />{whenLabel(data.starts_at)} · {data.duration_minutes} min · {taskMeta(data.task.type).label}</p>

            <div className="mt-12 sm:mt-16">
              {phase === 'live'
                ? <div className="space-y-4">
                    <p className="text-2xl font-semibold">{data.me?.started ? 'Your test is in progress' : 'The olympiad has started!'}</p>
                    <button onClick={begin} disabled={opening}
                      className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-900 text-lg font-bold hover:bg-slate-100 disabled:opacity-70">
                      {opening ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                      {opening ? 'Opening…' : data.me?.started ? 'Continue the test' : 'Start now'}
                    </button>
                  </div>
                : <BigCountdown ms={starts - now} />}
            </div>

            {phase === 'soon' && <p className="mt-10 text-white/70">Stay on this page — the test opens by itself at the start for everyone.</p>}
            {phase === 'upcoming' && <p className="mt-10 text-white/50">The waiting room opens 5 minutes before the start. You can come back then.</p>}
            {err && <p className="mt-6 text-rose-300">{err}</p>}
            {data.description && <p className="mt-8 max-w-xl mx-auto text-sm text-white/60">{data.description}</p>}
          </>
        )}

        {showResults && (
          <>
            {done && data.me?.state === 'scoring' && (
              <div className="mb-10">
                <Loader2 size={30} className="mx-auto animate-spin text-white/60" />
                <p className="mt-3 text-xl font-semibold">Finished! Your answers are being scored…</p>
              </div>
            )}
            {data.me?.rank && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-12">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Your place</p>
                <p className="mt-2 text-8xl font-black text-amber-300">{data.me.rank}</p>
                <p className="mt-2 text-lg text-white/80">{data.me.detail}</p>
              </motion.div>
            )}
            {!done && phase === 'finished' && <p className="mb-10 text-white/60">You did not take part in this olympiad.</p>}
            {phase !== 'finished' && <p className="mb-8 text-sm text-white/50">The full ranking appears when the olympiad ends.</p>}
            {data.board?.some((r) => r.rank) && <div className="mb-10"><Podium board={data.board} dark /></div>}
            {data.board?.length > 0 && (
              <div className="bg-white rounded-3xl text-left overflow-hidden">
                <Leaderboard board={data.board} highlight={me?.id} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
