import { useMutation } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Mic, RefreshCw, Sparkles, XCircle } from 'lucide-react'
import api from '../../api/client'
import { isLessonBusy } from './lessonStatus'

const STAGES = {
  PLAN: 'Planning the lesson',
  SCRIPT: 'Writing the script',
  QUESTIONS: 'Writing questions',
  REVIEW: 'Checking the lesson',
  VOICE: 'Recording the voice',
}
const errorOf = (e) => e?.response?.data?.error || e?.response?.data?.detail || e.message

function Progress({ job }) {
  const percent = job.total ? Math.round((job.done / job.total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-gray-700">
        {job.status === 'QUEUED' ? 'Waiting for the worker…' : `${STAGES[job.stage] || 'Starting'}…`}
        {job.total > 1 && <span className="ml-1.5 font-medium text-gray-400">{job.done} / {job.total}</span>}
      </p>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-sky-500 transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function Review({ review }) {
  const good = review.verdict === 'GOOD'
  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${good ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}`}>
      <p className={`flex items-center gap-1.5 text-sm font-bold ${good ? 'text-emerald-700' : 'text-amber-700'}`}>
        {good ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
        {good ? 'AI check: looks good' : 'AI check: needs work'}
      </p>
      {review.summary && <p className="text-sm text-gray-700">{review.summary}</p>}
      {review.issues?.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-0.5">
          {review.issues.map((issue, i) => <li key={i}>{issue}</li>)}
        </ul>
      )}
    </div>
  )
}

/** Writing the lesson with AI and recording its voice, with what is happening right now. */
export default function LessonJob({ lesson, onChanged }) {
  const { job } = lesson
  const busy = isLessonBusy(lesson)
  const failed = job?.status === 'FAILED'
  const hasSteps = lesson.steps_count > 0
  const unvoiced = lesson.steps.filter((s) => !s.voiced).length
  const published = lesson.status === 'PUBLISHED'
  const fakeLesson = lesson.ai_provider === 'fake'

  const generate = useMutation({
    mutationFn: (restart) => api.post(`/admin/ai-lessons/${lesson.id}/generate/`, { restart }),
    onSuccess: onChanged,
  })
  const approve = useMutation({
    mutationFn: () => api.post(`/admin/ai-lessons/${lesson.id}/approve/`),
    onSuccess: onChanged,
  })
  const pending = generate.isPending || approve.isPending

  const writeAgain = () => {
    const question = 'Write the lesson again? The current steps and the AI questions will be replaced, and it costs tokens.'
    if (!hasSteps || window.confirm(question)) generate.mutate(true)
  }
  const record = () => {
    const question = `Record the voice for ${unvoiced} steps? This costs money, so read the lesson first.`
    if (window.confirm(question)) approve.mutate()
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
      <div>
        <h3 className="font-bold text-gray-900 text-sm">AI teacher</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          It writes from the brief and sources, then checks its own work. The voice is recorded only after you approve.
        </p>
      </div>

      {lesson.ai_mode === 'fake' && (
        <p className="text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          Test mode: the fake AI writes sample text and silent audio. Such lessons cannot be published.
        </p>
      )}

      {busy && job && <Progress job={job} />}

      {failed && !busy && (
        <p className="flex items-start gap-1.5 text-sm text-red-600">
          <XCircle size={15} className="mt-0.5 flex-shrink-0" /> {job.error || 'The job failed.'}
        </p>
      )}

      {!busy && job?.review && <Review review={job.review} />}

      {!busy && job?.skipped?.length > 0 && (
        <p className="text-xs text-gray-500">
          The AI did not read: {job.skipped.join(', ')}. Links and images are not opened; paste their text as a source.
        </p>
      )}

      {!busy && !published && (
        <div className="flex flex-wrap items-center gap-2">
          {failed && job.kind === 'GENERATE' ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => generate.mutate(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                <RefreshCw size={14} /> Continue where it stopped
              </button>
              <button type="button" disabled={pending} onClick={writeAgain} className="px-3 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">
                Start over
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={writeAgain}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                hasSteps ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-sky-500 hover:bg-sky-600 text-white'
              }`}
            >
              <Sparkles size={14} /> {hasSteps ? 'Write again' : 'Write with AI'}
            </button>
          )}

          {hasSteps && unvoiced > 0 && (
            <button
              type="button"
              disabled={pending}
              onClick={record}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Mic size={14} /> {failed && job.kind === 'VOICE' ? 'Continue recording' : 'Approve and record voice'}
            </button>
          )}
        </div>
      )}

      {fakeLesson && !busy && <p className="text-xs text-gray-400">This lesson was written by the fake AI.</p>}
      {generate.error && <p className="text-sm text-red-500">{errorOf(generate.error)}</p>}
      {approve.error && <p className="text-sm text-red-500">{errorOf(approve.error)}</p>}
    </section>
  )
}
