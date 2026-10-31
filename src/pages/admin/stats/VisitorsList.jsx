import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import api from '../../../api/client'
import { timeAgo } from './format'
import { Panel, RowsSkeleton, SectionBadge, UserCell } from './shared'

const SEARCH_DELAY_MS = 300

export default function VisitorsList() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(input.trim())
      setPage(1)
    }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [input])

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-visitors', q, page],
    queryFn: () => api.get('/system/visitors/', { params: { q, page } }).then((r) => r.data),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  return (
    <Panel
      title="Who is coming in"
      subtitle={data ? `${data.count.toLocaleString()} users, most recent first` : 'Most recent first'}
      action={(
        <label className="relative block w-full sm:w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-sky-400"
          />
        </label>
      )}
    >
      {isLoading ? <RowsSkeleton rows={6} /> : error ? (
        <p className="px-5 py-6 text-sm text-red-500">Failed to load: {error.message}</p>
      ) : !data.results.length ? (
        <p className="py-8 text-center text-sm text-gray-400">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/70">
                {['User', 'Last seen', 'Days visited', 'Tests done', 'Last test', 'Joined'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.results.map((u) => (
                <tr key={u.id} className="hover:bg-sky-50/20 transition-colors">
                  <td className="px-4 py-2.5 max-w-[260px]"><UserCell user={u} online={u.online} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{u.online ? 'Online' : timeAgo(u.last_seen)}</td>
                  <td className="px-4 py-2.5 text-gray-600 tabular-nums">{u.visit_days}</td>
                  <td className="px-4 py-2.5 font-semibold text-gray-800 tabular-nums">{u.tests_completed}</td>
                  <td className="px-4 py-2.5 max-w-[260px]">
                    {u.last_test ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <SectionBadge section={u.last_test.section} />
                        <span className="text-xs text-gray-600 truncate">{u.last_test.label}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400">None yet</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{timeAgo(u.joined)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.pages > 1 && (
        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Page {data.page} of {data.pages}</span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={data.page <= 1}
              onClick={() => setPage(data.page - 1)}
              className="p-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              aria-label="Next page"
              disabled={data.page >= data.pages}
              onClick={() => setPage(data.page + 1)}
              className="p-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}
