import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  History, BookOpen, Headphones, Mic, PenLine,
  Clock3, RotateCcw, Eye, ChevronLeft, ChevronRight,
  Loader2, CheckCircle2,
} from 'lucide-react'
import api from '../../api/client'

const PAGE_SIZE = 10

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'listening', label: 'Listening' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'writing', label: 'Writing' },
]

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTime(secs) {
  if (!secs || secs <= 0) return null
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

function bandColor(b) {
  const n = parseFloat(b)
  if (n >= 7) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
  if (n >= 5) return 'text-sky-600 bg-sky-50 border-sky-200'
  return 'text-sky-500 bg-sky-50 border-sky-200'
}

function BandBadge({ band }) {
  if (band == null) return null
  const n = parseFloat(band)
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black border ${bandColor(band)}`}>
      Band {isNaN(n) ? band : n.toFixed(1)}
    </span>
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
            p === page
              ? 'bg-sky-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
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

function MockCard({ item, onRetake, onReview, retakeLoading }) {
  const timeStr = formatTime(item.time_spent)
  const hasReading = item.reading_total > 0
  const hasListening = item.listening_total > 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-gray-800 text-sm leading-tight truncate max-w-xs">
              {item.title}
            </p>
            <span className="text-xs px-1.5 py-0.5 rounded bg-violet-100 text-violet-600 font-semibold flex-shrink-0">
              Mock Test
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock3 size={11} /> {formatDate(item.finished_at)}
            </span>
            {timeStr && <span className="text-xs text-gray-400">{timeStr}</span>}
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            {hasReading && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <BookOpen size={12} className="text-sky-400" />
                <span className="font-medium">Reading:</span>
                <CheckCircle2 size={11} className="text-emerald-400" />
                {item.reading_correct}/{item.reading_total}
                {item.reading_band != null && (
                  <span className="ml-1 font-black text-sky-600">Band {Number(item.reading_band).toFixed(1)}</span>
                )}
              </div>
            )}
            {hasListening && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Headphones size={12} className="text-sky-400" />
                <span className="font-medium">Listening:</span>
                <CheckCircle2 size={11} className="text-emerald-400" />
                {item.listening_correct}/{item.listening_total}
                {item.listening_band != null && (
                  <span className="ml-1 font-black text-sky-600">Band {Number(item.listening_band).toFixed(1)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 ml-3">
          {item.overall_band != null && <BandBadge band={item.overall_band} />}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onReview(item)}
          className="flex-1 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-sky-100 transition"
        >
          <Eye size={13} /> Review Answers
        </button>
        <button
          onClick={() => onRetake(item)}
          disabled={retakeLoading}
          className="flex-1 h-9 rounded-xl bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-sky-600 disabled:opacity-60 transition"
        >
          {retakeLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          Retake Mock
        </button>
      </div>
    </div>
  )
}

function ReadingListeningCard({ item, onReview, onRetake, retakeLoading }) {
  const isReading = item.type === 'reading'
  const TypeIcon = isReading ? BookOpen : Headphones
  const timeStr = formatTime(item.time_spent)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeIcon size={13} className="text-sky-400 flex-shrink-0" />
            <p className="font-bold text-gray-800 text-sm leading-tight truncate max-w-xs">
              {item.title || `Attempt #${item.id}`}
            </p>
            {item.section_number != null && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-sky-100 text-sky-600 font-semibold flex-shrink-0">
                Part {item.section_number}
              </span>
            )}
          </div>

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
            {timeStr && <span className="text-xs text-gray-400">{timeStr}</span>}
          </div>
        </div>

        <div className="flex-shrink-0 ml-3">
          {item.band != null && <BandBadge band={item.band} />}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onReview(item)}
          className="flex-1 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-sky-100 transition"
        >
          <Eye size={13} /> Review Answers
        </button>
        <button
          onClick={() => onRetake(item)}
          disabled={retakeLoading}
          className="flex-1 h-9 rounded-xl bg-sky-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-sky-600 disabled:opacity-60 transition"
        >
          {retakeLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
          Retake
        </button>
      </div>
    </div>
  )
}

function SpeakingWritingCard({ item, onReview }) {
  const isSpeaking = item.type === 'speaking'
  const Icon = isSpeaking ? Mic : PenLine
  const iconBg = isSpeaking ? 'bg-rose-100' : 'bg-amber-100'
  const iconColor = isSpeaking ? 'text-rose-500' : 'text-amber-500'
  const taskLabel = isSpeaking ? `Part ${item.task_part}` : `Task ${item.task_type}`

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon size={14} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm leading-snug truncate">
            {item.task_title || item.title || `#${item.id}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${isSpeaking ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              {taskLabel}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock3 size={10} /> {formatDate(item.created_at || item.date)}
            </span>
          </div>
        </div>
        {item.ai_band && <BandBadge band={item.ai_band} />}
      </div>

      <button
        onClick={() => onReview(item)}
        className={`w-full h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border ${
          isSpeaking
            ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
        }`}
      >
        <Eye size={13} /> Review Result
      </button>
    </div>
  )
}

export default function IELTSHistory() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const [retakeLoading, setRetakeLoading] = useState(null)

  const { data: rlData = [], isLoading: rlLoading } = useQuery({
    queryKey: ['ielts-history-all'],
    queryFn: () => api.get('/ielts/history/', { params: { type: 'all' } }).then(r => r.data),
    staleTime: 30_000,
  })

  const { data: spData = [], isLoading: spLoading } = useQuery({
    queryKey: ['ielts-speaking-history'],
    queryFn: () => api.get('/ielts/speaking/history/').then(r => r.data),
    staleTime: 30_000,
  })

  const { data: wrData = [], isLoading: wrLoading } = useQuery({
    queryKey: ['ielts-writing-history'],
    queryFn: () => api.get('/ielts/writing/history/').then(r => r.data),
    staleTime: 30_000,
  })

  const isLoading = rlLoading || spLoading || wrLoading

  const allItems = useMemo(() => {
    const rl = (Array.isArray(rlData) ? rlData : (rlData?.results || []))
      .map(item => ({ ...item, _date: item.finished_at }))
    const sp = (Array.isArray(spData) ? spData : [])
      .map(item => ({ ...item, type: 'speaking', _date: item.created_at }))
    const wr = (Array.isArray(wrData) ? wrData : [])
      .map(item => ({ ...item, type: 'writing', _date: item.created_at }))

    return [...rl, ...sp, ...wr].sort((a, b) => new Date(b._date) - new Date(a._date))
  }, [rlData, spData, wrData])

  const filtered = useMemo(() => {
    if (tab === 'all') return allItems
    if (tab === 'reading') return allItems.filter(i => i.type === 'reading' || i.type === 'mock')
    if (tab === 'listening') return allItems.filter(i => i.type === 'listening' || i.type === 'mock')
    return allItems.filter(i => i.type === tab)
  }, [allItems, tab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleTabChange = (t) => { setTab(t); setPage(1) }

  // Direct navigation — no API prefetch; attempt pages load their own data
  const handleMockReview = (item) => {
    const title = encodeURIComponent(item.title || 'Mock Test')
    if (item.listening_total > 0 && !item.reading_total) {
      // Listening-only mock → use mode=review so the page fetches all sections
      navigate(`/exam/ielts/listening/${item.id}?mode=review&title=${title}`)
    } else {
      // Reading mock → mode=review: sahifa review API dan BARCHA passage'larni oladi
      // (mock'da passage_id yo'q, shuning uchun passage= bilan ochib bo'lmaydi)
      navigate(`/exam/ielts/reading/${item.id}?mode=review&title=${title}`)
    }
  }

  const handleReadingReview = (item) => {
    // mode=review → javoblar va to'g'ri/noto'g'ri belgilar ham yuklanadi
    navigate(
      `/exam/ielts/reading/${item.id}?mode=review&passage=${item.passage_id || 0}&title=${encodeURIComponent(item.title || 'Reading')}`
    )
  }

  const handleListeningReview = (item) => {
    // mode=review → listening attempt page fetches sections from review API
    navigate(
      `/exam/ielts/listening/${item.id}?mode=review&title=${encodeURIComponent(item.title || 'Listening')}`
    )
  }

  const handleRetake = async (item) => {
    setRetakeLoading(item.id)
    try {
      if (item.type === 'mock') {
        const hasReading = item.reading_total > 0
        if (hasReading) {
          const res = await api.post(`/ielts/reading/mock/${item.test_id}/start/`)
          navigate(`/exam/ielts/reading/${res.data.attempt_id}?title=${encodeURIComponent(item.title || 'Mock Test')}`)
        } else {
          const res = await api.post(`/ielts/listening/mock/${item.test_id}/start/`)
          navigate(`/exam/ielts/listening/${res.data.attempt_id}?title=${encodeURIComponent(item.title || 'Mock Test')}`)
        }
      } else if (item.type === 'reading') {
        const res = await api.post(`/ielts/reading/${item.passage_id}/start/`)
        navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${item.passage_id}&title=${encodeURIComponent(item.title || 'Reading')}`)
      } else {
        const res = await api.post(`/ielts/listening/${item.section_id}/start/`)
        navigate(`/exam/ielts/listening/${res.data.attempt_id}?section=${item.section_id}&title=${encodeURIComponent(item.title || 'Listening')}`)
      }
    } finally {
      setRetakeLoading(null)
    }
  }

  const renderCard = (item) => {
    const key = `${item.type}-${item.id}`
    if (item.type === 'mock') {
      return (
        <MockCard
          key={key}
          item={item}
          onReview={handleMockReview}
          onRetake={handleRetake}
          retakeLoading={retakeLoading === item.id}
        />
      )
    }
    if (item.type === 'speaking' || item.type === 'writing') {
      return (
        <SpeakingWritingCard
          key={key}
          item={item}
          onReview={item.type === 'speaking'
            ? () => navigate(`/exam/ielts/speaking/result/${item.id}`)
            : () => navigate(`/exam/ielts/writing/result/${item.id}`)
          }
        />
      )
    }
    return (
      <ReadingListeningCard
        key={key}
        item={item}
        onReview={item.type === 'reading' ? handleReadingReview : handleListeningReview}
        onRetake={handleRetake}
        retakeLoading={retakeLoading === item.id}
      />
    )
  }

  return (
    <div className="max-w-3xl mx-auto w-full space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-400 flex items-center justify-center">
          <History size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black">IELTS History</h1>
          <p className="text-gray-500 text-sm">Reading, Listening, Speaking & Writing attempts</p>
        </div>
      </div>

      {/* Tabs */}
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
            <div className="space-y-3">
              {pageItems.map(renderCard)}
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
