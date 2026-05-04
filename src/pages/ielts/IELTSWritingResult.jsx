import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
  RotateCcw, Printer, ArrowLeft,
  BookOpen, Link2, BookMarked, AlignLeft,
  Sparkles, ThumbsUp, TriangleAlert, Award,
} from 'lucide-react'
import { analyzeWriting } from '../../utils/writingAnalysis'
import { downloadAnalysisPdf } from '../../utils/downloadPdf'

// ── Band score → color (yumshoq palitra) ─────────────────────────────────────
function bandColor(band) {
  if (band >= 8)   return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200/80', chip: 'from-emerald-500 to-teal-600' }
  if (band >= 7)   return { bg: 'bg-green-500',   text: 'text-green-600',   light: 'bg-green-50',   border: 'border-green-200/80', chip: 'from-green-500 to-emerald-600' }
  if (band >= 6)   return { bg: 'bg-lime-500',    text: 'text-lime-600',    light: 'bg-lime-50',    border: 'border-lime-200/80', chip: 'from-lime-500 to-green-600' }
  if (band >= 5)   return { bg: 'bg-slate-500',   text: 'text-slate-600',   light: 'bg-slate-50',   border: 'border-slate-200/80', chip: 'from-slate-500 to-sky-500' }
  if (band >= 4)   return { bg: 'bg-sky-500',  text: 'text-sky-600',  light: 'bg-sky-50',  border: 'border-sky-200/80', chip: 'from-sky-500 to-red-500' }
  return             { bg: 'bg-red-500',     text: 'text-red-600',     light: 'bg-red-50',     border: 'border-red-200/80', chip: 'from-red-500 to-rose-600' }
}

function bandLabel(band) {
  if (band >= 9)   return 'Expert'
  if (band >= 8.5) return 'Very Good'
  if (band >= 8)   return 'Very Good'
  if (band >= 7.5) return 'Good'
  if (band >= 7)   return 'Good'
  if (band >= 6.5) return 'Competent'
  if (band >= 6)   return 'Competent'
  if (band >= 5.5) return 'Modest'
  if (band >= 5)   return 'Modest'
  if (band >= 4)   return 'Limited'
  return 'Very Limited'
}

// ── Band ring — brand gradient + semantic tail ───────────────────────────────
function BandRing({ band, size = 'lg' }) {
  const c = bandColor(band)
  const pct = (band / 9) * 100
  const r = size === 'lg' ? 56 : 38
  const stroke = size === 'lg' ? 8 : 6
  const circum = 2 * Math.PI * r
  const dash = (pct / 100) * circum
  const gradId = 'band-ring-grad'

  return (
    <div
      className="relative flex items-center justify-center drop-shadow-sm"
      style={{ width: r * 2 + stroke * 2 + 8, height: r * 2 + stroke * 2 + 8 }}
    >
      <svg width={r * 2 + stroke * 2 + 8} height={r * 2 + stroke * 2 + 8} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
        <circle cx={r + stroke / 2 + 4} cy={r + stroke / 2 + 4} r={r} fill="none" stroke="#fff7ed" strokeWidth={stroke} />
        <circle
          cx={r + stroke / 2 + 4}
          cy={r + stroke / 2 + 4}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circum}`}
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`font-black tabular-nums ${size === 'lg' ? 'text-4xl' : 'text-2xl'} ${c.text}`}>{band}</span>
        {size === 'lg' && <span className="text-[10px] text-sky-400/90 font-bold uppercase tracking-widest mt-0.5">/ 9.0</span>}
      </div>
    </div>
  )
}

const CRITERION_ICONS = {
  task_achievement: BookOpen,
  coherence_cohesion: Link2,
  lexical_resource: BookMarked,
  grammatical_range: AlignLeft,
}

function CriterionCard({ key_: key, data, delay }) {
  const [open, setOpen] = useState(true)
  const c = bandColor(data.band)
  const Icon = CRITERION_ICONS[key] || BookOpen

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      className="group relative rounded-2xl border border-sky-100/90 bg-white shadow-md shadow-sky-500/[0.06] overflow-hidden ring-1 ring-sky-50/80"
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 via-slate-500 to-sky-600 opacity-90" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 p-4 sm:p-6 pl-5 sm:pl-6 text-left hover:bg-gradient-to-r hover:from-sky-50/40 hover:to-transparent transition-colors"
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-500/25">
          <Icon size={24} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base sm:text-[17px] tracking-tight">{data.label}</p>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">{data.feedback}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div
            className={`min-w-[3rem] px-3 py-2 rounded-xl bg-gradient-to-br ${c.chip} text-white text-xl font-black shadow-sm tabular-nums`}
          >
            {data.band}
          </div>
          {open ? <ChevronUp size={18} className="text-sky-300" /> : <ChevronDown size={18} className="text-sky-300" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-0 space-y-4 border-t border-sky-50/90 bg-gradient-to-b from-sky-50/20 to-white">
              <p className="text-base text-gray-700 leading-relaxed pt-4 sm:pt-5">{data.feedback}</p>

              {data.strengths?.length > 0 && (
                <div className="rounded-xl bg-emerald-50/60 border border-emerald-100/80 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp size={14} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Strengths</span>
                  </div>
                  <ul className="space-y-2">
                    {data.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-gray-800 leading-snug">
                        <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.errors?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TriangleAlert size={14} className="text-slate-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Issues &amp; fixes</span>
                  </div>
                  <div className="space-y-3">
                    {data.errors.map((e, i) => (
                      <div key={i} className="rounded-xl bg-slate-50/80 border border-slate-100 p-3.5 space-y-2">
                        {e.quote && (
                          <p className="text-xs font-mono text-gray-700 bg-white/90 border border-slate-100/80 rounded-lg px-3 py-2 italic leading-relaxed">
                            &ldquo;{e.quote}&rdquo;
                          </p>
                        )}
                        <p className="text-xs text-red-700 font-semibold leading-relaxed">{e.issue}</p>
                        {e.suggestion && (
                          <p className="text-xs text-emerald-800 leading-relaxed">
                            <span className="font-semibold text-emerald-700">Suggestion:</span> {e.suggestion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function handleDownloadResult({ task, text, wordCount, result, ownTitle }) {
  downloadAnalysisPdf({ task, text, wordCount, result, ownTitle })
}

export default function IELTSWritingResult() {
  const location = useLocation()
  const navigate = useNavigate()
  const { task, text, wordCount, ownTitle } = location.state || {}

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!text) return
    setLoading(true)
    analyzeWriting({ text, task, wordCount, ownTitle })
      .then((r) => {
        setResult(r)
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  const CRITERIA_ORDER = ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']

  if (!text) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto bg-white p-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-sky-200/30 rounded-full blur-3xl" />
        </div>
        <div className="text-center space-y-4 relative z-[1]">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-sky-100 flex items-center justify-center border border-sky-200/60">
            <AlertCircle size={32} className="text-sky-400" />
          </div>
          <p className="text-gray-600 text-sm font-medium">No result found.</p>
          <button
            type="button"
            onClick={() => navigate('/app/ielts/writing')}
            className="px-6 py-2.5 gradient-primary text-white rounded-xl text-sm font-bold hover:opacity-95 transition shadow-glow"
          >
            Back to writing
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-y-contain bg-white pb-10 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[min(100%,480px)] h-64 bg-gradient-to-bl from-sky-200/25 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-72 h-72 bg-slate-100/40 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 shrink-0 border-b border-sky-100/90 bg-white/85 backdrop-blur-md px-4 sm:px-6 min-h-[4.25rem] h-auto py-2.5 flex items-center gap-3 sm:gap-4 shadow-sm shadow-sky-500/5">
        <button
          type="button"
          onClick={() => navigate('/app/ielts/writing')}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-sky-50 hover:text-sky-800 transition border border-gray-200/80 hover:border-sky-200 bg-white/50"
        >
          <ArrowLeft size={18} strokeWidth={2.25} /> Back to list
        </button>
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-500/90 hidden sm:block mb-0.5">Result</p>
          <p className="text-[15px] sm:text-base font-bold text-gray-900 truncate leading-snug">{task?.title || ownTitle || 'Writing analysis'}</p>
        </div>
        {result && (
          <button
            type="button"
            onClick={() => handleDownloadResult({ task, text, wordCount, result, ownTitle })}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-2 border-sky-300 text-sky-800 bg-gradient-to-b from-sky-50 to-slate-50 hover:from-sky-100 hover:to-slate-100 transition shadow-md shrink-0"
          >
            <Printer size={18} strokeWidth={2.25} /> PDF
          </button>
        )}
      </header>

      <div className="relative z-[1] max-w-4xl lg:max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-5 sm:space-y-7">
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-sky-100 bg-white/90 p-10 flex flex-col items-center gap-5 shadow-lg shadow-sky-500/10"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
              <Sparkles size={22} className="text-sky-500 absolute inset-0 m-auto" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-black text-gray-900 text-lg tracking-tight">Analyzing with AI…</p>
              <p className="text-sm text-gray-500">Scoring across four criteria</p>
            </div>
            <div className="flex gap-5 text-xs font-semibold text-sky-400/90">
              {['Task', 'Cohesion', 'Lexical', 'Grammar'].map((l, i) => (
                <div key={l} className="flex flex-col items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full bg-sky-100 animate-pulse border border-sky-200/60"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-8 text-center space-y-4 shadow-lg shadow-red-500/10"
          >
            <AlertCircle size={36} className="text-red-400 mx-auto" />
            <p className="font-bold text-red-800 text-lg">Analysis failed</p>
            <p className="text-sm text-red-600/90 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setLoading(true)
                analyzeWriting({ text, task, wordCount })
                  .then((r) => {
                    setResult(r)
                    setLoading(false)
                  })
                  .catch((e) => {
                    setError(e.message)
                    setLoading(false)
                  })
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition shadow-md"
            >
              <RotateCcw size={15} /> Try again
            </button>
          </motion.div>
        )}

        {result && !loading && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-slate-50/50 p-6 sm:p-8 lg:p-10 shadow-xl shadow-sky-500/15 ring-1 ring-sky-100/60"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-300/20 blur-3xl" />
              <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-slate-200/25 blur-2xl" />

              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                <div className="flex justify-center sm:justify-start">
                  <BandRing band={result.overall_band} size="lg" />
                </div>
                <div className="flex-1 text-center sm:text-left space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/90 border border-sky-200/80 text-sky-800 text-[11px] font-bold uppercase tracking-wider mx-auto sm:mx-0">
                    <Award size={13} className="text-sky-600" />
                    Overall band
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                    {bandLabel(result.overall_band)}
                  </p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm">
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-white/90 border border-sky-100 text-gray-700 font-semibold shadow-sm">
                      {wordCount} words
                    </span>
                    <span className="text-gray-500 font-medium truncate max-w-full">{task?.title || ownTitle || 'Writing Practice'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                    {CRITERIA_ORDER.map((k) => {
                      const cr = result[k]
                      if (!cr) return null
                      const c = bandColor(cr.band)
                      const short = cr.label?.split(/\s+/).slice(0, 2).join(' ') || k
                      return (
                        <span
                          key={k}
                          className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-xl text-xs font-bold border ${c.border} ${c.light} ${c.text} shadow-sm`}
                        >
                          <span className="text-[10px] font-semibold text-gray-600 max-w-[100px] truncate">{short}</span>
                          <span className="tabular-nums">{cr.band}</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="space-y-4">
              <p className="text-sm font-bold uppercase tracking-widest text-sky-600/90 px-1">Criteria breakdown</p>
              {CRITERIA_ORDER.map((k, i) => {
                const cr = result[k]
                if (!cr) return null
                return <CriterionCard key={k} key_={k} data={cr} delay={0.08 + i * 0.06} />
              })}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-3xl border border-gray-200/90 bg-white overflow-hidden shadow-lg shadow-gray-500/5 ring-1 ring-gray-100"
            >
              <div className="px-5 py-4 sm:px-6 sm:py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center justify-between gap-3">
                <p className="text-base sm:text-lg font-black text-gray-900 tracking-tight">Your writing</p>
                <span className="text-sm font-bold tabular-nums text-sky-700 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-lg">
                  {wordCount} words
                </span>
              </div>
              <div className="px-5 py-5 sm:px-8 sm:py-7 max-h-[min(480px,60vh)] overflow-y-auto">
                <p className="text-base sm:text-[17px] leading-[1.85] text-gray-800 whitespace-pre-wrap font-medium">{text}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 pb-2"
            >
              <button
                type="button"
                onClick={() => navigate('/app/ielts/writing')}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-200 bg-white text-base font-bold text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition shadow-sm"
              >
                Back to list
              </button>
              <button
                type="button"
                onClick={() => handleDownloadResult({ task, text, wordCount, result, ownTitle })}
                className="flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl gradient-primary text-white text-base font-bold hover:opacity-95 transition shadow-glow"
              >
                <Printer size={20} strokeWidth={2.25} /> Download PDF
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  )
}



