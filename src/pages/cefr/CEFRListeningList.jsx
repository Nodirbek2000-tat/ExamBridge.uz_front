import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Clock3, HelpCircle, Loader2, Headphones, ChevronUp, ChevronDown } from 'lucide-react'
import api from '../../api/client'

const LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

function LevelBadge({ level }) {
  const tone =
    level === 'A1' || level === 'A2'
      ? 'text-emerald-600'
      : level === 'B1' || level === 'B2'
        ? 'text-slate-600'
        : 'text-red-600'
  const wrap =
    level === 'A1' || level === 'A2'
      ? 'bg-emerald-50 border-emerald-200'
      : level === 'B1' || level === 'B2'
        ? 'bg-slate-50 border-slate-200'
        : 'bg-red-50 border-red-200'

  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${wrap}`}>
      <span className="inline-flex items-end gap-0.5 h-3">
        <span className={`w-[2px] h-[6px] rounded-full ${tone} bg-current`} />
        <span className={`w-[2px] h-[9px] rounded-full ${tone} bg-current`} />
        <span className={`w-[2px] h-[12px] rounded-full ${tone} bg-current`} />
      </span>
      <span className={`text-[11px] font-bold tracking-wide ${tone}`}>{level}</span>
    </span>
  )
}

export default function CEFRListeningList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('ALL')
  const [expanded, setExpanded] = useState(true)
  const [starting, setStarting] = useState(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['cefr-listening-list'],
    queryFn: () => api.get('/cefr/listening/').then((r) => r.data),
    staleTime: 60_000,
  })

  const items = useMemo(() => {
    return (data || []).filter((s) => {
      const matchSearch = (s.title || '').toLowerCase().includes(search.toLowerCase())
      const matchLevel = level === 'ALL' || s.level === level
      return matchSearch && matchLevel
    })
  }, [data, search, level])

  const handleStart = async (section) => {
    setStarting(section.id)
    try {
      const res = await api.post(`/cefr/listening/${section.id}/start/`)
      navigate(`/exam/cefr/listening/${res.data.attempt_id}?section=${section.id}&title=${encodeURIComponent(section.title)}`)
    } catch (e) {
      alert('Could not start: ' + (e.response?.data?.detail || e.message))
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
          />
        </div>

        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 md:col-span-2"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l === 'ALL' ? 'All levels' : `Level ${l}`}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100"
        >
          <div className="text-left">
            <h3 className="text-2xl font-black text-gray-900 leading-none">Choose a test</h3>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-gray-900">CEFR Listening</span>
              <span className="ml-2">{isLoading ? '...' : `${items.length} sections`}</span>
            </p>
          </div>
          {expanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </button>

        {expanded && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {isLoading &&
              [...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />)}

            {!isLoading &&
              items.map((section) => {
                const isStarting = starting === section.id
                const attemptsCount =
                  section.attempts_count ??
                  section.attempt_count ??
                  section.total_attempts ??
                  section.last_attempt?.count ??
                  0
                const isCompleted = Boolean(
                  Number(attemptsCount) > 0 ||
                  section.last_attempt ||
                  section.is_completed ||
                  section.status === 'completed' ||
                  section.completed_at ||
                  section.last_attempt?.is_completed ||
                  section.last_attempt?.status === 'completed' ||
                  section.last_attempt?.completed_at
                )
                return (
                  <div
                    key={section.id}
                    className="relative rounded-xl border border-gray-200 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    {isCompleted && (
                      <span className="absolute -top-2 left-3 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
                        Completed
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-gray-900">{section.title}</h4>
                        {section.is_mock && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold">Mock</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-2 flex-wrap">
                        <LevelBadge level={section.level || 'B1'} />
                        <span className="text-gray-500">1 section</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={14} /> {section.time_limit ?? 25} min
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <HelpCircle size={14} /> {section.question_count ?? '—'} questions
                        </span>
                        <span className="text-gray-400">{attemptsCount} attempts</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStart(section)}
                      disabled={isStarting}
                      className="px-5 h-10 rounded-lg bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition disabled:opacity-60 shrink-0"
                    >
                      {isStarting ? <Loader2 size={15} className="animate-spin mx-auto" /> : isCompleted ? 'Re-do test' : 'Start test'}
                    </button>
                  </div>
                )
              })}

            {!isLoading && !items.length && (
              <div className="py-16 text-center text-gray-400">
                <Headphones size={34} className="mx-auto mb-2 text-gray-300" />
                No sections found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

