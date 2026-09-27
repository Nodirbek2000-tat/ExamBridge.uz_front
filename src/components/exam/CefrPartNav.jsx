/**
 * Bottom navigation for CEFR Reading / Listening exams.
 *
 * One row: the active part is a highlighted card holding its question
 * circles; every other part is a compact card ("Part 2 · 13 questions")
 * that switches to it. The action (Finish test / back to tests) sits last.
 *
 * parts:     [{ key, label, questions: [{ id, number }] }]
 * statusOf:  optional (q) => 'correct' | 'wrong' | null — colours circles in review
 */
export default function CefrPartNav({
  parts, activePart = 0, onSelectPart, answers, activeQ, onGoToQ, statusOf, action, dark = false,
}) {
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur ${dark ? 'border-gray-800 bg-gray-950/95' : 'border-gray-200 bg-slate-50/95'}`}>
      {/* Centred when it fits, scrolls sideways when it doesn't */}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        <div className="mx-auto flex w-max items-center gap-3 px-4 py-3">
          {parts.map((part, idx) => {
            const answered = part.questions.filter(q => answers[String(q.id)]).length

            if (idx === activePart) {
              return (
                <div
                  key={part.key}
                  className={`flex flex-shrink-0 items-center gap-2.5 rounded-2xl border-2 px-5 py-2.5 ${dark ? 'border-sky-500 bg-sky-500/10' : 'border-sky-400 bg-sky-50'}`}
                >
                  <span className="mr-1.5 whitespace-nowrap text-[17px] font-medium text-sky-600">{part.label}</span>
                  {part.questions.map((q, i) => {
                    const status = statusOf?.(q)
                    const isAnswered = !!answers[String(q.id)]
                    const tone = status === 'correct'
                      ? 'border-green-500 bg-green-500 text-white'
                      : status === 'wrong'
                        ? 'border-red-400 bg-red-400 text-white'
                        : isAnswered
                          ? 'border-sky-500 bg-sky-500 text-white'
                          : activeQ === i
                            ? 'border-sky-400 bg-white text-sky-600 ring-2 ring-sky-200'
                            : dark ? 'border-gray-500 bg-gray-800 text-gray-200' : 'border-gray-400 bg-white text-gray-700'
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => onGoToQ(i)}
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-[15px] font-semibold transition hover:scale-105 ${tone}`}
                      >
                        {q.number}
                      </button>
                    )
                  })}
                </div>
              )
            }

            const n = part.questions.length
            return (
              <button
                key={part.key}
                type="button"
                onClick={() => onSelectPart?.(idx)}
                className={`min-w-[10rem] flex-shrink-0 rounded-2xl border px-7 py-2 text-center transition ${dark ? 'border-gray-700 bg-gray-900 hover:border-sky-500' : 'border-gray-200 bg-white hover:border-sky-300'}`}
              >
                <div className={`text-[17px] font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{part.label}</div>
                <div className={`text-sm italic ${answered === n && n > 0 ? 'text-sky-600' : dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {answered > 0 ? `${answered} / ${n} answered` : `${n} questions`}
                </div>
              </button>
            )
          })}

          {action && <div className="ml-2 flex-shrink-0">{action}</div>}
        </div>
      </div>
    </div>
  )
}
