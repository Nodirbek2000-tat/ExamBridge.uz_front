import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, CheckCircle2, Clock, XCircle, Eye, ChevronDown } from 'lucide-react'
import api from '../../api/client'

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock,        dot: 'bg-amber-400' },
  reviewed: { label: 'Reviewed', color: 'bg-sky-100 text-sky-700 border-sky-200',         icon: Eye,          dot: 'bg-sky-400' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, dot: 'bg-emerald-400' },
  ignored:  { label: 'Ignored',  color: 'bg-gray-100 text-gray-500 border-gray-200',      icon: XCircle,      dot: 'bg-gray-300' },
}

const REASON_COLORS = {
  explanation:       'bg-purple-50 text-purple-700 border-purple-200',
  wrong_marked:      'bg-rose-50 text-rose-700 border-rose-200',
  explanation_wrong: 'bg-orange-50 text-orange-700 border-orange-200',
  formatting:        'bg-blue-50 text-blue-700 border-blue-200',
  other:             'bg-gray-50 text-gray-600 border-gray-200',
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function StatusDropdown({ current, reportId, onUpdated }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: (status) => api.patch(`/admin/reports/${reportId}/status/`, { status }),
    onSuccess: () => { qc.invalidateQueries(['admin-reports']); onUpdated?.(); setOpen(false) },
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Change status <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+4px)] z-20 w-36 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden"
          >
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => mutation.mutate(key)}
                disabled={key === current || mutation.isPending}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
                  key === current ? 'bg-gray-50 text-gray-400 cursor-default' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReportCard({ report }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="p-4 flex items-start gap-3">
        {/* Left icon */}
        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Flag size={16} className="text-rose-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${REASON_COLORS[report.reason] || REASON_COLORS.other}`}>
              {report.reason_display}
            </span>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-[13px] text-gray-700 leading-snug line-clamp-2">
            {report.question_content || '—'}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
            <span>Q#{report.question_id}</span>
            <span>·</span>
            <span>{report.user_email}</span>
            <span>·</span>
            <span>{report.created_at}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusDropdown current={report.status} reportId={report.id} />
          {report.details && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="View details"
            >
              <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && report.details && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="bg-gray-50 rounded-xl border border-gray-100 px-3 py-2.5 text-[13px] text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-500 text-[11px] uppercase tracking-wide block mb-1">Details</span>
                {report.details}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AdminReports() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () => api.get('/admin/reports/', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
    staleTime: 30_000,
  })

  const reports = data?.results || []
  const total = data?.total || 0

  const counts = reports.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center shadow-sm">
          <Flag size={22} className="text-rose-600" />
        </div>
        <div>
          <h1 className="text-[26px] font-black text-slate-900">Question Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total report{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(prev => prev === key ? '' : key)}
            className={`rounded-2xl border p-4 text-left transition-all ${
              statusFilter === key ? 'ring-2 ring-sky-400 border-sky-300 bg-sky-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{cfg.label}</span>
            </div>
            <div className="text-2xl font-black text-gray-900">{counts[key] || 0}</div>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
            statusFilter === '' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          All ({total})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(prev => prev === key ? '' : key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
              statusFilter === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {cfg.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Flag size={28} strokeWidth={1.5} />
          </div>
          <p className="font-bold text-gray-500">No reports found</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {reports.map(r => <ReportCard key={r.id} report={r} />)}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
