/*
 * Shared pieces of the AI feedback pages (IELTS / CEFR speaking, IELTS writing).
 *
 * The student's own text is the centrepiece: phrases the examiner quoted are
 * marked red (error), amber (could be better) or green (strong), and tapping a
 * mark explains it. All marks come from quotes the AI already returns — no
 * extra AI calls.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ChevronDown, CheckCircle2, ArrowRight, Sparkles, AlertCircle, RotateCcw, Play, Pause, X } from 'lucide-react'
import {
  bandTheme, bandLabel, bandToCefr, txt, MARK, buildSegments, paragraphs,
  scoreTheme, cefrLevel, cefrLevelLabel, cefrLevelName, cefrTheme, CEFR_BANDS,
} from './feedbackUtils'

function useCountUp(target, duration = 1100) {
  const reduce = useReducedMotion()
  const [v, setV] = useState(reduce ? target : 0)
  useEffect(() => {
    if (reduce) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduce])
  return reduce ? target : v
}

// ── page frame ────────────────────────────────────────────────────────────────
export function ResultHeader({ eyebrow, title, onBack, backLabel = 'Back', actions }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-[4rem] flex-shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
      <button type="button" onClick={onBack}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800">
        <ArrowLeft size={17} /> <span className="hidden sm:inline">{backLabel}</span>
      </button>
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-widest text-sky-600">{eyebrow}</p>}
        <p className="truncate text-base font-bold text-gray-900">{title}</p>
      </div>
      {actions}
    </header>
  )
}

export function LoadingCard({ title = 'Analysing with AI…', steps = [] }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 rounded-3xl border border-sky-100 bg-white p-10 text-center shadow-xl shadow-sky-500/10">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-sky-100 border-t-sky-500" />
        <Sparkles size={24} className="absolute inset-0 m-auto animate-pulse text-sky-500" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{title}</p>
        <p className="mt-1 text-[15px] text-gray-500">This usually takes 10–20 seconds</p>
      </div>
      {steps.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {steps.map((s, i) => (
            <span key={s} className="animate-pulse rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-700"
              style={{ animationDelay: `${i * 0.2}s` }}>{s}</span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export function ErrorCard({ message, onRetry }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-3 rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-8 text-center">
      <AlertCircle size={34} className="mx-auto text-red-400" />
      <p className="text-lg font-bold text-red-800">Analysis failed</p>
      <p className="text-[15px] text-red-600">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry}
          className="btn-glass inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700">
          <RotateCcw size={15} /> Try again
        </button>
      )}
    </motion.div>
  )
}

// ── score hero: animated ring + criteria bars ─────────────────────────────────
/* Animated score ring — IELTS bands (0–9, halves) or CEFR points (0–75, whole numbers). */
export function ScoreRing({ value, max = 9, theme, size = 168, step = 0.5 }) {
  const reduce = useReducedMotion()
  const v = Number(value) || 0
  const t = theme || scoreTheme(v, max)
  const shown = useCountUp(v)
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const target = c * (1 - Math.min(v, max) / max)
  const label = step >= 1 ? String(Math.round(shown)) : (Math.round(shown / step) * step).toFixed(1)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.soft} strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.hex} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: reduce ? target : c }} animate={{ strokeDashoffset: target }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-5xl font-black tabular-nums ${t.text}`}>{label}</span>
        <span className="text-sm font-semibold text-gray-400">out of {max}</span>
      </div>
    </div>
  )
}

export function BandRing({ band, size = 168 }) {
  return <ScoreRing value={band} max={9} theme={bandTheme(band)} size={size} />
}

/* criteria: [{ key, label, band }]   stats: [{ label, value }] */
export function ScoreHero({ band, badge, title, criteria, stats = [] }) {
  const t = bandTheme(band)
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-sky-500/10 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${t.hex}1f` }} />
      <div className="relative grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex justify-center"><BandRing band={band} /></div>
        <div className="text-center lg:text-left">
          {badge && <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">{badge}</span>}
          <p className="mt-3 text-4xl font-black tracking-tight text-gray-900">{bandLabel(band)}</p>
          <p className="mt-1 text-[15px] text-gray-500">
            Overall band <b className={t.text}>{Number(band).toFixed(1)}</b> · about CEFR <b className="text-gray-800">{bandToCefr(band)}</b>
          </p>
          {title && <p className="mt-1 truncate text-[15px] text-gray-400">{title}</p>}
          {stats.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              {stats.map(s => (
                <span key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-gray-600">
                  <b className="text-gray-900">{s.value}</b> {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3.5">
          {criteria.map((c, i) => {
            const ct = bandTheme(c.band)
            return (
              <div key={c.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-gray-700">{c.label}</span>
                  <span className={`text-lg font-black tabular-nums ${ct.text}`}>{Number(c.band).toFixed(1)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: ct.soft }}>
                  <motion.div className="h-full rounded-full" style={{ background: ct.hex }}
                    initial={{ width: 0 }} animate={{ width: `${(Number(c.band) / 9) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.section>
  )
}

// ── CEFR multilevel (0–75) ────────────────────────────────────────────────────
/* The 0–75 scale cut into its level bands, with a marker at the score. */
export function CefrScale({ score }) {
  const reduce = useReducedMotion()
  const s = Math.max(0, Math.min(75, Number(score) || 0))
  const current = cefrLevel(s)
  const bands = [...CEFR_BANDS].reverse()          // below → B1 → B2 → C1, left to right
  return (
    <div className="mt-5">
      <div className="relative">
        <div className="flex h-3 overflow-hidden rounded-full">
          {bands.map(b => {
            const t = cefrTheme(b.level)
            const width = ((Math.min(b.to + 1, 75) - b.from) / 75) * 100
            return <span key={b.level} style={{ width: `${width}%`, background: b.level === current ? t.hex : t.soft }} />
          })}
        </div>
        <motion.span className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-gray-900 shadow"
          initial={{ left: reduce ? `${(s / 75) * 100}%` : '0%' }} animate={{ left: `${(s / 75) * 100}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <div className="mt-2 flex text-xs font-bold text-gray-500">
        {bands.map(b => (
          <span key={b.level} className={`truncate ${b.level === current ? 'text-gray-900' : ''}`}
            style={{ width: `${((Math.min(b.to + 1, 75) - b.from) / 75) * 100}%` }}>
            {cefrLevelLabel(b.level)} <span className="font-semibold text-gray-400">{b.from}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* parts: [{ key, label, points, max }]   stats: [{ label, value }] */
export function CefrScoreHero({ score, badge, title, parts = [], stats = [], summary }) {
  const level = cefrLevel(score)
  const t = cefrTheme(level)
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-sky-500/10 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${t.hex}1f` }} />
      <div className="relative grid items-center gap-8 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex justify-center"><ScoreRing value={score} max={75} theme={t} step={1} /></div>
        <div className="min-w-0 text-center lg:text-left">
          {badge && <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-700">{badge}</span>}
          <p className="mt-3 flex flex-wrap items-baseline justify-center gap-x-3 lg:justify-start">
            <span className="text-5xl font-black tracking-tight" style={{ color: t.hex }}>{cefrLevelLabel(level)}</span>
            <span className="text-lg font-bold text-gray-500">{cefrLevelName(level)}</span>
          </p>
          <p className="mt-1 text-[15px] text-gray-500">
            <b className="text-gray-900">{score}</b> / 75 on the multilevel scale
          </p>
          {title && <p className="mt-1 truncate text-[15px] text-gray-400">{title}</p>}
          <CefrScale score={score} />
          {stats.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
              {stats.map(s => (
                <span key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-gray-600">
                  <b className="text-gray-900">{s.value}</b> {s.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3.5">
          {parts.map((p, i) => {
            const pt = scoreTheme(p.points, p.max)
            return (
              <div key={p.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-gray-700">{p.label}</span>
                  <span className={`text-lg font-black tabular-nums ${pt.text}`}>
                    {Number.isInteger(p.points) ? p.points : Number(p.points).toFixed(1)}
                    <span className="text-sm font-bold text-gray-400"> / {p.max}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full" style={{ background: pt.soft }}>
                  <motion.div className="h-full rounded-full" style={{ background: pt.hex }}
                    initial={{ width: 0 }} animate={{ width: `${(p.points / p.max) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.25 + i * 0.1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {summary && (
        <div className="relative mt-6 flex gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-[16px] leading-relaxed text-gray-800">
          <Sparkles size={20} className="mt-0.5 flex-shrink-0 text-sky-600" />
          <p>{summary}</p>
        </div>
      )}
    </motion.section>
  )
}

// ── highlighted text ──────────────────────────────────────────────────────────
export function MarkLegend({ marks, found }) {
  const count = (k) => marks.filter((m, i) => m.kind === k && found.has(i)).length
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {Object.entries(MARK).map(([k, m]) => (
        <span key={k} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold text-gray-700 ${m.ring}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} /> {m.label} <span className="text-gray-400">{count(k)}</span>
        </span>
      ))}
    </div>
  )
}

/* marks: [{ quote, kind: 'error'|'weak'|'good', title, issue, fix }] — tap a mark to see why */
export function HighlightedText({ text, marks }) {
  const paras = useMemo(() => paragraphs(text), [text])
  return <div className="space-y-4">{paras.map((p, i) => <MarkedParagraph key={i} text={p} marks={marks} />)}</div>
}

export function SectionTitle({ icon: Icon, title, hint, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        {Icon && <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Icon size={20} /></span>}
        <div>
          <h2 className="text-xl font-black tracking-tight text-gray-900">{title}</h2>
          {hint && <p className="text-[15px] text-gray-500">{hint}</p>}
        </div>
      </div>
      {right}
    </div>
  )
}

function MarkedParagraph({ text, marks }) {
  const segs = useMemo(() => buildSegments(text, marks), [text, marks])
  const [active, setActive] = useState(null)
  const m = active != null ? marks[active] : null

  return (
    <div>
      <p className="whitespace-pre-wrap text-[17px] leading-[2] text-gray-800">
        {segs.map((s, i) => {
          if (s.mark < 0) return <span key={i}>{s.text}</span>
          const mk = marks[s.mark]
          return (
            <button key={i} type="button" onClick={() => setActive(active === s.mark ? null : s.mark)}
              title={mk.issue || MARK[mk.kind].label}
              className={`rounded-md px-0.5 text-left underline decoration-2 underline-offset-4 transition hover:brightness-95 ${MARK[mk.kind].cls} ${active === s.mark ? 'ring-2 ring-offset-1 ring-gray-900/20' : ''}`}>
              {s.text}
            </button>
          )
        })}
      </p>
      <AnimatePresence>
        {m && (
          <motion.div key={active} initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className={`relative mt-3 rounded-2xl border p-4 ${MARK[m.kind].ring}`}>
              <button type="button" onClick={() => setActive(null)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600" aria-label="Close"><X size={16} /></button>
              <p className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <span className={`h-2.5 w-2.5 rounded-full ${MARK[m.kind].dot}`} /> {m.title || MARK[m.kind].label}
              </p>
              <p className="mt-1.5 text-[15px] font-semibold text-gray-900">“{m.quote}”</p>
              {m.issue && <p className="mt-1 text-[15px] leading-relaxed text-gray-700">{m.issue}</p>}
              {m.fix && (
                <p className="mt-2 flex items-start gap-2 text-[15px] leading-relaxed text-emerald-800">
                  <ArrowRight size={16} className="mt-1 flex-shrink-0" /> <span>{m.fix}</span>
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── criterion card ────────────────────────────────────────────────────────────
/* data: {band | score, label, feedback, strengths, errors}; max 9 = IELTS band, 5 = CEFR criterion */
export function CriterionCard({ data, icon: Icon, kind = 'error', index = 0, defaultOpen = false, max = 9 }) {
  const [open, setOpen] = useState(defaultOpen)
  const band = Number(data?.band ?? data?.score) || 0
  const t = scoreTheme(band, max)
  const strengths = Array.isArray(data?.strengths) ? data.strengths.filter(Boolean) : []
  const errors = Array.isArray(data?.errors) ? data.errors.filter(e => e && (e.quote || e.issue)) : []
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:shadow-lg hover:shadow-sky-500/5">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="flex w-full items-center gap-4 p-5 text-left sm:p-6">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: t.hex }}>
          <Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-gray-900">{txt(data?.label)}</span>
          <span className="mt-1 block h-2 max-w-xs overflow-hidden rounded-full" style={{ background: t.soft }}>
            <motion.span className="block h-full rounded-full" style={{ background: t.hex }}
              initial={{ width: 0 }} whileInView={{ width: `${(band / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }} />
          </span>
        </span>
        <span className={`text-3xl font-black tabular-nums ${t.text}`}>
          {max === 9 ? band.toFixed(1) : Number.isInteger(band) ? band : band.toFixed(1)}
          {max !== 9 && <span className="text-base font-bold text-gray-400"> / {max}</span>}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="space-y-5 border-t border-slate-100 px-5 pb-6 pt-5 sm:px-6">
              {txt(data?.feedback) && <p className="text-[16px] leading-relaxed text-gray-700">{txt(data.feedback)}</p>}
              {strengths.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-800">What you did well</p>
                  <ul className="space-y-2">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-gray-800">
                        <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-emerald-500" /> {txt(s)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {errors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Fix these</p>
                  <ul className="space-y-3">
                    {errors.map((e, i) => (
                      <li key={i} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                        {txt(e.quote) && (
                          <p className={`inline rounded-md px-1.5 py-0.5 text-[15px] font-semibold ${MARK[kind].cls}`}>“{txt(e.quote)}”</p>
                        )}
                        {txt(e.issue) && <p className="mt-2 text-[15px] leading-relaxed text-gray-700">{txt(e.issue)}</p>}
                        {txt(e.suggestion) && (
                          <p className="mt-2 flex items-start gap-2 text-[15px] font-medium leading-relaxed text-emerald-800">
                            <ArrowRight size={16} className="mt-1 flex-shrink-0" /> <span>{txt(e.suggestion)}</span>
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── audio ─────────────────────────────────────────────────────────────────────
export function AudioPlayer({ src }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(0)
  const probing = useRef(false)
  const fmt = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '--:--')
  // Browser-recorded webm has no duration in its header (reported as Infinity):
  // seeking far past the end makes the browser work it out.
  const onMeta = (e) => {
    const a = e.currentTarget
    if (Number.isFinite(a.duration)) { setDur(a.duration); return }
    probing.current = true
    a.currentTime = 1e7
  }
  const onTime = (e) => {
    const a = e.currentTarget
    if (probing.current) {
      if (Number.isFinite(a.duration)) { probing.current = false; setDur(a.duration); a.currentTime = 0 }
      return
    }
    setTime(a.currentTime)
  }
  if (!src) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 px-3 py-2.5">
      <audio ref={ref} src={src} preload="metadata"
        onTimeUpdate={onTime} onLoadedMetadata={onMeta}
        onDurationChange={(e) => { if (Number.isFinite(e.currentTarget.duration)) setDur(e.currentTarget.duration) }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setTime(0) }} />
      <button type="button" onClick={() => (playing ? ref.current.pause() : ref.current.play().catch(() => {}))}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md transition hover:bg-sky-700">
        {playing ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
      </button>
      <div className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-sky-100"
        onClick={(e) => { if (!dur) return; const r = e.currentTarget.getBoundingClientRect(); ref.current.currentTime = ((e.clientX - r.left) / r.width) * dur }}>
        <div className="h-full rounded-full bg-sky-500" style={{ width: dur ? `${(time / dur) * 100}%` : 0 }} />
      </div>
      <span className="w-12 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-sky-700">{dur ? fmt(playing ? time : dur) : '--:--'}</span>
    </div>
  )
}
