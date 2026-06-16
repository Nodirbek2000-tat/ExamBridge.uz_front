import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  History, BookOpen, Headphones, BookMarked,
  Clock3, ChevronLeft, ChevronRight, Loader2, CheckCircle2,
} from 'lucide-react'
import api from '../../api/client'

const PAGE_SIZE = 10

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'GRAMMAR', label: 'Grammar' },
  { key: 'READING', label: 'Reading' },
  { key: 'LISTENING', label: 'Listening' },
]

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ScoreBar({ percent }) {
  const p = Math.round(percent ?? 0)
  const color = p >= 70 ? 'bg-emerald-400' : p >= 50 ? 'bg-sky-400' : 'bg-orange-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${p}%` }} />
      </div>
      <span className={`text-xs font-black w-8 text-right ${p >= 70 ? 'text-emerald-600' : p >= 50 ? 'text-sky-600' : 'text-orange-500'}`}>{p}%</span>
    </div>
  )
}

function CEFRAttemptCard({ item }) {
  const isReading = item.attempt_type === 'READING'
  const isListening = item.attempt_type === 'LISTENING'
  const isGrammar = item.attempt_type === 'GRAMMAR'

  const Icon = isReading ? BookOpen : isListening ? Headphones : BookMarked
  const iconBg = isReading ? 'bg-blue-100' : isListening ? 'bg-violet-100' : 'bg-amber-100'
  const iconColor = isReading ? 'text-blue-500' : isListening ? 'text-violet-500' : 'text-amber-600'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 text-sm leading-tight truncate max-w-xs">
              {item.title}
            </p>
            {item.level && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 font-bold flex-shrink-0">
                {item.level}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock3 size={11} /> {formatDate(item.finished_at)}
            </span>
            {item.correct != null && (
              <span className="text-xs text-gray-500 font-medium">
                <CheckCircle2 size={11} className="inline text-emerald-400 mr-0.5" />
                {item.correct}/{item.total} correct
              </span>
            )}
          </div>
        </div>
      </div>

      {item.score_percent != null && (
        <div className="mt-3">
          <ScoreBar percent={item.score_percent} />
        </div>
      )}
    </div>
  )
}

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
            p === page ? 'bg-sky-500 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function CEFRHistory() {
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)

  const { data = [], isLoading } = useQuery({
    queryKey: ['cefr-history'],
    queryFn: () => api.get('/cefr/history/').then(r => r.data),
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    const items = Array.isArray(data) ? data : []
    if (tab === 'all') return items
    return items.filter(i => i.attempt_type === tab)
  }, [data, tab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleTabChange = (t) => { setTab(t); setPage(1) }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 flex items-center justify-center">
          <History size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black">CEFR History</h1>
          <p className="text-gray-500 text-sm">Grammar, Reading & Listening attempts</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
              tab === t.key
                ? 'bg-sky-500 text-white border-sky-500'
                : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-sky-400" />
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400">{filtered.length} attempt{filtered.length !== 1 ? 's' : ''}</p>

          {pageItems.length === 0 ? (
            <div className="text-center py-16">
              <History size={36} className="mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">No attempts yet</p>
              <p className="text-gray-300 text-xs mt-1">Complete tests to see history here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {pageItems.map(item => (
                <CEFRAttemptCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {filtered.length > PAGE_SIZE && (
            <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo(0, 0) }} />
          )}
        </>
      )}
    </div>
  )
}
