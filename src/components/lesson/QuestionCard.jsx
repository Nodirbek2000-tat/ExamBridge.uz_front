import { useState } from 'react'
import { Check, X, CircleDot, GraduationCap } from 'lucide-react'
import RichText from './RichText'

const MAX_TEXT = 2000

function optionClass(index, picked, answer) {
  if (answer) {
    if (index === answer.correct) return 'border-emerald-400 bg-emerald-50 text-emerald-900'
    if (index === answer.choice) return 'border-red-300 bg-red-50 text-red-900'
    return 'border-gray-100 text-gray-400'
  }
  return index === picked
    ? 'border-sky-400 bg-sky-50 text-sky-900'
    : 'border-gray-200 text-gray-700 hover:border-sky-300 hover:bg-sky-50/50'
}

function Verdict({ answer }) {
  // Written answers checked by the AI teacher: their own verdict and comment.
  if (answer.verdict) {
    const look = {
      correct: { icon: <Check size={16} />, label: 'Correct!', box: 'border-emerald-200 bg-emerald-50', title: 'text-emerald-700' },
      partly: { icon: <CircleDot size={16} />, label: 'Partly correct', box: 'border-amber-200 bg-amber-50', title: 'text-amber-700' },
      wrong: { icon: <X size={16} />, label: 'Not quite', box: 'border-red-200 bg-red-50', title: 'text-red-600' },
    }[answer.verdict]
    if (look) {
      return (
        <div className={`rounded-xl border px-3 py-2.5 ${look.box}`}>
          <p className={`flex items-center gap-1.5 text-sm font-bold ${look.title}`}>{look.icon} {look.label}</p>
          {answer.feedback && (
            <p className="mt-1 flex gap-1.5 text-sm leading-relaxed text-gray-700">
              <GraduationCap size={15} className="mt-0.5 shrink-0 text-gray-500" />
              <span><RichText text={answer.feedback} /></span>
            </p>
          )}
        </div>
      )
    }
  }
  if (answer.is_correct === null) {
    return (
      <p className="text-sm font-semibold text-sky-700">
        Your answer is saved. Compare it with the explanation below.
      </p>
    )
  }
  return answer.is_correct ? (
    <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Check size={16} /> Correct!</p>
  ) : (
    <p className="flex items-center gap-1.5 text-sm font-bold text-red-600"><X size={16} /> Not quite</p>
  )
}

/**
 * One question: choose or write, send, see the result. The result comes from the
 * server only after answering. `onAnswer(question, { choice } | { text })` saves it.
 */
export default function QuestionCard({ question, answer, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isChoice = question.kind === 'CHOICE'
  const ready = isChoice ? picked !== null : text.trim().length > 0

  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await onAnswer(question, isChoice ? { choice: picked } : { text })
    } catch (e) {
      setError(e?.response?.data?.error || 'Your answer was not sent. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 text-gray-900">
      <p className="font-semibold leading-relaxed"><RichText text={question.prompt} /></p>

      {isChoice ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {question.options.map((option, i) => (
            <button
              key={i}
              type="button"
              disabled={Boolean(answer) || busy}
              aria-pressed={picked === i}
              onClick={() => setPicked(i)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${optionClass(i, picked, answer)}`}
            >
              <RichText text={option} />
            </button>
          ))}
        </div>
      ) : answer ? (
        <p className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-700 whitespace-pre-line">{answer.text}</p>
      ) : (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT}
          rows={3}
          disabled={busy}
          placeholder="Write your answer"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-sky-400"
        />
      )}

      {answer ? (
        <div className="space-y-2">
          <Verdict answer={answer} />
          {answer.explanation && (
            <p className="px-3 py-2.5 rounded-xl bg-sky-50 text-sm text-sky-900 leading-relaxed">
              <RichText text={answer.explanation} />
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={send}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy ? (isChoice ? 'Sending…' : 'Your teacher is checking…') : 'Answer'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
