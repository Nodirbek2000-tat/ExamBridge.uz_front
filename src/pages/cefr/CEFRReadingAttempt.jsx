import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, ChevronLeft, Send, CheckCircle2, AlertTriangle,
  Star, ChevronUp, ChevronDown, Bookmark,
  Maximize2, Minimize2, Sun, Moon, Menu, XCircle, Lock, ArrowDown,
} from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

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

// ── Question inputs ───────────────────────────────────────────────────────────
function TFNGInput({ value, onChange, options, dark, readOnly }) {
  const D = dark
  return (
    <div className="space-y-0.5 mt-2">
      {options.map(opt => {
        const sel = value === opt
        return (
          <button key={opt} type="button" onClick={() => !readOnly && onChange(sel ? '' : opt)}
            disabled={readOnly}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
              sel ? D ? 'text-sky-300' : 'text-sky-700'
                  : D ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
            } ${readOnly ? 'pointer-events-none' : ''}`}>
            <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
              sel ? 'border-sky-500 bg-sky-500' : D ? 'border-gray-500' : 'border-gray-300'
            }`}>
              {sel && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
            </span>
            <span className="font-semibold">{opt}</span>
          </button>
        )
      })}
    </div>
  )
}

function MCQInput({ value, onChange, choices, dark, readOnly }) {
  const D = dark
  return (
    <div className="space-y-0.5 mt-2">
      {choices.map(c => (
        <button key={c.option} onClick={() => !readOnly && onChange(c.option)}
          disabled={readOnly}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
            value === c.option
              ? D ? 'text-sky-300' : 'text-sky-700'
              : D ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
          }`}>
          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${
            value === c.option ? 'border-sky-500 bg-sky-500' : D ? 'border-gray-500' : 'border-gray-300'
          }`}>
            {value === c.option && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
          </span>
          <span className="font-semibold flex-shrink-0 w-4">{c.option}.</span>
          <span>{c.text}</span>
        </button>
      ))}
    </div>
  )
}

function MultiSelectInput({ value, onChange, choices, maxSelections, dark }) {
  const selected = value ? value.split('|').filter(Boolean) : []
  const toggle = (opt) => {
    let next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : maxSelections && selected.length >= maxSelections ? selected : [...selected, opt]
    onChange(next.join('|'))
  }
  return (
    <div className="space-y-1.5 mt-2">
      {maxSelections > 1 && (
        <p className={`text-xs mb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Choose {maxSelections} ({selected.length}/{maxSelections})
        </p>
      )}
      {choices.map(c => {
        const checked = selected.includes(c.option)
        return (
          <button key={c.option} onClick={() => toggle(c.option)}
            className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-[1em] text-left transition ${
              checked ? 'bg-sky-50 border-sky-400 text-sky-700'
                      : dark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-sky-500'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-sky-200'
            }`}>
            <span className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border-2 flex items-center justify-center ${
              checked ? 'bg-sky-500 border-sky-500' : dark ? 'border-gray-500' : 'border-gray-300'
            }`}>
              {checked && <CheckCircle2 size={10} className="text-white" />}
            </span>
            <span className={`font-bold flex-shrink-0 ${checked ? 'text-sky-500' : 'text-gray-400'}`}>{c.option}.</span>
            <span>{c.text}</span>
          </button>
        )
      })}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, dark }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Type your answer...'}
      className={`mt-2 w-full px-3 py-2 border rounded-lg text-[1em] focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition ${
        dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'
      }`} />
  )
}

// Renders content highlighting ___ blanks visually
function ContentWithBlank({ content, dark, textMain, textSizeClass = 'text-[1.05rem]' }) {
  if (!content?.includes('___')) {
    return <p className={`${textSizeClass} leading-snug ${textMain}`}>{content}</p>
  }
  const parts = content.split('___')
  return (
    <p className={`${textSizeClass} leading-snug ${textMain}`}>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className={`inline-block mx-1 px-3 py-0.5 rounded border-b-2 border-dashed border-sky-400 font-bold text-sm align-middle ${
              dark ? 'bg-gray-700/60 text-sky-300' : 'bg-sky-50 text-sky-400'
            }`}>___</span>
          )}
        </span>
      ))}
    </p>
  )
}

// Renders passage text with basic markdown: **bold**, paragraph labels
function PassageContent({ content, dark, textSizeClass = 'text-[1.05rem]', evidenceItems = [] }) {
  const containerRef = useRef(null)
  const [highlights, setHighlights] = useState([])
  const [palette, setPalette] = useState(null) // {start, end, x, y}
  const [deleteMenu, setDeleteMenu] = useState(null) // {id, x, y}

  if (!content) return null
  const textColor = dark ? 'text-gray-200' : 'text-gray-900'
  const rawText = content.replace(/\*\*/g, '')
  const prettyText = rawText
    .replace(/^([ \t]*)[•-]\s+/gm, ' • ')
    .replace(/\n{3,}/g, '\n\n')

  const colorClass = {
    blue: dark ? 'bg-sky-500/45' : 'bg-sky-300/75',
    pink: dark ? 'bg-pink-500/45' : 'bg-pink-300/75',
    yellow: dark ? 'bg-amber-500/45' : 'bg-yellow-300/80',
  }

  const evidenceHighlights = useMemo(() => {
    if (!evidenceItems.length || !prettyText?.trim()) return []
    const textLower = prettyText.toLowerCase()
    const picked = []
    const overlaps = (a, b) => a.start < b.end && b.start < a.end

    for (const ev of evidenceItems) {
      const snippet = String(ev?.snippet || '').trim()
      if (snippet.length < 6) continue
      const start = textLower.indexOf(snippet.toLowerCase())
      if (start < 0) continue
      const end = start + snippet.length
      const candidate = { id: `ev-${ev.questionNumber}`, start, end, color: 'yellow', locked: true, q: ev.questionNumber }
      if (picked.some((p) => overlaps(p, candidate))) continue
      picked.push(candidate)
    }
    return picked.sort((a, b) => a.start - b.start)
  }, [evidenceItems, prettyText])

  const applyColor = (color) => {
    if (!palette) return
    const { start, end } = palette
    setHighlights((prev) => {
      const kept = prev.filter((h) => end <= h.start || start >= h.end)
      return [...kept, { id: `${Date.now()}-${Math.random()}`, start, end, color }].sort((a, b) => a.start - b.start)
    })
    setPalette(null)
  }

  const removeHighlight = (id) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
    setDeleteMenu(null)
  }

  const renderHighlightedText = () => {
    const merged = [...highlights, ...evidenceHighlights].sort((a, b) => a.start - b.start)
    if (!merged.length) return prettyText
    const nodes = []
    let cursor = 0
    merged.forEach((h) => {
      if (h.start > cursor) nodes.push(prettyText.slice(cursor, h.start))
      nodes.push(
        <span
          key={h.id}
          onClick={(e) => {
            if (h.locked) return
            e.stopPropagation()
            setDeleteMenu({ id: h.id, x: e.clientX + 8, y: e.clientY + 8 })
            setPalette(null)
          }}
          className={`${colorClass[h.color]} rounded px-0.5 ${h.locked ? 'font-semibold' : 'cursor-pointer'}`}
        >
          {h.locked && <span className={`mr-1 text-[11px] font-black ${dark ? 'text-amber-200' : 'text-amber-800'}`}>Q{h.q}</span>}
          {prettyText.slice(h.start, h.end)}
        </span>
      )
      cursor = h.end
    })
    if (cursor < prettyText.length) nodes.push(prettyText.slice(cursor))
    return nodes
  }

  const handleMouseUp = () => {
    const root = containerRef.current
    const sel = window.getSelection()
    if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return
    const pre = range.cloneRange()
    pre.selectNodeContents(root)
    pre.setEnd(range.startContainer, range.startOffset)
    const start = pre.toString().length
    const selected = range.toString()
    const end = start + selected.length
    if (!selected.trim() || start === end) return
    const rect = range.getBoundingClientRect()
    setPalette({
      start,
      end,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
    setDeleteMenu(null)
    sel.removeAllRanges()
  }

  return (
    <div className="relative" onClick={() => { setPalette(null); setDeleteMenu(null) }}>
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`max-w-none leading-[1.8] whitespace-pre-wrap select-text font-semibold ${textColor} ${textSizeClass}`}
      >
        {renderHighlightedText()}
      </div>

      {palette && (
        <div
          className={`fixed z-50 -translate-x-1/2 -translate-y-full px-2 py-1 rounded-full shadow-lg border flex items-center gap-2 ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
          style={{ left: palette.x, top: palette.y }}
        >
          {[
            { id: 'blue', cls: 'bg-sky-400' },
            { id: 'pink', cls: 'bg-pink-400' },
            { id: 'yellow', cls: 'bg-yellow-400' },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                applyColor(c.id)
              }}
              className={`w-5 h-5 rounded-full border border-white/70 ${c.cls}`}
            />
          ))}
        </div>
      )}

      {deleteMenu && (
        <div
          className={`fixed z-50 rounded-xl border shadow-lg overflow-hidden ${dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
          style={{ left: deleteMenu.x, top: deleteMenu.y }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeHighlight(deleteMenu.id)
            }}
            className={`px-3 py-2 text-sm font-semibold ${dark ? 'text-red-300 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'}`}
          >
            Delete note
          </button>
        </div>
      )}
    </div>
  )
}

// MFEAT: dropdown select per question
// ── Group Instruction — markdown rendering (**bold**, • bullets) ──────────────
function GroupInstruction({ text, dark }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div className={`px-1 py-1 mb-2 text-[1.05em] ${dark ? 'text-gray-100' : 'text-gray-900'}`}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />
        const parseBold = (str) => str.split(/\*\*(.*?)\*\*/g).map((p, pi) =>
          pi % 2 === 1 ? <strong key={pi}>{p}</strong> : p
        )
        const isBullet = /^[•\-]\s/.test(line.trimStart())
        const isRangeTitle = /^questions?\s*\d+/i.test(line.trim())
        if (isBullet) {
          const content = line.replace(/^[•\-]\s+/, '')
          return (
            <div key={i} className="flex items-start gap-1.5 mt-0.5 ml-1">
              <span className="mt-0.5 flex-shrink-0 opacity-60">•</span>
              <span>{parseBold(content)}</span>
            </div>
          )
        }
        const isHeader = line.trim().startsWith('**') && line.trim().endsWith('**')
        return (
          <div key={i} className={`mt-0.5 ${isHeader ? 'font-black mt-2 first:mt-0 text-[1.15em]' : isRangeTitle ? 'font-black' : ''}`}>
            {parseBold(line)}
          </div>
        )
      })}
    </div>
  )
}

// ── Choices Legend — shown once per MFEAT/MEND/MATCH group ───────────────────
function ChoicesLegend({ choices, dark }) {
  return (
    <div className={`px-4 py-3 rounded-xl mb-2 border text-[0.9em] ${dark ? 'bg-indigo-900/30 border-indigo-700 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'}`}>
      <div className="space-y-1">
        {choices.map(c => (
          <div key={c.option} className="flex items-start gap-2">
            <span className="font-bold flex-shrink-0 w-6">{c.option}.</span>
            <span>{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Group List — labeled list shown below group_instruction ───────────────────
// Used by MEND (sentence endings), MATCH, MFEAT to display options as a clear list
// Triggered by group_list field: [{option:"A", text:"..."}, ...]
function GroupList({ items, dark }) {
  if (!items?.length) return null
  const D = dark
  return (
    <div className={`rounded-xl border px-4 py-3 mb-2 text-[0.9em] ${D ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
      <div className="space-y-1">
        {items.map(item => (
          <div key={item.option} className="flex items-start gap-2">
            <span className={`font-bold flex-shrink-0 w-7 ${D ? 'text-sky-400' : 'text-sky-700'}`}>{item.option}.</span>
            <span className="leading-snug">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Letter grid for MINFO ─────────────────────────────────────────────────────
function LetterGrid({ value, onChange, choices, dark }) {
  const opts = choices?.length
    ? choices
    : 'ABCDEFGH'.split('').map(l => ({ option: l, text: `Paragraph ${l}` }))
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {opts.map(c => (
        <button key={c.option} onClick={() => onChange(value === c.option ? '' : c.option)}
          title={c.text}
          className={`w-10 h-10 rounded-xl font-bold text-sm border transition ${
            value === c.option
              ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
              : dark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-sky-400 hover:text-sky-300'
                     : 'bg-white border-gray-200 text-gray-600 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50'
          }`}>
          {c.option}
        </button>
      ))}
    </div>
  )
}

function MFEATInput({ value, onChange, choices, dark }) {
  const D = dark
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className={`mt-2 w-full px-3 py-2.5 border rounded-xl text-[1em] focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition cursor-pointer ${
        value
          ? D ? 'bg-sky-900 border-sky-500 text-sky-200' : 'bg-sky-50 border-sky-400 text-sky-700'
          : D ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
      }`}
    >
      <option value="">— Select an answer —</option>
      {choices.map(c => (
        <option key={c.option} value={c.option}>{c.option}. {c.text}</option>
      ))}
    </select>
  )
}

// Word bank + click-to-fill for SUMM type
function SummWordBankInput({ value, onChange, wordBank, dark }) {
  const D = dark
  const used = new Set(Object.values ? [] : []) // track globally would need parent state; keep simple
  return (
    <div className="mt-2 space-y-2">
      <div className={`flex flex-wrap gap-2 p-3 rounded-xl border ${D ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
        <span className={`text-xs font-semibold w-full mb-1 ${D ? 'text-gray-400' : 'text-gray-500'}`}>Word Bank:</span>
        {wordBank.map((word, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(word)}
            className={`px-3 py-1 rounded-lg text-sm font-medium border transition ${
              value === word
                ? 'bg-sky-500 border-sky-500 text-white'
                : D
                  ? 'bg-gray-700 border-gray-600 text-gray-200 hover:border-sky-400'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-sky-400 hover:bg-sky-50'
            }`}
          >
            {word}
          </button>
        ))}
      </div>
      <input
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Or type your answer..."
        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition ${
          D ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'
        }`}
      />
    </div>
  )
}

// ── Match Grid Block — proper table grid (same as IELTS) ─────────────────────
function MatchGridBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, toggleBookmark }) {
  const D = dark
  const choices = questions[0]?.choices || []
  const groupList = questions[0]?.group_list || []
  const qt = questions[0]?.question_type
  const gi = questions[0]?.group_instruction || ''

  const isMend = ['MEND', 'M.END'].includes(qt)
  const legendItems = isMend ? groupList : choices

  return (
    <>
      {gi && <GroupInstruction text={gi} dark={D} />}
      {legendItems?.length > 0 && (
        <div className={`mb-3 rounded-xl border px-4 py-3 ${D ? 'border-gray-700 bg-gray-800/40 text-gray-200' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          <div className="space-y-1">
            {legendItems.map(c => (
              <div key={c.option} className="flex items-start gap-2 text-sm">
                <span className="font-extrabold flex-shrink-0 w-6">{c.option}.</span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className={`rounded-2xl overflow-hidden mb-2 border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className={`w-full text-sm border-collapse ${D ? 'text-gray-300' : 'text-gray-700'}`}>
            <thead>
              <tr>
                <th className={`px-4 py-3 text-left border-b border-r font-normal text-xs ${D ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`} style={{ minWidth: 220 }} />
                {choices.map(c => (
                  <th key={c.option}
                    className={`px-3 py-3 text-center font-bold border-b border-r last:border-r-0 w-14 ${D ? 'border-gray-700 text-gray-200' : 'border-gray-200 text-gray-700'}`}>
                    {c.option}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {questions.map((q) => {
                const val = answers[String(q.id)] || ''
                const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
                const isBookmarked = bookmarkedIds?.has(q.id)
                return (
                  <tr key={q.id} id={`cq-${q.id}`}
                    className={`group border-b last:border-b-0 ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className={`px-4 py-3 border-r ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-start gap-2">
                        <span className={`font-bold flex-shrink-0 w-7 ${D ? 'text-sky-400' : 'text-sky-600'}`}>{q.number}.</span>
                        <span className={`leading-snug ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                          {q.content}
                          {rr && !rr.is_correct && <span className="ml-1.5 text-xs font-semibold text-red-500">✗ → {rr.correct_answer}</span>}
                          {rr?.is_correct && <span className="ml-1.5 text-xs font-semibold text-green-500">✓</span>}
                        </span>
                        {!reviewMode && (
                          <button type="button" onClick={e => { e.stopPropagation(); toggleBookmark?.(q.id, e) }}
                            className={`ml-auto flex-shrink-0 mt-0.5 p-0.5 rounded transition ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <Bookmark size={14} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
                          </button>
                        )}
                      </div>
                    </td>
                    {choices.map(c => {
                      const selected = val === c.option
                      return (
                        <td key={c.option} className={`p-0 border-r last:border-r-0 w-14 ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                          <button
                            type="button"
                            onClick={() => { if (reviewMode) return; onAnswer(q.id, selected ? '' : c.option) }}
                            className={`flex h-full min-h-[56px] w-full items-center justify-center transition outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                              reviewMode ? 'cursor-default pointer-events-none'
                                : `cursor-pointer ${D ? 'hover:bg-gray-700/40' : 'hover:bg-sky-50'}`
                            } ${selected ? (D ? 'bg-sky-900/25' : 'bg-sky-50') : ''}`}
                          >
                            <span className={`w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 transition ${
                              selected ? 'border-sky-500 bg-sky-500'
                                : D ? 'border-gray-500 hover:border-sky-400' : 'border-gray-400 hover:border-sky-500'
                            }`}>
                              {selected && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </span>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ── Inline Gap Block (NOTE / SUMM with [N] markers) — same as IELTS ──────────
function InlineGapBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview }) {
  const D = dark
  const [focusedId, setFocusedId] = useState(null)
  const [selectedWord, setSelectedWord] = useState('')
  const qt = questions[0]?.question_type
  const isSumm = qt === 'SUMM'
  const gi = questions[0]?.group_instruction || ''
  const wordBank = questions.reduce((wb, q) => wb.length ? wb : (q.word_bank?.length ? q.word_bank : []), [])
  const groupKey = useMemo(() => `summ-${questions.map(q => q.id).join('-')}`, [questions])
  const qByNum = {}
  questions.forEach(q => { qByNum[q.number] = q })
  const usedWords = new Map()
  questions.forEach(q => { const v = answers[String(q.id)]; if (v) usedWords.set(v, q.id) })
  const availableWords = wordBank.filter(w => !usedWords.has(w))
  const instructionText = useMemo(() => {
    const first = gi.split('\n').find(l => l.trim())
    if (!first) return ''
    if (/complete|choose|drag|write|select|match/i.test(first) && !/\[\d+\]/.test(first)) return first.trim()
    return ''
  }, [gi])

  const assignWordToQuestion = (targetId, rawWord) => {
    const word = (rawWord || '').trim()
    if (!word || reviewMode) return
    const holder = questions.find(
      q => q.id !== targetId && String(answers[String(q.id)] || '').trim().toLowerCase() === word.toLowerCase()
    )
    if (holder) onAnswer(holder.id, '')
    onAnswer(targetId, word)
  }

  // ── Single gap rendered as a plain input box ──────────────────────────────
  const renderGap = (qNum, key) => {
    const q = qByNum[qNum]
    if (!q) return <span key={key} className="inline-block mx-1 px-2 border border-gray-300 rounded text-xs text-gray-400">{qNum}</span>
    const val = answers[String(q.id)] || ''
    const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null

    let borderCls = D ? 'border-gray-500' : 'border-gray-400'
    let bgCls     = D ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
    if (rr) {
      borderCls = rr.is_correct ? 'border-green-500' : 'border-red-400'
      bgCls     = rr.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
    }

    return (
      <span key={key} className="inline-flex items-center gap-1 mx-1" style={{ verticalAlign: 'middle' }}>
        <input
          value={val}
          readOnly={reviewMode}
          onChange={e => !reviewMode && onAnswer(q.id, e.target.value)}
          onClick={() => {
            if (reviewMode) return
            if (selectedWord) {
              assignWordToQuestion(q.id, selectedWord)
              setSelectedWord('')
              setFocusedId(q.id)
            } else if (val) {
              // Allow moving a filled answer to another blank.
              setSelectedWord(val)
              onAnswer(q.id, '')
              setFocusedId(q.id)
            }
          }}
          onDragOver={(e) => {
            if (!reviewMode) e.preventDefault()
          }}
          onDrop={(e) => {
            if (reviewMode) return
            e.preventDefault()
            const payload = e.dataTransfer.getData('application/x-cefr-wordbank')
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
          onFocus={() => setFocusedId(q.id)}
          onBlur={() => setFocusedId(null)}
          placeholder={String(qNum)}
          className={`border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-500 transition ${borderCls} ${bgCls} placeholder-gray-400`}
          style={{ width: 150, height: 34, paddingLeft: 6, paddingRight: 6 }}
        />
        {rr && !rr.is_correct && (
          <span className="text-[10px] font-semibold text-green-600">→{rr.correct_answer}</span>
        )}
      </span>
    )
  }

  // ── Inline text parser: handles [N] gaps and **bold** ────────────────────
  const parseInline = (text, keyPrefix) => {
    return text.split(/(\[\d+\])/g).map((seg, si) => {
      const gm = seg.match(/^\[(\d+)\]$/)
      if (gm) return renderGap(parseInt(gm[1]), `${keyPrefix}-g${si}`)
      return seg.split(/\*\*(.*?)\*\*/g).map((p, pi) =>
        pi % 2 === 1
          ? <strong key={`${keyPrefix}-b${si}-${pi}`}>{p}</strong>
          : p
      )
    })
  }

  // ── Line-first renderer: \n → detect type → parseInline ─────────────────
  const renderLines = () =>
    gi.split('\n').filter((line, li) => !(instructionText && li === 0 && line.trim() === instructionText)).map((line, li) => {
      if (!line.trim()) return <div key={li} className="h-2" />

      const isBullet   = /^[•\-]\s/.test(line.trimStart())
      const isNumbered = /^\d+\.\s/.test(line.trimStart())
      const isHeader   = /^\*\*.+\*\*$/.test(line.trim())

      if (isHeader) {
        const inner = line.replace(/^\*\*/, '').replace(/\*\*$/, '')
        return (
          <div key={li} className={`font-bold mt-3 first:mt-0 leading-relaxed ${D ? 'text-gray-100' : 'text-gray-900'}`}>
            {parseInline(inner, `h${li}`)}
          </div>
        )
      }
      if (isBullet) {
        const inner = line.replace(/^[•\-]\s+/, '')
        return (
          <div key={li} className={`flex items-baseline gap-2 ml-2 leading-relaxed ${D ? 'text-gray-300' : 'text-gray-800'}`}>
            <span className="flex-shrink-0 text-sm">•</span>
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
      return (
        <div key={li} className={`leading-relaxed ${D ? 'text-gray-300' : 'text-gray-800'}`}>
          {parseInline(line, `p${li}`)}
        </div>
      )
    })

  return (
    <div className="mb-2">
      {instructionText && (
        <p className={`mb-2 text-sm font-medium ${D ? 'text-gray-300' : 'text-gray-700'}`}>
          {instructionText}
        </p>
      )}

      <div className={`rounded-xl overflow-hidden border ${D ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
      {/* Text body with inline gaps */}
      <div className="px-5 py-4 text-sm space-y-0.5">
        {renderLines()}
      </div>

      {/* Word Bank (SUMM only) */}
      {isSumm && wordBank.length > 0 && (
        <div className={`border-t px-5 py-3 ${D ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-xs font-semibold mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>Word Bank</p>
          <div className="flex flex-wrap gap-2">
            {availableWords.map(w => {
              return (
                <button
                  key={w}
                  type="button"
                  draggable={!reviewMode}
                  onDragStart={(e) => {
                    if (reviewMode) return
                    e.dataTransfer.setData('application/x-cefr-wordbank', JSON.stringify({ word: w, groupKey }))
                    e.dataTransfer.setData('text/plain', w)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  onClick={() => {
                    const target = focusedId
                      ? questions.find(q => q.id === focusedId)
                      : questions.find(q => !answers[String(q.id)])
                    if (target) {
                      assignWordToQuestion(target.id, w)
                      setSelectedWord('')
                      setFocusedId(target.id)
                    } else {
                      setSelectedWord((prev) => (prev === w ? '' : w))
                    }
                  }}
                  className={`px-3 py-1 border rounded text-sm transition ${
                    selectedWord === w
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : D ? 'border-gray-500 bg-gray-800 text-gray-200 hover:border-gray-300' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {w}
                </button>
              )
            })}
            {availableWords.length === 0 && (
              <p className={`text-xs ${D ? 'text-gray-500' : 'text-gray-400'}`}>All words are placed in blanks.</p>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// ── Table Gap Block (TABLE type with [N] markers in markdown table) ──────────
function TableGapBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview }) {
  const D = dark
  const gi = questions[0]?.group_instruction || ''
  const content = questions[0]?.content || ''
  const qByNum = {}
  questions.forEach(q => { qByNum[q.number] = q })

  const renderGap = (qNum, key) => {
    const q = qByNum[qNum]
    if (!q) return <span key={key} className="inline-block px-2 border border-gray-300 rounded text-xs text-gray-400">{qNum}</span>
    const val = answers[String(q.id)] || ''
    const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
    return (
      <span key={key} className="inline-flex items-center gap-1" style={{ verticalAlign: 'middle' }}>
        <input
          value={val}
          readOnly={reviewMode}
          onChange={e => !reviewMode && onAnswer(q.id, e.target.value)}
          placeholder={String(qNum)}
          className={`border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-400 transition placeholder-gray-400 ${
            rr ? rr.is_correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'
               : D ? 'bg-gray-800 border-gray-500 text-gray-100' : 'bg-white border-gray-400 text-gray-900'
          }`}
          style={{ width: 140, height: 34, paddingLeft: 6, paddingRight: 6 }}
        />
        {rr && !rr.is_correct && <span className="text-[10px] font-semibold text-green-600">→{rr.correct_answer}</span>}
      </span>
    )
  }

  const parseCell = (text, keyPrefix) =>
    text.split(/(\[\d+\])/g).map((seg, si) => {
      const gm = seg.match(/^\[(\d+)\]$/)
      if (gm) return renderGap(parseInt(gm[1]), `${keyPrefix}-g${si}`)
      return seg.split(/\*\*(.*?)\*\*/g).map((p, pi) =>
        pi % 2 === 1 ? <strong key={`${keyPrefix}-b${si}-${pi}`}>{p}</strong> : p
      )
    })

  // Parse markdown table: "| col1 | col2 |\n| cell | cell |"
  const rows = content.split('\n')
    .filter(l => l.trim().startsWith('|') && !/^\|[\s|:-]+\|$/.test(l.trim()))
    .map(line => line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).map(c => c.trim()))
  const headerRow = rows[0] || []
  const bodyRows = rows.slice(1)

  return (
    <div className={`rounded-xl overflow-hidden mb-2 border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
      {gi && (
        <div className={`px-4 py-2.5 text-sm border-b ${D ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-100 bg-gray-50 text-gray-700'}`}>
          {gi}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className={`w-full text-sm border-collapse ${D ? 'text-gray-200' : 'text-gray-800'}`}>
          {headerRow.length > 0 && (
            <thead>
              <tr className={D ? 'bg-gray-700/60' : 'bg-gray-100'}>
                {headerRow.map((cell, ci) => (
                  <th key={ci} className={`px-4 py-2.5 text-left font-bold border-b border-r last:border-r-0 ${D ? 'border-gray-600' : 'border-gray-200'}`}>
                    {parseCell(cell, `th-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} className={`border-b last:border-b-0 ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                {row.map((cell, ci) => (
                  <td key={ci} className={`px-4 py-3 border-r last:border-r-0 leading-relaxed ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                    {parseCell(cell, `td-${ri}-${ci}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Flow Chart Block (FLOW type) ──────────────────────────────────────────────
// Renders consecutive FLOW questions as a vertical flowchart with ⬇ arrows
function FlowBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, toggleBookmark }) {
  const D = dark
  const gi = questions[0]?.group_instruction || ''
  const groupList = questions[0]?.group_list

  const boxes = (() => {
    if (questions.length === 1 && (questions[0].content || '').includes('→')) {
      const q = questions[0]
      return (q.content || '').split('→').map((seg, bi) => {
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
            const parts = box.hasGap ? box.text.split('___') : null

            return (
              <div key={box.key} id={q ? `cq-${q.id}` : undefined}>
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
                      D ? 'bg-sky-900/60 text-sky-300' : 'bg-sky-100 text-sky-700'
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
                        {rr && !rr.is_correct && <span className="text-[10px] font-semibold text-green-600">→{rr.correct_answer}</span>}
                        {q && !reviewMode && (
                          <button onClick={e => { e.stopPropagation(); toggleBookmark?.(q.id, e) }}
                            className={`inline-flex items-center opacity-0 group-hover:opacity-100 transition ${isBookmarked ? 'opacity-100' : ''}`}>
                            <Bookmark size={18} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
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
                        D ? 'bg-sky-900/60 text-sky-300' : 'bg-sky-100 text-sky-700'
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
                      {rr && !rr.is_correct && <span className="text-[10px] font-semibold text-green-600">→{rr.correct_answer}</span>}
                    </div>
                  )}
                  {q && reviewMode && showCorrectInReview && rr && (
                    <div className="mt-2 space-y-1">
                      <div className={`text-xs rounded-lg px-2 py-1.5 border ${rr.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                        <span className="font-semibold">Your: </span>{String(rr.user_answer ?? '').trim() || 'N/A'}
                        {!rr.is_correct && <><span className="mx-1">|</span><span className="font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}
                      </div>
                      {q.answer_review && (
                        <div className="text-xs rounded-lg px-2 py-1.5 border border-yellow-200 bg-yellow-50 text-yellow-800">
                          <span className="font-semibold">Q{q.number} — Evidence: </span>{q.answer_review}
                        </div>
                      )}
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

// Grid table: group of TABLE questions rendered as a 2-D radio grid
function GridTableGroup({ questions, answers, onAnswer, groupInstruction, dark, reviewMode, reviewMap, showCorrectInReview }) {
  const D = dark
  if (!questions.length) return null
  const cols = questions[0].choices || []
  return (
    <div className={`rounded-2xl border overflow-hidden ${D ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      {groupInstruction && (
        <div className={`px-1 py-1 text-[1.15em] font-black border-b ${D ? 'text-gray-100 border-gray-700' : 'text-gray-900 border-gray-200'}`}>
          {groupInstruction}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className={D ? 'bg-gray-700' : 'bg-gray-50'}>
              <th className={`px-3 py-2 text-left font-semibold text-xs border-r ${D ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                Questions
              </th>
              {cols.map(c => (
                <th key={c.option} className={`px-3 py-2 text-center font-bold text-xs ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                  {c.option}
                  {c.text && <div className={`text-[10px] font-normal max-w-[80px] mx-auto ${D ? 'text-gray-400' : 'text-gray-500'}`}>{c.text}</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => {
              const ans = answers[String(q.id)] || ''
              const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
              return (
                <tr key={q.id} className={`border-t ${D ? 'border-gray-700' : 'border-gray-100'} ${i % 2 === 0 ? (D ? 'bg-gray-800' : 'bg-white') : (D ? 'bg-gray-800/50' : 'bg-gray-50/50')}`}>
                  <td className={`px-3 py-2 border-r ${D ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border text-xs font-black mr-1 ${
                      D ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'
                    }`}>
                      {q.number}
                    </span>
                    <span className="text-sm">{q.content}</span>
                    {rr && (
                      <span className={`ml-2 text-xs font-semibold ${rr.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                        {rr.is_correct ? '✓' : `✗ (${rr.correct_answer})`}
                      </span>
                    )}
                  </td>
                  {cols.map(c => (
                    <td key={c.option} className="px-2 py-2 text-center">
                      <input
                        type="radio"
                        name={`grid-q-${q.id}`}
                        checked={ans === c.option}
                        onChange={() => !reviewMode && onAnswer(q.id, c.option)}
                        disabled={reviewMode}
                        className="w-4 h-4 accent-sky-500 cursor-pointer disabled:cursor-default"
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Pre-process questions into render segments
function groupIntoSegments(questions) {
  const segments = []
  let i = 0
  while (i < questions.length) {
    const q = questions[i]
    const qt = q.question_type
    const gi = q.group_instruction

    // MEND / MINFO / MFEAT / MATCH with choices → MatchGrid (radio matrix)
    // Exception: MFEAT/MEND with many choices (>6) use dropdown cards instead of grid
    const GRID_TYPES = ['MEND','M.END','MINFO','M.INFO','MFEAT','M.FEAT','MATCH']
    const isDropdownFallback = ['MFEAT','M.FEAT','MEND','M.END'].includes(qt) && (q.choices?.length || 0) > 6
    if (GRID_TYPES.includes(qt) && q.choices?.length > 0 && !isDropdownFallback) {
      const grp = [q]; let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        GRID_TYPES.includes(questions[j].question_type) &&
        !(['MFEAT','M.FEAT','MEND','M.END'].includes(questions[j].question_type) && (questions[j].choices?.length || 0) > 6)) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'grid', questions: grp, group_instruction: gi }); i = j; continue
    }

    // NOTE / SUMM with [N] markers → InlineGap block
    if (['NOTE','SUMM'].includes(qt) && gi && /\[\d+\]/.test(gi)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        ['NOTE','SUMM'].includes(questions[j].question_type)) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'inline', questions: grp }); i = j; continue
    }

    // TABLE with [N] markers in content → table gap block
    if (qt === 'TABLE' && q.content && /\[\d+\]/.test(q.content)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        questions[j].question_type === 'TABLE' &&
        questions[j].content === q.content) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'table', questions: grp }); i = j; continue
    }

    // TABLE with choices → existing GridTableGroup (radio matrix)
    if (qt === 'TABLE' && q.choices?.length > 0) {
      const grp = [q]
      const choiceKey = q.choices.map(c => c.option).join(',')
      let j = i + 1
      while (j < questions.length) {
        const nq = questions[j]
        if (nq.question_type === 'TABLE' && nq.choices?.length > 0 &&
          nq.group_instruction === gi && nq.choices.map(c => c.option).join(',') === choiceKey) {
          grp.push(nq); j++
        } else break
      }
      if (grp.length > 1) {
        segments.push({ type: 'grid', questions: grp, group_instruction: gi }); i = j; continue
      }
    }

    // FLOW → group consecutive FLOW questions into a flowchart block
    if (qt === 'FLOW') {
      const grp = [q]; let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        questions[j].question_type === 'FLOW') {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'flow', questions: grp }); i = j; continue
    }

    segments.push({ type: 'single', q }); i++
  }
  return segments
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CEFRReadingAttempt() {
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const passageId = searchParams.get('passage')
  const partsParam = searchParams.get('parts')
  const passageTitle = decodeURIComponent(searchParams.get('title') || 'Reading')
  const reviewData = location.state?.reviewData || null
  const reviewMode = Boolean(reviewData)
  const [showCorrectInReview, setShowCorrectInReview] = useState(true)

  // Multi-passage support (full mock)
  const passageIds = useMemo(() => {
    if (partsParam) return partsParam.split(',').map(Number).filter(Boolean)
    if (passageId) return [Number(passageId)]
    return []
  }, [partsParam, passageId])
  const [activePart, setActivePart] = useState(0)

  const [answers, setAnswers] = useState({})
  const [activeQ, setActiveQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const allowLeaveRef = useRef(false)
  const [darkMode, setDarkMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [splitRatio, setSplitRatio] = useState(50)
  const [textSize, setTextSize] = useState('regular')
  const [showTextSizeMenu, setShowTextSizeMenu] = useState(false)

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkLoading, setBookmarkLoading] = useState(new Set())

  const containerRef = useRef()
  const questionRefs = useRef({})
  const dragging = useRef(false)
  const isMobile = useRef(false)

  useEffect(() => {
    const update = () => { isMobile.current = window.innerWidth < 768 }
    update(); window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleMouseMove = useCallback(e => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = isMobile.current
      ? ((e.clientY - rect.top) / rect.height) * 100
      : ((e.clientX - rect.left) / rect.width) * 100
    setSplitRatio(Math.max(25, Math.min(75, ratio)))
  }, [])
  const handleMouseUp = useCallback(() => { dragging.current = false }, [])
  useEffect(() => {
    window.addEventListener('pointermove', handleMouseMove)
    window.addEventListener('pointerup', handleMouseUp)
    return () => {
      window.removeEventListener('pointermove', handleMouseMove)
      window.removeEventListener('pointerup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const passageQueries = useQueries({
    queries: passageIds.map(pid => ({
      queryKey: ['cefr-reading-passage', pid],
      queryFn: () => api.get(`/cefr/reading/${pid}/`).then(r => r.data),
      enabled: !!pid,
    }))
  })
  const allPassagesData = passageIds.length ? passageQueries.map(q => q.data || null) : []
  const isLoading = passageQueries.some(q => q.isLoading) || passageIds.length === 0
  // Active passage
  const passage = allPassagesData[activePart] || null

  const timerStorageKey = `cefr-reading-timer-${attemptId}-${passageId || 'x'}`
  const timer = useTimer((passage?.time_limit || 20) * 60, reviewMode ? null : timerStorageKey, reviewMode)
  const questions = passage?.questions || []

  const reviewMap = useMemo(() => {
    const m = {}
    if (!reviewData?.results) return m
    for (const r of reviewData.results) {
      if (r.question_id != null) m[String(r.question_id)] = r
      if (r.number != null) m[`n-${r.number}`] = r
    }
    return m
  }, [reviewData])

  const evidenceItems = useMemo(() => {
    if (!reviewMode || !showCorrectInReview) return []
    return questions
      .map((q) => {
        const snippet = String(q.answer_review || '').trim()
        if (!snippet || snippet.length < 5) return null
        return { questionNumber: q.number, snippet }
      })
      .filter(Boolean)
  }, [questions, reviewMode, showCorrectInReview])

  useEffect(() => {
    if (!reviewData?.results) return
    const next = {}
    for (const r of reviewData.results) {
      if (r.question_id != null) next[String(r.question_id)] = r.user_answer ?? ''
    }
    setAnswers(next)
  }, [reviewData])

  useEffect(() => {
    window.history.pushState({ cefrReadingGuard: true }, '', window.location.href)
    const onPopState = () => {
      if (allowLeaveRef.current || reviewMode) return
      setShowExitConfirm(true)
      window.history.pushState({ cefrReadingGuard: true }, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [reviewMode])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => {
    if (passage?.questions) {
      const ids = passage.questions.filter(q => q.is_bookmarked).map(q => q.id)
      setBookmarkedIds(new Set(ids))
    }
  }, [passage])

  const toggleBookmark = async (qId, e) => {
    e.stopPropagation()
    if (bookmarkLoading.has(qId)) return
    setBookmarkLoading(prev => new Set([...prev, qId]))
    try {
      const res = await api.post('/ielts/bookmarks/toggle/', { source_type: 'CEFR', question_id: qId })
      setBookmarkedIds(prev => {
        const next = new Set(prev)
        if (res.data.bookmarked) next.add(qId); else next.delete(qId)
        return next
      })
    } catch {}
    finally { setBookmarkLoading(prev => { const next = new Set(prev); next.delete(qId); return next }) }
  }

  const setAnswer = (qId, val) => {
    if (reviewMode) return
    setAnswers((prev) => ({ ...prev, [String(qId)]: val }))
  }
  const answeredCount = Object.values(answers).filter(Boolean).length
  // Total questions across all loaded parts (for full mock display)
  const totalQuestionsAll = passageIds.length > 1
    ? allPassagesData.reduce((acc, p) => acc + (p?.questions?.length || 0), 0)
    : questions.length

  const handleSubmit = async () => {
    if (reviewMode) return
    timer.stop()
    timer.clearPersist()
    setShowConfirm(false)
    setShowExitConfirm(false)
    setSubmitting(true)
    try {
      const validPassages = allPassagesData.filter(Boolean)
      let allResults = []
      let lastRes = null

      for (let i = 0; i < validPassages.length; i++) {
        const p = validPassages[i]
        const isLast = i === validPassages.length - 1
        const res = await api.post(`/cefr/reading/${p.id}/submit/`, {
          attempt_id: parseInt(attemptId, 10),
          answers,
          partial: !isLast,
        })
        allResults = [...allResults, ...(res.data.results || [])]
        if (isLast) lastRes = res.data
      }

      // For the last passage, backend already recalculates totals across all parts
      const combinedResult = {
        ...(lastRes || {}),
        results: allResults,
      }

      allowLeaveRef.current = true
      navigate(`/exam/cefr/reading/${attemptId}/result?passage=${passageId}&title=${encodeURIComponent(passageTitle)}`, {
        state: { result: combinedResult }, replace: true,
      })
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message))
      setSubmitting(false)
    }
  }

  const handleBackToList = () => {
    allowLeaveRef.current = true
    timer.clearPersist()
    navigate('/app/cefr/reading')
  }

  const goToQ = (i) => {
    setActiveQ(i)
    const q = questions[i]
    const el = questionRefs.current[q?.id] || document.getElementById(`cq-${q?.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
    else document.exitFullscreen?.()
  }

  const D = darkMode
  const passageNum = passage?.passage_number || 0
  // Parts 1-3: vertical (passage on top, questions below). Parts 4-5: split layout.
  const isVerticalLayout = passageNum >= 1 && passageNum <= 3
  const textSizeClass = textSize === 'extra_large' ? 'text-[1.3rem]' : textSize === 'large' ? 'text-[1.18rem]' : 'text-[1.08rem]'
  const questionTextSizeClass = textSize === 'extra_large' ? 'text-[1.28rem]' : textSize === 'large' ? 'text-[1.14rem]' : 'text-[1.05rem]'
  const questionZoom = textSize === 'extra_large' ? 1.18 : textSize === 'large' ? 1.1 : 1
  const bg      = D ? 'bg-gray-950' : 'bg-white'
  const topbar  = D ? 'bg-gray-900 border-gray-700' : 'bg-white border-sky-100'
  const divider = D ? 'border-gray-700' : 'border-sky-100'
  const textMain= D ? 'text-gray-100' : 'text-gray-800'
  const textSub = D ? 'text-gray-400' : 'text-gray-500'
  const qCard   = (active, answered) => D
    ? active ? 'border-sky-500 bg-gray-700/60' : answered ? 'border-sky-700 bg-sky-900/10 hover:border-sky-600' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
    : active ? 'border-sky-300 bg-sky-50/50 shadow-sm' : answered ? 'border-sky-300 bg-sky-50 hover:border-sky-400' : 'border-gray-100 bg-white hover:border-sky-200'

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${bg} ${textMain}`}>
        <div className="animate-pulse text-center">
          <div className="w-8 h-8 bg-sky-200 rounded-full mx-auto mb-2" />
          <p className={`text-sm ${textSub}`}>Loading passage...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${bg} ${textMain}`} ref={containerRef}>
      {/* Top Bar */}
      <div className={`relative flex items-center gap-2 px-4 md:px-5 h-[72px] border-b flex-shrink-0 ${topbar}`}>
        <button
          type="button"
          onClick={() => (reviewMode ? navigate(-1) : setShowExitConfirm(true))}
          className={`flex items-center gap-2 text-[14px] font-semibold transition flex-shrink-0 px-3 py-2.5 rounded-xl border ${
            D ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-sky-100 text-gray-600 hover:bg-white'
          }`}
        >
          <ChevronLeft size={15} /> <span className="hidden sm:inline">Back</span>
        </button>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="px-2 py-1 rounded-md bg-indigo-600 text-white text-[11px] sm:text-xs font-black tracking-wide">CEFR</span>
          <span className={`text-[11px] sm:text-xs ${textSub} hidden md:inline`}>ID: {user?.id ?? '—'}</span>
        </div>

        <p className="flex-1 font-semibold text-[15px] sm:text-[17px] truncate min-w-0">
          {passageTitle}
          {reviewMode ? ' — Review' : ''}
        </p>

        {!reviewMode && (
          <span className={`text-base font-semibold hidden sm:block ${textSub}`}>
            {answeredCount}/{totalQuestionsAll}
          </span>
        )}

        {!reviewMode && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 top-[10px] z-10 flex items-center gap-2 px-4 py-2 rounded-2xl font-mono text-[17px] font-extrabold ${
              timer.urgent ? 'bg-red-100 text-red-600 animate-pulse' : D ? 'bg-gray-700 text-sky-400' : 'bg-sky-50 text-sky-600'
            }`}
          >
            <Clock size={15} />
            {timer.fmt}
            <button
              type="button"
              onClick={timer.paused ? timer.start : timer.pause}
              className={`px-3 py-1 rounded-lg text-sm font-extrabold border min-w-[72px] ${
                timer.paused ? 'bg-sky-500 border-sky-500 text-white' : D ? 'bg-gray-800 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              {timer.paused ? 'Start' : 'Pause'}
            </button>
          </div>
        )}

        {reviewMode ? (
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
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
              className="p-2 rounded-xl border border-gray-200 bg-white hidden md:inline-flex"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-2 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold inline-flex items-center gap-1"
            >
              <Lock size={14} /> Results
            </button>
          </div>
        ) : (
          <div className="relative flex-shrink-0 ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFullscreen}
              className={`p-3 rounded-xl transition ${D ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((p) => !p)}
              className={`p-3 rounded-xl transition ${D ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Menu size={22} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className={`absolute right-0 top-11 w-44 rounded-2xl shadow-xl border z-50 overflow-hidden ${
                    D ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowTextSizeMenu(true)
                      setMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b transition ${
                      D ? 'border-gray-700 hover:bg-gray-700 text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    Text size
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDarkMode((p) => !p)
                      setMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b transition ${
                      D ? 'border-gray-700 hover:bg-gray-700 text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {D ? <Sun size={14} /> : <Moon size={14} />} {D ? 'Light' : 'Dark'} Mode
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!reviewMode && (
        <div className={`border-b px-4 py-2 ${D ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 whitespace-nowrap ${D ? 'border-gray-600 text-gray-200' : 'border-gray-200 text-gray-800 bg-white'}`}>
                <span className="font-semibold">Part 1</span>
                <span className={`text-xs ${textSub}`}>{questions.length} questions</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Body: Parts 1-3 = single scroll, Parts 4-5 = split */}
      {isVerticalLayout ? (
        /* ── Single scroll: passage on top, questions below (parts 1-3) ── */
        <div className="flex-1 overflow-y-auto pb-44">
          {/* Passage */}
          {passage?.content && (
            <div className={`p-5 border-b ${divider}`}>
              <div className="max-w-4xl mx-auto">
                {passage?.image && (
                  <img src={passage.image} alt="Passage" className="w-full rounded-xl object-contain max-h-64 border border-gray-200 mb-4" />
                )}
                <PassageContent content={passage.content} dark={D} textSizeClass={textSizeClass} evidenceItems={evidenceItems} />
              </div>
            </div>
          )}
          {/* Questions */}
          <div className="p-4" style={{ zoom: questionZoom }}>
            <div className="max-w-4xl mx-auto">
            <div className="space-y-3">
              {groupIntoSegments(questions).map((seg, si) => {
                if (seg.type === 'grid') return (
                  <div key={`grid-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <MatchGridBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} bookmarkedIds={bookmarkedIds} toggleBookmark={toggleBookmark} />
                  </div>
                )
                if (seg.type === 'inline') return (
                  <div key={`inline-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <InlineGapBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} />
                  </div>
                )
                if (seg.type === 'table') return (
                  <div key={`seg-table-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <TableGapBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} />
                  </div>
                )
                if (seg.type === 'flow') return (
                  <div key={`seg-flow-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <FlowBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} bookmarkedIds={bookmarkedIds} toggleBookmark={toggleBookmark} />
                  </div>
                )
                const q = seg.q
                const i = questions.indexOf(q)
                const showGroup = q.group_instruction && (i === 0 || questions[i - 1]?.group_instruction !== q.group_instruction)
                const showChoicesLegend = showGroup && ['MFEAT','M.FEAT','MEND','M.END','MATCH'].includes(q.question_type) && q.choices?.length > 0
                const isBookmarked = bookmarkedIds.has(q.id)
                const bmLoading = bookmarkLoading.has(q.id)
                const wb = q.word_bank?.length ? q.word_bank : questions.find(x => x.group_instruction === q.group_instruction && x.word_bank?.length)?.word_bank || []
                return (
                  <div key={q.id}>
                    {showGroup && <GroupInstruction text={q.group_instruction} dark={D} />}
                    {showChoicesLegend && <ChoicesLegend choices={q.choices} dark={D} />}
                    {showGroup && q.group_list?.length > 0 && <GroupList items={q.group_list} dark={D} />}
                    <div id={`cq-${q.id}`} ref={el => { questionRefs.current[q.id] = el }}
                      onClick={() => setActiveQ(i)}
                      className={`group relative p-4 rounded-2xl border cursor-pointer transition ${qCard(activeQ === i, !!answers[String(q.id)])}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-sm font-black ${D ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'}`}>{q.number}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${D ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{q.question_type_display || q.question_type}</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          {answers[String(q.id)] && <CheckCircle2 size={13} className="text-green-500" />}
                          {!reviewMode && <button onClick={e => toggleBookmark(q.id, e)} disabled={bmLoading} className={`p-1 rounded-lg transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><Bookmark size={13} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} /></button>}
                        </div>
                      </div>
                      {q.image && <img src={q.image} alt={`Q${q.number}`} className="w-full rounded-xl object-contain max-h-48 mb-2 border border-gray-200" />}
                      {['GAP','SENT','SUMM','NOTE','TABLE','FLOW','MAP'].includes(q.question_type) ? <ContentWithBlank content={q.content} dark={D} textMain={textMain} textSizeClass={questionTextSizeClass} /> : <p className={`${questionTextSizeClass} leading-snug ${textMain}`}>{q.content}</p>}
                      {reviewMode && showCorrectInReview && (() => {
                        const rr = reviewMap[String(q.id)] || reviewMap[`n-${q.number}`]
                        if (!rr) return null
                        return (<div className="mt-2 space-y-1.5"><div className={`text-sm rounded-lg px-3 py-2 border ${rr.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}><span className="font-semibold">Your: </span>{String(rr.user_answer ?? '').trim() || 'N/A'}{!rr.is_correct && <><span className="mx-2">|</span><span className="font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}</div>{q.answer_review && <div className="text-xs rounded-lg px-3 py-2 border border-yellow-200 bg-yellow-50 text-yellow-800 leading-relaxed"><span className="font-semibold block mb-0.5">Q{q.number} — Evidence:</span>{q.answer_review}</div>}</div>)
                      })()}
                      {q.question_type === 'TFNG' && <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} options={['TRUE', 'FALSE', 'NOT GIVEN']} dark={D} />}
                      {q.question_type === 'YNNG' && <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} options={['YES', 'NO', 'NOT GIVEN']} dark={D} />}
                      {q.question_type === 'MCQ' && q.choices?.length > 0 && <MCQInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />}
                      {q.question_type === 'MULTI' && q.choices?.length > 0 && <MultiSelectInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} maxSelections={q.max_selections || 2} dark={D} />}
                      {q.question_type === 'SUMM' && wb.length > 0 && <SummWordBankInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} wordBank={wb} dark={D} />}
                      {q.question_type === 'SUMM' && !wb.length && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Write your answer..." dark={D} />}
                      {['GAP','SENT','NOTE','TABLE','FLOW','MAP'].includes(q.question_type) && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Write your answer..." dark={D} />}
                      {q.question_type === 'SHORT' && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Short answer (max 3 words)..." dark={D} />}
                      {q.question_type === 'MATCH' && q.choices?.length > 0 && <MFEATInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />}
                      {q.question_type === 'MATCH' && !q.choices?.length && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v.toLowerCase())} placeholder="Heading number (i, ii, iii...)" dark={D} />}
                      {['MINFO','M.INFO'].includes(q.question_type) && <LetterGrid value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />}
                      {['MFEAT','M.FEAT'].includes(q.question_type) && <MFEATInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices?.length ? q.choices : []} dark={D} />}
                      {['MEND','M.END'].includes(q.question_type) && <MFEATInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices?.length ? q.choices : []} dark={D} />}
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Split layout (parts 4-5): passage left, questions right ── */
        <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row">
          {/* Passage panel */}
          <div className={`overflow-y-auto border-b md:border-b-0 md:border-r flex-shrink-0 pb-44 ${divider}`}
            style={{ flexBasis: `${splitRatio}%` }}>
            {passage?.image && (
              <div className="px-5 pt-5">
                <img src={passage.image} alt="Passage" className="w-full rounded-xl object-contain max-h-64 border border-gray-200" />
              </div>
            )}
            <div className="p-5 text-lg select-text pb-48">
              <div className="max-w-2xl mx-auto">
                <PassageContent content={passage?.content} dark={D} textSizeClass={textSizeClass} evidenceItems={evidenceItems} />
              </div>
            </div>
          </div>
          {/* Mobile drag */}
          <div onPointerDown={e => { e.preventDefault(); dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId) }}
            className={`md:hidden h-3 flex-shrink-0 cursor-row-resize flex items-center justify-center ${D ? 'bg-gray-800' : 'bg-sky-50'}`}
            style={{ touchAction: 'none' }}>
            <ChevronUp size={12} className={D ? 'text-gray-500' : 'text-gray-400'} />
            <ChevronDown size={12} className={D ? 'text-gray-500' : 'text-gray-400'} />
          </div>
          {/* Desktop drag */}
          <div onPointerDown={e => { e.preventDefault(); dragging.current = true; e.currentTarget.setPointerCapture?.(e.pointerId) }}
            className={`hidden md:flex w-2 flex-shrink-0 cursor-col-resize items-center justify-center ${D ? 'bg-gray-800' : 'bg-sky-50'}`}
            style={{ touchAction: 'none' }}>
            <div className={`w-0.5 h-16 rounded-full ${D ? 'bg-gray-600' : 'bg-sky-200'}`} />
          </div>
          {/* Questions panel */}
          <div className="flex-1 overflow-y-auto min-w-0 pb-44 text-base leading-relaxed">
            <div className="p-4" style={{ zoom: questionZoom }}>
            <div className="max-w-2xl mx-auto">
            <div className="space-y-3">
              {groupIntoSegments(questions).map((seg, si) => {
                if (seg.type === 'grid') return (
                  <div key={`grid-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <MatchGridBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} bookmarkedIds={bookmarkedIds} toggleBookmark={toggleBookmark} />
                  </div>
                )
                if (seg.type === 'inline') return (
                  <div key={`inline-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <InlineGapBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} />
                  </div>
                )
                if (seg.type === 'table') return (
                  <div key={`seg-table-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <TableGapBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} />
                  </div>
                )
                if (seg.type === 'flow') return (
                  <div key={`seg-flow-${si}`} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
                    <FlowBlock questions={seg.questions} answers={answers} onAnswer={(qId, val) => setAnswer(qId, val)} dark={D} reviewMode={reviewMode} reviewMap={reviewMap} showCorrectInReview={showCorrectInReview} bookmarkedIds={bookmarkedIds} toggleBookmark={toggleBookmark} />
                  </div>
                )
                const q = seg.q
                const i = questions.indexOf(q)
                const showGroup = q.group_instruction && (i === 0 || questions[i - 1]?.group_instruction !== q.group_instruction)
                const showChoicesLegend = showGroup && ['MFEAT','M.FEAT','MEND','M.END','MATCH'].includes(q.question_type) && q.choices?.length > 0
                const isBookmarked = bookmarkedIds.has(q.id)
                const bmLoading = bookmarkLoading.has(q.id)
                const wb = q.word_bank?.length ? q.word_bank : questions.find(x => x.group_instruction === q.group_instruction && x.word_bank?.length)?.word_bank || []
                return (
                  <div key={q.id}>
                    {showGroup && <GroupInstruction text={q.group_instruction} dark={D} />}
                    {showChoicesLegend && <ChoicesLegend choices={q.choices} dark={D} />}
                    {showGroup && q.group_list?.length > 0 && <GroupList items={q.group_list} dark={D} />}
                    <div id={`cq-${q.id}`} ref={el => { questionRefs.current[q.id] = el }}
                      onClick={() => setActiveQ(i)}
                      className={`group relative p-4 rounded-2xl border cursor-pointer transition ${qCard(activeQ === i, !!answers[String(q.id)])}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-sm font-black ${D ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'}`}>{q.number}</span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${D ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{q.question_type_display || q.question_type}</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          {answers[String(q.id)] && <CheckCircle2 size={13} className="text-green-500" />}
                          {!reviewMode && <button onClick={e => toggleBookmark(q.id, e)} disabled={bmLoading} className={`p-1 rounded-lg transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><Bookmark size={13} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} /></button>}
                        </div>
                      </div>
                      {q.image && <img src={q.image} alt={`Q${q.number}`} className="w-full rounded-xl object-contain max-h-48 mb-2 border border-gray-200" />}
                      {['GAP','SENT','SUMM','NOTE','TABLE','FLOW','MAP'].includes(q.question_type) ? <ContentWithBlank content={q.content} dark={D} textMain={textMain} textSizeClass={questionTextSizeClass} /> : <p className={`${questionTextSizeClass} leading-snug ${textMain}`}>{q.content}</p>}
                      {reviewMode && showCorrectInReview && (() => {
                        const rr = reviewMap[String(q.id)] || reviewMap[`n-${q.number}`]
                        if (!rr) return null
                        return (<div className="mt-2 space-y-1.5"><div className={`text-sm rounded-lg px-3 py-2 border ${rr.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}><span className="font-semibold">Your: </span>{String(rr.user_answer ?? '').trim() || 'N/A'}{!rr.is_correct && <><span className="mx-2">|</span><span className="font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}</div>{q.answer_review && <div className="text-xs rounded-lg px-3 py-2 border border-yellow-200 bg-yellow-50 text-yellow-800 leading-relaxed"><span className="font-semibold block mb-0.5">Q{q.number} — Evidence:</span>{q.answer_review}</div>}</div>)
                      })()}
                      {q.question_type === 'TFNG' && <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} options={['TRUE', 'FALSE', 'NOT GIVEN']} dark={D} />}
                      {q.question_type === 'YNNG' && <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} options={['YES', 'NO', 'NOT GIVEN']} dark={D} />}
                      {q.question_type === 'MCQ' && q.choices?.length > 0 && <MCQInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />}
                      {q.question_type === 'MULTI' && q.choices?.length > 0 && <MultiSelectInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} maxSelections={q.max_selections || 2} dark={D} />}
                      {q.question_type === 'SUMM' && wb.length > 0 && <SummWordBankInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} wordBank={wb} dark={D} />}
                      {q.question_type === 'SUMM' && !wb.length && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Write your answer..." dark={D} />}
                      {['GAP','SENT','NOTE','TABLE','FLOW','MAP'].includes(q.question_type) && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Write your answer..." dark={D} />}
                      {q.question_type === 'SHORT' && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Short answer (max 3 words)..." dark={D} />}
                      {q.question_type === 'MATCH' && q.choices?.length > 0 && <MFEATInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />}
                      {q.question_type === 'MATCH' && !q.choices?.length && <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v.toLowerCase())} placeholder="Heading number (i, ii, iii...)" dark={D} />}
                      {['MINFO','M.INFO'].includes(q.question_type) && <LetterGrid value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />}
                      {['MFEAT','M.FEAT'].includes(q.question_type) && <MFEATInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices?.length ? q.choices : []} dark={D} />}
                      {['MEND','M.END'].includes(q.question_type) && <MFEATInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices?.length ? q.choices : []} dark={D} />}
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className={`fixed bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 z-30 rounded-2xl border ${divider} ${D ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur shadow-lg`}>
        {/* Part tabs row – only when multiple parts loaded */}
        {passageIds.length > 1 && (
          <div className={`flex items-center gap-1 px-3 pt-2 pb-1 border-b ${divider} overflow-x-auto [&::-webkit-scrollbar]:hidden`} style={{ scrollbarWidth: 'none' }}>
            {passageIds.map((pid, idx) => {
              const pData = allPassagesData[idx]
              // count how many questions in this part are answered
              const pQs = pData?.questions || []
              const pAnswered = pQs.filter(q => answers[String(q.id)]).length
              const isActive = idx === activePart
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setActivePart(idx)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition border-2 ${
                    isActive
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : pAnswered === pQs.length && pQs.length > 0
                        ? D ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-emerald-500 bg-emerald-50 text-emerald-600'
                        : D ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-white text-gray-500'
                  }`}
                >
                  <span>P{idx + 1}</span>
                  {pQs.length > 0 && (
                    <span className={`text-[10px] font-medium ${isActive ? 'text-sky-100' : pAnswered === pQs.length ? 'text-emerald-400' : D ? 'text-gray-500' : 'text-gray-400'}`}>
                      {pAnswered}/{pQs.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2 max-w-screen-xl mx-auto">
          <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-2 min-w-max">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-sky-500 ${D ? 'bg-gray-800' : 'bg-white'}`}>
                <span className="text-xs font-black text-sky-500 mr-0.5 whitespace-nowrap">
                  {passageIds.length > 1 ? `P${activePart + 1}` : 'Part 1'}
                </span>
                {questions.map((q, i) => (
                  <button key={q.id} onClick={() => goToQ(i)}
                    className={`w-7 h-7 rounded-full text-[11px] font-bold transition flex items-center justify-center flex-shrink-0 ${
                      answers[String(q.id)]
                        ? 'bg-sky-500 text-white'
                        : activeQ === i
                          ? 'bg-sky-500 text-white ring-2 ring-sky-300'
                          : D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {q.number}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {!reviewMode ? (
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition whitespace-nowrap"
            >
              Finish test
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/app/cefr/reading')}
              className={`flex-shrink-0 px-4 py-2 border rounded-xl text-sm font-semibold transition whitespace-nowrap ${D ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Tests
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTextSizeMenu && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-2xl overflow-hidden border ${D ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'}`}
            >
              <div className={`px-4 py-3 flex items-center justify-between border-b ${D ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="font-black text-lg">Text size</h3>
                <button
                  type="button"
                  onClick={() => setShowTextSizeMenu(false)}
                  className={`w-8 h-8 rounded-lg border ${D ? 'border-gray-600' : 'border-gray-200'}`}
                >
                  ✕
                </button>
              </div>
              <div className="p-2">
                {[
                  { id: 'regular', label: 'Regular' },
                  { id: 'large', label: 'Large' },
                  { id: 'extra_large', label: 'Extra large' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTextSize(opt.id)
                      setShowTextSizeMenu(false)
                    }}
                    className={`w-full px-4 py-3 rounded-xl text-left flex items-center justify-between ${
                      textSize === opt.id
                        ? D ? 'bg-gray-800 text-white' : 'bg-slate-100 text-slate-900'
                        : D ? 'hover:bg-gray-800 text-gray-200' : 'hover:bg-gray-50 text-slate-700'
                    }`}
                  >
                    <span className="text-base">{opt.label}</span>
                    {textSize === opt.id && <span className="font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`rounded-2xl shadow-2xl p-6 w-full max-w-sm ${D ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-sky-500" />
              </div>
              <h3 className="font-bold text-center text-lg mb-1">Submit test?</h3>
              <p className={`text-sm text-center mb-4 ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                {answeredCount} of {totalQuestionsAll} answered
                {totalQuestionsAll - answeredCount > 0 && (
                  <span className="text-red-500"> ({totalQuestionsAll - answeredCount} unanswered)</span>
                )}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)}
                  className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition ${D ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition">
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
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
                {answeredCount} / {totalQuestionsAll} javob
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className={`py-2.5 border rounded-xl text-sm font-medium ${D ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}
                >
                  Cancel
                </button>
                <button type="button" onClick={handleBackToList} className={`py-2.5 border rounded-xl text-sm font-medium ${D ? 'border-gray-600' : 'border-gray-200'}`}>
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
      </AnimatePresence>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}



