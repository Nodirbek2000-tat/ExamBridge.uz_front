import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { AlertCircle } from 'lucide-react'
import api from '../../../api/client'
import Chart, { CHART_BLUE } from './Chart'
import { shortDate, usd } from './format'
import { Panel, Segmented, SectionBadge, Tile } from './shared'

const RANGES = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
]
const COST_SERIES = [{ key: 'cost', label: 'Cost', color: CHART_BLUE }]
const COLUMNS = ['Section', 'What', 'Calls', 'Per call', 'Today', '7 days', '30 days', 'All time', 'Share']

const share = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function Groups({ groups, total }) {
  return (
    <div className="space-y-3.5">
      {groups.map((g) => (
        <div key={g.group}>
          <div className="flex items-baseline justify-between text-sm mb-1 gap-3">
            <span className="text-gray-600 truncate">{g.group}</span>
            <span className="text-gray-800 font-bold tabular-nums whitespace-nowrap">
              {usd(g.total)}
              <span className="ml-1.5 text-xs font-medium text-gray-400">{share(g.total, total)}%</span>
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${share(g.total, total)}%`, background: CHART_BLUE }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function FeatureTable({ features, total }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50/70">
            {COLUMNS.map((h, i) => (
              <th key={h} className={`px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${i > 1 ? 'text-right' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {features.map((f) => (
            <tr key={f.feature} className="hover:bg-sky-50/20 transition-colors">
              <td className="px-4 py-3"><SectionBadge section={f.group} /></td>
              <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{f.label}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{f.calls.toLocaleString()}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{usd(f.per_call)}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{usd(f.today)}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{usd(f.week)}</td>
              <td className="px-4 py-3 text-right text-gray-600 tabular-nums">{usd(f.month)}</td>
              <td className="px-4 py-3 text-right font-bold text-gray-800 tabular-nums">{usd(f.total)}</td>
              <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{share(f.total, total)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AICosts() {
  const [days, setDays] = useState(30)
  const { data, error } = useQuery({
    queryKey: ['admin-ai-costs', days],
    queryFn: () => api.get('/system/ai-costs/', { params: { days } }).then((r) => r.data),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
        <AlertCircle size={16} /> Failed to load AI costs: {error.message}
      </div>
    )
  }

  const totals = data?.totals
  const money = (value) => (totals ? usd(value) : undefined)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Tile label="AI cost today" value={money(totals?.today)} />
        <Tile label="AI cost yesterday" value={money(totals?.yesterday)} />
        <Tile label="AI cost" value={money(totals?.week)} sub="last 7 days" />
        <Tile label="AI cost" value={money(totals?.month)} sub="last 30 days" />
        <Tile label="AI cost" value={money(totals?.calendar_month)} sub="this month" />
        <Tile label="AI cost" value={money(totals?.all)} sub="all time" />
      </div>

      <Panel
        title="AI API costs"
        subtitle={data?.tracking_since
          ? `Worked out from OpenAI prices · counted from ${shortDate(data.tracking_since)}`
          : 'Worked out from OpenAI prices'}
        action={<Segmented value={days} options={RANGES} onChange={setDays} />}
      >
        {data && !data.features.length ? (
          <p className="py-10 text-center text-sm text-gray-400">
            No AI calls recorded yet. Costs are counted from this update on.
          </p>
        ) : data && (
          <>
            <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-x-8 gap-y-6 border-b border-gray-50">
              <div className="min-w-0 xl:col-span-2">
                <p className="text-xs font-bold text-gray-700 mb-1">Cost per day</p>
                <Chart data={data.trend} series={COST_SERIES} xKey="date" formatX={shortDate} formatValue={usd} fractional />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-700 mb-3">By section, all time</p>
                <Groups groups={data.groups} total={totals.all} />
              </div>
            </div>

            <FeatureTable features={data.features} total={totals.all} />

            <p className="px-5 py-3 border-t border-gray-50 text-[11px] text-gray-400">
              {data.models.map((m) => `${m.model}: ${usd(m.total)}`).join(' · ')}
            </p>
          </>
        )}
      </Panel>
    </div>
  )
}
