import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight,
  AlertTriangle, X, CheckCircle2, Flag, Coffee, Play, Pause,
  Calculator, FileText, MoreHorizontal,
} from 'lucide-react'
import katex from 'katex'
import api from '../../api/client'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// ── LaTeX renderer ────────────────────────────────────────────────────────────
function renderMath(html) {
  if (!html) return ''
  let out = String(html)
  // Block math: \[...\] and $$...$$
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<span class="text-red-500 text-xs">[math]</span>` }
  })
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<span class="text-red-500 text-xs">[math]</span>` }
  })
  // Inline math: \(...\) and $...$
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { throwOnError: false }) }
    catch { return `<span class="text-red-500 text-xs">[math]</span>` }
  })
  out = out.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { throwOnError: false }) }
    catch { return _ }
  })
  return out
}

// ── Passage renderer — supports HTML (underline, bold, table) + plain text ────
function PassageContent({ text }) {
  if (!text) return null

  const hasHtml = /<[a-z][\s\S]*>/i.test(text)

  if (hasHtml) {
    return (
      <div
        className="text-[15px] leading-[1.75] text-gray-800 font-serif selection:bg-yellow-200
          [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm
          [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_th]:text-left
          [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
          [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-1"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(text)) }}
      />
    )
  }

  const lines = text.split('\n')
  return (
    <div className="text-[15px] leading-[1.75] text-gray-800 font-serif selection:bg-yellow-200">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-2" />
        if (trimmed.startsWith('•') || (trimmed.startsWith('-') && trimmed.length > 1)) {
          return (
            <div key={i} className="flex gap-2 my-1 ml-3">
              <span className="flex-shrink-0 mt-1 text-gray-500 text-xs">•</span>
              <span>{trimmed.replace(/^[•\-]\s*/, '')}</span>
            </div>
          )
        }
        return <p key={i} className="mb-2">{trimmed}</p>
      })}
    </div>
  )
}

// ── Table renderer ────────────────────────────────────────────────────────────
function TableView({ tableData }) {
  if (!Array.isArray(tableData) || tableData.length === 0) return null
  return (
    <div className="overflow-x-auto my-4 border border-black bg-white">
      <table className="w-full border-collapse text-[14.5px]">
        <tbody>
          {tableData.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? 'bg-white' : 'bg-white'}>
              {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                ri === 0 ? (
                  <th
                    key={ci}
                    className="border border-black px-4 py-3 font-bold text-left text-black whitespace-nowrap"
                  >
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(String(cell ?? ''))) }} />
                  </th>
                ) : (
                  <td key={ci} className="border border-black px-4 py-3 text-black">
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(String(cell ?? ''))) }} />
                  </td>
                )
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Desmos Calculator ─────────────────────────────────────────────────────────
const DESMOS_API_KEY = import.meta.env.VITE_DESMOS_API_KEY
const DESMOS_SCRIPT_URL = DESMOS_API_KEY
  ? `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${DESMOS_API_KEY}`
  : null

function DesmosCalculator({ open, onClose }) {
  const containerRef = useRef(null)
  const calcRef = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, initX: 0, initY: 0 })
  const panelRef = useRef(null)

  // Default position: right side of screen
  const [pos, setPos] = useState(() => ({
    x: Math.max(0, window.innerWidth - 680),
    y: 60,
  }))
  const [size, setSize] = useState({ w: 640, h: 440 })

  // Load Desmos script once
  useEffect(() => {
    if (!DESMOS_SCRIPT_URL) return
    if (document.querySelector(`script[src*="desmos.com/api"]`)) return
    const script = document.createElement('script')
    script.src = DESMOS_SCRIPT_URL
    script.async = true
    document.head.appendChild(script)
  }, [])

  // Init / destroy calculator when open changes
  useEffect(() => {
    if (!open) {
      if (calcRef.current) {
        try { calcRef.current.destroy() } catch {}
        calcRef.current = null
      }
      return
    }

    const tryInit = () => {
      if (window.Desmos && containerRef.current && !calcRef.current) {
        calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
          keypad: true,
          expressions: true,
          settingsMenu: true,
          zoomButtons: true,
          border: false,
        })
      }
    }

    if (window.Desmos) {
      tryInit()
    } else {
      // Wait for script to load
      const interval = setInterval(() => {
        if (window.Desmos) { clearInterval(interval); tryInit() }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [open])

  // Resize calculator when panel size changes
  useEffect(() => {
    if (calcRef.current && open) {
      try { calcRef.current.resize() } catch {}
    }
  }, [size, open])

  // Drag logic
  const onMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y,
    }
    e.preventDefault()
  }, [pos])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current.dragging) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - size.w, dragRef.current.initX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragRef.current.initY + dy)),
      })
    }
    const onUp = () => { dragRef.current.dragging = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [size.w])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        zIndex: 9999,
        userSelect: 'none',
      }}
      className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col bg-white"
    >
      {/* Drag handle / title bar */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white cursor-move select-none flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-sky-400" />
          <span className="text-xs font-bold tracking-wide">Desmos Graphing Calculator</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Size presets */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setSize({ w: 480, h: 360 })}
            className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
          >Small</button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setSize({ w: 640, h: 440 })}
            className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
          >Medium</button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setSize({ w: 860, h: 560 })}
            className="text-[10px] text-gray-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
          >Large</button>
          <div className="w-px h-3 bg-white/20 mx-1" />
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-white hover:bg-red-500/80 transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Calculator container */}
      <div
        ref={containerRef}
        style={{ width: size.w, height: size.h }}
      />
    </div>
  )
}

// ── Timer Hook (with localStorage persistence) ────────────────────────────
function useTimer(initialSeconds, onExpire, storageKey) {
  const [seconds, setSeconds] = useState(() => {
    if (!storageKey || !initialSeconds) return initialSeconds || 0
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { expiresAt } = JSON.parse(saved)
        const remaining = Math.round((expiresAt - Date.now()) / 1000)
        if (remaining > 0 && remaining <= initialSeconds) return remaining
      }
    } catch {}
    return initialSeconds
  })
  const [running, setRunning] = useState(true)
  const [hidden, setHidden] = useState(false)

  // When module changes (new attempt or new module), reset timer
  useEffect(() => {
    if (!initialSeconds) return
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const { expiresAt } = JSON.parse(saved)
          const remaining = Math.round((expiresAt - Date.now()) / 1000)
          if (remaining > 0 && remaining <= initialSeconds) {
            setSeconds(remaining)
            setRunning(true)
            return
          }
        }
      } catch {}
      // No valid saved state — start fresh and persist
      localStorage.setItem(storageKey, JSON.stringify({ expiresAt: Date.now() + initialSeconds * 1000 }))
    }
    setSeconds(initialSeconds)
    setRunning(true)
  }, [storageKey])

  // Tick every second and update localStorage
  useEffect(() => {
    if (!running || seconds <= 0) {
      if (seconds <= 0 && onExpire) onExpire()
      return
    }
    const id = setInterval(() => {
      setSeconds((s) => {
        const next = s - 1
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify({ expiresAt: Date.now() + next * 1000 }))
          } catch {}
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, seconds, storageKey])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (storageKey) localStorage.removeItem(storageKey)
    }
  }, [storageKey])

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return { seconds, formatted: fmt(seconds), running, setRunning, hidden, setHidden }
}

// ── Anti-cheat Hook ────────────────────────────────────────────────────────
function useAntiCheat(attemptId, onForceSubmitRef) {
  const storageKey = `sat-anticheat-${attemptId}`
  const exitCount = useRef(0)
  const lastExitTime = useRef(0)
  const [warning, setWarning] = useState(null)

  const logEvent = useCallback((type) => {
    api.post(`/sat/attempt/${attemptId}/security/`, {
      event_type: type, timestamp: new Date().toISOString(),
    }).catch(() => {})
  }, [attemptId])

  // Restore violation count from localStorage on mount
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(storageKey) || '0', 10)
      if (Number.isFinite(saved) && saved > 0) {
        exitCount.current = saved
        // Already used all 3 chances — auto-submit immediately
        if (saved >= 3) {
          setWarning({ level: 'fatal', text: "Your test has been submitted. You left the testing environment." })
          setTimeout(() => onForceSubmitRef.current?.(), 800)
        }
      }
    } catch {}
  }, [storageKey, onForceSubmitRef])

  const handleExit = useCallback(() => {
    // Debounce: visibilitychange + fullscreenchange can both fire on refresh — only count once
    const now = Date.now()
    if (now - lastExitTime.current < 1000) return
    lastExitTime.current = now

    exitCount.current += 1
    const n = exitCount.current
    try { localStorage.setItem(storageKey, String(n)) } catch {}
    logEvent('TAB_SWITCH')

    if (n === 1) {
      setWarning({ level: 'warn', text: "Warning 1: You left the test environment. You have 2 attempts remaining." })
    } else if (n === 2) {
      setWarning({ level: 'danger', text: "Warning 2: 1 attempt remaining. The test will automatically submit next time!" })
    } else {
      setWarning({ level: 'fatal', text: "Your test has been submitted. You left the test environment." })
      setTimeout(() => onForceSubmitRef.current?.(), 1500)
      return
    }
    setTimeout(() => setWarning(null), 6000)
  }, [logEvent, storageKey, onForceSubmitRef])

  // Clear violations from localStorage when test is successfully submitted
  const clearViolations = useCallback(() => {
    try { localStorage.removeItem(storageKey) } catch {}
  }, [storageKey])

  useEffect(() => {
    // Fullscreen enter on mount
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})

    const handleVisibility = () => { if (document.hidden) handleExit() }
    const handleFullscreen = () => { if (!document.fullscreenElement) handleExit() }
    const blockKeys = (e) => {
      if (e.ctrlKey && ['c', 'v', 'a', 'u', 'p', 's'].includes(e.key.toLowerCase())) e.preventDefault()
      if (e.key === 'F12') e.preventDefault()
    }
    const blockCopy = (e) => e.preventDefault()

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreen)
    document.addEventListener('keydown', blockKeys)
    document.addEventListener('copy', blockCopy)
    document.addEventListener('contextmenu', (e) => e.preventDefault())

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('fullscreenchange', handleFullscreen)
      document.removeEventListener('keydown', blockKeys)
      document.removeEventListener('copy', blockCopy)
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
    }
  }, [handleExit])

  return { warning, clearViolations }
}

// ── Highlight Toolbar ──────────────────────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: '#FDE68A' },
  { id: 'pink',   bg: '#FBCFE8' },
  { id: 'green',  bg: '#BBF7D0' },
]

function HighlightToolbar({ pos, onColor, onClose }) {
  if (!pos) return null
  return (
    <div
      className="fixed z-[200] flex items-center gap-1 bg-white border border-gray-300 rounded-md shadow-lg px-2.5 py-1.5"
      style={{ top: pos.y - 48, left: Math.max(8, pos.x - 80) }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Pencil icon */}
      <span className="text-[13px] text-gray-500 mr-1">✏️</span>
      {/* Color circles */}
      {HIGHLIGHT_COLORS.map(c => (
        <button
          key={c.id}
          onClick={() => onColor(c.bg)}
          className="w-5 h-5 rounded-full border border-gray-300 hover:scale-125 transition-transform shadow-sm"
          style={{ backgroundColor: c.bg }}
        />
      ))}
      <div className="w-px h-3.5 bg-gray-200 mx-1" />
      {/* Underline */}
      <button onClick={() => onColor('transparent')} className="text-[11px] underline text-gray-500 hover:text-gray-800 font-bold px-0.5">U</button>
      {/* Strikethrough */}
      <button onClick={() => onColor('strikethrough')} className="text-[11px] line-through text-gray-500 hover:text-gray-800 font-bold px-0.5">S</button>
      <div className="w-px h-3.5 bg-gray-200 mx-1" />
      {/* Remove */}
      <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-[12px] font-bold px-0.5">✕</button>
    </div>
  )
}

// ── Question Navigator — exact Bluebook popup ─────────────────────────────
function QuestionNavigator({
  questions, currentIdx, answers, bookmarks, onGoto, onClose, sectionLabel, moduleNum, onGoToReview,
}) {
  const [filter, setFilter] = useState('all')

  const filtered = questions.map((q, i) => ({ q, i })).filter(({ q, i }) => {
    if (filter === 'unanswered') return !answers[q.id]
    if (filter === 'review') return !!bookmarks[q.id]
    return true
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60]"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed bottom-[57px] left-1/2 -translate-x-1/2 z-[61] w-[420px] max-w-[96vw] bg-white shadow-xl border-2 border-gray-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-[13px] font-semibold text-gray-900">
            Section 1, Module {moduleNum}: {sectionLabel} Questions
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={14} />
          </button>
        </div>

        {/* Filter tabs — exact Bluebook */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-100">
          {[
            { key: 'all', label: 'Current', icon: <span className="text-[11px] text-gray-700">⊙</span> },
            { key: 'unanswered', label: 'Unanswered', icon: <span className="inline-block w-3 h-3 border border-dashed border-gray-500" /> },
            {
              key: 'review',
              label: 'For Review',
              icon: <Bookmark size={12} className="text-red-600 fill-red-600" />,
            },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-1.5 text-[12px] font-medium pb-1.5 border-b-2 transition-colors ${
                filter === key
                  ? 'border-gray-800 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Grid — 10 per row, exact Bluebook */}
        <div className="p-4 max-h-[240px] overflow-y-auto">
          <div className="grid grid-cols-10 gap-1.5">
            {filtered.map(({ q, i }) => {
              const isAnswered = !!answers[q.id]
              const isBookmarked = bookmarks[q.id]
              const isCurrent = i === currentIdx
              return (
                <button
                  key={q.id}
                  onClick={() => { onGoto(i); onClose() }}
                  className="relative flex flex-col items-center"
                >
                  <span className={`relative w-8 h-8 flex items-center justify-center text-[12px] font-bold border-2 transition-colors ${
                    isCurrent
                      ? 'border-gray-900 bg-white text-gray-900'
                      : isAnswered
                      ? 'border-[#1a5dc8] bg-[#1a5dc8] text-white'
                      : 'border-dashed border-gray-400 bg-white text-gray-500 hover:border-gray-700'
                  }`}>
                    {/* For review bookmark — top-right like Bluebook */}
                    {isBookmarked && (
                      <span className="absolute -top-1 -right-1">
                        <Bookmark size={12} className="text-red-600 fill-red-600" />
                      </span>
                    )}
                    {/* Current indicator dot inside (top-left) */}
                    {isCurrent && (
                      <span className="absolute -top-1 -left-1 text-[9px] text-gray-700">⊙</span>
                    )}
                    {i + 1}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[12px] text-gray-400">{Object.keys(answers).length} of {questions.length} answered</span>
          <button
            onClick={() => {
              onClose()
              onGoToReview?.()
            }}
            className="px-4 py-1.5 bg-[#1a5dc8] text-white text-[12px] font-semibold rounded hover:bg-blue-700 transition-colors"
          >
            Go to Review Page
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Break Screen ───────────────────────────────────────────────────────────
function BreakScreen({ onContinue }) {
  const [secs, setSecs] = useState(10 * 60) // 10 minutes
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (secs <= 0 || skipped) return
    const id = setInterval(() => setSecs((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [secs, skipped])

  useEffect(() => {
    if (secs <= 0) onContinue()
  }, [secs])

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md px-6"
      >
        <div className="w-20 h-20 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-6">
          <Coffee size={40} className="text-sky-400" />
        </div>
        <h2 className="text-3xl font-black mb-3">Break Time</h2>
        <p className="text-slate-400 text-base mb-8 leading-relaxed">
          Excellent work on the English section! Take a 10-minute break.
          <br />Math section begins after the break.
        </p>

        {/* Countdown */}
        <div className="bg-white/10 rounded-2xl px-8 py-5 mb-8 inline-block">
          <div className="text-5xl font-black tabular-nums text-sky-400">{mm}:{ss}</div>
          <div className="text-sm text-slate-400 mt-1">remaining</div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-xl bg-sky-500 text-white font-black text-lg hover:bg-sky-600 transition-colors"
          >
            Skip Break → Start Math
          </button>
          <p className="text-xs text-slate-500">
            Break will end automatically when timer reaches 0:00
          </p>
        </div>

        {/* What's next */}
        <div className="mt-8 grid grid-cols-2 gap-3 text-left">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-400 uppercase mb-1">Completed</div>
            <div className="font-bold text-white">English</div>
            <div className="text-xs text-slate-400">Module 1 + Module 2</div>
          </div>
          <div className="bg-sky-500/20 border border-sky-500/30 rounded-xl p-4">
            <div className="text-xs font-bold text-sky-400 uppercase mb-1">Up Next</div>
            <div className="font-bold text-white">Math</div>
            <div className="text-xs text-slate-400">Module 1 + Module 2</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function CheckYourWorkPanel({ questions, answers, bookmarks, onGoto, sectionLabel, moduleNum }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10 pb-28">
        <div className="text-center mb-7">
          <h2 className="text-[40px] font-black tracking-tight text-gray-900">Check Your Work</h2>
          <p className="text-gray-500 text-[15px] mt-2">
            Review your answers before moving to the next module.
          </p>
        </div>

        <div className="border border-gray-200 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="text-[20px] font-bold text-gray-900">
              Section 1, Module {moduleNum}: {sectionLabel}
            </h3>
            <div className="flex items-center gap-5 text-[12px] font-medium text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 border border-dashed border-gray-500" />
                Unanswered
              </span>
              <span className="flex items-center gap-1.5">
                <Bookmark size={12} className="text-red-600 fill-red-600" />
                For Review
              </span>
            </div>
          </div>

          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, i) => {
              const isAnswered = !!answers[q.id]
              const isBookmarked = !!bookmarks[q.id]
              return (
                <button
                  key={q.id}
                  onClick={() => onGoto(i)}
                  className={`relative mx-auto w-8 h-8 border text-[12px] font-semibold transition-colors ${
                    isAnswered
                      ? 'border-[#1a5dc8] bg-[#1a5dc8] text-white hover:bg-blue-700'
                      : 'border-dashed border-gray-400 text-gray-600 hover:border-gray-600'
                  }`}
                >
                  {i + 1}
                  {isBookmarked && (
                    <span className="absolute -top-1.5 -right-1.5">
                      <Bookmark size={12} className="text-red-600 fill-red-600" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Module Progress Indicator ──────────────────────────────────────────────
function ModuleProgress({ section, moduleNum }) {
  // 4 steps: ENG M1, ENG M2, MATH M1, MATH M2
  const steps = [
    { label: 'English M1', active: section === 'ENGLISH' && moduleNum === 1 },
    { label: 'English M2', active: section === 'ENGLISH' && moduleNum === 2 },
    { label: 'Math M1', active: section === 'MATH' && moduleNum === 1 },
    { label: 'Math M2', active: section === 'MATH' && moduleNum === 2 },
  ]
  const activeIdx = steps.findIndex((s) => s.active)

  return (
    <div className="hidden md:flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1">
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
            i < activeIdx ? 'bg-green-100 text-green-700' :
            i === activeIdx ? 'bg-sky-500 text-white' :
            'bg-gray-100 text-gray-400'
          }`}>
            {i < activeIdx && <CheckCircle2 size={10} />}
            {step.label}
          </div>
          {i < 3 && <ChevronRight size={10} className="text-gray-300" />}
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SATTestAttempt() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const currentIdx = parseInt(searchParams.get('q') ?? '0', 10)
  const setCurrentIdx = useCallback((v) => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p)
      const next = typeof v === 'function' ? v(parseInt(p.get('q') ?? '0', 10)) : v
      n.set('q', String(next))
      return n
    }, { replace: true })
  }, [setSearchParams])
  const [answers, setAnswers] = useState({})
  const [bookmarks, setBookmarks] = useState({})
  const [eliminated, setEliminated] = useState({})
  const [reviewMode, setReviewMode] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)
  const [calcOpen, setCalcOpen] = useState(false)
  const [phase, setPhase] = useState('exam') // 'exam' | 'break'
  const [submitting, setSubmitting] = useState(false)
  const [highlightPos, setHighlightPos] = useState(null)
  const [showExitWarning, setShowExitWarning] = useState(false)
  const [forceExiting, setForceExiting] = useState(false)
  const questionStartTime = useRef(Date.now())
  const forceSubmitRef = useRef(null)

  // ── Resizable split divider ──────────────────────────────────────────────
  const SPLIT_KEY = 'sat-attempt-split-pct-v1'
  const [splitPct, setSplitPct] = useState(() => {
    try { const v = parseFloat(sessionStorage.getItem(SPLIT_KEY)); if (Number.isFinite(v)) return Math.min(70, Math.max(25, v)) } catch {}
    return 48
  })
  const dividerDrag = useRef({ active: false, startX: 0, startPct: 48 })
  const containerRef = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      if (!dividerDrag.current.active) return
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const delta = clientX - dividerDrag.current.startX
      const pct = Math.min(70, Math.max(25, dividerDrag.current.startPct + (delta / rect.width) * 100))
      setSplitPct(pct)
      try { sessionStorage.setItem(SPLIT_KEY, String(pct)) } catch {}
    }
    const onUp = () => { dividerDrag.current.active = false; document.body.style.cursor = '' ; document.body.style.userSelect = '' }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  // Block browser back button
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const handlePop = () => {
      window.history.pushState(null, '', window.location.href)
      setShowExitWarning(true)
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  // Block tab close / refresh
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sat-attempt', attemptId],
    queryFn: () => api.get(`/sat/attempt/${attemptId}/`).then((r) => r.data),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const module = data?.module
  const isUntimed = searchParams.get('untimed') === '1'
  const timeLimitSecs = isUntimed ? 99 * 60 * 60 : (module?.time_limit ? module.time_limit * 60 : 35 * 60)

  const handleTimeExpire = useCallback(() => {
    if (!isUntimed) forceSubmitRef.current?.()
  }, [isUntimed])

  const timerKey = module?.id ? `sat-timer-${attemptId}-${module.id}` : null
  const timer = useTimer(timeLimitSecs, handleTimeExpire, timerKey)
  const { warning, clearViolations } = useAntiCheat(attemptId, forceSubmitRef)

  const answerMutation = useMutation({
    mutationFn: (payload) => api.post(`/sat/attempt/${attemptId}/answer/`, payload),
  })

  const questions = data?.questions || []
  const currentQuestion = questions[currentIdx]
  const answeredCount = Object.keys(answers).length

  // Sync answers from server on data load
  useEffect(() => {
    if (!data?.questions) return
    const initial = {}
    const initBm = {}
    data.questions.forEach((q) => {
      if (q.answered) initial[q.id] = q.answered
      if (q.is_bookmarked) initBm[q.id] = true
    })
    setAnswers((prev) => ({ ...initial, ...prev }))
    setBookmarks((prev) => ({ ...initBm, ...prev }))
    setEliminated({})
    setCurrentIdx(0)
    setReviewMode(false)
  }, [data?.module?.id])

  // Reset timer when module changes (skip if untimed)
  useEffect(() => {
    if (module?.time_limit && !isUntimed) {
      timer.setRunning(false)
      setTimeout(() => timer.setRunning(true), 100)
    }
  }, [module?.id])

  const handleAnswer = useCallback((value) => {
    if (!currentQuestion) return
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000)
    answerMutation.mutate({
      question_id: currentQuestion.id,
      answer: value,
      time_spent: timeSpent,
      is_bookmarked: bookmarks[currentQuestion.id] || false,
    })
  }, [currentQuestion, bookmarks, answerMutation])

  const handleBookmark = useCallback(() => {
    if (!currentQuestion) return
    setBookmarks((prev) => {
      const val = !prev[currentQuestion.id]
      if (answers[currentQuestion.id]) {
        answerMutation.mutate({
          question_id: currentQuestion.id,
          answer: answers[currentQuestion.id],
          time_spent: 0,
          is_bookmarked: val,
        })
      }
      return { ...prev, [currentQuestion.id]: val }
    })
  }, [currentQuestion, answers, answerMutation])

  const goTo = (idx) => {
    questionStartTime.current = Date.now()
    setCurrentIdx(idx)
  }

  const goNext = () => {
    if (currentIdx < questions.length - 1) {
      goTo(currentIdx + 1)
      return
    }
    setReviewMode(true)
  }
  const goPrev = () => { if (currentIdx > 0) goTo(currentIdx - 1) }

  const toggleEliminate = useCallback((questionId, option) => {
    if (!questionId || !option) return
    setEliminated((prev) => {
      const q = prev[questionId] || {}
      const nextVal = !q[option]
      return { ...prev, [questionId]: { ...q, [option]: nextVal } }
    })
  }, [])

  const handleSubmitModule = useCallback(async () => {
    setSubmitting(true)
    // Wait for any in-flight answer save to complete before submitting
    if (answerMutation.isPending) {
      await new Promise((resolve) => setTimeout(resolve, 800))
    }
    try {
      const res = await api.post(`/sat/attempt/${attemptId}/submit-module/`)
      const { next, result_id, attempt_id } = res.data

      if (next === 'finished') {
        clearViolations()
        navigate(`/app/sat/result/${result_id}`, { replace: true })
      } else if (next === 'module_done') {
        clearViolations()
        navigate(`/app/sat/module-result/${attempt_id}`, { replace: true })
      } else if (next === 'break') {
        setPhase('break')
        setSubmitting(false)
      } else {
        // Next module loaded — refetch data
        await refetch()
        setAnswers({})
        setBookmarks({})
        setCurrentIdx(0)
        setSubmitting(false)
      }
    } catch {
      setSubmitting(false)
    }
  }, [attemptId, navigate, refetch, answerMutation.isPending, clearViolations])

  // Keep forceSubmitRef in sync so useAntiCheat can call it safely
  forceSubmitRef.current = handleSubmitModule

  const handleBreakEnd = useCallback(async () => {
    setPhase('exam')
    await refetch()
    setAnswers({})
    setBookmarks({})
    setCurrentIdx(0)
  }, [refetch])

  // Force-finish: submit everything and go straight to results
  const handleForceExit = useCallback(async () => {
    setForceExiting(true)
    try {
      const res = await api.post(`/sat/attempt/${attemptId}/force-finish/`)
      clearViolations()
      navigate(`/app/sat/result/${res.data.result_id}`, { replace: true })
    } catch {
      setForceExiting(false)
      setShowExitWarning(false)
    }
  }, [attemptId, navigate, clearViolations])

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500 text-sm">
      Failed to load test. Please refresh.
    </div>
  )

  // Break screen
  if (phase === 'break') {
    return <BreakScreen onContinue={handleBreakEnd} />
  }

  const isLowTime = timer.seconds < 300
  const sectionLabel = module?.section === 'MATH' ? 'Math' : 'Reading & Writing'
  const hasLeftContent = !!currentQuestion?.passage ||
    (Array.isArray(currentQuestion?.table_data) && currentQuestion.table_data.length > 0) ||
    !!currentQuestion?.image
  // Math questions always use single-column layout (passage/table shown above question)
  const isSplit = hasLeftContent && module?.section !== 'MATH'

  return (
    <div className="min-h-screen bg-white flex flex-col"
      onMouseDown={(e) => { if (e.detail >= 3) e.preventDefault() }}>  {/* block triple-click select-all */}

      {/* Exit warning */}
      {(showExitWarning || forceExiting) && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
            {forceExiting ? (
              <>
                <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="font-bold text-gray-900">Finishing your test...</p>
                <p className="text-sm text-gray-400 mt-1">Please wait</p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={28} className="text-amber-500" />
                </div>
                <h3 className="text-xl font-black mb-2 text-gray-900">Leave Test?</h3>
                <p className="text-gray-500 text-sm mb-6 leading-relaxed">
                  Your test is still in progress. You can return to continue, or submit now and view your results immediately. Unanswered questions will be marked as <strong>Omitted</strong>.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setShowExitWarning(false)}
                    className="w-full py-3 rounded-xl bg-[#1a5dc8] text-white font-bold hover:bg-blue-700 transition-colors"
                  >
                    Return to Test
                  </button>
                  <button
                    onClick={handleForceExit}
                    className="w-full py-3 rounded-xl border-2 border-red-400 text-red-600 font-bold hover:bg-red-50 transition-colors"
                  >
                    Submit & Exit → View Results
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Anti-cheat warning */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm`}
          >
            <div className={`max-w-md w-full mx-4 rounded-2xl shadow-2xl p-7 text-center ${
              warning.level === 'fatal' ? 'bg-red-700' :
              warning.level === 'danger' ? 'bg-orange-600' : 'bg-yellow-500'
            }`}>
              <AlertTriangle size={36} className="text-white mx-auto mb-3" />
              <p className="text-white font-black text-lg">{warning.text}</p>
              {warning.level !== 'fatal' && (
                <button
                  className="mt-5 px-6 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-colors"
                  onClick={() => {
                    const el = document.documentElement
                    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
                  }}
                >
                  Return to Test
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOP BAR — exact Bluebook ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 sticky top-0 z-20">
        {/* Row 1: Section name | Timer | Tools */}
        <div className="flex items-center h-[48px] px-4 gap-2">
          {/* Left */}
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <span className="text-[13px] font-semibold text-gray-900 truncate">
              Section 1, Module {module?.number}: {sectionLabel}
            </span>
          </div>

          {/* Center: Timer */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {isUntimed ? (
              <span className="text-sm font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full">
                Untimed
              </span>
            ) : !timer.hidden ? (
              <span className={`text-[22px] font-bold tabular-nums tracking-tight ${isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}>
                {timer.formatted}
              </span>
            ) : (
              <span className="text-sm text-gray-400">Timer Hidden</span>
            )}
            {!isUntimed && (
              <button
                onClick={() => timer.setHidden((h) => !h)}
                className="text-[12px] font-medium text-gray-600 hover:text-gray-900 border border-gray-300 px-2.5 py-0.5 rounded hover:bg-gray-50 transition-colors"
              >
                {timer.hidden ? 'Show' : 'Hide'}
              </button>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {module?.section === 'MATH' && DESMOS_SCRIPT_URL && (
              <button
                onClick={() => setCalcOpen((o) => !o)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] font-medium transition-colors ${
                  calcOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calculator size={14} /> Calculator
              </button>
            )}
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              <FileText size={14} /> Reference
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] font-medium text-gray-600 hover:bg-gray-100 transition-colors">
              ✏️ Highlights &amp; Notes
            </button>
            <button className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── PRACTICE BANNER ── */}
      <div className="flex-shrink-0 bg-[#1a5dc8] text-white text-center py-[7px] text-[11.5px] font-bold tracking-[0.15em] uppercase z-10">
        THIS IS A PRACTICE TEST
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {reviewMode ? (
          <CheckYourWorkPanel
            questions={questions}
            answers={answers}
            bookmarks={bookmarks}
            onGoto={(idx) => {
              setReviewMode(false)
              goTo(idx)
            }}
            sectionLabel={sectionLabel}
            moduleNum={module?.number}
          />
        ) : isSplit ? (
          /* ── Split layout (passage / table / image on left) ── */
          <div ref={containerRef} className="flex-1 flex overflow-hidden">
            {/* Left: Passage / Table / Image */}
            <div className="overflow-y-auto border-r border-gray-200 bg-white" style={{ width: `${splitPct}%` }}
              onMouseUp={() => {
                const sel = window.getSelection()
                if (!sel || sel.isCollapsed) return
                const rect = sel.getRangeAt(0).getBoundingClientRect()
                setHighlightPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY })
              }}
            >
              <div className="p-6 pb-28 space-y-5">
                <AnimatePresence mode="wait">
                  <motion.div key={`left-${currentQuestion?.id}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }} className="space-y-4">
                    {currentQuestion.passage && (
                      <PassageContent text={currentQuestion.passage} />
                    )}
                    {Array.isArray(currentQuestion.table_data) && currentQuestion.table_data.length > 0 && (
                      <div className="overflow-x-auto border border-black bg-white">
                        <table className="w-full border-collapse text-[14.5px]">
                          <tbody>
                            {currentQuestion.table_data.map((row, ri) => (
                              <tr key={ri} className="bg-white">
                                {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                                  ri === 0
                                    ? (
                                      <th key={ci} className="border border-black px-4 py-3 font-bold text-left text-black whitespace-nowrap">
                                        {cell}
                                      </th>
                                    )
                                    : (
                                      <td key={ci} className="border border-black px-4 py-3 text-black">
                                        {cell}
                                      </td>
                                    )
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {currentQuestion.image && (
                      <img
                        src={currentQuestion.image}
                        alt="Question"
                        className="rounded-lg border border-gray-200 max-w-full object-contain"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            {/* Draggable divider */}
            <div
              className="relative flex-shrink-0 w-[5px] cursor-col-resize bg-gray-200 hover:bg-sky-400 active:bg-sky-500 transition-colors group select-none"
              onMouseDown={(e) => {
                e.preventDefault()
                dividerDrag.current = { active: true, startX: e.clientX, startPct: splitPct }
                document.body.style.cursor = 'col-resize'
                document.body.style.userSelect = 'none'
              }}
              onTouchStart={(e) => {
                dividerDrag.current = { active: true, startX: e.touches[0].clientX, startPct: splitPct }
              }}
              title="Drag to resize"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-[3px] opacity-40 group-hover:opacity-100 transition-opacity pointer-events-none">
                {[0,1,2,3,4].map(i => <div key={i} className="w-[3px] h-[3px] rounded-full bg-gray-600 group-hover:bg-sky-600" />)}
              </div>
            </div>
            {/* Right: Question */}
            <div className="overflow-y-auto bg-white" style={{ width: `${100 - splitPct}%` }}>
              <div className="p-6 pb-28">
                {/* Question header — exact Bluebook */}
                <div className="flex items-center gap-2.5 mb-4">
                  {/* Number box */}
                  <span className="w-8 h-8 border-2 border-gray-700 text-gray-900 text-[13px] font-bold flex items-center justify-center flex-shrink-0">
                    {currentIdx + 1}
                  </span>
                  {/* Mark for Review */}
                  <button onClick={handleBookmark}
                    className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors select-none ${
                      bookmarks[currentQuestion?.id] ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                    }`}>
                    <Flag
                      size={14}
                      className="transition-colors"
                      color={bookmarks[currentQuestion?.id] ? '#dc2626' : '#6b7280'}
                      fill={bookmarks[currentQuestion?.id] ? '#dc2626' : 'none'}
                    />
                    Mark for Review
                  </button>
                  {/* Spacer */}
                  <div className="flex-1 h-px bg-gray-200" />
                  {/* ABC tag */}
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-[#1a5dc8] text-white rounded-sm tracking-wide">
                    {module?.section === 'MATH' ? 'MATH' : 'RW'}
                  </span>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div key={currentQuestion?.id}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.15 }}>
                    <QuestionView question={currentQuestion} answer={answers[currentQuestion.id]}
                      onAnswer={handleAnswer}
                      onToggleEliminate={(opt) => toggleEliminate(currentQuestion?.id, opt)}
                      eliminatedMap={eliminated[currentQuestion?.id] || {}}
                      section={module?.section}
                      splitMode
                      onHighlight={setHighlightPos}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          /* ── Normal layout (no left panel content) ── */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-5 py-6 pb-24">
              {/* Question header — Bluebook style */}
              <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
                <span className="w-8 h-8 border-2 border-gray-700 text-gray-900 text-[13px] font-bold flex items-center justify-center flex-shrink-0">
                  {currentIdx + 1}
                </span>
                <button onClick={handleBookmark}
                  className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors select-none ${
                    bookmarks[currentQuestion?.id] ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  <Flag
                    size={14}
                    className="transition-colors"
                    color={bookmarks[currentQuestion?.id] ? '#dc2626' : '#6b7280'}
                    fill={bookmarks[currentQuestion?.id] ? '#dc2626' : 'none'}
                  />
                  Mark for Review
                </button>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] font-bold px-2 py-0.5 bg-[#1a5dc8] text-white rounded-sm tracking-wide">
                  {module?.section === 'MATH' ? 'MATH' : 'RW'}
                </span>
              </div>
              {/* Question content */}
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestion?.id}
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.15 }}>
                  {currentQuestion && <QuestionView question={currentQuestion} answer={answers[currentQuestion.id]}
                    onAnswer={handleAnswer}
                    onToggleEliminate={(opt) => toggleEliminate(currentQuestion?.id, opt)}
                    eliminatedMap={eliminated[currentQuestion?.id] || {}}
                    section={module?.section}
                    onHighlight={setHighlightPos}
                  />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM BAR — exact Bluebook ── */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white px-4 h-[57px] flex items-center justify-between z-20">
        {/* Left: user name */}
        <div className="text-[13px] font-medium text-gray-700 min-w-[140px]">
          {data?.user_name || 'Student'}
        </div>

        {/* Center: "Question X of Y ↑" pill — exact Bluebook */}
        <button
          onClick={() => setShowNavigator((v) => !v)}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white text-[13px] font-medium px-4 py-2 rounded-full transition-colors"
        >
          {reviewMode ? `${questions.length} of ${questions.length}` : `Question ${currentIdx + 1} of ${questions.length}`}
          <ChevronLeft
            size={13}
            className={`transition-transform duration-150 ${showNavigator ? 'rotate-[270deg]' : 'rotate-90'}`}
          />
        </button>

        {/* Right: Back + Next */}
        <div className="flex items-center gap-2 min-w-[140px] justify-end">
          <button
            onClick={reviewMode ? () => setReviewMode(false) : goPrev}
            disabled={reviewMode ? false : currentIdx === 0}
            className="px-5 py-[7px] border border-gray-400 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-30 transition-colors rounded"
          >
            Back
          </button>
          {!reviewMode ? (
            <button
              onClick={goNext}
              className="px-5 py-[7px] bg-[#1a5dc8] text-white text-[13px] font-medium hover:bg-blue-700 transition-colors rounded"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitModule}
              className="px-5 py-[7px] bg-[#1a5dc8] text-white text-[13px] font-medium hover:bg-blue-700 transition-colors rounded"
            >
              Next
            </button>
          )}
        </div>
      </div>

      {/* Question Navigator popup */}
      <AnimatePresence>
        {showNavigator && (
          <QuestionNavigator
            questions={questions}
            currentIdx={currentIdx}
            answers={answers}
            bookmarks={bookmarks}
            onGoto={(idx) => {
              setReviewMode(false)
              goTo(idx)
            }}
            onClose={() => setShowNavigator(false)}
            onGoToReview={() => setReviewMode(true)}
            sectionLabel={sectionLabel}
            moduleNum={module?.number}
          />
        )}
      </AnimatePresence>

      {/* Desmos Calculator — floating, draggable, Math only */}
      {module?.section === 'MATH' && DESMOS_SCRIPT_URL && (
        <DesmosCalculator open={calcOpen} onClose={() => setCalcOpen(false)} />
      )}

      {/* Highlight toolbar */}
      {highlightPos && (
        <HighlightToolbar
          pos={highlightPos}
          onColor={(color) => {
            const sel = window.getSelection()
            if (sel && !sel.isCollapsed) {
              const range = sel.getRangeAt(0)
              const span = document.createElement('span')
              span.style.backgroundColor = color
              span.dataset.highlight = 'true'
              try { range.surroundContents(span) }
              catch { const frag = range.extractContents(); span.appendChild(frag); range.insertNode(span) }
              sel.removeAllRanges()
            }
            setHighlightPos(null)
          }}
          onClose={() => {
            // Remove all highlights in selection area
            document.querySelectorAll('[data-highlight]').forEach(el => {
              const parent = el.parentNode
              while (el.firstChild) parent.insertBefore(el.firstChild, el)
              parent.removeChild(el)
            })
            setHighlightPos(null)
          }}
        />
      )}

      {/* Submitting overlay */}
      <AnimatePresence>
        {submitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="bg-white rounded-2xl px-10 py-8 text-center shadow-2xl">
              <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="font-bold text-gray-900">Submitting module...</p>
              <p className="text-sm text-gray-400 mt-1">Please wait</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Question View ──────────────────────────────────────────────────────────
function QuestionView({ question, answer, onAnswer, section, splitMode = false,
  eliminatedMap = {}, onToggleEliminate = () => {}, onHighlight }) {
  if (!question) return null

  const handleMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || !onHighlight) return
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    onHighlight({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY })
  }

  return (
    <div className="space-y-4" onMouseUp={handleMouseUp}>
      {/* Passage — only in non-split mode */}
      {!splitMode && question.passage && (
        <div className="bg-gray-50 p-5 border border-gray-200 text-sm text-gray-700 leading-relaxed max-h-72 overflow-y-auto">
          <PassageContent text={question.passage} />
        </div>
      )}

      {/* Table data — only in non-split mode */}
      {!splitMode && question.table_data && <TableView tableData={question.table_data} />}

      {/* Image — only in non-split mode */}
      {!splitMode && question.image && (
        <img src={question.image} alt="Question" className="border border-gray-200 max-h-44 object-contain" />
      )}

      {/* Math equation — shown centered above content */}
      {question.math_equation && (
        /^(https?:\/\/|\/media\/|\/static\/)/.test(question.math_equation)
          ? <div className="flex justify-center mb-4">
              <img src={question.math_equation} alt="equation" className="max-h-64 max-w-full object-contain border border-gray-100 rounded" />
            </div>
          : <div
              className="text-center text-[17px] text-gray-900 mb-4"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(question.math_equation)) }}
            />
      )}

      {/* Content */}
      <div
        className="text-gray-900 leading-7 text-[17px] font-medium
          [&_p]:mb-3 [&_p:last-child]:mb-0
          [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:my-2
          [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:my-2
          [&_li]:my-1
          [&_u]:underline [&_b]:font-bold [&_strong]:font-bold
          [&_i]:italic [&_em]:italic"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(question.content)) }}
      />

      {/* MCQ choices */}
      {question.question_type === 'MCQ' && (
        <MCQChoices
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          eliminatedMap={eliminatedMap}
          onToggleEliminate={onToggleEliminate}
        />
      )}

      {/* INPUT type */}
      {question.question_type === 'INPUT' && (
        <div className="mt-6">
          <input
            type="text"
            value={answer || ''}
            onChange={(e) => onAnswer(e.target.value)}
            className="w-full max-w-2xl rounded-full bg-gray-100 border-0 py-3.5 pl-6 pr-6 text-[17px] font-medium text-gray-900 placeholder:text-gray-400 placeholder:font-normal outline-none transition-colors focus:bg-gray-50 focus:ring-2 focus:ring-sky-400/30"
            placeholder="Answer..."
            autoComplete="off"
          />
        </div>
      )}
    </div>
  )
}

function MCQChoices({ question, answer, onAnswer, eliminatedMap, onToggleEliminate }) {
  return (
    <div className="mt-5 space-y-2.5">
      {question.choices.map((choice) => {
        const selected = answer === choice.option
        const eliminated = !!eliminatedMap?.[choice.option]
        return (
          <div
            key={choice.option}
            className={`flex items-stretch gap-0 transition-transform duration-100 rounded-lg overflow-hidden ${selected ? 'scale-[1.012]' : ''}`}
          >
            {/* ── Main choice card ── */}
            <button
              type="button"
              onClick={() => { if (!eliminated) onAnswer(choice.option) }}
              className={`flex-1 flex items-center gap-3 px-3 py-3 border-2 text-left transition-all ${
                selected
                  ? 'border-[#1a3c6e] bg-[#1a5dc8]'
                  : eliminated
                  ? 'border-gray-300 bg-white opacity-50'
                  : 'border-gray-700 bg-white hover:border-black hover:bg-gray-50/40'
              }`}
            >
              {/* Letter box */}
              <span className={`flex-shrink-0 w-7 h-7 border-2 rounded flex items-center justify-center text-[13px] font-bold transition-colors ${
                selected
                  ? 'border-white/60 bg-white/20 text-white'
                  : eliminated
                  ? 'border-gray-300 text-gray-300'
                  : 'border-gray-700 text-gray-900 bg-white'
              }`}>
                {choice.option}
              </span>

              {/* Choice text */}
              <span className="relative flex-1 min-w-0">
                {choice.image && (
                  <img
                    src={choice.image}
                    alt={`Choice ${choice.option}`}
                    className="max-h-24 object-contain mb-1 rounded block"
                  />
                )}
                {choice.text && (
                  <span
                    className={`text-[15px] leading-[1.55] font-semibold [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_p]:mb-1 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5 ${
                      selected ? 'text-white' : eliminated ? 'text-gray-300' : 'text-gray-900'
                    }`}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(choice.text)) }}
                  />
                )}
                {eliminated && (
                  <span className="absolute left-0 right-0 top-[50%] h-[2px] bg-gray-500 pointer-events-none" />
                )}
              </span>
            </button>

            {/* ── Eliminate button — shows letter, strikethrough when eliminated ── */}
            <button
              type="button"
              onClick={() => onToggleEliminate(choice.option)}
              title={eliminated ? 'Restore choice' : 'Eliminate choice'}
              className={`flex-shrink-0 w-10 flex items-center justify-center border-y-2 border-r-2 transition-all ${
                eliminated
                  ? 'border-gray-400 bg-gray-100'
                  : 'border-gray-700 bg-white hover:bg-gray-50 hover:border-black'
              }`}
            >
              <span className={`relative text-[13px] font-black ${eliminated ? 'text-gray-500' : 'text-gray-800'}`}>
                {choice.option}
                {eliminated && (
                  <span className="absolute left-[-2px] right-[-2px] top-[50%] h-[2px] bg-gray-500 pointer-events-none" />
                )}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

