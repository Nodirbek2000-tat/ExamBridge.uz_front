import { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronsUpDown, Check } from 'lucide-react'

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

// Plain radio rows — "◯ A What is his name?". Used where there is no question text,
// so the options read as a short list rather than big cards.
function RadioList({ q, value, rr, onAnswer, dark, textSizeClass, reviewMode }) {
  const correct = rr ? String(rr.correct_answer || '').trim().toUpperCase() : null
  return (
    <div className="max-w-3xl space-y-1" role="radiogroup" aria-label={`Question ${q.number}`}>
      {sortOptions(q.choices || []).map(o => {
        const selected = value === o.option
        const isRight = correct === String(o.option).toUpperCase()
        const state = rr ? (isRight ? 'right' : selected ? 'wrong' : 'idle') : selected ? 'picked' : 'idle'
        const row = {
          right: 'bg-green-50 text-green-800',
          wrong: 'bg-red-50 text-red-700',
          picked: dark ? 'bg-blue-500/15 text-gray-100' : 'bg-blue-50 text-gray-900',
          idle: `${dark ? 'text-gray-200' : 'text-gray-800'} ${reviewMode ? '' : dark ? 'hover:bg-gray-800' : 'hover:bg-slate-50'}`,
        }[state]
        const ring = {
          right: 'border-green-500', wrong: 'border-red-400', picked: 'border-blue-600',
          idle: dark ? 'border-gray-600' : 'border-gray-300',
        }[state]
        const dot = { right: 'bg-green-500', wrong: 'bg-red-400', picked: 'bg-blue-600', idle: '' }[state]
        return (
          <button
            key={o.option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={reviewMode}
            onClick={() => onAnswer(q.id, selected ? '' : o.option)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${textSizeClass} ${row} ${reviewMode ? 'cursor-default' : ''}`}
          >
            <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${ring}`}>
              {dot && <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />}
            </span>
            <span className="font-semibold">{o.option}</span>
            <span className="min-w-0 flex-1 leading-snug">{o.text}</span>
          </button>
        )
      })}
    </div>
  )
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
                          // No question text (Listening Part 1 — only replies A/B/C):
                          // number on its own line, radio rows underneath
                          <>
                            <span className={numberDot}>{q.number}</span>
                            <div className="mt-2"><RadioList {...optionProps} /></div>
                          </>
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

// ── Parts 2–3: texts matched to one shared option list (TMATCH) ──────────────
function OptionDropdown({ value, options, usedBy, onChange, dark, reviewMode, rr, alignLeft = false }) {
  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const esc = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  const toggle = () => {
    if (reviewMode) return
    // Near the bottom (above the fixed nav) the list opens upwards
    const r = ref.current?.getBoundingClientRect()
    setUp(r ? window.innerHeight - r.bottom < 360 : false)
    setOpen(o => !o)
  }

  const tone = rr
    ? rr.is_correct ? 'border-green-500 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-700'
    : value
      ? dark ? 'border-blue-500 bg-gray-900 text-gray-100' : 'border-blue-400 bg-white text-gray-900'
      : dark ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-11 w-full items-center justify-between gap-2 rounded-lg border px-3 text-left transition sm:w-44 ${tone} ${reviewMode ? 'cursor-default' : 'hover:border-blue-400'}`}
      >
        <span className={`truncate ${value ? 'font-bold' : ''}`}>{value || 'Select an option'}</span>
        {rr && !rr.is_correct
          ? <span className="rounded bg-emerald-100 px-1.5 text-sm font-bold text-emerald-700">{String(rr.correct_answer || '').toUpperCase()}</span>
          : !reviewMode && <ChevronsUpDown size={15} className="flex-shrink-0 opacity-60" />}
      </button>

      {open && (
        <div
          role="listbox"
          className={`absolute ${alignLeft ? 'left-0' : 'right-0'} z-40 max-h-80 w-[min(88vw,34rem)] overflow-y-auto rounded-xl border p-1.5 shadow-2xl ${up ? 'bottom-full mb-2' : 'top-full mt-2'} ${dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}
        >
          {options.map(o => {
            const selected = value === o.option
            const takenBy = usedBy[o.option]
            return (
              <button
                key={o.option}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(selected ? '' : o.option); setOpen(false) }}
                className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                  selected
                    ? 'border-blue-400 bg-blue-50 text-blue-900'
                    : dark ? 'border-transparent text-gray-200 hover:bg-gray-800' : 'border-transparent text-gray-800 hover:bg-gray-50'
                } ${takenBy && !selected ? 'opacity-50' : ''}`}
              >
                <span className="w-5 flex-shrink-0 font-bold">{o.option}</span>
                <span className="flex-1 leading-snug">{o.text}</span>
                {selected && <Check size={16} className="mt-0.5 flex-shrink-0 text-blue-600" />}
                {takenBy && !selected && <span className="mt-0.5 flex-shrink-0 text-xs font-semibold">Q{takenBy}</span>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function OptionMatchBlock({
  passage, questions, answers, onAnswer, onFocusQ, registerRef,
  dark, textSizeClass, reviewMode, reviewMap, showCorrectInReview,
}) {
  const options = useMemo(() => sortOptions(questions.find(q => q.choices?.length)?.choices || []), [questions])
  const nums = questions.map(q => q.number)
  const range = nums.length > 1 ? `${Math.min(...nums)}–${Math.max(...nums)}` : `${nums[0]}`
  const first = options[0]?.option, last = options[options.length - 1]?.option
  const extra = options.length - questions.length
  const fallback = `Read the texts ${range} and statements ${first}–${last}. Decide which situation described in the statements matches with the given texts. Each statement can be used **ONCE** only.` +
    (extra > 0 ? ` There ${extra === 1 ? 'is' : 'are'} **${extra === 1 ? 'ONE' : extra === 2 ? 'TWO' : extra}** extra statement${extra === 1 ? '' : 's'} which you do not need to use.` : '')
  const instruction = (questions.find(q => q.group_instruction?.trim())?.group_instruction || fallback)
    .replace(/^\s*questions?\s*\d+\s*[–-]\s*\d+\s*[:.]?\s*/i, '')

  // Which question already took each option — "each statement can be used once"
  const usedBy = {}
  for (const q of questions) { const a = answers[String(q.id)]; if (a) usedBy[a] = q.number }
  // Short labels ("Speaker 1" in Listening Part 3) keep the picker right beside them
  const short = questions.every(q => String(q.content || '').trim().length <= 40)

  return (
    <div className="px-4 py-6 sm:px-6">
      {passage?.title && (
        <h2 className={`mb-4 text-center text-xl ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{passage.title}</h2>
      )}
      <div className={`mx-auto max-w-5xl rounded-3xl border px-5 py-6 sm:px-8 sm:py-7 ${dark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <h3 className="mb-2 text-xl font-semibold text-blue-600">Questions {range}</h3>
        <p className={`mb-5 whitespace-pre-line leading-relaxed ${textSizeClass} ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{boldify(instruction)}</p>

        {passage?.content?.trim() && (
          <p className={`mb-5 whitespace-pre-line leading-relaxed ${textSizeClass} ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{passage.content}</p>
        )}

        {/* The shared statement list, shown once */}
        <div className={`mb-6 space-y-2 rounded-2xl border px-4 py-4 sm:px-5 ${textSizeClass} ${dark ? 'border-gray-700 bg-gray-800/60 text-gray-100' : 'border-blue-100 bg-blue-50/50 text-gray-900'}`}>
          {options.map(o => (
            <div key={o.option} className="flex gap-2 leading-relaxed">
              <span className="flex-shrink-0 font-bold">{o.option}</span>
              <span className="flex-shrink-0">-</span>
              <span>{o.text}</span>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {questions.map(q => {
            const rr = reviewMode && showCorrectInReview ? (reviewMap?.[String(q.id)] || reviewMap?.[`n-${q.number}`]) : null
            return (
              <div
                key={q.id}
                id={`cq-${q.id}`}
                ref={el => registerRef(q.id, el)}
                onFocus={() => onFocusQ(q)}
                className={short
                  ? 'flex scroll-mt-32 flex-wrap items-center gap-x-4 gap-y-2'
                  : 'flex scroll-mt-32 flex-col gap-3 sm:flex-row sm:items-start sm:gap-5'}
              >
                <div className={`flex min-w-0 gap-2.5 ${short ? 'items-center' : 'flex-1'}`}>
                  <span className={`${short ? '' : 'mt-0.5'} inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-[13px] font-bold leading-none text-white`}>
                    {q.number}
                  </span>
                  <p className={`min-w-0 whitespace-pre-line leading-relaxed ${short ? 'font-medium' : 'flex-1'} ${textSizeClass} ${dark ? 'text-gray-100' : 'text-gray-900'}`}>{q.content}</p>
                </div>
                <div className={short ? '' : 'pl-9 sm:pl-0'}>
                  <OptionDropdown
                    value={answers[String(q.id)] || ''}
                    options={options}
                    usedBy={usedBy}
                    onChange={v => onAnswer(q.id, v)}
                    dark={dark}
                    reviewMode={reviewMode}
                    rr={rr}
                    alignLeft={short}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {reviewMode && showCorrectInReview && questions.some(q => q.answer_review) && (
          <div className={`mt-6 space-y-1.5 border-t pt-4 ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
            {questions.filter(q => q.answer_review).map(q => (
              <div key={q.id} className="flex gap-2.5 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm leading-relaxed text-yellow-900">
                <span className="font-bold">{q.number}</span>
                <span>{q.answer_review}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
