import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { BookOpen, Lock, ChevronRight, Layers, LayoutGrid, ChevronDown, Trophy, BarChart3, FileText, CheckCircle2, X, Trash2, Crown } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/authStore'

export default function SATTestList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('full')
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [pickModuleForTest, setPickModuleForTest] = useState(null) // { id, title }
  const [showConfig, setShowConfig] = useState(false) // after module pick OR for full test
  const [pendingStart, setPendingStart] = useState(null) // { kind:'full'|'module', testId?, forceNew?, moduleId? }
  const [timed, setTimed] = useState(true)
  const [removedResultIds, setRemovedResultIds] = useState([])
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [removedIndividualIds, setRemovedIndividualIds] = useState([])

  const deleteMutation = useMutation({
    mutationFn: ({ kind, id }) =>
      kind === 'full'
        ? api.delete(`/sat/result/${id}/delete/`)
        : api.delete(`/sat/module-attempt/${id}/delete/`),
    onSuccess: (_, { kind, id }) => {
      if (kind === 'full') {
        setRemovedResultIds((prev) => [...prev, id])
        queryClient.invalidateQueries({ queryKey: ['sat-tests'] })
        queryClient.invalidateQueries({ queryKey: ['sat-test-results-mini'] })
      } else {
        setRemovedIndividualIds((prev) => [...prev, id])
        queryClient.invalidateQueries({ queryKey: ['sat-individual-results'] })
      }
      setDeleteTarget(null)
    },
    onError: () => setDeleteTarget(null),
  })

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['sat-tests'],
    queryFn: () => api.get('/sat/tests/').then((r) => r.data),
  })

  const startMutation = useMutation({
    mutationFn: ({ testId, forceNew, timed: timedFlag }) =>
      api
        .post(
          `/sat/tests/${testId}/start/`,
          {
            ...(forceNew ? { force_new: true } : {}),
            ...(typeof timedFlag === 'boolean' ? { timed: timedFlag } : {}),
          },
        )
        .then((r) => r.data),
    onSuccess: (data, vars) => navigate(`/exam/sat/${data.attempt_id}${vars.timed === false ? '?untimed=1' : ''}`),
  })

  const moduleStartMutation = useMutation({
    mutationFn: ({ moduleId, timed: timedFlag }) =>
      api
        .post('/sat/module/start/', { module_id: moduleId, ...(typeof timedFlag === 'boolean' ? { timed: timedFlag } : {}) })
        .then((r) => r.data),
    onSuccess: (data, vars) => navigate(`/exam/sat/${data.attempt_id}${vars.timed === false ? '?untimed=1' : ''}`),
  })

  const tabTests = tab === 'full'
    ? tests.filter((t) => t.test_mode === 'FULL' || !t.test_mode)
    : tests.filter((t) => t.test_mode === 'INDIVIDUAL')

  const yearFilteredTests = yearFilter === 'all'
    ? tabTests
    : tabTests.filter((t) => t.year === Number(yearFilter))

  const visibleTests = useMemo(() => {
    const list = monthFilter === 'all'
      ? yearFilteredTests
      : yearFilteredTests.filter((t) => String(t.month_num) === monthFilter)
    return [...list.filter(t => !t.is_premium), ...list.filter(t => t.is_premium)]
  }, [yearFilteredTests, monthFilter])

  const years = [...new Set(tabTests.map((t) => t.year))].sort((a, b) => b - a)
  const months = useMemo(() => {
    const seen = {}
    tabTests.forEach((t) => { if (t.month_num) seen[t.month_num] = t.month })
    return Object.entries(seen).sort((a, b) => Number(a[0]) - Number(b[0])).map(([num, name]) => ({ num: String(num), name }))
  }, [tabTests])

  const moduleQueries = useQueries({
    queries: visibleTests.map((test) => ({
      queryKey: ['sat-test-modules', test.id],
      queryFn: () => api.get(`/sat/tests/${test.id}/modules/`).then((r) => r.data),
      enabled: !isLoading && tab === 'individual',
      staleTime: 60_000,
    })),
  })

  const fullResultQueries = useQueries({
    queries: visibleTests.map((test) => ({
      queryKey: ['sat-test-results-mini', test.id],
      queryFn: () => api.get(`/sat/tests/${test.id}/results/`).then((r) => r.data),
      enabled: !isLoading && tab === 'full',
      staleTime: 60_000,
    })),
  })

  // Fetch individual module stats for ALL tests (not just visibleTests) so results persist across year filters
  const allIndividualQueries = useQueries({
    queries: tests.map((test) => ({
      queryKey: ['sat-individual-results', test.id],
      queryFn: () => api.get(`/sat/tests/${test.id}/individual-stats/`).then((r) => r.data),
      enabled: !isLoading,
      staleTime: 60_000,
    })),
  })

  const fullAttempts = useMemo(() => {
    if (tab !== 'full') return []
    const out = []
    visibleTests.forEach((t, i) => {
      const rows = fullResultQueries[i]?.data?.results || []
      rows.forEach((r) => out.push({ ...r, _test: t }))
    })
    return out.sort((a, b) => {
      const da = new Date(a.completed_at || 0).getTime()
      const db = new Date(b.completed_at || 0).getTime()
      return db - da
    })
  }, [tab, visibleTests, fullResultQueries])

  const visibleAttempts = useMemo(
    () => fullAttempts.filter((a) => !removedResultIds.includes(a.result_id)),
    [fullAttempts, removedResultIds],
  )

  const individualAttempts = useMemo(() => {
    const out = []
    tests.forEach((t, i) => {
      const rows = allIndividualQueries[i]?.data?.attempts || []
      rows.forEach((r) => out.push({ ...r, _test: t }))
    })
    return out
      .filter((a) => !removedIndividualIds.includes(a.attempt_id))
      .sort((a, b) => new Date(b.finished_at || 0) - new Date(a.finished_at || 0))
  }, [tab, tests, allIndividualQueries, removedIndividualIds])

  const modulesLoading =
    tab === 'individual' &&
    moduleQueries.length > 0 &&
    moduleQueries.some((q) => q.isPending)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-5rem)] -m-6 p-6 rounded-none">
      <div className="relative z-[2] max-w-7xl mx-auto pb-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pt-2">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Practice Tests
          </h1>
        </motion.div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setTab('full')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'full' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Layers size={15} />
              Full Test
            </button>
            <button
              onClick={() => setTab('individual')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === 'individual' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <LayoutGrid size={15} />
              Individual Module
            </button>
          </div>

          {tab === 'individual' && years.length > 1 && (
            <YearDropdown value={yearFilter} years={years} onChange={(v) => { setYearFilter(v); setMonthFilter('all') }} />
          )}
          {tab === 'individual' && months.length > 1 && (
            <MonthDropdown value={monthFilter} months={months} onChange={setMonthFilter} />
          )}
        </div>

        {tab === 'full' ? (
          <FullTestsList
            tests={visibleTests}
            attempts={visibleAttempts}
            individualAttempts={individualAttempts}
            user={user}
            onStartFull={(test) => {
              if (test.is_premium && !user?.is_premium) return
              setTimed(true)
              setPendingStart({ kind: 'full', testId: test.id, forceNew: test.best_score != null })
              setShowConfig(true)
            }}
            onPickModule={(test) => {
              if (test.is_premium && !user?.is_premium) return
              setPickModuleForTest({ id: test.id, title: `${test.year} · ${test.form}` })
            }}
            onViewResults={(resultId) => navigate(`/app/sat/result/${resultId}`)}
            onRequestDelete={(attempt) => setDeleteTarget(attempt)}
          />
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {visibleTests.map((test, i) => (
                <TestCard
                  key={test.id}
                  test={test}
                  idx={i}
                  tab={tab}
                  user={user}
                  modules={moduleQueries[i]?.data}
                  modulesLoading={modulesLoading}
                  onStartFull={(forceNew) => {
                    if (test.is_premium && !user?.is_premium) return
                    startMutation.mutate({ testId: test.id, forceNew })
                  }}
                  onViewResults={() => navigate(`/app/sat/tests/${test.id}/results`)}
                  loading={startMutation.isPending && startMutation.variables?.testId === test.id}
                />
              ))}
            </div>

          </div>
        )}

        {visibleTests.length === 0 && (
          <div className="text-center py-20 rounded-2xl border border-dashed border-slate-200 bg-white/80">
            <BookOpen size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="font-bold text-slate-600">No tests found</p>
          </div>
        )}
      </div>

      {/* ── Module picker modal ── */}
      <ModulePickerModal
        open={!!pickModuleForTest}
        test={pickModuleForTest}
        loading={false}
        onClose={() => setPickModuleForTest(null)}
        onContinue={(moduleId) => {
          setPickModuleForTest(null)
          setTimed(true)
          setPendingStart({ kind: 'module', moduleId })
          setShowConfig(true)
        }}
      />

      {/* ── Config modal (Timed / Untimed) ── */}
      <ConfigModal
        open={showConfig}
        timed={timed}
        setTimed={setTimed}
        loading={startMutation.isPending || moduleStartMutation.isPending}
        onClose={() => { setShowConfig(false); setPendingStart(null) }}
        onStart={() => {
          const p = pendingStart
          if (!p) return
          setShowConfig(false)
          if (p.kind === 'full') {
            startMutation.mutate({ testId: p.testId, forceNew: p.forceNew, timed })
            return
          }
          if (p.kind === 'module') {
            moduleStartMutation.mutate({ moduleId: p.moduleId, timed })
          }
        }}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title={deleteTarget?._test?.display_name || 'Attempt'}
        loading={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onDelete={() => {
          if (!deleteTarget) return
          if (deleteTarget._kind === 'individual') {
            deleteMutation.mutate({ kind: 'individual', id: deleteTarget.attempt_id })
          } else {
            deleteMutation.mutate({ kind: 'full', id: deleteTarget.result_id })
          }
        }}
      />
    </div>
  )
}

function FullTestsList({ tests, attempts, individualAttempts = [], onPickModule, onStartFull, onViewResults, onRequestDelete, user }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {tests.map((t, idx) => {
          const locked = t.is_premium && !user?.is_premium
          return (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 ${idx !== tests.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <div className="min-w-0 flex items-center gap-2">
                {locked && <Lock size={14} className="text-amber-500 flex-shrink-0" />}
                <div>
                  <div className="truncate text-[18px] font-semibold text-gray-900">
                    {t.display_name || `${t.year} ${t.form}`}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400 flex items-center gap-2">
                    {t.year} · {t.form}
                    {locked && <span className="text-amber-600 font-bold">Premium</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {locked ? (
                  <Link
                    to="/app/subscription"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-600 text-xs font-semibold whitespace-nowrap transition-colors hover:bg-sky-100 hover:border-sky-300"
                  >
                    <Lock size={10} /> Premium
                  </Link>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onPickModule(t)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Individual Module
                    </button>
                    <button
                      type="button"
                      onClick={() => onStartFull(t)}
                      className="rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-200"
                    >
                      Full Test
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {attempts.length > 0 && (
        <div className="px-1 pt-6 sm:px-2">
          <div className="mb-3 text-[22px] font-bold text-gray-800">Full Test Results</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {attempts.map((a) => (
                <motion.div
                  key={`${a._test.id}-${a.result_id}`}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="group rounded-2xl border-2 border-gray-300 bg-white shadow-sm p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {(a._test.display_name || `${a._test.year} ${a._test.form}`)}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {a.completed_at
                          ? new Date(a.completed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                          : 'Attempt'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRequestDelete(a)}
                      className="rounded-md p-1 text-rose-500 opacity-0 transition-opacity hover:bg-rose-50 group-hover:opacity-100"
                      title="Delete result"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="text-center py-4">
                    <div className="text-xs text-gray-400 font-medium">Total Score</div>
                    <div className="text-5xl font-bold text-gray-900 tabular-nums mt-1">{a.total_score}</div>
                    <div className="text-[10px] text-gray-400 mt-1">400 – 1600</div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold text-gray-700">Reading and Writing</div>
                      <div className="text-right">
                        <div className="text-3xl font-semibold text-gray-900 tabular-nums">{a.english_score ?? '—'}</div>
                        <div className="text-xs text-gray-500">200 – 800</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold text-gray-700">Math</div>
                      <div className="text-right">
                        <div className="text-3xl font-semibold text-gray-900 tabular-nums">{a.math_score ?? '—'}</div>
                        <div className="text-xs text-gray-500">200 – 800</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewResults(a.result_id)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-sky-100 text-sky-700 font-semibold hover:bg-sky-200 transition-colors"
                  >
                    Score Details
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {individualAttempts.length > 0 && (
        <div className="px-1 pt-2 sm:px-2">
          <div className="mb-3 text-[22px] font-bold text-gray-800">Individual Module Results</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {individualAttempts.map((a) => (
                <IndividualResultCard
                  key={`individual-${a.attempt_id}`}
                  attempt={a}
                  onView={() => navigate(`/app/sat/module-result/${a.attempt_id}`)}
                  onDelete={() => onRequestDelete({ ...a, _kind: 'individual' })}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

    </div>
  )
}

const MODULE_LABEL = {
  ENGLISH_M1: 'Reading & Writing - Module 1',
  ENGLISH_M2_EASY: 'Reading & Writing - Module 2 (Easy)',
  ENGLISH_M2_MEDIUM: 'Reading & Writing - Module 2 (Medium)',
  ENGLISH_M2_HARD: 'Reading & Writing - Module 2 (Hard)',
  MATH_M1: 'Math - Module 1',
  MATH_M2_EASY: 'Math - Module 2 (Easy)',
  MATH_M2_MEDIUM: 'Math - Module 2 (Medium)',
  MATH_M2_HARD: 'Math - Module 2 (Hard)',
}
function moduleAttemptLabel(a) {
  const sec = a.section === 'ENGLISH' ? 'ENGLISH' : 'MATH'
  if (a.module_number === 1) return MODULE_LABEL[`${sec}_M1`]
  const v = String(a.difficulty_variant || 'STANDARD').toUpperCase()
  return MODULE_LABEL[`${sec}_M2_${v}`] || `${sec === 'ENGLISH' ? 'Reading & Writing' : 'Math'} - Module 2`
}

function IndividualResultCard({ attempt: a, onView, onDelete }) {
  const dateStr = a.finished_at
    ? new Date(a.finished_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="group flex flex-col rounded-2xl border border-gray-200 bg-white shadow-sm p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <div className="font-bold text-gray-900 text-[15px] leading-snug">
            {a._test?.display_name || `${a._test?.year} ${a._test?.form}`}
          </div>
          <div className="text-[13px] text-gray-500 mt-0.5">{moduleAttemptLabel(a)}</div>
          <div className="text-[13px] text-amber-600 mt-0.5">{dateStr}</div>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-1 text-rose-400 opacity-0 transition-opacity hover:bg-rose-50 group-hover:opacity-100 flex-shrink-0 mt-0.5"
          title="Delete result"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Score */}
      <div className="flex-1 flex flex-col items-center justify-center py-5 gap-1">
        <div className="text-[13px] text-gray-400 font-medium">Questions Correct</div>
        <div className="text-[42px] font-black tabular-nums text-gray-900 leading-none">
          {a.correct}<span className="text-[28px] text-gray-400 font-bold">/{a.total}</span>
        </div>
      </div>

      {/* Button */}
      <button
        type="button"
        onClick={onView}
        className="w-full py-2.5 rounded-xl bg-sky-100 text-sky-600 font-semibold hover:bg-sky-200 transition-colors text-[14px]"
      >
        Score Details
      </button>
    </motion.div>
  )
}

// ── Year Dropdown ─────────────────────────────────────────────────────────
function YearDropdown({ value, years, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useState(() => ({ current: null }))[0]

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, ref])

  const options = [{ val: 'all', label: 'All Years' }, ...years.map(y => ({ val: String(y), label: String(y) }))]
  const selected = options.find(o => o.val === value) || options[0]

  return (
    <div className="relative" ref={(el) => (ref.current = el)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm select-none min-w-[120px] justify-between ${
          open
            ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-sky-100'
            : 'bg-white border-gray-200 text-gray-700 hover:border-sky-300 hover:text-sky-600'
        }`}
      >
        <span>{selected.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className={open ? 'text-sky-500' : 'text-gray-400'} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[140px] rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 overflow-hidden"
          >
            {options.map((opt, i) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => { onChange(opt.val); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                  opt.val === value
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                } ${i !== 0 ? 'border-t border-gray-50' : ''}`}
              >
                <span>{opt.label}</span>
                {opt.val === value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MonthDropdown({ value, months, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useState(() => ({ current: null }))[0]
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, ref])
  const options = [{ val: 'all', label: 'All Months' }, ...months.map(m => ({ val: m.num, label: m.name }))]
  const selected = options.find(o => o.val === value) || options[0]
  return (
    <div className="relative" ref={(el) => (ref.current = el)}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-sm select-none min-w-[130px] justify-between ${open ? 'bg-sky-50 border-sky-400 text-sky-700' : 'bg-white border-gray-200 text-gray-700 hover:border-sky-300 hover:text-sky-600'}`}>
        <span>{selected.label}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className={open ? 'text-sky-500' : 'text-gray-400'} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[150px] rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden">
            {options.map((opt, i) => (
              <button key={opt.val} type="button" onClick={() => { onChange(opt.val); setOpen(false) }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${opt.val === value ? 'bg-sky-50 text-sky-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'} ${i !== 0 ? 'border-t border-gray-50' : ''}`}>
                <span>{opt.label}</span>
                {opt.val === value && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DeleteConfirmModal({ open, title, onCancel, onDelete, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
        <h4 className="text-lg font-bold text-gray-900">Delete this result?</h4>
        <p className="mt-1 text-sm text-gray-500 truncate">{title}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} disabled={loading} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onDelete} disabled={loading} className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-50 flex items-center gap-2">
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

function ModulePickerModal({ open, test, onClose, onContinue }) {
  const testId = test?.id
  const { data: modules = [], isLoading } = useQuery({
    queryKey: ['sat-modules', testId],
    queryFn: () => api.get(`/sat/tests/${testId}/modules/`).then((r) => r.data),
    enabled: !!testId && open,
  })

  const ordered = useMemo(() => {
    const arr = Array.isArray(modules) ? modules.slice() : []
    return arr.sort((a, b) =>
      (a.section === 'ENGLISH' ? 0 : 1) - (b.section === 'ENGLISH' ? 0 : 1)
      || a.module_number - b.module_number
      || String(a.difficulty_variant || '').localeCompare(String(b.difficulty_variant || ''))
    )
  }, [modules])

  const [selectedId, setSelectedId] = useState(null)

  // keep selection valid
  useEffect(() => {
    if (!open) return
    if (ordered.length === 0) return
    if (selectedId && ordered.some((m) => m.id === selectedId)) return
    setSelectedId(ordered[0].id)
  }, [open, ordered, selectedId])

  const label = (m) => {
    const sec = m.section === 'ENGLISH' ? 'English' : 'Math'
    if (m.module_number === 1) return `${sec} - Module 1`
    const v = m.difficulty_variant && m.difficulty_variant !== 'STANDARD'
      ? ` (${String(m.difficulty_variant).slice(0, 1) + String(m.difficulty_variant).slice(1).toLowerCase()})`
      : ''
    return `${sec} - Module 2${v}`
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <div className="text-2xl font-black text-gray-900">Choose a module</div>
            <div className="text-sm text-gray-500 mt-1">{test?.title || ''}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <select
                value={selectedId || ''}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 bg-white focus:outline-none focus:border-sky-400"
              >
                {ordered.map((m) => (
                  <option key={m.id} value={m.id}>{label(m)}</option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedId}
                  onClick={() => selectedId && onContinue(selectedId)}
                  className="px-6 py-2.5 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ConfigModal({ open, timed, setTimed, onClose, onStart, loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-7 py-7">
          <div>
            <div className="text-3xl font-black text-gray-900">Configure your test</div>
            <div className="text-gray-500 mt-1">Customize your test with your timing preferences.</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="px-7 pb-7 space-y-4">
          <button
            type="button"
            onClick={() => setTimed(true)}
            className={`w-full text-left rounded-2xl p-5 border transition-colors ${timed ? 'border-sky-400 bg-sky-50' : 'border-gray-200 bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${timed ? 'border-sky-500' : 'border-gray-300'}`}>
                {timed && <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
              </span>
              <div>
                <div className="text-lg font-black text-gray-900">Timed</div>
                <div className="text-sm text-gray-500 mt-0.5">Standard test conditions</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTimed(false)}
            className={`w-full text-left rounded-2xl p-5 border transition-colors ${!timed ? 'border-sky-400 bg-sky-50' : 'border-gray-200 bg-gray-50'}`}
          >
            <div className="flex items-center gap-3">
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!timed ? 'border-sky-500' : 'border-gray-300'}`}>
                {!timed && <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
              </span>
              <div>
                <div className="text-lg font-black text-gray-900">Untimed</div>
                <div className="text-sm text-gray-500 mt-0.5">Practice at your own pace</div>
              </div>
            </div>
          </button>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onStart}
              disabled={loading}
              className="px-7 py-3 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TestCard({ test, idx, tab, user, modules, modulesLoading, onStartFull, onViewResults, loading }) {
  const hasScore = test.best_score != null
  const locked = test.is_premium && !user?.is_premium
  const navigate = useNavigate()

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.06 }}
      className="flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-lg hover:shadow-xl transition-shadow"
    >
      <div className="bg-sky-500 text-white text-center py-3 px-3 relative">
        <span className="text-xl sm:text-2xl font-black tracking-wide">
          {test.year} · {test.form}
        </span>
        <div className="text-xs text-sky-200 mt-0.5">{test.display_name}</div>
        {test.is_premium && (
          <span className={`absolute top-2 right-2 flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-bold ${locked ? 'bg-amber-400 text-white' : 'bg-black/20 text-white'}`}>
            <Lock size={10} /> {locked ? 'PREMIUM' : 'PRO'}
          </span>
        )}
      </div>
      <div className="bg-slate-900 text-white text-center py-2 px-2 text-[10px] sm:text-[11px] font-bold tracking-[0.2em]">
        SAT MOCK EXAM
      </div>

      <div className="p-3.5 flex flex-col flex-1">
        {tab === 'full' && (
          <div className="text-center mb-4">
            <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Your total score</p>
            <p className={`text-4xl font-black my-1 tabular-nums ${hasScore ? 'text-slate-900' : 'text-slate-300'}`}>
              {hasScore ? test.best_score : '—'}
            </p>
            <p className="text-xs text-slate-500 font-medium">400–1600</p>
          </div>
        )}

        <div className="relative space-y-4 flex-1 mb-5">
          {tab === 'individual' ? (
            <IndividualModulesGrid mods={modules} testId={test.id} navigate={navigate} loading={modulesLoading} locked={locked} />
          ) : (
            <>
              <SectionScore label="Reading & Writing" score={test.english_score} hasScore={hasScore} />
              <SectionScore label="Math" score={test.math_score} hasScore={hasScore} />
            </>
          )}

          {locked && (
            <Link
              to="/app/subscription"
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80 backdrop-blur-[3px] group"
            >
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Lock size={20} className="text-amber-500" />
              </div>
              <span className="text-sm font-semibold text-gray-600 group-hover:text-amber-600 transition-colors">
                Unlock Premium
              </span>
            </Link>
          )}
        </div>

        {locked ? null : test.has_questions === false ? (
          <div className="mt-auto w-full py-3.5 px-4 rounded-xl text-center text-sm font-semibold text-gray-400 bg-gray-100 border border-gray-200">
            Coming soon
          </div>
        ) : tab === 'full' ? (
          <div className="mt-auto space-y-2">
            {hasScore && (
              <button
                type="button"
                onClick={onViewResults}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all"
              >
                <Trophy size={14} />
                See Results ({test.attempts_count})
              </button>
            )}
            <button
              type="button"
              onClick={() => onStartFull(!!hasScore)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wide bg-sky-500 text-white shadow-[0_4px_0_0_#0369a1] hover:bg-sky-600 transition-all active:translate-y-[2px] active:shadow-[0_2px_0_0_#0369a1] disabled:opacity-50 disabled:pointer-events-none"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
                <ChevronRight className="h-5 w-5 text-white" strokeWidth={3} />
              </span>
              {hasScore ? 'Retake Test' : 'Full practice'}
            </button>
          </div>
        ) : (
          <div className="mt-auto flex gap-2">
            <button
              type="button"
              onClick={() => navigate(`/app/sat/modules/${test.id}/history?tab=scores`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-[13px] bg-white border-2 border-gray-700 text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <BarChart3 size={14} />
              View Scores
            </button>
            <button
              type="button"
              onClick={() => navigate(`/app/sat/modules/${test.id}/history?tab=answers`)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-[13px] bg-white border-2 border-gray-700 text-gray-800 hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              <FileText size={14} />
              Review Answers
            </button>
          </div>
        )}
      </div>
    </motion.article>
  )
}

function IndividualModulesGrid({ mods, testId, navigate, loading, locked }) {
  const list = Array.isArray(mods) ? mods : []
  const slots = [
    { section: 'ENGLISH', module_number: 1, label: 'Reading & Writing - M1' },
    { section: 'ENGLISH', module_number: 2, label: 'Reading & Writing - M2' },
    { section: 'MATH', module_number: 1, label: 'Math - M1' },
    { section: 'MATH', module_number: 2, label: 'Math - M2' },
  ]

  return (
    <div className="space-y-1.5 flex-1 relative">
      {slots.map((slot) => {
        const candidates = list.filter((m) => m.section === slot.section && m.module_number === slot.module_number)
        const completed = candidates.filter((m) => m.best_correct != null)
        const best = completed.sort((a, b) => (b.best_pct ?? 0) - (a.best_pct ?? 0))[0]
        const hasMods = candidates.length > 0
        const isDone = !!best && !locked
        const isEnglish = slot.section === 'ENGLISH'

        const firstModuleId = candidates[0]?.id

        return (
          <button
            key={slot.label}
            onClick={() => !locked && hasMods && firstModuleId && navigate(`/app/sat/modules/${testId}?module_id=${firstModuleId}`)}
            disabled={!hasMods || loading || locked}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all active:scale-[0.99] disabled:pointer-events-none ${
              locked
                ? 'border-gray-200 bg-gray-50 opacity-60'
                : 'border-sky-200 bg-sky-50 hover:bg-sky-100/80 disabled:opacity-40'
            }`}
          >
            <div className="min-w-0">
              <div className={`font-semibold ${locked ? 'text-gray-400' : 'text-sky-900'} ${isEnglish ? 'text-sm sm:text-[15px]' : 'text-sm sm:text-[13px]'}`}>
                {slot.label}
              </div>
            </div>

            {isDone ? (
              <span className="flex items-center gap-1 flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                <CheckCircle2 size={11} className="text-white" />
                DONE
              </span>
            ) : locked ? (
              <Lock size={13} className="text-gray-400 flex-shrink-0" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function SectionScore({ label, score, hasScore }) {
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 mb-2">
        <span className="text-sm font-bold text-slate-900">{label}</span>
        <span className={`text-sm font-black tabular-nums ${hasScore && score ? 'text-slate-800' : 'text-slate-300'}`}>
          {hasScore && score ? score : '—'}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="flex-1 text-center py-2.5 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-bold shadow-sm">Mod 1</span>
        <span className="flex-1 text-center py-2.5 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-bold shadow-sm">Mod 2</span>
      </div>
    </div>
  )
}
