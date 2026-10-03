/*
 * IELTS / CEFR home — one page for both exams.
 * Skill cards on top, then the analysis of everything the student has done:
 * AI read-out, totals, weakest question types, per-skill breakdowns, score
 * history, writing/speaking criteria, real recent mistakes and activity.
 * Every number comes from /api/analytics/<exam>/.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Globe, BookOpen, FileText, Headphones, Mic, PenLine, ArrowRight, Target, BarChart3, CheckCircle2,
  XCircle, MinusCircle, Trophy, Flame, Layers, CalendarDays, ChevronDown,
} from 'lucide-react'
import api from '../../api/client'
import {
  C, fmtDay, Card, Empty, RangePicker, Reveal, useTooltip, Meter, BandLegend, Stat, WeakList, StackedColumns, Heatmap,
} from '../../components/analytics/kit'
import AIAnalysisCard from '../../components/analytics/AIAnalysisCard'

const SKILL_COLOR = { reading: C.s1, listening: C.s2 }

const EXAMS = {
  ielts: {
    title: 'IELTS Preparation', subtitle: 'Academic & General Training · Band 0–9', icon: Globe,
    gradient: 'from-sky-500 to-indigo-500',
    skills: {
      reading: { desc: 'T/F/NG · MCQ · Gap fill · Matching', icon: FileText },
      listening: { desc: 'Section 1–4 · Real audio', icon: Headphones },
      speaking: { desc: 'Part 1·2·3 · AI feedback', icon: Mic },
      writing: { desc: 'Task 1·2 · AI band score', icon: PenLine },
    },
    mock: { title: 'Full Mock Test', desc: 'Complete IELTS simulation: Reading + Listening + Writing + Speaking', to: '/app/ielts/skills?tab=mock', cta: 'Start full mock' },
    part: { reading: 'Passage', listening: 'Section' },
    score: { unit: 'band', max: 9, ticks: [0, 3, 6, 9], fmt: (v) => v.toFixed(1) },
  },
  cefr: {
    title: 'CEFR Preparation', subtitle: 'Multilevel exam · Reading 5 parts · Listening 6 parts', icon: BookOpen,
    gradient: 'from-rose-500 to-sky-500',
    skills: {
      reading: { desc: 'Parts 1–5 · Gap fill · Matching · T/F/NG', icon: FileText },
      listening: { desc: 'Parts 1–6 · Maps · Forms · Speakers', icon: Headphones },
      speaking: { desc: 'Parts 1.1 · 1.2 · 2 · 3 · AI score /75', icon: Mic },
      writing: { desc: 'Tasks 1.1 · 1.2 · Part 2 · AI score /75', icon: PenLine },
    },
    mock: { title: 'Full Mock Tests', desc: 'Reading and Listening mocks built exactly like the real multilevel exam', to: '/app/cefr/skills?tab=reading', cta: 'Open mock tests' },
    part: { reading: 'Part', listening: 'Part' },
    score: { unit: 'percent', max: 100, ticks: [0, 25, 50, 75, 100], fmt: (v) => `${Math.round(v)}%` },
  },
}
const SKILL_NAME = { reading: 'Reading', listening: 'Listening', speaking: 'Speaking', writing: 'Writing' }

// Band (0–9) state for writing / speaking — always shown with a word
const bandState = (b) => (b == null ? null : b >= 7 ? ['Strong', C.good, 'text-green-700'] : b >= 5.5 ? ['Okay', C.warn, 'text-amber-700'] : ['Needs work', C.bad, 'text-red-700'])
// the same words for CEFR: a 0–75 score or a 0–5 criterion, compared on one scale
const cefrState = (v, max) => (v == null ? null : bandState((v / max) * 9))
const CEFR_LEVEL = { C1: 'C1', B2: 'B2', B1: 'B1', BELOW: 'Below B1' }
const CEFR_SCORE = { unit: 'points', max: 75, ticks: [0, 38, 51, 65, 75], fmt: (v) => `${Math.round(v)}/75` }

// ── skill cards ───────────────────────────────────────────────────────────────
function SkillCard({ exam, skill, info, data, index }) {
  const reduce = useReducedMotion()
  const Icon = info.icon
  let metric = null
  if (data && (skill === 'reading' || skill === 'listening')) {
    const s = data.skills[skill]
    metric = s.attempts ? [`${s.accuracy}%`, `${s.correct}/${s.attempts} correct`] : null
  } else if (data) {
    const s = data[skill]
    metric = s?.scale === 'cefr' && s.avg_score != null ? [`${s.avg_score}/75`, `avg · ${s.count} done`]
      : s?.avg_band != null ? [s.avg_band.toFixed(1), `avg band · ${s.count} done`] : s?.count ? [`${s.count}`, 'responses'] : null
  }
  const body = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_12px_40px_-12px_rgba(42,120,214,0.35)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-100/0 blur-2xl transition duration-500 group-hover:bg-sky-100/80" />
      <div className="relative flex items-start gap-4">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition duration-300 group-hover:scale-110 group-hover:bg-sky-600 group-hover:text-white">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{SKILL_NAME[skill]}</h3>
            {info.soon && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Coming soon</span>}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{info.desc}</p>
        </div>
        {metric && (
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{metric[0]}</p>
            <p className="text-[11px] text-gray-400">{metric[1]}</p>
          </div>
        )}
      </div>
      <div className="relative mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">{metric ? 'Your result so far' : info.soon ? 'Being prepared' : 'Not practised yet'}</span>
        {!info.soon && (
          <span className="btn-glass inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white transition group-hover:bg-sky-700">
            Practice <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </div>
  )
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: 0.08 + index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      {info.soon ? <div className="h-full cursor-default opacity-80">{body}</div> : <Link to={`/app/${exam}/skills?tab=${skill}`} className="block h-full">{body}</Link>}
    </motion.div>
  )
}

// ── one objective skill: by question type + by part ───────────────────────────
function SkillBreakdown({ skill, s, partLabel, exam }) {
  const [all, setAll] = useState(false)
  const types = all ? s.by_type : s.by_type.slice(0, 6)
  return (
    <Card
      title={SKILL_NAME[skill]}
      subtitle="Accuracy by question type and part"
      right={s.attempts > 0 && (
        <p className="text-right">
          <span className="text-2xl font-bold text-gray-900">{s.accuracy}%</span>
          <span className="block text-xs text-gray-400">{s.correct}/{s.attempts} correct{s.blank ? ` · ${s.blank} blank` : ''}</span>
        </p>
      )}
    >
      {s.attempts === 0 ? (
        <Empty>No {SKILL_NAME[skill].toLowerCase()} questions in this period. <Link to={`/app/${exam}/skills?tab=${skill}`} className="font-semibold text-blue-600">Start one →</Link></Empty>
      ) : (
        <>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Question types</p>
          <ul className="space-y-0.5">
            {types.map(t => (
              <li key={t.type} className="grid grid-cols-[minmax(0,1fr)_6.5rem_3.2rem] items-center gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900" title={t.label}>{t.label}</span>
                  <span className="text-xs text-gray-400">{t.correct}/{t.attempts} correct{t.blank ? ` · ${t.blank} blank` : ''}</span>
                </span>
                <Meter pct={t.accuracy} />
                <span className="text-right font-bold tabular-nums text-gray-900">{t.accuracy}%</span>
              </li>
            ))}
          </ul>
          {s.by_type.length > 6 && (
            <button type="button" onClick={() => setAll(a => !a)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
              {all ? 'Show less' : `Show all ${s.by_type.length}`} <ChevronDown size={13} className={all ? 'rotate-180' : ''} />
            </button>
          )}
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-400">By {partLabel.toLowerCase()}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {s.by_part.map(p => (
              <div key={p.part} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-2 py-2.5 text-center">
                <p className="text-[11px] font-semibold text-gray-500">{partLabel} {p.part || '?'}</p>
                <p className="mt-0.5 text-lg font-bold text-gray-900">{p.accuracy}%</p>
                <div className="mt-1"><Meter pct={p.accuracy} height={5} /></div>
                <p className="mt-1 text-[10px] text-gray-400">{p.correct}/{p.attempts}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

// ── score history: dots on one scale, a line per skill ────────────────────────
function ScoreTrend({ points, series, score, tip, height = 200 }) {
  // x = order in time across all series, y = score on the exam's scale
  const pos = (i) => (points.length === 1 ? 50 : 4 + (i / (points.length - 1)) * 92)
  const y = (v) => 100 - (v / score.max) * 100
  return (
    <div className="flex gap-3">
      <div className="relative w-8 flex-shrink-0" style={{ height }}>
        {score.ticks.map(t => (
          <span key={t} className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-gray-400" style={{ top: `${y(t)}%` }}>{score.unit === 'percent' ? `${t}%` : t}</span>
        ))}
      </div>
      <div className="relative flex-1" style={{ height }}>
        {score.ticks.map(t => <div key={t} className="absolute inset-x-0 border-t" style={{ top: `${y(t)}%`, borderColor: t === 0 ? C.axis : '#eef0f2' }} />)}
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          {series.map(s => {
            const pts = points.map((p, i) => ({ ...p, i })).filter(p => p.skill === s.key)
            if (pts.length < 2) return null
            return <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              vectorEffect="non-scaling-stroke" points={pts.map(p => `${pos(p.i)},${y(p.score)}`).join(' ')} />
          })}
        </svg>
        {points.map((p, i) => {
          const s = series.find(x => x.key === p.skill)
          const lines = [{ label: p.date ? fmtDay(p.date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Test' },
            { color: s.color, value: score.fmt(p.score), label: s.label }, ...(p.total ? [{ value: `${p.correct}/${p.total}`, label: 'correct' }] : [])]
          return (
            <span key={i} tabIndex={0} aria-label={`${s.label} ${score.fmt(p.score)}`}
              onMouseEnter={(e) => tip.show(e, lines)} onMouseLeave={tip.hide} onFocus={(e) => tip.show(e, lines)} onBlur={tip.hide}
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gray-900/40"
              style={{ left: `${pos(i)}%`, top: `${y(p.score)}%` }}>
              <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: s.color }} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── writing / speaking ────────────────────────────────────────────────────────
function ScoredSkill({ name, w, link, tip }) {
  const cefr = w?.scale === 'cefr'
  const st = cefr ? cefrState(w?.avg_score, 75) : bandState(w?.avg_band)
  const critMax = cefr ? 5 : 9
  return (
    <Card
      title={name}
      subtitle={cefr ? 'AI score by criterion (0–5) and task' : 'AI band by criterion'}
      right={(cefr ? w?.avg_score != null : w?.avg_band != null) && (
        <p className="text-right">
          <span className="text-3xl font-bold text-gray-900">{cefr ? <>{w.avg_score}<span className="text-base text-gray-400">/75</span></> : w.avg_band.toFixed(1)}</span>
          <span className={`block text-xs font-semibold ${st[2]}`}>{cefr ? `${CEFR_LEVEL[w.level] || '—'} · ` : `${st[0]} · `}{w.scored} scored</span>
        </p>
      )}
    >
      {!w || !w.count ? (
        <Empty>No {name.toLowerCase()} responses in this period. <Link to={link} className="font-semibold text-blue-600">Try one →</Link></Empty>
      ) : (
        <>
          <ul className="space-y-3">
            {w.criteria.map(c => {
              const cs = cefr ? cefrState(c.avg, 5) : bandState(c.avg)
              return (
                <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_7rem_2.5rem] items-center gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">{c.label}</span>
                    {cs && <span className={`text-xs font-semibold ${cs[2]}`}>{cs[0]}</span>}
                  </span>
                  <div className="h-2 w-full rounded-full" style={{ background: cs ? `${cs[1]}26` : '#f1f5f9' }}>
                    {c.avg != null && <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(c.avg / critMax) * 100}%`, background: cs[1] }} />}
                  </div>
                  <span className="text-right font-bold tabular-nums text-gray-900">{c.avg == null ? '—' : c.avg.toFixed(1)}</span>
                </li>
              )
            })}
          </ul>
          {w.by_task && w.by_task.some(t => t.count) && (
            <div className={`mt-4 grid gap-2 ${cefr ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {w.by_task.map(t => (
                <div key={t.task} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                  <p className="text-xs text-gray-500">{cefr ? t.label : `Task ${t.task}`}</p>
                  <p className="text-lg font-bold text-gray-900">
                    {cefr
                      ? <>{t.avg_points == null ? '—' : t.avg_points}<span className="text-xs font-medium text-gray-400">/{t.max}</span></>
                      : <>{t.avg_band == null ? '—' : t.avg_band.toFixed(1)} <span className="text-xs font-medium text-gray-400">· {t.count} done</span></>}
                  </p>
                </div>
              ))}
            </div>
          )}
          {w.trend.length > 1 && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{cefr ? 'Score over time' : 'Band over time'}</p>
              <ScoreTrend points={w.trend.map(p => ({ ...p, skill: 'x', score: cefr ? p.score : p.band }))}
                series={[{ key: 'x', label: cefr ? `${name} score` : `${name} band`, color: C.s1 }]}
                score={cefr ? CEFR_SCORE : EXAMS.ielts.score} tip={tip} height={120} />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ── real recent mistakes ──────────────────────────────────────────────────────
function Mistakes({ items, partLabel }) {
  const [all, setAll] = useState(false)
  if (!items.length) return <Empty>No wrong answers in this period — or nothing answered yet.</Empty>
  const shown = all ? items : items.slice(0, 6)
  return (
    <>
      <ul className="divide-y divide-slate-100">
        {shown.map((m, i) => (
          <li key={i} className="grid gap-2 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-gray-600">{SKILL_NAME[m.skill]}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-gray-600">{m.type_label}</span>
                {m.part ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-gray-600">{partLabel[m.skill]} {m.part}</span> : null}
                {m.date && <span className="font-normal text-gray-400">{fmtDay(m.date)}</span>}
              </p>
              {m.question && <p className="mt-1.5 line-clamp-2 text-sm text-gray-700">{m.question}</p>}
              <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1 text-red-700"><XCircle size={14} /> Your answer: <b className="font-bold">{m.your_answer}</b></span>
                <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={14} /> Correct: <b className="font-bold">{m.correct_answer}</b></span>
              </p>
            </div>
            <Link to={m.link} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">Practise <ArrowRight size={14} /></Link>
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <button type="button" onClick={() => setAll(a => !a)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
          {all ? 'Show less' : `Show all ${items.length}`} <ChevronDown size={14} className={all ? 'rotate-180' : ''} />
        </button>
      )}
    </>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function SkillDashboard({ exam }) {
  const cfg = EXAMS[exam]
  const reduce = useReducedMotion()
  const [range, setRange] = useState('30d')
  const tip = useTooltip()
  const { data, isLoading, isPlaceholderData, error } = useQuery({
    queryKey: ['exam-analytics', exam, range],
    queryFn: () => api.get(`/analytics/${exam}/?range=${range}`).then(r => r.data),
    placeholderData: (prev) => prev,
  })
  const HeroIcon = cfg.icon
  const t = data?.totals
  const volume = t ? t.answered + t.writing_count + t.speaking_count : 0

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* hero */}
      <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cfg.gradient} text-white shadow-lg shadow-sky-200/60`}>
            <HeroIcon size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-black text-gray-900 sm:text-3xl dark:text-white">{cfg.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{cfg.subtitle}</p>
          </div>
        </div>
        <RangePicker value={range} onChange={setRange} />
      </motion.div>

      {/* skills */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Object.entries(cfg.skills).map(([skill, info], i) => (
          <SkillCard key={skill} exam={exam} skill={skill} info={info} data={data} index={i} />
        ))}
      </div>

      <motion.div initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.4 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-600 p-6 text-white shadow-[0_18px_50px_-18px_rgba(37,99,235,0.6)]">
        <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-sm font-semibold text-sky-100"><Layers size={15} /> Exam simulation</p>
            <h3 className="mt-1 text-xl font-black">{cfg.mock.title}</h3>
            <p className="mt-1 text-sm text-sky-100">{cfg.mock.desc}</p>
          </div>
          <Link to={cfg.mock.to} className="btn-glass inline-flex items-center gap-2 rounded-2xl border border-white/40 bg-white/15 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25">
            {cfg.mock.cta} <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>

      {error && !data ? (
        <Card><Empty>Could not load your analytics. Please refresh the page.</Empty></Card>
      ) : isLoading && !data ? (
        <div className="space-y-5">
          <div className="h-32 animate-pulse rounded-3xl bg-slate-100" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[...Array(8)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2 pt-2">
            <BarChart3 size={20} className="text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your analysis</h2>
          </div>

          <Reveal><AIAnalysisCard key={range} exam={exam} range={range} volume={volume} /></Reveal>

          <Reveal className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat icon={Target} label="Questions answered" value={t.answered} hint={`${t.active_days} active day${t.active_days === 1 ? '' : 's'}`} />
            <Stat icon={BarChart3} label="Accuracy" value={t.accuracy == null ? '—' : `${t.accuracy}%`} hint={t.answered ? `${t.correct} of ${t.answered} correct` : 'nothing answered yet'} />
            {exam === 'ielts' && <Stat icon={CheckCircle2} label="Correct" value={t.correct} tone="text-green-600" />}
            <Stat icon={XCircle} label="Wrong" value={t.wrong} tone="text-red-500" hint="a wrong answer was chosen" />
            <Stat icon={MinusCircle} label="Left blank" value={t.blank} tone="text-amber-500" hint="usually a time problem" />
            <Stat icon={Trophy} label="Tests completed" value={t.tests_completed} />
            {exam === 'ielts'
              ? <Stat icon={PenLine} label="Writing band" value={t.writing_band == null ? '—' : t.writing_band.toFixed(1)} hint={`${t.writing_count} response${t.writing_count === 1 ? '' : 's'}`} />
              : <>
                <Stat icon={PenLine} label="Writing score" value={t.writing_score == null ? '—' : `${t.writing_score}/75`} hint={`${t.writing_count} test${t.writing_count === 1 ? '' : 's'} · B2 from 51`} />
                <Stat icon={Mic} label="Speaking score" value={t.speaking_score == null ? '—' : `${t.speaking_score}/75`} hint={`${t.speaking_count} test${t.speaking_count === 1 ? '' : 's'} · B2 from 51`} />
              </>}
            <Stat icon={Flame} label="Study streak" value={t.streak} hint={t.streak === 1 ? 'day in a row' : 'days in a row'} tone="text-orange-500" />
          </Reveal>

          <Reveal>
            <Card title="5 weakest question types" subtitle="Question types with at least 5 answers, weakest first" right={<BandLegend />}>
              <WeakList
                emptyText="Answer at least 5 questions of a type and your weakest types will appear here."
                items={data.weakest_types.map(x => ({
                  key: `${x.skill}-${x.type}`, title: x.label, meta: [SKILL_NAME[x.skill], ...(x.blank ? [`${x.blank} blank`] : [])],
                  accuracy: x.accuracy, correct: x.correct, attempts: x.attempts, link: x.link,
                }))}
              />
            </Card>
          </Reveal>

          <Reveal className="grid gap-5 lg:grid-cols-2">
            <SkillBreakdown skill="reading" s={data.skills.reading} partLabel={cfg.part.reading} exam={exam} />
            <SkillBreakdown skill="listening" s={data.skills.listening} partLabel={cfg.part.listening} exam={exam} />
          </Reveal>

          <Reveal>
            <Card title="Test scores over time" subtitle={exam === 'ielts' ? 'Band of each finished reading / listening test' : 'Score of each finished reading / listening test'}
              right={(
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  {['reading', 'listening'].map(k => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full" style={{ background: SKILL_COLOR[k] }} /> {SKILL_NAME[k]}</span>)}
                </div>
              )}>
              {data.history.length === 0 ? <Empty>Finish a reading or listening test and your scores will be drawn here.</Empty> : (
                <ScoreTrend points={data.history} series={['reading', 'listening'].map(k => ({ key: k, label: SKILL_NAME[k], color: SKILL_COLOR[k] }))}
                  score={cfg.score} tip={tip} />
              )}
            </Card>
          </Reveal>

          <Reveal className={`grid gap-5 ${data.writing ? 'lg:grid-cols-2' : ''}`}>
            {data.writing && <ScoredSkill name="Writing" w={data.writing} link={data.writing.link} tip={tip} />}
            <ScoredSkill name="Speaking" w={data.speaking} link={data.speaking.link} tip={tip} />
          </Reveal>

          <Reveal>
            <Card title="Recent mistakes" subtitle="Your latest wrong answers — what you chose and what was right">
              <Mistakes items={data.mistakes} partLabel={cfg.part} />
            </Card>
          </Reveal>

          <Reveal>
            <Card title={data.daily.length > 92 ? 'Weekly activity' : 'Daily activity'} subtitle="Questions answered, stacked by skill">
              <StackedColumns
                rows={data.daily} tip={tip}
                series={[{ key: 'reading', label: 'Reading', color: SKILL_COLOR.reading }, { key: 'listening', label: 'Listening', color: SKILL_COLOR.listening }]}
                extra={(d) => [{ value: d.correct, label: 'correct' }]}
                emptyText="No questions answered in this period."
              />
            </Card>
          </Reveal>

          <p className="flex items-center gap-2 pt-2 text-sm text-gray-500 dark:text-gray-400"><CalendarDays size={15} /> All-time activity, independent of the selected date range.</p>
          <Reveal><Heatmap activity={data.activity} tip={tip} unit="answers" totalLabel="answers and responses" /></Reveal>
        </div>
      )}
      {tip.node}
    </div>
  )
}
