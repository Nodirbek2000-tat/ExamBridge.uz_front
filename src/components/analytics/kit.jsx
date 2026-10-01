/*
 * Shared pieces of the analytics pages (SAT, IELTS, CEFR).
 *
 * Colour: identity uses validated categorical slots (checked with the dataviz
 * validator); accuracy uses the reserved status colours and always carries a
 * word + icon, never colour alone; heat-maps are one hue, light → dark.
 * Charts are plain HTML — no chart library — so they stay light on slow phones.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react'

export const C = {
  s1: '#2a78d6',   // series 1 (blue)
  s2: '#eb6834',   // series 2 (orange)
  s3: '#1baf7a',   // series 3 (aqua)
  s4: '#4a3aa7',   // violet
  s5: '#eda100',   // yellow
  good: '#0ca30c',
  warn: '#fab219',
  bad: '#d03b3b',
  grid: '#e5e7eb',
  axis: '#c3c2b7',
  heat: ['#eef1f4', '#cde2fb', '#86b6ef', '#3987e5', '#184f95'],
  soft: '#c7dcf6',  // de-emphasised bars (same hue as the accent)
}
export const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['all', 'All time']]

// ── formatting ────────────────────────────────────────────────────────────────
export const fmtDur = (sec) => {
  const s = Math.round(sec || 0)
  if (s < 60) return `${s}s`
  if (s < 3600) return s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60}m`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}
export const fmtHour = (h) => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`
export const parseDay = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d) }
export const fmtDay = (iso, opts = { month: 'short', day: 'numeric' }) => parseDay(iso).toLocaleDateString('en-US', opts)
const isoOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const band = (pct) => (pct == null ? null : pct >= 85 ? 'good' : pct >= 60 ? 'warn' : 'bad')
export const BAND = {
  good: { label: 'Strong', color: C.good, Icon: CheckCircle2, text: 'text-green-700' },
  warn: { label: 'Okay', color: C.warn, Icon: TrendingUp, text: 'text-amber-700' },
  bad: { label: 'Needs work', color: C.bad, Icon: AlertTriangle, text: 'text-red-700' },
}

// ── motion ────────────────────────────────────────────────────────────────────
// Sections rise in as they enter the view — once, and not at all for reduced motion
export function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ── containers ────────────────────────────────────────────────────────────────
export function Card({ title, subtitle, right, children, className = '' }) {
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

export function Empty({ children }) {
  return <p className="rounded-2xl bg-slate-50 px-4 py-8 text-center text-sm text-gray-500">{children}</p>
}

export function RangePicker({ value, onChange }) {
  return (
    <div className="flex rounded-2xl border border-slate-200 bg-white/90 p-1 text-sm font-semibold backdrop-blur" role="group" aria-label="Date range">
      {RANGES.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-pressed={value === k}
          className={`rounded-xl px-3.5 py-1.5 transition ${value === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-slate-50'}`}>{l}</button>
      ))}
    </div>
  )
}

// One tooltip for the whole page; marks call show/hide. Text only — never HTML.
export function useTooltip() {
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

// ── accuracy ──────────────────────────────────────────────────────────────────
// The fill carries the state, the track is a light step of the same colour
export function Meter({ pct, height = 8 }) {
  const b = band(pct)
  const color = b ? BAND[b].color : C.grid
  return (
    <div className="w-full rounded-full" style={{ height, background: b ? `${color}26` : '#f1f5f9' }}
      role="img" aria-label={pct == null ? 'No data' : `${pct}%`}>
      {pct != null && <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 2)}%`, background: color }} />}
    </div>
  )
}

export function BandTag({ pct }) {
  const b = band(pct)
  if (!b) return <span className="text-xs text-gray-400">No data</span>
  const { label, Icon, text } = BAND[b]
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${text}`}><Icon size={12} /> {label}</span>
}

export function BandLegend() {
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

export function Stat({ icon: Icon, label, value, hint, tone = 'text-gray-400' }) {
  return (
    <div className="h-full rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <Icon size={16} className={tone} />
      </div>
      <p className="mt-1.5 text-3xl font-bold text-gray-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

/*
 * Ranked "weakest first" list. items: [{ key, title, meta: [string], accuracy,
 * correct, attempts, link, linkLabel }]
 */
export function WeakList({ items, emptyText }) {
  if (!items.length) return <Empty>{emptyText}</Empty>
  return (
    <ol className="divide-y divide-slate-100">
      {items.map((s, i) => (
        <li key={s.key} className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[3rem_minmax(0,1fr)_10rem_5.5rem_auto]">
          <span className="text-2xl font-bold tabular-nums text-gray-300">{String(i + 1).padStart(2, '0')}</span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
              <BandTag pct={s.accuracy} />
              {s.meta?.map(m => <span key={m}>· {m}</span>)}
              <span>· {s.correct}/{s.attempts} correct</span>
            </p>
            <p className="mt-0.5 truncate font-semibold text-gray-900" title={s.title}>{s.title}</p>
          </div>
          <div className="hidden sm:block"><Meter pct={s.accuracy} /></div>
          <p className="text-right text-2xl font-bold text-gray-900">{s.accuracy}<span className="ml-0.5 text-sm font-medium text-gray-400">%</span></p>
          <Link to={s.link} className="col-span-3 inline-flex items-center justify-end gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 sm:col-span-1">
            {s.linkLabel || 'Practice'} <ArrowRight size={14} />
          </Link>
        </li>
      ))}
    </ol>
  )
}

// ── stacked columns over time ─────────────────────────────────────────────────
// Long ranges are summed into weeks so a column is never a hair-line
export function toWeeks(rows) {
  const out = []
  for (const d of rows) {
    const day = parseDay(d.date)
    const monday = new Date(day); monday.setDate(day.getDate() - ((day.getDay() + 6) % 7))
    const key = isoOf(monday)
    let w = out[out.length - 1]
    if (!w || w.date !== key) { w = { date: key }; out.push(w) }
    for (const [k, v] of Object.entries(d)) if (k !== 'date' && typeof v === 'number') w[k] = (w[k] || 0) + v
  }
  return out
}

/*
 * rows:   [{ date, ...numbers }]  one per day
 * series: [{ key, label, color }]  stacked bottom → top
 * fmt:    value formatter (questions, seconds…)
 * extra:  (row) => tooltip lines added after the series
 */
export function StackedColumns({ rows, series, tip, fmt = (v) => `${Math.round(v * 10) / 10}`, extra, table = false, emptyText = 'Nothing in this period.', height = 190 }) {
  const weekly = rows.length > 92
  const data = useMemo(() => (weekly ? toWeeks(rows) : rows), [rows, weekly])
  const unit = weekly ? 'week' : 'day'
  const label = (iso) => (weekly ? `Week of ${fmtDay(iso)}` : fmtDay(iso, { weekday: 'short', month: 'short', day: 'numeric' }))
  const totals = data.map(d => series.reduce((a, s) => a + (d[s.key] || 0), 0))
  const max = Math.max(1, ...totals)
  const sum = totals.reduce((a, b) => a + b, 0)
  const avg = data.length ? sum / data.length : 0
  const step = Math.ceil(data.length / 8)
  const many = data.length > 45

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-2">
        <p><span className="text-3xl font-bold text-gray-900">{fmt(sum)}</span> <span className="text-sm text-gray-500">in this period</span></p>
        <p><span className="text-3xl font-bold text-gray-900">{fmt(avg)}</span> <span className="text-sm text-gray-500">per {unit}</span></p>
        {series.length > 1 && (
          <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-gray-600">
            {series.map(s => <span key={s.key} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}</span>)}
          </div>
        )}
      </div>
      {sum === 0 ? <Empty>{emptyText}</Empty> : table ? (
        <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs text-gray-500">
              <tr><th className="px-3 py-2 font-medium">{weekly ? 'Week' : 'Day'}</th>{series.map(s => <th key={s.key} className="px-3 py-2 font-medium">{s.label}</th>)}</tr>
            </thead>
            <tbody className="tabular-nums">
              {data.map((d, i) => ({ d, t: totals[i] })).filter(x => x.t > 0).reverse().map(({ d }) => (
                <tr key={d.date} className="border-t border-slate-100">
                  <td className="px-3 py-1.5">{label(d.date)}</td>
                  {series.map(s => <td key={s.key} className="px-3 py-1.5">{fmt(d[s.key] || 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
          <div className="relative" style={{ height }}>
            {avg > 0 && (
              <div className="pointer-events-none absolute inset-x-0 z-10 border-t border-gray-400" style={{ bottom: (avg / max) * height }}>
                <span className="absolute right-0 -top-4 bg-white pl-1 text-[10px] font-medium text-gray-500">avg {fmt(avg)}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 border-t" style={{ borderColor: C.axis }} />
            <div className="flex h-full items-end" style={{ gap: many ? 1 : 2 }}>
              {data.map((d, i) => {
                const total = totals[i]
                const lines = [{ label: label(d.date) }, ...series.map(s => ({ color: s.color, value: fmt(d[s.key] || 0), label: s.label })), ...(extra ? extra(d) : [])]
                const shown = series.filter(s => d[s.key] > 0)
                return (
                  <div key={d.date} tabIndex={0} aria-label={`${label(d.date)}: ${fmt(total)}`}
                    onMouseEnter={(ev) => tip.show(ev, lines)} onMouseLeave={tip.hide} onFocus={(ev) => tip.show(ev, lines)} onBlur={tip.hide}
                    className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end outline-none hover:bg-slate-50 focus-visible:bg-slate-100">
                    {total > 0 && (
                      <div className="flex w-full max-w-[24px] flex-col-reverse overflow-hidden rounded-t-[4px] transition group-hover:brightness-110"
                        style={{ height: `${(total / max) * 100}%`, gap: shown.length > 1 ? 2 : 0 }}>
                        {shown.map(s => <div key={s.key} style={{ flex: d[s.key], background: s.color }} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="mt-1.5 flex" style={{ gap: many ? 1 : 2 }}>
            {data.map((d, i) => (
              <div key={d.date} className="relative h-4 min-w-0 flex-1">
                {i % step === 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] tabular-nums text-gray-400">{fmtDay(d.date, { month: 'numeric', day: 'numeric' })}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── all-time activity calendar: one hue, light → dark ─────────────────────────
export function Heatmap({ activity, tip, unit = 'questions', total, totalLabel = 'questions answered' }) {
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
        const date = new Date(y, m, d)
        const iso = isoOf(date)
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
  const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const one = unit.replace(/s$/, '')

  return (
    <Card
      title="Your practice activity"
      subtitle={activity.most_active_weekday ? <>Most active: <span className="font-bold text-blue-700">{activity.most_active_weekday}</span></> : 'All-time, independent of the date range above'}
      right={<p className="text-right"><span className="text-3xl font-bold text-gray-900">{total ?? activity.all_time_questions}</span> <span className="text-sm text-gray-500">{totalLabel}</span></p>}
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
                const lines = [{ label: fmtDay(c.iso, { weekday: 'short', month: 'short', day: 'numeric' }) }, { value: c.n, label: c.n === 1 ? one : unit }]
                return (
                  <span key={c.iso} tabIndex={c.out ? -1 : 0} aria-label={`${fmtDay(c.iso)}: ${c.n} ${unit}`}
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
