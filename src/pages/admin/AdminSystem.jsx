import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server,
  Database,
  Cpu,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Activity,
  Clock,
  Users,
  BookOpen,
  ToggleLeft,
  ToggleRight,
  Loader2,
  TrendingUp,
} from 'lucide-react'
import api from '../../api/client'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' } }),
}

function StatusCard({ title, icon: Icon, status, details, index }) {
  const isOk = status === 'ok' || status === 'healthy' || status === 'connected'
  const isWarn = status === 'warn' || status === 'degraded'

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className={`bg-white rounded-2xl p-5 shadow-sm border flex items-start gap-4 ${
        isOk ? 'border-green-100' : isWarn ? 'border-slate-100' : 'border-red-100'
      }`}
    >
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isOk ? 'bg-green-100' : isWarn ? 'bg-slate-100' : 'bg-red-100'
      }`}>
        <Icon size={24} className={isOk ? 'text-green-600' : isWarn ? 'text-slate-600' : 'text-red-600'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isOk
              ? 'bg-green-100 text-green-700'
              : isWarn
              ? 'bg-slate-100 text-slate-700'
              : 'bg-red-100 text-red-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-green-500 animate-pulse' : isWarn ? 'bg-slate-500' : 'bg-red-500'}`} />
            {status || 'unknown'}
          </span>
        </div>
        <div className="space-y-0.5">
          {Object.entries(details || {}).map(([k, v]) => (
            <p key={k} className="text-xs text-gray-500">
              <span className="font-medium text-gray-600">{k}:</span> {String(v)}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function StatBig({ icon: Icon, label, value, color, bg, index }) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      className="bg-white rounded-2xl p-5 shadow-sm border border-sky-50 text-center"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 ${bg}`}>
        <Icon size={22} className={color} />
      </div>
      <p className="text-3xl font-black text-gray-900">
        {value === undefined ? (
          <span className="inline-block w-16 h-7 bg-gray-100 rounded animate-pulse" />
        ) : (
          value?.toLocaleString() ?? '—'
        )}
      </p>
      <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
    </motion.div>
  )
}

export default function AdminSystem() {
  const [autoRefresh, setAutoRefresh] = useState(true)

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
    isFetching: healthFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: () => api.get('/system/health/').then((r) => r.data),
    refetchInterval: autoRefresh ? 30_000 : false,
    staleTime: 25_000,
  })

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-system-stats'],
    queryFn: () => api.get('/system/stats/').then((r) => r.data),
    refetchInterval: autoRefresh ? 30_000 : false,
    staleTime: 25_000,
  })

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  const activeTasks = health?.celery?.active_tasks ?? health?.active_tasks ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Server size={20} className="text-sky-500" />
          <h2 className="text-lg font-bold text-gray-900">System Monitor</h2>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={11} />
              Updated {lastUpdated}
            </span>
          )}
          <button
            onClick={() => setAutoRefresh((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${autoRefresh ? 'text-sky-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {autoRefresh ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            Auto-refresh
          </button>
          <button
            onClick={() => { refetchHealth(); refetchStats() }}
            disabled={healthFetching}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 text-white rounded-xl text-xs font-semibold hover:bg-sky-600 transition disabled:opacity-60"
          >
            <RefreshCw size={12} className={healthFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Status cards */}
      {healthError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
          <AlertCircle size={18} />
          <span className="text-sm">Health check failed: {healthError.message}</span>
        </div>
      ) : healthLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatusCard
            title="Redis"
            icon={Database}
            status={health?.redis?.status}
            details={{
              ...(health?.redis?.memory ? { 'Memory used': health.redis.memory } : {}),
              ...(health?.redis?.connected_clients !== undefined ? { 'Clients': health.redis.connected_clients } : {}),
              ...(health?.redis?.version ? { 'Version': health.redis.version } : {}),
            }}
            index={0}
          />
          <StatusCard
            title="Celery Workers"
            icon={Cpu}
            status={health?.celery?.status}
            details={{
              ...(health?.celery?.workers !== undefined ? { 'Active workers': health.celery.workers } : {}),
              ...(health?.celery?.active_tasks !== undefined
                ? { 'Active tasks': Array.isArray(health.celery.active_tasks) ? health.celery.active_tasks.length : health.celery.active_tasks }
                : {}),
              ...(health?.celery?.queued !== undefined ? { 'Queued': health.celery.queued } : {}),
            }}
            index={1}
          />
        </div>
      )}

      {/* Active tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white rounded-2xl shadow-sm border border-sky-50 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
          <Activity size={16} className="text-sky-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Active Tasks</h3>
          {activeTasks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-sky-100 text-sky-700 text-xs font-semibold rounded-full">
              {activeTasks.length}
            </span>
          )}
        </div>

        {healthLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : !activeTasks.length ? (
          <div className="p-10 text-center">
            <CheckCircle2 size={32} className="text-green-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No active tasks running.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60">
                  {['Task Name', 'Worker', 'Started', 'Status'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeTasks.map((task, i) => (
                  <tr key={task.id || i} className="hover:bg-sky-50/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-800 font-mono text-xs">{task.name || task.task_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{task.worker || task.hostname || '—'}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {task.started_at || task.time_start
                        ? new Date((task.started_at || task.time_start) * (task.time_start < 1e10 ? 1000 : 1)).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        {task.status || 'running'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Platform stats */}
      <div>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"
        >
          <TrendingUp size={15} />
          Platform Statistics
        </motion.h3>

        {statsError ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
            <AlertCircle size={16} />
            <span className="text-sm">Failed to load platform stats.</span>
          </div>
        ) : statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBig icon={Users} label="Total Users" value={stats?.total_users} color="text-sky-600" bg="bg-sky-100" index={0} />
            <StatBig icon={BookOpen} label="Tests Completed" value={stats?.tests_completed} color="text-green-600" bg="bg-green-100" index={1} />
            <StatBig icon={Activity} label="Active Sessions" value={stats?.active_sessions} color="text-blue-600" bg="bg-blue-100" index={2} />
            <StatBig icon={TrendingUp} label="Premium Users" value={stats?.premium_users} color="text-slate-600" bg="bg-slate-100" index={3} />
          </div>
        )}
      </div>

      {/* Overall system status banner */}
      <AnimatePresence>
        {!healthLoading && health && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`flex items-center gap-3 p-4 rounded-xl ${
              health.status === 'ok'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-slate-50 border border-slate-200 text-slate-700'
            }`}
          >
            {health.status === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            <span className="text-sm font-semibold">
              Overall system status: <span className="uppercase">{health.status || 'unknown'}</span>
            </span>
            {autoRefresh && (
              <span className="ml-auto text-xs opacity-70 flex items-center gap-1">
                <Loader2 size={11} className={healthFetching ? 'animate-spin' : 'hidden'} />
                Auto-refreshing every 30s
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

