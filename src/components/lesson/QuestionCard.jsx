import { useState } from 'react'
import { Check, X } from 'lucide-react'
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
  if (answer.is_correct === null) {
    return (
      <p className="text-sm font-semibold text-sky-700">
        Javobingiz qabul qilindi. Quyidagi yechim bilan solishtirib ko'ring.
      </p>
    )
  }
  return answer.is_correct ? (
    <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Check size={16} /> To'g'ri!</p>
  ) : (
    <p className="flex items-center gap-1.5 text-sm font-bold text-red-600"><X size={16} /> Noto'g'ri</p>
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
      setError(e?.response?.data?.error || "Javob yuborilmadi. Yana urinib ko'ring.")
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
          placeholder="Javobingizni yozing"
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
            {busy ? 'Yuborilmoqda…' : 'Javob berish'}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
