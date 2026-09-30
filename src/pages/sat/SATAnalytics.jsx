import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  BarChart3, CheckCircle2, XCircle, Target, Bookmark, Flame, Clock, Timer,
  Sparkles, RefreshCw, ArrowRight, ChevronDown, AlertTriangle, TrendingUp, CalendarDays, Loader2,
} from 'lucide-react'
import api from '../../api/client'

/*
 * Every number on this page comes from /api/sat/analytics/ — nothing is
 * computed here except formatting. The AI card is fed the same numbers.
 *
 * Colour: identity (subject / activity) uses three validated categorical
 * slots; accuracy uses the reserved status colours and always carries a
 * word + icon, never colour alone; the heat-map is one hue, light → dark.
 */
const C = {
  ENGLISH: '#2a78d6',   // Reading & Writing
  MATH: '#eb6834',
  // activity types get their own hues so they are never read as a subject
  act: { test: '#1baf7a', module: '#4a3aa7', bank: '#eda100' },
  good: '#0ca30c',
  warn: '#fab219',
  bad: '#d03b3b',
  grid: '#e5e7eb',
  heat: ['#eef1f4', '#cde2fb', '#86b6ef', '#3987e5', '#184f95'],
  soft: '#c7dcf6',      // de-emphasised bars (same hue as the accent)
}
const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['all', 'All time']]
const DIFF_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

// ── formatting ────────────────────────────────────────────────────────────────
const fmtDur = (sec) => {
  const s = Math.round(sec || 0)
  if (s < 60) return `${s}s`
  if (s < 3600) return s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}
const fmtHour = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
const parseDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
const fmtDay = (iso, opts = { month: 'short', day: 'numeric' }) => parseDay(iso).toLocaleDateString('en-US', opts)
const band = (pct) => (pct == null ? null : pct >= 85 ? 'good' : pct >= 60 ? 'warn' : 'bad')
const BAND = {
  good: { label: 'Strong', color: C.good, Icon: CheckCircle2, text: 'text-green-700' },
  warn: { label: 'Okay', color: C.warn, Icon: TrendingUp, text: 'text-amber-700' },
  bad: { label: 'Needs work', color: C.bad, Icon: AlertTriangle, text: 'text-red-700' },
}

// ── shared pieces ─────────────────────────────────────────────────────────────
function Card({ title, subtitle, right, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-xl font-bold text-gray-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  )
}

function Empty({ children }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-gray-500">{children}</p>
}

// One tooltip for the whole page; marks call show/hide. Text only — never HTML.
function useTooltip() {
  const [tip, setTip] = useState(null)
  const show = (e, lines) => {
    const r = e.currentTarget.getBoundingClientRect()
    setTip({ x: r.left + r.width / 2, y: r.top, lines })
  }
  const hide = () => setTip(null)
  const node = tip && (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-xl"
      style={{ left: Math.min(Math.max(tip.x, 90), window.innerWidth - 90), top: tip.y - 8 }}
    >
      {tip.lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 whitespace-nowrap ${i === 0 ? 'mb-1 font-semibold' : ''}`}>
          {l.color && <span className="h-0.5 w-3 rounded-full" style={{ background: l.color }} />}
          {l.value != null && <span className="font-bold">{l.value}</span>}
          <span className={l.value != null ? 'text-gray-300' : ''}>{l.label}</span>
        </div>
      ))}
    </div>
  )
  return { show, hide, node }
}

// Accuracy meter: the fill carries the state, the track is a light step of the same colour
function Meter({ pct, height = 8 }) {
  const b = band(pct)
  const color = b ? BAND[b].color : C.grid
  return (
    <div className="w-full rounded-full" style={{ height, background: b ? `${color}26` : '#f1f5f9' }}
      role="img" aria-label={pct == null ? 'No data' : `${pct}%`}>
      {pct != null && <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />}
    </div>
  )
}

function BandTag({ pct }) {
  const b = band(pct)
  if (!b) return <span className="text-xs text-gray-400">No data</span>
  const { label, Icon, text } = BAND[b]
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${text}`}><Icon size={12} /> {label}</span>
}

function BandLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
      {[['good', '≥ 85%'], ['warn', '60–84%'], ['bad', '< 60%']].map(([k, range]) => (
        <span key={k} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: BAND[k].color }} /> {BAND[k].label} {range}
        </span>
      ))}
    </div>
  )
}

// ── stat tiles ────────────────────────────────────────────────────────────────
function Stat({ icon: Icon, label, value, hint, tone = 'text-gray-400' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <Icon size={16} className={tone} />
      </div>
      <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ── AI analysis ───────────────────────────────────────────────────────────────
function AICard({ range, attempted }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('sat_ai_lang') || 'uz' } catch { return 'uz' } })
  const uz = lang === 'uz'
  // An earlier analysis of exactly these numbers is shown straight away (free — it is cached)
  const prior = useQuery({
    queryKey: ['sat-analytics-ai', range, lang],
    queryFn: () => api.post('/sat/analytics/ai/', { range, lang, cached_only: true }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
  const run = useMutation({
    mutationFn: (refresh) => api.post('/sat/analytics/ai/', { range, lang, refresh }).then(r => r.data),
  })
  const fresh = run.variables !== undefined && run.data && !run.isPending ? run.data : null
  const data = fresh || prior.data
  const a = data?.analysis
  const needed = data?.insufficient ? data.needed : 10
  const tooFew = data?.insufficient || attempted < needed
  const error = run.error?.response?.data?.error || (run.error ? (uz ? "AI tahlilni olib bo'lmadi." : 'Could not get the AI analysis.') : null)
  const pickLang = (l) => { setLang(l); run.reset(); try { localStorage.setItem('sat_ai_lang', l) } catch { /* */ } }

  return (
    <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white"><Sparkles size={18} /></span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{uz ? 'AI tahlil' : 'AI analysis'}</h2>
            <p className="text-sm text-gray-500">{uz ? "Natijalaringiz va xatolaringiz bo'yicha shaxsiy xulosa" : 'A personal read of your results and mistakes'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold">
            {['uz', 'en'].map(l => (
              <button key={l} type="button" onClick={() => pickLang(l)}
                className={`rounded-lg px-2.5 py-1 uppercase transition ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          {!tooFew && (
            <button type="button" disabled={run.isPending} onClick={() => run.mutate(!!a)}
              className="btn-glass inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {run.isPending ? <Loader2 size={15} className="animate-spin" /> : a ? <RefreshCw size={15} /> : <Sparkles size={15} />}
              {run.isPending ? (uz ? 'Tahlil qilinmoqda…' : 'Analysing…') : a ? (uz ? 'Yangilash' : 'Refresh') : (uz ? 'Tahlil qilish' : 'Analyse')}
            </button>
          )}
        </div>
      </div>

      {tooFew ? (
        <p className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-600">
          {uz ? `Aniq tahlil uchun kamida ${needed} ta savol yechish kerak — hozir ${attempted} ta.` : `Answer at least ${needed} questions for a reliable analysis — ${attempted} so far.`}
        </p>
      ) : error ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : !a ? (
        <p className="mt-4 text-sm text-gray-600">
          {uz ? "Tugmani bosing — AI pastdagi aniq raqamlaringizga qarab kuchli va zaif tomonlaringizni, hamda 7 kunlik rejani yozib beradi."
            : 'Press the button — the AI reads the exact numbers below and writes your strengths, weak spots and a 7-day plan.'}
        </p>
      ) : (
        <div className={`mt-5 space-y-5 transition-opacity ${run.isPending ? 'opacity-50' : ''}`}>
          <div>
            <p className="text-lg font-bold text-gray-900">{a.headline}</p>
            <p className="mt-1 leading-relaxed text-gray-700">{a.summary}</p>
          </div>
          <div className={`grid gap-4 ${a.strengths?.length > 0 && a.weaknesses?.length > 0 ? 'lg:grid-cols-2' : ''}`}>
            {a.strengths?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-green-700"><CheckCircle2 size={15} /> {uz ? 'Kuchli tomonlar' : 'Strengths'}</p>
                <ul className="space-y-1.5 text-sm leading-relaxed text-gray-700">
                  {a.strengths.map((s, i) => <li key={i} className="flex gap-2"><span className="text-gray-300">•</span><span>{s}</span></li>)}
                </ul>
              </div>
            )}
            {a.weaknesses?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-red-700"><AlertTriangle size={15} /> {uz ? 'Ustida ishlash kerak' : 'Needs work'}</p>
                <ul className="space-y-3 text-sm leading-relaxed">
                  {a.weaknesses.map((w, i) => (
                    <li key={i}>
                      <p className="font-bold text-gray-900">{w.skill} <span className="font-normal text-gray-500">— {w.evidence}</span></p>
                      <p className="text-gray-700">{w.fix}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {a.time && <p className="flex gap-2 text-sm leading-relaxed text-gray-700"><Timer size={15} className="mt-0.5 flex-shrink-0 text-gray-400" /> {a.time}</p>}
          {a.plan?.length > 0 && (
            <div className="rounded-2xl border border-blue-100 bg-white p-4">
              <p className="mb-2 text-sm font-bold text-gray-900">{uz ? '7 kunlik reja' : '7-day plan'}</p>
              <ol className="space-y-2 text-sm leading-relaxed text-gray-700">
                {a.plan.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <p className="text-xs text-gray-400">{uz ? "AI faqat shu sahifadagi raqamlardan foydalanadi. Raqamlar o'zgarmaguncha tahlil saqlanib turadi." : 'The AI uses only the numbers on this page. The analysis is kept until your numbers change.'}</p>
        </div>
      )}
    </section>
  )
}

// ── weakest skills ────────────────────────────────────────────────────────────
function practiceLink(s) {
  const subject = s.section === 'MATH' ? 'math' : 'english'
  return `/app/sat/practice?subject=${subject}&topic=${encodeURIComponent(s.topic)}`
}

function LowestSkills({ skills }) {
  if (!skills.length) return <Empty>Answer a few questions with topics and your weakest skills will appear here.</Empty>
  return (
    <ol className="divide-y divide-slate-100">
      {skills.map((s, i) => (
        <li key={`${s.section}-${s.topic}`} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[3rem_minmax(0,1fr)_10rem_5.5rem_auto]">
          <span className="text-2xl font-bold tabular-nums text-gray-300">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
              <BandTag pct={s.accuracy} />
              <span>· {s.section_label}</span>
              <span>· {s.correct}/{s.attempts} correct</span>
            </p>
            <p className="mt-0.5 truncate font-semibold text-gray-900">{s.topic}</p>
          </div>
          <div className="hidden sm:block"><Meter pct={s.accuracy} /></div>
          <p className="text-right text-2xl font-bold text-gray-900">{s.accuracy}<span className="ml-0.5 text-sm font-medium text-gray-400">%</span></p>
          <Link to={practiceLink(s)} className="col-span-3 inline-flex items-center justify-end gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 sm:col-span-1">
            Practice <ArrowRight size={14} />
          </Link>
        </li>
      ))}
    </ol>
  )
}

// ── accuracy by topic (domain → skills) ───────────────────────────────────────
function DomainCard({ section }) {
  const [open, setOpen] = useState(null)
  return (
    <Card
      title={section.label}
      subtitle="Accuracy by topic"
      right={section.attempts > 0 && (
        <p className="text-right">
          <span className="text-2xl font-bold text-gray-900">{section.accuracy}%</span>
          <span className="block text-xs text-gray-400">{section.correct}/{section.attempts} correct</span>
        </p>
      )}
    >
      {section.attempts === 0 ? <Empty>No {section.label} questions in this period.</Empty> : (
        <ul className="space-y-1">
          {section.domains.map(d => {
            const isOpen = open === d.label
            const canOpen = d.skills.length > 0
            return (
              <li key={d.label}>
                <button type="button" disabled={!canOpen} onClick={() => setOpen(isOpen ? null : d.label)} aria-expanded={isOpen}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_7rem_3.5rem_1rem] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${canOpen ? 'hover:bg-slate-50' : ''}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900" title={d.label}>{d.label}</span>
                    <span className="text-xs text-gray-400">{d.attempts ? `${d.correct}/${d.attempts} correct` : 'Not practised yet'}</span>
                  </span>
                  <Meter pct={d.accuracy} />
                  <span className="text-right text-lg font-bold text-gray-900">{d.accuracy == null ? '—' : `${d.accuracy}%`}</span>
                  {canOpen ? <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} /> : <span />}
                </button>
                {isOpen && (
                  <ul className="mb-2 ml-2 space-y-1 border-l-2 border-slate-100 pl-3">
                    {d.skills.map(s => (
                      <li key={s.topic} className="grid grid-cols-[minmax(0,1fr)_5rem_3rem] items-center gap-3 py-1.5 text-sm">
                        <Link to={practiceLink(s)} className="min-w-0 truncate text-gray-700 hover:text-blue-700 hover:underline">{s.topic}</Link>
                        <span className="text-right text-xs text-gray-400">{s.correct}/{s.attempts}</span>
                        <span className="text-right font-semibold text-gray-900">{s.accuracy}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ── difficulty: accuracy + pace, as a small table ─────────────────────────────
function DifficultyCard({ label, rows }) {
  const any = rows.some(r => r.attempts)
  const maxSec = Math.max(1, ...rows.map(r => r.avg_seconds || 0))
  return (
    <Card title={label} subtitle="Accuracy and pace by difficulty">
      {!any ? <Empty>No {label} questions in this period.</Empty> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-400">
              <th className="pb-2 font-medium">Difficulty</th>
              <th className="pb-2 font-medium">Accuracy</th>
              <th className="pb-2 pl-4 font-medium">Avg time / question</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.difficulty} className="border-t border-slate-100">
                <td className="py-3 pr-3">
                  <span className="font-semibold text-gray-900">{DIFF_LABEL[r.difficulty]}</span>
                  <span className="block text-xs text-gray-400">{r.attempts ? `${r.correct}/${r.attempts} correct` : 'none yet'}</span>
                </td>
                <td className="w-[38%] py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1"><Meter pct={r.accuracy} /></div>
                    <span className="w-11 text-right font-bold tabular-nums text-gray-900">{r.accuracy == null ? '—' : `${r.accuracy}%`}</span>
                  </div>
                </td>
                <td className="w-[34%] py-3 pl-4">
                  {r.avg_seconds == null ? <span className="text-xs text-gray-400">no timing</span> : (
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1">
                        {/* pace: one hue — longer is just longer, not good or bad */}
                        <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max((r.avg_seconds / maxSec) * 100, 4)}%`, background: C.ENGLISH }} />
                      </div>
                      <span className="w-14 text-right font-bold tabular-nums text-gray-900">{fmtDur(r.avg_seconds)}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ── daily activity: stacked columns by subject ────────────────────────────────
// Long ranges are summed into weeks so a column is never a hair-line
function toWeeks(daily) {
  const out = []
  for (const d of daily) {
    const day = parseDay(d.date)
    const monday = new Date(day); monday.setDate(day.getDate() - ((day.getDay() + 6) % 7))
    const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
    let w = out[out.length - 1]
    if (!w || w.date !== key) { w = { date: key, english_seconds: 0, math_seconds: 0, english_questions: 0, math_questions: 0, questions: 0, correct: 0 }; out.push(w) }
    for (const k of ['english_seconds', 'math_seconds', 'english_questions', 'math_questions', 'questions', 'correct']) w[k] += d[k]
  }
  return out
}

function DailyChart({ daily: days, tip }) {
  const [metric, setMetric] = useState('questions')
  const [table, setTable] = useState(false)
  const H = 190
  const weekly = days.length > 92
  const daily = useMemo(() => (weekly ? toWeeks(days) : days), [days, weekly])
  const unit = weekly ? 'week' : 'day'
  const dayLabel = (iso) => (weekly ? `Week of ${fmtDay(iso)}` : fmtDay(iso, { weekday: 'short', month: 'short', day: 'numeric' }))
  const key = metric === 'questions' ? ['english_questions', 'math_questions'] : ['english_seconds', 'math_seconds']
  const totals = daily.map(d => d[key[0]] + d[key[1]])
  const max = Math.max(1, ...totals)
  const sum = totals.reduce((a, b) => a + b, 0)
  const avg = sum / daily.length
  const fmt = metric === 'questions' ? (v) => `${Math.round(v * 10) / 10}` : fmtDur
  const step = Math.ceil(daily.length / 8)
  const many = daily.length > 45

  return (
    <Card
      title={weekly ? 'Weekly study' : 'Daily study'}
      subtitle={`Stacked by subject. The line is your ${weekly ? 'weekly' : 'daily'} average.`}
      right={(
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs font-semibold">
            {[['questions', 'Questions'], ['time', 'Time']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMetric(k)}
                className={`rounded-lg px-3 py-1 transition ${metric === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          <button type="button" onClick={() => setTable(t => !t)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-slate-50">
            {table ? 'Chart' : 'Table'}
          </button>
        </div>
      )}
    >
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-2">
        <p><span className="text-3xl font-bold text-gray-900">{metric === 'questions' ? sum : fmtDur(sum)}</span> <span className="text-sm text-gray-500">in this period</span></p>
        <p><span className="text-3xl font-bold text-gray-900">{fmt(avg)}</span> <span className="text-sm text-gray-500">per {unit}</span></p>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.ENGLISH }} /> Reading &amp; Writing</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.MATH }} /> Math</span>
        </div>
      </div>

      {sum === 0 ? <Empty>{metric === 'time' ? 'No timed questions in this period (question-bank practice is not timed).' : 'No questions answered in this period.'}</Empty>
        : table ? (
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs text-gray-500">
                <tr><th className="px-3 py-2 font-medium">{weekly ? 'Week' : 'Day'}</th><th className="px-3 py-2 font-medium">Reading &amp; Writing</th><th className="px-3 py-2 font-medium">Math</th><th className="px-3 py-2 font-medium">Correct</th></tr>
              </thead>
              <tbody className="tabular-nums">
                {daily.filter(d => d.questions > 0).reverse().map(d => (
                  <tr key={d.date} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{dayLabel(d.date)}</td>
                    <td className="px-3 py-1.5">{metric === 'questions' ? d.english_questions : fmtDur(d.english_seconds)}</td>
                    <td className="px-3 py-1.5">{metric === 'questions' ? d.math_questions : fmtDur(d.math_seconds)}</td>
                    <td className="px-3 py-1.5">{d.correct}/{d.questions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <div className="relative" style={{ height: H }}>
              {/* average: a solid hairline, labelled */}
              {avg > 0 && (
                <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-gray-400" style={{ bottom: (avg / max) * H }}>
                  <span className="absolute right-0 -top-4 bg-white pl-1 text-[10px] font-medium text-gray-500">avg {fmt(avg)}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 border-t" style={{ borderColor: '#c3c2b7' }} />
              <div className="flex h-full items-end" style={{ gap: many ? 1 : 2 }}>
                {daily.map((d) => {
                  const e = d[key[0]], m = d[key[1]], total = e + m
                  const lines = [
                    { label: dayLabel(d.date) },
                    { color: C.ENGLISH, value: metric === 'questions' ? d.english_questions : fmtDur(d.english_seconds), label: 'Reading & Writing' },
                    { color: C.MATH, value: metric === 'questions' ? d.math_questions : fmtDur(d.math_seconds), label: 'Math' },
                    { value: d.questions ? `${d.correct}/${d.questions}` : '0', label: 'correct' },
                  ]
                  return (
                    <div key={d.date} tabIndex={0} aria-label={`${dayLabel(d.date)}: ${d.questions} questions, ${d.correct} correct`}
                      onMouseEnter={(ev) => tip.show(ev, lines)} onMouseLeave={tip.hide} onFocus={(ev) => tip.show(ev, lines)} onBlur={tip.hide}
                      className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end outline-none hover:bg-slate-50 focus-visible:bg-slate-100">
                      {total > 0 && (
                        <div className="flex w-full max-w-[24px] flex-col overflow-hidden rounded-t-[4px] transition group-hover:brightness-110" style={{ height: `${(total / max) * 100}%`, gap: e && m ? 2 : 0 }}>
                          {m > 0 && <div style={{ flex: m, background: C.MATH }} />}
                          {e > 0 && <div style={{ flex: e, background: C.ENGLISH }} />}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="mt-1.5 flex" style={{ gap: many ? 1 : 2 }}>
              {daily.map((d, i) => (
                <div key={d.date} className="relative h-4 min-w-0 flex-1">
                  {i % step === 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-gray-400">{fmtDay(d.date, { month: 'numeric', day: 'numeric' })}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
    </Card>
  )
}

// ── part-to-whole: one stacked bar + labelled rows ────────────────────────────
function ShareCard({ title, subtitle, rows, colorOf }) {
  const total = rows.reduce((a, r) => a + r.questions, 0)
  const shown = rows.filter(r => r.questions > 0)
  return (
    <Card title={title} subtitle={subtitle}>
      {total === 0 ? <Empty>Nothing in this period yet.</Empty> : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full" style={{ gap: 2 }} role="img"
            aria-label={shown.map(r => `${r.label} ${Math.round((r.questions / total) * 100)}%`).join(', ')}>
            {shown.map(r => <div key={r.key} style={{ flex: r.questions, background: colorOf(r.key) }} />)}
          </div>
          <ul className="mt-4 space-y-2.5">
            {rows.map(r => (
              <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-center gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: colorOf(r.key) }} />
                  <span className="truncate font-medium text-gray-800">{r.label}</span>
                </span>
                <span className="text-right text-gray-500">
                  <span className="font-bold text-gray-900">{r.questions}</span> questions{r.seconds > 0 ? ` · ${fmtDur(r.seconds)}` : ''}
                </span>
                <span className="text-right font-bold tabular-nums text-gray-900">{Math.round((r.questions / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

// ── time of day: one series, the peak is the point ────────────────────────────
function HoursChart({ hours, peak, tip }) {
  const max = Math.max(1, ...hours)
  const total = hours.reduce((a, b) => a + b, 0)
  return (
    <Card
      title="Most active time of day"
      subtitle="Questions answered by hour"
      right={peak != null && total > 0 && <p className="text-sm text-gray-500">Peak: <span className="font-bold text-gray-900">{fmtHour(peak)}–{fmtHour((peak + 1) % 24)}</span></p>}
    >
      {total === 0 ? <Empty>No activity in this period.</Empty> : (
        <div>
          <div className="relative flex items-end" style={{ height: 150, gap: 2 }}>
            <div className="absolute inset-x-0 bottom-0 border-t" style={{ borderColor: '#c3c2b7' }} />
            {hours.map((n, h) => {
              const lines = [{ label: `${fmtHour(h)}–${fmtHour((h + 1) % 24)}` }, { value: n, label: n === 1 ? 'question' : 'questions' }]
              return (
                <div key={h} tabIndex={0} aria-label={`${fmtHour(h)}: ${n} questions`}
                  onMouseEnter={(e) => tip.show(e, lines)} onMouseLeave={tip.hide} onFocus={(e) => tip.show(e, lines)} onBlur={tip.hide}
                  className="flex h-full min-w-0 flex-1 items-end justify-center outline-none hover:bg-slate-50 focus-visible:bg-slate-100">
                  {n > 0 && <div className="w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${Math.max((n / max) * 100, 3)}%`, background: h === peak ? C.ENGLISH : C.soft }} />}
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex" style={{ gap: 2 }}>
            {hours.map((_, h) => (
              <div key={h} className="relative h-4 min-w-0 flex-1">
                {h % 6 === 0 && <span className="absolute left-0 whitespace-nowrap text-[10px] text-gray-400">{fmtHour(h)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── sittings ──────────────────────────────────────────────────────────────────
function Sessions({ sessions }) {
  if (!sessions.length) {
    return (
      <div className="py-8 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-gray-500"><Clock size={18} /></span>
        <p className="font-semibold text-gray-900">No study sessions in the last 7 days</p>
        <p className="mt-1 text-sm text-gray-500">Do a few questions and your sittings will show up here automatically.</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map(s => {
        const d = new Date(s.start)
        return (
          <li key={s.start} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_6rem_5rem_4rem]">
            <p className="font-semibold text-gray-900">
              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              <span className="ml-2 font-normal text-gray-500">{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            </p>
            <p className="hidden truncate text-sm text-gray-500 sm:block">{s.sections.join(' · ')}</p>
            <p className="text-right text-sm text-gray-600"><span className="font-bold text-gray-900">{s.questions}</span> questions</p>
            <p className="text-right text-sm text-gray-600">{fmtDur(s.seconds)}</p>
            <p className="text-right font-bold tabular-nums text-gray-900">{s.accuracy}%</p>
          </li>
        )
      })}
    </ul>
  )
}

// ── all-time activity calendar: one hue, light → dark ─────────────────────────
function Heatmap({ activity, tip }) {
  const months = useMemo(() => {
    const out = []
    const start = parseDay(activity.start), end = parseDay(activity.end)
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      const y = cur.getFullYear(), m = cur.getMonth()
      const lead = (new Date(y, m, 1).getDay() + 6) % 7   // Monday first
      const cells = Array(lead).fill(null)
      const last = new Date(y, m + 1, 0).getDate()
      for (let d = 1; d <= last; d++) {
        const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const date = new Date(y, m, d)
        cells.push({ iso, n: activity.days[iso] || 0, out: date < start || date > end })
      }
      out.push({ label: cur.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), cells })
      cur = new Date(y, m + 1, 1)
    }
    return out
  }, [activity])
  // On a narrow screen the calendar scrolls — open it on the newest month
  const scroller = useRef(null)
  useEffect(() => { const el = scroller.current; if (el) el.scrollLeft = el.scrollWidth }, [months.length])
  const max = Math.max(1, ...Object.values(activity.days))
  // four steps relative to the busiest day, so a light month is still readable
  const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))

  return (
    <Card
      title="Your practice activity"
      subtitle={activity.most_active_weekday ? <>Most active: <span className="font-bold text-blue-700">{activity.most_active_weekday}</span></> : 'All-time, independent of the date range above'}
      right={<p className="text-right"><span className="text-3xl font-bold text-gray-900">{activity.all_time_questions}</span> <span className="text-sm text-gray-500">questions answered</span></p>}
    >
      <div ref={scroller} className="flex gap-6 overflow-x-auto pb-1">
        {months.map(m => (
          <div key={m.label} className="flex-shrink-0">
            <p className="mb-1.5 text-sm font-semibold text-gray-800">{m.label}</p>
            <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-gray-400">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <span key={d} className="w-[22px]">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {m.cells.map((c, i) => {
                if (!c) return <span key={i} className="h-[22px] w-[22px]" />
                const lines = [{ label: fmtDay(c.iso, { weekday: 'short', month: 'short', day: 'numeric' }) }, { value: c.n, label: c.n === 1 ? 'question' : 'questions' }]
                return (
                  <span key={c.iso} tabIndex={c.out ? -1 : 0} aria-label={`${fmtDay(c.iso)}: ${c.n} questions`}
                    onMouseEnter={(e) => !c.out && tip.show(e, lines)} onMouseLeave={tip.hide} onFocus={(e) => !c.out && tip.show(e, lines)} onBlur={tip.hide}
                    className={`h-[22px] w-[22px] rounded-[5px] outline-none transition ${c.out ? 'opacity-30' : 'hover:ring-2 hover:ring-gray-900/30 focus-visible:ring-2 focus-visible:ring-gray-900/50'}`}
                    style={{ background: C.heat[level(c.n)] }} />
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
        Less {C.heat.map(h => <span key={h} className="h-3.5 w-3.5 rounded-[4px]" style={{ background: h }} />)} More
      </div>
    </Card>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function SATAnalytics() {
  const [range, setRange] = useState('30d')
  const tip = useTooltip()
  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: ['sat-analytics', range],
    queryFn: () => api.get(`/sat/analytics/?range=${range}`).then(r => r.data),
    placeholderData: (prev) => prev,   // keep the frame while a new range loads
  })

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 size={26} className="text-gray-400" />
          {/* the only text that sits on the page itself — follow the site theme */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        </div>
        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 text-sm font-semibold" role="group" aria-label="Date range">
          {RANGES.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setRange(k)} aria-pressed={range === k}
              className={`rounded-xl px-3.5 py-1.5 transition ${range === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-slate-50'}`}>{l}</button>
          ))}
        </div>
      </div>

      {error && !data ? (
        <Card><Empty>Could not load your analytics. Please refresh the page.</Empty></Card>
      ) : isLoading && !data ? (
        <div className="space-y-5">
          <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(8)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          <AICard range={range} attempted={data.totals.attempted} />

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Target} label="Questions attempted" value={data.totals.attempted} hint={`${data.totals.active_days} active day${data.totals.active_days === 1 ? '' : 's'}`} />
            <Stat icon={BarChart3} label="Accuracy" value={data.totals.accuracy == null ? '—' : `${data.totals.accuracy}%`} hint={data.totals.attempted ? `${data.totals.correct} of ${data.totals.attempted} correct` : 'no questions yet'} />
            <Stat icon={CheckCircle2} label="Correct" value={data.totals.correct} tone="text-green-600" />
            <Stat icon={XCircle} label="Wrong" value={data.totals.wrong} tone="text-red-500" />
            <Stat icon={Clock} label="Time on questions" value={fmtDur(data.totals.total_seconds)} hint="tests and modules only" />
            <Stat icon={Timer} label="Avg time / question" value={data.totals.avg_seconds == null ? '—' : fmtDur(data.totals.avg_seconds)} />
            <Stat icon={Bookmark} label="Saved questions" value={data.totals.saved} hint="all time" />
            <Stat icon={Flame} label="Study streak" value={data.totals.streak} hint={data.totals.streak === 1 ? 'day in a row' : 'days in a row'} tone="text-orange-500" />
          </div>

          <Card title="5 lowest-accuracy skills" subtitle="Skills with at least 3 attempts, weakest first" right={<BandLegend />}>
            <LowestSkills skills={data.lowest_skills} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <DomainCard section={data.sections.ENGLISH} />
            <DomainCard section={data.sections.MATH} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <DifficultyCard label="Reading & Writing" rows={data.difficulty.ENGLISH} />
            <DifficultyCard label="Math" rows={data.difficulty.MATH} />
          </div>

          <DailyChart daily={data.daily} tip={tip} />

          <div className="grid gap-5 lg:grid-cols-2">
            <ShareCard title="By subject" subtitle="Where your questions went" rows={data.by_subject} colorOf={(k) => C[k]} />
            <ShareCard title="By activity" subtitle="How you practised" rows={data.by_activity} colorOf={(k) => C.act[k]} />
          </div>

          <HoursChart hours={data.hours} peak={data.peak_hour} tip={tip} />

          <Card title="Study sessions" subtitle="Auto-detected from your practice in the last 7 days">
            <Sessions sessions={data.sessions} />
          </Card>

          <p className="flex items-center gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400"><CalendarDays size={15} /> All-time activity, independent of the selected date range.</p>
          <Heatmap activity={data.activity} tip={tip} />
        </div>
      )}
      {tip.node}
    </div>
  )
}
