import { Crown } from 'lucide-react'
import { SECTION_LABEL } from './format'

const SECTION_BADGE = {
  SAT: 'bg-sky-100 text-sky-700',
  IELTS: 'bg-violet-100 text-violet-700',
  CEFR: 'bg-emerald-100 text-emerald-700',
  FULL: 'bg-amber-100 text-amber-700',
}

export function SectionBadge({ section }) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${SECTION_BADGE[section] || 'bg-gray-100 text-gray-600'}`}>
      {SECTION_LABEL[section] || section}
    </span>
  )
}

export function UserCell({ user, online }) {
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase()
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="relative w-8 h-8 rounded-full bg-sky-50 text-sky-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
        {initial}
        {online && <span title="Online" className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-1">
          <span className="truncate">{user.name}</span>
          {user.is_premium && <Crown size={12} className="text-amber-500 flex-shrink-0" aria-label="Premium" />}
        </p>
        <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
      </div>
    </div>
  )
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Segmented({ value, options, onChange }) {
  return (
    <div className="flex gap-1" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            value === o.value ? 'bg-sky-50 text-sky-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function RowsSkeleton({ rows = 4 }) {
  return (
    <div className="p-5 space-y-3">
      {[...Array(rows)].map((_, i) => <div key={i} className="h-9 bg-gray-50 rounded-lg animate-pulse" />)}
    </div>
  )
}
