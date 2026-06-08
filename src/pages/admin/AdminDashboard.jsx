import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Users, Crown, CheckCircle2, RefreshCw, Server, Cpu,
  Database, AlertCircle, TrendingUp, UserPlus, Calendar, BarChart3, DollarSign,
} from 'lucide-react'
import api from '../../api/client'

// ─────────────────────────────────────────────────────────────────────────────
const fade = (i = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' },
})

const SECTION_COLOR = {
  SAT:   { bar: 'bg-sky-500',    text: 'text-sky-600',    bg: 'bg-sky-50',    badge: 'bg-sky-100 text-sky-700' },
  IELTS: { bar: 'bg-violet-500', text: 'text-violet-600', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700' },
  CEFR:  { bar: 'bg-emerald-500',text: 'text-emerald-600',bg: 'bg-emerald-50',badge: 'bg-emerald-100 text-emerald-700' },
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg, sub, index }) {
  return (
    <motion.div {...fade(index)} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium leading-none mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-tight">
          {value === undefined
            ? <span className="inline-block w-14 h-6 bg-gray-100 rounded animate-pulse" />
            : (value?.toLocaleString() ?? '—')}
        </p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

// ─── Section Popularity Bar ───────────────────────────────────────────────────
function SectionBar({ section, unique_users, attempts, maxUsers, index }) {
  const c = SECTION_COLOR[section] || SECTION_COLOR.SAT
  const pct = maxUsers > 0 ? Math.max(4, Math.round((unique_users / maxUsers) * 100)) : 4
  return (
    <motion.div {...fade(index)} className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${c.badge}`}>{section}</span>
          <span className="text-gray-700 font-semibold">{unique_users.toLocaleString()} unique users</span>
        </div>
        <span className="text-gray-400 text-xs">{attempts.toLocaleString()} attempts</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.3 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${c.bar}`}
        />
      </div>
    </motion.div>
  )
}

// ─── Mock Leaderboard Tab ────────────────────────────────────────────────────
function MockTable({ mocks, section }) {
  const c = SECTION_COLOR[section] || SECTION_COLOR.SAT
  if (!mocks?.length) return (
    <div className="py-8 text-center text-sm text-gray-400">No data yet</div>
  )
  return (
    <div className="divide-y divide-gray-50">
      {mocks.map((m, i) => (
        <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i < 3 ? c.bg + ' ' + c.text : 'bg-gray-100 text-gray-400'}`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{m.label}</p>
            {m.type && <p className="text-[11px] text-gray-400">{m.type}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Users size={12} className={c.text} />
            <span className={`text-sm font-bold ${c.text}`}>{m.unique_users.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Status Dot ──────────────────────────────────────────────────────────────
function StatusDot({ ok }) {
  return (
    <span
      className={`inline-flex w-2.5 h-2.5 rounded-full flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-red-500'}`}
      style={{ boxShadow: ok ? '0 0 0 3px rgba(34,197,94,0.2)' : '0 0 0 3px rgba(239,68,68,0.2)' }}
    />
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [mockTab, setMockTab] = useState('SAT')

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/system/stats/').then(r => r.data),
    staleTime: 30_000,
  })

  const { data: payStats } = useQuery({
    queryKey: ['admin-payment-stats'],
    queryFn: () => api.get('/payments/stats/').then(r => r.data),
    staleTime: 60_000,
  })

  const {
    data: health, isLoading: healthLoading, error: healthError,
    refetch: refetchHealth, isFetching: healthFetching,
  } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => api.get('/system/health/').then(r => r.data),
    refetchInterval: 30_000,
    staleTime: 25_000,
  })

  const maxSectionUsers = Math.max(
    ...(stats?.section_popularity?.map(s => s.unique_users) ?? [1])
  )

  const mocksBySection = {
    SAT:   stats?.sat_mocks   ?? [],
    IELTS: stats?.ielts_mocks ?? [],
    CEFR:  stats?.cefr_mocks  ?? [],
  }

  const statCards = [
    { icon: Users,      label: 'Total Users',    value: stats?.total_users,    color: 'text-sky-600',    bg: 'bg-sky-50' },
    { icon: Crown,      label: 'Premium Users',  value: stats?.premium_users,  color: 'text-amber-600',  bg: 'bg-amber-50' },
    { icon: UserPlus,   label: 'New Today',      value: stats?.users_today,    color: 'text-emerald-600',bg: 'bg-emerald-50' },
    { icon: Calendar,   label: 'This Week',      value: stats?.users_week,     color: 'text-violet-600', bg: 'bg-violet-50', sub: 'new users (7d)' },
    { icon: TrendingUp, label: 'This Month',     value: stats?.users_month,    color: 'text-rose-600',   bg: 'bg-rose-50',   sub: 'new users (30d)' },
    { icon: CheckCircle2,label:'Tests Done',     value: stats?.tests_completed,color: 'text-blue-600',   bg: 'bg-blue-50',   sub: 'all sections' },
    {
      icon: DollarSign, label: 'Total Revenue',
      value: payStats ? `$${payStats.total_revenue_usd}` : undefined,
      color: 'text-emerald-700', bg: 'bg-emerald-50', sub: 'all time (Stripe)',
    },
    {
      icon: DollarSign, label: 'This Month',
      value: payStats ? `$${payStats.monthly_revenue_usd}` : undefined,
      color: 'text-sky-700', bg: 'bg-sky-50', sub: 'revenue (30d)',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 size={20} className="text-sky-500" />
        <h2 className="text-lg font-bold text-gray-900">Dashboard Overview</h2>
      </div>

      {/* Stat cards */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={16} /> Failed to load stats: {error.message}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 gap-3">
          {statCards.map((c, i) => (
            <StatCard key={c.label + i} {...c} index={i} />
          ))}
        </div>
      )}

      {/* Revenue plan breakdown */}
      {payStats?.plan_breakdown?.length > 0 && (
        <motion.div {...fade(3)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <DollarSign size={15} className="text-emerald-500" />
            <h3 className="font-bold text-gray-900 text-sm">Revenue by Plan</h3>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-4">
            {payStats.plan_breakdown.map(pb => (
              <div key={pb.plan_label} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-medium">
                    {pb.plan_label === '1month' ? '1-Month Plan'
                      : pb.plan_label === '3month' ? '3-Month Plan'
                      : pb.plan_label === '6month' ? '6-Month Plan'
                      : pb.plan_label}
                  </p>
                  <p className="text-lg font-black text-gray-900">{pb.count} <span className="text-xs font-medium text-gray-400">subs</span></p>
                  <p className="text-xs text-emerald-600 font-semibold">${(pb.revenue / 100).toFixed(2)} revenue</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Section popularity + Mock leaderboard */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Section popularity */}
        <motion.div {...fade(4)} className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900 text-sm">Platform Popularity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Unique users by exam section</p>
          </div>
          <div className="px-5 py-5 space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-40" />
                  <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
                </div>
              ))
            ) : stats?.section_popularity?.length ? (
              stats.section_popularity.map((s, i) => (
                <SectionBar key={s.section} {...s} maxUsers={maxSectionUsers} index={i} />
              ))
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No data yet</p>
            )}
          </div>
        </motion.div>

        {/* Mock leaderboard */}
        <motion.div {...fade(5)} className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Top Mocks by Unique Users</h3>
              <p className="text-xs text-gray-400 mt-0.5">1 user counted once per mock</p>
            </div>
            <div className="flex gap-1">
              {['SAT', 'IELTS', 'CEFR'].map(tab => {
                const c = SECTION_COLOR[tab]
                return (
                  <button
                    key={tab}
                    onClick={() => setMockTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      mockTab === tab ? `${c.bg} ${c.text}` : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {tab}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-72">
            {isLoading ? (
              <div className="p-5 space-y-3">
                {[...Array(5)].map((_, i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
              </div>
            ) : (
              <MockTable mocks={mocksBySection[mockTab]} section={mockTab} />
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent activity */}
      <motion.div {...fade(6)} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 text-sm">Recent Completions</h3>
          <span className="text-xs text-gray-400">Last 10 across all sections</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : !stats?.recent_activity?.length ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No completed tests yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  {['User', 'Section', 'Mock', 'Result', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recent_activity.map((row, i) => {
                  const c = SECTION_COLOR[row.exam_type] || SECTION_COLOR.SAT
                  const result = row.exam_type === 'SAT'
                    ? (row.score != null ? row.score : '—')
                    : row.exam_type === 'IELTS'
                      ? (row.band != null ? `Band ${row.band}` : '—')
                      : (row.band ? row.band : row.score != null ? `${row.score}%` : '—')
                  return (
                    <tr key={i} className="hover:bg-sky-50/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-800 max-w-[160px] truncate">{row.user}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${c.badge}`}>{row.exam_type}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 max-w-[180px] truncate">{row.label}</td>
                      <td className="px-5 py-3 font-semibold text-gray-800">{result}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* System Health */}
      <motion.div {...fade(7)} className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={15} className="text-sky-500" />
            <h3 className="font-bold text-gray-900 text-sm">System Health</h3>
          </div>
          <button
            onClick={() => refetchHealth()}
            disabled={healthFetching}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-sky-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={healthFetching ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {healthLoading ? (
          <div className="p-5 grid grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : healthError ? (
          <div className="p-5 flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle size={15} /> Health check unavailable
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { key: 'redis',  icon: Database, label: 'Redis',   status: health?.redis?.status,  sub: health?.redis?.used_memory_human ? `Memory: ${health.redis.used_memory_human}` : null },
              { key: 'celery', icon: Cpu,      label: 'Celery',  status: health?.celery?.status, sub: health?.celery?.worker_count != null ? `Workers: ${health.celery.worker_count}` : null },
              { key: 'overall',icon: Server,   label: 'Overall', status: health?.status,         sub: 'Auto-refresh: 30s' },
            ].map(({ key, icon: Icon, label, status, sub }) => (
              <div key={key} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
                <div className="mt-0.5"><StatusDot ok={status === 'ok'} /></div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon size={13} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-700">{label}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Status: <span className={`font-semibold ${status === 'ok' ? 'text-green-600' : 'text-red-500'}`}>{status || 'unknown'}</span>
                  </p>
                  {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
