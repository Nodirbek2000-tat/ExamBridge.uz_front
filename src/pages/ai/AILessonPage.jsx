import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpenCheck, Lock } from 'lucide-react'
import api from '../../api/client'
import LessonPlayer from '../../components/lesson/LessonPlayer'
import QuestionCard from '../../components/lesson/QuestionCard'

// Dragging along the timeline crosses many steps; only where it stops is saved.
const PROGRESS_DELAY_MS = 800

function Homework({ lesson, answers, onAnswer }) {
  const { homework, homework_count: total } = lesson
  if (!total) return null

  if (!homework) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3 text-gray-500">
        <Lock size={18} className="flex-shrink-0" />
        <p className="text-sm">Homework ({total} {total === 1 ? 'question' : 'questions'}) opens when you finish the lesson.</p>
      </section>
    )
  }

  const done = homework.filter((q) => answers[q.id]).length
  const right = homework.filter((q) => answers[q.id]?.is_correct).length

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <BookOpenCheck size={18} className="text-sky-500" /> Homework
        </h2>
        <p className="text-xs text-gray-500">Done: {done} / {total} · Correct: {right}</p>
      </div>
      <ol className="divide-y divide-gray-50">
        {homework.map((question, i) => (
          <li key={question.id} className="p-5 space-y-1.5">
            <p className="text-xs font-semibold text-gray-400">Question {i + 1}</p>
            <QuestionCard question={question} answer={answers[question.id]} onAnswer={onAnswer} />
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function AILessonPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [given, setGiven] = useState({})
  const progressTimer = useRef(0)

  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['ai-lesson', id],
    queryFn: () => api.get(`/ai-lessons/${id}/`).then((r) => r.data),
    // Not refetched while open (the player reads it once), and not kept after leaving:
    // the next visit must resume from the real position with the real answers.
    staleTime: Infinity,
    gcTime: 0,
  })

  useEffect(() => () => clearTimeout(progressTimer.current), [])

  const answers = useMemo(() => {
    const saved = {}
    for (const question of [...(lesson?.questions ?? []), ...(lesson?.homework ?? [])]) {
      if (question.answer) saved[question.id] = question.answer
    }
    return { ...saved, ...given }
  }, [lesson, given])

  const handleAnswer = useCallback(async (question, body) => {
    const { data } = await api.post(`/ai-lessons/questions/${question.id}/answer/`, body)
    setGiven((current) => ({ ...current, [question.id]: data }))
  }, [])

  const handleProgress = useCallback(({ step, ended }) => {
    clearTimeout(progressTimer.current)
    const save = () => api.post(`/ai-lessons/${id}/progress/`, { step, completed: ended })
      .then(() => {
        if (!ended) return
        queryClient.invalidateQueries({ queryKey: ['ai-lesson', id] })
        queryClient.invalidateQueries({ queryKey: ['ai-lessons'] })
      })
      .catch(() => {})                // a lost save only costs the resume position
    if (ended) save()
    else progressTimer.current = setTimeout(save, PROGRESS_DELAY_MS)
  }, [id, queryClient])

  if (isLoading) {
    return <div className="max-w-6xl mx-auto aspect-video bg-gray-100 rounded-2xl animate-pulse" />
  }
  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-16 text-center">
        <p className="text-gray-500">Lesson not found.</p>
        <Link to="/app/ai?tab=lessons" className="text-sm font-semibold text-sky-600 hover:underline">Back to lessons</Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <Link
        to={`/app/ai?subject=${lesson.subject}&tab=lessons`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-sky-600"
      >
        <ArrowLeft size={16} /> Lessons
      </Link>
      <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>

      <LessonPlayer
        key={lesson.id}
        steps={lesson.steps}
        startIndex={lesson.progress.completed ? 0 : lesson.progress.last_step}
        questions={lesson.questions}
        answers={answers}
        onAnswer={handleAnswer}
        onProgress={handleProgress}
      />

      <Homework lesson={lesson} answers={answers} onAnswer={handleAnswer} />
    </div>
  )
}
