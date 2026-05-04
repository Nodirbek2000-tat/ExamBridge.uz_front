import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen,
  Plus,
  Upload,
  X,
  AlertCircle,
  FileJson,
  Filter,
  Crown,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  Loader2,
  FileText,
  Check,
  Globe,
  Lock,
  Unlock,
  ChevronRight,
  Code2,
  ClipboardPaste,
  CheckCircle2,
  Hash,
  Layers,
} from 'lucide-react'
import api from '../../api/client'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

/* ─── Animation variants ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.04, ease: 'easeOut' },
  }),
}

/* ─── JSON format example ─────────────────────────────────────── */
const SAT_JSON_EXAMPLE = `{
  "test_id": 1,
  "section": "MATH",
  "module_number": 1,
  "questions": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "Question text (supports HTML)",
      "passage": "Optional reading passage",
      "correct_answer": "A",
      "difficulty": "EASY",
      "explanation": "Why A is correct",
      "choices": [
        {"option": "A", "text": "4"},
        {"option": "B", "text": "5"},
        {"option": "C", "text": "3"},
        {"option": "D", "text": "7"}
      ]
    }
  ]
}`

/* ─── Shared UI helpers ───────────────────────────────────────── */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function Select({ value, onChange, className = '', children, ...rest }) {
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={onChange}
        className={`appearance-none bg-white border border-gray-200 rounded-xl text-sm text-gray-700 pr-8 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition cursor-pointer ${className}`}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

function TabButton({ active, onClick, children, count }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
        active
          ? 'bg-sky-500 text-white shadow-sm'
          : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-bold leading-none ${
            active ? 'bg-white/25 text-white' : 'bg-sky-100 text-sky-600'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function Badge({ variant, children }) {
  const styles = {
    premium: 'bg-slate-100 text-slate-700',
    free: 'bg-gray-100 text-gray-500',
    active: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-400',
    mcq: 'bg-blue-100 text-blue-700',
    input: 'bg-purple-100 text-purple-700',
    easy: 'bg-emerald-100 text-emerald-700',
    medium: 'bg-slate-100 text-slate-700',
    hard: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${styles[variant] ?? 'bg-gray-100 text-gray-600'}`}>
      {children}
    </span>
  )
}

function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1.5">{children}</label>
}

function FieldInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition ${className}`}
      {...props}
    />
  )
}

function ErrorBanner({ msg }) {
  return (
    <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
      <AlertCircle size={15} className="flex-shrink-0" />
      {msg}
    </div>
  )
}

function TableSkeleton({ rows = 4, cols = 6 }) {
  return (
    <div className="p-5 space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {[...Array(cols)].map((__, j) => (
            <div
              key={j}
              className="h-3.5 bg-gray-100 rounded animate-pulse"
              style={{ width: `${[160, 60, 70, 70, 80, 70][j] ?? 80}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 1 — TESTS
═══════════════════════════════════════════════════════════════ */

function AddTestModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    year: new Date().getFullYear(),
    month: 1,
    form: 'A',
    test_type: 'SAT',
    is_international: false,
    is_premium: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/import/sat/test/', form)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create test.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <Plus size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Add SAT Test</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handle} className="p-5 space-y-4">
          {error && <ErrorBanner msg={error} />}

          {/* Year */}
          <div>
            <FieldLabel>Year</FieldLabel>
            <FieldInput
              type="number"
              min="2000"
              max="2099"
              value={form.year}
              onChange={(e) => set('year', parseInt(e.target.value, 10))}
              placeholder="2024"
              required
            />
          </div>

          {/* Month */}
          <div>
            <FieldLabel>Month</FieldLabel>
            <div className="relative">
              <select
                value={form.month}
                onChange={(e) => set('month', parseInt(e.target.value, 10))}
                className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition pr-9"
                required
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Form */}
          <div>
            <FieldLabel>Form</FieldLabel>
            <div className="relative">
              <select
                value={form.form}
                onChange={(e) => set('form', e.target.value)}
                className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition pr-9"
              >
                {['A', 'B', 'C', 'D'].map((f) => (
                  <option key={f} value={f}>Form {f}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Type */}
          <div>
            <FieldLabel>Test Type</FieldLabel>
            <div className="relative">
              <select
                value={form.test_type}
                onChange={(e) => set('test_type', e.target.value)}
                className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition pr-9"
              >
                <option value="SAT">SAT</option>
                <option value="PSAT">PSAT</option>
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-wrap gap-5 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_international}
                onChange={(e) => set('is_international', e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
              <span className="text-sm text-gray-700">International (INTL)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_premium}
                onChange={(e) => set('is_premium', e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
              <span className="text-sm text-gray-700">Premium only</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Test
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function TestsTab() {
  const [showAdd, setShowAdd] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sat-tests'],
    queryFn: () => api.get('/admin/sat/tests/').then((r) => r.data),
    staleTime: 30_000,
  })

  const patchTest = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/admin/sat/tests/${id}/`, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-sat-tests'] })
      const prev = queryClient.getQueryData(['admin-sat-tests'])
      queryClient.setQueryData(['admin-sat-tests'], (old) => {
        if (!old) return old
        const mapper = (t) => (t.id === id ? { ...t, ...patch } : t)
        return Array.isArray(old) ? old.map(mapper) : { ...old, results: old.results?.map(mapper) }
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['admin-sat-tests'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-sat-tests'] }),
  })

  const tests = Array.isArray(data) ? data : (data?.results ?? [])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {!isLoading && (
            <span>
              <span className="font-semibold text-gray-800">{tests.length}</span> tests
            </span>
          )}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition shadow-glow"
        >
          <Plus size={15} />
          Add Test
        </button>
      </div>

      {/* Table card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden"
      >
        {error ? (
          <div className="p-8 flex items-center gap-3 text-red-600">
            <AlertCircle size={16} />
            <span className="text-sm">Failed to load tests: {error.message}</span>
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={4} cols={8} />
        ) : !tests.length ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
              <BookOpen size={28} className="text-sky-200" />
            </div>
            <p className="text-sm text-gray-400 font-medium">No SAT tests added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gradient-to-r from-sky-50/60 to-slate-50/40 border-b border-sky-100/50">
                  {['Test', 'Year', 'Month', 'Form', 'Region', 'Plan', 'Sections', 'Active', 'Premium'].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tests.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="hover:bg-sky-50/20 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-semibold text-gray-800 max-w-[180px] truncate">
                      {t.name || t.title || `${t.test_type ?? 'SAT'} ${t.year}`}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.year ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">
                      {t.month ? MONTHS[t.month - 1] ?? t.month : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.form ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Globe size={11} />
                        {t.is_international ? 'INTL' : 'US'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {t.is_premium ? (
                        <Badge variant="premium"><Crown size={9} /> Premium</Badge>
                      ) : (
                        <Badge variant="free">Free</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 font-medium">
                      {t.sections_count ?? t.section_count ?? '—'}
                    </td>
                    {/* Active toggle */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => patchTest.mutate({ id: t.id, patch: { is_active: !t.is_active } })}
                        title={t.is_active ? 'Deactivate' : 'Activate'}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        {t.is_active
                          ? <ToggleRight size={24} className="text-sky-500" />
                          : <ToggleLeft size={24} className="text-gray-300" />
                        }
                      </button>
                    </td>
                    {/* Premium toggle */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => patchTest.mutate({ id: t.id, patch: { is_premium: !t.is_premium } })}
                        title={t.is_premium ? 'Make free' : 'Make premium'}
                        className="transition-transform hover:scale-110 active:scale-95"
                      >
                        {t.is_premium
                          ? <Lock size={16} className="text-slate-500" />
                          : <Unlock size={16} className="text-gray-300 hover:text-slate-400" />
                        }
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showAdd && (
          <AddTestModal
            onClose={() => setShowAdd(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-sat-tests'] })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 2 — QUESTIONS
═══════════════════════════════════════════════════════════════ */

const DIFF_VARIANT = { EASY: 'easy', MEDIUM: 'medium', HARD: 'hard' }
const TYPE_VARIANT = { MCQ: 'mcq', INPUT: 'input', GRID_IN: 'input' }

function QuestionRow({ q, expanded, onToggle }) {
  return (
    <>
      <tr
        className="hover:bg-sky-50/20 transition-colors cursor-pointer select-none"
        onClick={onToggle}
      >
        <td className="px-4 py-3.5 font-bold text-gray-700">#{q.number ?? q.id}</td>
        <td className="px-4 py-3.5">
          <Badge variant={TYPE_VARIANT[q.question_type] ?? 'mcq'}>{q.question_type}</Badge>
        </td>
        <td className="px-4 py-3.5">
          <Badge variant={DIFF_VARIANT[q.difficulty] ?? 'medium'}>{q.difficulty}</Badge>
        </td>
        <td className="px-4 py-3.5 text-gray-600 max-w-[320px]">
          <p className="truncate text-xs leading-relaxed">
            {q.content?.replace(/<[^>]+>/g, '').slice(0, 80) ?? '—'}
            {(q.content?.length ?? 0) > 80 ? '…' : ''}
          </p>
        </td>
        <td className="px-4 py-3.5 text-gray-500 text-xs">{q.choices?.length ?? 0}</td>
        <td className="px-4 py-3.5">
          <ChevronRight
            size={14}
            className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />
        </td>
      </tr>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <tr>
            <td colSpan={6} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 bg-sky-50/40 border-t border-b border-sky-100/60 space-y-3">
                  {/* Content */}
                  {q.content && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Question</p>
                      <div
                        className="text-sm text-gray-800 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.content) }}
                      />
                    </div>
                  )}
                  {/* Passage */}
                  {q.passage && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Passage</p>
                      <div className="text-xs text-gray-600 leading-relaxed bg-white rounded-xl p-3 border border-gray-100 max-h-40 overflow-y-auto">
                        {q.passage}
                      </div>
                    </div>
                  )}
                  {/* Choices */}
                  {q.choices?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Choices</p>
                      <div className="flex flex-wrap gap-2">
                        {q.choices.map((c) => (
                          <span
                            key={c.option}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                              c.option === q.correct_answer
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
                                : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          >
                            <span className="font-bold">{c.option}.</span> {c.text}
                            {c.option === q.correct_answer && <Check size={11} className="text-emerald-600" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Explanation */}
                  {q.explanation && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Explanation</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  )
}

function QuestionsTab() {
  const [testId, setTestId] = useState('')
  const [section, setSection] = useState('')
  const [module, setModule] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const { data: testsData } = useQuery({
    queryKey: ['admin-sat-tests'],
    queryFn: () => api.get('/admin/sat/tests/').then((r) => r.data),
    staleTime: 60_000,
  })

  const shouldFetch = !!testId

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sat-questions', testId, section, module],
    queryFn: () =>
      api
        .get('/admin/sat/questions/', {
          params: {
            ...(testId && { test_id: testId }),
            ...(section && { section }),
            ...(module && { module }),
          },
        })
        .then((r) => r.data)
        .catch((err) => {
          // endpoint may not exist yet — return empty gracefully
          if (err.response?.status === 404) return []
          throw err
        }),
    enabled: shouldFetch,
    staleTime: 30_000,
  })

  const tests = Array.isArray(testsData) ? testsData : (testsData?.results ?? [])
  const questions = Array.isArray(data) ? data : (data?.results ?? [])

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center gap-3">
        {/* Test dropdown */}
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <Select
            value={testId}
            onChange={(e) => { setTestId(e.target.value); setExpandedId(null) }}
            className="pl-8 py-2.5 min-w-[200px]"
          >
            <option value="">Select a test…</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.title || `${t.test_type ?? 'SAT'} ${t.year} ${MONTHS[(t.month ?? 1) - 1] ?? ''}`}
              </option>
            ))}
          </Select>
        </div>

        {/* Section */}
        <Select
          value={section}
          onChange={(e) => { setSection(e.target.value); setExpandedId(null) }}
          className="py-2.5 px-3"
          disabled={!testId}
        >
          <option value="">All Sections</option>
          <option value="MATH">Math</option>
          <option value="ENGLISH">English</option>
        </Select>

        {/* Module */}
        <Select
          value={module}
          onChange={(e) => { setModule(e.target.value); setExpandedId(null) }}
          className="py-2.5 px-3"
          disabled={!testId}
        >
          <option value="">All Modules</option>
          <option value="1">Module 1</option>
          <option value="2">Module 2</option>
        </Select>

        {testId && (
          <span className="text-xs text-gray-400 ml-auto">
            {isLoading ? 'Loading…' : `${questions.length} question${questions.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </motion.div>

      {/* Table card */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden"
      >
        {!testId ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
              <Layers size={28} className="text-sky-200" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Select a test to view questions</p>
            <p className="text-xs text-gray-400">Choose a test from the dropdown above</p>
          </div>
        ) : error ? (
          <div className="p-8 flex items-center gap-3 text-red-600">
            <AlertCircle size={16} />
            <span className="text-sm">Failed to load questions: {error.message}</span>
          </div>
        ) : isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : !questions.length ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
              <FileText size={28} className="text-sky-200" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No questions found</p>
            <p className="text-xs text-gray-400">Try changing the filters or import questions via the Import tab</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-gradient-to-r from-sky-50/60 to-slate-50/40 border-b border-sky-100/50">
                  {['Q#', 'Type', 'Difficulty', 'Content Preview', 'Choices', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {questions.map((q) => (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    expanded={expandedId === q.id}
                    onToggle={() => toggleExpand(q.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 3 — IMPORT JSON
═══════════════════════════════════════════════════════════════ */

function ImportTab() {
  const [json, setJson] = useState('')
  const [parseError, setParseError] = useState('')
  const [status, setStatus] = useState(null) // { ok, msg }
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  // controlled selectors (the right panel)
  const [testId, setTestId] = useState('')
  const [section, setSection] = useState('MATH')
  const [moduleNum, setModuleNum] = useState('1')

  const { data: testsData } = useQuery({
    queryKey: ['admin-sat-tests'],
    queryFn: () => api.get('/admin/sat/tests/').then((r) => r.data),
    staleTime: 60_000,
  })
  const tests = Array.isArray(testsData) ? testsData : (testsData?.results ?? [])

  /* validate on change */
  const handleJsonChange = (val) => {
    setJson(val)
    setStatus(null)
    if (!val.trim()) { setParseError(''); return }
    try {
      JSON.parse(val)
      setParseError('')
    } catch (e) {
      setParseError(e.message)
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => handleJsonChange(ev.target.result)
    reader.readAsText(file)
    // reset input so same file can be re-uploaded
    e.target.value = ''
  }

  const handleImport = async () => {
    setStatus(null)
    let parsed
    try {
      parsed = JSON.parse(json)
    } catch (e) {
      setParseError(e.message)
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/import/sat/questions/', parsed)
      const count = res.data?.count ?? res.data?.imported ?? (Array.isArray(parsed?.questions) ? parsed.questions.length : '?')
      setStatus({ ok: true, msg: `Successfully imported ${count} question${count !== 1 ? 's' : ''}!` })
      setJson('')
    } catch (err) {
      const msg = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Import failed.'
      setStatus({ ok: false, msg })
    } finally {
      setLoading(false)
    }
  }

  const isValid = json.trim() && !parseError

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Left: format reference ── */}
        <div className="bg-gray-950 rounded-2xl overflow-hidden shadow-card border border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-slate-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Code2 size={13} className="text-gray-500" />
              <span className="text-xs font-mono text-gray-500">questions_format.json</span>
            </div>
          </div>
          <div className="p-4 overflow-auto max-h-[520px]">
            <pre className="text-xs font-mono leading-relaxed text-gray-300 whitespace-pre">
              {/* syntax-ish coloring via spans */}
              {SAT_JSON_EXAMPLE.split('\n').map((line, i) => {
                const colored = line
                  .replace(/"([^"]+)":/g, '<span class="text-sky-400">"$1"</span>:')
                  .replace(/: "([^"]+)"/g, ': <span class="text-emerald-400">"$1"</span>')
                  .replace(/: (\d+)/g, ': <span class="text-slate-400">$1</span>')
                  .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
                return (
                  <span key={i} dangerouslySetInnerHTML={{ __html: sanitizeHtml(colored + '\n') }} />
                )
              })}
            </pre>
          </div>
        </div>

        {/* ── Right: upload + import ── */}
        <div className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
              <FileJson size={14} className="text-white" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm">Import Questions</h3>
          </div>

          <div className="p-5 flex flex-col gap-4 flex-1">
            {/* Selectors row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel>Test</FieldLabel>
                <div className="relative">
                  <select
                    value={testId}
                    onChange={(e) => setTestId(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition pr-8"
                  >
                    <option value="">Use JSON field</option>
                    {tests.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.title || `${t.test_type ?? 'SAT'} ${t.year}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <FieldLabel>Section</FieldLabel>
                <div className="relative">
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition pr-8"
                  >
                    <option value="MATH">Math</option>
                    <option value="ENGLISH">English</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <FieldLabel>Module</FieldLabel>
                <div className="relative">
                  <select
                    value={moduleNum}
                    onChange={(e) => setModuleNum(e.target.value)}
                    className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition pr-8"
                  >
                    <option value="1">Module 1</option>
                    <option value="2">Module 2</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex items-center justify-between mb-1">
                <FieldLabel>JSON Payload</FieldLabel>
                {json && !parseError && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Valid JSON
                  </span>
                )}
              </div>
              <textarea
                value={json}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder={`Paste JSON here…\n\nExpected keys: test_id, section, module_number, questions`}
                className={`flex-1 min-h-[200px] w-full p-3 bg-gray-50 border rounded-xl text-xs font-mono text-gray-800 placeholder-gray-400 focus:outline-none transition resize-none leading-relaxed ${
                  parseError
                    ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'
                }`}
              />
              {parseError && (
                <p className="text-xs text-red-600 flex items-start gap-1.5 mt-1">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span className="font-mono break-all">{parseError}</span>
                </p>
              )}
            </div>

            {/* File upload */}
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition"
            >
              <Upload size={15} />
              Upload .json file
            </button>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />

            {/* Status toast */}
            <AnimatePresence>
              {status && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm font-medium ${
                    status.ok
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {status.ok
                    ? <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" />
                    : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  }
                  {status.msg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Import button */}
            <button
              onClick={handleImport}
              disabled={loading || !isValid}
              className="w-full py-3 gradient-primary text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-glow"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ClipboardPaste size={15} />
              )}
              {loading ? 'Importing…' : 'Import Questions'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   TAB 4 — BANK QUESTIONS (Practice Question Bank)
═══════════════════════════════════════════════════════════════ */

const BANK_SUBJECTS = [
  { value: '', label: 'All Subjects' },
  { value: 'Matematika', label: 'Math' },
  { value: 'Ingliz tili', label: 'English' },
]

const BANK_CATEGORIES = {
  Matematika: [
    { value: '', label: 'All Categories' },
    { value: 'algebra', label: 'Algebra' },
    { value: 'advanced_math', label: 'Advanced Math' },
    { value: 'problem_data', label: 'Problem-Solving & Data Analysis' },
    { value: 'geometry', label: 'Geometry & Trigonometry' },
  ],
  'Ingliz tili': [
    { value: '', label: 'All Categories' },
    { value: 'craft_structure', label: 'Craft & Structure' },
    { value: 'expression_ideas', label: 'Expression of Ideas' },
    { value: 'info_ideas', label: 'Information & Ideas' },
    { value: 'standard_english', label: 'Standard English Conventions' },
  ],
}

function BankQuestionEditModal({ question, onClose, onSave }) {
  const [form, setForm] = useState({
    subject: question?.subject || 'Matematika',
    category: question?.category || '',
    question_type: question?.question_type || 'MCQ',
    topic: question?.topic || '',
    content: question?.content || '',
    difficulty: question?.difficulty || 'medium',
    choice_a: question?.choice_a || '',
    choice_b: question?.choice_b || '',
    choice_c: question?.choice_c || '',
    choice_d: question?.choice_d || '',
    correct_answer: question?.correct_answer || '',
    explanation: question?.explanation || '',
    year: question?.year || '',
    source: question?.source || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const categories = BANK_CATEGORIES[form.subject] || []

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (question?.id) {
        await api.put(`/admin/sat/bank-questions/${question.id}/`, form)
      } else {
        await api.post('/admin/sat/bank-questions/create/', form)
      }
      onSave()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to save.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900 text-sm">
            {question?.id ? 'Edit Bank Question' : 'Add Bank Question'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handle} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <ErrorBanner msg={error} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Subject</FieldLabel>
              <div className="relative">
                <select value={form.subject} onChange={(e) => { set('subject', e.target.value); set('category', '') }}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="Matematika">Math</option>
                  <option value="Ingliz tili">English</option>
                  <option value="Reading">Reading</option>
                  <option value="Boshqa">Other</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <div className="relative">
                <select value={form.category} onChange={(e) => set('category', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  {(categories.length > 0 ? categories : [{ value: '', label: 'No categories' }]).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Question Type</FieldLabel>
              <div className="relative">
                <select value={form.question_type} onChange={(e) => set('question_type', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="MCQ">Multiple Choice (MCQ)</option>
                  <option value="INPUT">Student Input</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <div className="relative">
                <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>Year (optional)</FieldLabel>
              <FieldInput type="number" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="2024" />
            </div>
          </div>

          <div>
            <FieldLabel>Topic</FieldLabel>
            <FieldInput value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. Linear Equations" required />
          </div>

          <div>
            <FieldLabel>Question Content (HTML/LaTeX supported)</FieldLabel>
            <textarea
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={4}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 transition resize-y"
              placeholder="Question text. Use \(...\) for inline LaTeX or \[...\] for block."
            />
          </div>

          {form.question_type === 'MCQ' && (
            <div className="grid grid-cols-2 gap-3">
              {['a', 'b', 'c', 'd'].map((l) => (
                <div key={l}>
                  <FieldLabel>Choice {l.toUpperCase()}</FieldLabel>
                  <FieldInput
                    value={form[`choice_${l}`]}
                    onChange={(e) => set(`choice_${l}`, e.target.value)}
                    placeholder={`Option ${l.toUpperCase()}`}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Correct Answer {form.question_type === 'MCQ' ? '(A/B/C/D)' : '(exact value)'}</FieldLabel>
              <FieldInput
                value={form.correct_answer}
                onChange={(e) => set('correct_answer', e.target.value)}
                placeholder={form.question_type === 'MCQ' ? 'A' : '42'}
                required
              />
            </div>
            <div>
              <FieldLabel>Source (optional)</FieldLabel>
              <FieldInput value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="SAT 2023 March" />
            </div>
          </div>

          <div>
            <FieldLabel>Explanation (optional)</FieldLabel>
            <textarea
              value={form.explanation}
              onChange={(e) => set('explanation', e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 transition resize-y"
              placeholder="Explain why the correct answer is correct..."
            />
          </div>
        </form>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">Cancel</button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-bold disabled:opacity-50 transition hover:opacity-90"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {question?.id ? 'Save Changes' : 'Create Question'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function BankQuestionsTab() {
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [qType, setQType] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)  // null=closed, {}=new, {...}=edit
  const [expandedId, setExpandedId] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bank-questions', subject, category, difficulty, qType, search, page],
    queryFn: () => api.get('/admin/sat/bank-questions/', {
      params: { subject, category, difficulty, question_type: qType, search, page, page_size: 30 },
    }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/sat/bank-questions/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bank-questions'] }),
  })

  const questions = data?.results || []
  const total = data?.total || 0
  const categories = BANK_CATEGORIES[subject] || []

  const handleSaved = () => queryClient.invalidateQueries({ queryKey: ['admin-bank-questions'] })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl p-4 border border-sky-50 shadow-card flex flex-wrap items-center gap-3"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition"
          />
        </div>

        <Select value={subject} onChange={(e) => { setSubject(e.target.value); setCategory(''); setPage(1) }} className="pl-3 py-2">
          {BANK_SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>

        {subject && (
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }} className="pl-3 py-2">
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        )}

        <Select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1) }} className="pl-3 py-2">
          <option value="">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>

        <Select value={qType} onChange={(e) => { setQType(e.target.value); setPage(1) }} className="pl-3 py-2">
          <option value="">All Types</option>
          <option value="MCQ">MCQ</option>
          <option value="INPUT">Input</option>
        </Select>

        <div className="flex-1" />

        <span className="text-xs text-gray-400 font-semibold">{total} questions</span>

        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition"
        >
          <Plus size={14} /> Add Question
        </button>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden"
      >
        {isLoading ? (
          <TableSkeleton rows={5} cols={7} />
        ) : error ? (
          <div className="p-8 flex items-center gap-3 text-red-600">
            <AlertCircle size={16} />
            <span className="text-sm">Failed to load: {error.message}</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-sky-50 flex items-center justify-center">
              <FileText size={28} className="text-sky-200" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No bank questions found</p>
            <p className="text-xs text-gray-400">Try adjusting filters or add new questions</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="bg-gradient-to-r from-sky-50/60 to-slate-50/40 border-b border-sky-100/50">
                    {['#', 'Subject', 'Category', 'Type', 'Difficulty', 'Content Preview', 'Answer', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {questions.map((q, i) => (
                    <>
                      <motion.tr
                        key={q.id}
                        custom={i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        className="hover:bg-sky-50/20 transition-colors"
                      >
                        <td className="px-4 py-3.5 text-gray-400 text-xs font-mono">#{q.id}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={q.subject === 'Matematika' ? 'mcq' : 'input'}>
                            {q.subject === 'Matematika' ? 'Math' : q.subject === 'Ingliz tili' ? 'English' : q.subject}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500 max-w-24 truncate">{q.category || '—'}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={q.question_type === 'MCQ' ? 'mcq' : 'input'}>{q.question_type}</Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={q.difficulty === 'easy' ? 'easy' : q.difficulty === 'medium' ? 'medium' : 'hard'}>
                            {q.difficulty}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-gray-700 max-w-xs">
                          <div
                            className="text-xs leading-snug line-clamp-2 cursor-pointer hover:text-sky-600"
                            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                          >
                            {q.content?.replace(/<[^>]+>/g, '').replace(/\\[^\\]+\\/g, '(math)').slice(0, 80)}
                            {q.content?.length > 80 ? '…' : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-black text-sky-600 text-sm">{q.correct_answer}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setEditing(q)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition"
                              title="Edit"
                            >
                              <Code2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete question #${q.id}?`)) deleteMutation.mutate(q.id)
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                              title="Delete"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {/* Expanded row */}
                      {expandedId === q.id && (
                        <tr key={`exp-${q.id}`}>
                          <td colSpan={8} className="px-4 pb-4 pt-2 bg-sky-50/40">
                            <div className="space-y-3 text-sm">
                              <div className="font-mono text-xs bg-white rounded-xl p-3 border border-sky-100 whitespace-pre-wrap max-h-32 overflow-y-auto text-gray-700">
                                {q.content}
                              </div>
                              {q.question_type === 'MCQ' && (
                                <div className="grid grid-cols-2 gap-2">
                                  {['a', 'b', 'c', 'd'].map((l) => q[`choice_${l}`] && (
                                    <div key={l} className={`flex gap-2 px-3 py-2 rounded-xl text-xs ${
                                      q.correct_answer?.toUpperCase() === l.toUpperCase()
                                        ? 'bg-green-100 border border-green-200 font-bold text-green-800'
                                        : 'bg-white border border-gray-100 text-gray-600'
                                    }`}>
                                      <span className="font-black">{l.toUpperCase()}</span>
                                      <span>{q[`choice_${l}`]}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {q.explanation && (
                                <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800">
                                  <strong>Explanation:</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > 30 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">Showing {(page - 1) * 30 + 1}–{Math.min(page * 30, total)} of {total}</span>
                <div className="flex gap-1.5">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:border-sky-300 disabled:opacity-40 transition"
                  >
                    Prev
                  </button>
                  <button
                    disabled={page * 30 >= total}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:border-sky-300 disabled:opacity-40 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {editing !== null && (
          <BankQuestionEditModal
            question={editing?.id ? editing : null}
            onClose={() => setEditing(null)}
            onSave={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════════ */

const TABS = [
  { key: 'tests', label: 'Tests', icon: BookOpen },
  { key: 'questions', label: 'Questions', icon: Hash },
  { key: 'bank', label: 'Bank Questions', icon: Layers },
  { key: 'import', label: 'Import', icon: FileJson },
]

export default function AdminSAT() {
  const [tab, setTab] = useState('tests')

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-2.5"
      >
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <BookOpen size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">SAT Management</h2>
          <p className="text-xs text-gray-400">Manage tests, questions, and imports</p>
        </div>
      </motion.div>

      {/* ── Tab bar ── */}
      <motion.div
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex items-center gap-1 bg-white rounded-xl p-1.5 shadow-card border border-sky-50 w-fit"
      >
        {TABS.map(({ key, label, icon: Icon }) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            <Icon size={14} />
            {label}
          </TabButton>
        ))}
      </motion.div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {tab === 'tests' && <TestsTab />}
          {tab === 'questions' && <QuestionsTab />}
          {tab === 'bank' && <BankQuestionsTab />}
          {tab === 'import' && <ImportTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


