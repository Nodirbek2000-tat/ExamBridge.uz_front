import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Search, Clock3, HelpCircle, Loader2, BookOpen, Headphones, ChevronUp, ChevronDown,
  CheckCircle2, Lock, RotateCcw, BadgeCheck,
} from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

// Reading and Listening lists share everything except these details.
const SKILLS = {
  reading: {
    queryKey: 'ielts-reading-list',
    endpoint: '/ielts/reading/',
    partField: 'passage_number',
    partCount: (m) => m.part_count || m.parts?.length || 1,
    partWord: 'part',
    partTotal: 3,
    emptyIcon: BookOpen,
    tone: 'sky',
    startMock: async (item, first, ids) => {
      const res = await api.post(`/ielts/reading/mock/${item.id}/start/`)
      return `/exam/ielts/reading/${res.data.attempt_id}?passage=${first.id}&parts=${ids}&title=${encodeURIComponent(item.title)}`
    },
    startPractice: async (item) => {
      const res = await api.post(`/ielts/reading/${item.id}/start/`)
      return `/exam/ielts/reading/${res.data.attempt_id}?passage=${item.id}&title=${encodeURIComponent(item.title)}`
    },
  },
  listening: {
    queryKey: 'ielts-listening-list',
    endpoint: '/ielts/listening/',
    partField: 'section_number',
    partCount: (m) => m.section_count || m.sections?.length || 1,
    partWord: 'section',
    partTotal: 4,
    emptyIcon: Headphones,
    tone: 'violet',
    startMock: async (item, first, ids) => {
      const res = await api.post(`/ielts/listening/mock/${item.id}/start/`)
      return `/exam/ielts/listening/${res.data.attempt_id}?section=${first.id}&parts=${ids}&title=${encodeURIComponent(item.title)}`
    },
    startPractice: async (item) => {
      const res = await api.post(`/ielts/listening/${item.id}/start/`)
      return `/exam/ielts/listening/${res.data.attempt_id}?section=${item.id}&title=${encodeURIComponent(item.title)}`
    },
  },
}

// Full class names so Tailwind keeps them.
const TONES = {
  sky: {
    chipOn: 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-500/25',
    countOn: 'bg-white/25 text-white',
    focus: 'focus-within:border-sky-400 focus-within:ring-sky-100',
  },
  violet: {
    chipOn: 'bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/25',
    countOn: 'bg-white/25 text-white',
    focus: 'focus-within:border-violet-400 focus-within:ring-violet-100',
  },
}

const SOURCES = [
  { key: 'REAL', label: 'Real-Exam', icon: BadgeCheck },
  { key: 'CAMBRIDGE', label: 'Cambridge', icon: BookOpen },
]

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

// 'FULL' for a multi-part mock, otherwise the part number ('1'..'4').
function kindOf(item, partField) {
  if (item.itemType === 'MOCK') {
    if (item.count > 1) return 'FULL'
    return String(item.parts?.[0]?.[partField] ?? 1)
  }
  return String(item[partField] ?? 1)
}

export default function IELTSSkillList({ skill, accentBtn = 'bg-sky-500 hover:bg-sky-600' }) {
  const cfg = SKILLS[skill]
  const tone = TONES[cfg.tone]
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState('ALL')
  const [source, setSource] = useState('REAL')
  const [kind, setKind] = useState('ALL')
  const [expanded, setExpanded] = useState(true)
  const [starting, setStarting] = useState(null)
  const [premiumModal, setPremiumModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: [cfg.queryKey],
    queryFn: () => api.get(cfg.endpoint).then((r) => r.data),
  })

  // Everything in the chosen source (Real-Exam / Cambridge), each tagged with its kind.
  const sourceItems = useMemo(() => {
    const mocks = (data?.mocks || []).map((m) => ({
      ...m,
      itemType: 'MOCK',
      count: cfg.partCount(m),
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
    const wantCambridge = source === 'CAMBRIDGE'
    return [...mocks, ...practices]
      .filter((item) => Boolean(item.is_cambridge) === wantCambridge)
      .map((item) => ({ ...item, kind: kindOf(item, cfg.partField) }))
  }, [data, source, cfg])

  const kindCounts = useMemo(() => {
    const counts = { ALL: sourceItems.length }
    sourceItems.forEach((item) => { counts[item.kind] = (counts[item.kind] || 0) + 1 })
    return counts
  }, [sourceItems])

  const kinds = [
    { key: 'ALL', label: 'All' },
    { key: 'FULL', label: 'Full Test' },
    ...Array.from({ length: cfg.partTotal }, (_, i) => ({ key: String(i + 1), label: `Part ${i + 1}` })),
  ]

  const items = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = sourceItems.filter((item) => {
      const matchSearch = !q || item.title?.toLowerCase().includes(q)
      const matchLevel = level === 'ALL' || (item.difficulty || 'MEDIUM') === level
      const matchKind = kind === 'ALL' || item.kind === kind
      return matchSearch && matchLevel && matchKind
    })
    // Free first, premium last
    return [...filtered.filter(i => !i.is_premium), ...filtered.filter(i => i.is_premium)]
  }, [sourceItems, search, level, kind])

  const handleStart = async (item) => {
    if (item.is_premium && !user?.is_premium) {
      setPremiumModal(true)
      return
    }
    const key = `${item.itemType}-${item.id}`
    setStarting(key)
    try {
      if (item.itemType === 'MOCK') {
        const parts = item.parts || item.sections || []
        const first = parts[0]
        if (!first) return
        const ids = parts.map((p) => p.id).filter(Boolean).join(',')
        navigate(await cfg.startMock(item, first, ids))
      } else {
        navigate(await cfg.startPractice(item))
      }
    } finally {
      setStarting(null)
    }
  }

  const EmptyIcon = cfg.emptyIcon
  const sourceLabel = source === 'CAMBRIDGE' ? 'Cambridge Tests' : 'Real-Exam Tests'

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

      {/* Source: Real-Exam (our mocks) or Cambridge material */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Test source">
        {SOURCES.map(({ key, label, icon }) => {
          const Icon = icon
          const active = source === key
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => { setSource(key); setKind('ALL') }}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-semibold transition ${
                active
                  ? 'bg-red-50 border-red-300 text-red-500'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} strokeWidth={2.25} />
              {label}
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white">
        <button
          onClick={() => setExpanded((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100"
        >
          <div className="text-left">
            <h3 className="text-2xl font-black text-gray-900 leading-none">Choose a test</h3>
            <p className="text-sm text-gray-500 mt-2">
              <span className="font-semibold text-gray-900">{sourceLabel}</span>
              <span className="ml-2">{isLoading ? '...' : `${items.length} tests`}</span>
            </p>
          </div>
          {expanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
        </button>

        {expanded && (
          <>
            {/* Filters: search, difficulty, Full Test / Part N */}
            <div className="px-4 pt-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <label className={`flex-1 min-w-0 flex items-center gap-2.5 h-11 px-3.5 rounded-xl border border-gray-200 bg-white ring-4 ring-transparent transition ${tone.focus}`}>
                  <Search size={17} className="text-gray-400 flex-shrink-0" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tests by title"
                    className="flex-1 min-w-0 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                  />
                </label>
                <div className="relative sm:w-44">
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    aria-label="Difficulty"
                    className="w-full h-11 pl-3.5 pr-9 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 appearance-none outline-none cursor-pointer hover:border-gray-300 focus:border-gray-400 transition"
                  >
                    <option value="ALL">Difficulty: All</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Test type">
                {kinds.map(({ key, label }) => {
                  const active = kind === key
                  const count = kindCounts[key] || 0
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setKind(key)}
                      className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap flex-shrink-0 transition ${
                        active
                          ? tone.chipOn
                          : `bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 ${count ? 'text-gray-700' : 'text-gray-400'}`
                      }`}
                    >
                      {label}
                      <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${
                        active ? tone.countOn : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isLoading ? '·' : count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

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
                const kindLabel = item.kind === 'FULL' ? 'Full Test' : `Part ${item.kind}`
                return (
                  <div
                    key={`${item.itemType}-${item.id}`}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {isLocked && <Lock size={14} className="text-amber-500 flex-shrink-0" />}
                        <h4 className={`font-bold truncate min-w-0 ${isLocked ? 'text-gray-500' : 'text-gray-900'}`} title={item.title}>{item.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          item.is_premium ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {item.is_premium ? 'Premium' : 'Free'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="font-semibold text-gray-700">{kindLabel}</span>
                        {item.kind === 'FULL' && ` · ${item.count} ${cfg.partWord}s`}
                        {` · ${item.difficulty || 'MEDIUM'} Level`}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                        <DifficultyBadge difficulty={item.difficulty} />
                        <span className="inline-flex items-center gap-1 whitespace-nowrap"><Clock3 size={14} /> {item.duration || 60} minutes</span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap"><HelpCircle size={14} /> {item.questions || 40} questions</span>
                        {!isLocked && (
                          <span className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold ${
                            attemptsCount > 0 ? 'text-gray-700' : 'text-gray-300'
                          }`}>
                            <RotateCcw size={12} />
                            {attemptsCount} attempt{attemptsCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-0 w-full sm:w-auto sm:items-end shrink-0">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 -translate-y-1.5 mb-2 text-[11px] font-semibold text-emerald-700 leading-none">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" strokeWidth={2.25} />
                          Completed
                        </span>
                      )}
                      {isLocked ? (
                        <button
                          type="button"
                          onClick={() => navigate('/app/subscription')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-semibold whitespace-nowrap transition-colors hover:bg-sky-100 hover:border-sky-300"
                        >
                          <Lock size={10} /> Premium
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStart(item)}
                          disabled={isStarting}
                          className={`w-full sm:w-auto px-5 h-10 rounded-lg text-sm font-bold transition disabled:opacity-60 text-white btn-glass ${accentBtn}`}
                        >
                          {isStarting
                            ? <Loader2 size={15} className="animate-spin mx-auto" />
                            : isCompleted ? 'Re-do test' : 'Start test'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}

              {!isLoading && !items.length && (
                <div className="md:col-span-2 py-16 text-center text-gray-400">
                  <EmptyIcon size={34} className="mx-auto mb-2 text-gray-300" />
                  {source === 'CAMBRIDGE' && !sourceItems.length ? 'No Cambridge tests yet' : 'No tests found'}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
