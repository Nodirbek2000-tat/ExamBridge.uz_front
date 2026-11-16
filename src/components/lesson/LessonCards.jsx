import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, Play, RotateCcw, Target, Zap } from 'lucide-react'
import { LOOK, inProgress } from './lessonLook'

/*
 * A lesson as students see it in a list: a little whiteboard with its title
 * handwritten (load the board font with boardFont.js), its length and level,
 * and how far they got. Used by the lessons page and the recommendations.
 */

const SECTIONS = {
  general: '', math: 'Math', reading_writing: 'Reading & Writing', reading: 'Reading',
  listening: 'Listening', writing: 'Writing', speaking: 'Speaking', grammar: 'Grammar',
}

/** A lesson as a little whiteboard: its title handwritten, the exam's colour underlining it. */
export function BoardThumb({ lesson, large = false }) {
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
      {/* clear of the exam badge above it */}
      <div className="absolute inset-0 flex flex-col justify-center px-[7%] pt-10 pb-[6%]">
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

export function Meta({ lesson }) {
  const section = SECTIONS[lesson.section]
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
      <span className="inline-flex items-center gap-1"><Clock size={13} /> {lesson.duration_minutes} min</span>
      {section && <span>· {section}</span>}
      {lesson.level && <span>· {lesson.level}</span>}
      {lesson.xp > 0 && (
        <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700 dark:text-amber-400">
          · <Zap size={12} fill="currentColor" /> {lesson.xp} XP
        </span>
      )}
    </div>
  )
}

function action(lesson) {
  if (lesson.progress.completed) return { label: 'Watch again', icon: RotateCcw }
  if (lesson.progress.percent > 0) return { label: `Continue · ${lesson.progress.percent}%`, icon: Play }
  return { label: 'Start lesson', icon: Play }
}

export function LessonCard({ lesson, covers }) {
  const { label } = action(lesson)
  return (
    <Link
      to={`/app/lessons/${lesson.id}`}
      className="group flex flex-col gap-3 rounded-2xl bg-white p-3 ring-1 ring-gray-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
    >
      <BoardThumb lesson={lesson} />
      {covers?.length > 0 && (
        <p className="flex items-start gap-1.5 px-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Target size={13} className="mt-0.5 shrink-0" />
          <span>Covers your weak spot: {covers.map((c) => c.name).join(', ')}</span>
        </p>
      )}
      <div className="flex items-end justify-between gap-3 px-1 pb-1">
        <Meta lesson={lesson} />
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400">
          {label} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}
