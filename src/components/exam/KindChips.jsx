// "All · Full Mock · Part 1 … Part N" filter chips with counts (CEFR reading/listening lists).

const TONES = {
  sky: 'bg-sky-500 border-sky-500 text-white shadow-sm shadow-sky-500/25',
  violet: 'bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/25',
}

export function kindChips(partTotal, fullLabel = 'Full Mock') {
  return [
    { key: 'ALL', label: 'All' },
    { key: 'FULL', label: fullLabel },
    ...Array.from({ length: partTotal }, (_, i) => ({ key: String(i + 1), label: `Part ${i + 1}` })),
  ]
}

export function countKinds(items, kindOf) {
  const counts = { ALL: items.length }
  items.forEach((item) => { const k = kindOf(item); counts[k] = (counts[k] || 0) + 1 })
  return counts
}

export default function KindChips({ kinds, value, onChange, counts, loading, tone = 'sky' }) {
  return (
    <div className="flex gap-2 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Test type">
      {kinds.map(({ key, label }) => {
        const active = value === key
        const count = counts[key] || 0
        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap flex-shrink-0 transition ${
              active
                ? TONES[tone]
                : `bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 ${count ? 'text-gray-700' : 'text-gray-400'}`
            }`}
          >
            {label}
            <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${
              active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {loading ? '·' : count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
