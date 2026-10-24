/**
 * Olympiad ranking: a podium for the top three, then everyone else.
 * Equal scores are already ordered by time (faster first) on the server.
 */
import { motion } from 'framer-motion'
import { Clock, Crown, Loader2 } from 'lucide-react'
import { elapsedLabel } from './clock'

const STATE = {
  scoring: { label: 'Being scored', cls: 'text-slate-500 bg-slate-100' },
  testing: { label: 'Taking the test', cls: 'text-sky-700 bg-sky-50' },
  waiting: { label: 'In the waiting room', cls: 'text-amber-700 bg-amber-50' },
  absent: { label: 'Not joined', cls: 'text-slate-400 bg-slate-50' },
}

const PODIUM = [
  { place: 2, h: 'h-24', bg: 'from-slate-200 to-slate-300', ring: 'ring-slate-300', text: 'text-slate-700' },
  { place: 1, h: 'h-32', bg: 'from-amber-300 to-amber-400', ring: 'ring-amber-300', text: 'text-amber-800' },
  { place: 3, h: 'h-20', bg: 'from-orange-200 to-orange-300', ring: 'ring-orange-300', text: 'text-orange-800' },
]

const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

export function Podium({ board, dark = false }) {
  const top = Object.fromEntries(board.filter((r) => r.rank && r.rank <= 3).map((r) => [r.rank, r]))
  if (!top[1]) return null
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {PODIUM.map(({ place, h, bg, ring, text }, i) => {
        const r = top[place]
        if (!r) return <div key={place} className="w-24 sm:w-32" />
        return (
          <motion.div key={place} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 * i + 0.1 }}
            className="w-24 sm:w-32 flex flex-col items-center">
            {place === 1 && <Crown size={26} className="text-amber-400 mb-1" />}
            <span className={`w-14 h-14 rounded-full bg-white ring-4 ${ring} flex items-center justify-center text-base font-bold text-slate-700`}>
              {initials(r.name)}
            </span>
            <p className={`mt-2 text-sm font-semibold text-center truncate w-full ${dark ? 'text-white' : 'text-slate-900'}`}>{r.name}</p>
            <p className={`text-xs ${dark ? 'text-white/60' : 'text-slate-500'}`}>{r.detail || r.score}</p>
            <div className={`mt-2 w-full ${h} rounded-t-2xl bg-gradient-to-b ${bg} flex items-start justify-center pt-3`}>
              <span className={`text-3xl font-black ${text}`}>{place}</span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function Leaderboard({ board, highlight }) {
  if (!board.length) return <p className="py-8 text-center text-sm text-slate-400">Nobody has taken part yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            {['#', 'Student', 'Class', 'Result', 'Time'].map((h) => (
              <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {board.map((r) => (
            <tr key={r.student_id} className={r.student_id === highlight ? 'bg-indigo-50/60' : ''}>
              <td className="px-4 py-2.5 w-12">
                {r.rank
                  ? <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-xs font-bold ${
                      r.rank === 1 ? 'bg-amber-100 text-amber-700' : r.rank === 2 ? 'bg-slate-100 text-slate-700'
                        : r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'text-slate-500'}`}>{r.rank}</span>
                  : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.name}{r.student_id === highlight && <span className="ml-2 text-xs text-indigo-600">you</span>}</td>
              <td className="px-4 py-2.5 text-slate-500">{r.school_class || '—'}</td>
              <td className="px-4 py-2.5">
                {r.rank
                  ? <span className="font-semibold text-slate-900">{r.detail || r.score}</span>
                  : <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${STATE[r.state]?.cls}`}>
                      {r.state === 'scoring' && <Loader2 size={10} className="animate-spin" />}{STATE[r.state]?.label}
                    </span>}
              </td>
              <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap">
                {r.elapsed != null && <span className="inline-flex items-center gap-1"><Clock size={11} />{elapsedLabel(r.elapsed)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
