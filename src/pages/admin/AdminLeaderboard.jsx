import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, Zap, Crown, ShieldCheck, Users, Star, BookOpen, Headphones, GraduationCap } from 'lucide-react'
import api from '../../api/client'

// ─── XP breakdown config ──────────────────────────────────────────────────────
const XP_RATES = [
  { key: 'sat_full',       label: 'SAT Full Mock',    icon: BookOpen,     xp: 100, color: 'text-sky-600',    bg: 'bg-sky-50' },
  { key: 'ielts',          label: 'IELTS Mock',       icon: Headphones,   xp: 80,  color: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'cefr',           label: 'CEFR Mock',        icon: GraduationCap,xp: 60,  color: 'text-emerald-600',bg: 'bg-emerald-50' },
  { key: 'sat_individual', label: 'SAT Module',       icon: Zap,          xp: 30,  color: 'text-amber-600',  bg: 'bg-amber-50' },
]

const RANK_STYLE = {
  1: { medal: '🥇', ring: 'ring-2 ring-yellow-400', name: 'text-yellow-600', card: 'bg-yellow-50 border-yellow-200' },
  2: { medal: '🥈', ring: 'ring-2 ring-slate-400',  name: 'text-slate-600',  card: 'bg-slate-50 border-slate-200' },
  3: { medal: '🥉', ring: 'ring-2 ring-amber-600',  name: 'text-amber-700',  card: 'bg-amber-50 border-amber-200' },
}

const AVATAR_COLORS = [
  'from-sky-400 to-blue-500', 'from-violet-400 to-purple-500',
  'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500', 'from-indigo-400 to-blue-600',
]

function Avatar({ name, size = 'md', rank }) {
  const init = (name?.[0] || 'U').toUpperCase()
  const color = AVATAR_COLORS[(init.charCodeAt(0)) % AVATAR_COLORS.length]
  const dim = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-10 h-10 text-sm'
  const rs = rank && RANK_STYLE[rank]
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-black text-white flex-shrink-0 ${rs?.ring || ''}`}>
      {init}
    </div>
  )
}

// ─── Top 3 podium cards ────────────────────────────────────────────────────────
function PodiumCard({ row, index }) {
  const rs = RANK_STYLE[row.rank] || {}
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={`flex flex-col items-center p-5 rounded-2xl border ${rs.card || 'bg-white border-gray-100'} shadow-sm`}
    >
      <span className="text-3xl mb-2">{rs.medal}</span>
      <Avatar name={row.name} size="lg" rank={row.rank} />
      <p className={`mt-3 font-black text-base leading-tight text-center truncate max-w-[120px] ${rs.name || 'text-gray-800'}`}>
        {row.name}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {row.is_premium && <Crown size={10} className="text-amber-500" />}
        {row.is_staff && <ShieldCheck size={10} className="text-blue-500" />}
      </div>
      <div className="mt-3 flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-sm border border-gray-100">
        <Zap size={13} className="text-amber-500" fill="currentColor" />
        <span className="font-black text-gray-800 text-sm">{row.xp.toLocaleString()} XP</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 w-full text-[10px] text-center">
        {row.sat_full > 0 && <span className="bg-sky-50 text-sky-600 font-semibold rounded px-1.5 py-0.5">SAT×{row.sat_full}</span>}
        {row.ielts > 0   && <span className="bg-violet-50 text-violet-600 font-semibold rounded px-1.5 py-0.5">IELTS×{row.ielts}</span>}
        {row.cefr > 0    && <span className="bg-emerald-50 text-emerald-600 font-semibold rounded px-1.5 py-0.5">CEFR×{row.cefr}</span>}
        {row.sat_individual > 0 && <span className="bg-amber-50 text-amber-600 font-semibold rounded px-1.5 py-0.5">MOD×{row.sat_individual}</span>}
      </div>
    </motion.div>
  )
}

// ─── Table row for rank 4+ ────────────────────────────────────────────────────
function LeaderRow({ row, index }) {
  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 + index * 0.03, duration: 0.25 }}
      className="hover:bg-sky-50/20 transition-colors"
    >
      <td className="px-5 py-3 text-sm font-bold text-gray-400 w-12">#{row.rank}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={row.name} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate max-w-[160px]">{row.name}</p>
            <p className="text-[11px] text-gray-400 truncate max-w-[160px]">{row.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {row.is_premium && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-full">
              <Crown size={8} /> Pro
            </span>
          )}
          {row.is_staff && (
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full">
              <ShieldCheck size={8} /> Admin
            </span>
          )}
          {!row.is_premium && !row.is_staff && (
            <span className="text-[11px] text-gray-400 font-medium">Free</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-[11px] text-gray-500 space-x-2">
        {row.sat_full > 0 && <span className="text-sky-600 font-semibold">SAT:{row.sat_full}</span>}
        {row.ielts > 0    && <span className="text-violet-600 font-semibold">IELTS:{row.ielts}</span>}
        {row.cefr > 0     && <span className="text-emerald-600 font-semibold">CEFR:{row.cefr}</span>}
        {row.sat_individual > 0 && <span className="text-amber-600 font-semibold">MOD:{row.sat_individual}</span>}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="inline-flex items-center gap-1.5 bg-amber-50 rounded-full px-3 py-1">
          <Zap size={12} className="text-amber-500" fill="currentColor" />
          <span className="font-black text-amber-700 text-sm">{row.xp.toLocaleString()}</span>
        </div>
      </td>
    </motion.tr>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminLeaderboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-leaderboard'],
    queryFn: () => api.get('/admin/leaderboard/').then(r => r.data),
    staleTime: 60_000,
  })

  const rows = data?.leaderboard ?? []
  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Trophy size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">XP Leaderboard</h2>
            <p className="text-xs text-gray-400">Ranked by experience points earned from completed mocks</p>
          </div>
        </div>
        {rows.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <Users size={14} className="text-sky-400" />
            <span className="font-semibold">{rows.length}</span> active users
          </div>
        )}
      </div>

      {/* XP rate guide */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {XP_RATES.map(r => (
          <div key={r.key} className={`flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white shadow-sm`}>
            <div className={`w-8 h-8 rounded-lg ${r.bg} flex items-center justify-center flex-shrink-0`}>
              <r.icon size={15} className={r.color} />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">{r.label}</p>
              <p className={`text-sm font-black ${r.color}`}>+{r.xp} XP</p>
            </div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Failed to load leaderboard: {error.message}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Podium — top 3 */}
      {!isLoading && top3.length > 0 && (
        <div className={`grid gap-4 ${top3.length === 3 ? 'grid-cols-3' : top3.length === 2 ? 'grid-cols-2' : 'grid-cols-1 max-w-xs'}`}>
          {top3.map((row, i) => (
            <PodiumCard key={row.user_id} row={row} index={i} />
          ))}
        </div>
      )}

      {/* Table — rank 4+ */}
      {!isLoading && rest.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-2">
            <Star size={14} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Rankings</span>
            <span className="text-xs text-gray-400 ml-1">#{4} — #{rows.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Plan</th>
                  <th className="px-4 py-3 text-left">Breakdown</th>
                  <th className="px-5 py-3 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rest.map((row, i) => (
                  <LeaderRow key={row.user_id} row={row} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && rows.length === 0 && (
        <div className="py-20 text-center">
          <Trophy size={48} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No XP earned yet</p>
          <p className="text-gray-400 text-sm mt-1">Users will appear here after completing mocks.</p>
        </div>
      )}
    </div>
  )
}
