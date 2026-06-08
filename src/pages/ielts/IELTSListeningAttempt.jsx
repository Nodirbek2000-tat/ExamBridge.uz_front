import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Send, CheckCircle2, Bookmark,
  RotateCcw, Headphones, Pause, Play, Volume2, VolumeX,
  Maximize2, Minimize2, Sun, Moon, AlertTriangle, Menu, ChevronDown,
  SkipBack, SkipForward, Bell, SquarePen, Lock, ArrowDown,
} from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />
}

function useTimer(initialSeconds, storageKey, frozen = false) {
  const intervalRef = useRef()
  const readPersisted = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return null
      const data = JSON.parse(raw)
      const remaining = Number(data?.remaining)
      const paused = Boolean(data?.paused)
      const ts = Number(data?.ts || Date.now())
      if (!Number.isFinite(remaining)) return null
      const elapsed = Math.max(0, Math.floor((Date.now() - ts) / 1000))
      const restored = paused ? remaining : Math.max(0, remaining - elapsed)
      return { seconds: restored, paused }
    } catch {
      return null
    }
  }, [storageKey])

  const [seconds, setSeconds] = useState(() => readPersisted()?.seconds ?? initialSeconds)
  const [paused, setPaused] = useState(() => readPersisted()?.paused ?? false)

  useEffect(() => {
    const persisted = readPersisted()
    setSeconds(persisted?.seconds ?? initialSeconds)
    setPaused(persisted?.paused ?? false)
  }, [readPersisted, initialSeconds, storageKey])

  useEffect(() => {
    if (frozen || paused || seconds <= 0) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(intervalRef.current)
  }, [frozen, paused, seconds])

  useEffect(() => {
    if (frozen || !storageKey || typeof window === 'undefined') return
    localStorage.setItem(storageKey, JSON.stringify({ remaining: seconds, paused, ts: Date.now() }))
  }, [seconds, paused, storageKey, frozen])

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const clearPersist = () => {
    if (!storageKey || typeof window === 'undefined') return
    localStorage.removeItem(storageKey)
  }

  return {
    seconds,
    fmt: fmt(seconds),
    paused,
    start: () => setPaused(false),
    pause: () => setPaused(true),
    stop: () => {
      clearInterval(intervalRef.current)
      setPaused(true)
    },
    clearPersist,
    urgent: seconds < 120 && seconds > 0,
  }
}

/** Test rejimida: yashirin audio, foydalanuvchi to'xtata olmaydi */
function HiddenExamAudio({ src, active, onEnded }) {
  const ref = useRef(null)
  const onEndedRef = useRef(onEnded)
  useEffect(() => { onEndedRef.current = onEnded })

  // Load and play when src or active changes
  useEffect(() => {
    const el = ref.current
    if (!el || !active || !src) return
    el.load()
    el.play().catch(() => {})
  }, [active, src])

  // Force-resume if paused (user cannot pause exam audio)
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const onPause = () => {
      if (el.ended) return
      el.play().catch(() => {})
    }
    el.addEventListener('pause', onPause)
    return () => el.removeEventListener('pause', onPause)
  }, [active, src])

  // Fire onEnded via ref so it always has latest closure
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onEnd = () => onEndedRef.current?.()
    el.addEventListener('ended', onEnd)
    return () => el.removeEventListener('ended', onEnd)
  }, [])

  if (!src) return null
  return <audio ref={ref} src={src} preload="auto" className="sr-only" playsInline />
}

function ReviewAudioPlayer({ audioUrl, dark }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const pct = duration ? (currentTime / duration) * 100 : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDur = () => setDuration(audio.duration)
    const onEnded = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDur)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDur)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play()
      setPlaying(true)
    }
  }

  const seek = (e) => {
    const bar = e.currentTarget
    const rect = bar.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    if (audioRef.current) audioRef.current.currentTime = ratio * duration
  }

  const skip = (sec) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + sec))
  }

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !muted
    setMuted((p) => !p)
  }

  const D = dark
  const surface = D ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'

  if (!audioUrl) {
    return (
      <div className={`rounded-xl border px-4 py-3 text-center text-sm ${surface} ${D ? 'text-gray-400' : 'text-gray-500'}`}>
        Audio fayl mavjud emas
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border p-4 ${surface}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className={`h-2 rounded-full cursor-pointer mb-3 ${D ? 'bg-gray-600' : 'bg-gray-200'}`} onClick={seek}>
        <div className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-between">
        <button
          type="button"
          onClick={() => skip(-10)}
          className={`p-2 rounded-lg transition ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <SkipBack size={18} />
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-sky-600 hover:bg-sky-700 flex items-center justify-center text-white shadow-lg"
        >
          {playing ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          className={`p-2 rounded-lg transition ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <SkipForward size={18} />
        </button>
        <span className={`text-sm font-mono ${D ? 'text-gray-300' : 'text-gray-600'}`}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        <button
          type="button"
          onClick={toggleMute}
          className={`p-2 rounded-lg ${D ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(+e.target.value)
            if (audioRef.current) audioRef.current.volume = +e.target.value
            setMuted(+e.target.value === 0)
          }}
          className="w-24 accent-sky-600"
        />
      </div>
    </div>
  )
}

// Clean choice text ? strip null chars (\u0000) that sometimes appear in imported data
const cleanText = (t) => (t || '').replace(/\u0000/g, '').replace(/\\000a/g, '\n').trim()

function MCQInput({ value, onChange, choices, dark, readOnly }) {
  const D = dark
  return (
    <div className="space-y-0.5 mt-2">
      {choices.map((c) => (
        <button
          key={c.option}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(c.option)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
            value === c.option
              ? D ? 'text-sky-300' : 'text-sky-700'
              : D ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
          } ${readOnly ? 'pointer-events-none' : ''}`}
        >
          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
            value === c.option ? 'border-sky-500 bg-sky-500' : D ? 'border-gray-500' : 'border-gray-300'
          }`}>
            {value === c.option && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
          </span>
          <span className={`font-semibold flex-shrink-0 w-5 ${value === c.option ? 'text-sky-500' : D ? 'text-gray-400' : 'text-gray-400'}`}>{c.option}.</span>
          <span>{cleanText(c.text)}</span>
        </button>
      ))}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, dark, readOnly, compact = false }) {
  const D = dark
  return (
    <input value={value} readOnly={readOnly} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Type your answer...'}
      className={`mt-2 ${compact ? 'w-40 max-w-full text-center text-base font-semibold px-2.5 py-1 rounded-md' : 'w-full px-4 py-3 rounded-xl text-sm'} focus:outline-none transition ${
        value
          ? D ? 'bg-sky-900/20 text-sky-200 border border-sky-600/50 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
               : 'bg-sky-50 text-sky-900 border border-sky-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
          : D ? 'bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
               : compact
                 ? 'bg-white border border-gray-400 text-gray-800 placeholder-gray-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-100'
                 : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
      } ${readOnly ? 'cursor-default' : ''}`} />
  )
}

function MultiSelectInput({ value, onChange, choices, maxSelections, dark, readOnly }) {
  const selected = value ? value.split('|').filter(Boolean) : []
  const toggle = (opt) => {
    if (readOnly) return
    let next
    if (selected.includes(opt)) {
      next = selected.filter((s) => s !== opt)
    } else {
      if (maxSelections && selected.length >= maxSelections) return
      next = [...selected, opt]
    }
    onChange(next.join('|'))
  }
  return (
    <div className="space-y-1.5 mt-2">
      {maxSelections > 1 && (
        <p className={`text-sm mb-2 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>
          Choose {maxSelections} answers ({selected.length}/{maxSelections} selected)
        </p>
      )}
      {choices.map((c) => {
        const checked = selected.includes(c.option)
        return (
          <button
            key={c.option}
            type="button"
            onClick={() => toggle(c.option)}
            disabled={readOnly}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
              checked
                ? dark ? 'text-sky-300' : 'text-sky-700'
                : dark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
            } ${readOnly ? 'pointer-events-none' : ''}`}
          >
            <span className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition ${
              checked ? 'bg-sky-500 border-sky-500' : dark ? 'border-gray-500' : 'border-gray-300'
            }`}>
              {checked && <CheckCircle2 size={11} className="text-white" />}
            </span>
            <span className={`font-semibold flex-shrink-0 w-5 ${checked ? 'text-sky-500' : 'text-gray-400'}`}>{c.option}.</span>
            <span>{cleanText(c.text)}</span>
          </button>
        )
      })}
    </div>
  )
}

function SubmitConfirm({ answered, total, onConfirm, onCancel, dark }) {
  const surface = dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`${surface} rounded-2xl shadow-2xl p-6 w-full max-w-sm`}
      >
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-sky-500" />
        </div>
        <h3 className="font-bold text-center text-lg mb-1">Submit test?</h3>
        <p className={`text-sm text-center mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          {answered} of {total} answered
          {total - answered > 0 && <span className="text-red-500"> ({total - answered} unanswered)</span>}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition ${
              dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition"
          >
            Submit
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function StartAudioScreen({ section, sectionTitle, onStart, dark, totalQuestions, isFull, isUnifiedAudio }) {
  const D = dark
  const bg = D ? 'bg-gray-950' : 'bg-white'
  const surface = D ? 'bg-gray-800 border-gray-700' : 'bg-white border-sky-100'
  const textMain = D ? 'text-gray-100' : 'text-gray-800'
  const textSub = D ? 'text-gray-400' : 'text-gray-500'
  const questionCount = isFull ? (totalQuestions || (section?.questions?.length * 4) || 40) : (section?.questions?.length ?? '?')
  const minuteCount = isFull ? 40 : (section?.time_limit ?? 40)

  return (
    <div className={`flex flex-col items-center justify-center min-h-full ${bg} ${textMain} p-6`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`w-full max-w-lg rounded-3xl border shadow-xl p-8 text-center ${surface}`}
      >
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-5 shadow-glow">
          <Headphones size={36} className="text-white" />
        </div>
        <h1 className="text-2xl font-black mb-1">{sectionTitle}</h1>
        <p className={`text-sm mb-6 ${textSub}`}>
          IELTS Listening{isFull ? ` ? Full Mock${isUnifiedAudio ? ' ? Unified Audio' : ' ? 4 parts'}` : ''}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-7">
          <div className={`rounded-2xl p-3 ${D ? 'bg-gray-700' : 'bg-sky-50/80'}`}>
            <p className="text-lg font-black">{questionCount}</p>
            <p className={`text-xs ${textSub}`}>Questions</p>
          </div>
          <div className={`rounded-2xl p-3 ${D ? 'bg-gray-700' : 'bg-sky-50/80'}`}>
            <p className="text-lg font-black">{minuteCount}</p>
            <p className={`text-xs ${textSub}`}>Minutes</p>
          </div>
        </div>
        <div className={`text-left rounded-2xl p-4 mb-7 space-y-2 ${D ? 'bg-gray-700/60' : 'bg-sky-50/60'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide ${D ? 'text-sky-300' : 'text-sky-600'}`}>Eslatma</p>
          {[
            "\"Start test\" bosilganda audio yashirin rejimda ijro etiladi",
            isUnifiedAudio
              ? "Bu full mock test: audio toxtovsiz davom etadi, siz partlar ortasida otishingiz mumkin"
              : isFull
                ? "Har bir part uchun alohida audio mavjud ? part ozgarganda yangi audio boshlanadi"
                : "Imtihon davomida audio pleyer korinmaydi va toxtatib bolmaydi",
            "Review rejimida transcript va boshqaruvli audio ochiladi",
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
                  D ? 'bg-sky-900 text-sky-200' : 'bg-sky-100 text-sky-700'
                }`}
              >
                {i + 1}
              </span>
              <p className={`text-xs leading-relaxed ${textSub}`}>{t}</p>
            </div>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onStart}
          className="w-full py-4 gradient-primary text-white rounded-2xl text-base font-black flex items-center justify-center gap-3 shadow-glow hover:opacity-95 transition"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Play size={16} className="fill-white ml-0.5" />
          </div>
          Start test
        </motion.button>
      </motion.div>
    </div>
  )
}

export default function IELTSListeningAttempt() {
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const initialSectionId = searchParams.get('section')
  const sectionTitle = decodeURIComponent(searchParams.get('title') || 'Listening Section')

  // Must come BEFORE partIds so partIds useMemo can depend on them
  const isReviewMode = searchParams.get('mode') === 'review'

  // Fetch review data from API when ?mode=review (URL-persistent, survives refresh)
  const { data: fetchedReviewData } = useQuery({
    queryKey: ['ielts-listening-review', attemptId],
    queryFn: () => api.get(`/ielts/attempt/${attemptId}/listening-review/`).then(r => r.data),
    enabled: isReviewMode && Boolean(attemptId),
    staleTime: Infinity,
  })

  const reviewData = fetchedReviewData || location.state?.reviewData || null
  const reviewMode = Boolean(reviewData) || isReviewMode
  const [showCorrectInReview, setShowCorrectInReview] = useState(true)

  const partIds = useMemo(() => {
    // In review mode: derive section IDs from review API response (all parts at once)
    if (isReviewMode && fetchedReviewData?.sections?.length) {
      return fetchedReviewData.sections.map(s => s.id)
    }
    const ids = (searchParams.get('parts') || '')
      .split(',').map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0)
    if (initialSectionId && !ids.includes(Number(initialSectionId))) ids.unshift(Number(initialSectionId))
    return ids.length ? ids : (initialSectionId ? [Number(initialSectionId)] : [])
  }, [searchParams, initialSectionId, isReviewMode, fetchedReviewData])

  const isFull = partIds.length > 1
  const [activePartIndex, setActivePartIndex] = useState(0)
  const currentSectionId = String(partIds[activePartIndex] || initialSectionId || '')
  const sectionId = currentSectionId

  const [answersByPart, setAnswersByPart] = useState({})
  const answers = answersByPart[currentSectionId] || {}
  const [activeQ, setActiveQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  const [audioStarted, setAudioStarted] = useState(false)
  const [audioPartIndex, setAudioPartIndex] = useState(0)  // which part's audio is currently playing
  const [darkMode, setDarkMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState('normal')

  const [splitRatio, setSplitRatio] = useState(48)
  const dragging = useRef(false)
  const containerRef = useRef(null)
  const isMobileViewRef = useRef(false)
  const questionRefs = useRef({})
  const allowLeaveRef = useRef(false)
  const handleSubmitRef = useRef(null)  // ref to avoid circular dep in handleAudioEnded

  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkLoading, setBookmarkLoading] = useState(new Set())

  // Load ALL parts simultaneously
  const sectionQueries = useQueries({
    queries: partIds.map(pid => ({
      queryKey: ['ielts-listening-section', String(pid)],
      queryFn: () => api.get(`/ielts/listening/${pid}/`).then(r => r.data),
      enabled: !!pid,
      staleTime: 120_000,
    })),
  })

  // In review mode: use sections directly from the review API (includes all parts + answers)
  // In exam mode: use live section queries
  const allSectionsData = useMemo(() => {
    if (reviewMode && reviewData?.sections?.length) {
      return reviewData.sections
    }
    return sectionQueries.map(q => q.data).filter(Boolean)
  }, [reviewMode, reviewData, sectionQueries])

  const isLoading = reviewMode
    ? (isReviewMode && !fetchedReviewData)   // review mode: wait only for review API
    : sectionQueries.some(q => q.isLoading)  // exam mode: wait for section queries

  const section = allSectionsData[activePartIndex] || null
  const questions = section?.questions || []

  // All questions flat (for bottom nav: show 1?40 at once)
  const allQuestionsFlat = useMemo(() => {
    return allSectionsData.flatMap((s, pi) =>
      (s?.questions || []).map(q => ({ ...q, _partIndex: pi, _sectionId: String(partIds[pi]) }))
    )
  }, [allSectionsData, partIds])

  const reviewMap = useMemo(() => {
    const m = {}
    if (!reviewData?.results) return m
    for (const r of reviewData.results) {
      if (r.question_id != null) m[String(r.question_id)] = r
      if (r.number != null) m[`n-${r.number}`] = r
    }
    return m
  }, [reviewData])

  // Populate answers for ALL parts from reviewData
  useEffect(() => {
    if (!reviewData?.results) return
    // If sections not loaded yet, dump everything into current section as fallback
    if (!allSectionsData.some(Boolean)) {
      const next = {}
      for (const r of reviewData.results) {
        if (r.question_id != null) next[String(r.question_id)] = r.user_answer ?? ''
      }
      setAnswersByPart(prev => ({ ...prev, [currentSectionId]: next }))
      return
    }
    // Distribute each answer into its correct part
    const byPart = {}
    const used = new Set()
    for (let pi = 0; pi < partIds.length; pi++) {
      const sec = allSectionsData[pi]
      if (!sec?.questions) continue
      const pid = String(partIds[pi])
      const qSet = new Set(sec.questions.map(q => String(q.id)))
      byPart[pid] = {}
      for (const r of reviewData.results) {
        if (r.question_id != null && qSet.has(String(r.question_id)) && !used.has(r.question_id)) {
          byPart[pid][String(r.question_id)] = r.user_answer ?? ''
          used.add(r.question_id)
        }
      }
    }
    if (Object.keys(byPart).length > 0) {
      setAnswersByPart(prev => ({ ...prev, ...byPart }))
    }
  }, [reviewData, allSectionsData])

  useEffect(() => {
    const update = () => {
      isMobileViewRef.current = typeof window !== 'undefined' && window.innerWidth < 768
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    if (section?.questions) {
      const ids = section.questions.filter((q) => q.is_bookmarked).map((q) => q.id)
      setBookmarkedIds(new Set(ids))
    }
  }, [section])

  useEffect(() => {
    window.history.pushState({ listeningAttemptGuard: true }, '', window.location.href)
    const onPopState = () => {
      if (allowLeaveRef.current || reviewMode) return
      setShowExitConfirm(true)
      window.history.pushState({ listeningAttemptGuard: true }, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [reviewMode])

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = isMobileViewRef.current
      ? ((e.clientY - rect.top) / rect.height) * 100
      : ((e.clientX - rect.left) / rect.width) * 100
    setSplitRatio(Math.max(28, Math.min(72, ratio)))
  }, [])
  const handleMouseUp = useCallback(() => {
    dragging.current = false
  }, [])

  useEffect(() => {
    window.addEventListener('pointermove', handleMouseMove)
    window.addEventListener('pointerup', handleMouseUp)
    return () => {
      window.removeEventListener('pointermove', handleMouseMove)
      window.removeEventListener('pointerup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const toggleBookmark = async (qId, e) => {
    e.stopPropagation()
    if (bookmarkLoading.has(qId)) return
    setBookmarkLoading((prev) => new Set([...prev, qId]))
    try {
      const res = await api.post('/ielts/bookmarks/toggle/', {
        source_type: 'IELTS_LISTENING',
        question_id: qId,
      })
      setBookmarkedIds((prev) => {
        const next = new Set(prev)
        if (res.data.bookmarked) next.add(qId)
        else next.delete(qId)
        return next
      })
    } catch {
      // silent
    } finally {
      setBookmarkLoading((prev) => {
        const next = new Set(prev)
        next.delete(qId)
        return next
      })
    }
  }

  const setAnswer = (qId, val) => {
    if (reviewMode) return
    setAnswersByPart(prev => ({
      ...prev,
      [currentSectionId]: { ...(prev[currentSectionId] || {}), [String(qId)]: val },
    }))
  }
  const answeredCount = Object.values(answers).filter(Boolean).length
  const totalAnsweredAll = useMemo(
    () => partIds.reduce((sum, pid) => sum + Object.values(answersByPart[String(pid)] || {}).filter(Boolean).length, 0),
    [partIds, answersByPart]
  )
  const isAnswered = (qId) => Boolean(answers[String(qId)])

  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return
    setActiveQ(index)
    const q = questions[index]
    const el = questionRefs.current[q.id] || document.getElementById(`lq-${q.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const calcListeningBand = (c) => {
    if (c >= 39) return 9.0; if (c >= 37) return 8.5; if (c >= 35) return 8.0
    if (c >= 32) return 7.5; if (c >= 30) return 7.0; if (c >= 26) return 6.5
    if (c >= 23) return 6.0; if (c >= 18) return 5.5; if (c >= 16) return 5.0
    if (c >= 13) return 4.5; if (c >= 10) return 4.0; if (c >= 6) return 3.5
    if (c >= 3) return 3.0; return 2.5
  }

  const handleSubmit = async () => {
    if (reviewMode || submitting) return
    setShowConfirm(false)
    setShowExitConfirm(false)
    setSubmitting(true)
    try {
      if (!isFull) {
        const res = await api.post(`/ielts/listening/${currentSectionId}/submit/`, {
          attempt_id: parseInt(attemptId, 10),
          answers,
        })
        allowLeaveRef.current = true
        navigate(
          `/exam/ielts/listening/${attemptId}/result?section=${currentSectionId}&title=${encodeURIComponent(sectionTitle)}`,
          { state: { result: { ...res.data, is_full: false } }, replace: true }
        )
      } else {
        let totalCorrect = 0, totalQuestions = 0
        let allResults = []
        for (const pid of partIds) {
          const partAnswers = answersByPart[String(pid)] || {}
          const res = await api.post(`/ielts/listening/${pid}/submit/`, {
            attempt_id: parseInt(attemptId, 10),
            answers: partAnswers,
          })
          totalCorrect += res.data.correct ?? 0
          totalQuestions += res.data.total ?? 0
          allResults = allResults.concat(res.data.results ?? [])
        }
        const band = calcListeningBand(totalCorrect)
        const scorePercent = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0
        allowLeaveRef.current = true
        navigate(
          `/exam/ielts/listening/${attemptId}/result?section=${partIds[0]}&title=${encodeURIComponent(sectionTitle)}`,
          {
            state: {
              result: {
                correct: totalCorrect, total: totalQuestions,
                score_percent: scorePercent, band, results: allResults, is_full: true,
              }
            },
            replace: true,
          }
        )
      }
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message))
    } finally {
      setSubmitting(false)
    }
  }

  const handleBackToList = () => {
    allowLeaveRef.current = true
    navigate('/app/ielts/listening')
  }

  // Keep ref in sync so handleAudioEnded can call latest handleSubmit
  useEffect(() => { handleSubmitRef.current = handleSubmit })

  // Unified audio: one audio track for the whole mock test
  const testAudioUrl = allSectionsData[0]?.test_audio_url || section?.test_audio_url || null
  const isUnifiedAudio = isFull && Boolean(testAudioUrl)

  // Audio source is driven by audioPartIndex (independent of view)
  const activeAudioSrc = useMemo(() => {
    if (reviewMode || !audioStarted) return null
    if (isUnifiedAudio) return testAudioUrl
    return allSectionsData[audioPartIndex]?.audio_url || null
  }, [reviewMode, audioStarted, isUnifiedAudio, testAudioUrl, allSectionsData, audioPartIndex])

  // Called when audio for the current part ends
  const handleAudioEnded = useCallback(() => {
    if (isUnifiedAudio) {
      handleSubmitRef.current?.()
      return
    }
    // Find next part that has audio
    let nextIdx = audioPartIndex + 1
    while (nextIdx < partIds.length && !allSectionsData[nextIdx]?.audio_url) {
      nextIdx++
    }
    if (nextIdx < partIds.length && allSectionsData[nextIdx]?.audio_url) {
      // Advance view + audio to next part
      setAudioPartIndex(nextIdx)
      setActivePartIndex(nextIdx)
      setActiveQ(0)
    } else {
      // No more parts with audio → submit everything
      handleSubmitRef.current?.()
    }
  }, [isUnifiedAudio, audioPartIndex, partIds.length, allSectionsData])

  const handleSwitchPart = (idx) => {
    setActivePartIndex(idx)
    setActiveQ(0)
    // Audio is NOT affected ? it continues playing its current part independently
  }

  const handleRedoFromReview = async () => {
    if (!currentSectionId) return
    try {
      const res = await api.post(`/ielts/listening/${currentSectionId}/start/`)
      navigate(`/exam/ielts/listening/${res.data.attempt_id}?section=${currentSectionId}&title=${encodeURIComponent(sectionTitle)}`)
    } catch {
      // silent
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const D = darkMode
  const bg = D ? 'bg-gray-950' : 'bg-white'
  const topbar = D ? 'bg-gray-900 border-gray-700' : 'bg-white border-sky-100'
  const surface = D ? 'bg-gray-800' : 'bg-white'
  const divider = D ? 'border-gray-700' : 'border-sky-100'
  const textMain = D ? 'text-gray-100' : 'text-gray-800'
  const textSub = D ? 'text-gray-400' : 'text-gray-500'
  const qCard = () => D ? 'bg-gray-800' : 'bg-white'

  const fontCls = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-xl' : 'text-lg'
  const questionZoom = fontSize === 'small' ? 0.93 : fontSize === 'large' ? 1.08 : 1
  const menuBtn = `p-2 rounded-lg transition ${D ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`

  const qRange =
    questions.length > 0
      ? `${questions[0].number}?${questions[questions.length - 1].number}`
      : '?'
  const partLabel = section?.part_label || `Part ${activePartIndex + 1}`

  const testTakerId = user?.id ?? '?'

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${bg}`}>
        <div className={`flex items-center gap-3 px-5 h-16 border-b flex-shrink-0 ${topbar}`}>
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 flex-1 max-w-md" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!reviewMode && !audioStarted) {
    return (
      <StartAudioScreen
        section={section}
        sectionTitle={sectionTitle}
        dark={darkMode}
        onStart={() => setAudioStarted(true)}
        isFull={isFull}
        isUnifiedAudio={isUnifiedAudio}
        totalQuestions={isFull ? partIds.length * (section?.questions?.length || 10) : undefined}
      />
    )
  }

  return (
    <div className={`flex flex-col h-full ${bg} ${textMain}`} ref={containerRef}>
      {/* Top bar ? Reading uslubida */}
      <div className={`relative flex items-center gap-2 sm:gap-4 px-4 md:px-6 h-16 border-b flex-shrink-0 ${topbar}`}>
        <button
          type="button"
          onClick={() => (reviewMode ? navigate(-1) : setShowExitConfirm(true))}
          className={`flex items-center gap-2 text-[15px] transition flex-shrink-0 px-3 py-2.5 rounded-xl border ${
            D ? 'bg-gray-800/60 border-gray-700 text-gray-200' : 'bg-white/70 border-sky-100 text-gray-600'
          }`}
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {reviewMode && (
          <button
            type="button"
            onClick={() => navigate('/app/ielts/listening')}
            className={`hidden sm:inline-flex text-sm font-semibold px-3 py-2 rounded-xl border ${
              D ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'
            }`}
          >
            Listening testlar
          </button>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2.5 py-1 rounded-md bg-red-600 text-white text-xs font-black tracking-wide">IELTS</span>
          <span className={`text-xs sm:text-sm ${textSub} hidden md:inline`}>Test taker ID: {testTakerId}</span>
        </div>

        <p className="flex-1 font-semibold text-sm sm:text-base truncate min-w-0 text-center sm:text-left">
          {sectionTitle}
          {reviewMode ? ' ? Review' : ''}
        </p>

        {!reviewMode && (
          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
            {isFull && !isUnifiedAudio && audioStarted && (
              <span className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${D ? 'bg-gray-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                <span className="inline-flex gap-0.5 items-end h-3">
                  <span className="w-0.5 h-1.5 bg-current rounded animate-pulse" />
                  <span className="w-0.5 h-2.5 bg-current rounded animate-pulse" style={{ animationDelay: '0.15s' }} />
                  <span className="w-0.5 h-1.5 bg-current rounded animate-pulse" style={{ animationDelay: '0.3s' }} />
                </span>
                Part {audioPartIndex + 1}
              </span>
            )}
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-xl ${D ? 'bg-gray-800 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
              {isFull ? totalAnsweredAll : answeredCount} / {isFull ? allQuestionsFlat.length : questions.length}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {reviewMode ? (
            <>
              <button
                type="button"
                onClick={() => setShowCorrectInReview((p) => !p)}
                className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-xl border text-xs font-semibold ${
                  showCorrectInReview ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                <span className={`w-9 h-5 rounded-full p-0.5 ${showCorrectInReview ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white transition ${showCorrectInReview ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
                <span className="hidden lg:inline">Show Correct</span>
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`p-2.5 rounded-xl border hidden md:inline-flex ${D ? 'border-gray-600' : 'border-gray-200 bg-white'}`}
              >
                {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
              </button>
              <button
                type="button"
                onClick={handleRedoFromReview}
                className="px-2 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <RotateCcw size={14} /> Re-Do
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-2 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Lock size={14} /> Results
              </button>
            </>
          ) : (
            <>
              <button type="button" className={`${menuBtn} hidden sm:flex`} aria-hidden>
                <Bell size={18} />
              </button>
              <button type="button" className={`${menuBtn} hidden sm:flex`} aria-hidden>
                <SquarePen size={18} />
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className={`p-3 rounded-xl ${menuBtn}`}
                title="Fullscreen"
              >
                {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <div className="relative">
                <button type="button" onClick={() => setMenuOpen((p) => !p)} className={`p-3 rounded-xl ${menuBtn}`}>
                  <Menu size={22} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      className={`absolute right-0 top-11 w-52 rounded-2xl shadow-xl border z-50 overflow-hidden ${
                        D ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className={`px-3 py-2.5 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                        <p className={`text-xs font-semibold mb-2 ${textSub}`}>Text size</p>
                        <div className="flex gap-1">
                          {[
                            ['small', 'A?'],
                            ['normal', 'A'],
                            ['large', 'A+'],
                          ].map(([size, label]) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setFontSize(size)}
                              className={`flex-1 py-1.5 rounded-lg text-sm font-bold ${
                                fontSize === size
                                  ? 'bg-sky-500 text-white'
                                  : D
                                    ? 'bg-gray-700 text-gray-300'
                                    : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDarkMode((p) => !p)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 border-b text-sm ${D ? 'border-gray-700' : 'border-gray-100'}`}
                      >
                        {D ? <Sun size={15} /> : <Moon size={15} />}
                        {D ? 'Light' : 'Dark'}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instruction + audio (review) */}
      {reviewMode && isUnifiedAudio && (
        <div className={`border-b px-4 py-3 ${D ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          <div className="max-w-6xl mx-auto">
            <p className={`text-sm font-semibold mb-2 ${textMain}`}>Full Mock — Review audio</p>
            <ReviewAudioPlayer audioUrl={section?.test_audio_url || null} dark={D} />
          </div>
        </div>
      )}
      {reviewMode && !isFull && !isUnifiedAudio && (
        <div className={`border-b px-4 py-3 ${D ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
          <div className="max-w-6xl mx-auto">
            <p className={`text-sm font-semibold mb-2 ${textMain}`}>{partLabel} — Review audio</p>
            <ReviewAudioPlayer audioUrl={section?.audio_url || null} dark={D} />
          </div>
        </div>
      )}

      {!reviewMode && (
        <div className="px-4 py-2">
          <p className={`text-sm ${textMain}`}>
            <span className="font-bold">{partLabel}</span>
            <span className="mx-2">?</span>
            Listen and answer questions {qRange}.
          </p>
          {isUnifiedAudio && (
            <span className={`text-xs ${textSub}`}>Continuous audio ? do not refresh the page</span>
          )}
        </div>
      )}

      <HiddenExamAudio
        src={activeAudioSrc}
        active={!reviewMode && audioStarted && Boolean(activeAudioSrc)}
        onEnded={handleAudioEnded}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row min-h-0 px-1 md:px-2">
        {reviewMode ? (
          <>
            <div
              className={`overflow-y-auto border-b md:border-b-0 md:border-r flex-shrink-0 pb-44 ${divider} ${fontCls}`}
              style={{ flexBasis: `${splitRatio}%` }}
            >
              <div className="p-4 md:p-5 space-y-8">
                {allSectionsData.map((sec, idx) => {
                  if (!sec) return null
                  const secAudioUrl = !isUnifiedAudio ? (sec.audio_url || null) : null
                  const evidenceItems = buildListeningEvidenceItems(sec, reviewMap)
                  const firstQ = sec.questions?.[0]?.number
                  const lastQ = sec.questions?.[sec.questions.length - 1]?.number
                  return (
                    <div key={partIds[idx] || idx}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${D ? 'bg-sky-900 text-sky-300' : 'bg-sky-100 text-sky-700'}`}>
                          {sec.part_label || `Part ${idx + 1}`}
                        </span>
                        {firstQ != null && (
                          <span className={`text-xs ${textSub}`}>
                            Questions {firstQ}–{lastQ}
                          </span>
                        )}
                      </div>
                      {secAudioUrl && (
                        <div className="mb-3">
                          <ReviewAudioPlayer audioUrl={secAudioUrl} dark={D} />
                        </div>
                      )}
                      <TranscriptWithEvidence
                        text={sec.transcript || '(No transcript available for this part)'}
                        dark={D}
                        evidenceItems={showCorrectInReview ? evidenceItems : []}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
            <div
              onPointerDown={(e) => {
                e.preventDefault()
                dragging.current = true
                e.currentTarget.setPointerCapture?.(e.pointerId)
              }}
              className={`md:hidden h-4 flex-shrink-0 cursor-row-resize flex items-center justify-center ${
                D ? 'bg-gray-800' : 'bg-sky-50'
              }`}
              style={{ touchAction: 'none' }}
            />
            <div
              onPointerDown={(e) => {
                e.preventDefault()
                dragging.current = true
                e.currentTarget.setPointerCapture?.(e.pointerId)
              }}
              className={`hidden md:flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center ${
                D ? 'bg-gray-800' : 'bg-sky-50'
              }`}
              style={{ touchAction: 'none' }}
            >
              <div className={`w-1 h-16 rounded-full ${D ? 'bg-gray-600' : 'bg-sky-200'}`} />
            </div>
            <div className={`flex-1 overflow-y-auto min-w-0 pb-40 md:pb-36 p-4 ${fontCls}`} style={{ zoom: questionZoom }}>
              {/* In review mode show ALL parts' questions */}
              {isFull ? (
                allSectionsData.map((sec, idx) => {
                  if (!sec?.questions?.length) return null
                  const pid = String(partIds[idx])
                  const secAnswers = answersByPart[pid] || {}
                  return (
                    <div key={partIds[idx] || idx} className={`mb-6 ${idx > 0 ? `border-t pt-4 ${D ? 'border-gray-700' : 'border-gray-200'}` : ''}`}>
                      <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${D ? 'text-sky-400' : 'text-sky-600'}`}>
                        {sec.part_label || `Part ${idx + 1}`}
                      </p>
                      <QuestionList
                        questions={sec.questions}
                        answers={secAnswers}
                        setAnswer={setAnswer}
                        activeQ={activeQ}
                        setActiveQ={setActiveQ}
                        qCard={qCard}
                        D={D}
                        textMain={textMain}
                        textSub={textSub}
                        toggleBookmark={toggleBookmark}
                        bookmarkedIds={bookmarkedIds}
                        bookmarkLoading={bookmarkLoading}
                        reviewMode={reviewMode}
                        showCorrectInReview={showCorrectInReview}
                        reviewMap={reviewMap}
                        questionRefs={questionRefs}
                        isAnswered={(qId) => Boolean(secAnswers[String(qId)])}
                      />
                    </div>
                  )
                })
              ) : (
                <QuestionList
                  questions={questions}
                  answers={answers}
                  setAnswer={setAnswer}
                  activeQ={activeQ}
                  setActiveQ={setActiveQ}
                  qCard={qCard}
                  D={D}
                  textMain={textMain}
                  textSub={textSub}
                  toggleBookmark={toggleBookmark}
                  bookmarkedIds={bookmarkedIds}
                  bookmarkLoading={bookmarkLoading}
                  reviewMode={reviewMode}
                  showCorrectInReview={showCorrectInReview}
                  reviewMap={reviewMap}
                  questionRefs={questionRefs}
                  isAnswered={isAnswered}
                />
              )}
            </div>
          </>
        ) : (
          <div className={`flex-1 overflow-y-auto w-full p-4 pb-40 md:pb-36 ${fontCls}`} style={{ zoom: questionZoom }}>
            <QuestionList
              questions={questions}
              answers={answers}
              setAnswer={setAnswer}
              activeQ={activeQ}
              setActiveQ={setActiveQ}
              qCard={qCard}
              D={D}
              textMain={textMain}
              textSub={textSub}
              toggleBookmark={toggleBookmark}
              bookmarkedIds={bookmarkedIds}
              bookmarkLoading={bookmarkLoading}
              reviewMode={reviewMode}
              showCorrectInReview={showCorrectInReview}
              reviewMap={reviewMap}
              questionRefs={questionRefs}
              isAnswered={isAnswered}
            />
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className={`fixed bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 z-30 rounded-2xl border ${divider} ${D ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur shadow-lg`}>
        <div className="flex items-center gap-3 px-3 py-2 max-w-screen-xl mx-auto">
          <div className="flex flex-1 min-w-0 items-stretch gap-2">
              {(isFull ? partIds : [partIds[0] || 0]).map((pid, pidx) => {
                const partSection = allSectionsData[pidx]
                const partQs = partSection?.questions || (pidx === 0 ? questions : [])
                const isActivePart = pidx === activePartIndex
                const isAudioPart = !isUnifiedAudio && audioStarted && pidx === audioPartIndex
                const partAns = answersByPart[String(pid)] || {}
                return (
                  <div
                    key={pid}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSwitchPart(pidx) } }}
                    className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 px-1.5 sm:px-2 py-2 rounded-xl border-2 cursor-pointer transition ${
                      isActivePart
                        ? 'border-sky-500 ' + (D ? 'bg-gray-800' : 'bg-sky-50/60')
                        : D ? 'border-gray-600 bg-gray-800/40 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => handleSwitchPart(pidx)}
                  >
                    <span className={`text-xs sm:text-sm font-black text-center flex items-center justify-center gap-0.5 flex-wrap ${isActivePart ? 'text-sky-500' : textSub}`}>
                      {isAudioPart && (
                        <span className="inline-flex gap-px items-end h-3 shrink-0">
                          <span className="w-[3px] h-[5px] bg-emerald-500 rounded animate-pulse" />
                          <span className="w-[3px] h-[9px] bg-emerald-500 rounded animate-pulse" style={{ animationDelay: '0.15s' }} />
                          <span className="w-[3px] h-[5px] bg-emerald-500 rounded animate-pulse" style={{ animationDelay: '0.3s' }} />
                        </span>
                      )}
                      Part {pidx + 1}
                    </span>
                    {isActivePart ? (
                      <div className="flex flex-wrap justify-center gap-1 w-full">
                    {partQs.map((q, qi) => {
                      const answered = Boolean(partAns[String(q.id)])
                      const isCurrent = activeQ === qi
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={e => { e.stopPropagation(); handleSwitchPart(pidx); setTimeout(() => goToQuestion(qi), 0) }}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition flex items-center justify-center flex-shrink-0 ${
                            answered
                              ? 'bg-sky-500 text-white'
                              : isCurrent
                                ? 'bg-sky-400 text-white ring-2 ring-sky-200'
                                : D ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {q.number}
                        </button>
                      )
                    })}
                      </div>
                    ) : (
                      <span className={`text-[10px] sm:text-xs italic text-center leading-tight px-0.5 ${textSub}`}>{partQs.length} questions</span>
                    )}
                  </div>
                )
              })}
          </div>
          {!reviewMode ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black disabled:opacity-60 transition whitespace-nowrap"
            >
              <Send size={14} />
              Finish test
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/app/ielts/listening')}
              className={`flex-shrink-0 px-4 py-2 border rounded-xl text-sm font-semibold transition whitespace-nowrap ${D ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Tests
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showExitConfirm && !reviewMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`rounded-2xl shadow-2xl p-6 w-full max-w-sm ${D ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
            >
              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-sky-500" />
              </div>
              <h3 className="font-bold text-center text-lg mb-1">Chiqish yoki topshirish?</h3>
              <p className={`text-sm text-center mb-4 ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                {isFull ? totalAnsweredAll : answeredCount} / {isFull ? allQuestionsFlat.length || partIds.length * 10 : questions.length} javob
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className={`py-2.5 border rounded-xl text-sm font-medium ${D ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className={`py-2.5 border rounded-xl text-sm font-medium ${D ? 'border-gray-600' : 'border-gray-200'}`}
                >
                  Back to list
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showConfirm && !reviewMode && (
          <SubmitConfirm
            answered={isFull ? totalAnsweredAll : answeredCount}
            total={isFull ? allQuestionsFlat.length || partIds.length * 10 : questions.length}
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirm(false)}
            dark={D}
          />
        )}
      </AnimatePresence>

      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}

// -- TFNG / YNNG Input ----------------------------------------------------------
function TFNGInput({ value, onChange, dark, readOnly, isYNNG }) {
  const D = dark
  const opts = isYNNG
    ? [{ v: 'YES', label: 'Yes' }, { v: 'NO', label: 'No' }, { v: 'NOT GIVEN', label: 'Not Given' }]
    : [{ v: 'TRUE', label: 'True' }, { v: 'FALSE', label: 'False' }, { v: 'NOT GIVEN', label: 'Not Given' }]
  return (
    <div className="space-y-0.5 mt-2">
      {opts.map(({ v, label }) => {
        const sel = value === v
        return (
          <button key={v} type="button" disabled={readOnly}
            onClick={() => onChange(sel ? '' : v)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
              sel
                ? D ? 'text-sky-300' : 'text-sky-700'
                : D ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
            } ${readOnly ? 'pointer-events-none' : ''}`}>
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
              sel ? 'border-sky-500 bg-sky-500' : D ? 'border-gray-500' : 'border-gray-300'
            }`}>
              {sel && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
            </span>
            <span className="font-semibold">{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// -- Group Instruction ----------------------------------------------------------
function GroupInstruction({ text, dark }) {
  if (!text) return null
  const D = dark
  return (
    <div className={`mb-3 px-0.5 ${D ? 'text-gray-100' : 'text-gray-900'}`}>
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />
        const parseBold = (str) => str.split(/\*\*(.*?)\*\*/g).map((p, pi) =>
          pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p
        )
        const isRangeTitle = /^questions?\s*\d+/i.test(line.trim())
        return (
          <div key={i} className={`mt-1 leading-snug ${isRangeTitle ? 'text-xl font-bold' : 'text-lg font-bold'}`}>
            {parseBold(line)}
          </div>
        )
      })}
    </div>
  )
}

// -- groupSegments: identical logic as reading ----------------------------------
function groupSegments(questions) {
  const segments = []
  let i = 0
  while (i < questions.length) {
    const q = questions[i]
    const qt = q.question_type
    const gi = q.group_instruction

    // MFEAT with choices > dropdown list block
    if (['MFEAT', 'M.FEAT'].includes(qt) && q.choices?.length > 0) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && ['MFEAT','M.FEAT'].includes(questions[j].question_type))
        grp.push(questions[j++])
      segments.push({ type: 'mfeat', questions: grp }); i = j; continue
    }

    // MINFO ? choices yo'q bo'lsa group_instruction dan A?H auto-yaratiladi
    if (['MINFO','M.INFO'].includes(qt)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && ['MINFO','M.INFO'].includes(questions[j].question_type))
        grp.push(questions[j++])
      const rangeMatch = gi.match(/\b([A-H])[?\-]([A-H])\b/i)
      const from = rangeMatch ? rangeMatch[1].toUpperCase().charCodeAt(0) : 65
      const to   = rangeMatch ? rangeMatch[2].toUpperCase().charCodeAt(0) : 72
      const autoChoices = q.choices?.length
        ? q.choices
        : Array.from({ length: to - from + 1 }, (_, k) => {
            const letter = String.fromCharCode(from + k)
            return { option: letter, text: `Paragraph ${letter}` }
          })
      segments.push({ type: 'grid', questions: grp.map(qq => ({ ...qq, choices: qq.choices?.length ? qq.choices : autoChoices })) })
      i = j; continue
    }

    // MEND with choices > grid matrix
    if (['MEND', 'M.END'].includes(qt) && q.choices?.length > 0) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && ['MEND','M.END'].includes(questions[j].question_type))
        grp.push(questions[j++])
      segments.push({ type: 'grid', questions: grp }); i = j; continue
    }

    // NOTE / SUMM with [N] markers > inline gap block
    if (['NOTE','SUMM'].includes(qt) && gi && /\[\d+\]/.test(gi)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && ['NOTE','SUMM'].includes(questions[j].question_type))
        grp.push(questions[j++])
      segments.push({ type: 'inline', questions: grp }); i = j; continue
    }

    // TABLE with [N] markers in content > table gap block
    if (qt === 'TABLE' && q.content && /\[\d+\]/.test(q.content)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && questions[j].question_type === 'TABLE' && questions[j].content === q.content)
        grp.push(questions[j++])
      segments.push({ type: 'table', questions: grp }); i = j; continue
    }

    // FLOW > group consecutive FLOW questions into a flowchart block
    if (qt === 'FLOW') {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && questions[j].question_type === 'FLOW')
        grp.push(questions[j++])
      segments.push({ type: 'flow', questions: grp }); i = j; continue
    }

    segments.push({ type: 'card', questions: [q] }); i++
  }
  return segments
}

// -- Match Grid Block ----------------------------------------------------------
function MatchGridBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, toggleBookmark, bookmarkedIds, bookmarkLoading }) {
  const D = dark
  const choices = questions[0]?.choices || []
  const groupList = questions[0]?.group_list || []
  const qt = questions[0]?.question_type
  const gi = questions[0]?.group_instruction || ''

  // MEND uses group_list for full ending texts; MFEAT/MATCH use choices
  const isMend = ['MEND', 'M.END'].includes(qt)
  const legendItems = isMend ? groupList : choices

  return (
    <>
      {gi && <GroupInstruction text={gi} dark={D} />}
      {legendItems.length > 0 && (
        <div className={`mb-3 rounded-xl border px-4 py-3 ${D ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
          <div className="space-y-1">
            {legendItems.map(c => (
              <div key={c.option} className={`flex items-start gap-2 text-sm ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                <span className="font-extrabold flex-shrink-0 w-6">{c.option}.</span>
                <span>{cleanText(c.text)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={`overflow-x-auto mb-2 rounded-2xl border-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
        <table className={`w-auto border-collapse ${D ? 'text-gray-300' : 'text-gray-900'}`}>
          <thead>
            <tr>
              <th className={`px-7 py-3 text-left font-normal text-sm border-b-2 border-r-2 ${D ? 'border-gray-700' : 'border-gray-300'}`} style={{ minWidth: 300 }} />
              {choices.map(c => (
                <th key={c.option} className={`px-5 py-3 text-center font-bold w-[72px] border-b-2 border-r-2 ${D ? 'text-gray-200 border-gray-700' : 'text-gray-900 border-gray-300'}`}>
                  {c.option}
                </th>
              ))}
              <th className={`px-3 py-3 w-[48px] border-b-2 ${D ? 'border-gray-700' : 'border-gray-300'}`} />
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const val = answers[String(q.id)] || ''
              const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
              const isBookmarked = bookmarkedIds?.has?.(q.id)
              const bmLoading = bookmarkLoading?.has?.(q.id)
              return (
                <tr key={q.id} className={`group border-b-2 last:border-b-0 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                  <td className={`px-6 py-3 text-[1.02em] border-r-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                    <span className={`font-bold mr-2 ${D ? 'text-gray-300' : 'text-gray-700'}`}>{q.number}.</span>
                    <span>{q.content}</span>
                    {rr && !rr.is_correct && <span className="ml-2 text-xs font-semibold text-red-500">? {'>'} {rr.correct_answer}</span>}
                    {rr?.is_correct && <span className="ml-2 text-xs font-semibold text-green-500">?</span>}
                  </td>
                  {choices.map(c => {
                    const sel = val === c.option
                    return (
                      <td key={c.option} className={`p-0 w-[72px] border-r-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                        <button type="button" tabIndex={reviewMode ? -1 : 0}
                          onClick={() => { if (!reviewMode) onAnswer(q.id, sel ? '' : c.option) }}
                          className={`flex min-h-[52px] w-full items-center justify-center transition rounded-lg ${!reviewMode ? D ? 'hover:bg-gray-700/40' : 'hover:bg-sky-50' : 'cursor-default'}`}>
                          <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center transition ${sel ? 'border-sky-500 bg-sky-500' : D ? 'border-gray-500' : 'border-gray-400'}`}>
                            {sel && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                          </span>
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-0 text-center align-middle w-[48px]">
                    {!reviewMode && (
                      <button type="button" onClick={(e) => toggleBookmark(q.id, e)} disabled={bmLoading}
                        className={`flex w-full min-h-[52px] items-center justify-center transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <Bookmark size={15} className={isBookmarked ? 'fill-slate-400 text-slate-400' : D ? 'text-gray-500' : 'text-gray-400'} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// -- MFEAT Block — Legend list + per-question dropdown (dropdown LEFT of text) --
function MFeatBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const choices = questions[0]?.choices || []
  const gi = questions[0]?.group_instruction || ''
  const bmLoading = bookmarkLoading
  const [openId, setOpenId] = useState(null)
  const dropdownRefs = useRef({})

  useEffect(() => {
    const onDocClick = (e) => {
      if (openId == null) return
      const node = dropdownRefs.current[openId]
      if (node && !node.contains(e.target)) setOpenId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openId])

  return (
    <div className="mb-2">
      {gi && <GroupInstruction text={gi} dark={D} />}
      {choices.length > 0 && (
        <div className={`mb-3 rounded-xl border px-4 py-3 text-[0.9em] ${D ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          <div className="space-y-1">
            {choices.map(c => (
              <div key={c.option} className="flex items-start gap-2">
                <span className={`font-bold flex-shrink-0 w-6 ${D ? 'text-gray-200' : 'text-gray-900'}`}>{c.option}.</span>
                <span>{cleanText(c.text)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={`rounded-2xl border overflow-visible ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        {questions.map((q, idx) => {
          const val = answers[String(q.id)] || ''
          const rr = reviewMode && showCorrectInReview
            ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
          const isBookmarked = bookmarkedIds?.has(q.id)
          return (
            <div key={q.id} id={`q-${q.id}`}
              className={`flex items-center gap-2.5 px-3 py-2.5 group ${idx < questions.length - 1 ? (D ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>

              {/* ── Dropdown FIRST (left side) ── */}
              <div className="relative flex-shrink-0 w-24" ref={(el) => { dropdownRefs.current[q.id] = el }}>
                <button
                  type="button"
                  disabled={reviewMode}
                  onClick={() => !reviewMode && setOpenId((prev) => (prev === q.id ? null : q.id))}
                  className={`w-full px-2 py-1.5 rounded-lg border text-sm font-semibold transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                    val
                      ? D ? 'bg-sky-900/40 border-sky-500 text-sky-200' : 'bg-sky-50 border-sky-400 text-sky-800'
                      : D ? 'bg-gray-700 border-gray-600 text-gray-400' : 'bg-white border-gray-300 text-gray-400'
                  } ${reviewMode ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                >
                  <span className={val ? '' : 'text-xs'}>{val || '—'}</span>
                  <ChevronDown size={13} className={`transition-transform flex-shrink-0 ml-1 ${openId === q.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openId === q.id && !reviewMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className={`absolute left-0 z-40 mt-1 w-28 rounded-lg border shadow-lg overflow-hidden ${
                        D ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => { onAnswer(q.id, ''); setOpenId(null) }}
                        className={`w-full px-3 py-2 text-sm text-left transition ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-50'}`}
                      >
                        —
                      </button>
                      {choices.map(c => (
                        <button
                          key={c.option}
                          type="button"
                          onClick={() => { onAnswer(q.id, c.option); setOpenId(null) }}
                          className={`w-full px-3 py-2 text-sm text-left font-semibold transition ${
                            val === c.option
                              ? D ? 'bg-sky-900/40 text-sky-200' : 'bg-sky-50 text-sky-700'
                              : D ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {c.option}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Question number ── */}
              <span className={`font-bold flex-shrink-0 w-6 text-sm ${D ? 'text-gray-400' : 'text-gray-500'}`}>{q.number}.</span>

              {/* ── Content ── */}
              <span className={`flex-1 text-sm leading-snug ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                {q.content}
                {rr && !rr.is_correct && <span className="ml-2 text-xs font-semibold text-red-500">✗ {rr.correct_answer}</span>}
                {rr?.is_correct && <span className="ml-2 text-xs font-semibold text-green-500">✓</span>}
              </span>

              {/* ── Bookmark ── */}
              {!reviewMode && (
                <button type="button" onClick={(e) => toggleBookmark(q.id, e)} disabled={bmLoading}
                  className={`flex-shrink-0 transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <Bookmark size={14} className={isBookmarked ? 'fill-slate-400 text-slate-400' : D ? 'text-gray-500' : 'text-gray-400'} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- MINFO Block — accordion: collapsed=1 row, expanded=letter buttons shown --
function MInfoBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const choices = questions[0]?.choices?.length
    ? questions[0].choices
    : 'ABCDEFGH'.split('').map(l => ({ option: l, text: `Paragraph ${l}` }))
  const gi = questions[0]?.group_instruction || ''
  const bmLoading = bookmarkLoading
  const [openId, setOpenId] = useState(null)

  return (
    <div className="mb-2">
      {gi && <GroupInstruction text={gi} dark={D} />}
      <div className={`rounded-2xl border overflow-hidden ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        {questions.map((q, idx) => {
          const val = answers[String(q.id)] || ''
          const rr = reviewMode && showCorrectInReview
            ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
          const isBookmarked = bookmarkedIds?.has(q.id)
          const isOpen = openId === q.id

          return (
            <div key={q.id} id={`q-${q.id}`}
              className={`group ${idx < questions.length - 1 ? (D ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>

              {/* ── Collapsed row (always visible, 1 line) ── */}
              <div
                className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none transition-colors ${
                  isOpen
                    ? D ? 'bg-gray-700/50' : 'bg-sky-50/60'
                    : D ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'
                }`}
                onClick={() => !reviewMode && setOpenId(isOpen ? null : q.id)}
              >
                {/* Number */}
                <span className={`font-bold flex-shrink-0 w-6 text-sm ${D ? 'text-gray-400' : 'text-gray-500'}`}>{q.number}.</span>

                {/* Content */}
                <span className={`flex-1 text-sm leading-snug truncate ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                  {q.content}
                  {rr && !rr.is_correct && <span className="ml-2 text-xs font-semibold text-red-500">✗ {rr.correct_answer}</span>}
                  {rr?.is_correct && <span className="ml-2 text-xs font-semibold text-green-500">✓</span>}
                </span>

                {/* Selected value chip */}
                {val ? (
                  <span className={`flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm font-bold border ${
                    D ? 'bg-sky-900/40 border-sky-500 text-sky-200' : 'bg-sky-50 border-sky-400 text-sky-700'
                  }`}>{val}</span>
                ) : (
                  <span className={`flex-shrink-0 text-xs ${D ? 'text-gray-600' : 'text-gray-300'}`}>—</span>
                )}

                {/* Expand chevron */}
                {!reviewMode && (
                  <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180' : ''
                  } ${D ? 'text-gray-500' : 'text-gray-400'}`} />
                )}

                {/* Bookmark */}
                {!reviewMode && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); toggleBookmark(q.id, e) }}
                    disabled={!!bmLoading?.has?.(q.id)}
                    className={`flex-shrink-0 transition ${bmLoading?.has?.(q.id) ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <Bookmark size={14} className={isBookmarked ? 'fill-slate-400 text-slate-400' : D ? 'text-gray-500' : 'text-gray-400'} />
                  </button>
                )}
              </div>

              {/* ── Expanded: letter buttons ── */}
              <AnimatePresence>
                {(isOpen || reviewMode) && (
                  <motion.div
                    initial={reviewMode ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className={`flex flex-wrap gap-1.5 px-4 pb-3 pt-1 ${D ? 'bg-gray-700/30' : 'bg-sky-50/40'}`}>
                      {choices.map(c => {
                        const selected = val === c.option
                        return (
                          <button key={c.option} type="button" disabled={reviewMode}
                            title={c.text}
                            onClick={e => { e.stopPropagation(); if (!reviewMode) { onAnswer(q.id, selected ? '' : c.option); if (!selected) setOpenId(null) } }}
                            className={`w-9 h-9 rounded-xl font-bold text-sm border transition ${
                              selected
                                ? 'bg-sky-500 text-white border-sky-500 shadow-sm scale-105'
                                : reviewMode
                                  ? D ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-default' : 'bg-gray-100 border-gray-200 text-gray-400 cursor-default'
                                  : D ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-sky-400 hover:text-sky-300'
                                       : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50'
                            }`}>
                            {c.option}
                          </button>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- Build evidence items from transcript [N] markers -------------------------
function buildListeningEvidenceItems(section, reviewMap) {
  if (!section?.transcript) return []
  const transcript = section.transcript
  const items = []
  const markerRe = /\[(\d+)\]/g
  let m
  while ((m = markerRe.exec(transcript)) !== null) {
    const qNum = parseInt(m[1], 10)
    const afterStart = m.index + m[0].length
    const rest = transcript.slice(afterStart)
    const nextMatch = /\[\d+\]/.exec(rest)
    const afterEnd = nextMatch
      ? afterStart + nextMatch.index
      : Math.min(afterStart + 80, transcript.length)
    let snippet = transcript.slice(afterStart, afterEnd).trim()
    const punctIdx = snippet.search(/[.!?,;]/)
    if (punctIdx > 5 && punctIdx < snippet.length - 1) {
      snippet = snippet.slice(0, punctIdx + 1).trim()
    }
    if (snippet.length >= 4) {
      items.push({ snippet, questionNumber: qNum })
    } else {
      const rv = reviewMap?.[`n-${qNum}`]
      if (rv?.correct_answer && rv.correct_answer.length > 2) {
        items.push({ snippet: rv.correct_answer, questionNumber: qNum })
      }
    }
  }
  // If no [N] markers in transcript, fall back to searching correct answers
  if (items.length === 0) {
    for (const q of (section.questions || [])) {
      const rv = reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]
      if (rv?.correct_answer && rv.correct_answer.length > 2 && rv.correct_answer.length < 100) {
        items.push({ snippet: rv.correct_answer, questionNumber: q.number })
      }
    }
  }
  return items
}

// -- Transcript with evidence highlights ---------------------------------------
// Inline markdown: **bold**, *italic*, _italic_  >  React nodes
function renderInlineMarkdown(str, keyPrefix = '') {
  if (!str) return null
  const parts = []
  // regex: **bold** | *italic* | _italic_
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g
  let last = 0, m, idx = 0
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(<span key={`${keyPrefix}t${idx}`}>{str.slice(last, m.index)}</span>)
    if (m[1] !== undefined) parts.push(<strong key={`${keyPrefix}b${idx}`}>{m[1]}</strong>)
    else parts.push(<em key={`${keyPrefix}i${idx}`}>{m[2] ?? m[3]}</em>)
    last = m.index + m[0].length; idx++
  }
  if (last < str.length) parts.push(<span key={`${keyPrefix}t${idx}`}>{str.slice(last)}</span>)
  return parts.length ? parts : [<span key={`${keyPrefix}raw`}>{str}</span>]
}

function TranscriptWithEvidence({ text, dark, evidenceItems = [] }) {
  const D = dark
  const highlights = useMemo(() => {
    if (!evidenceItems.length || !text) return []
    const textLower = text.toLowerCase()
    const picked = []
    const sorted = [...evidenceItems].sort((a, b) => b.snippet.length - a.snippet.length)
    for (const ev of sorted) {
      const snippet = String(ev.snippet || '').trim()
      if (snippet.length < 4) continue
      const start = textLower.indexOf(snippet.toLowerCase())
      if (start < 0) continue
      const end = start + snippet.length
      if (picked.some(p => p.start < end && start < p.end)) continue
      picked.push({ start, end, q: ev.questionNumber })
    }
    return picked.sort((a, b) => a.start - b.start)
  }, [text, evidenceItems])

  const render = () => {
    if (!text) return null
    const nodes = []
    let cursor = 0
    for (const h of highlights) {
      if (h.start > cursor) {
        const seg = text.slice(cursor, h.start)
        nodes.push(...renderInlineMarkdown(seg, `pre${h.q}`))
      }
      nodes.push(
        <mark key={h.q} style={{ background: '#fde047', borderRadius: 3, padding: '0 2px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 900,
            marginRight: 3, verticalAlign: 'middle',
          }}>{h.q}</span>
          {renderInlineMarkdown(text.slice(h.start, h.end), `hl${h.q}`)}
        </mark>
      )
      cursor = h.end
    }
    if (cursor < text.length) nodes.push(...renderInlineMarkdown(text.slice(cursor), 'tail'))
    return nodes
  }

  return (
    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${D ? 'text-gray-300' : 'text-gray-700'}`}>
      {render()}
    </div>
  )
}

// -- Inline Gap Block (NOTE / SUMM) ---------------------------------------------
function InlineGapBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, toggleBookmark, bookmarkedIds, bookmarkLoading }) {
  const D = dark
  const [focusedId, setFocusedId] = useState(null)
  const [selectedWord, setSelectedWord] = useState('')
  const qt = questions[0]?.question_type
  const isSumm = qt === 'SUMM'
  const gi = questions[0]?.group_instruction || ''
  // Split preamble (Questions X-Y line) from body
  const lines = gi.split('\n')
  const gapIdx = lines.findIndex(l => /\[\d+\]/.test(l))
  let preamble = '', body = gi
  if (gapIdx > 0) {
    const pre = lines.slice(0, gapIdx).join('\n').trim()
    if (/^questions?\s*\d+/i.test(pre.split('\n')[0])) { preamble = pre; body = lines.slice(gapIdx).join('\n') }
  }
  const wordBank = questions.reduce((wb, q) => wb.length ? wb : (q.word_bank?.length ? q.word_bank : []), [])
  const groupKey = useMemo(() => `ielts-summ-${questions.map(q => q.id).join('-')}`, [questions])
  const qByNum = {}
  questions.forEach(q => { qByNum[q.number] = q })
  const usedWords = new Map()
  questions.forEach(q => { const v = answers[String(q.id)]; if (v) usedWords.set(v, q.id) })
  const availableWords = wordBank.filter(w => !usedWords.has(w))

  const assignWordToQuestion = (targetId, rawWord) => {
    const word = (rawWord || '').trim()
    if (!word || reviewMode) return
    const holder = questions.find(
      q => q.id !== targetId && String(answers[String(q.id)] || '').trim().toLowerCase() === word.toLowerCase()
    )
    if (holder) onAnswer(holder.id, '')
    onAnswer(targetId, word)
  }

  const renderGap = (qNum, key) => {
    const q = qByNum[qNum]
    if (!q) return <span key={key} className="inline-block mx-1 px-2 border border-gray-300 rounded text-xs text-gray-400">{qNum}</span>
    const val = answers[String(q.id)] || ''
    const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
    const isBookmarked = bookmarkedIds?.has(q.id)
    const bmLoading = bookmarkLoading?.has(q.id)
    let borderCls = D ? 'border-gray-500' : 'border-gray-400'
    let bgCls = D ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
    if (rr) { borderCls = rr.is_correct ? 'border-green-500' : 'border-red-400'; bgCls = rr.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800' }
    return (
      <span key={key} className="group inline-flex items-center gap-0.5 mx-0.5" style={{ verticalAlign: 'middle' }}>
        <input value={val} readOnly={reviewMode}
          onChange={e => !reviewMode && onAnswer(q.id, e.target.value)}
          onClick={() => {
            if (reviewMode) return
            if (selectedWord) {
              assignWordToQuestion(q.id, selectedWord)
              setSelectedWord('')
              setFocusedId(q.id)
            } else if (val) {
              setSelectedWord(val)
              onAnswer(q.id, '')
              setFocusedId(q.id)
            }
          }}
          onDragOver={(e) => { if (!reviewMode) e.preventDefault() }}
          onDrop={(e) => {
            if (reviewMode) return
            e.preventDefault()
            const payload = e.dataTransfer.getData('application/x-ielts-wordbank')
            if (payload) {
              try {
                const parsed = JSON.parse(payload)
                if (parsed?.groupKey === groupKey && parsed?.word) {
                  assignWordToQuestion(q.id, parsed.word)
                  setFocusedId(q.id)
                  return
                }
              } catch {}
            }
            const dropped = e.dataTransfer.getData('text/plain')
            if (dropped) assignWordToQuestion(q.id, dropped)
            setFocusedId(q.id)
          }}
          onFocus={() => setFocusedId(q.id)} onBlur={() => setFocusedId(null)}
          placeholder={String(qNum)}
          className={`${isSumm ? 'border-2 border-dashed' : 'border'} rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-500 transition ${borderCls} ${bgCls} placeholder-gray-400`}
          style={{ width: 150, height: 34, paddingLeft: 6, paddingRight: 6 }}
        />
        {!reviewMode && toggleBookmark && (
          <button type="button" onClick={e => { e.stopPropagation(); toggleBookmark(q.id, e) }}
            disabled={!!bmLoading}
            className={`inline-flex items-center transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <Bookmark size={20} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
          </button>
        )}
        {rr && !rr.is_correct && <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>}
      </span>
    )
  }

  const parseInline = (text, keyPrefix) =>
    text.split(/(\[\d+\])/g).map((seg, si) => {
      const gm = seg.match(/^\[(\d+)\]$/)
      if (gm) return renderGap(parseInt(gm[1]), `${keyPrefix}-g${si}`)
      return seg.split(/\*\*(.*?)\*\*/g).map((p, pi) =>
        pi % 2 === 1 ? <strong key={`${keyPrefix}-b${si}-${pi}`}>{p}</strong> : p
      )
    })

  const renderLines = () =>
    body.split('\n').map((line, li) => {
      if (!line.trim()) return <div key={li} className="h-2" />
      const isBullet = /^[?\-]\s/.test(line.trimStart())
      const isNumbered = /^\d+\.\s/.test(line.trimStart())
      const isHeader = /^\*\*.+\*\*$/.test(line.trim())
      if (isHeader) {
        const inner = line.replace(/^\*\*/, '').replace(/\*\*$/, '')
        return <div key={li} className={`font-bold mt-3 first:mt-0 leading-relaxed ${D ? 'text-gray-100' : 'text-gray-900'}`}>{parseInline(inner, `h${li}`)}</div>
      }
      if (isBullet) {
        const inner = line.replace(/^[?\-]\s+/, '')
        return (
          <div key={li} className={`flex items-baseline gap-2 ml-2 leading-relaxed ${D ? 'text-gray-300' : 'text-gray-800'}`}>
            <span className="flex-shrink-0 text-sm">?</span>
            <span>{parseInline(inner, `b${li}`)}</span>
          </div>
        )
      }
      if (isNumbered) {
        const m = line.match(/^(\d+)\.\s+(.*)$/)
        if (m) return (
          <div key={li} className={`flex items-baseline gap-2 ml-3 leading-relaxed ${D ? 'text-gray-300' : 'text-gray-800'}`}>
            <span className="flex-shrink-0 font-medium">{m[1]}.</span>
            <span>{parseInline(m[2], `n${li}`)}</span>
          </div>
        )
      }
      return <div key={li} className={`leading-relaxed ${D ? 'text-gray-300' : 'text-gray-800'}`}>{parseInline(line, `p${li}`)}</div>
    })

  return (
    <>
      {preamble && <GroupInstruction text={preamble} dark={D} />}
      <div className={`rounded-xl overflow-hidden mb-2 border ${D ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
        {isSumm && wordBank.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-[minmax(430px,52%)_minmax(360px,1fr)] md:justify-start md:gap-x-12">
            <div className="px-5 py-4 text-sm space-y-0.5">{renderLines()}</div>
            <div className="px-1 py-2 bg-white self-start mt-2">
              <p className={`text-xs font-semibold mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>Word Bank</p>
              <div className="flex flex-wrap gap-2">
                {availableWords.map(w => {
                  return (
                    <button key={w}
                      type="button"
                      draggable={!reviewMode}
                      onDragStart={(e) => {
                        if (reviewMode) return
                        e.dataTransfer.setData('application/x-ielts-wordbank', JSON.stringify({ word: w, groupKey }))
                        e.dataTransfer.setData('text/plain', w)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => {
                        const target = focusedId ? questions.find(q => q.id === focusedId) : questions.find(q => !answers[String(q.id)])
                        if (target) {
                          assignWordToQuestion(target.id, w)
                          setSelectedWord('')
                          setFocusedId(target.id)
                        } else {
                          setSelectedWord(prev => (prev === w ? '' : w))
                        }
                      }}
                      className={`px-3 py-1 border rounded text-sm transition ${
                        selectedWord === w
                          ? 'border-sky-500 bg-sky-50 text-sky-700'
                          : D ? 'border-gray-500 bg-gray-800 text-gray-200 hover:border-gray-300' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500'
                      }`}>{w}
                    </button>
                  )
                })}
                {availableWords.length === 0 && (
                  <p className={`text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>All words are placed in blanks.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4 text-sm space-y-0.5">{renderLines()}</div>
        )}
      </div>
    </>
  )
}

// -- Table Gap Block -----------------------------------------------------------
function TableGapBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, toggleBookmark, bookmarkedIds, bookmarkLoading }) {
  const D = dark
  const gi = questions[0]?.group_instruction || ''
  const content = questions[0]?.content || ''
  const qByNum = {}
  questions.forEach(q => { qByNum[q.number] = q })

  const renderGap = (qNum, key) => {
    const q = qByNum[qNum]
    if (!q) return <span key={key} className="inline-block px-2 border border-gray-300 rounded text-xs">{qNum}</span>
    const val = answers[String(q.id)] || ''
    const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
    const isBookmarked = bookmarkedIds?.has(q.id)
    const bmLoading = bookmarkLoading?.has(q.id)
    return (
      <span key={key} className="group inline-flex items-center gap-1" style={{ verticalAlign: 'middle' }}>
        <input value={val} readOnly={reviewMode}
          onChange={e => !reviewMode && onAnswer(q.id, e.target.value)}
          placeholder={String(qNum)}
          className={`border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-400 transition placeholder-gray-400 ${
            rr ? rr.is_correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
               : D ? 'bg-gray-800 border-gray-500 text-gray-100' : 'bg-white border-gray-400 text-gray-900'
          }`}
          style={{ width: 140, height: 34, paddingLeft: 6, paddingRight: 6 }}
        />
        {!reviewMode && toggleBookmark && (
          <button type="button" onClick={e => { e.stopPropagation(); toggleBookmark(q.id, e) }}
            disabled={!!bmLoading}
            className={`inline-flex items-center transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <Bookmark size={20} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
          </button>
        )}
        {rr && !rr.is_correct && <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>}
      </span>
    )
  }

  const parseCell = (text, kp) =>
    text.split(/(\[\d+\])/g).map((seg, si) => {
      const gm = seg.match(/^\[(\d+)\]$/)
      if (gm) return renderGap(parseInt(gm[1]), `${kp}-g${si}`)
      return seg.split(/\*\*(.*?)\*\*/g).map((p, pi) => pi % 2 === 1 ? <strong key={`${kp}-b${si}-${pi}`}>{p}</strong> : p)
    })

  const rows = content.split('\n')
    .filter(l => l.trim().startsWith('|') && !/^\|[\s|:-]+\|$/.test(l.trim()))
    .map(line => line.split('|').filter((_, ii, a) => ii > 0 && ii < a.length - 1).map(c => c.trim()))
  const headerRow = rows[0] || []
  const bodyRows = rows.slice(1)

  return (
    <>
      {gi && <GroupInstruction text={gi} dark={D} />}
      <div className={`rounded-xl overflow-hidden mb-2 border-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="overflow-x-auto">
          <table className={`min-w-full text-sm font-normal border-collapse ${D ? 'text-gray-200' : 'text-gray-900'}`}>
            {headerRow.length > 0 && (
              <thead>
                <tr className={D ? 'bg-gray-700/60' : 'bg-gray-100'}>
                  {headerRow.map((cell, ci) => (
                    <th key={ci} className={`px-6 py-3 text-left font-bold border-b-2 border-r-2 last:border-r-0 whitespace-nowrap ${D ? 'border-gray-600' : 'border-gray-300'}`}>
                      {parseCell(cell, `th-${ci}`)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={`border-b-2 last:border-b-0 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-6 py-3.5 border-r-2 last:border-r-0 leading-relaxed font-normal ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                      {parseCell(cell, `td-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// -- Group List ? labeled list shown below group_instruction -------------------
function GroupList({ items, dark }) {
  if (!items?.length) return null
  const D = dark
  return (
    <div className={`rounded-xl border px-4 py-3 mb-2 text-sm ${D ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.option} className="flex items-start gap-2">
            <span className={`font-bold flex-shrink-0 w-7 ${D ? 'text-gray-200' : 'text-gray-900'}`}>{item.option}.</span>
            <span className="leading-snug">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- Flow Chart Block (FLOW type) ----------------------------------------------
function FlowBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const gi = questions[0]?.group_instruction || ''
  const groupList = questions[0]?.group_list

  const boxes = (() => {
    if (questions.length === 1 && (questions[0].content || '').includes('>')) {
      const q = questions[0]
      return (q.content || '').split('>').map((seg, bi) => {
        const s = seg.trim()
        return { text: s, hasGap: s.includes('___'), q: s.includes('___') ? q : null, key: `seg-${bi}` }
      })
    }
    return questions.map(q => ({
      text: q.content || '',
      hasGap: (q.content || '').includes('___'),
      q,
      key: `q-${q.id}`,
    }))
  })()

  return (
    <>
      {gi && <GroupInstruction text={gi} dark={D} />}
      {groupList?.length > 0 && <GroupList items={groupList} dark={D} />}
      <div className={`rounded-2xl border overflow-hidden mb-2 ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="p-4 space-y-0">
          {boxes.map((box, bi) => {
            const q = box.q
            const val = q ? (answers[String(q.id)] || '') : ''
            const rr = q && reviewMode && showCorrectInReview
              ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
            const isBookmarked = q ? bookmarkedIds?.has(q.id) : false
            const bmLoading = q ? bookmarkLoading?.has(q.id) : false
            const parts = box.hasGap ? box.text.split('___') : null

            return (
              <div key={box.key} id={q ? `lq-${q.id}` : undefined}>
                {bi > 0 && (
                  <div className="flex justify-center py-1.5">
                    <ArrowDown size={32} strokeWidth={3} className={D ? 'text-gray-400' : 'text-gray-600'} />
                  </div>
                )}
                <div className={`group rounded-xl border-2 px-4 py-3 text-sm leading-relaxed ${
                  D ? 'border-gray-600 bg-gray-800/50 text-gray-200' : 'border-gray-300 bg-white text-gray-800'
                }`}>
                  {q && box.hasGap && (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 align-middle ${
                      D ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'
                    }`}>{q.number}</span>
                  )}
                  {box.hasGap ? (
                    <>
                      {parts[0]}
                      <span className="inline-flex items-center gap-1 mx-1" style={{ verticalAlign: 'middle' }}>
                        <input
                          value={val}
                          readOnly={reviewMode}
                          onChange={e => !reviewMode && q && onAnswer(q.id, e.target.value)}
                          placeholder={q ? String(q.number) : ''}
                          className={`border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-sky-400 transition ${
                            rr
                              ? rr.is_correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
                              : D ? 'bg-gray-700 border-gray-500 text-gray-100' : 'bg-white border-gray-400 text-gray-800'
                          }`}
                          style={{ width: 140, height: 32, paddingLeft: 6, paddingRight: 6 }}
                        />
                        {rr && !rr.is_correct && <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>}
                        {q && !reviewMode && (
                          <button type="button" onClick={e => { e.stopPropagation(); toggleBookmark?.(q.id, e) }} disabled={bmLoading}
                            className={`inline-flex items-center transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <Bookmark size={20} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
                          </button>
                        )}
                      </span>
                      {parts.slice(1).join('___')}
                    </>
                  ) : (
                    <span className={D ? 'text-gray-300' : 'text-gray-700'}>{box.text}</span>
                  )}
                  {q && !box.hasGap && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
                        D ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'
                      }`}>{q.number}</span>
                      <input
                        value={val}
                        readOnly={reviewMode}
                        onChange={e => !reviewMode && onAnswer(q.id, e.target.value)}
                        placeholder="Write your answer..."
                        className={`flex-1 border rounded-lg text-sm px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-400 transition ${
                          rr
                            ? rr.is_correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
                            : D ? 'bg-gray-700 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      />
                      {rr && !rr.is_correct && <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>}
                      {!reviewMode && (
                        <button type="button" onClick={e => { e.stopPropagation(); toggleBookmark?.(q.id, e) }} disabled={bmLoading}
                          className={`inline-flex items-center transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <Bookmark size={20} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
                        </button>
                      )}
                    </div>
                  )}
                  {q && reviewMode && showCorrectInReview && rr && (
                    <div className={`mt-2 text-xs rounded-lg px-2 py-1.5 border ${rr.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                      <span className="font-semibold">Your: </span>{String(rr.user_answer ?? '').trim() || 'N/A'}
                      {!rr.is_correct && <><span className="mx-1">|</span><span className="text-base font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// -- QuestionList with grouped rendering ---------------------------------------
function QuestionList({
  questions,
  answers,
  setAnswer,
  activeQ,
  setActiveQ,
  qCard,
  D,
  textMain,
  toggleBookmark,
  bookmarkedIds,
  bookmarkLoading,
  reviewMode,
  showCorrectInReview,
  reviewMap,
  questionRefs,
  isAnswered,
}) {
  const segments = groupSegments(questions)

  const sharedProps = {
    answers,
    onAnswer: (qId, v) => setAnswer(qId, v),
    dark: D,
    reviewMode,
    reviewMap,
    showCorrectInReview,
    toggleBookmark,
    bookmarkedIds,
    bookmarkLoading,
  }

  return (
    <div className="space-y-3">
      {segments.map((seg, si) => {
        const prevSeg = si > 0 ? segments[si - 1] : null
        const currentType = seg.type === 'card' ? (seg.questions[0]?.question_type || 'card') : seg.type
        const prevType = prevSeg
          ? (prevSeg.type === 'card' ? (prevSeg.questions[0]?.question_type || 'card') : prevSeg.type)
          : null
        const currentGi = seg.questions[0]?.group_instruction || ''
        const prevGi = prevSeg?.questions?.[0]?.group_instruction || ''
        const isTypeBreak = si > 0 && (currentType !== prevType || currentGi !== prevGi)
        const sectionGapClass = isTypeBreak ? 'mt-10' : ''

        // -- Inline gap block (NOTE / SUMM) ----------------------------------
        if (seg.type === 'inline') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <InlineGapBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // -- Table gap block -------------------------------------------------
        if (seg.type === 'table') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <TableGapBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // -- Match grid block (MEND / MINFO) ---------------------------------
        if (seg.type === 'grid') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <MatchGridBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // -- MFEAT block (legend + per-row dropdown) --------------------------
        if (seg.type === 'mfeat') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <MFeatBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // -- Flow chart block ------------------------------------------------
        if (seg.type === 'flow') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <FlowBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // -- Single card -----------------------------------------------------
        const q = seg.questions[0]
        const i = questions.indexOf(q)
        const isBookmarked = bookmarkedIds.has(q.id)
        const bmLoading = bookmarkLoading.has(q.id)
        const readOnly = reviewMode
        const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null

        // Show group instruction once (for MCQ/MULTI/TFNG blocks etc.)
        const showGI = q.group_instruction && (i === 0 || questions[i - 1]?.group_instruction !== q.group_instruction)

        return (
          <div key={q.id} className={sectionGapClass}>
            {showGI && <GroupInstruction text={q.group_instruction} dark={D} />}
            {showGI && q.group_list?.length > 0 && <GroupList items={q.group_list} dark={D} />}
            <div
              id={`lq-${q.id}`}
              ref={el => { questionRefs.current[q.id] = el }}
              onClick={() => setActiveQ(i)}
              className={`group relative w-full p-4 cursor-pointer transition rounded-2xl ${qCard()}`}
            >
              <div className="w-full flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-base font-black ${
                    D ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'
                  }`}>
                    {q.number}
                  </span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded-md border ${D ? 'bg-gray-700 text-gray-200 border-gray-500' : 'bg-gray-50 text-gray-800 border-gray-300'}`}>
                    {q.question_type_display || q.question_type}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  {isAnswered(q.id) && <CheckCircle2 size={13} className="text-green-500" />}
                </div>
              </div>

              {q.content && (
                <p className={`text-lg leading-snug ${textMain}`}>
                  {q.content}
                  {!reviewMode && (
                    <button type="button" onClick={e => toggleBookmark(q.id, e)} disabled={bmLoading}
                      className={`inline-flex items-center transition ml-1 ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <Bookmark size={17} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
                    </button>
                  )}
                </p>
              )}
              {!q.content && !reviewMode && (
                <button type="button" onClick={e => toggleBookmark(q.id, e)} disabled={bmLoading}
                  className={`inline-flex items-center transition mb-1 ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <Bookmark size={14} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
                </button>
              )}
              {q.image && <img src={q.image} alt="" className="mt-2 rounded-xl max-h-48 object-contain border" />}

              {/* TFNG */}
              {q.question_type === 'TFNG' && (
                <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} dark={D} readOnly={readOnly} isYNNG={false} />
              )}
              {q.question_type === 'YNNG' && (
                <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} dark={D} readOnly={readOnly} isYNNG={true} />
              )}
              {/* MCQ */}
              {q.question_type === 'MCQ' && q.choices?.length > 0 && (
                <MCQInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} readOnly={readOnly} />
              )}
              {/* MULTI */}
              {q.question_type === 'MULTI' && q.choices?.length > 0 && (
                <MultiSelectInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} maxSelections={q.max_selections || 2} dark={D} readOnly={readOnly} />
              )}
              {/* MATCH with choices > MCQ style */}
              {['MATCH'].includes(q.question_type) && q.choices?.length > 0 && (
                <MCQInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} readOnly={readOnly} />
              )}
              {/* Text inputs */}
              {q.question_type === 'SHORT' && !(/\[\d+\]/.test(q.group_instruction || '')) && (
                <TextInput
                  value={answers[String(q.id)] || ''}
                  onChange={v => setAnswer(q.id, v)}
                  placeholder={String(q.number)}
                  dark={D}
                  readOnly={readOnly}
                  compact
                />
              )}
              {['GAP', 'MAP', 'SENT', 'FLOW', 'TABLE', 'NOTE', 'SUMM'].includes(q.question_type) && !(/\[\d+\]/.test(q.group_instruction || '')) && (
                <TextInput
                  value={answers[String(q.id)] || ''}
                  onChange={v => setAnswer(q.id, v)}
                  placeholder={String(q.number)}
                  dark={D}
                  readOnly={readOnly}
                  compact
                />
              )}
              {['MATCH'].includes(q.question_type) && !q.choices?.length && (
                <TextInput
                  value={answers[String(q.id)] || ''}
                  onChange={v => setAnswer(q.id, v.toUpperCase())}
                  placeholder={String(q.number)}
                  dark={D}
                  readOnly={readOnly}
                  compact
                />
              )}

              {/* Review result */}
              {rr && (
                <div className={`mt-2 text-base rounded-lg px-3 py-2 border ${rr.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <span className="font-semibold">Your: </span>{String(rr.user_answer ?? '').trim() || 'N/A'}
                  {!rr.is_correct && <><span className="mx-2">|</span><span className="text-base font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}



