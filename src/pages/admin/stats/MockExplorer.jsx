import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import api from '../../../api/client'
import { SECTION_LABEL, timeAgo } from './format'
import { Panel, RowsSkeleton, Segmented, UserCell } from './shared'

const SECTIONS = ['SAT', 'IELTS', 'CEFR', 'FULL'].map((value) => ({ value, label: SECTION_LABEL[value] }))
const COLLAPSED_ROWS = 10

function AttemptsDrawer({ section, mock, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-mock-attempts', section, mock.id],
    queryFn: () => api.get(`/system/mocks/${section}/${mock.id}/`).then((r) => r.data),
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
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm truncate">{mock.label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {mock.unique_users} users · {mock.completed} completed of {mock.started} started
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
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

export default function MockExplorer() {
  const [section, setSection] = useState('SAT')
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
    return needle ? all.filter((m) => m.label.toLowerCase().includes(needle)) : all
  }, [data, search])

  const taken = (data?.results ?? []).filter((m) => m.started > 0).length
  const visible = showAll || search ? rows : rows.slice(0, COLLAPSED_ROWS)
  const hasScore = section !== 'FULL'

  const changeSection = (next) => {
    setSection(next)
    setShowAll(false)
    setSearch('')
  }

  return (
    <Panel
      title="Who took which mock"
      subtitle={data ? `${taken} of ${data.results.length} mocks taken at least once · click a row for the people` : 'Each user counted once per mock'}
      action={<Segmented value={section} options={SECTIONS} onChange={changeSection} />}
    >
      <div className="px-5 py-3 border-b border-gray-50">
        <label className="relative block max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search mocks"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-sky-400"
          />
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
                {['Mock', 'Users', 'Finished by', 'Attempts', hasScore && 'Avg score', 'Last taken'].filter(Boolean).map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map((m) => (
                <tr
                  key={m.id}
                  tabIndex={0}
                  onClick={() => setSelected(m)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelected(m) }}
                  className="cursor-pointer hover:bg-sky-50/30 focus:bg-sky-50/30 focus:outline-none transition-colors"
                >
                  <td className="px-4 py-3 max-w-[320px]">
                    <p className="font-semibold text-gray-800 truncate">{m.label}</p>
                    {m.type && <p className="text-[11px] text-gray-400">{m.type}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">{m.unique_users}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.completed_users}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{m.started}</td>
                  {hasScore && (
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                      {m.avg_score == null ? '—' : section === 'CEFR' ? `${Math.round(m.avg_score)}%` : section === 'SAT' ? Math.round(m.avg_score) : m.avg_score}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{timeAgo(m.last_taken)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        {selected && <AttemptsDrawer section={section} mock={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </Panel>
  )
}
