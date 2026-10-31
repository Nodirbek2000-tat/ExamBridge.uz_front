import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import api from '../../../api/client'
import Chart, { CHART_BLUE, CHART_ORANGE } from './Chart'
import { shortDate, timeAgo } from './format'
import { Panel, Segmented, SectionBadge, Tile } from './shared'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]

const VISITOR_SERIES = [
  { key: 'active_users', label: 'Visitors', color: CHART_BLUE },
  { key: 'new_users', label: 'New users', color: CHART_ORANGE },
]
const COMPLETED_SERIES = [{ key: 'completed', label: 'Tests completed', color: CHART_BLUE }]
const HOUR_SERIES = [{ key: 'started', label: 'Tests started', color: CHART_BLUE }]

const pad = (hour) => `${String(hour).padStart(2, '0')}:00`
const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function SectionTable({ sections }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/70">
            {['Section', 'Users', 'Started', 'Completed', 'Finish rate', 'Today', '7 days', 'Practice', 'Last completed'].map((h, i) => (
              <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${i ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sections.map((s) => (
            <tr key={s.section} className="hover:bg-sky-50/20 transition-colors">
              <td className="px-4 py-3"><SectionBadge section={s.section} /></td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">{s.users.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.started.toLocaleString()}</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums">{s.completed.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{percent(s.completed, s.started)}%</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.completed_today}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.completed_week}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{s.practice_completed.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">{timeAgo(s.last_completed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Funnel({ funnel }) {
  const steps = [
    { label: 'Registered', value: funnel.registered },
    { label: 'Started a test', value: funnel.started_test },
    { label: 'Finished a test', value: funnel.completed_test },
    { label: 'Finished 2 or more', value: funnel.completed_two_plus },
  ]
  return (
    <div className="px-5 py-5 space-y-3.5">
      {steps.map((s) => (
        <div key={s.label}>
          <div className="flex items-baseline justify-between text-sm mb-1">
            <span className="text-gray-600">{s.label}</span>
            <span className="text-gray-800 font-bold tabular-nums">
              {s.value.toLocaleString()}
              <span className="ml-1.5 text-xs font-medium text-gray-400">{percent(s.value, funnel.registered)}%</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${percent(s.value, funnel.registered)}%`, background: CHART_BLUE }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsOverview() {
  const [days, setDays] = useState(30)
  const { data, error } = useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => api.get('/system/analytics/', { params: { days } }).then((r) => r.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
        <AlertCircle size={16} /> Failed to load analytics: {error.message}
      </div>
    )
  }

  const hours = (data?.hours ?? []).map((started, hour) => ({ hour, started }))
  const since = data?.visitors.tracking_since

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Visitors" value={data?.visitors.week} sub={`last 7 days · yesterday ${data?.visitors.yesterday ?? '—'}`} />
        <Tile label="Visitors" value={data?.visitors.month} sub="last 30 days" />
        <Tile label="Mocks completed today" value={data?.mocks.completed_today} sub={`${data?.mocks.started_today ?? '—'} started today`} />
        <Tile label="Mocks completed" value={data?.mocks.completed_week} sub="last 7 days" />
        <Tile label="Mocks completed" value={data?.mocks.completed_month} sub="last 30 days" />
        <Tile label="All mocks completed" value={data?.mocks.completed} sub={`${data?.mocks.started?.toLocaleString() ?? '—'} started in total`} />
        <Tile label="Practice completed" value={data?.mocks.practice_completed} sub="single modules and passages" />
        <Tile label="Last mock finished" value={data ? timeAgo(data.mocks.last_completed) : undefined} />
      </div>

      <Panel
        title="Activity"
        subtitle="Mocks and practice together"
        action={<Segmented value={days} options={RANGES} onChange={setDays} />}
      >
        {data && (
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-x-8 gap-y-6">
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-700 mb-1">Visitors and new users per day</p>
              <Chart data={data.trend} series={VISITOR_SERIES} xKey="date" formatX={shortDate} kind="line" />
              <p className="text-[11px] text-gray-400 mt-1">
                {since ? `Visitors are counted from ${shortDate(since)}.` : 'Visitors start being counted once people open the site after this update.'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-700 mb-1">Tests completed per day</p>
              <Chart data={data.trend} series={COMPLETED_SERIES} xKey="date" formatX={shortDate} />
            </div>
            <div className="min-w-0 xl:col-span-2">
              <p className="text-xs font-bold text-gray-700 mb-1">Tests started by hour of day (Tashkent)</p>
              <Chart data={hours} series={HOUR_SERIES} xKey="hour" formatX={pad} height={140} tickEvery={3} />
            </div>
          </div>
        )}
      </Panel>

      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <Panel title="Mocks by section" subtitle="Whole tests; practice is its own column" className="xl:col-span-2">
            <SectionTable sections={data.sections} />
          </Panel>
          <Panel title="From sign-up to tests" subtitle="All time, share of registered users">
            <Funnel funnel={data.funnel} />
          </Panel>
        </div>
      )}
    </div>
  )
}
