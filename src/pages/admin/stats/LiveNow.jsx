import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, FileText, Users } from 'lucide-react'
import api from '../../../api/client'
import { timeAgo } from './format'
import { Panel, RowsSkeleton, SectionBadge, UserCell } from './shared'

const REFRESH_MS = 15_000
const COLLAPSED_ROWS = 6

function Figure({ icon: Icon, value, label, live }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 relative">
        <Icon size={18} className="text-sky-600" />
        {live && (
          <span className="absolute -top-0.5 -right-0.5 flex w-2.5 h-2.5">
            <span className="absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-green-500" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-gray-900 leading-tight tabular-nums">{value ?? '—'}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    </div>
  )
}

export default function LiveNow() {
  const [showAll, setShowAll] = useState(false)
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-live'],
    queryFn: () => api.get('/system/live/').then((r) => r.data),
    refetchInterval: REFRESH_MS,
    staleTime: REFRESH_MS - 1000,
  })

  const users = data?.users ?? []
  const visible = showAll ? users : users.slice(0, COLLAPSED_ROWS)

  return (
    <Panel
      title="Live now"
      subtitle={`Active in the last ${data?.window_minutes ?? 3} minutes · refreshes every 15 s`}
    >
      {error ? (
        <p className="px-5 py-6 text-sm text-red-500">Failed to load live data: {error.message}</p>
      ) : (
        <>
          <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-50">
            <Figure icon={Users} value={data?.online_now} label="Online now" live />
            <Figure icon={FileText} value={data?.in_test_now} label="Taking a test now" />
            <Figure icon={Activity} value={data?.visitors_today} label="Visitors today" />
          </div>

          {isLoading ? <RowsSkeleton rows={3} /> : users.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Nobody is online right now.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {visible.map((u) => (
                <li key={u.id} className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <div className="min-w-0 flex-1 basis-56"><UserCell user={u} online /></div>
                  <div className="min-w-0 flex-1 basis-56 flex items-center gap-2">
                    {u.activity ? (
                      <>
                        <SectionBadge section={u.activity.section} />
                        <span className="text-xs text-gray-600 truncate">{u.activity.label}</span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          started {timeAgo(u.activity.started_at)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Browsing</span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">{timeAgo(u.last_seen)}</span>
                </li>
              ))}
            </ul>
          )}

          {users.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full py-2.5 text-xs font-semibold text-sky-600 hover:bg-sky-50/50 border-t border-gray-50 transition-colors"
            >
              {showAll ? 'Show less' : `Show all ${users.length}`}
            </button>
          )}
        </>
      )}
    </Panel>
  )
}
