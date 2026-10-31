import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'
import api from '../../api/client'

function LessonCard({ lesson }) {
  const { progress } = lesson
  return (
    <Link
      to={`/app/lessons/${lesson.id}`}
      className="block p-4 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-sky-200 hover:shadow transition"
    >
      <p className="font-semibold text-gray-900 leading-snug">{lesson.title}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1"><Clock size={13} /> {lesson.duration_minutes} daqiqa</span>
        {lesson.level && <span>{lesson.level}</span>}
        {progress.completed && (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            <CheckCircle2 size={13} /> Tugatilgan
          </span>
        )}
      </div>
      {!progress.completed && progress.percent > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress.percent}%` }} />
        </div>
      )}
    </Link>
  )
}

export default function LessonsTab({ subject }) {
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['ai-lessons', subject],
    queryFn: () => api.get('/ai-lessons/', { params: { subject } }).then((r) => r.data),
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
      </div>
    )
  }

  if (!lessons?.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={26} className="text-gray-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Coming soon</h2>
          <p className="text-gray-500 mt-2 text-sm">AI video explanation is being prepared.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {lessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}
    </div>
  )
}
