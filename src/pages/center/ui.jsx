/**
 * Small building blocks shared by the center screens, so the director,
 * admin, teacher and student pages look like one product: white cards on a
 * slate background, one dark primary button, and the same five state colors
 * everywhere (done / late / partial / missed / pending).
 */
import { motion } from 'framer-motion'
import { examTint } from './taskTypes'

export const STATE = {
  done:    { label: 'Done',     dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50', cell: 'bg-emerald-500' },
  late:    { label: 'Late',     dot: 'bg-amber-400',   text: 'text-amber-700',   soft: 'bg-amber-50',   cell: 'bg-amber-400' },
  partial: { label: 'Started',  dot: 'bg-sky-400',     text: 'text-sky-700',     soft: 'bg-sky-50',     cell: 'bg-sky-300' },
  missed:  { label: 'Missed',   dot: 'bg-rose-500',    text: 'text-rose-700',    soft: 'bg-rose-50',    cell: 'bg-rose-400' },
  pending: { label: 'To do',    dot: 'bg-slate-300',   text: 'text-slate-500',   soft: 'bg-slate-50',   cell: 'bg-slate-200' },
}

export function ago(iso) {
  if (!iso) return 'never'
  const mins = Math.round((Date.now() - new Date(iso)) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function dayLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - d) / 86_400_000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff === -1) return 'Tomorrow'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

const AVATAR_TONES = ['bg-indigo-50 text-indigo-600', 'bg-emerald-50 text-emerald-600', 'bg-amber-50 text-amber-700',
  'bg-rose-50 text-rose-600', 'bg-sky-50 text-sky-600', 'bg-violet-50 text-violet-600']

export function Avatar({ name, size = 'w-8 h-8 text-[11px]' }) {
  const tone = AVATAR_TONES[(name || '').length % AVATAR_TONES.length]
  return (
    <span className={`${size} ${tone} rounded-full font-bold flex items-center justify-center flex-shrink-0`}>
      {initials(name)}
    </span>
  )
}

export function Card({ className = '', children, ...rest }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/70 ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function CardTitle({ icon: Icon, children, right, tone = 'text-slate-400' }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        {Icon && <Icon size={15} className={tone} />}{children}
      </h2>
      {right}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold text-slate-900 truncate">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function PrimaryButton({ icon: Icon, children, className = '', ...rest }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-50 transition-colors ${className}`}
      {...rest}
    >
      {Icon && <Icon size={15} />}{children}
    </button>
  )
}

export function Stat({ label, value, sub, tone = 'text-slate-900', index = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl border border-slate-200/70 p-5"
    >
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${tone}`}>{value}</p>
      {children}
      {sub && <p className="mt-1.5 text-xs text-slate-400">{sub}</p>}
    </motion.div>
  )
}

export function Bar({ value, tone }) {
  const v = Math.max(0, Math.min(100, value || 0))
  const color = tone || (v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-sky-500' : 'bg-amber-400')
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${v}%` }} />
    </div>
  )
}

export function Progress({ done, total, rate }) {
  if (!total) return <span className="text-xs text-slate-300">No tasks</span>
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div className="flex-1"><Bar value={rate} /></div>
      <span className="text-xs font-semibold text-slate-600 tabular-nums w-10 text-right">{done}/{total}</span>
    </div>
  )
}

export function StateBadge({ state }) {
  const s = STATE[state] || STATE.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.soft} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  )
}

export function ResultChip({ type, detail }) {
  if (!detail) return null
  if (detail === 'Being scored') {
    return <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-500 bg-slate-50 ring-1 ring-slate-100">Being scored…</span>
  }
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 ${examTint(type).chip}`}>{detail}</span>
}

/** Tiny column chart: [{label, value, title, display?}] with values 0–100 (or null). */
export function Columns({ data, height = 96, tone = 'bg-indigo-500', empty = 'bg-slate-100' }) {
  const max = Math.max(100, ...data.map((d) => d.value || 0))
  return (
    <div className="flex gap-1.5" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0" title={d.title}>
          <div className="w-full flex-1 flex flex-col justify-end">
            {d.value != null && (
              <span className="mb-1 text-[10px] font-semibold text-slate-500 text-center tabular-nums">{d.display ?? `${d.value}%`}</span>
            )}
            <motion.div
              initial={{ height: 0 }} animate={{ height: `${d.value == null ? 4 : Math.max(4, (d.value / max) * 100)}%` }}
              transition={{ duration: 0.5, delay: i * 0.03 }}
              className={`w-full rounded-md ${d.value == null ? empty : tone}`}
            />
          </div>
          <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

export function Tabs({ tabs, value, onChange, id = 'tabs' }) {
  return (
    <div className="flex gap-1 px-3 pt-3 border-b border-slate-100 overflow-x-auto">
      {tabs.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`relative px-3 pb-2.5 pt-1 text-sm font-semibold whitespace-nowrap transition-colors ${
            value === t.key ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}>
          {t.label}{t.count != null && <span className="ml-1 text-xs font-medium text-slate-300">{t.count}</span>}
          {value === t.key && <motion.span layoutId={id} className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-slate-900" />}
        </button>
      ))}
    </div>
  )
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="py-14 text-center">
      {Icon && <Icon size={32} className="mx-auto mb-3 text-slate-200" />}
      <p className="font-semibold text-slate-600">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export const weekLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
