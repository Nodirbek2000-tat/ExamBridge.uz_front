import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, ChevronLeft, ChevronRight, Send, CheckCircle2, Bookmark, AlertTriangle,
  Headphones, Pause, Play, Volume2, VolumeX,
  Maximize2, Minimize2, Sun, Moon, Menu, SkipBack, SkipForward, HelpCircle,
  RotateCcw, Lock, Bell, ArrowDown,
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

function HiddenExamAudio({ src, active }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !active || !src) return
    el.play().catch(() => {})
  }, [active, src])
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
  if (!src) return null
  return <audio ref={ref} src={src} preload="auto" className="sr-only" playsInline />
}

// ── Review-only audio (full controls) ────────────────────────────────────────
function ReviewAudioPlayer({ audioUrl, dark }) {
  const audioRef = useRef()
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDur = () => setDuration(audio.duration)
    const onEnd = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onDur)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onDur)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  if (!audioUrl) return (
    <div className={`rounded-2xl border p-5 text-center ${dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-sky-100'}`}>
      <VolumeX size={24} className={`mx-auto mb-2 ${dark ? 'text-gray-600' : 'text-gray-300'}`} />
      <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No audio for this section</p>
    </div>
  )

  const pct = duration ? (currentTime / duration) * 100 : 0
  const D = dark

  return (
    <div className={`rounded-2xl border p-4 ${D ? 'bg-gray-800 border-gray-700' : 'bg-white border-sky-100'}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <div className={`h-1.5 rounded-full cursor-pointer mb-3 ${D ? 'bg-gray-600' : 'bg-gray-200'}`}
        onClick={e => { const r = e.currentTarget.getBoundingClientRect(); audioRef.current.currentTime = ((e.clientX - r.left) / r.width) * duration }}>
        <div className="h-full bg-gradient-to-r from-sky-400 to-slate-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => { audioRef.current.currentTime = Math.max(0, currentTime - 10) }}
          className={`p-1.5 rounded-lg transition ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
          <SkipBack size={16} />
        </button>
        <button onClick={() => {
          const a = audioRef.current
          if (playing) { a.pause(); setPlaying(false) } else { a.play(); setPlaying(true) }
        }} className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-600 flex items-center justify-center text-white shadow-md transition">
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button onClick={() => { audioRef.current.currentTime = Math.min(duration, currentTime + 10) }}
          className={`p-1.5 rounded-lg transition ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
          <SkipForward size={16} />
        </button>
        <span className={`text-xs font-mono flex-1 ${D ? 'text-gray-400' : 'text-gray-500'}`}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        <button onClick={() => { audioRef.current.muted = !muted; setMuted(p => !p) }}
          className={`p-1.5 rounded-lg transition ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
          onChange={e => { setVolume(+e.target.value); audioRef.current.volume = +e.target.value; setMuted(+e.target.value === 0) }}
          className="w-20 accent-sky-500" />
      </div>
    </div>
  )
}

// Clean choice text — strip null chars (\u0000) that sometimes appear in imported data
const cleanText = (t) => (t || '').replace(/\u0000/g, '').replace(/\\000a/g, '\n').trim()

// ── Question inputs ───────────────────────────────────────────────────────────
function MCQInput({ value, onChange, choices, dark, readOnly }) {
  const D = dark
  return (
    <div className="space-y-0.5 mt-2">
      {choices.map(c => (
        <button key={c.option} type="button" disabled={readOnly} onClick={() => onChange(c.option)}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
            value === c.option
              ? D ? 'text-sky-300' : 'text-sky-700'
              : D ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
          } ${readOnly ? 'pointer-events-none' : ''}`}>
          <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${value === c.option ? 'border-sky-500 bg-sky-500' : D ? 'border-gray-500' : 'border-gray-300'}`}>
            {value === c.option && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
          </span>
          <span className={`font-semibold flex-shrink-0 w-5 ${value === c.option ? 'text-sky-500' : 'text-gray-400'}`}>{c.option}.</span>
          <span>{cleanText(c.text)}</span>
        </button>
      ))}
    </div>
  )
}

function MultiSelectInput({ value, onChange, choices, maxSelections, dark, readOnly }) {
  const selected = value ? value.split('|').filter(Boolean) : []
  const toggle = (opt) => {
    if (readOnly) return
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : maxSelections && selected.length >= maxSelections ? selected : [...selected, opt]
    onChange(next.join('|'))
  }
  const D = dark
  return (
    <div className="space-y-0.5 mt-2">
      {maxSelections > 1 && <p className={`text-sm mb-2 ${D ? 'text-sky-400' : 'text-sky-600'}`}>Choose {maxSelections} answers ({selected.length}/{maxSelections} selected)</p>}
      {choices.map(c => {
        const checked = selected.includes(c.option)
        return (
          <button key={c.option} type="button" onClick={() => toggle(c.option)} disabled={readOnly}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition ${
              checked
                ? D ? 'text-sky-300' : 'text-sky-700'
                : D ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900'
            } ${readOnly ? 'pointer-events-none' : ''}`}>
            <span className={`w-5 h-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition ${checked ? 'bg-sky-500 border-sky-500' : D ? 'border-gray-500' : 'border-gray-300'}`}>
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

// ── groupSegments: identical logic as IELTS reading/listening ─────────────────
function groupSegments(questions) {
  const segments = []
  let i = 0
  while (i < questions.length) {
    const q = questions[i]
    const qt = q.question_type
    const gi = q.group_instruction

    // MEND / MINFO / MFEAT with choices → grid matrix
    if (['MEND', 'MFEAT', 'MINFO'].includes(qt) && q.choices?.length > 0) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && ['MEND','MFEAT','MINFO'].includes(questions[j].question_type))
        grp.push(questions[j++])
      segments.push({ type: 'grid', questions: grp }); i = j; continue
    }

    // NOTE / SUMM with [N] markers → inline gap block
    if (['NOTE','SUMM'].includes(qt) && gi && /\[\d+\]/.test(gi)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && ['NOTE','SUMM'].includes(questions[j].question_type))
        grp.push(questions[j++])
      segments.push({ type: 'inline', questions: grp }); i = j; continue
    }

    // TABLE with [N] markers in content → table gap block
    if (qt === 'TABLE' && q.content && /\[\d+\]/.test(q.content)) {
      const grp = [q]; let j = i + 1
      while (j < questions.length && questions[j].group_instruction === gi && questions[j].question_type === 'TABLE' && questions[j].content === q.content)
        grp.push(questions[j++])
      segments.push({ type: 'table', questions: grp }); i = j; continue
    }

    // FLOW → group consecutive FLOW questions into a flowchart block
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

// ── TFNG / YNNG Input ─────────────────────────────────────────────────────────
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

// ── Group Instruction ─────────────────────────────────────────────────────────
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

// ── Match Grid Block (MFEAT / MEND) ──────────────────────────────────────────
function MatchGridBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, toggleBookmark, bookmarkedIds, bookmarkLoading }) {
  const D = dark
  const choices = questions[0]?.choices || []
  const gi = questions[0]?.group_instruction || ''
  return (
    <>
      {gi && <GroupInstruction text={gi} dark={D} />}
      {choices.length > 0 && (
        <div className={`mb-3 rounded-xl border px-4 py-3 ${D ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {choices.map(c => (
              <span key={c.option} className={`text-sm font-medium ${D ? 'text-gray-200' : 'text-gray-700'}`}>
                <span className="font-extrabold">{c.option}</span> — {cleanText(c.text)}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="overflow-x-auto mb-2">
        <table className={`w-auto border-collapse ${D ? 'text-gray-300' : 'text-gray-900'}`}>
          <thead>
            <tr>
              <th className="px-7 py-3 text-left font-normal text-sm" style={{ minWidth: 300 }} />
              {choices.map(c => (
                <th key={c.option} className={`px-5 py-3 text-center font-bold w-[72px] ${D ? 'text-gray-200' : 'text-gray-900'}`}>
                  {c.option}
                </th>
              ))}
              <th className="px-3 py-3 w-[48px]" />
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => {
              const val = answers[String(q.id)] || ''
              const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
              const isBookmarked = bookmarkedIds?.has?.(q.id)
              const bmLoading = bookmarkLoading?.has?.(q.id)
              return (
                <tr key={q.id} className="group">
                  <td className="px-6 py-3 text-[1.02em]">
                    <span className={`font-bold mr-2 ${D ? 'text-gray-300' : 'text-gray-700'}`}>{q.number}.</span>
                    <span>{q.content}</span>
                    {rr && !rr.is_correct && <span className="ml-2 text-xs font-semibold text-red-500">✗→{rr.correct_answer}</span>}
                    {rr?.is_correct && <span className="ml-2 text-xs font-semibold text-green-500">✓</span>}
                  </td>
                  {choices.map(c => {
                    const sel = val === c.option
                    return (
                      <td key={c.option} className="p-0 w-[72px]">
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

// ── Transcript with evidence highlights ───────────────────────────────────────
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
    if (!highlights.length) return text
    const nodes = []
    let cursor = 0
    for (const h of highlights) {
      if (h.start > cursor) nodes.push(text.slice(cursor, h.start))
      nodes.push(
        <mark key={h.q} style={{ background: '#fde047', borderRadius: 3, padding: '0 2px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: '50%',
            background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 900,
            marginRight: 3, verticalAlign: 'middle',
          }}>{h.q}</span>
          {text.slice(h.start, h.end)}
        </mark>
      )
      cursor = h.end
    }
    if (cursor < text.length) nodes.push(text.slice(cursor))
    return nodes
  }

  return (
    <div className={`text-sm leading-relaxed whitespace-pre-wrap ${D ? 'text-gray-300' : 'text-gray-700'}`}>
      {render()}
    </div>
  )
}

// ── Inline Gap Block (NOTE / SUMM) ────────────────────────────────────────────
function InlineGapBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, toggleBookmark, bookmarkedIds, bookmarkLoading }) {
  const D = dark
  const [focusedId, setFocusedId] = useState(null)
  const [selectedWord, setSelectedWord] = useState('')
  const qt = questions[0]?.question_type
  const isSumm = qt === 'SUMM'
  const gi = questions[0]?.group_instruction || ''
  const lines = gi.split('\n')
  const gapIdx = lines.findIndex(l => /\[\d+\]/.test(l))
  let preamble = '', body = gi
  if (gapIdx > 0) {
    const pre = lines.slice(0, gapIdx).join('\n').trim()
    if (/^questions?\s*\d+/i.test(pre.split('\n')[0])) { preamble = pre; body = lines.slice(gapIdx).join('\n') }
  }
  const wordBank = questions.reduce((wb, q) => wb.length ? wb : (q.word_bank?.length ? q.word_bank : []), [])
  const groupKey = useMemo(() => `cefr-summ-${questions.map(q => q.id).join('-')}`, [questions])
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
        {rr && !rr.is_correct && <span className="text-[10px] font-semibold text-green-600">→{rr.correct_answer}</span>}
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
      const isBullet = /^[•\-]\s/.test(line.trimStart())
      const isNumbered = /^\d+\.\s/.test(line.trimStart())
      const isHeader = /^\*\*.+\*\*$/.test(line.trim())
      if (isHeader) {
        const inner = line.replace(/^\*\*/, '').replace(/\*\*$/, '')
        return <div key={li} className={`font-bold mt-3 first:mt-0 leading-relaxed ${D ? 'text-gray-100' : 'text-gray-900'}`}>{parseInline(inner, `h${li}`)}</div>
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
                    <button key={w} type="button"
                      draggable={!reviewMode}
                      onDragStart={(e) => {
                        if (reviewMode) return
                        e.dataTransfer.setData('application/x-cefr-wordbank', JSON.stringify({ word: w, groupKey }))
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

// ── Table Gap Block ───────────────────────────────────────────────────────────
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
        {rr && !rr.is_correct && <span className="text-[10px] font-semibold text-green-600">→{rr.correct_answer}</span>}
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
      <div className={`inline-block align-top rounded-xl overflow-hidden mb-2 border ${D ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="overflow-x-auto max-w-full">
          <table className={`w-auto border-collapse ${D ? 'text-gray-200' : 'text-gray-900'}`}>
            {headerRow.length > 0 && (
              <thead>
                <tr className={D ? 'bg-gray-700/60' : 'bg-gray-100'}>
                  {headerRow.map((cell, ci) => (
                    <th key={ci} className={`px-6 py-3 text-left font-bold border-b border-r last:border-r-0 ${D ? 'border-gray-600' : 'border-gray-200'}`}>
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
                    <td key={ci} className={`px-6 py-3.5 border-r last:border-r-0 leading-relaxed ${D ? 'border-gray-700' : 'border-gray-100'}`}>
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

// ── Group List — labeled list shown below group_instruction ───────────────────
function GroupList({ items, dark }) {
  if (!items?.length) return null
  const D = dark
  return (
    <div className={`rounded-xl border px-4 py-3 mb-2 text-sm ${D ? 'border-gray-700 bg-gray-800/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-700'}`}>
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

// ── Flow Chart Block (FLOW type) ──────────────────────────────────────────────
function FlowBlock({ questions, answers, onAnswer, dark, reviewMode, reviewMap, showCorrectInReview, bookmarkedIds, bookmarkLoading, toggleBookmark }) {
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
            const bmLoading = q ? bookmarkLoading?.has(q.id) : false
            const parts = box.hasGap ? box.text.split('___') : null

            return (
              <div key={box.key} id={q ? `cefr-lq-${q.id}` : undefined}>
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
                      {!reviewMode && (
                        <button type="button" onClick={e => { e.stopPropagation(); toggleBookmark?.(q.id, e) }} disabled={bmLoading}
                          className={`inline-flex items-center transition ${bmLoading ? 'opacity-40' : ''} ${isBookmarked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <Bookmark size={20} className={isBookmarked ? 'fill-red-500 text-red-500' : D ? 'text-gray-500' : 'text-gray-400'} />
                        </button>
                      )}
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

// ── QuestionList with grouped rendering ───────────────────────────────────────
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

        // ── Inline gap block (NOTE / SUMM) ─────────────────────────────────
        if (seg.type === 'inline') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <InlineGapBlock questions={seg.questions} {...sharedProps} />
              {reviewMode && seg.questions.map(q => q.answer_review ? (
                <div key={q.id} className="text-xs rounded-lg px-3 py-2 border border-yellow-200 bg-yellow-50 text-yellow-800 leading-relaxed mb-1">
                  <span className="font-semibold block mb-0.5">Q{q.number} — Evidence:</span>{q.answer_review}
                </div>
              ) : null)}
            </div>
          )
        }

        // ── Table gap block ────────────────────────────────────────────────
        if (seg.type === 'table') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <TableGapBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // ── Match grid block (MFEAT / MEND) ──────────────────────────────
        if (seg.type === 'grid') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <MatchGridBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // ── Flow chart block ───────────────────────────────────────────────
        if (seg.type === 'flow') {
          return (
            <div key={`seg-${si}`} className={sectionGapClass} ref={el => { seg.questions.forEach(q => { questionRefs.current[q.id] = el }) }}>
              <FlowBlock questions={seg.questions} {...sharedProps} />
            </div>
          )
        }

        // ── Single card ───────────────────────────────────────────────────
        const q = seg.questions[0]
        const i = questions.indexOf(q)
        const isBookmarked = bookmarkedIds.has(q.id)
        const bmLoading = bookmarkLoading.has(q.id)
        const readOnly = reviewMode
        const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
        const showGI = q.group_instruction && (i === 0 || questions[i - 1]?.group_instruction !== q.group_instruction)

        return (
          <div key={q.id} className={sectionGapClass}>
            {showGI && <GroupInstruction text={q.group_instruction} dark={D} />}
            {showGI && q.group_list?.length > 0 && <GroupList items={q.group_list} dark={D} />}
            <div
              id={`cefr-lq-${q.id}`}
              ref={el => { questionRefs.current[q.id] = el }}
              onClick={() => setActiveQ(i)}
              className={`group relative p-5 rounded-2xl cursor-pointer transition ${qCard()}`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border text-base font-black ${
                  D ? 'border-gray-600 bg-gray-700 text-gray-100' : 'border-gray-300 bg-white text-gray-800'
                }`}>
                  {q.number}
                </span>
                <span className={`text-sm font-semibold px-2 py-0.5 rounded-md ${D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {q.question_type_display || q.question_type}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  {answers[String(q.id)] && <CheckCircle2 size={13} className="text-green-500" />}
                </div>
              </div>

              {q.image && <img src={q.image} alt={`Q${q.number}`} className="w-full rounded-xl object-contain max-h-48 mb-2 border border-gray-200" />}
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
              {/* MATCH with choices → MCQ style */}
              {q.question_type === 'MATCH' && q.choices?.length > 0 && (
                <MCQInput value={answers[String(q.id)] || ''} onChange={v => setAnswer(q.id, v)} choices={q.choices} dark={D} readOnly={readOnly} />
              )}
              {/* Text inputs */}
              {['GAP', 'SHORT', 'SENT', 'FLOW', 'TABLE', 'NOTE', 'SUMM'].includes(q.question_type) && !(/\[\d+\]/.test(q.group_instruction || '')) && (
                <TextInput
                  value={answers[String(q.id)] || ''}
                  onChange={v => setAnswer(q.id, v)}
                  placeholder={String(q.number)}
                  dark={D}
                  readOnly={readOnly}
                  compact
                />
              )}
              {q.question_type === 'MATCH' && !q.choices?.length && (
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
                  {!rr.is_correct && <><span className="mx-2">|</span><span className="font-semibold text-emerald-700">Correct: {rr.correct_answer}</span></>}
                </div>
              )}
              {reviewMode && q.answer_review && (
                <div className="mt-2 text-xs rounded-lg px-3 py-2 border border-yellow-200 bg-yellow-50 text-yellow-800 leading-relaxed">
                  <span className="font-semibold block mb-0.5">Q{q.number} — Evidence:</span>{q.answer_review}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Start Screen ──────────────────────────────────────────────────────────────
function StartScreen({ section, title, onStart, dark }) {
  const D = dark
  const bg = D ? 'bg-gray-950' : 'bg-white'
  const surface = D ? 'bg-gray-800 border-gray-700' : 'bg-white border-sky-100'
  const textSub = D ? 'text-gray-400' : 'text-gray-500'
  return (
    <div className={`flex items-center justify-center h-full ${bg} p-6`}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className={`w-full max-w-md rounded-3xl border shadow-xl p-8 text-center ${surface}`}>
        <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-5 shadow-glow">
          <Headphones size={36} className="text-white" />
        </div>
        <h1 className={`text-2xl font-black mb-1 ${D ? 'text-gray-100' : 'text-gray-800'}`}>{title}</h1>
        <p className={`text-sm mb-6 ${textSub}`}>CEFR Listening Test</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`rounded-2xl p-3 ${D ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <HelpCircle size={16} className="text-sky-500 mx-auto mb-1" />
            <p className={`text-lg font-black ${D ? 'text-gray-100' : 'text-gray-800'}`}>{section?.questions?.length ?? '—'}</p>
            <p className={`text-xs ${textSub}`}>Questions</p>
          </div>
          <div className={`rounded-2xl p-3 ${D ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <Clock size={16} className="text-sky-400 mx-auto mb-1" />
            <p className={`text-lg font-black ${D ? 'text-gray-100' : 'text-gray-800'}`}>{section?.time_limit ?? 25}</p>
            <p className={`text-xs ${textSub}`}>Minutes</p>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onStart}
          className="w-full py-4 gradient-primary text-white rounded-2xl text-base font-black flex items-center justify-center gap-3 shadow-glow hover:opacity-95 transition">
          <Play size={18} className="fill-white" /> Start test
        </motion.button>
      </motion.div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CEFRListeningAttempt() {
  const { attemptId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)

  const sectionId = searchParams.get('section')
  const sectionTitle = decodeURIComponent(searchParams.get('title') || 'Listening')
  const reviewData = location.state?.reviewData || null
  const reviewMode = Boolean(reviewData)
  const [showCorrectInReview, setShowCorrectInReview] = useState(true)

  const [answers, setAnswers] = useState({})
  const [activeQ, setActiveQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const allowLeaveRef = useRef(false)
  const questionRefs = useRef({})
  const [audioStarted, setAudioStarted] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fontSize, setFontSize] = useState('normal')

  // Bookmarks
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set())
  const [bookmarkLoading, setBookmarkLoading] = useState(new Set())

  const { data: section, isLoading } = useQuery({
    queryKey: ['cefr-listening-section', sectionId],
    queryFn: () => api.get(`/cefr/listening/${sectionId}/`).then(r => r.data),
    enabled: !!sectionId,
  })

  const timerStorageKey = `cefr-listening-timer-${attemptId}-${sectionId || 'x'}`
  const timer = useTimer((section?.time_limit || 25) * 60, reviewMode ? null : timerStorageKey, reviewMode)
  const questions = section?.questions || []

  const evidenceItems = useMemo(() => {
    if (!reviewMode || !showCorrectInReview) return []
    return questions
      .map((q) => {
        const raw = String(q.answer_review || '').trim()
        if (!raw) return null
        return { questionNumber: q.number, snippet: raw }
      })
      .filter(Boolean)
  }, [questions, reviewMode, showCorrectInReview])

  const reviewMap = useMemo(() => {
    const m = {}
    if (!reviewData?.results) return m
    for (const r of reviewData.results) {
      if (r.question_id != null) m[String(r.question_id)] = r
      if (r.number != null) m[`n-${r.number}`] = r
    }
    return m
  }, [reviewData])

  useEffect(() => {
    if (!reviewData?.results) return
    const next = {}
    for (const r of reviewData.results) {
      if (r.question_id != null) next[String(r.question_id)] = r.user_answer ?? ''
    }
    setAnswers(next)
  }, [reviewData])

  useEffect(() => {
    window.history.pushState({ cefrListeningGuard: true }, '', window.location.href)
    const onPopState = () => {
      if (allowLeaveRef.current || reviewMode) return
      setShowExitConfirm(true)
      window.history.pushState({ cefrListeningGuard: true }, '', window.location.href)
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
    if (section?.questions) {
      const ids = section.questions.filter(q => q.is_bookmarked).map(q => q.id)
      setBookmarkedIds(new Set(ids))
    }
  }, [section])

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

  const handleSubmit = async () => {
    if (reviewMode) return
    timer.stop()
    timer.clearPersist()
    setShowConfirm(false)
    setShowExitConfirm(false)
    setSubmitting(true)
    try {
      const res = await api.post(`/cefr/listening/${sectionId}/submit/`, {
        attempt_id: parseInt(attemptId, 10),
        answers,
      })
      allowLeaveRef.current = true
      navigate(`/exam/cefr/listening/${attemptId}/result?section=${sectionId}&title=${encodeURIComponent(sectionTitle)}`, {
        state: { result: res.data }, replace: true,
      })
    } catch (e) {
      alert('Error: ' + (e.response?.data?.detail || e.message))
      setSubmitting(false)
    }
  }

  const handleBackToList = () => {
    allowLeaveRef.current = true
    timer.clearPersist()
    navigate('/app/cefr/listening')
  }

  const handleRedoFromReview = async () => {
    if (!sectionId) return
    try {
      const res = await api.post(`/cefr/listening/${sectionId}/start/`)
      navigate(`/exam/cefr/listening/${res.data.attempt_id}?section=${sectionId}&title=${encodeURIComponent(sectionTitle)}`)
    } catch {
      // silent
    }
  }

  const goToQuestion = (index) => {
    if (index < 0 || index >= questions.length) return
    setActiveQ(index)
    const q = questions[index]
    const el = questionRefs.current[q.id] || document.getElementById(`cefr-lq-${q.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const D = darkMode
  const bg      = D ? 'bg-gray-950' : 'bg-white'
  const topbar  = D ? 'bg-gray-900 border-gray-700' : 'bg-white border-sky-100'
  const divider = D ? 'border-gray-700' : 'border-sky-100'
  const textMain= D ? 'text-gray-100' : 'text-gray-800'
  const textSub = D ? 'text-gray-400' : 'text-gray-500'
  const fontCls = fontSize === 'small' ? 'text-base' : fontSize === 'large' ? 'text-xl' : 'text-lg'
  const questionZoom = fontSize === 'small' ? 0.93 : fontSize === 'large' ? 1.08 : 1
  const qCard = () => D ? 'bg-gray-800' : 'bg-white'

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full ${bg}`}>
        <div className={`flex items-center gap-3 px-5 h-16 border-b flex-shrink-0 ${D ? 'bg-gray-900 border-gray-700' : 'bg-white border-sky-100'}`}>
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 flex-1 max-w-md" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex-1 p-4 max-w-3xl mx-auto w-full space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!reviewMode && !audioStarted) {
    return <StartScreen section={section} title={sectionTitle} dark={D} onStart={() => setAudioStarted(true)} />
  }

  return (
    <div className={`flex flex-col h-full ${bg} ${textMain}`}>
      {/* Top Bar */}
      <div className={`relative flex flex-wrap items-center gap-2 px-4 md:px-5 min-h-[4rem] py-2 border-b flex-shrink-0 ${topbar}`}>
        <button
          type="button"
          onClick={() => (reviewMode ? navigate(-1) : setShowExitConfirm(true))}
          className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border flex-shrink-0 ${
            D ? 'border-gray-700 text-gray-200' : 'border-sky-100 text-gray-600'
          }`}
        >
          <ChevronLeft size={16} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black">CEFR</span>
          <span className={`text-[10px] ${textSub} hidden md:inline`}>ID: {user?.id ?? '—'}</span>
        </div>
        <p className="flex-1 font-semibold text-sm truncate min-w-[120px]">
          {sectionTitle}
          {reviewMode ? ' — Review' : ''}
        </p>
        {!reviewMode && (
          <span className={`text-sm font-semibold hidden sm:block ${textSub}`}>
            {answeredCount}/{questions.length}
          </span>
        )}
        {!reviewMode && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 top-2 z-10 flex items-center gap-2 px-3 py-2 rounded-2xl font-mono text-sm font-extrabold ${
              timer.urgent ? 'bg-red-100 text-red-600 animate-pulse' : D ? 'bg-gray-700 text-sky-400' : 'bg-sky-50 text-sky-600'
            }`}
          >
            <Clock size={14} />
            {timer.fmt}
            <button
              type="button"
              onClick={timer.paused ? timer.start : timer.pause}
              className={`px-2 py-1 rounded-lg text-xs font-bold border ${timer.paused ? 'bg-sky-500 text-white border-sky-500' : D ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}
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
              className={`text-xs px-2 py-1 rounded-lg border ${showCorrectInReview ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-gray-200'}`}
            >
              Correct
            </button>
            <button type="button" onClick={handleRedoFromReview} className="text-xs px-2 py-1 rounded-lg border border-gray-200 flex items-center gap-1">
              <RotateCcw size={12} /> Re-Do
            </button>
            <button type="button" onClick={() => navigate(-1)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 flex items-center gap-1">
              <Lock size={12} /> Results
            </button>
          </div>
        ) : (
          <>
            <button type="button" className={`${D ? 'text-gray-400' : 'text-gray-500'} hidden sm:block p-2`} aria-hidden>
              <Bell size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
                else document.exitFullscreen?.()
              }}
              className={`ml-auto p-2 rounded-lg ${D ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <div className="relative flex-shrink-0">
              <button type="button" onClick={() => setMenuOpen((p) => !p)} className={`p-2 rounded-lg ${D ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Menu size={18} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    className={`absolute right-0 top-10 w-44 rounded-2xl shadow-xl border z-50 overflow-hidden ${D ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDarkMode((p) => !p)
                        setMenuOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm border-b ${D ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-100 hover:bg-gray-50'}`}
                    >
                      {D ? <Sun size={14} /> : <Moon size={14} />} Theme
                    </button>
                    <div className={`px-3 py-2.5 border-t ${D ? 'border-gray-700' : 'border-gray-100'}`}>
                      <p className={`text-xs font-semibold mb-2 ${textSub}`}>Text size</p>
                      <div className="flex gap-1">
                        {['small', 'normal', 'large'].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setFontSize(size)}
                            className={`flex-1 py-1.5 rounded-lg text-sm font-bold ${
                              fontSize === size
                                ? 'bg-sky-500 text-white'
                                : D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {size === 'small' ? 'A-' : size === 'normal' ? 'A' : 'A+'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
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

      {/* Body */}
      <div className={`flex-1 overflow-y-auto p-4 w-full space-y-4 pb-40 ${fontCls}`} style={{ zoom: questionZoom }}>
        {reviewMode && (
          <div className={`rounded-xl border p-3 mb-2 ${D ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-sm font-semibold mb-2 ${textMain}`}>Review audio</p>
            <ReviewAudioPlayer audioUrl={section?.audio_url} dark={D} />
            {section?.transcript && (
              <div className={`mt-3 rounded-lg p-3 border ${D ? 'border-gray-600' : 'border-gray-200'}`}>
                <TranscriptWithEvidence
                  text={section.transcript}
                  dark={D}
                  evidenceItems={showCorrectInReview ? evidenceItems : []}
                />
              </div>
            )}
          </div>
        )}
        <HiddenExamAudio src={!reviewMode && audioStarted ? section?.audio_url : null} active={!reviewMode && audioStarted} />
        {!reviewMode && (
          <div className={`rounded-lg px-3 py-2 text-sm mb-2 ${D ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
            Listen and answer all questions. Audio plays in the background (player hidden).
          </div>
        )}

        {/* Questions */}
        <QuestionList
          questions={questions}
          answers={answers}
          setAnswer={setAnswer}
          activeQ={activeQ}
          setActiveQ={setActiveQ}
          qCard={qCard}
          D={D}
          textMain={textMain}
          toggleBookmark={toggleBookmark}
          bookmarkedIds={bookmarkedIds}
          bookmarkLoading={bookmarkLoading}
          reviewMode={reviewMode}
          showCorrectInReview={showCorrectInReview}
          reviewMap={reviewMap}
          questionRefs={questionRefs}
        />

      </div>

      <div className={`fixed bottom-2 md:bottom-3 left-2 right-2 md:left-4 md:right-4 z-30 rounded-2xl border ${divider} ${D ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur shadow-lg`}>
        <div className="flex items-center gap-2 px-3 py-2 max-w-screen-lg mx-auto">
          <div className="flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-2 min-w-max">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-sky-500 ${D ? 'bg-gray-800' : 'bg-white'}`}>
                <span className="text-xs font-black text-sky-500 mr-0.5 whitespace-nowrap">Part 1</span>
                {questions.map((q, i) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goToQuestion(i)}
                    className={`w-7 h-7 rounded-full text-[11px] font-bold transition flex items-center justify-center flex-shrink-0 ${
                      answers[String(q.id)]
                        ? 'bg-sky-500 text-white'
                        : activeQ === i
                          ? 'bg-sky-500 text-white ring-2 ring-sky-300'
                          : D ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
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
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black disabled:opacity-60 transition whitespace-nowrap"
            >
              <Send size={14} /> Finish test
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/app/cefr/listening')}
              className={`flex-shrink-0 px-4 py-2 border rounded-xl text-sm font-semibold transition whitespace-nowrap ${D ? 'border-gray-600 text-gray-300 hover:bg-gray-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              Tests
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className={`rounded-2xl shadow-2xl p-6 w-full max-w-sm ${D ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-sky-500" />
              </div>
              <h3 className="font-bold text-center text-lg mb-1">Submit test?</h3>
              <p className={`text-sm text-center mb-4 ${D ? 'text-gray-400' : 'text-gray-500'}`}>
                {answeredCount} of {questions.length} answered
                {questions.length - answeredCount > 0 && <span className="text-red-500"> ({questions.length - answeredCount} unanswered)</span>}
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
                {answeredCount} / {questions.length} javob
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button type="button" onClick={() => setShowExitConfirm(false)} className={`py-2.5 border rounded-xl text-sm font-medium ${D ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-600'}`}>
                  Cancel
                </button>
                <button type="button" onClick={handleBackToList} className={`py-2.5 border rounded-xl text-sm font-medium ${D ? 'border-gray-600' : 'border-gray-200'}`}>
                  Back to list
                </button>
                <button type="button" onClick={handleSubmit} disabled={submitting} className="py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
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



