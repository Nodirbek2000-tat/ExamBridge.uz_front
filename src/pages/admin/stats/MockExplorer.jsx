import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import api from '../../../api/client'
import { SECTION_LABEL, timeAgo } from './format'
import { Panel, RowsSkeleton, SectionBadge, Segmented, UserCell } from './shared'

const ALL = 'ALL'
const SECTIONS = [
  { value: ALL, label: 'All' },
  ...['SAT', 'IELTS', 'CEFR', 'FULL'].map((value) => ({ value, label: SECTION_LABEL[value] })),
]
const SORTS = {
  users: { label: 'Most users', key: (m) => [m.unique_users, m.started] },
  finished: { label: 'Most finished', key: (m) => [m.completed, m.unique_users] },
  today: { label: 'Most today', key: (m) => [m.started_today, m.completed_today] },
}
const COLLAPSED_ROWS = 10

function scoreText(m) {
  if (m.avg_score == null) return '—'
  if (m.section === 'CEFR') return `${Math.round(m.avg_score)}%`
  if (m.section === 'SAT') return Math.round(m.avg_score)
  return m.avg_score
}

function Figure({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-lg font-black text-gray-900 leading-tight tabular-nums">{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  )
}

function AttemptsDrawer({ mock, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-mock-attempts', mock.section, mock.id],
    queryFn: () => api.get(`/system/mocks/${mock.section}/${mock.id}/`).then((r) => r.data),
  })

  return (
    <Motion.div
      className="fixed inset-0 z-50 bg-black/30 flex justify-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <Motion.aside
        role="dialog"
        aria-label={mock.label}
        className="w-full max-w-md h-full bg-white shadow-xl flex flex-col"
        initial={{ x: 40 }} animate={{ x: 0 }} exit={{ x: 40 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SectionBadge section={mock.section} />
              <h3 className="mt-1 font-bold text-gray-900 text-sm truncate">{mock.label}</h3>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">All time</p>
            <div className="grid grid-cols-4 gap-2">
              <Figure label="Users" value={mock.unique_users} />
              <Figure label="Started" value={mock.started} />
              <Figure label="Finished" value={mock.completed} />
              <Figure label="Finish rate" value={mock.started ? `${Math.round((mock.completed / mock.started) * 100)}%` : '—'} />
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Today</p>
            <div className="grid grid-cols-4 gap-2">
              <Figure label="Started" value={mock.started_today} />
              <Figure label="Finished" value={mock.completed_today} />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? <RowsSkeleton rows={6} /> : error ? (
            <p className="p-5 text-sm text-red-500">Failed to load: {error.message}</p>
          ) : !data.results.length ? (
            <p className="p-8 text-center text-sm text-gray-400">Nobody has taken this mock yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.results.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1"><UserCell user={a.user} /></div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">
                      {a.status === 'COMPLETED' ? (a.score ?? 'Done') : <span className="text-xs font-semibold text-gray-400">Not finished</span>}
                    </p>
                    <p className="text-[11px] text-gray-400">{timeAgo(a.finished_at || a.started_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data?.count > data?.results.length && (
            <p className="px-5 py-3 text-center text-[11px] text-gray-400">
              Showing the latest {data.results.length} of {data.count}.
            </p>
          )}
        </div>
      </Motion.aside>
    </Motion.div>
  )
}

function byKey(key) {
  return (a, b) => {
    const [a1, a2] = key(a)
    const [b1, b2] = key(b)
    return b1 - a1 || b2 - a2
  }
}

export default function MockExplorer() {
  const [section, setSection] = useState(ALL)
  const [sort, setSort] = useState('users')
  const [search, setSearch] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-mock-stats', section],
    queryFn: () => api.get('/system/mocks/', { params: { section } }).then((r) => r.data),
    staleTime: 60_000,
  })

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const all = data?.results ?? []
    const found = needle ? all.filter((m) => m.label.toLowerCase().includes(needle)) : all
    return [...found].sort(byKey(SORTS[sort].key))
  }, [data, search, sort])

  const results = data?.results ?? []
  const taken = results.filter((m) => m.started > 0).length
  const startedToday = results.reduce((sum, m) => sum + m.started_today, 0)
  const finishedToday = results.reduce((sum, m) => sum + m.completed_today, 0)
  const visible = showAll || search ? rows : rows.slice(0, COLLAPSED_ROWS)
  const mixed = section === ALL

  const changeSection = (next) => {
    setSection(next)
    setShowAll(false)
    setSearch('')
  }

  const columns = ['Mock', mixed && 'Exam', 'Users', 'Finished by', 'Started', 'Finished', 'Today', 'Avg score', 'Last taken'].filter(Boolean)

  return (
    <Panel
      title="Which mocks are taken"
      subtitle={data
        ? `${taken} of ${results.length} mocks taken at least once · today ${startedToday} started, ${finishedToday} finished · click a row for the people`
        : 'Each user counted once per mock'}
      action={<Segmented value={section} options={SECTIONS} onChange={changeSection} />}
    >
      <div className="px-5 py-3 border-b border-gray-50 flex flex-wrap items-center gap-3">
        <label className="relative block w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mocks"
            className="w-full pl-8 pr-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-400"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold"
          >
            {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
          </select>
        </label>
      </div>

      {isLoading ? <RowsSkeleton rows={5} /> : error ? (
        <p className="px-5 py-6 text-sm text-red-500">Failed to load: {error.message}</p>
      ) : !rows.length ? (
        <p className="py-8 text-center text-sm text-gray-400">No mocks found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70">
                {columns.map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${i > (mixed ? 1 : 0) ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((m) => (
                <tr
                  key={`${m.section}-${m.id}`}
                  tabIndex={0}
                  onClick={() => setSelected(m)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelected(m) }}
                  className="cursor-pointer hover:bg-sky-50/30 focus:bg-sky-50/30 focus:outline-none transition-colors"
                >
                  <td className="px-4 py-3 max-w-[300px]">
                    <p className="font-semibold text-gray-800 truncate">{m.label}</p>
                    {m.type && <p className="text-[11px] text-gray-400">{m.type}</p>}
                  </td>
                  {mixed && <td className="px-4 py-3"><SectionBadge section={m.section} /></td>}
                  <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">{m.unique_users}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.completed_users}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.started}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.completed}</td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    {m.started_today || m.completed_today ? (
                      <span className="font-semibold text-sky-700">{m.started_today} / {m.completed_today}</span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.section === 'FULL' ? '—' : scoreText(m)}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{timeAgo(m.last_taken)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-2 text-[11px] text-gray-400">Today: started / finished. "Started" counts every time someone opens the mock and begins it.</p>
        </div>
      )}

      {!search && rows.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="w-full py-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-50/50 border-t border-gray-50 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${rows.length}`}
        </button>
      )}

      <AnimatePresence>
        {selected && <AttemptsDrawer mock={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </Panel>
  )
}
