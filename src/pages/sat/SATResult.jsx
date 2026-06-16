import { useMemo, useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator, BookOpen, CheckCircle2, XCircle, MinusCircle,
  ChevronLeft, ChevronDown, Bookmark, Lightbulb, X, Flag,
} from 'lucide-react'
import katex from 'katex'
import api from '../../api/client'
import { InlineMath, BlockMath } from 'react-katex'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

// ── Same LaTeX handling as SATTestAttempt (HTML + \\[ \\] / \\( \\)) ─────────
function renderMath(html) {
  if (!html) return ''
  let out = String(html)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<span class="text-red-500 text-xs">[math]</span>` }
  })
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `<span class="text-red-500 text-xs">[math]</span>` }
  })
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { throwOnError: false }) }
    catch { return `<span class="text-red-500 text-xs">[math]</span>` }
  })
  out = out.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { throwOnError: false }) }
    catch { return _ }
  })
  // Fallback: chegarasiz (delimiter'siz) LaTeX — "\cos B = \frac{1}{24}"
  out = out.replace(
    /\\[a-zA-Z]+(?:\s*\{[^{}]*\}|\s*\^\{[^{}]*\}|\s*\^[^\s{}]+|\s*_\{[^{}]*\}|\s*_[^\s{}]+|\s+[A-Za-z]\b)*/g,
    (m) => {
      try { return katex.renderToString(m.trim(), { throwOnError: false }) }
      catch { return m }
    }
  )
  return out
}

function TableViewResult({ tableData }) {
  if (!Array.isArray(tableData) || tableData.length === 0) return null
  return (
    <div className="overflow-x-auto my-3 border border-black bg-white">
      <table className="w-full border-collapse text-[13px]">
        <tbody>
          {tableData.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? 'bg-white' : 'bg-white'}>
              {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                ri === 0 ? (
                  <th
                    key={ci}
                    className="border border-black px-3 py-2 font-bold text-left text-black whitespace-nowrap"
                  >
                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(String(cell ?? ''))) }} />
                  </th>
                ) : (
                  <td key={ci} className="border border-black px-3 py-2 text-black">
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

function LatexText({ text }) {
  if (!text) return null
  const parts = []
  const re = /(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g
  let lastIndex = 0, i = 0, match
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex)
      parts.push(<span key={i++} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.slice(lastIndex, match.index)) }} />)
    const raw = match[0]
    try {
      if (raw.startsWith('\\[') || raw.startsWith('$$')) {
        const inner = raw.startsWith('\\[') ? raw.slice(2, -2) : raw.slice(2, -2)
        parts.push(<BlockMath key={i++} math={inner.trim()} />)
      } else {
        const inner = raw.startsWith('\\(') ? raw.slice(2, -2) : raw.slice(1, -1)
        parts.push(<InlineMath key={i++} math={inner.trim()} />)
      }
    } catch { parts.push(<span key={i++}>{raw}</span>) }
    lastIndex = match.index + raw.length
  }
  if (lastIndex < text.length)
    parts.push(<span key={i++} dangerouslySetInnerHTML={{ __html: sanitizeHtml(text.slice(lastIndex)) }} />)
  return <>{parts}</>
}

function ScoreRing({ score, max = 800, label, color = '#f97316' }) {
  const pct = Math.min(score / max, 1)
  const r = 52
  const circ = 2 * Math.PI * r
  const dash = pct * circ

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#f3f4f6" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-400">/{max}</span>
        </div>
      </div>
      <span className="text-sm font-bold text-gray-700">{label}</span>
    </div>
  )
}

function AnswerCard({ ans, index }) {
  const [expanded, setExpanded] = useState(false)
  const choices = ['A', 'B', 'C', 'D'].map((l) => {
    const found = ans.choices?.find((c) => c.option === l)
    return { key: l, text: found?.text, image: found?.image }
  }).filter((c) => c.text || c.image)

  const isUnanswered = !ans.user_answer

  return (
    <motion.div
      layout
      className={`rounded-2xl border overflow-hidden ${
        isUnanswered ? 'border-gray-200 bg-gray-50/50'
          : ans.is_correct ? 'border-green-200 bg-green-50/50'
          : 'border-red-200 bg-red-50/50'
      }`}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-shrink-0 mt-0.5">
          {isUnanswered
            ? <MinusCircle size={18} className="text-gray-400" />
            : ans.is_correct
              ? <CheckCircle2 size={18} className="text-green-600" />
              : <XCircle size={18} className="text-red-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-500">Q{ans.number}</span>
            <span className="text-xs text-gray-400">{ans.section === 'MATH' ? 'Math' : 'English'} M{ans.module}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              ans.difficulty?.toUpperCase() === 'EASY' ? 'bg-green-100 text-green-700'
                : ans.difficulty?.toUpperCase() === 'MEDIUM' ? 'bg-slate-100 text-slate-700'
                : 'bg-red-100 text-red-700'
            }`}>{ans.difficulty?.toLowerCase()}</span>
            {ans.is_bookmarked && <Bookmark size={12} className="text-sky-500" fill="currentColor" />}
            {isUnanswered && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Blank</span>}
          </div>
          <p className="text-sm text-gray-800 line-clamp-2 leading-snug">
            <LatexText text={ans.content} />
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            isUnanswered ? 'bg-gray-100 text-gray-400'
              : ans.is_correct ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}>
            {ans.user_answer || '—'}
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/60 pt-3">
              {ans.passage && (
                <div className="text-xs text-gray-600 bg-white/80 rounded-xl p-3 max-h-32 overflow-y-auto leading-relaxed
                  [&_p]:mb-1.5 [&_ul]:ml-4 [&_ul]:list-disc [&_ol]:ml-4 [&_ol]:list-decimal [&_li]:my-0.5 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold">
                  <LatexText text={ans.passage} />
                </div>
              )}
              {ans.table_data && Array.isArray(ans.table_data) && ans.table_data.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      {ans.table_data.map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? 'bg-gray-100' : ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                            ri === 0
                              ? <th key={ci} className="border border-gray-200 px-2 py-1.5 font-semibold text-left">{cell}</th>
                              : <td key={ci} className="border border-gray-200 px-2 py-1.5">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {ans.image && (
                <img src={ans.image} alt="Question" className="rounded-lg border border-gray-200 max-h-44 object-contain" />
              )}
              <div className="text-sm text-gray-800 leading-relaxed
                [&_p]:mb-2 [&_p:last-child]:mb-0
                [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:my-1
                [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:my-1
                [&_li]:my-0.5
                [&_u]:underline [&_b]:font-bold [&_strong]:font-bold
                [&_i]:italic [&_em]:italic">
                <LatexText text={ans.content} />
              </div>
              {choices.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {choices.map((c) => {
                    const isCorrect = ans.correct_answer === c.key
                    const isUser = ans.user_answer === c.key
                    return (
                      <div
                        key={c.key}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
                          isCorrect ? 'bg-green-100 border border-green-300 font-bold text-green-800'
                            : isUser && !isCorrect ? 'bg-red-100 border border-red-200 text-red-700'
                            : 'bg-white text-gray-600'
                        }`}
                      >
                        <span className="font-black w-4 flex-shrink-0">{c.key}</span>
                        <span className="flex-1 leading-snug min-w-0">
                          {c.image && <img src={c.image} alt={`Choice ${c.key}`} className="max-h-20 object-contain mb-1 rounded" />}
                          {c.text && <LatexText text={c.text} />}
                        </span>
                        {isCorrect && <CheckCircle2 size={12} className="text-green-600 flex-shrink-0" />}
                        {isUser && !isCorrect && <XCircle size={12} className="text-red-500 flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              )}
              {ans.explanation && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
                  <Lightbulb size={12} className="inline mr-1" />
                  <span className="font-bold">Explanation: </span>
                  <LatexText text={ans.explanation} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function prettyLabel(v) {
  if (!v) return 'Unknown'
  return String(v)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// SAT category definitions
const ENG_CATEGORIES = [
  { key: 'information_and_ideas',  label: 'Information and Ideas',         color: '#3b82f6' },
  { key: 'craft_and_structure',    label: 'Craft and Structure',           color: '#06b6d4' },
  { key: 'expression_of_ideas',    label: 'Expression of Ideas',          color: '#8b5cf6' },
  { key: 'standard_english',       label: 'Standard English Conventions', color: '#f59e0b' },
]
const MATH_CATEGORIES = [
  { key: 'algebra',        label: 'Algebra',                            color: '#f97316' },
  { key: 'advanced_math',  label: 'Advanced Math',                      color: '#ef4444' },
  { key: 'problem_data',   label: 'Problem-Solving & Data Analysis',   color: '#10b981' },
  { key: 'geometry',       label: 'Geometry and Trigonometry',          color: '#6366f1' },
]

function DonutChart({ correct, total, color, size = 64 }) {
  const pct = total > 0 ? correct / total : 0
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  )
}

function CategoryRow({ catDef, stats }) {
  const { correct = 0, total = 0, topics = [] } = stats || {}
  const pct = total > 0 ? Math.round(correct / total * 100) : 0
  return (
    <div className="space-y-3 pb-5 border-b border-gray-100 last:border-0 last:pb-0">
      {/* Category header */}
      <div className="flex items-start gap-3 sm:gap-4">
        <DonutChart correct={correct} total={total} color={catDef.color} size={60} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[15px] sm:text-base font-bold text-gray-900 leading-snug">{catDef.label}</span>
            <span className="text-[15px] sm:text-base font-black tabular-nums text-gray-800 flex-shrink-0">{correct}/{total}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: catDef.color }} />
          </div>
          <div className="mt-1 text-sm text-gray-500">{pct}% correct</div>
        </div>
      </div>
      {/* Topics */}
      {topics.length > 0 && (
        <div className="pl-0 sm:pl-20 space-y-2.5">
          {topics.map((t) => {
            const tPct = t.total > 0 ? Math.round(t.correct / t.total * 100) : 0
            return (
              <div key={t.topic} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 py-1">
                <div className="flex-1 min-w-0 text-sm text-gray-700 leading-snug sm:line-clamp-2">
                  {t.topic || '—'}
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 sm:min-w-[8.5rem] justify-end">
                  <div className="h-1.5 flex-1 sm:w-24 sm:flex-none rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${tPct}%`, backgroundColor: catDef.color }} />
                  </div>
                  <span className="text-sm font-medium tabular-nums text-gray-600 w-[3.25rem] text-right">{t.correct}/{t.total}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SATResult() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeAnswerIndex, setActiveAnswerIndex] = useState(null)

  // Block browser back — redirect to test list instead
  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const handlePop = () => {
      window.history.pushState(null, '', window.location.href)
      navigate('/app/sat/tests', { replace: true })
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [navigate])

  const { data: result, isLoading } = useQuery({
    queryKey: ['sat-result', id],
    queryFn: () => api.get(`/sat/result/${id}/`).then((r) => r.data),
  })
  const { data: testsData } = useQuery({
    queryKey: ['sat-tests-for-best-score'],
    queryFn: () => api.get('/sat/tests/').then((r) => r.data),
  })

  const answers = result?.answers || []
  const mathAnswers = answers.filter((a) => a.section === 'MATH')
  const englishAnswers = answers.filter((a) => a.section === 'ENGLISH')
  const testsList = Array.isArray(testsData) ? testsData : (testsData?.results || [])
  const bestOverallScore = testsList.reduce((max, t) => {
    const score = Number(t?.best_score)
    return Number.isFinite(score) ? Math.max(max, score) : max
  }, 0)

  const mathCorrect   = mathAnswers.filter((a) => a.is_correct).length
  const engCorrect    = englishAnswers.filter((a) => a.is_correct).length
  const mathPct       = mathAnswers.length ? Math.round(mathCorrect / mathAnswers.length * 100) : 0
  const engPct        = englishAnswers.length ? Math.round(engCorrect / englishAnswers.length * 100) : 0

  const mathM1Correct = mathAnswers.filter((a) => a.module === 1 && a.is_correct).length
  const mathM2Correct = mathAnswers.filter((a) => a.module === 2 && a.is_correct).length
  const engM1Correct  = englishAnswers.filter((a) => a.module === 1 && a.is_correct).length
  const engM2Correct  = englishAnswers.filter((a) => a.module === 2 && a.is_correct).length
  const mathM1Total   = mathAnswers.filter((a) => a.module === 1).length
  const mathM2Total   = mathAnswers.filter((a) => a.module === 2).length
  const engM1Total    = englishAnswers.filter((a) => a.module === 1).length
  const engM2Total    = englishAnswers.filter((a) => a.module === 2).length

  const moduleRows = useMemo(() => {
    const byKey = new Map()
    const mk = (a) => {
      const sec = a.section || 'UNKNOWN'
      const mod = Number(a.module || 1)
      const variant = mod === 1 ? 'STANDARD' : String(a.module_variant || 'STANDARD').toUpperCase()
      return `${sec}|${mod}|${variant}`
    }
    for (const a of answers) {
      const key = mk(a)
      if (!byKey.has(key)) {
        const [sec, mod, variant] = key.split('|')
        const secLabel = sec === 'ENGLISH' ? 'Reading & Writing' : 'Math'
        const mLabel = mod === '1' ? 'Module 1' : `Module 2 (${prettyLabel(variant)})`
        byKey.set(key, {
          key,
          section: sec,
          sectionLabel: secLabel,
          moduleLabel: mLabel,
          correct: 0,
          wrong: 0,
          omitted: 0,
          isOmittedModule: !!a.omitted_module,
          items: [],
        })
      }
      const row = byKey.get(key)
      const state = !a.user_answer ? 'omitted' : a.is_correct ? 'correct' : 'wrong'
      if (state === 'correct') row.correct += 1
      else if (state === 'wrong') row.wrong += 1
      else row.omitted += 1
      row.items.push({ number: a.number, state, answer: a })
    }
    const priority = (r) => {
      const sec = r.section === 'ENGLISH' ? 0 : 1
      const m2 = r.moduleLabel.includes('Module 2') ? 1 : 0
      const v = r.moduleLabel.includes('Easy') ? 0 : r.moduleLabel.includes('Medium') ? 1 : r.moduleLabel.includes('Hard') ? 2 : 0
      return sec * 100 + m2 * 10 + v
    }
    const rows = [...byKey.values()].sort((a, b) => priority(a) - priority(b))
    rows.forEach((r) => r.items.sort((a, b) => (a.number || 0) - (b.number || 0)))
    return rows
  }, [answers])

  const orderedAnswers = useMemo(() => {
    const variantRank = (v) => {
      const x = String(v || 'STANDARD').toUpperCase()
      if (x === 'EASY') return 0
      if (x === 'MEDIUM') return 1
      if (x === 'HARD') return 2
      return 0
    }
    return [...answers].sort((a, b) => {
      const secA = a.section === 'ENGLISH' ? 0 : 1
      const secB = b.section === 'ENGLISH' ? 0 : 1
      if (secA !== secB) return secA - secB
      const modA = Number(a.module || 1)
      const modB = Number(b.module || 1)
      if (modA !== modB) return modA - modB
      if (modA === 2 && modB === 2) {
        const vr = variantRank(a.module_variant) - variantRank(b.module_variant)
        if (vr !== 0) return vr
      }
      return Number(a.number || 0) - Number(b.number || 0)
    })
  }, [answers])

  const topicBreakdown = useMemo(() => {
    const buildSection = (section, catDefs) => {
      const sectionAnswers = answers.filter((a) => a.section === section)
      // Build map: category → { correct, total, topics: Map<topic,{correct,total}> }
      const byCat = {}
      catDefs.forEach((c) => { byCat[c.key] = { correct: 0, total: 0, topics: {} } })

      sectionAnswers.forEach((a) => {
        const cat = a.category || ''
        const topic = a.topic || ''
        // put uncategorized under first category key as '' bucket
        const bucket = byCat[cat] ? cat : ''
        if (!byCat[bucket]) byCat[bucket] = { correct: 0, total: 0, topics: {} }
        const cb = byCat[bucket]
        cb.total += 1
        if (a.is_correct) cb.correct += 1
        if (topic) {
          if (!cb.topics[topic]) cb.topics[topic] = { correct: 0, total: 0 }
          cb.topics[topic].total += 1
          if (a.is_correct) cb.topics[topic].correct += 1
        }
      })

      return catDefs.map((c) => {
        const cb = byCat[c.key] || { correct: 0, total: 0, topics: {} }
        return {
          ...c,
          correct: cb.correct,
          total: cb.total,
          topics: Object.entries(cb.topics)
            .map(([topic, s]) => ({ topic, ...s }))
            .sort((a, b) => b.total - a.total),
        }
      })
    }
    return {
      english: buildSection('ENGLISH', ENG_CATEGORIES),
      math: buildSection('MATH', MATH_CATEGORIES),
    }
  }, [answers])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="font-semibold">Result not found</p>
        <Link to="/app/sat" className="text-sky-500 text-sm mt-2 inline-block">Back to SAT</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/app/sat/tests" className="p-2 rounded-xl hover:bg-sky-50 text-gray-400 hover:text-sky-500 transition">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black">Test Results</h1>
          <p className="text-gray-500 text-sm">{result.test}</p>
        </div>
      </div>

      {/* Score Overview */}
      <div className="space-y-3">
        <h2 className="text-xl font-black">Score Overview</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-center text-gray-500 text-xs font-semibold">Your Total Score</div>
            <div className="mt-2 text-center text-5xl font-black text-gray-900 tabular-nums">{result.total_score}</div>
            <div className="mt-1 text-center text-lg text-gray-500">400-1600</div>
            <div className="my-4 h-px bg-gray-200" />
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <BookOpen size={13} className="text-gray-500" /> Reading & Writing
                </div>
                <div className="text-3xl font-black tabular-nums text-gray-900">{result.english_score}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                  <Calculator size={13} className="text-gray-500" /> Math
                </div>
                <div className="text-3xl font-black tabular-nums text-gray-900">{result.math_score}</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-semibold text-gray-500">Score Comparison Data</div>
            {bestOverallScore > 0 ? (
              <>
                <div className="mt-4 text-gray-500 text-xs">Your Highest SAT Score</div>
                <div className="mt-1 text-5xl font-black tabular-nums text-gray-900">{bestOverallScore}</div>
                <div className="mt-1 text-lg text-gray-500">400-1600</div>
              </>
            ) : (
              <div className="mt-4 text-sm text-gray-400">Score comparison data not available</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
          {moduleRows.map((m) => (
            <div key={m.key} className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${m.isOmittedModule ? 'border-gray-200 bg-gray-50/80 opacity-80' : 'border-gray-100 bg-white/80'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">{m.sectionLabel} - {m.moduleLabel}</div>
                {m.isOmittedModule && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    <MinusCircle size={11} /> Not Taken
                  </span>
                )}
              </div>
              <div className="text-sm sm:text-base mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                {m.isOmittedModule ? (
                  <span className="text-gray-400 font-medium italic">This module was not attempted — all questions are omitted.</span>
                ) : (
                  <>
                    <span className="text-emerald-800 font-semibold">{m.correct} correct</span>
                    <span className="text-rose-800 font-semibold">{m.wrong} incorrect</span>
                    <span className="text-gray-500 font-medium">{m.omitted} omitted</span>
                  </>
                )}
              </div>
              <div className="mt-4 grid grid-cols-8 sm:grid-cols-10 md:grid-cols-11 gap-2 sm:gap-2.5">
                {m.items.map((q) => (
                  <button
                    type="button"
                    key={`${m.key}-${q.number}`}
                    onClick={() => setActiveAnswerIndex(orderedAnswers.findIndex((a) => a === q.answer))}
                    className={`group relative aspect-square min-h-[2rem] w-full max-w-[2.25rem] sm:max-w-[2.5rem] rounded-lg border-2 transition-all duration-150 hover:scale-105 hover:z-10 ${
                      q.state === 'correct'
                        ? 'bg-emerald-600 border-emerald-700'
                        : q.state === 'wrong'
                          ? 'bg-rose-600 border-rose-700'
                          : 'bg-white border-gray-200'
                    }`}
                  >
                    <span className="pointer-events-none absolute -top-14 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:-top-16 group-hover:opacity-100">
                      Question {q.number}: {q.state === 'correct' ? 'Correct' : q.state === 'wrong' ? 'Incorrect' : 'Omitted'}
                    </span>
                    <span className="pointer-events-none absolute -top-2 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-black opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Topic Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Reading & Writing */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={18} className="text-sky-500 shrink-0" />
              <h3 className="text-lg font-black text-gray-900">Reading &amp; Writing</h3>
            </div>
            <div className="space-y-6">
              {topicBreakdown.english.map((cat) => (
                <CategoryRow key={cat.key} catDef={cat} stats={cat} />
              ))}
            </div>
          </div>
          {/* Math */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <Calculator size={18} className="text-amber-500 shrink-0" />
              <h3 className="text-lg font-black text-gray-900">Math</h3>
            </div>
            <div className="space-y-6">
              {topicBreakdown.math.map((cat) => (
                <CategoryRow key={cat.key} catDef={cat} stats={cat} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Back button */}
      <div className="pb-6">
        <Link
          to="/app/sat"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-sky-200 text-sky-600 font-bold text-sm hover:bg-sky-50 transition"
        >
          <ChevronLeft size={16} /> Back to SAT Dashboard
        </Link>
      </div>

      <AnimatePresence>
        {activeAnswerIndex != null && orderedAnswers[activeAnswerIndex] && (
          <QuestionPreviewModal
            ans={orderedAnswers[activeAnswerIndex]}
            currentIndex={activeAnswerIndex}
            total={orderedAnswers.length}
            onPrev={() => setActiveAnswerIndex((v) => Math.max(0, v - 1))}
            onNext={() => setActiveAnswerIndex((v) => Math.min(orderedAnswers.length - 1, v + 1))}
            onClose={() => setActiveAnswerIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ReviewExamQuestionHeader({ number, section, bookmarked, split }) {
  const tag = section === 'MATH' ? 'MATH' : 'RW'
  if (split) {
    return (
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 border-2 border-gray-700 text-gray-900 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
          {number}
        </span>
        <span className={`text-[12px] font-medium flex items-center gap-1.5 select-none ${bookmarked ? 'text-gray-900' : 'text-gray-500'}`}>
          <Flag size={14} className={bookmarked ? 'text-red-600 fill-red-600' : 'text-gray-500'} />
          Mark for Review
        </span>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[10px] font-bold px-2 py-0.5 bg-[#1a5dc8] text-white rounded-sm tracking-wide">{tag}</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
      <span className="w-7 h-7 border-2 border-gray-700 text-gray-800 text-[12px] font-bold flex items-center justify-center flex-shrink-0">
        {number}
      </span>
      <span className={`text-[12px] font-semibold flex items-center gap-1.5 ${bookmarked ? 'text-gray-900' : 'text-gray-500'}`}>
        <span className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center flex-shrink-0 transition-colors ${
          bookmarked ? 'border-gray-900 bg-gray-900' : 'border-gray-400'
        }`}>
          {bookmarked && <span className="text-white text-[8px] font-black leading-none">✓</span>}
        </span>
        Mark for Review
        {bookmarked && <Flag size={12} className="text-red-500 fill-red-500" />}
      </span>
    </div>
  )
}

function ReviewExamInputAnswer({ userAnswer, correctAnswer, isCorrect }) {
  const hasUser = userAnswer != null && String(userAnswer).trim() !== ''
  const wrong = hasUser && !isCorrect
  const showCorrectRow = !isCorrect && correctAnswer != null && String(correctAnswer).trim() !== ''

  const inputCls = isCorrect
    ? 'bg-emerald-50/90 ring-1 ring-emerald-200/90 text-gray-900'
    : wrong
      ? 'bg-rose-50/90 ring-1 ring-rose-200/90 text-gray-900'
      : 'bg-gray-100 text-gray-900 ring-0'

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          readOnly
          value={hasUser ? String(userAnswer) : ''}
          className={`min-w-0 flex-1 max-w-2xl rounded-full border-0 py-3 pl-6 pr-6 text-[15px] font-medium outline-none cursor-default transition-shadow duration-200 ${inputCls}`}
          placeholder="Answer..."
        />
        {isCorrect && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-white shadow-sm" title="Correct">
            <CheckCircle2 size={20} strokeWidth={2.5} />
          </span>
        )}
        {wrong && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-400 text-white shadow-sm" title="Incorrect">
            <XCircle size={20} strokeWidth={2.5} />
          </span>
        )}
      </div>
      {showCorrectRow && (
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800/90 ring-1 ring-emerald-100 w-fit max-w-full">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span className="font-semibold">Correct</span>
          <span className="font-bold tabular-nums">{String(correctAnswer)}</span>
        </div>
      )}
    </div>
  )
}

function ReviewExamMCQChoices({ choices, userAnswer, correctAnswer }) {
  if (!choices?.length) return null
  const user = userAnswer != null ? String(userAnswer).trim() : ''
  const correct = correctAnswer != null ? String(correctAnswer).trim() : ''

  return (
    <div className="mt-4 space-y-2.5">
      {choices.map((choice) => {
        const opt = String(choice.option)
        const isCorrectOption = !!correct && opt === correct
        const isWrongPick = !!user && opt === user && opt !== correct

        let rowCls = 'border border-gray-200 bg-white'
        let letterCls = 'border border-gray-200 bg-white text-gray-900'

        if (isCorrectOption) {
          rowCls = 'border border-emerald-200 bg-emerald-50/90'
          letterCls = 'border border-emerald-300 bg-emerald-400 text-white shadow-sm'
        } else if (isWrongPick) {
          rowCls = 'border border-rose-200 bg-rose-50/90'
          letterCls = 'border border-rose-300 bg-rose-400 text-white shadow-sm'
        }

        return (
          <div key={choice.option} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowCls}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${letterCls}`}>
              {choice.option}
            </span>
            <span className="relative min-w-0 flex-1 text-[14px] leading-[1.5] font-medium text-gray-900 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_p]:mb-1 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5">
              {choice.image && (
                <img
                  src={choice.image}
                  alt={`Choice ${choice.option}`}
                  className="mb-1 max-h-20 rounded object-contain"
                />
              )}
              {choice.text && (
                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(choice.text)) }} />
              )}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              {isCorrectOption && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-white shadow-sm">
                  <CheckCircle2 size={15} strokeWidth={2.5} />
                </span>
              )}
              {isWrongPick && (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-400 text-white shadow-sm">
                  <XCircle size={15} strokeWidth={2.5} />
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionPreviewModal({ ans, currentIndex, total, onPrev, onNext, onClose }) {
  const status = !ans.user_answer ? 'Omitted' : ans.is_correct ? 'Correct' : 'Incorrect'
  const statusCls = !ans.user_answer
    ? 'bg-gray-100 text-gray-600'
    : ans.is_correct
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-600'

  const qType = ans.question_type || (ans.choices?.length ? 'MCQ' : 'INPUT')
  const isEnglish = ans.section === 'ENGLISH'
  const hasPassage = !!ans.passage
  const hasTable = Array.isArray(ans.table_data) && ans.table_data.length > 0
  const hasImage = !!ans.image
  const isSplit = isEnglish && hasPassage

  const questionBody = (
    <>
      {ans.math_equation && (
        /^(https?:\/\/|\/media\/|\/static\/)/.test(ans.math_equation)
          ? <div className="flex justify-center mb-3">
              <img src={ans.math_equation} alt="equation" className="max-h-56 max-w-full object-contain border border-gray-100 rounded" />
            </div>
          : <div
              className="text-center text-[15px] text-gray-900 mb-3"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(ans.math_equation)) }}
            />
      )}
      <div
        className="text-gray-900 leading-[1.65] text-[15px] font-medium
          [&_p]:mb-2 [&_p:last-child]:mb-0
          [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:my-1
          [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:my-1
          [&_li]:my-0.5
          [&_u]:underline [&_b]:font-bold [&_strong]:font-bold
          [&_i]:italic [&_em]:italic"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(ans.content)) }}
      />
      {qType === 'MCQ' && (
        <ReviewExamMCQChoices
          choices={ans.choices}
          userAnswer={ans.user_answer}
          correctAnswer={ans.correct_answer}
        />
      )}
      {qType === 'INPUT' && (
        <ReviewExamInputAnswer
          userAnswer={ans.user_answer}
          correctAnswer={ans.correct_answer}
          isCorrect={!!ans.is_correct}
        />
      )}
    </>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/40 p-4 sm:p-6 lg:p-10"
      onMouseDown={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ duration: 0.16 }}
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">
              {ans.section === 'ENGLISH' ? 'Reading & Writing' : 'Math'} - Module {ans.module} - Question {ans.number}
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${statusCls}`}>
              {status === 'Omitted' && <MinusCircle size={12} className="opacity-70" />}
              {status === 'Correct' && <CheckCircle2 size={12} className="opacity-90" />}
              {status === 'Incorrect' && <XCircle size={12} className="opacity-90" />}
              {status}
            </span>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.985 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="px-4 py-4 sm:px-7 sm:py-5 text-[15px]"
            >
              {isSplit ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:divide-x md:divide-gray-200">
                  <div className="min-h-0 max-h-[min(62vh,560px)] overflow-y-auto pr-0 md:pr-6 space-y-3">
                    {hasPassage && (
                      <div
                        className="text-[14px] leading-[1.75] text-gray-800 font-serif selection:bg-yellow-200
                          [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic
                          [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:text-sm
                          [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_th]:text-left
                          [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-2
                          [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-1"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(ans.passage)) }}
                      />
                    )}
                    {hasTable && <TableViewResult tableData={ans.table_data} />}
                    {hasImage && (
                      <img src={ans.image} alt="" className="rounded-lg border border-gray-200 max-w-full object-contain" />
                    )}
                  </div>
                  <div className="min-w-0 md:pl-2">
                    <ReviewExamQuestionHeader
                      number={ans.number}
                      section={ans.section}
                      bookmarked={!!ans.is_bookmarked}
                      split
                    />
                    {questionBody}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl">
                  <ReviewExamQuestionHeader
                    number={ans.number}
                    section={ans.section}
                    bookmarked={!!ans.is_bookmarked}
                    split={false}
                  />
                  {!isSplit && hasPassage && (
                    <div
                      className="mb-4 text-[14px] leading-[1.75] text-gray-800 font-serif
                        [&_p]:mb-3 [&_ul]:ml-5 [&_ul]:list-disc"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(ans.passage)) }}
                    />
                  )}
                  {hasTable && <TableViewResult tableData={ans.table_data} />}
                  {hasImage && (
                    <img src={ans.image} alt="" className="mb-4 rounded-lg border border-gray-200 max-h-44 object-contain" />
                  )}
                  {questionBody}
                </div>
              )}

              {ans.explanation && (
                <div className="mt-6 rounded-xl border border-violet-200/80 bg-violet-50/90 p-3.5 text-[13px] leading-relaxed text-violet-900">
                  <span className="font-semibold">Explanation: </span>
                  <LatexText text={ans.explanation} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-gray-500">{currentIndex + 1} of {total}</span>
            {ans.time_spent > 0 && (
              <span className="text-[11px] text-gray-400">
                {ans.time_spent >= 60
                  ? `${Math.floor(ans.time_spent / 60)}m ${ans.time_spent % 60}s`
                  : `${ans.time_spent}s`} spent
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              disabled={currentIndex <= 0}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={currentIndex >= total - 1}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all duration-150 hover:bg-gray-50 hover:scale-[1.02] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              Next
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}


