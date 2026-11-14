import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import api from '../../api/client'
import { loadBoardFont } from './boardFont'
import { LessonCard } from './LessonCards'

/**
 * The student's weak spots — topics and question types they answer worst, and
 * the grammar the AI keeps correcting in their writing and speaking — with the
 * AI lessons that teach them. `exam` (sat, ielts, cefr) narrows it to one exam.
 * Shows nothing until there is a weak spot to talk about.
 */
export default function RecommendedLessons({ exam }) {
  useEffect(() => { loadBoardFont() }, [])
  const { data } = useQuery({
    queryKey: ['ai-lessons-recommended', exam || 'all'],
    queryFn: () => api.get('/ai-lessons/recommended/', { params: exam ? { exam } : {} }).then((r) => r.data),
    staleTime: 5 * 60_000,
  })

  if (!data?.spots?.length) return null

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:p-6 dark:bg-gray-800 dark:ring-gray-700">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/30">
          <Target size={19} className="text-amber-600 dark:text-amber-400" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Lessons for your weak spots</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            From your answers, and the mistakes the AI found in your writing and speaking.
          </p>
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Your weak spots">
        {data.spots.map((spot) => (
          <li
            key={`${spot.area}-${spot.name}`}
            className="rounded-xl bg-red-50 px-3 py-1.5 text-xs ring-1 ring-red-100 dark:bg-red-900/20 dark:ring-red-900/40"
          >
            <span className="font-bold text-red-700 dark:text-red-300">{spot.name}</span>
            <span className="text-red-500/80 dark:text-red-300/70"> · {spot.result}</span>
          </li>
        ))}
      </ul>

      {data.lessons.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} covers={lesson.covers} />)}
        </div>
      ) : (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No lesson on these yet — Toby is preparing them. Meanwhile, see{' '}
          <Link to="/app/lessons" className="font-semibold text-sky-600 hover:underline dark:text-sky-400">all AI lessons</Link>.
        </p>
      )}
    </section>
  )
}
