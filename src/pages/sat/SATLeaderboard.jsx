import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronLeft, Trophy, Star, Loader2 } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

const RANK_CONFIG = {
  1: { bg: 'bg-amber-50 border-amber-200',   num: 'text-amber-500',  avatar: 'bg-amber-400 text-white', label: '1st', bar: 'bg-amber-400' },
  2: { bg: 'bg-slate-50 border-slate-200',   num: 'text-slate-500',  avatar: 'bg-slate-400 text-white', label: '2nd', bar: 'bg-slate-400' },
  3: { bg: 'bg-orange-50 border-orange-200', num: 'text-orange-500', avatar: 'bg-orange-400 text-white', label: '3rd', bar: 'bg-orange-400' },
}

function PodiumCard({ entry, height }) {
  const cfg = RANK_CONFIG[entry.rank]
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${entry.is_you ? 'bg-sky-500 text-white' : cfg.avatar}`}>
        {entry.initial}
      </div>
      <p className={`text-xs font-bold text-center truncate max-w-[72px] ${entry.is_you ? 'text-sky-700' : 'text-slate-700'}`}>
        {entry.is_you ? 'You' : entry.name}
      </p>
      <div className={`w-20 rounded-t-2xl flex flex-col items-center justify-end pb-3 ${cfg.bg} border-x border-t ${height}`}>
        <span className={`text-2xl font-black ${cfg.num}`}>{cfg.label}</span>
        <span className="text-xs font-bold text-slate-500 mt-0.5">{entry.xp} XP</span>
      </div>
    </div>
  )
}

export default function SATLeaderboard() {
  const user = useAuthStore((s) => s.user)

  const { data: ranking, isLoading } = useQuery({
    queryKey: ['sat-ranking'],
    queryFn: () => api.get('/sat/ranking/').then((r) => r.data),
  })

  const top50 = ranking?.top50 || []
  const top3 = ranking?.top3 || []
  const yourRank = ranking?.your_rank ?? null
  const yourXp = ranking?.your_xp ?? 0
  const rest = top50.slice(3)

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 pt-1">
        <Link to="/app/sat" className="p-2 rounded-xl hover:bg-slate-100 transition text-slate-500">
          <ChevronLeft size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" />
          <h1 className="text-2xl font-black text-slate-900">Leaderboard</h1>
        </div>
        <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-semibold">Top 50</span>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-sky-400" />
        </div>
      ) : (
        <>
          {/* Your XP summary */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {(user?.first_name?.[0] || user?.email?.[0] || 'Y').toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-black text-slate-900 text-lg">{user?.first_name || 'You'}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Star size={13} className="text-sky-500" />
                <span className="text-sm font-bold text-sky-600">{yourXp} XP</span>
                {yourRank && <span className="text-xs text-slate-400">· Rank #{yourRank}</span>}
              </div>
            </div>
          </motion.div>

          {/* Podium for top 3 */}
          {top3.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-wide text-center mb-6">Top 3</h2>
              <div className="flex items-end justify-center gap-3">
                {/* 2nd */}
                <PodiumCard entry={top3[1]} height="h-20" />
                {/* 1st */}
                <PodiumCard entry={top3[0]} height="h-28" />
                {/* 3rd */}
                <PodiumCard entry={top3[2]} height="h-16" />
              </div>
            </motion.div>
          )}

          {/* Full list */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-700">Rankings</span>
              <span className="text-xs text-slate-400">XP = Tests × 30</span>
            </div>

            <div className="divide-y divide-slate-50">
              {top50.map((entry, idx) => {
                const cfg = RANK_CONFIG[entry.rank]
                const maxXp = top50[0]?.xp || 1
                return (
                  <motion.div key={entry.rank}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.02 * idx }}
                    className={`flex items-center gap-3 px-4 py-3 ${entry.is_you ? 'bg-sky-50' : ''}`}>
                    {/* Rank number */}
                    <span className={`text-sm font-black w-8 text-center flex-shrink-0 ${cfg ? cfg.num : entry.is_you ? 'text-sky-500' : 'text-slate-400'}`}>
                      #{entry.rank}
                    </span>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${entry.is_you ? 'bg-sky-500 text-white' : cfg ? cfg.avatar : 'bg-slate-200 text-slate-600'}`}>
                      {entry.initial}
                    </div>
                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={`text-sm font-bold truncate ${entry.is_you ? 'text-sky-700' : 'text-slate-800'}`}>
                          {entry.is_you ? `You (${entry.name})` : entry.name}
                        </p>
                        <span className={`text-sm font-black flex-shrink-0 ${entry.is_you ? 'text-sky-600' : 'text-slate-700'}`}>
                          {entry.xp} XP
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${entry.is_you ? 'bg-sky-400' : cfg ? cfg.bar : 'bg-slate-300'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${maxXp ? (entry.xp / maxXp) * 100 : 0}%` }}
                          transition={{ duration: 0.6, delay: 0.02 * idx }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {yourRank && yourRank > 50 && (
              <div className="border-t-2 border-dashed border-slate-200 px-4 py-3 flex items-center gap-3 bg-sky-50">
                <span className="text-sm font-black text-sky-500 w-8 text-center">#{yourRank}</span>
                <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-xs font-black text-white">
                  {(user?.first_name?.[0] || user?.email?.[0] || 'Y').toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-sky-700">You</p>
                </div>
                <span className="text-sm font-black text-sky-600">{yourXp} XP</span>
              </div>
            )}

            {top50.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">No data yet. Complete tests to earn XP!</div>
            )}
          </motion.div>
        </>
      )}
    </div>
  )
}
