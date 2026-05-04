import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Clock3, HelpCircle, Loader2, BookOpen, ChevronUp, ChevronDown, CheckCircle2, Lock } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

const DIFF_STYLES = {
  EASY: {
    tone: 'text-emerald-600',
    wrap: 'bg-emerald-50 border-emerald-200',
  },
  MEDIUM: {
    tone: 'text-slate-500',
    wrap: 'bg-slate-50 border-slate-200',
  },
  HARD: {
    tone: 'text-red-500',
    wrap: 'bg-red-50 border-red-200',
  },
}

function DifficultyBadge({ difficulty }) {
  const key = difficulty || 'MEDIUM'
  const style = DIFF_STYLES[key] || DIFF_STYLES.MEDIUM

  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border ${style.wrap}`}>
      <span className="inline-flex items-end gap-0.5 h-3">
        <span className={`w-[2px] h-[6px] rounded-full ${style.tone} bg-current`} />
        <span className={`w-[2px] h-[9px] rounded-full ${style.tone} bg-current`} />
        <span className={`w-[2px] h-[12px] rounded-full ${style.tone} bg-current`} />
      </span>
      <span className={`text-[11px] font-bold tracking-wide ${style.tone}`}>{key}</span>
    </span>
  )
}

export default function IELTSReadingList() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('ALL')
  const [type, setType] = useState('ALL')
  const [parts, setParts] = useState('ALL')
  const [expanded, setExpanded] = useState(true)
  const [starting, setStarting] = useState(null)
  const [premiumModal, setPremiumModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['ielts-reading-list'],
    queryFn: () => api.get('/ielts/reading/').then((r) => r.data),
    staleTime: 60_000,
  })

  const items = useMemo(() => {
    const mocks = (data?.mocks || []).map((m) => ({
      ...m,
      itemType: 'MOCK',
      count: m.part_count || m.parts?.length || 1,
      duration: m.time_limit,
      questions: m.total_questions,
    }))
    const practices = (data?.practices || []).map((p) => ({
      ...p,
      itemType: 'PRACTICE',
      count: 1,
      duration: p.time_limit,
      questions: p.question_count,
    }))
    const filtered = [...mocks, ...practices].filter((item) => {
      const matchSearch = item.title?.toLowerCase().includes(search.toLowerCase())
      const matchLevel = level === 'ALL' || item.difficulty === level
      const matchType = type === 'ALL' || item.itemType === type
      const matchParts = parts === 'ALL' || String(item.count) === parts
      return matchSearch && matchLevel && matchType && matchParts
    })
    // Free first, premium last
    return [...filtered.filter(i => !i.is_premium), ...filtered.filter(i => i.is_premium)]
  }, [data, search, level, type, parts])

  const handleStart = async (item) => {
    if (item.is_premium && !user?.is_premium) {
      setPremiumModal(true)
      return
    }
    const key = `${item.itemType}-${item.id}`
    setStarting(key)
    try {
      if (item.itemType === 'MOCK') {
        const parts = item.parts || []
        const first = parts[0]
        if (!first) return
        const partIds = parts.map((p) => p.id).filter(Boolean).join(',')
        const res = await api.post(`/ielts/reading/mock/${item.id}/start/`)
        navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${first.id}&parts=${partIds}&title=${encodeURIComponent(item.title)}`)
      } else {
        const res = await api.post(`/ielts/reading/${item.id}/start/`)
        navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${item.id}&title=${encodeURIComponent(item.title)}`)
      }
    } finally {
      setStarting(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Premium modal */}
      {premiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Lock size={22} className="text-amber-500" />
            </div>
            <h2 className="text-xl font-black text-gray-900 text-center">Premium Test</h2>
            <p className="text-sm text-gray-500 text-center mt-2">
              This test is part of our Premium collection. Upgrade to unlock full access.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setPremiumModal(false)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => { setPremiumModal(false); navigate('/app/subscription') }}
                className="flex-1 h-10 rounded-xl bg-sky-500 text-white text-sm font-bold hover:bg-sky-600 transition"
              >
                Get Premium
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
          />
        </div>

        <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700">
          <option value="ALL">All Levels</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        <select value={type} onChange={(e) => setType(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700">
          <option value="ALL">All Types</option>
          <option value="MOCK">Mock</option>
          <option value="PRACTICE">Practice</option>
        </select>

        <select value={parts} onChange={(e) => setParts(e.target.value)} className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700">
          <option value="ALL">All Parts</option>
          <option value="1">1 part</option>
          <option value="2">2 parts</option>
          <option value="3">3 parts</option>
        </select>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100"
        >
          <div className="text-left">
            <h3 className="text-2xl font-black text-gray-900 leading-none">Choose a test</h3>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-gray-900">Cambridge Tests</span>
              <span className="ml-2">{isLoading ? '...' : `${items.length} tests`}</span>
            </p>
          </div>
          {expanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </button>

        {expanded && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {isLoading && [...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-xl border border-gray-100 bg-gray-50 animate-pulse" />)}

            {!isLoading && items.map((item) => {
              const isStarting = starting === `${item.itemType}-${item.id}`
              const isLocked = item.is_premium && !user?.is_premium
              const attemptsCount =
                item.attempts_count ??
                item.attempt_count ??
                item.total_attempts ??
                item.last_attempt?.count ??
                0
              const isCompleted = !isLocked && Boolean(
                item.attempted ||
                Number(attemptsCount) > 0 ||
                item.last_attempt ||
                item.is_completed ||
                item.status === 'completed' ||
                item.completed_at
              )
              return (
                <div
                  key={`${item.itemType}-${item.id}`}
                  className={`rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition ${
                    isLocked ? 'border-gray-100 bg-gray-50 opacity-70' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isLocked && <Lock size={14} className="text-amber-500 flex-shrink-0" />}
                      <h4 className={`font-bold ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{item.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        item.is_premium ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {item.is_premium ? 'Premium' : 'Free'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.count} part{item.count > 1 ? 's' : ''} - {item.difficulty || 'MEDIUM'} Level
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                      <DifficultyBadge difficulty={item.difficulty} />
                      <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock3 size={14} /> {item.duration || 60} minutes</span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap"><HelpCircle size={14} /> {item.questions || 40} questions</span>
                      {!isLocked && <span className="text-gray-400 whitespace-nowrap">{attemptsCount} attempts</span>}
                    </div>
                  </div>

                  <div className="flex flex-col gap-0 w-full sm:w-auto sm:items-end shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 -translate-y-1.5 mb-2 text-[11px] font-semibold text-emerald-700 leading-none">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" strokeWidth={2.25} />
                        Completed
                      </span>
                    )}
                    <button
                      onClick={() => handleStart(item)}
                      disabled={isStarting}
                      className={`w-full sm:w-auto px-5 h-10 rounded-lg text-sm font-bold transition disabled:opacity-60 ${
                        isLocked
                          ? 'bg-amber-400 hover:bg-amber-500 text-white'
                          : 'bg-sky-500 hover:bg-sky-600 text-white'
                      }`}
                    >
                      {isStarting
                        ? <Loader2 size={15} className="animate-spin mx-auto" />
                        : isLocked
                          ? <span className="flex items-center gap-1.5 justify-center"><Lock size={13} /> Premium</span>
                          : isCompleted ? 'Re-do test' : 'Start test'}
                    </button>
                  </div>
                </div>
              )
            })}

            {!isLoading && !items.length && (
              <div className="py-16 text-center text-gray-400">
                <BookOpen size={34} className="mx-auto mb-2 text-gray-300" />
                No tests found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

