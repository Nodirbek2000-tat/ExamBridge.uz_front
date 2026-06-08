import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, ChevronLeft, Send, CheckCircle2, XCircle,
  BookOpen, Maximize2, Minimize2, RotateCcw, Lock,
  Sun, Moon, StickyNote, ChevronUp, ChevronDown,
  X, Plus, ChevronRight, AlertTriangle, Menu, Trash2, Bookmark, ArrowDown,
} from 'lucide-react'
import api from '../../api/client'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />
}

// -- Highlight colors ----------------------------------------------------------
const HL_COLORS = [
  { id: 'yellow', label: 'Yellow', bg: '#facc15', markBg: '#facc15' },
  { id: 'blue',   label: 'Blue',   bg: '#60a5fa', markBg: '#60a5fa' },
  { id: 'green',  label: 'Green',  bg: '#34d399', markBg: '#34d399' },
]

function getNodePath(root, node) {
  const path = []
  let current = node
  while (current && current !== root) {
    const parent = current.parentNode
    if (!parent) return null
    const index = Array.prototype.indexOf.call(parent.childNodes, current)
    path.unshift(index)
    current = parent
  }
  return current === root ? path : null
}

function getNodeByPath(root, path) {
  let current = root
  for (const idx of path) {
    if (!current || !current.childNodes || !current.childNodes[idx]) return null
    current = current.childNodes[idx]
  }
  return current
}

// -- Timer ---------------------------------------------------------------------
function useTimer(initialSeconds, storageKey) {
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
    if (paused || seconds <= 0) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(intervalRef.current)
  }, [paused, seconds])

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return
    const payload = JSON.stringify({ remaining: seconds, paused, ts: Date.now() })
    localStorage.setItem(storageKey, payload)
  }, [seconds, paused, storageKey])

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
    stop: () => { clearInterval(intervalRef.current); setPaused(true) },
    clearPersist,
    urgent: seconds < 120 && seconds > 0,
  }
}

// -- Question input components -------------------------------------------------
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

function TextInput({ value, onChange, placeholder, dark }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || 'Type your answer...'}
      className={`mt-2 w-full px-3 py-2 border rounded-lg text-[1em] focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition ${
        dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'
      }`} />
  )
}

function ContentWithBlank({ content, dark, textMain }) {
  if (!content?.includes('___')) {
    return <p className={`text-[1em] leading-snug ${textMain}`}>{content}</p>
  }
  const parts = content.split('___')
  return (
    <p className={`text-[1em] leading-snug ${textMain}`}>
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

function MultiSelectInput({ value, onChange, choices, maxSelections, dark }) {
  const selected = value ? value.split('|').filter(Boolean) : []
  const toggle = (opt) => {
    let next
    if (selected.includes(opt)) {
      next = selected.filter(s => s !== opt)
    } else {
      if (maxSelections && selected.length >= maxSelections) return
      next = [...selected, opt]
    }
    onChange(next.join('|'))
  }
  return (
    <div className="space-y-1.5 mt-2">
      {maxSelections > 1 && (
        <p className={`text-xs mb-2 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          Choose {maxSelections} answers ({selected.length}/{maxSelections} selected)
        </p>
      )}
      {choices.map(c => {
        const checked = selected.includes(c.option)
        return (
          <button key={c.option} onClick={() => toggle(c.option)}
            className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-[1em] text-left transition ${
              checked
                ? 'bg-sky-50 border-sky-400 text-sky-700'
                : dark
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-sky-500'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-sky-200'
            }`}>
            <span className={`w-4 h-4 mt-0.5 flex-shrink-0 rounded border-2 flex items-center justify-center transition ${
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

// -- Passage markdown > HTML converter ----------------------------------------
// Handles: **bold**, *italic*, _italic_, # headings, blank-line paragraphs
function passageMarkdownToHtml(text) {
  if (!text) return ''
  const lines = text.split('\n')
  const htmlLines = lines.map(line => {
    // Headings: ## or # at line start
    const h2 = line.match(/^##\s+(.+)/)
    if (h2) return `<h3 class="font-bold text-lg mt-4 mb-1">${applyInline(h2[1])}</h3>`
    const h1 = line.match(/^#\s+(.+)/)
    if (h1) return `<h2 class="font-extrabold text-xl mt-5 mb-2">${applyInline(h1[1])}</h2>`
    // Empty line > paragraph break marker
    if (line.trim() === '') return '__PARA_BREAK__'
    return applyInline(line)
  })
  // Join lines, wrap paragraph groups in <p>
  const joined = htmlLines.join('\n')
  const paras = joined.split('__PARA_BREAK__')
  return paras
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => {
      // If it's already a block element, don't wrap in <p>
      if (/^<h[1-6]/.test(p.trim())) return p.replace(/\n/g, '<br/>')
      return `<p class="mb-3">${p.replace(/\n/g, '<br/>')}</p>`
    })
    .join('\n')
}

function applyInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')   // **bold**
    .replace(/\*(.+?)\*/g, '<em>$1</em>')                // *italic*
    .replace(/_(.+?)_/g, '<em>$1</em>')                  // _italic_
}

// -- Inject answer-location highlights into passage HTML -----------------------
// Items: [{ snippet: string, questionNumber: number }]
// Uses DOM TreeWalker to find text nodes, then wraps the match with a yellow
// <mark> + red question-number badge. Handles text spanning bold/italic tags.
function injectPassageHighlights(html, items) {
  if (!html || !items?.length) return html

  const container = document.createElement('div')
  container.innerHTML = html

  // Collect all text nodes and their global plain-text offsets
  const textNodes = []
  let offset = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const len = node.textContent.length
    textNodes.push({ node, start: offset, end: offset + len })
    offset += len
  }
  const plainText = textNodes.map(n => n.node.textContent).join('')

  // Find each snippet in plain text (case-insensitive, flexible whitespace)
  const positioned = []
  for (const item of items) {
    if (!item.snippet || item.snippet.length < 3) continue
    const escaped = item.snippet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const flexible = escaped.replace(/\s+/g, '[\\s\\S]{0,3}')
    try {
      const re = new RegExp(flexible, 'i')
      const m = re.exec(plainText)
      if (m) positioned.push({ ...item, matchStart: m.index, matchEnd: m.index + m[0].length })
    } catch { /* skip */ }
  }
  // Process from end → start so earlier offsets stay valid
  positioned.sort((a, b) => b.matchStart - a.matchStart)

  const already = new Set()
  for (const item of positioned) {
    if (already.has(item.questionNumber)) continue
    const { matchStart, matchEnd } = item

    // Find text nodes that overlap this range
    const overlapping = textNodes.filter(n => n.start < matchEnd && n.end > matchStart)
    if (!overlapping.length) continue

    const firstTN = overlapping[0]

    if (overlapping.length === 1) {
      // Simple single-node split-and-wrap
      const tn = firstTN
      const txt = tn.node.textContent
      const lStart = matchStart - tn.start
      const lEnd   = matchEnd   - tn.start
      const before  = txt.slice(0, lStart)
      const matched = txt.slice(lStart, lEnd)
      const after   = txt.slice(lEnd)

      const mark = document.createElement('mark')
      mark.className = 'answer-mark'
      const badge = document.createElement('span')
      badge.className = 'q-num-badge'
      badge.textContent = String(item.questionNumber)
      mark.appendChild(badge)
      mark.appendChild(document.createTextNode(matched))

      const parent = tn.node.parentNode
      if (!parent) continue   // node detached by a previous iteration — skip
      if (before) parent.insertBefore(document.createTextNode(before), tn.node)
      parent.insertBefore(mark, tn.node)
      if (after) parent.insertBefore(document.createTextNode(after), tn.node)
      parent.removeChild(tn.node)
    } else {
      // Multi-node: collect matching text chunks, wrap in a single mark
      // Only do this when nodes are siblings under the same paragraph parent
      const para = firstTN.node.parentNode?.closest?.('p, li, td, h2, h3') || firstTN.node.parentNode
      const mark = document.createElement('mark')
      mark.className = 'answer-mark'
      const badge = document.createElement('span')
      badge.className = 'q-num-badge'
      badge.textContent = String(item.questionNumber)
      mark.appendChild(badge)

      // Insert mark just before the first overlapping text node's element
      let insertAnchor = firstTN.node
      while (insertAnchor.parentNode !== para && insertAnchor.parentNode) insertAnchor = insertAnchor.parentNode
      if (!para || !insertAnchor.parentNode) continue   // detached — skip
      para.insertBefore(mark, insertAnchor)

      for (const tn of overlapping) {
        const txt = tn.node.textContent
        const lStart = Math.max(0, matchStart - tn.start)
        const lEnd   = Math.min(txt.length, matchEnd - tn.start)

        if (tn === firstTN && lStart > 0) {
          // Text before match stays in original position
          const beforeNode = document.createTextNode(txt.slice(0, lStart))
          para.insertBefore(beforeNode, mark)
        }
        mark.appendChild(document.createTextNode(txt.slice(lStart, lEnd)))
        if (tn === overlapping[overlapping.length - 1] && lEnd < txt.length) {
          mark.parentNode.insertBefore(document.createTextNode(txt.slice(lEnd)), mark.nextSibling)
        }
        tn.node.parentNode.removeChild(tn.node)
      }
    }

    already.add(item.questionNumber)
  }

  return container.innerHTML
}

// -- "Questions N�M �" lines before first [gap] > plain header (no card border) -
function splitIeltsGroupPreamble(fullGi) {
  if (!fullGi?.trim()) return { preamble: '', body: fullGi || '' }
  const lines = fullGi.split('\n')
  const gapIdx = lines.findIndex(l => /\[\d+\]/.test(l))
  if (gapIdx <= 0) return { preamble: '', body: fullGi }
  const preamble = lines.slice(0, gapIdx).join('\n').replace(/\s+$/, '')
  const firstNonEmpty = preamble.split('\n').map(l => l.trim()).find(Boolean)
  if (!firstNonEmpty || !/^questions?\s*\d+/i.test(firstNonEmpty)) return { preamble: '', body: fullGi }
  const body = lines.slice(gapIdx).join('\n')
  return { preamble, body: body || fullGi }
}

// -- Group Instruction � markdown rendering (**bold**, � bullets) --------------
function GroupInstruction({ text, dark }) {
  if (!text) return null
  const lines = text.split('\n')
  return (
    <div
      className={`mb-3 px-0.5 border-0 shadow-none rounded-none ${
        dark ? 'text-gray-100 bg-transparent' : 'text-gray-900 bg-white'
      }`}
    >
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1.5" />
        const parseBold = (str) => str.split(/\*\*(.*?)\*\*/g).map((p, pi) =>
          pi % 2 === 1 ? <strong key={pi} className="font-bold">{p}</strong> : p
        )
        const isRangeTitle = /^questions?\s*\d+/i.test(line.trim())
        const isBullet = /^[�\-]\s/.test(line.trimStart())
        if (isBullet) {
          const content = line.replace(/^[�\-]\s+/, '')
          return (
            <div key={i} className="flex items-start gap-1.5 mt-0.5 ml-0.5 text-sm sm:text-base font-bold leading-snug">
              <span className="mt-0.5 flex-shrink-0 opacity-60">�</span>
              <span>{parseBold(content)}</span>
            </div>
          )
        }
        const isHeader = line.trim().startsWith('**') && line.trim().endsWith('**')
        return (
          <div
            key={i}
            className={`mt-0.5 leading-snug ${
              isRangeTitle
                ? 'text-base sm:text-lg font-bold'
                : isHeader
                  ? 'font-bold mt-2 first:mt-0 text-[1.02em]'
                  : 'text-sm sm:text-base font-bold'
            }`}
          >
            {parseBold(line)}
          </div>
        )
      })}
    </div>
  )
}

// -- Per-question bookmark (inline + grid + card) -----------------------------
function QuestionBookmarkButton({ qId, isBookmarked, bookmarkLoading, reviewMode, dark, toggleBookmark, size = 18, className = '', hoverOnly = false }) {
  if (reviewMode || !toggleBookmark) return null
  const busy = bookmarkLoading?.has?.(qId)
  return (
    <button
      type="button"
      title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
      disabled={!!busy}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(qId, e) }}
      className={`inline-flex shrink-0 items-center justify-center rounded-md p-0.5 transition disabled:opacity-40 ${
        hoverOnly
          ? (isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')
          : ''
      } ${
        isBookmarked ? '' : dark ? 'text-gray-500 hover:bg-gray-700/60' : 'text-gray-400 hover:bg-gray-100'
      } ${className}`}
    >
      <Bookmark
        size={size}
        className={
          isBookmarked
            ? 'text-red-600 fill-red-600 stroke-red-600'
            : `fill-none ${dark ? 'stroke-gray-500' : 'stroke-gray-400'}`
        }
        strokeWidth={2}
      />
    </button>
  )
}

// -- Choices Legend � shown once per MFEAT/MEND/MATCH group -------------------
function ChoicesLegend({ choices, dark }) {
  if (!choices?.length) return null
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

// -- Group List � labeled list shown below group_instruction -------------------
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
            <span className={`font-bold flex-shrink-0 w-7 ${D ? 'text-gray-200' : 'text-gray-900'}`}>{item.option}.</span>
            <span className="leading-snug">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- SUMM word bank ------------------------------------------------------------
function SummWordBankInput({ value, onChange, wordBank, dark }) {
  return (
    <div>
      {wordBank?.length > 0 && (
        <div className="mt-2">
          <p className={`text-[0.78em] font-bold mb-1.5 uppercase tracking-wider ${dark ? 'text-gray-400' : 'text-gray-400'}`}>Word Bank</p>
          <div className={`flex flex-wrap gap-1.5 p-3 rounded-xl border ${dark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
            {wordBank.map(w => (
              <button key={w} onClick={() => onChange(value === w ? '' : w)}
                className={`px-2.5 py-1 rounded-lg text-[0.82em] border font-medium transition ${
                  value === w
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : dark ? 'bg-gray-700 border-gray-600 text-gray-300 hover:border-sky-400 hover:text-sky-300'
                           : 'bg-white border-gray-200 text-gray-700 hover:border-sky-300 hover:bg-sky-50'
                }`}>
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
      <input value={value} onChange={e => onChange(e.target.value)}
        placeholder={wordBank?.length ? "Yuqoridagi so'zlardan tanlang yoki yozing..." : "Write your answer..."}
        className={`mt-2 w-full px-3 py-2 border rounded-lg text-[1em] focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition ${
          dark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800'
        }`} />
    </div>
  )
}

// -- Dropdown for MFEAT / MEND / MATCH ----------------------------------------
function DropdownSelect({ value, onChange, choices, placeholder, dark }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`mt-2 w-full px-3 py-2.5 border rounded-xl text-[1em] focus:outline-none focus:border-sky-400 transition cursor-pointer ${
        value
          ? dark ? 'bg-sky-900/30 border-sky-500 text-sky-200 font-semibold' : 'bg-sky-50 border-sky-400 text-sky-800 font-semibold'
          : dark ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-200 text-gray-700'
      }`}>
      <option value="">{placeholder || '-- Select answer --'}</option>
      {(choices || []).map(c => (
        <option key={c.option} value={c.option}>{c.option}. {c.text}</option>
      ))}
    </select>
  )
}

// -- Letter grid for MINFO -----------------------------------------------------
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

// -- Group segments: groups consecutive compatible questions for special rendering -
function groupSegments(questions) {
  const segments = []
  let i = 0
  while (i < questions.length) {
    const q = questions[i]
    const qt = q.question_type
    const gi = q.group_instruction

    // MFEAT / M.FEAT with choices > dropdown list block (legend + per-row dropdown)
    if (['MFEAT','M.FEAT'].includes(qt) && q.choices?.length > 0) {
      const grp = [q]
      let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        ['MFEAT','M.FEAT'].includes(questions[j].question_type)) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'mfeat', questions: grp }); i = j; continue
    }

    // MINFO � group instruction ichidan A�H ni o'qib, choices avtomatik yaratiladi
    if (['MINFO','M.INFO'].includes(qt)) {
      const grp = [q]
      let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        ['MINFO','M.INFO'].includes(questions[j].question_type)) {
        grp.push(questions[j]); j++
      }
      // group_instruction dan "A�H" yoki "A-G" kabi diapazonni topib choices yasaymiz
      const rangeMatch = gi.match(/\b([A-H])[�\-]([A-H])\b/i)
      const from = rangeMatch ? rangeMatch[1].toUpperCase().charCodeAt(0) : 65 // A
      const to   = rangeMatch ? rangeMatch[2].toUpperCase().charCodeAt(0) : 72 // H
      const autoChoices = q.choices?.length
        ? q.choices
        : Array.from({ length: to - from + 1 }, (_, k) => {
            const letter = String.fromCharCode(from + k)
            return { option: letter, text: `Paragraph ${letter}` }
          })
      segments.push({ type: 'grid', questions: grp.map(qq => ({ ...qq, choices: qq.choices?.length ? qq.choices : autoChoices })) })
      i = j; continue
    }

    // MEND / MATCH with choices > grid matrix
    const GRID_TYPES = ['MEND','M.END','MATCH']
    if (GRID_TYPES.includes(qt) && q.choices?.length > 0) {
      const grp = [q]
      let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        GRID_TYPES.includes(questions[j].question_type)) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'grid', questions: grp }); i = j; continue
    }

    // NOTE / SUMM with [N] markers in group_instruction > inline gap block
    if (['NOTE','SUMM'].includes(qt) && gi && /\[\d+\]/.test(gi)) {
      const grp = [q]
      let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        ['NOTE','SUMM'].includes(questions[j].question_type)) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'inline', questions: grp }); i = j; continue
    }

    // TABLE with [N] markers in content > table gap block
    if (qt === 'TABLE' && q.content && /\[\d+\]/.test(q.content)) {
      const grp = [q]
      let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        questions[j].question_type === 'TABLE' &&
        questions[j].content === q.content) {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'table', questions: grp }); i = j; continue
    }

    // FLOW > group consecutive FLOW questions into a flowchart block
    if (qt === 'FLOW') {
      const grp = [q]
      let j = i + 1
      while (j < questions.length &&
        questions[j].group_instruction === gi &&
        questions[j].question_type === 'FLOW') {
        grp.push(questions[j]); j++
      }
      segments.push({ type: 'flow', questions: grp }); i = j; continue
    }

    segments.push({ type: 'card', questions: [q] }); i++
  }
  return segments
}

// -- Match Grid Block � Screenshot 2 style (MEND / MINFO) ---------------------
// Clean table: group_instruction text above, column A�G headers, radio per cell
function MatchGridBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const choices = questions[0]?.choices || []
  const groupList = questions[0]?.group_list || []
  const qt = questions[0]?.question_type
  const gi = questions[0]?.group_instruction || ''

  // Decide what legend to show above the grid:
  // MEND > use group_list (full ending texts); MFEAT/MATCH > use choices (full option texts)
  const isMend = ['MEND', 'M.END'].includes(qt)
  const legendItems = isMend ? groupList : choices

  return (
    <>
      {gi ? <GroupInstruction text={gi} dark={D} /> : null}
      {legendItems?.length > 0 && <GroupList items={legendItems} dark={D} />}
      <div className={`rounded-2xl overflow-hidden mb-2 border-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
      {/* Grid table � xuddi screenshot 2 dek */}
      <div className="overflow-x-auto">
        <table className={`w-full text-sm border-collapse ${D ? 'text-gray-300' : 'text-gray-700'}`}>
          <thead>
            <tr>
              <th className={`px-4 py-3 text-left border-b-2 border-r-2 font-normal text-xs ${D ? 'border-gray-700 text-gray-500' : 'border-gray-300 text-gray-400'}`} style={{ minWidth: 220 }} />
              {choices.map(c => (
                <th key={c.option}
                  className={`px-3 py-3 text-center font-bold border-b-2 border-r-2 last:border-r-0 w-14 ${D ? 'border-gray-700 text-gray-200' : 'border-gray-300 text-gray-700'}`}>
                  {c.option}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, ri) => {
              const val = answers[String(q.id)] || ''
              const rr = reviewMode && showCorrectInReview
                ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
              const isBookmarked = bookmarkedIds?.has(q.id)
              return (
                <tr key={q.id} id={`q-${q.id}`}
                  className={`border-b-2 last:border-b-0 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                  {/* Row label: number + statement */}
                    <td className={`px-4 py-3 border-r-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                    <div className="group flex items-start gap-2">
                      <span className={`font-bold flex-shrink-0 w-7 ${D ? 'text-gray-200' : 'text-gray-900'}`}>{q.number}.</span>
                      <span className={`leading-snug ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                        {q.content}
                        {rr && !rr.is_correct && (
                          <span className="ml-1.5 text-xs font-semibold text-red-500">? {'>'} {rr.correct_answer}</span>
                        )}
                        {rr?.is_correct && <span className="ml-1.5 text-xs font-semibold text-green-500">?</span>}
                      </span>
                      <QuestionBookmarkButton
                        qId={q.id}
                        isBookmarked={isBookmarked}
                        bookmarkLoading={bookmarkLoading}
                        reviewMode={reviewMode}
                        dark={D}
                        toggleBookmark={toggleBookmark}
                        size={15}
                        hoverOnly
                        className="ml-auto flex-shrink-0 mt-0.5"
                      />
                    </div>
                  </td>
                  {/* Radio cells */}
                  {choices.map(c => {
                    const selected = val === c.option
                    return (
                      <td key={c.option} className={`p-0 border-r-2 last:border-r-0 align-stretch w-14 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
                        <button
                          type="button"
                          tabIndex={reviewMode ? -1 : 0}
                          aria-disabled={reviewMode}
                          aria-pressed={selected}
                          aria-label={`Question ${q.number}, option ${c.option}`}
                          onClick={() => { if (reviewMode) return; onAnswer(q.id, selected ? '' : c.option) }}
                          className={`group flex h-full min-h-[56px] w-full items-center justify-center transition outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                            reviewMode
                              ? 'cursor-default pointer-events-none'
                              : `cursor-pointer ${D ? 'hover:bg-gray-700/40' : 'hover:bg-sky-50'}`
                          } ${selected ? (D ? 'bg-sky-900/25' : 'bg-sky-50') : ''}`}
                        >
                          <span className={`pointer-events-none w-5 h-5 rounded-full border-2 inline-flex items-center justify-center shrink-0 transition ${
                            selected
                              ? 'border-sky-500 bg-sky-500'
                              : D ? 'border-gray-500 group-hover:border-sky-400' : 'border-gray-400 group-hover:border-sky-500'
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

// -- MFEAT Block � Legend (A.Person�) above + per-question dropdown -----------
function MFeatBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const choices = questions[0]?.choices || []
  const gi = questions[0]?.group_instruction || ''
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
      {/* Choices legend � A.Person, B.Person � */}
      {choices.length > 0 && (
        <div className={`mb-3 rounded-xl border px-4 py-3 text-[0.9em] ${D ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
          <div className="space-y-1">
            {choices.map(c => (
              <div key={c.option} className="flex items-start gap-2">
                <span className={`font-bold flex-shrink-0 w-6 ${D ? 'text-gray-200' : 'text-gray-900'}`}>{c.option}.</span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Per-question rows with dropdown */}
      <div className={`rounded-2xl border overflow-visible ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        {questions.map((q, idx) => {
          const val = answers[String(q.id)] || ''
          const rr = reviewMode && showCorrectInReview
            ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
          const isBookmarked = bookmarkedIds?.has(q.id)
          return (
            <div key={q.id} id={`q-${q.id}`}
              className={`flex items-center gap-3 px-4 py-3 ${idx < questions.length - 1 ? (D ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
              {/* Number */}
              <span className={`font-bold flex-shrink-0 w-7 text-sm ${D ? 'text-gray-200' : 'text-gray-900'}`}>{q.number}.</span>
              {/* Statement */}
              <span className={`flex-1 text-sm leading-snug ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                {q.content}
                {rr && !rr.is_correct && (
                  <span className="ml-2 text-xs font-semibold text-red-500">? {'>'} {rr.correct_answer}</span>
                )}
                {rr?.is_correct && <span className="ml-2 text-xs font-semibold text-green-500">?</span>}
              </span>
              {/* Bookmark */}
              {!reviewMode && (
                <QuestionBookmarkButton
                  qId={q.id}
                  isBookmarked={isBookmarked}
                  bookmarkLoading={bookmarkLoading}
                  reviewMode={reviewMode}
                  dark={D}
                  toggleBookmark={toggleBookmark}
                  size={15}
                  hoverOnly
                  className="flex-shrink-0"
                />
              )}
              {/* Dropdown */}
              <div className="relative flex-shrink-0 w-28" ref={(el) => { dropdownRefs.current[q.id] = el }}>
                <button
                  type="button"
                  disabled={reviewMode}
                  onClick={() => !reviewMode && setOpenId((prev) => (prev === q.id ? null : q.id))}
                  className={`w-full px-2 py-1.5 rounded-lg border text-sm font-semibold transition flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                    val
                      ? D ? 'bg-sky-900/40 border-sky-500 text-sky-200' : 'bg-sky-50 border-sky-400 text-sky-800'
                      : D ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-white border-gray-300 text-gray-600'
                  } ${reviewMode ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                >
                  <span>{val || `Q${q.number}`}</span>
                  <ChevronDown size={14} className={`transition-transform ${openId === q.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openId === q.id && !reviewMode && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: 'easeOut' }}
                      className={`absolute right-0 z-40 mt-1 w-full rounded-lg border shadow-lg overflow-hidden ${
                        D ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => { onAnswer(q.id, ''); setOpenId(null) }}
                        className={`w-full px-3 py-2 text-sm text-left transition ${D ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        --
                      </button>
                      {choices.map(c => (
                        <button
                          key={c.option}
                          type="button"
                          onClick={() => { onAnswer(q.id, c.option); setOpenId(null) }}
                          className={`w-full px-3 py-2 text-sm text-left transition ${
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- MINFO Block � each question + paragraph letter buttons on the right -------
function MInfoBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const choices = questions[0]?.choices?.length
    ? questions[0].choices
    : 'ABCDEFGH'.split('').map(l => ({ option: l, text: `Paragraph ${l}` }))
  const gi = questions[0]?.group_instruction || ''

  return (
    <div className="mb-2">
      {gi && <GroupInstruction text={gi} dark={D} />}
      <div className={`rounded-2xl border overflow-hidden ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        {questions.map((q, idx) => {
          const val = answers[String(q.id)] || ''
          const rr = reviewMode && showCorrectInReview
            ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
          const isBookmarked = bookmarkedIds?.has(q.id)
          return (
            <div key={q.id} id={`q-${q.id}`}
              className={`px-4 py-3 ${idx < questions.length - 1 ? (D ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''}`}>
              {/* Top row: number + statement */}
              <div className="flex items-start gap-2 mb-2">
                <span className={`font-bold flex-shrink-0 w-7 text-sm ${D ? 'text-gray-200' : 'text-gray-900'}`}>{q.number}.</span>
                <span className={`flex-1 text-sm leading-snug ${D ? 'text-gray-200' : 'text-gray-800'}`}>
                  {q.content}
                  {rr && !rr.is_correct && <span className="ml-2 text-xs font-semibold text-red-500">? {'>'} {rr.correct_answer}</span>}
                  {rr?.is_correct && <span className="ml-2 text-xs font-semibold text-green-500">?</span>}
                </span>
                {!reviewMode && (
                  <QuestionBookmarkButton
                    qId={q.id} isBookmarked={isBookmarked}
                    bookmarkLoading={bookmarkLoading} reviewMode={reviewMode}
                    dark={D} toggleBookmark={toggleBookmark}
                    size={15} hoverOnly className="flex-shrink-0 mt-0.5"
                  />
                )}
              </div>
              {/* Letter buttons row */}
              <div className="flex flex-wrap gap-1.5 pl-7">
                {choices.map(c => {
                  const selected = val === c.option
                  return (
                    <button key={c.option}
                      type="button"
                      disabled={reviewMode}
                      title={c.text}
                      onClick={() => { if (!reviewMode) onAnswer(q.id, selected ? '' : c.option) }}
                      className={`w-9 h-9 rounded-xl font-bold text-sm border transition ${
                        selected
                          ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
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
            </div>
          )
        })}
      </div>
    </div>
  )
}

// -- Inline Gap Block � Screenshot 1 (SUMM) + Screenshot 3 (NOTE) style --------
// SUMM: paragraf matn + [N] dashed box + pastda 3-column word bank grid
// NOTE + SUMM inline gap block
// Parser: avval line bo'yicha split > keyin har line ichida [N] gap qidiradi
// Qo'llab-quvvatlaydi: **bold header**, � bullet, 1. numbered list, plain text
function InlineGapBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark
  const [focusedId, setFocusedId] = useState(null)
  const [draggingWord, setDraggingWord] = useState('')
  const [dragOverId, setDragOverId] = useState(null)
  const qt = questions[0]?.question_type
  const isSumm = qt === 'SUMM'
  const gi = questions[0]?.group_instruction || ''
  const { preamble, body } = splitIeltsGroupPreamble(gi)
  const contentGi = preamble ? body : gi
  const wordBank = questions.reduce((wb, q) => wb.length ? wb : (q.word_bank?.length ? q.word_bank : []), [])
  const qByNum = {}
  questions.forEach(q => { qByNum[q.number] = q })
  const usedWords = new Map()
  questions.forEach(q => { const v = answers[String(q.id)]; if (v) usedWords.set(v, q.id) })

  // -- Single gap rendered as a plain input box ------------------------------
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

    const isBm = bookmarkedIds?.has?.(q.id)
    return (
      <span key={key} className="group inline-flex items-center gap-0.5 mx-0.5" style={{ verticalAlign: 'middle' }}>
        <input
          value={val}
          readOnly={reviewMode}
          onChange={e => !reviewMode && onAnswer(q.id, e.target.value)}
          onFocus={() => setFocusedId(q.id)}
          onBlur={() => setFocusedId(null)}
          onDragOver={(e) => {
            if (reviewMode || !isSumm) return
            e.preventDefault()
          }}
          onDragEnter={(e) => {
            if (reviewMode || !isSumm) return
            e.preventDefault()
            setDragOverId(q.id)
          }}
          onDragLeave={() => {
            if (dragOverId === q.id) setDragOverId(null)
          }}
          onDrop={(e) => {
            if (reviewMode || !isSumm) return
            e.preventDefault()
            const dropped = e.dataTransfer.getData('text/plain').trim() || draggingWord
            if (!dropped) return
            onAnswer(q.id, dropped)
            setDragOverId(null)
            setFocusedId(q.id)
          }}
          placeholder={String(qNum)}
          className={`${isSumm ? 'border-2 border-dashed' : 'border'} rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-gray-500 transition ${borderCls} ${bgCls} placeholder-gray-400 ${
            dragOverId === q.id ? 'ring-2 ring-sky-300' : ''
          }`}
          style={{ width: 150, height: 34, paddingLeft: 6, paddingRight: 6 }}
        />
        {rr && !rr.is_correct && (
          <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>
        )}
        <QuestionBookmarkButton
          qId={q.id}
          isBookmarked={isBm}
          bookmarkLoading={bookmarkLoading}
          reviewMode={reviewMode}
          dark={D}
          toggleBookmark={toggleBookmark}
          size={18}
          hoverOnly
        />
      </span>
    )
  }

  // -- Inline text parser: handles [N] gaps and **bold** --------------------
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

  // -- Line-first renderer: \n > detect type > parseInline -----------------
  const renderLines = () =>
    contentGi.split('\n').map((line, li) => {
      if (!line.trim()) return <div key={li} className="h-2" />

      const isBullet   = /^[�\-]\s/.test(line.trimStart())
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
        const inner = line.replace(/^[�\-]\s+/, '')
        return (
          <div key={li} className={`flex items-baseline gap-2 ml-2 leading-relaxed ${D ? 'text-gray-300' : 'text-gray-800'}`}>
            <span className="flex-shrink-0 text-sm">�</span>
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
    <>
      {preamble ? <GroupInstruction text={preamble} dark={D} /> : null}
      <div className={`rounded-xl overflow-hidden mb-2 border ${D ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}>
        {/* Text body with inline gaps */}
        <div className="px-5 py-4 text-sm space-y-0.5">
          {renderLines()}
        </div>

        {/* Word Bank (SUMM only) */}
        {isSumm && wordBank.length > 0 && (
          <div className={`border-t px-5 py-3 ${D ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs font-semibold mb-2 ${D ? 'text-gray-400' : 'text-gray-500'}`}>Word Bank</p>
            <div className="flex flex-wrap gap-2">
              {wordBank.map(w => {
                const usedBy = usedWords.get(w)
                const isFilled = !!usedBy
                return (
                  <button
                    key={w}
                    draggable={isSumm && !reviewMode && !isFilled}
                    onDragStart={(e) => {
                      if (!isSumm || reviewMode || isFilled) return
                      e.dataTransfer.setData('text/plain', w)
                      e.dataTransfer.effectAllowed = 'copy'
                      setDraggingWord(w)
                    }}
                    onDragEnd={() => {
                      setDraggingWord('')
                      setDragOverId(null)
                    }}
                    onClick={() => {
                      const target = focusedId
                        ? questions.find(q => q.id === focusedId)
                        : questions.find(q => !answers[String(q.id)])
                      if (target) onAnswer(target.id, answers[String(target.id)] === w ? '' : w)
                    }}
                    className={`px-3 py-1 border rounded text-sm transition ${
                      isFilled
                        ? D ? 'border-gray-600 bg-gray-700/30 text-gray-500 line-through' : 'border-gray-200 bg-gray-100 text-gray-400 line-through'
                        : D ? 'border-gray-500 bg-gray-800 text-gray-200 hover:border-gray-300' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {w}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// -- Table Gap Block (TABLE type with [N] markers in markdown table) ----------
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
        {rr && !rr.is_correct && <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>}
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
    <>
      {gi ? <GroupInstruction text={gi} dark={D} /> : null}
      <div className={`rounded-xl overflow-hidden mb-2 border-2 ${D ? 'border-gray-700' : 'border-gray-300'}`}>
      <div className="overflow-x-auto">
        <table className={`min-w-full text-sm font-normal border-collapse ${D ? 'text-gray-200' : 'text-gray-800'}`}>
          {headerRow.length > 0 && (
            <thead>
              <tr className={D ? 'bg-gray-700/60' : 'bg-gray-100'}>
                {headerRow.map((cell, ci) => (
                  <th key={ci} className={`px-4 py-2.5 text-left font-bold border-b-2 border-r-2 last:border-r-0 whitespace-nowrap ${D ? 'border-gray-600' : 'border-gray-300'}`}>
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
                  <td key={ci} className={`px-4 py-3 border-r-2 last:border-r-0 leading-relaxed font-normal ${D ? 'border-gray-700' : 'border-gray-300'}`}>
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

// -- Flow Chart Block (FLOW type) ----------------------------------------------
// Renders consecutive FLOW questions as a vertical flowchart with down arrows.
// Single question with > in content > parsed into multiple display boxes.
// Multiple questions in same group > each is one box in the flowchart.
// Content with ___ > input rendered inline; without ___ > plain labeled box.
function FlowBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
  const D = dark

  const gi = questions[0]?.group_instruction || ''
  const groupList = questions[0]?.group_list

  // Build the list of boxes to render
  // Each box: { label, parts (split on ___), q (null if no answer), key }
  const boxes = (() => {
    if (questions.length === 1 && (questions[0].content || '').includes('>')) {
      // Legacy single-question format: "A > B > ___ C > D"
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
            const parts = box.hasGap ? box.text.split('___') : null

            return (
              <div key={box.key} id={q ? `q-${q.id}` : undefined}>
                {/* Arrow between boxes */}
                {bi > 0 && (
                  <div className="flex justify-center py-1.5">
                    <ArrowDown size={32} strokeWidth={3} className={D ? 'text-gray-400' : 'text-gray-600'} />
                  </div>
                )}

                {/* Box */}
                <div className={`group rounded-xl border-2 px-4 py-3 text-sm leading-relaxed ${
                  D ? 'border-gray-600 bg-gray-800/50 text-gray-200' : 'border-gray-300 bg-white text-gray-800'
                }`}>
                  {/* Show Q number badge on interactive boxes */}
                  {q && box.hasGap && (
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2 align-middle ${
                      D ? 'bg-gray-700 text-gray-100' : 'bg-gray-100 text-gray-800'
                    }`}>{q.number}</span>
                  )}

                  {/* Content with optional inline gap */}
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
                              ? rr.is_correct
                                ? 'border-green-500 bg-green-50 text-green-800'
                                : 'border-red-400 bg-red-50 text-red-800'
                              : D ? 'bg-gray-700 border-gray-500 text-gray-100' : 'bg-white border-gray-400 text-gray-800'
                          }`}
                          style={{ width: 140, height: 32, paddingLeft: 6, paddingRight: 6 }}
                        />
                        {rr && !rr.is_correct && (
                          <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>
                        )}
                        {q && (
                          <QuestionBookmarkButton
                            qId={q.id}
                            isBookmarked={isBookmarked}
                            bookmarkLoading={bookmarkLoading}
                            reviewMode={reviewMode}
                            dark={D}
                            toggleBookmark={toggleBookmark}
                            size={18}
                            hoverOnly
                          />
                        )}
                      </span>
                      {parts.slice(1).join('___')}
                    </>
                  ) : (
                    <span className={D ? 'text-gray-300' : 'text-gray-700'}>{box.text}</span>
                  )}

                  {/* If q exists but no ___ in content, show input below */}
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
                            ? rr.is_correct
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : 'border-red-400 bg-red-50 text-red-800'
                            : D ? 'bg-gray-700 border-gray-500 text-gray-100' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      />
                      {rr && !rr.is_correct && (
                        <span className="text-base font-semibold text-emerald-700">{'>'}{rr.correct_answer}</span>
                      )}
                      <QuestionBookmarkButton
                        qId={q.id}
                        isBookmarked={isBookmarked}
                        bookmarkLoading={bookmarkLoading}
                        reviewMode={reviewMode}
                        dark={D}
                        toggleBookmark={toggleBookmark}
                        size={18}
                        hoverOnly
                      />
                    </div>
                  )}

                  {/* Review result */}
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

// -- Submit Confirm Modal ------------------------------------------------------
function SubmitConfirm({ answered, total, onConfirm, onCancel, dark }) {
  const surface = dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
  const unanswered = total - answered
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className={`${surface} rounded-2xl shadow-2xl p-6 w-full max-w-sm`}>
        <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-sky-500" />
        </div>
        <h3 className="font-bold text-center text-lg mb-1">Submit test?</h3>
        <p className={`text-sm text-center mb-4 ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
          {answered} of {total} questions answered
          {unanswered > 0 && <span className="text-red-500 font-medium"> ({unanswered} unanswered)</span>}
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition">
            Submit
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// -- Result Overlay ------------------------------------------------------------
function ResultOverlay({ result, passageTitle, onRetry, onExit, dark }) {
  const { correct, total, score_percent, band, results } = result
  const bandColor = band >= 7 ? '#16a34a' : band >= 5 ? '#d97706' : '#dc2626'
  const surface = dark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
  const subtext = dark ? 'text-gray-400' : 'text-gray-400'
  const rowBase = dark ? 'border-gray-700' : 'border-gray-100'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 22 }}
        className={`${surface} rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden`}>

        {/* Header */}
        <div className={`p-6 border-b ${rowBase}`}>
          <h2 className="font-black text-xl">Results</h2>
          <p className={`text-sm ${subtext} mt-0.5 truncate`}>{passageTitle}</p>
        </div>

        {/* Score cards */}
        <div className={`grid grid-cols-3 gap-0 border-b ${rowBase}`}>
          {[
            { value: band.toFixed(1), label: 'Band Score', color: bandColor },
            { value: `${correct}/${total}`, label: 'Correct', color: null },
            { value: `${score_percent}%`, label: 'Score', color: null },
          ].map((s, i) => (
            <div key={i} className="py-5 text-center">
              <div className="text-3xl font-black" style={s.color ? { color: s.color } : {}}>
                {s.value}
              </div>
              <div className={`text-xs mt-1 ${subtext}`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Question review */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtext}`}>Question Review</p>
          <div className="space-y-2">
            {results.map(r => (
              <div key={r.question_id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${r.is_correct
                  ? dark ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-100'
                  : dark ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-100'}`}>
                <div className="flex-shrink-0 mt-0.5">
                  {r.is_correct
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <XCircle size={16} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold mb-0.5 ${dark ? 'text-gray-300' : 'text-gray-600'}`}>Q{r.number} � {r.question_type}</p>
                  <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-700'} line-clamp-2`}>{r.content}</p>
                  <div className="flex gap-4 mt-1.5 flex-wrap">
                    <span className={`text-xs ${subtext}`}>
                      Your answer: <span className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{String(r.user_answer ?? '').trim() || 'N/A'}</span>
                    </span>
                    {!r.is_correct && (
                      <span className={`text-xs ${subtext}`}>
                        Correct: <span className="font-medium text-green-500">{r.correct_answer}</span>
                      </span>
                    )}
                  </div>
                  {r.explanation && (
                    <p className={`text-xs mt-1 italic ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{r.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className={`flex gap-3 p-4 border-t ${rowBase}`}>
          <button onClick={onExit}
            className={`flex-1 py-2.5 border rounded-xl text-sm font-medium transition ${dark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            Back to list
          </button>
          <button onClick={onRetry}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition">
            <RotateCcw size={14} />
            Try again
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// -- Note Panel ----------------------------------------------------------------
function NotePanel({ notes, onAdd, onDelete, onClose, dark }) {
  const [text, setText] = useState('')
  const surface = dark ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
  const inputCls = dark ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800'

  return (
    <motion.div initial={{ x: 320 }} animate={{ x: 0 }} exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className={`fixed right-0 top-0 h-full w-80 border-l shadow-2xl z-40 flex flex-col ${surface}`}>
      <div className={`flex items-center justify-between p-4 border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
        <div className="flex items-center gap-2">
          <StickyNote size={16} className="text-sky-500" />
          <span className="font-bold text-sm">Notes</span>
        </div>
        <button onClick={onClose} className={`p-1.5 rounded-lg transition ${dark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
          <X size={16} />
        </button>
      </div>

      {/* Add note */}
      <div className={`p-3 border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-xl text-sm resize-none focus:outline-none focus:border-sky-400 transition ${inputCls}`} />
        <button onClick={() => { if (text.trim()) { onAdd(text.trim()); setText('') } }}
          disabled={!text.trim()}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-40">
          <Plus size={14} />
          Add Note
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {notes.length === 0 ? (
          <p className={`text-xs text-center py-8 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>No notes yet</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className={`p-3 rounded-xl relative group ${dark ? 'bg-gray-800' : 'bg-slate-50 border border-slate-100'}`}>
              <p className={`text-sm leading-relaxed pr-6 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{note.text}</p>
              <p className={`text-xs mt-1.5 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{note.time}</p>
              <button onClick={() => onDelete(note.id)}
                className="absolute top-2 right-2 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition text-red-400 hover:bg-red-50">
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}

// -- Main Exam Component -------------------------------------------------------
export default function IELTSReadingAttempt() {
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const initialPassageId = Number(searchParams.get('passage') || 0)
  const partIds = useMemo(() => {
    const ids = (searchParams.get('parts') || '')
      .split(',')
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)
    if (initialPassageId && !ids.includes(initialPassageId)) ids.unshift(initialPassageId)
    return ids.length ? ids : (initialPassageId ? [initialPassageId] : [])
  }, [searchParams, initialPassageId])
  const [activePartIndex, setActivePartIndex] = useState(() => Math.max(0, partIds.indexOf(initialPassageId)))
  const currentPassageId = partIds[activePartIndex] || initialPassageId
  const partsQuery = partIds.length > 1 ? `&parts=${partIds.join(',')}` : ''
  const passageTitle = decodeURIComponent(searchParams.get('title') || 'Reading Passage')
  const cleanPassageTitle = passageTitle.replace(/\bID:\s*\d+\b/gi, '').replace(/\s{2,}/g, ' ').trim()
  const isReviewMode = searchParams.get('mode') === 'review'

  // Fetch review data from API when ?mode=review (URL-persistent, survives refresh)
  const { data: fetchedReviewData } = useQuery({
    queryKey: ['ielts-reading-review', attemptId],
    queryFn: () => api.get(`/ielts/attempt/${attemptId}/reading-review/`).then(r => r.data),
    enabled: isReviewMode && Boolean(attemptId),
    staleTime: Infinity,
  })

  const reviewData = fetchedReviewData || location.state?.reviewData || null
  const reviewMode = Boolean(reviewData) || isReviewMode
  const [showCorrectInReview, setShowCorrectInReview] = useState(false)

  // Core state
  const [answersByPart, setAnswersByPart] = useState({})
  const [activeQ, setActiveQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [partQuestionCounts, setPartQuestionCounts] = useState({})

  // UI preferences
  const [darkMode, setDarkMode] = useState(false)
  const [fontSize, setFontSize] = useState('normal') // small | normal | large
  const [menuOpen, setMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Resizable divider
  const [splitRatio, setSplitRatio] = useState(50)
  const dragging = useRef(false)
  const containerRef = useRef()

  // Highlight & selection
  const [passageHtml, setPassageHtml] = useState('')
  const [selectionInfo, setSelectionInfo] = useState(null) // {x, y, text}
  const [showNoteInput, setShowNoteInput] = useState(false)

  // Notes
  const [notes, setNotes] = useState([])
  const [showNotePanel, setShowNotePanel] = useState(false)

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkLoading, setBookmarkLoading] = useState(new Set())

  const passageRef = useRef()
  const questionRefs = useRef({})
  const isMobileViewRef = useRef(false)
  const highlightIdRef = useRef(1)
  const selectionRangeRef = useRef(null)
  const allowLeaveRef = useRef(false)

  useEffect(() => {
    const update = () => {
      isMobileViewRef.current = typeof window !== 'undefined' && window.innerWidth < 768
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Load ALL passages simultaneously
  const passageQueries = useQueries({
    queries: partIds.map(pid => ({
      queryKey: ['ielts-passage', String(pid)],
      queryFn: () => api.get(`/ielts/reading/${pid}/`).then(r => r.data),
      enabled: !!pid,
      staleTime: 120_000,
    })),
  })

  const isLoading = passageQueries.some(q => q.isLoading && !q.data)
  // Keep null entries so indices stay aligned with partIds — do NOT filter(Boolean)
  const allPassagesData = passageQueries.map(q => q.data || null)
  const passage = allPassagesData[activePartIndex] || null
  const questions = passage?.questions || []

  // Unified timer: keyed to attemptId, total = 20min ? passages (min 20, max 60)
  const totalTimeSec = Math.max(20, Math.min(60, partIds.length * 20)) * 60
  const timerStorageKey = `reading-timer-${attemptId}`
  const timer = useTimer(totalTimeSec, reviewMode ? null : timerStorageKey)

  // All questions flat for bottom nav
  const allQuestionsFlat = useMemo(() =>
    allPassagesData.flatMap((p, pi) =>
      (p?.questions || []).map(q => ({ ...q, _partIndex: pi, _passageId: String(partIds[pi]) }))
    ), [allPassagesData, partIds])

  // Auto-submit when timer expires
  useEffect(() => {
    if (!reviewMode && timer.seconds === 0 && !submitting) {
      handleSubmit()
    }
  }, [timer.seconds, reviewMode, submitting])

  // Init bookmarks from passage data
  useEffect(() => {
    if (passage?.questions) {
      const ids = passage.questions
        .filter(q => q.is_bookmarked)
        .map(q => q.id)
      setBookmarkedIds(new Set(ids))
    }
  }, [passage])

  const toggleBookmark = async (qId, e) => {
    e.stopPropagation()
    if (bookmarkLoading.has(qId)) return
    setBookmarkLoading(prev => new Set([...prev, qId]))
    try {
      const res = await api.post('/ielts/bookmarks/toggle/', {
        source_type: 'IELTS_READING',
        question_id: qId,
      })
      setBookmarkedIds(prev => {
        const next = new Set(prev)
        if (res.data.bookmarked) next.add(qId)
        else next.delete(qId)
        return next
      })
    } catch {
      // silent fail
    } finally {
      setBookmarkLoading(prev => { const next = new Set(prev); next.delete(qId); return next })
    }
  }

  // Init passage HTML � markdown rendered
  useEffect(() => {
    if (passage?.content) {
      setPassageHtml(passageMarkdownToHtml(passage.content))
    }
  }, [passage])

  useEffect(() => {
    if (currentPassageId && questions.length) {
      setPartQuestionCounts((prev) => ({ ...prev, [String(currentPassageId)]: questions.length }))
    }
  }, [currentPassageId, questions.length])

  // Init answers from reviewData (works for both state-based and API-fetched review)
  useEffect(() => {
    if (!reviewData?.results?.length) return
    const byPart = {}
    for (const r of reviewData.results) {
      const pid = r.passage_id ? String(r.passage_id) : String(currentPassageId)
      if (!byPart[pid]) byPart[pid] = {}
      if (r.question_id != null) byPart[pid][String(r.question_id)] = r.user_answer ?? ''
    }
    if (Object.keys(byPart).length === 0) return
    setAnswersByPart((prev) => {
      const merged = { ...prev }
      for (const [pid, ans] of Object.entries(byPart)) {
        merged[pid] = { ...(merged[pid] || {}), ...ans }
      }
      return merged
    })
  }, [reviewData])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Prevent accidental exit via browser back
  useEffect(() => {
    window.history.pushState({ readingAttemptGuard: true }, '', window.location.href)
    const onPopState = () => {
      if (allowLeaveRef.current) return
      setShowExitConfirm(true)
      window.history.pushState({ readingAttemptGuard: true }, '', window.location.href)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Drag resize
  const handleMouseMove = useCallback(e => {
    if (!dragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const ratio = isMobileViewRef.current
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

  // Text selection in passage
  const handlePassageMouseUp = (e) => {
    setTimeout(() => {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        return
      }
      const text = selection.toString().trim()
      if (text.length < 2) return
      const range = selection.getRangeAt(0)
      const root = passageRef.current
      const startPath = getNodePath(root, range.startContainer)
      const endPath = getNodePath(root, range.endContainer)
      if (!startPath || !endPath) return
      selectionRangeRef.current = {
        startPath,
        startOffset: range.startOffset,
        endPath,
        endOffset: range.endOffset,
      }
      const rect = range.getBoundingClientRect()
      setSelectionInfo({ x: rect.left + rect.width / 2, y: rect.top - 8, text })
    }, 10)
  }

  // Double-click selects word > show toolbar
  const handlePassageDblClick = (e) => {
    // Browser auto-selects word on dblclick, so just handle like mouseup
    handlePassageMouseUp(e)
  }

  const handlePassageClick = (e) => {
    const mark = e.target.closest?.('mark[data-hl-id]')
    if (!mark) return
    const rect = mark.getBoundingClientRect()
    const text = mark.textContent?.trim() || ''
    if (!text) return
    setSelectionInfo({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      text,
      markId: mark.getAttribute('data-hl-id'),
    })
    window.getSelection()?.removeAllRanges()
  }

  // Apply highlight
  const applyHighlight = (colorId) => {
    if (!selectionInfo?.text) return
    const color = HL_COLORS.find((c) => c.id === colorId)
    if (!color || !passageRef.current) return

    if (selectionInfo.markId) {
      const selectedMark = passageRef.current.querySelector(`mark[data-hl-id="${selectionInfo.markId}"]`)
      if (selectedMark) {
        selectedMark.style.backgroundColor = color.markBg
        selectedMark.style.borderRadius = '2px'
        selectedMark.style.padding = '0 1px'
      }
      setPassageHtml(passageRef.current.innerHTML)
    } else {
      const saved = selectionRangeRef.current
      if (!saved) return
      const startNode = getNodeByPath(passageRef.current, saved.startPath)
      const endNode = getNodeByPath(passageRef.current, saved.endPath)
      if (!startNode || !endNode) return
      const range = document.createRange()
      try {
        range.setStart(startNode, Math.min(saved.startOffset, startNode.textContent?.length ?? saved.startOffset))
        range.setEnd(endNode, Math.min(saved.endOffset, endNode.textContent?.length ?? saved.endOffset))
      } catch {
        return
      }
      if (range.collapsed) return
      const id = `hl-${Date.now()}-${highlightIdRef.current++}`
      const mark = document.createElement('mark')
      mark.setAttribute('data-hl-id', id)
      mark.style.backgroundColor = color.markBg
      mark.style.borderRadius = '2px'
      mark.style.padding = '0 1px'
      try {
        range.surroundContents(mark)
      } catch {
        const content = range.extractContents()
        mark.appendChild(content)
        range.insertNode(mark)
      }
      setPassageHtml(passageRef.current.innerHTML)
    }
    window.getSelection()?.removeAllRanges()
    selectionRangeRef.current = null
    setSelectionInfo(null)
  }

  const removeHighlight = () => {
    if (!selectionInfo?.markId || !passageRef.current) return
    const selectedMark = passageRef.current.querySelector(`mark[data-hl-id="${selectionInfo.markId}"]`)
    if (!selectedMark) return
    selectedMark.replaceWith(document.createTextNode(selectedMark.textContent || ''))
    setPassageHtml(passageRef.current.innerHTML)
    selectionRangeRef.current = null
    setSelectionInfo(null)
  }

  // Add note from selection
  const addNoteFromSelection = () => {
    if (!selectionInfo?.text) return
    const note = {
      id: Date.now(),
      text: `"${selectionInfo.text.substring(0, 80)}${selectionInfo.text.length > 80 ? '...' : ''}"`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setNotes(prev => [...prev, note])
    setShowNotePanel(true)
    window.getSelection()?.removeAllRanges()
    selectionRangeRef.current = null
    setSelectionInfo(null)
  }

  // Dismiss selection toolbar on outside click
  useEffect(() => {
    const handler = (e) => {
      if (selectionInfo && !e.target.closest('[data-selection-toolbar]')) {
        const sel = window.getSelection()
        if (!sel || sel.isCollapsed) {
          selectionRangeRef.current = null
          setSelectionInfo(null)
        }
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [selectionInfo])

  const answers = answersByPart[String(currentPassageId)] || {}
  const setAnswer = (qId, val) => {
    if (reviewMode) return
    setAnswersByPart((prev) => {
      const key = String(currentPassageId)
      return {
        ...prev,
        [key]: { ...(prev[key] || {}), [String(qId)]: val },
      }
    })
  }
  const answeredCount = Object.values(answers).filter(Boolean).length
  const isAnswered = (qId) => Boolean(answers[String(qId)])
  const reviewMap = useMemo(() => {
    const m = {}
    if (!reviewData?.results) return m
    for (const r of reviewData.results) {
      if (r.question_id != null) m[String(r.question_id)] = r
      if (r.number != null) m[`n-${r.number}`] = r
    }
    return m
  }, [reviewData])

  // Build evidence items for passage highlight (yellow marks + red badges)
  // Extends each answer to its full surrounding sentence for a broader highlight
  const readingEvidenceItems = useMemo(() => {
    if (!reviewMode || !showCorrectInReview || !passage?.questions) return []
    // Strip markdown syntax from passage for plain-text sentence lookup
    const passagePlain = (passage.content || '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/^#+\s+/gm, '')
    const items = []
    for (const q of passage.questions) {
      const rv = reviewMap[String(q.id)] || reviewMap[`n-${q.number}`]
      if (!rv) continue
      let snippet = rv.correct_answer
      // For MCQ, use the choice text instead of the single letter
      if (q.question_type === 'MCQ' || q.choices?.length) {
        const choice = q.choices?.find(
          c => c.option?.toUpperCase() === rv.correct_answer?.toUpperCase()
        )
        if (choice?.text && choice.text.length >= 3) snippet = choice.text
      }
      if (!snippet || snippet.length < 3 || snippet.length >= 200) continue
      // Try to extend snippet to the full surrounding sentence
      const lc = passagePlain.toLowerCase()
      const pos = lc.indexOf(snippet.toLowerCase())
      if (pos >= 0) {
        // Walk back to sentence start (stop at .!? or line break)
        let start = pos
        while (start > 0 && !/[.!?\n]/.test(passagePlain[start - 1])) start--
        // Walk forward to sentence end (stop at .!? or line break)
        let end = pos + snippet.length
        while (end < passagePlain.length && !/[.!?\n]/.test(passagePlain[end])) end++
        if (end < passagePlain.length && /[.!?]/.test(passagePlain[end])) end++ // include punctuation
        const sentence = passagePlain.slice(start, end).trim()
        // Use the sentence if it's meaningfully longer and not too long
        if (sentence.length > snippet.length && sentence.length <= 400) {
          snippet = sentence
        }
      }
      items.push({ snippet, questionNumber: q.number ?? 0 })
    }
    return items
  }, [reviewMode, showCorrectInReview, passage, reviewMap])

  const partProgress = useMemo(() => {
    return partIds.map((pid, idx) => {
      const partAns = answersByPart[String(pid)] || {}
      const total = idx === activePartIndex ? questions.length : (partQuestionCounts[String(pid)] || 0)
      const answered = Object.values(partAns).filter(Boolean).length
      return { pid, answered, total }
    })
  }, [partIds, answersByPart, activePartIndex, questions.length, partQuestionCounts])

  const totalAnsweredAll = useMemo(() =>
    Object.values(answersByPart).reduce((sum, partAns) => sum + Object.values(partAns).filter(Boolean).length, 0),
    [answersByPart])
  const totalQuestionsAll = allQuestionsFlat.length || questions.length

  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return
    setActiveQ(index)
    const q = questions[index]
    const el = questionRefs.current[q.id] || document.getElementById(`q-${q.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleSubmit = async () => {
    if (reviewMode) return
    timer.stop()
    timer.clearPersist()
    setShowConfirm(false)
    setShowExitConfirm(false)
    setSubmitting(true)
    const isFull = partIds.length > 1
    try {
      if (!isFull) {
        // Single part � oddiy X/Y format, band ko'rsatilmaydi
        const res = await api.post(`/ielts/reading/${currentPassageId}/submit/`, {
          attempt_id: parseInt(attemptId),
          answers,
        })
        navigate(`/exam/ielts/reading/${attemptId}/result?passage=${currentPassageId}${partsQuery}&title=${encodeURIComponent(cleanPassageTitle || 'Reading')}`, {
          state: { result: { ...res.data, is_full: false }, passageTitle: cleanPassageTitle || 'Reading' }, replace: true,
        })
      } else {
        // Full test � barcha partlarni topshir, natijalarni birlashtir
        let totalCorrect = 0
        let totalQuestions = 0
        let allResults = []
        let difficulty = 'MEDIUM'

        for (const pid of partIds) {
          const partAnswers = answersByPart[String(pid)] || {}
          const res = await api.post(`/ielts/reading/${pid}/submit/`, {
            attempt_id: parseInt(attemptId),
            answers: partAnswers,
          })
          totalCorrect += res.data.correct ?? 0
          totalQuestions += res.data.total ?? 0
          allResults = allResults.concat(res.data.results ?? [])
          if (res.data.difficulty) difficulty = res.data.difficulty
        }

        const pct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100 * 10) / 10 : 0
        const aggregated = {
          correct: totalCorrect,
          total: totalQuestions,
          score_percent: pct,
          band: difficulty === 'HARD' ? calcGeneralReadingBand(totalCorrect) : calcAcademicReadingBand(totalCorrect),
          results: allResults,
          is_full: true,
          difficulty,
        }
        navigate(`/exam/ielts/reading/${attemptId}/result?passage=${currentPassageId}${partsQuery}&title=${encodeURIComponent(cleanPassageTitle || 'Reading')}`, {
          state: { result: aggregated, passageTitle: cleanPassageTitle || 'Reading' }, replace: true,
        })
      }
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message))
      setSubmitting(false)
    }
  }

  // Band lookup tables (frontend, full test uchun)
  function calcAcademicReadingBand(c) {
    if (c >= 39) return 9.0; if (c >= 37) return 8.5; if (c >= 35) return 8.0
    if (c >= 33) return 7.5; if (c >= 30) return 7.0; if (c >= 27) return 6.5
    if (c >= 23) return 6.0; if (c >= 19) return 5.5; if (c >= 15) return 5.0
    if (c >= 13) return 4.5; if (c >= 10) return 4.0; if (c >= 7)  return 3.5
    if (c >= 4)  return 3.0; return 2.5
  }
  function calcGeneralReadingBand(c) {
    if (c >= 40) return 9.0; if (c >= 39) return 8.5; if (c >= 37) return 8.0
    if (c >= 36) return 7.5; if (c >= 34) return 7.0; if (c >= 32) return 6.5
    if (c >= 30) return 6.0; if (c >= 27) return 5.5; if (c >= 23) return 5.0
    if (c >= 19) return 4.5; if (c >= 15) return 4.0; if (c >= 10) return 3.5
    if (c >= 5)  return 3.0; return 2.5
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  // -- Theme classes --------------------------------------------------------
  const D = darkMode
  const bg       = D ? 'bg-gray-950' : 'bg-white'
  const topbar   = D ? 'bg-gray-900 border-gray-700' : 'bg-white border-sky-100'
  const surface  = D ? 'bg-gray-800' : 'bg-white'
  const divider  = D ? 'border-gray-700' : 'border-sky-100'
  const textMain = D ? 'text-gray-100' : 'text-gray-800'
  const textSub  = D ? 'text-gray-400' : 'text-gray-500'
  const qCard    = (active) => D
    ? active ? 'border-sky-500 bg-gray-700/60' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
    : active ? 'border-sky-300 bg-sky-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'

  // Font size UX:
  // - A- should still be comfortable (current "large" baseline)
  // - A (medium) slightly bigger
  // - A+ noticeably bigger
  const fontCls  = fontSize === 'small'
    ? 'text-base leading-relaxed'
    : fontSize === 'large'
      ? 'text-xl leading-relaxed'
      : 'text-lg leading-relaxed'
  // Scales the whole questions column (inputs/tables use rem � parent font-size alone won't grow them).
  const questionZoom = fontSize === 'large' ? 1.14 : fontSize === 'small' ? 0.94 : 1.04
  useEffect(() => {
    setActiveQ(0)
    setSelectionInfo(null)
    selectionRangeRef.current = null
  }, [currentPassageId])

  useEffect(() => {
    if (activePartIndex >= partIds.length) {
      setActivePartIndex(0)
    }
  }, [partIds, activePartIndex])

  const handleBackToList = () => {
    allowLeaveRef.current = true
    timer.clearPersist()
    navigate('/app/ielts/reading')
  }
  const handleRedoFromReview = async () => {
    if (!currentPassageId) return
    try {
      const res = await api.post(`/ielts/reading/${currentPassageId}/start/`)
      navigate(`/exam/ielts/reading/${res.data.attempt_id}?passage=${currentPassageId}${partsQuery}&title=${encodeURIComponent(cleanPassageTitle || 'Reading')}`)
    } catch {
      // keep silent, user stays on page
    }
  }

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${bg} ${textMain}`}>
        <div className={`flex items-center gap-3 px-4 h-14 border-b flex-shrink-0 ${topbar}`}>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-6 w-[40%] flex-1" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-10" />
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          <div className={`p-4 overflow-hidden border-b md:border-b-0 md:border-r ${divider} h-[44%] md:h-auto`} style={{ flexBasis: '50%' }}>
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[88%]" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[76%]" />
              <div className="pt-3 space-y-2">
                <Skeleton className="h-4 w-[94%]" />
                <Skeleton className="h-4 w-[91%]" />
                <Skeleton className="h-4 w-[89%]" />
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-hidden">
            <div className="space-y-3">
              <Skeleton className="h-6 w-44" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-4 w-[92%]" />
                    <Skeleton className="h-4 w-[86%]" />
                    <Skeleton className="h-9 w-[60%]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${bg} ${textMain} select-none`} ref={containerRef}>

      {/* -- Top Bar ------------------------------------------------------- */}
      <div className={`relative flex items-center gap-2 px-4 md:px-5 h-[72px] border-b flex-shrink-0 ${topbar}`}>
        {/* Back */}
        <button
          onClick={() => (reviewMode ? navigate('/app/ielts/reading') : setShowExitConfirm(true))}
          className={`flex items-center gap-2 text-[14px] font-semibold transition flex-shrink-0 px-3 py-2.5 rounded-xl border ${
            D ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-sky-100 text-gray-600 hover:bg-white'
          }`}
        >
          <ChevronLeft size={15} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Title */}
        <p className="flex-1 font-semibold text-[15px] sm:text-[17px] truncate min-w-0">
          {cleanPassageTitle || 'Reading Passage'}{reviewMode ? ' � Review' : ''}
        </p>

        {/* Progress */}
        {!reviewMode && (
          <span className={`text-base font-semibold hidden sm:block ${textSub}`}>
            {partIds.length > 1 ? totalAnsweredAll : answeredCount}/{partIds.length > 1 ? totalQuestionsAll : questions.length}
          </span>
        )}

        {/* Timer (center) */}
        {!reviewMode && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-[10px] z-10 flex items-center gap-2 px-4 py-2 rounded-2xl font-mono text-[17px] font-extrabold flex-shrink-0 ${
            timer.urgent
              ? 'bg-red-100 text-red-600 animate-pulse'
              : D
                ? 'bg-gray-700 text-sky-400'
                : 'bg-sky-50 text-sky-600'
          }`}
        >
          <Clock size={15} />
          <span>{timer.fmt}</span>
          <div>
            <button
              onClick={timer.paused ? timer.start : timer.pause}
              className={`px-3 py-1 rounded-lg text-sm font-extrabold border transition min-w-[72px] ${
                timer.paused
                  ? 'bg-sky-500 border-sky-500 text-white hover:bg-sky-600'
                  : (D
                    ? 'bg-gray-800 border-gray-600 text-gray-100 hover:border-sky-400'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-sky-400')
              }`}
              aria-label={timer.paused ? 'Start timer' : 'Pause timer'}
            >
              {timer.paused ? 'Start' : 'Pause'}
            </button>
          </div>
        </div>
        )}

        {/* Review controls */}
        {reviewMode ? (
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCorrectInReview((p) => !p)}
              className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-xl border text-xs font-semibold ${
                showCorrectInReview
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <span className={`w-9 h-5 rounded-full p-0.5 transition ${showCorrectInReview ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                <span className={`block w-4 h-4 rounded-full bg-white transition ${showCorrectInReview ? 'translate-x-4' : 'translate-x-0'}`} />
              </span>
              <span className="hidden lg:inline">Show Correct</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition hidden md:inline-flex"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={handleRedoFromReview}
              className="px-2 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold inline-flex items-center gap-1"
            >
              <RotateCcw size={14} />
              Re-Do
            </button>
            <button
              onClick={() => navigate(`/exam/ielts/reading/${attemptId}/result`)}
              className="px-2 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-semibold inline-flex items-center gap-1"
            >
              <Lock size={14} />
              Results
            </button>
          </div>
        ) : (
        <div className="relative flex-shrink-0 ml-auto flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className={`p-3 rounded-xl transition ${D ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
          </button>
          <button
            onClick={() => setMenuOpen(p => !p)}
            className={`p-3 rounded-xl transition ${D ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Menu size={22} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className={`absolute right-0 top-10 w-52 rounded-2xl shadow-xl border z-50 overflow-hidden ${D ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                onClick={e => e.stopPropagation()}>
                {/* Font size */}
                <div className={`px-3 py-2.5 border-b ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                  <p className={`text-xs font-semibold mb-2 ${textSub}`}>Text Size</p>
                  <div className="flex gap-1">
                    {[['small', 'A?'], ['normal', 'A'], ['large', 'A+']].map(([size, label]) => (
                      <button key={size} onClick={() => setFontSize(size)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition ${fontSize === size
                          ? 'bg-sky-500 text-white'
                          : D ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>{label}</button>
                    ))}
                  </div>
                </div>
                {/* Dark mode */}
                <button onClick={() => setDarkMode(p => !p)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 border-b text-sm transition ${D ? 'border-gray-700 hover:bg-gray-700 text-gray-200' : 'border-gray-100 hover:bg-gray-50 text-gray-700'}`}>
                  <span className="flex items-center gap-2">
                    {D ? <Sun size={15} /> : <Moon size={15} />}
                    {D ? 'Light Mode' : 'Dark Mode'}
                  </span>
                  <div className={`w-8 h-4 rounded-full transition-colors ${D ? 'bg-sky-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${D ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </button>
                {/* Fullscreen */}
                <div className="hidden md:block">
                  <button
                    onClick={() => { toggleFullscreen(); setMenuOpen(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition ${D ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </button>
                </div>
                {/* Notes */}
                <button onClick={() => { setShowNotePanel(p => !p); setMenuOpen(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition ${D ? 'hover:bg-gray-700 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}>
                  <StickyNote size={15} />
                  Notes {notes.length > 0 && <span className="ml-auto bg-sky-500 text-white text-xs rounded-full px-1.5">{notes.length}</span>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

      
      </div>

      {/* -- Body ---------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden relative flex-col md:flex-row px-1 md:px-2">

        {/* Left: Passage */}
        <div
          className={`overflow-y-auto border-b md:border-b-0 md:border-r flex-shrink-0 relative ${divider}`}
          style={{ flexBasis: `${splitRatio}%` }}
        >
          <div
            ref={passageRef}
            onMouseUp={handlePassageMouseUp}
            onDoubleClick={handlePassageDblClick}
            onClick={handlePassageClick}
            className={`p-5 pb-44 prose max-w-none ${fontCls} ${textMain} cursor-text select-text`}
            dangerouslySetInnerHTML={{ __html: injectPassageHighlights(sanitizeHtml(passageHtml), readingEvidenceItems) }}
          />
        </div>

        {/* Mobile divider (vertical resize) */}
        <div
          onPointerDown={(e) => {
            e.preventDefault()
            dragging.current = true
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }}
          className={`md:hidden h-4 flex-shrink-0 cursor-row-resize relative group flex items-center justify-center ${
            D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-sky-50 hover:bg-sky-100'
          } transition-colors`}
          title="Drag to resize"
          style={{ touchAction: 'none' }}
        >
          <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] ${
            D ? 'bg-gray-600/80 group-hover:bg-sky-500/80' : 'bg-gray-300 group-hover:bg-sky-400'
          } transition-colors`} />
          <div
            className={`relative z-10 w-8 h-8 rounded-full border shadow-sm flex items-center justify-center ${
              D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'
            }`}
          >
            <div className="flex flex-col leading-none items-center -space-y-0.5">
              <ChevronUp size={13} className={`${D ? 'text-gray-400' : 'text-gray-500'}`} />
              <ChevronDown size={13} className={`${D ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          </div>
        </div>

        {/* Divider handle */}
        <div
          onPointerDown={(e) => {
            e.preventDefault()
            dragging.current = true
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }}
          className={`hidden md:flex w-2 flex-shrink-0 cursor-col-resize relative group items-center justify-center ${
            D ? 'bg-gray-800 hover:bg-gray-700' : 'bg-sky-50 hover:bg-sky-100'
          } transition-colors`}
          title="Drag to resize"
          style={{ touchAction: 'none' }}
        >
          {/* center knob (always visible) */}
          <div className={`absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full border shadow-sm flex items-center justify-center ${
            D ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center gap-0.5">
              <ChevronLeft size={14} className={`${D ? 'text-gray-400' : 'text-gray-400'}`} />
              <ChevronRight size={14} className={`${D ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
          </div>
          <div className={`w-0.5 h-16 rounded-full ${D ? 'bg-gray-600 group-hover:bg-sky-500' : 'bg-sky-200 group-hover:bg-sky-400'} transition-colors`} />
        </div>

        {/* Right: Questions */}
        <div className="flex-1 overflow-y-auto min-w-0 pb-36 md:pb-32">
          <div className="p-4" style={{ zoom: questionZoom }}>
          <div className={`space-y-3 ${fontCls}`}>
            {groupSegments(questions).map((seg, si) => {
              // -- GRID: MEND / MINFO / MATCH -----------------------------
              if (seg.type === 'grid') {
                seg.questions.forEach(q => { questionRefs.current[q.id] = null })
                return (
                  <div key={`grid-${si}`} ref={el => seg.questions.forEach(q => { questionRefs.current[q.id] = el })}>
                    <MatchGridBlock
                      questions={seg.questions}
                      answers={answers}
                      onAnswer={(id, v) => setAnswer(id, v)}
                      dark={D}
                      reviewMode={reviewMode}
                      reviewMap={reviewMap}
                      showCorrectInReview={showCorrectInReview}
                      bookmarkedIds={bookmarkedIds}
                      bookmarkLoading={bookmarkLoading}
                      toggleBookmark={toggleBookmark}
                    />
                  </div>
                )
              }

              // -- MFEAT: legend + per-row dropdown -----------------------
              if (seg.type === 'mfeat') {
                seg.questions.forEach(q => { questionRefs.current[q.id] = null })
                return (
                  <div key={`mfeat-${si}`} ref={el => seg.questions.forEach(q => { questionRefs.current[q.id] = el })}>
                    <MFeatBlock
                      questions={seg.questions}
                      answers={answers}
                      onAnswer={(id, v) => setAnswer(id, v)}
                      dark={D}
                      reviewMode={reviewMode}
                      reviewMap={reviewMap}
                      showCorrectInReview={showCorrectInReview}
                      bookmarkedIds={bookmarkedIds}
                      bookmarkLoading={bookmarkLoading}
                      toggleBookmark={toggleBookmark}
                    />
                  </div>
                )
              }

              // -- INLINE: NOTE / SUMM with [N] markers -------------------
              if (seg.type === 'inline') {
                return (
                  <div key={`inline-${si}`} ref={el => seg.questions.forEach(q => { questionRefs.current[q.id] = el })}>
                    <InlineGapBlock
                      questions={seg.questions}
                      answers={answers}
                      onAnswer={(id, v) => setAnswer(id, v)}
                      dark={D}
                      reviewMode={reviewMode}
                      reviewMap={reviewMap}
                      showCorrectInReview={showCorrectInReview}
                      bookmarkedIds={bookmarkedIds}
                      bookmarkLoading={bookmarkLoading}
                      toggleBookmark={toggleBookmark}
                    />
                  </div>
                )
              }

              // -- TABLE: TABLE type with [N] markers ---------------------
              if (seg.type === 'table') {
                return (
                  <div key={`table-${si}`} ref={el => seg.questions.forEach(q => { questionRefs.current[q.id] = el })}>
                    <TableGapBlock
                      questions={seg.questions}
                      answers={answers}
                      onAnswer={(id, v) => setAnswer(id, v)}
                      dark={D}
                      reviewMode={reviewMode}
                      reviewMap={reviewMap}
                      showCorrectInReview={showCorrectInReview}
                    />
                  </div>
                )
              }

              // -- FLOW: flowchart block ------------------------------------
              if (seg.type === 'flow') {
                seg.questions.forEach(q => { questionRefs.current[q.id] = null })
                return (
                  <div key={`flow-${si}`} ref={el => seg.questions.forEach(q => { questionRefs.current[q.id] = el })}>
                    <FlowBlock
                      questions={seg.questions}
                      answers={answers}
                      onAnswer={(id, v) => setAnswer(id, v)}
                      dark={D}
                      reviewMode={reviewMode}
                      reviewMap={reviewMap}
                      showCorrectInReview={showCorrectInReview}
                      bookmarkedIds={bookmarkedIds}
                      bookmarkLoading={bookmarkLoading}
                      toggleBookmark={toggleBookmark}
                    />
                  </div>
                )
              }

              // -- CARD: single question ------------------------------------
              const q = seg.questions[0]
              const qi = questions.indexOf(q)
              const showGroupInstr = q.group_instruction &&
                (qi === 0 || questions[qi - 1]?.group_instruction !== q.group_instruction)
              const showChoicesLegend = showGroupInstr &&
                ['MFEAT','M.FEAT','MATCH'].includes(q.question_type) &&
                q.choices?.length > 0
              const isBookmarked = bookmarkedIds.has(q.id)
              const wordBank = q.word_bank || (q.question_type === 'SUMM' && q.choices?.length > 0 ? q.choices.map(c => c.text || c.option) : null)
              return (
                <div key={q.id}>
                  {showGroupInstr && <GroupInstruction text={q.group_instruction} dark={D} />}
                  {showChoicesLegend && <ChoicesLegend choices={q.choices} dark={D} />}
                  {showGroupInstr && q.group_list?.length > 0 && <GroupList items={q.group_list} dark={D} />}
                  <div
                    id={`q-${q.id}`}
                    ref={el => { questionRefs.current[q.id] = el }}
                    onClick={() => setActiveQ(qi)}
                    className={`group relative p-4 rounded-2xl border cursor-pointer transition ${qCard(activeQ === qi)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border text-sm font-black ${
                        D ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'
                      }`}>
                        {q.number}
                      </span>
                      <span className={`text-[0.85em] font-semibold px-1.5 py-0.5 rounded-md border ${D ? 'bg-gray-700 text-gray-200 border-gray-500' : 'bg-gray-50 text-gray-800 border-gray-300'}`}>
                        {q.question_type_display || q.question_type}
                      </span>
                      <div className="ml-auto flex items-center gap-1.5">
                        {answers[String(q.id)] && <CheckCircle2 size={13} className="text-green-500" />}
                        <QuestionBookmarkButton
                          qId={q.id}
                          isBookmarked={isBookmarked}
                          bookmarkLoading={bookmarkLoading}
                          reviewMode={reviewMode}
                          dark={D}
                          toggleBookmark={toggleBookmark}
                          size={15}
                          hoverOnly
                          className="rounded-lg p-1"
                        />
                      </div>
                    </div>

                    {/* Question image */}
                    {q.image && (
                      <img
                        src={q.image}
                        alt={`Q${q.number}`}
                        className={`w-full rounded-xl object-contain max-h-64 mb-2 border ${D ? 'border-gray-700' : 'border-gray-200'}`}
                      />
                    )}

                    {['GAP','SENT','SUMM','NOTE','TABLE','FLOW','MAP'].includes(q.question_type)
                      ? <ContentWithBlank content={q.content} dark={D} textMain={textMain} />
                      : <p className={`text-[1em] leading-snug ${textMain}`}>{q.content}</p>
                    }

                    {/* Review result */}
                    {reviewMode && showCorrectInReview && (() => {
                      const rr = reviewMap[String(q.id)] || reviewMap[`n-${q.number}`]
                      if (!rr) return null
                      return (
                        <div className={`mt-2 text-sm rounded-lg px-3 py-2 border ${rr.is_correct ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                          <span className="font-semibold">Your: </span>{String(rr.user_answer ?? '').trim() || 'N/A'}
                          {!rr.is_correct && <><span className="mx-2">|</span>
                            <span className="text-base font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}
                        </div>
                      )
                    })()}

                    {q.question_type === 'TFNG' && (
                      <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} options={['TRUE','FALSE','NOT GIVEN']} dark={D} />
                    )}
                    {q.question_type === 'YNNG' && (
                      <TFNGInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} options={['YES','NO','NOT GIVEN']} dark={D} />
                    )}
                    {q.question_type === 'MCQ' && q.choices?.length > 0 && (
                      <MCQInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />
                    )}
                    {q.question_type === 'MULTI' && q.choices?.length > 0 && (
                      <MultiSelectInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)}
                        choices={q.choices} maxSelections={q.max_selections || 2} dark={D} />
                    )}
                    {q.question_type === 'SUMM' && (
                      <SummWordBankInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} wordBank={wordBank} dark={D} />
                    )}
                    {['GAP','SENT','NOTE','TABLE','FLOW','MAP'].includes(q.question_type) && (
                      <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Write your answer..." dark={D} />
                    )}
                    {q.question_type === 'SHORT' && (
                      <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} placeholder="Short answer (max 3 words)..." dark={D} />
                    )}
                    {q.question_type === 'MATCH' && q.choices?.length > 0 && (
                      <DropdownSelect value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} placeholder="Select heading..." dark={D} />
                    )}
                    {q.question_type === 'MATCH' && !q.choices?.length && (
                      <TextInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v.toLowerCase())} placeholder="Heading number (i, ii, iii...)" dark={D} />
                    )}
                    {['MINFO','M.INFO'].includes(q.question_type) && (
                      <LetterGrid value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} />
                    )}
                    {['MFEAT','M.FEAT'].includes(q.question_type) && (
                      <DropdownSelect value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} placeholder="Select answer..." dark={D} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </div>

        </div>

        {/* Note panel */}
        <AnimatePresence>
          {showNotePanel && (
            <NotePanel
              notes={notes}
              onAdd={text => setNotes(prev => [...prev, { id: Date.now(), text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])}
              onDelete={id => setNotes(prev => prev.filter(n => n.id !== id))}
              onClose={() => setShowNotePanel(false)}
              dark={D}
            />
          )}
        </AnimatePresence>
      </div>

      {/* -- Global Bottom Navigation (Pills) ----------------------------- */}
      <div className={`fixed bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 z-30 rounded-2xl border ${divider} ${D ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur shadow-lg`}>
        <div className="flex items-center gap-3 px-3 py-2 max-w-screen-xl mx-auto">
          <div className="flex flex-1 min-w-0 items-stretch gap-2">
              {(partIds.length ? partIds : [currentPassageId || 0]).map((pid, pidx) => {
                const partPassage = allPassagesData[pidx]
                const partQs = partPassage?.questions || (pidx === 0 ? questions : [])
                const isActivePart = pidx === activePartIndex
                const partAns = answersByPart[String(pid)] || {}
                return (
                  <div
                    key={pid}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActivePartIndex(pidx) } }}
                    className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1.5 px-1.5 sm:px-2 py-2 rounded-xl border-2 cursor-pointer transition ${
                      isActivePart
                        ? `border-sky-500 ${D ? 'bg-gray-800' : 'bg-sky-50'}`
                        : D ? 'border-gray-600 bg-gray-800/40 hover:bg-gray-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => setActivePartIndex(pidx)}
                  >
                    <span className={`text-xs sm:text-sm font-black text-center ${isActivePart ? 'text-sky-500' : D ? 'text-gray-400' : 'text-gray-500'}`}>
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
                            onClick={e => { e.stopPropagation(); setTimeout(() => goToQuestion(qi), 0) }}
                            className={`w-8 h-8 rounded-full text-xs font-bold transition flex items-center justify-center flex-shrink-0 ${
                              answered
                                ? 'bg-sky-500 text-white'
                                : isCurrent
                                  ? 'bg-sky-400 text-white ring-2 ring-sky-300'
                                  : D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
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
              onClick={() => setShowConfirm(true)}
              disabled={submitting}
              className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-60 transition whitespace-nowrap"
            >
              Finish test
            </button>
          ) : (
            <button
              onClick={() => navigate('/app/ielts/reading')}
              className={`flex-shrink-0 px-4 py-2 border rounded-xl text-sm font-semibold transition whitespace-nowrap ${D ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Tests
            </button>
          )}
        </div>
      </div>

      {/* -- Floating Selection Toolbar ------------------------------------- */}
      <AnimatePresence>
        {selectionInfo && (
          <motion.div
            data-selection-toolbar
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{ position: 'fixed', left: selectionInfo.x - 80, top: selectionInfo.y - 52, zIndex: 60 }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl shadow-xl border ${D ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
            onMouseDown={e => e.preventDefault()}
          >
            {/* Highlight colors */}
            {HL_COLORS.map(c => (
              <button key={c.id} onClick={() => applyHighlight(c.id)}
                title={`Highlight ${c.label}`}
                className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                style={{ background: c.bg }} />
            ))}
            {/* Divider */}
            <div className={`w-px h-5 mx-0.5 ${D ? 'bg-gray-600' : 'bg-gray-200'}`} />
            {/* Note */}
            <button onClick={addNoteFromSelection}
              title="Add to notes"
              className={`p-1 rounded-lg transition ${D ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <StickyNote size={14} />
            </button>
            {/* Remove highlight */}
            {selectionInfo?.markId && (
              <button
                onClick={removeHighlight}
                title="Remove highlight"
                className={`p-1 rounded-lg transition ${D ? 'text-red-300 hover:bg-gray-700' : 'text-red-500 hover:bg-red-50'}`}
              >
                <Trash2 size={14} />
              </button>
            )}
            {/* Dismiss */}
            <button onClick={() => { window.getSelection()?.removeAllRanges(); setSelectionInfo(null) }}
              className={`p-1 rounded-lg transition ${D ? 'text-gray-500 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Modals --------------------------------------------------------- */}
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
              <h3 className="font-bold text-center text-lg mb-1">Exit or submit?</h3>
              <p className={`text-sm text-center mb-4 ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                {partIds.length > 1 ? totalAnsweredAll : answeredCount} of {partIds.length > 1 ? totalQuestionsAll : questions.length} questions answered
                {(partIds.length > 1 ? totalQuestionsAll - totalAnsweredAll : questions.length - answeredCount) > 0 && (
                  <span className="text-red-500 font-medium"> ({partIds.length > 1 ? totalQuestionsAll - totalAnsweredAll : questions.length - answeredCount} unanswered)</span>
                )}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className={`py-2.5 border rounded-xl text-sm font-medium transition ${D ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBackToList}
                  className={`py-2.5 border rounded-xl text-sm font-medium transition ${D ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-60"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {showConfirm && !reviewMode && (
          <SubmitConfirm
            answered={partIds.length > 1 ? totalAnsweredAll : answeredCount}
            total={partIds.length > 1 ? totalQuestionsAll : questions.length}
            onConfirm={handleSubmit}
            onCancel={() => setShowConfirm(false)}
            dark={D}
          />
        )}
      </AnimatePresence>

      {/* Click outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  )
}




