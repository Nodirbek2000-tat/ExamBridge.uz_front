import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import api from '../../api/client'
import LessonPlayer from '../../components/lesson/LessonPlayer'

export default function AdminLessonPreview() {
  const { id } = useParams()
  const [answers, setAnswers] = useState({})
  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['admin-ai-lesson-play', id],
    queryFn: () => api.get(`/admin/ai-lessons/${id}/play/`).then((r) => r.data),
    // Fresh on every visit: the steps or the voice may have just changed.
    staleTime: Infinity,
    gcTime: 0,
  })

  // Checked like a student's answer, written ones by the AI teacher too, but kept nowhere.
  const handleAnswer = useCallback(async (question, body) => {
    const { data } = await api.post(`/admin/ai-lessons/questions/${question.id}/try/`, body)
    setAnswers((current) => ({ ...current, [question.id]: data }))
  }, [])

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={`/admin-panel/ai-lessons?lesson=${id}`} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-sky-600">
          <ArrowLeft size={16} /> Back to the lesson
        </Link>
        <span className="text-xs text-gray-400">Preview: students cannot see this yet. Your answers are checked but not saved.</span>
      </div>

      {lesson && <h2 className="text-lg font-bold text-gray-900">{lesson.title}</h2>}

      {isLoading ? (
        <div className="aspect-video bg-gray-100 rounded-2xl animate-pulse" />
      ) : error ? (
        <p className="text-sm text-red-500">Failed to load the lesson: {error.message}</p>
      ) : !lesson.steps.length ? (
        <p className="py-14 text-center text-sm text-gray-400">This lesson has no steps yet.</p>
      ) : (
        <LessonPlayer
          key={lesson.id}
          steps={lesson.steps}
          questions={lesson.questions}
          answers={answers}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}
