import { partOf } from './partOf'

/**
 * "Barcha partlar · Part 1 (12) · Part 2 (9) …" — shown when the list has more
 * than one part. `value` is a part number or null for all of them.
 */
export default function PartFilter({ items, value, onChange, label = 'Part' }) {
  const counts = {}
  for (const item of items) {
    const part = partOf(item)
    if (part != null) counts[part] = (counts[part] || 0) + 1
  }
  const parts = Object.keys(counts).map(Number).sort((a, b) => a - b)
  if (parts.length < 2) return null

  const chip = (active) => `px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
    active ? 'bg-sky-500 text-white' : 'text-gray-500 hover:bg-sky-50 hover:text-sky-600'
  }`

  return (
    <div className="flex gap-0.5 bg-white rounded-xl p-1 border border-gray-100 shadow-sm overflow-x-auto" role="group" aria-label={`${label} filter`}>
      <button type="button" onClick={() => onChange(null)} className={chip(value == null)}>
        Barcha {label.toLowerCase()}lar
      </button>
      {parts.map((part) => (
        <button key={part} type="button" onClick={() => onChange(part)} className={chip(value === part)}>
          {label} {part} <span className={value === part ? 'text-white/80' : 'text-gray-400'}>({counts[part]})</span>
        </button>
      ))}
    </div>
  )
}
