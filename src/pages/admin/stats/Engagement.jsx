import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import api from '../../../api/client'
import Chart, { CHART_BLUE } from './Chart'
import { shortDate, timeAgo } from './format'
import { Panel, RowsSkeleton, Segmented, Tile, UserCell } from './shared'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]
const RETURN_SERIES = [{ key: 'rate', label: 'Came back', color: CHART_BLUE }]

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : null)
const asPercent = (value) => (value === null ? '—' : `${value}%`)

function MostActive({ users }) {
  if (!users.length) return <p className="py-8 text-center text-sm text-gray-400">Nobody has visited in this period yet.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/70">
            {['#', 'User', 'Days visited', 'Tests done', 'Last seen', 'Joined'].map((h, i) => (
              <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((u, i) => (
            <tr key={u.id} className="hover:bg-sky-50/20 transition-colors">
              <td className="px-4 py-2.5 text-xs font-bold text-gray-400 tabular-nums">{i + 1}</td>
              <td className="px-4 py-2.5 max-w-[260px]"><UserCell user={u} /></td>
              <td className="px-4 py-2.5 text-right font-bold text-gray-800 tabular-nums">{u.visit_days}</td>
              <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums">{u.tests_completed}</td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-400 whitespace-nowrap">{timeAgo(u.last_seen)}</td>
              <td className="px-4 py-2.5 text-right text-xs text-gray-400 whitespace-nowrap">{timeAgo(u.joined)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Who comes once and who keeps coming back: the clearest sign the site is useful. */
export default function Engagement() {
  const [days, setDays] = useState(30)
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-engagement', days],
    queryFn: () => api.get('/system/engagement/', { params: { days } }).then((r) => r.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
        <AlertCircle size={16} /> Failed to load visitor return data: {error.message}
      </div>
    )
  }

  const nextDay = data && percent(data.next_day.returned, data.next_day.active)
  const signupNext = data && percent(data.signups.next_day, data.signups.total)
  const signupWeek = data && percent(data.signups.within_week, data.signups.week_total)
  const trend = (data?.daily_return ?? []).map((d) => ({ date: d.date, rate: percent(d.returned, d.active) ?? 0 }))

  return (
    <Panel
      title="Who keeps coming back"
      subtitle={data?.tracking_since
        ? `Visits are counted from ${shortDate(data.tracking_since)} · a day counts once it is over`
        : 'Visits start being counted once people open the site after the update'}
      action={<Segmented value={days} options={RANGES} onChange={setDays} />}
    >
      {isLoading ? <RowsSkeleton rows={4} /> : (
        <>
          <div className="p-5 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 border-b border-gray-50">
            <Tile label="Visitors" value={data.visitors} sub={`${asPercent(percent(data.visitors, data.users_total))} of all ${data.users_total.toLocaleString()} users`} />
            <Tile label="Came back (2+ days)" value={data.returning} sub={`${asPercent(percent(data.returning, data.visitors))} of visitors`} />
            <Tile label="Came only once" value={data.one_time} sub={`${asPercent(percent(data.one_time, data.visitors))} of visitors`} />
            <Tile label="Back the next day" value={asPercent(nextDay)} sub={`${data.next_day.returned} of ${data.next_day.active} visits`} />
            <Tile label="New users back next day" value={asPercent(signupNext)} sub={`${data.signups.next_day} of ${data.signups.total} new users`} />
            <Tile label="New users back in 7 days" value={asPercent(signupWeek)} sub={`${data.signups.within_week} of ${data.signups.week_total} new users`} />
          </div>

          {trend.length > 1 && (
            <div className="p-5 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-700 mb-1">Share of each day's visitors who came back the next day</p>
              <Chart data={trend} series={RETURN_SERIES} xKey="date" formatX={shortDate} formatValue={(v) => `${v}%`} kind="line" height={160} />
            </div>
          )}

          <div className="px-5 pt-4 pb-1">
            <p className="text-xs font-bold text-gray-700">Most active users</p>
            <p className="text-[11px] text-gray-400">By days visited in this period, then by most recent visit</p>
          </div>
          <MostActive users={data.most_active} />
        </>
      )}
    </Panel>
  )
}
