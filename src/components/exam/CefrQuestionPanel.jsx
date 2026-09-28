// Shared CEFR question panel — Reading Parts 4–5 and Listening use the same look:
// "Questions X–Y" blue header, instruction, blue number circle, option rows,
// T/F/NG pills and summary text with inline gap boxes. Review colours the
// correct option green and a wrong pick red.

export const boldify = (str) => String(str).split(/\*\*(.*?)\*\*/g).map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p))

// One inline answer box: blue number + input that grows with the word.
// Used by Reading Part 1 (gaps in the passage) and summaries (gaps in the text).
export function GapBox({ q, value, rr, onAnswer, onFocusQ, registerRef, dark, reviewMode }) {
  const state = rr ? (rr.is_correct ? 'correct' : 'wrong') : value ? 'filled' : 'empty'
  const tone = {
    empty: dark ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-200 bg-gray-100 text-gray-900',
    filled: dark ? 'border-blue-500 bg-gray-900 text-gray-100' : 'border-blue-400 bg-white text-gray-900',
    correct: 'border-green-500 bg-green-50 text-green-800',
    wrong: 'border-red-400 bg-red-50 text-red-700',
  }[state]

  return (
    <span
      id={`cq-${q.id}`}
      ref={el => registerRef(q.id, el)}
      className="mx-1 my-1 inline-flex scroll-mt-32 items-center gap-1.5 whitespace-nowrap align-middle"
    >
      <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold leading-none text-white">
        {q.number}
      </span>
      <input
        type="text"
        value={value}
        readOnly={reviewMode}
        onChange={e => onAnswer(q.id, e.target.value)}
        onFocus={() => onFocusQ(q)}
        aria-label={`Gap ${q.number}`}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        // Grows with the word, within sensible bounds
        style={{ width: `${Math.min(Math.max(value.length + 3, 7), 18)}ch`, fontSize: 'inherit' }}
        className={`h-11 rounded-lg border px-2 text-center font-medium leading-none outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${tone} ${reviewMode ? 'cursor-default' : ''}`}
      />
      {rr && !rr.is_correct && (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[0.85em] font-semibold leading-snug text-emerald-700">
          {String(rr.correct_answer || '').split('|')[0]}
        </span>
      )}
    </span>
  )
}

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 }
// Choices come back sorted as strings — fine for A–J, wrong for i..x headings
export const sortOptions = (opts) => [...opts].sort((a, b) => {
  const ra = ROMAN[String(a.option).toLowerCase()], rb = ROMAN[String(b.option).toLowerCase()]
  return ra && rb ? ra - rb : String(a.option).localeCompare(String(b.option))
})

// Types this panel draws natively. A part containing anything else falls back
// to the older generic renderer so previously imported tests keep working.
export const PANEL_TYPES = new Set(['MCQ', 'TFNG', 'YNNG', 'NOTE', 'SUMM'])
const FIXED_OPTIONS = { TFNG: ['TRUE', 'FALSE', 'NOT GIVEN'], YNNG: ['YES', 'NO', 'NOT GIVEN'] }
const stripRangeLine = (s) => s.replace(/^\s*questions?\s*\d+\s*[–-]\s*\d+\s*[:.]?\s*\n?/i, '')

// True when every question can be drawn by the panel (summary with a word bank can't)
export const fitsPanel = (questions) => questions.length > 0 && questions.every(q =>
  PANEL_TYPES.has(q.question_type) && !(q.question_type === 'SUMM' && q.word_bank?.length))

function groupQuestions(questions) {
  // Consecutive questions share a group when they repeat the same instruction
  // or leave it blank; a summary (NOTE/SUMM) never mixes with choice questions.
  const groups = []
  for (const q of questions) {
    const gi = (q.group_instruction || '').trim()
    const kind = q.question_type === 'NOTE' || q.question_type === 'SUMM' ? 'summary' : 'items'
    const last = groups[groups.length - 1]
    if (last && last.kind === kind && (!gi || gi === last.instruction)) last.questions.push(q)
    else groups.push({ kind, instruction: gi, questions: [q] })
  }
  return groups
}

export function RichText({ text, className, renderGap }) {
  // **bold**, paragraphs on blank lines, [N] → gap when a renderer is given
  // className may be a function of the paragraph (e.g. taller lines only where gaps are)
  return String(text || '').split(/\n\s*\n/).filter(p => p.trim()).map((para, pi) => (
    <p key={pi} className={typeof className === 'function' ? className(para) : className}>
      {para.split('\n').map((line, li) => (
        <span key={li}>
          {li > 0 && <br />}
          {line.split(/(\[\d+\])/g).map((seg, si) => {
            const m = renderGap && seg.match(/^\[(\d+)\]$/)
            return m ? <span key={si}>{renderGap(Number(m[1]))}</span> : <span key={si}>{boldify(seg)}</span>
          })}
        </span>
      ))}
    </p>
  ))
}

function OptionList({ q, value, rr, onAnswer, dark, textSizeClass, reviewMode }) {
  const correct = rr ? String(rr.correct_answer || '').trim().toUpperCase() : null
  const pills = !!FIXED_OPTIONS[q.question_type]
  const options = pills
    ? FIXED_OPTIONS[q.question_type].map(o => ({ option: o, text: '' }))
    : sortOptions(q.choices || [])

  return (
    <div className={pills ? 'flex flex-wrap gap-2' : 'space-y-2'}>
      {options.map(o => {
        const selected = value === o.option
        const isRight = correct === String(o.option).toUpperCase()
        const tone = rr
          ? isRight ? 'border-green-500 bg-green-50 text-green-800'
            : selected ? 'border-red-400 bg-red-50 text-red-700'
              : dark ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
          : selected ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-200'
            : dark ? 'border-gray-700 text-gray-200 hover:border-gray-500' : 'border-gray-200 text-gray-800 hover:border-blue-300 hover:bg-blue-50/40'
        return (
          <button
            key={o.option}
            type="button"
            disabled={reviewMode}
            onClick={() => onAnswer(q.id, selected ? '' : o.option)}
            className={`rounded-xl border text-left transition ${pills ? 'px-4 py-2 text-sm font-bold tracking-wide' : `flex w-full items-start gap-3 px-4 py-2.5 ${textSizeClass}`} ${tone} ${reviewMode ? 'cursor-default' : ''}`}
          >
            {pills ? o.option : (
              <>
                <span className="w-5 flex-shrink-0 font-bold">{o.option}</span>
                <span className="flex-1 leading-snug">{o.text}</span>
              </>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function CefrQuestionPanel({ questions, answers, onAnswer, onFocusQ, registerRef, dark, textSizeClass, reviewMode, reviewMap }) {
  const rrOf = (q) => (reviewMode ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null)
  const textMain = dark ? 'text-gray-100' : 'text-gray-900'
  const card = dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
  const numberDot = 'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold leading-none text-white'

  return (
    <div className="space-y-5">
      {groupQuestions(questions).map((g, gi) => {
        const nums = g.questions.map(q => q.number)
        const range = nums.length > 1 ? `${Math.min(...nums)}–${Math.max(...nums)}` : `${nums[0]}`
        const byNumber = Object.fromEntries(g.questions.map(q => [q.number, q]))

        return (
          <div key={gi} className={`rounded-3xl border px-5 py-5 sm:px-6 ${card}`}>
            <h3 className="mb-2 text-xl font-semibold text-blue-600">Questions {range}</h3>

            {g.kind === 'summary' ? (
              // Summary text with the gaps inside it
              <RichText
                text={stripRangeLine(g.instruction)}
                className={(para) => /\[\d+\]/.test(para)
                  ? `mb-3 leading-[2.6] last:mb-0 ${textSizeClass} ${textMain}`
                  : `mb-3 leading-relaxed ${textSizeClass} ${dark ? 'text-gray-300' : 'text-gray-700'}`}
                renderGap={(n) => {
                  const q = byNumber[n]
                  if (!q) return `[${n}]`
                  return <GapBox q={q} value={answers[String(q.id)] || ''} rr={rrOf(q)} onAnswer={onAnswer}
                    onFocusQ={onFocusQ} registerRef={registerRef} dark={dark} reviewMode={reviewMode} />
                }}
              />
            ) : (
              <>
                {g.instruction && (
                  <RichText text={stripRangeLine(g.instruction)} className={`mb-2 leading-relaxed ${textSizeClass} ${dark ? 'text-gray-300' : 'text-gray-700'}`} />
                )}
                <div className="mt-4 space-y-6">
                  {g.questions.map(q => {
                    const optionProps = {
                      q, value: answers[String(q.id)] || '', rr: rrOf(q), onAnswer, dark, textSizeClass, reviewMode,
                    }
                    return (
                      <div key={q.id} id={`cq-${q.id}`} ref={el => registerRef(q.id, el)} onClick={() => onFocusQ(q)} className="scroll-mt-28">
                        {q.content ? (
                          <>
                            <div className="mb-3 flex gap-2.5">
                              <span className={`mt-0.5 ${numberDot}`}>{q.number}</span>
                              <p className={`min-w-0 flex-1 font-semibold leading-relaxed ${textSizeClass} ${textMain}`}>{q.content}</p>
                            </div>
                            <div className="pl-9"><OptionList {...optionProps} /></div>
                          </>
                        ) : (
                          // No question text (e.g. Listening Part 1 — only replies A/B/C):
                          // the number sits beside the options
                          <div className="flex gap-2.5">
                            <span className={`mt-2 ${numberDot}`}>{q.number}</span>
                            <div className="min-w-0 flex-1"><OptionList {...optionProps} /></div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
