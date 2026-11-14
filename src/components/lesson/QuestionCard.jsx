import { useState } from 'react'
import { Check, X, CircleDot, GraduationCap } from 'lucide-react'
import RichText from './RichText'

const MAX_TEXT = 2000
const MAX_GAP = 200
const GAP = /_{3,}/

// Answered by picking one of the options; the rest are typed.
const PICKED = new Set(['CHOICE', 'TRUE_FALSE', 'MISTAKE'])

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

// In "find the mistake" the right pick is the wrong part: it is crossed out once answered.
function partClass(index, picked, answer) {
  if (answer) {
    if (index === answer.correct) return 'border-amber-400 bg-amber-50 text-amber-900 line-through decoration-red-500 decoration-2'
    if (index === answer.choice) return 'border-red-300 bg-red-50 text-red-900'
    return 'border-transparent text-gray-500'
  }
  return index === picked
    ? 'border-sky-400 bg-sky-50 text-sky-900'
    : 'border-dashed border-gray-300 text-gray-800 hover:border-sky-300 hover:bg-sky-50/50'
}

function Verdict({ answer, kind }) {
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
  if (answer.is_correct) {
    return <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Check size={16} /> Correct!</p>
  }
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-1.5 text-sm font-bold text-red-600"><X size={16} /> Not quite</p>
      {kind === 'GAP' && answer.accepted?.length > 0 && (
        <p className="text-sm text-gray-700">Right answer: <span className="font-bold text-emerald-700">{answer.accepted[0]}</span></p>
      )}
    </div>
  )
}

/** A sentence with one gap: typed into the gap itself. */
function GapPrompt({ prompt, value, onChange, onEnter, answer, disabled }) {
  const [before, after = ''] = prompt.split(GAP)
  let gap
  if (answer) {
    gap = (
      <span className={`inline-block px-1.5 mx-0.5 rounded-md font-bold ${answer.is_correct ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600 line-through'}`}>
        {answer.text}
      </span>
    )
  } else {
    gap = (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter() }}
        maxLength={MAX_GAP}
        disabled={disabled}
        aria-label="The missing part"
        placeholder="type here"
        size={Math.max(8, value.length + 1)}
        className="mx-1 px-1.5 py-0.5 border-0 border-b-2 border-sky-300 bg-sky-50/60 rounded-t-md text-center font-bold text-sky-900 placeholder:text-sky-300 placeholder:font-normal focus:outline-none focus:border-sky-500"
      />
    )
  }
  return (
    <p className="font-semibold leading-loose">
      <RichText text={before} />{gap}<RichText text={after} />
    </p>
  )
}

/**
 * One question: choose, type or write, send, see the result. The result comes from
 * the server only after answering. `onAnswer(question, { choice } | { text })` saves it.
 */
export default function QuestionCard({ question, answer, onAnswer }) {
  const [picked, setPicked] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { kind } = question
  const isPick = PICKED.has(kind)
  const ready = isPick ? picked !== null : text.trim().length > 0

  const send = async () => {
    if (!ready || busy || answer) return
    setBusy(true)
    setError('')
    try {
      await onAnswer(question, isPick ? { choice: picked } : { text })
    } catch (e) {
      setError(e?.response?.data?.error || 'Your answer was not sent. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const pickButton = (i, className, children) => (
    <button
      key={i}
      type="button"
      disabled={Boolean(answer) || busy}
      aria-pressed={picked === i}
      onClick={() => setPicked(i)}
      className={className}
    >
      {children}
    </button>
  )

  let body = null
  if (kind === 'CHOICE') {
    body = (
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option, i) => pickButton(
          i,
          `text-left px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${optionClass(i, picked, answer)}`,
          <RichText text={option} />,
        ))}
      </div>
    )
  } else if (kind === 'TRUE_FALSE') {
    body = (
      <div className="grid grid-cols-2 gap-2">
        {question.options.map((option, i) => pickButton(
          i,
          `flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 text-base font-bold transition-colors ${optionClass(i, picked, answer)}`,
          <>{i === 0 ? <Check size={18} /> : <X size={18} />} {option}</>,
        ))}
      </div>
    )
  } else if (kind === 'MISTAKE') {
    body = (
      <div className="space-y-1.5">
        {!answer && <p className="text-xs font-semibold text-gray-500">Tap the part with the mistake.</p>}
        <div className="flex flex-wrap gap-1.5">
          {question.options.map((part, i) => pickButton(
            i,
            `px-2.5 py-1.5 rounded-lg border-2 text-sm font-semibold transition-colors ${partClass(i, picked, answer)}`,
            <RichText text={part} />,
          ))}
        </div>
      </div>
    )
  } else if (kind === 'WRITTEN') {
    body = answer ? (
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
    )
  }

  return (
    <div className="space-y-3 text-gray-900">
      {kind === 'GAP' ? (
        <GapPrompt prompt={question.prompt} value={text} onChange={setText} onEnter={send} answer={answer} disabled={busy} />
      ) : (
        <p className="font-semibold leading-relaxed"><RichText text={question.prompt} /></p>
      )}

      {body}

      {answer ? (
        <div className="space-y-2">
          <Verdict answer={answer} kind={kind} />
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
            {busy ? (kind === 'WRITTEN' ? 'Your teacher is checking…' : 'Checking…') : 'Answer'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
