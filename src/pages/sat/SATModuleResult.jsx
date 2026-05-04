import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft, Calendar, BookOpen, X } from 'lucide-react'
import katex from 'katex'
import api from '../../api/client'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const VARIANT_LABELS = { STANDARD: 'Standard', EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }
const VARIANT_COLORS = {
  STANDARD: 'bg-sky-100 text-sky-700',
  EASY: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD: 'bg-red-100 text-red-700',
}
const ENG_CATEGORIES = [
  { key: 'information_and_ideas', label: 'Information and Ideas', color: '#3b82f6' },
  { key: 'craft_and_structure', label: 'Craft and Structure', color: '#06b6d4' },
  { key: 'expression_of_ideas', label: 'Expression of Ideas', color: '#8b5cf6' },
  { key: 'standard_english', label: 'Standard English Conventions', color: '#f59e0b' },
]
const MATH_CATEGORIES = [
  { key: 'algebra', label: 'Algebra', color: '#f97316' },
  { key: 'advanced_math', label: 'Advanced Math', color: '#ef4444' },
  { key: 'problem_data', label: 'Problem-Solving & Data Analysis', color: '#10b981' },
  { key: 'geometry', label: 'Geometry and Trigonometry', color: '#6366f1' },
]

function renderMath(html) {
  if (!html) return ''
  let out = String(html)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }) } catch { return '[math]' }
  })
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { throwOnError: false }) } catch { return '[math]' }
  })
  return out
}

function formatCompletedOn(d) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function DonutMini({ correct, total, color, size = 72 }) {
  const pct = total > 0 ? correct / total : 0
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
      />
    </svg>
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
          className={`min-w-0 flex-1 max-w-2xl rounded-full border-0 py-3 pl-6 pr-6 text-[15px] font-medium outline-none cursor-default ${inputCls}`}
          placeholder="Answer..."
        />
        {isCorrect && <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 text-white shadow-sm"><CheckCircle2 size={20} strokeWidth={2.5} /></span>}
        {wrong && <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-400 text-white shadow-sm"><XCircle size={20} strokeWidth={2.5} /></span>}
      </div>
      {showCorrectRow && (
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800/90 ring-1 ring-emerald-100 w-fit">
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
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${letterCls}`}>{choice.option}</span>
            <span className="relative min-w-0 flex-1 text-[14px] leading-[1.5] font-medium text-gray-900 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_p]:mb-1 [&_ul]:ml-4 [&_ul]:list-disc [&_li]:my-0.5">
              {choice.image && <img src={choice.image} alt={`Choice ${choice.option}`} className="mb-1 max-h-20 rounded object-contain" />}
              {choice.text && <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(choice.text)) }} />}
            </span>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center">
              {isCorrectOption && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-white shadow-sm"><CheckCircle2 size={15} strokeWidth={2.5} /></span>}
              {isWrongPick && <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-400 text-white shadow-sm"><XCircle size={15} strokeWidth={2.5} /></span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestionPreviewModal({ ans, currentIndex, total, onPrev, onNext, onClose }) {
  const status = !ans.user_answer ? 'Omitted' : ans.is_correct ? 'Correct' : 'Incorrect'
  const statusCls = !ans.user_answer ? 'bg-gray-100 text-gray-600' : ans.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
  const qType = ans.question_type || (ans.choices?.length ? 'MCQ' : 'INPUT')
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] bg-black/40 p-4 sm:p-6 lg:p-10" onMouseDown={onClose}>
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
              {ans.section === 'MATH' ? 'Math' : 'Reading & Writing'} - Module {ans.module} - Question {ans.number ?? currentIndex + 1}
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${statusCls}`}>
              {status === 'Omitted' && <MinusCircle size={12} className="opacity-70" />}
              {status === 'Correct' && <CheckCircle2 size={12} className="opacity-90" />}
              {status === 'Incorrect' && <XCircle size={12} className="opacity-90" />}
              {status}
            </span>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 shrink-0"><X size={18} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
          <div className="text-gray-900 leading-[1.65] text-[15px] font-medium [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:ml-5 [&_ul]:list-disc [&_li]:my-0.5 [&_u]:underline [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic" dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(ans.content)) }} />
          {qType === 'MCQ' && <ReviewExamMCQChoices choices={ans.choices} userAnswer={ans.user_answer} correctAnswer={ans.correct_answer} />}
          {qType === 'INPUT' && <ReviewExamInputAnswer userAnswer={ans.user_answer} correctAnswer={ans.correct_answer} isCorrect={!!ans.is_correct} />}
        </div>
        <div className="border-t border-gray-200 px-4 py-3 sm:px-5 flex items-center justify-between gap-3">
          <button type="button" onClick={onPrev} disabled={currentIndex <= 0} className="px-3 py-1.5 rounded-lg border text-sm font-semibold disabled:opacity-50">Previous</button>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs text-gray-500">Question {currentIndex + 1} / {total}</span>
            {ans.time_spent > 0 && (
              <span className="text-[11px] text-gray-400 font-medium">
                {ans.time_spent >= 60
                  ? `${Math.floor(ans.time_spent / 60)}m ${ans.time_spent % 60}s`
                  : `${ans.time_spent}s`} spent
              </span>
            )}
          </div>
          <button type="button" onClick={onNext} disabled={currentIndex >= total - 1} className="px-3 py-1.5 rounded-lg border text-sm font-semibold disabled:opacity-50">Next</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CategoryRow({ cat }) {
  const pct = cat.total > 0 ? Math.round((cat.correct / cat.total) * 100) : 0
  return (
    <div className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-start gap-4 sm:gap-5">
        <DonutMini correct={cat.correct} total={cat.total} color={cat.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[22px] font-black text-gray-900 leading-tight">{cat.label}</div>
            <div className="text-[28px] font-black text-gray-900 tabular-nums">{cat.correct}/{cat.total}</div>
          </div>
          <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
          </div>
          <div className="mt-2 text-sm text-gray-500">{pct}% correct</div>
          {cat.topics?.length > 0 && (
            <div className="mt-4 space-y-2.5">
              {cat.topics.map((t) => {
                const tPct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0
                return (
                  <div key={t.topic} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 text-[15px] text-gray-700 leading-tight">{t.topic}</div>
                    <div className="w-28 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${tPct}%`, backgroundColor: cat.color }} />
                    </div>
                    <div className="w-12 text-right font-bold text-gray-700 tabular-nums text-[15px]">{t.correct}/{t.total}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SATModuleResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const [activeIndex, setActiveIndex] = useState(null)

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

  const { data, isLoading } = useQuery({
    queryKey: ['sat-module-result', attemptId],
    queryFn: () => api.get(`/sat/module-result/${attemptId}/`).then((r) => r.data),
  })

  const answers = data?.answers ?? []
  const mod = data?.module
  const catDefs = mod?.section === 'MATH' ? MATH_CATEGORIES : ENG_CATEGORIES

  const topicBreakdown = useMemo(() => {
    const byCat = {}
    catDefs.forEach((c) => { byCat[c.key] = { correct: 0, total: 0, topics: {} } })
    answers.forEach((a) => {
      const cat = a.category || ''
      if (!byCat[cat]) return
      byCat[cat].total += 1
      if (a.is_correct) byCat[cat].correct += 1
      if (a.topic) {
        if (!byCat[cat].topics[a.topic]) byCat[cat].topics[a.topic] = { correct: 0, total: 0 }
        byCat[cat].topics[a.topic].total += 1
        if (a.is_correct) byCat[cat].topics[a.topic].correct += 1
      }
    })
    return catDefs.map((c) => ({
      ...c,
      ...byCat[c.key],
      topics: Object.entries(byCat[c.key].topics).map(([topic, s]) => ({ topic, ...s })),
    }))
  }, [answers, catDefs])

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" /></div>
  if (!data) return null

  const { correct, total, pct, test, finished_at: finishedAt, completed_at: completedAt } = data
  const finishedOn = finishedAt || completedAt
  const diffLabel = VARIANT_LABELS[mod?.difficulty_variant] || mod?.difficulty_variant
  const diffColor = VARIANT_COLORS[mod?.difficulty_variant] || 'bg-gray-100 text-gray-600'
  const sectionLabel = mod?.section === 'MATH' ? 'Math' : 'Reading & Writing'
  const sectionShort = mod?.section === 'MATH' ? 'Math' : 'R&W'
  const headline = `${test || 'SAT'} — ${sectionShort} M${mod?.module_number ?? '?'}`
  const moduleHeading = mod?.module_number === 1 ? `${sectionLabel} — Module 1` : `${sectionLabel} — Module 2${mod?.difficulty_variant && mod.difficulty_variant !== 'STANDARD' ? ` (${diffLabel})` : ''}`
  const unansweredCount = answers.filter((a) => !a.user_answer).length
  const wrongCount = answers.filter((a) => !a.is_correct && a.user_answer).length

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="max-w-4xl mx-auto px-5 sm:px-7 py-8 space-y-6">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 max-w-3xl mx-auto w-full">
          <button onClick={() => navigate('/app/sat/tests', { replace: true })} className="flex items-center gap-1.5 text-[15px] text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex-1" />
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diffColor}`}>{diffLabel}</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 max-w-3xl mx-auto w-full">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{headline}</h1>
          {formatCompletedOn(finishedOn) && (
            <p className="flex items-center gap-2 text-sm text-gray-500"><Calendar size={14} className="text-gray-400 shrink-0" />Completed on {formatCompletedOn(finishedOn)}</p>
          )}
          <p className="text-sm sm:text-base flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-emerald-800">{correct} correct</span>
            <span className="font-semibold text-rose-800">{wrongCount} incorrect</span>
            <span className="font-medium text-gray-500">{unansweredCount} omitted</span>
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden max-w-3xl mx-auto w-full">
          <div className="px-6 pt-8 pb-6 text-center border-b border-gray-100">
            <p className="text-sm font-medium text-gray-500">Score</p>
            <p className="mt-2 text-4xl sm:text-5xl font-black tabular-nums text-gray-900 tracking-tight">{correct}/{total}</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-col items-center justify-center gap-1 py-4 text-center"><CheckCircle2 size={18} className="text-emerald-600" /><span className="text-lg font-black text-emerald-700">{correct}</span><span className="text-[11px] font-semibold text-gray-500">Correct</span></div>
            <div className="flex flex-col items-center justify-center gap-1 py-4 text-center"><XCircle size={18} className="text-red-500" /><span className="text-lg font-black text-red-600">{wrongCount}</span><span className="text-[11px] font-semibold text-gray-500">Wrong</span></div>
            <div className="flex flex-col items-center justify-center gap-1 py-4 text-center"><MinusCircle size={18} className="text-gray-400" /><span className="text-lg font-black text-gray-500">{unansweredCount}</span><span className="text-[11px] font-semibold text-gray-500">Blank</span></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4 max-w-3xl mx-auto w-full">
          <h2 className="text-lg font-black text-gray-900">{moduleHeading}</h2>
          <p className="text-sm mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-emerald-800">{correct} correct</span>
            <span className="font-semibold text-rose-800">{wrongCount} incorrect</span>
            <span className="font-medium text-gray-500">{unansweredCount} omitted</span>
          </p>
          <div className="mt-2.5 grid grid-cols-8 sm:grid-cols-10 md:grid-cols-11 gap-0.5 sm:gap-1">
            {answers.map((a, i) => {
              const state = !a.user_answer ? 'omitted' : a.is_correct ? 'correct' : 'wrong'
              return (
                <button
                  key={a.question_id ?? i}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  title={`Question ${a.number ?? i + 1}`}
                  className={`group relative aspect-square min-h-[1.65rem] w-full max-w-[1.9rem] sm:max-w-[2rem] rounded-md border-2 transition-all duration-150 hover:scale-105 hover:z-10 ${
                    state === 'correct' ? 'bg-emerald-600 border-emerald-700' : state === 'wrong' ? 'bg-rose-600 border-rose-700' : 'bg-white border-gray-200'
                  }`}
                />
              )
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-6 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-5">
            <BookOpen size={18} className="text-sky-500" />
            <h3 className="text-2xl font-black text-gray-900">{sectionLabel}</h3>
          </div>
          <div className="space-y-6">
            {topicBreakdown.map((cat) => <CategoryRow key={cat.key} cat={cat} />)}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {activeIndex != null && answers[activeIndex] && (
          <QuestionPreviewModal
            ans={answers[activeIndex]}
            currentIndex={activeIndex}
            total={answers.length}
            onPrev={() => setActiveIndex((v) => Math.max(0, v - 1))}
            onNext={() => setActiveIndex((v) => Math.min(answers.length - 1, v + 1))}
            onClose={() => setActiveIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

