import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, Play, RotateCcw, Sparkles } from 'lucide-react'
import api from '../../api/client'
import { loadBoardFont } from '../../components/lesson/boardFont'
import { TobyAvatar } from '../games/tobys-day/Toby'

const FILTERS = [
  { key: '', label: 'All lessons' },
  { key: 'SAT', label: 'SAT' },
  { key: 'IELTS', label: 'IELTS' },
  { key: 'CEFR', label: 'CEFR' },
]

// The same colours as each exam's workspace in the sidebar.
const LOOK = {
  SAT: { chip: 'bg-sky-100 text-sky-800', ink: '#2563eb', active: 'bg-sky-600 text-white' },
  IELTS: { chip: 'bg-violet-100 text-violet-800', ink: '#7c3aed', active: 'bg-violet-600 text-white' },
  CEFR: { chip: 'bg-rose-100 text-rose-800', ink: '#e11d48', active: 'bg-rose-600 text-white' },
  GENERAL: { chip: 'bg-emerald-100 text-emerald-800', ink: '#16a34a', active: 'bg-emerald-600 text-white' },
}
const ALL_ACTIVE = 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'

const SECTIONS = {
  general: '', math: 'Math', reading_writing: 'Reading & Writing', reading: 'Reading',
  listening: 'Listening', writing: 'Writing', speaking: 'Speaking', grammar: 'Grammar',
}

const inProgress = (lesson) => !lesson.progress.completed && lesson.progress.percent > 0

/** A lesson as a little whiteboard: its title handwritten, the exam's colour underlining it. */
function BoardThumb({ lesson, large = false }) {
  const look = LOOK[lesson.subject] || LOOK.GENERAL
  const { progress } = lesson
  return (
    <div
      className="relative aspect-video overflow-hidden rounded-xl bg-[#fffefa] ring-1 ring-slate-900/5"
      style={{
        backgroundImage: 'radial-gradient(circle, rgb(30 41 59 / 0.13) 1px, transparent 1.4px)',
        backgroundSize: large ? '14px 14px' : '11px 11px',
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-center px-[7%] pb-[6%]">
        <p
          className={`font-bold leading-[1.05] text-slate-800 line-clamp-3 ${large ? 'text-[2.1rem] sm:text-[2.6rem]' : 'text-[1.7rem]'}`}
          style={{ fontFamily: "'Caveat', 'Segoe Print', cursive" }}
        >
          {lesson.title}
        </p>
        <span className="mt-1.5 block h-[3px] w-16 rounded-full -rotate-1" style={{ background: look.ink }} />
      </div>

      <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${look.chip}`}>
        {lesson.subject === 'GENERAL' ? 'General' : lesson.subject}
      </span>
      {progress.completed && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
          <CheckCircle2 size={12} /> Completed
        </span>
      )}

      <span className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-md ring-1 ring-slate-900/5 transition group-hover:scale-110 group-hover:bg-slate-900 group-hover:text-white">
        <Play size={17} className="ml-0.5" fill="currentColor" />
      </span>

      {inProgress(lesson) && (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-900/10">
          <div className="h-full bg-sky-500" style={{ width: `${progress.percent}%` }} />
        </div>
      )}
    </div>
  )
}

function Meta({ lesson }) {
  const section = SECTIONS[lesson.section]
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1"><Clock size={13} /> {lesson.duration_minutes} min</span>
      {section && <span>· {section}</span>}
      {lesson.level && <span>· {lesson.level}</span>}
    </div>
  )
}

function action(lesson) {
  if (lesson.progress.completed) return { label: 'Watch again', icon: RotateCcw }
  if (lesson.progress.percent > 0) return { label: `Continue · ${lesson.progress.percent}%`, icon: Play }
  return { label: 'Start lesson', icon: Play }
}

function LessonCard({ lesson }) {
  const { label } = action(lesson)
  return (
    <Link
      to={`/app/lessons/${lesson.id}`}
      className="group flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-gray-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <BoardThumb lesson={lesson} />
      <div className="flex items-end justify-between gap-3 px-1 pb-1">
        <Meta lesson={lesson} />
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400">
          {label} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

/** The lesson left half-way, in front of everything else. */
function ContinueCard({ lesson }) {
  return (
    <Link
      to={`/app/lessons/${lesson.id}`}
      className="group grid items-center gap-5 rounded-3xl bg-white p-4 ring-1 ring-gray-100 shadow-sm transition hover:shadow-lg sm:grid-cols-[minmax(0,22rem)_1fr] dark:bg-gray-800 dark:ring-gray-700"
    >
      <BoardThumb lesson={lesson} />
      <div className="space-y-3 px-1">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Continue where you left off</p>
        <h2 className="text-xl font-black leading-snug text-gray-900 dark:text-white">{lesson.title}</h2>
        <Meta lesson={lesson} />
        <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${lesson.progress.percent}%` }} />
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white transition group-hover:bg-sky-600 dark:bg-white dark:text-gray-900">
          <Play size={15} fill="currentColor" /> Continue · {lesson.progress.percent}%
        </span>
      </div>
    </Link>
  )
}

function Hero({ total, done }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 px-6 py-8 text-white sm:px-10 sm:py-10"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{ backgroundImage: 'radial-gradient(circle, rgb(255 255 255 / 0.5) 1px, transparent 1.4px)', backgroundSize: '18px 18px' }}
      />
      <div className="relative flex items-center gap-6">
        <div className="min-w-0 flex-1 space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1 ring-white/25">
            <Sparkles size={13} /> AI lessons
          </span>
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">Learn it on the board with Toby</h1>
          <p className="max-w-xl text-sm leading-relaxed text-sky-50 sm:text-base">
            Short voiced lessons on a whiteboard: clear explanations, worked examples, questions to think about,
            exam secrets and a final test with your score.
          </p>
          {total > 0 && (
            <p className="text-sm font-semibold text-white/90">
              {total} {total === 1 ? 'lesson' : 'lessons'} · {done} completed
            </p>
          )}
        </div>
        <div className="hidden w-40 shrink-0 drop-shadow-xl sm:block lg:w-48">
          <TobyAvatar mood="happy" pose="point" acc="glasses" pokes={false} />
        </div>
      </div>
    </section>
  )
}

export default function AILessonsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = (searchParams.get('subject') || '').toUpperCase()

  useEffect(() => { loadBoardFont() }, [])

  const { data: lessons = [], isLoading, isError } = useQuery({
    queryKey: ['ai-lessons'],
    queryFn: () => api.get('/ai-lessons/').then((r) => r.data),
    staleTime: 60_000,
  })

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(({ key }) => [
    key, key ? lessons.filter((l) => l.subject === key || l.subject === 'GENERAL').length : lessons.length,
  ])), [lessons])
  const shown = filter ? lessons.filter((l) => l.subject === filter || l.subject === 'GENERAL') : lessons
  const resume = shown.find(inProgress)
  const done = lessons.filter((l) => l.progress.completed).length

  const pick = (key) => setSearchParams(key ? { subject: key } : {}, { replace: true })

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <Hero total={lessons.length} done={done} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Exam">
        {FILTERS.map(({ key, label }) => {
          const active = filter === key
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => pick(key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? (key ? LOOK[key].active : ALL_ACTIVE)
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 text-[11px] font-bold ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {counts[key] ?? 0}
              </span>
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-[4/3] rounded-2xl bg-gray-100 animate-pulse dark:bg-gray-800" />)}
        </div>
      ) : isError ? (
        <p className="py-16 text-center text-sm text-gray-500">The lessons did not load. Please refresh the page.</p>
      ) : !shown.length ? (
        <div className="rounded-3xl bg-white py-16 text-center ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700">
          <div className="mx-auto w-24"><TobyAvatar mood="happy" pose="rest" acc="glasses" pokes={false} /></div>
          <p className="mt-4 text-lg font-black text-gray-900 dark:text-white">
            {filter ? `No ${filter} lessons yet` : 'Lessons are on the way'}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Toby is preparing new lessons. Check back soon!</p>
        </div>
      ) : (
        <>
          {resume && <ContinueCard lesson={resume} />}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.filter((l) => l !== resume).map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
          </div>
        </>
      )}
    </div>
  )
}
