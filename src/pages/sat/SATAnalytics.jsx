import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, CheckCircle2, XCircle, Target, Bookmark, Flame, Clock, Timer, ChevronDown, CalendarDays,
} from 'lucide-react'
import api from '../../api/client'
import {
  C, fmtDur, fmtHour, Card, Empty, RangePicker, Reveal, useTooltip, Meter, BandLegend, Stat, WeakList,
  StackedColumns, Heatmap,
} from '../../components/analytics/kit'
import AIAnalysisCard from '../../components/analytics/AIAnalysisCard'

/*
 * Every number on this page comes from /api/sat/analytics/ — nothing is
 * computed here except formatting. The AI card is fed the same numbers.
 */
const SUBJ = { ENGLISH: C.s1, MATH: C.s2 }                       // Reading & Writing / Math
const ACT = { test: C.s3, module: C.s4, bank: C.s5 }              // activity types: never a subject colour
const DIFF_LABEL = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' }

// ── weakest skills ────────────────────────────────────────────────────────────
function practiceLink(s) {
  const subject = s.section === 'MATH' ? 'math' : 'english'
  return `/app/sat/practice?subject=${subject}&topic=${encodeURIComponent(s.topic)}`
}

// ── accuracy by topic (domain → skills) ───────────────────────────────────────
function DomainCard({ section }) {
  const [open, setOpen] = useState(null)
  return (
    <Card
      title={section.label}
      subtitle="Accuracy by topic"
      right={section.attempts > 0 && (
        <p className="text-right">
          <span className="text-2xl font-bold text-gray-900">{section.accuracy}%</span>
          <span className="block text-xs text-gray-400">{section.correct}/{section.attempts} correct</span>
        </p>
      )}
    >
      {section.attempts === 0 ? <Empty>No {section.label} questions in this period.</Empty> : (
        <ul className="space-y-1">
          {section.domains.map(d => {
            const isOpen = open === d.label
            const canOpen = d.skills.length > 0
            return (
              <li key={d.label}>
                <button type="button" disabled={!canOpen} onClick={() => setOpen(isOpen ? null : d.label)} aria-expanded={isOpen}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_7rem_3.5rem_1rem] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${canOpen ? 'hover:bg-slate-50' : ''}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-gray-900" title={d.label}>{d.label}</span>
                    <span className="text-xs text-gray-400">{d.attempts ? `${d.correct}/${d.attempts} correct` : 'Not practised yet'}</span>
                  </span>
                  <Meter pct={d.accuracy} />
                  <span className="text-right text-lg font-bold text-gray-900">{d.accuracy == null ? '—' : `${d.accuracy}%`}</span>
                  {canOpen ? <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} /> : <span />}
                </button>
                {isOpen && (
                  <ul className="mb-2 ml-2 space-y-1 border-l-2 border-slate-100 pl-3">
                    {d.skills.map(s => (
                      <li key={s.topic} className="grid grid-cols-[minmax(0,1fr)_5rem_3rem] items-center gap-3 py-1.5 text-sm">
                        <Link to={practiceLink(s)} className="min-w-0 truncate text-gray-700 hover:text-blue-700 hover:underline">{s.topic}</Link>
                        <span className="text-right text-xs text-gray-400">{s.correct}/{s.attempts}</span>
                        <span className="text-right font-semibold text-gray-900">{s.accuracy}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// ── difficulty: accuracy + pace, as a small table ─────────────────────────────
function DifficultyCard({ label, rows }) {
  const any = rows.some(r => r.attempts)
  const maxSec = Math.max(1, ...rows.map(r => r.avg_seconds || 0))
  return (
    <Card title={label} subtitle="Accuracy and pace by difficulty">
      {!any ? <Empty>No {label} questions in this period.</Empty> : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-400">
              <th className="pb-2 font-medium">Difficulty</th>
              <th className="pb-2 font-medium">Accuracy</th>
              <th className="pb-2 pl-4 font-medium">Avg time / question</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.difficulty} className="border-t border-slate-100">
                <td className="py-3 pr-3">
                  <span className="font-semibold text-gray-900">{DIFF_LABEL[r.difficulty]}</span>
                  <span className="block text-xs text-gray-400">{r.attempts ? `${r.correct}/${r.attempts} correct` : 'none yet'}</span>
                </td>
                <td className="w-[38%] py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex-1"><Meter pct={r.accuracy} /></div>
                    <span className="w-11 text-right font-bold tabular-nums text-gray-900">{r.accuracy == null ? '—' : `${r.accuracy}%`}</span>
                  </div>
                </td>
                <td className="w-[34%] py-3 pl-4">
                  {r.avg_seconds == null ? <span className="text-xs text-gray-400">no timing</span> : (
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1">
                        {/* pace: one hue — longer is just longer, not good or bad */}
                        <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max((r.avg_seconds / maxSec) * 100, 4)}%`, background: SUBJ.ENGLISH }} />
                      </div>
                      <span className="w-14 text-right font-bold tabular-nums text-gray-900">{fmtDur(r.avg_seconds)}</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ── daily activity: stacked columns by subject ────────────────────────────────
function DailyChart({ daily, tip }) {
  const [metric, setMetric] = useState('questions')
  const [table, setTable] = useState(false)
  const q = metric === 'questions'
  const series = q
    ? [{ key: 'english_questions', label: 'Reading & Writing', color: SUBJ.ENGLISH }, { key: 'math_questions', label: 'Math', color: SUBJ.MATH }]
    : [{ key: 'english_seconds', label: 'Reading & Writing', color: SUBJ.ENGLISH }, { key: 'math_seconds', label: 'Math', color: SUBJ.MATH }]
  const weekly = daily.length > 92
  return (
    <Card
      title={weekly ? 'Weekly study' : 'Daily study'}
      subtitle={`Stacked by subject. The line is your ${weekly ? 'weekly' : 'daily'} average.`}
      right={(
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 p-0.5 text-xs font-semibold">
            {[['questions', 'Questions'], ['time', 'Time']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMetric(k)}
                className={`rounded-lg px-3 py-1 transition ${metric === k ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          <button type="button" onClick={() => setTable(t => !t)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-slate-50">
            {table ? 'Chart' : 'Table'}
          </button>
        </div>
      )}
    >
      <StackedColumns
        rows={daily} series={series} tip={tip} table={table}
        fmt={q ? undefined : fmtDur}
        extra={(d) => [{ value: d.questions ? `${d.correct}/${d.questions}` : '0', label: 'correct' }]}
        emptyText={q ? 'No questions answered in this period.' : 'No timed questions in this period (question-bank practice is not timed).'}
      />
    </Card>
  )
}

// ── part-to-whole: one stacked bar + labelled rows ────────────────────────────
function ShareCard({ title, subtitle, rows, colorOf }) {
  const total = rows.reduce((a, r) => a + r.questions, 0)
  const shown = rows.filter(r => r.questions > 0)
  return (
    <Card title={title} subtitle={subtitle}>
      {total === 0 ? <Empty>Nothing in this period yet.</Empty> : (
        <>
          <div className="flex h-3 overflow-hidden rounded-full" style={{ gap: 2 }} role="img"
            aria-label={shown.map(r => `${r.label} ${Math.round((r.questions / total) * 100)}%`).join(', ')}>
            {shown.map(r => <div key={r.key} style={{ flex: r.questions, background: colorOf(r.key) }} />)}
          </div>
          <ul className="mt-4 space-y-2.5">
            {rows.map(r => (
              <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_auto_3rem] items-center gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: colorOf(r.key) }} />
                  <span className="truncate font-medium text-gray-800">{r.label}</span>
                </span>
                <span className="text-right text-gray-500">
                  <span className="font-bold text-gray-900">{r.questions}</span> questions{r.seconds > 0 ? ` · ${fmtDur(r.seconds)}` : ''}
                </span>
                <span className="text-right font-bold tabular-nums text-gray-900">{Math.round((r.questions / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

// ── time of day: one series, the peak is the point ────────────────────────────
function HoursChart({ hours, peak, tip }) {
  const max = Math.max(1, ...hours)
  const total = hours.reduce((a, b) => a + b, 0)
  return (
    <Card
      title="Most active time of day"
      subtitle="Questions answered by hour"
      right={peak != null && total > 0 && <p className="text-sm text-gray-500">Peak: <span className="font-bold text-gray-900">{fmtHour(peak)}–{fmtHour((peak + 1) % 24)}</span></p>}
    >
      {total === 0 ? <Empty>No activity in this period.</Empty> : (
        <div>
          <div className="relative flex items-end" style={{ height: 150, gap: 2 }}>
            <div className="absolute inset-x-0 bottom-0 border-t" style={{ borderColor: '#c3c2b7' }} />
            {hours.map((n, h) => {
              const lines = [{ label: `${fmtHour(h)}–${fmtHour((h + 1) % 24)}` }, { value: n, label: n === 1 ? 'question' : 'questions' }]
              return (
                <div key={h} tabIndex={0} aria-label={`${fmtHour(h)}: ${n} questions`}
                  onMouseEnter={(e) => tip.show(e, lines)} onMouseLeave={tip.hide} onFocus={(e) => tip.show(e, lines)} onBlur={tip.hide}
                  className="flex h-full min-w-0 flex-1 items-end justify-center outline-none hover:bg-slate-50 focus-visible:bg-slate-100">
                  {n > 0 && <div className="w-full max-w-[24px] rounded-t-[4px]" style={{ height: `${Math.max((n / max) * 100, 3)}%`, background: h === peak ? SUBJ.ENGLISH : C.soft }} />}
                </div>
              )
            })}
          </div>
          <div className="mt-1.5 flex" style={{ gap: 2 }}>
            {hours.map((_, h) => (
              <div key={h} className="relative h-4 min-w-0 flex-1">
                {h % 6 === 0 && <span className="absolute left-0 whitespace-nowrap text-[10px] text-gray-400">{fmtHour(h)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// ── sittings ──────────────────────────────────────────────────────────────────
function Sessions({ sessions }) {
  if (!sessions.length) {
    return (
      <div className="py-8 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-gray-500"><Clock size={18} /></span>
        <p className="font-semibold text-gray-900">No study sessions in the last 7 days</p>
        <p className="mt-1 text-sm text-gray-500">Do a few questions and your sittings will show up here automatically.</p>
      </div>
    )
  }
  return (
    <ul className="divide-y divide-slate-100">
      {sessions.map(s => {
        const d = new Date(s.start)
        return (
          <li key={s.start} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)_6rem_5rem_4rem]">
            <p className="font-semibold text-gray-900">
              {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              <span className="ml-2 font-normal text-gray-500">{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            </p>
            <p className="hidden truncate text-sm text-gray-500 sm:block">{s.sections.join(' · ')}</p>
            <p className="text-right text-sm text-gray-600"><span className="font-bold text-gray-900">{s.questions}</span> questions</p>
            <p className="text-right text-sm text-gray-600">{fmtDur(s.seconds)}</p>
            <p className="text-right font-bold tabular-nums text-gray-900">{s.accuracy}%</p>
          </li>
        )
      })}
    </ul>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function SATAnalytics() {
  const [range, setRange] = useState('30d')
  const tip = useTooltip()
  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: ['sat-analytics', range],
    queryFn: () => api.get(`/sat/analytics/?range=${range}`).then(r => r.data),
    placeholderData: (prev) => prev,   // keep the frame while a new range loads
  })

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-10">
      {/* One filter row above everything it scopes */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 size={26} className="text-gray-400" />
          {/* the only text that sits on the page itself — follow the site theme */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </div>

      {error && !data ? (
        <Card><Empty>Could not load your analytics. Please refresh the page.</Empty></Card>
      ) : isLoading && !data ? (
        <div className="space-y-5">
          <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(8)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>
          <div className="h-72 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          <Reveal><AIAnalysisCard key={range} exam="sat" range={range} volume={data.totals.attempted} /></Reveal>

          <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Target} label="Questions attempted" value={data.totals.attempted} hint={`${data.totals.active_days} active day${data.totals.active_days === 1 ? '' : 's'}`} />
            <Stat icon={BarChart3} label="Accuracy" value={data.totals.accuracy == null ? '—' : `${data.totals.accuracy}%`} hint={data.totals.attempted ? `${data.totals.correct} of ${data.totals.attempted} correct` : 'no questions yet'} />
            <Stat icon={CheckCircle2} label="Correct" value={data.totals.correct} tone="text-green-600" />
            <Stat icon={XCircle} label="Wrong" value={data.totals.wrong} tone="text-red-500" />
            <Stat icon={Clock} label="Time on questions" value={fmtDur(data.totals.total_seconds)} hint="tests and modules only" />
            <Stat icon={Timer} label="Avg time / question" value={data.totals.avg_seconds == null ? '—' : fmtDur(data.totals.avg_seconds)} />
            <Stat icon={Bookmark} label="Saved questions" value={data.totals.saved} hint="all time" />
            <Stat icon={Flame} label="Study streak" value={data.totals.streak} hint={data.totals.streak === 1 ? 'day in a row' : 'days in a row'} tone="text-orange-500" />
          </Reveal>

          <Reveal>
            <Card title="5 lowest-accuracy skills" subtitle="Skills with at least 3 attempts, weakest first" right={<BandLegend />}>
              <WeakList
                emptyText="Answer a few questions with topics and your weakest skills will appear here."
                items={data.lowest_skills.map(s => ({
                  key: `${s.section}-${s.topic}`, title: s.topic, meta: [s.section_label],
                  accuracy: s.accuracy, correct: s.correct, attempts: s.attempts, link: practiceLink(s),
                }))}
              />
            </Card>
          </Reveal>

          <Reveal className="grid gap-5 lg:grid-cols-2">
            <DomainCard section={data.sections.ENGLISH} />
            <DomainCard section={data.sections.MATH} />
          </Reveal>

          <Reveal className="grid gap-5 lg:grid-cols-2">
            <DifficultyCard label="Reading & Writing" rows={data.difficulty.ENGLISH} />
            <DifficultyCard label="Math" rows={data.difficulty.MATH} />
          </Reveal>

          <Reveal><DailyChart daily={data.daily} tip={tip} /></Reveal>

          <Reveal className="grid gap-5 lg:grid-cols-2">
            <ShareCard title="By subject" subtitle="Where your questions went" rows={data.by_subject} colorOf={(k) => SUBJ[k]} />
            <ShareCard title="By activity" subtitle="How you practised" rows={data.by_activity} colorOf={(k) => ACT[k]} />
          </Reveal>

          <Reveal><HoursChart hours={data.hours} peak={data.peak_hour} tip={tip} /></Reveal>

          <Reveal>
            <Card title="Study sessions" subtitle="Auto-detected from your practice in the last 7 days">
              <Sessions sessions={data.sessions} />
            </Card>
          </Reveal>

          <p className="flex items-center gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400"><CalendarDays size={15} /> All-time activity, independent of the selected date range.</p>
          <Reveal><Heatmap activity={data.activity} tip={tip} /></Reveal>
        </div>
      )}
      {tip.node}
    </div>
  )
}
