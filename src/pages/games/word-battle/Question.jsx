/* One question: the prompt (by type) and the four answer buttons. */
import { Check, Volume2, X } from 'lucide-react'
import { POS_UZ, TYPE_META } from './theme'

/* the server blanks every use of the word ("_____"), so a sentence can have more than one gap */
function Cloze({ text }) {
  const parts = String(text).split('_____')
  return (
    <p className="text-[19px] font-semibold leading-relaxed text-white sm:text-[24px]" lang="en">
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && (
            <span className="mx-1 inline-block min-w-[86px] translate-y-[3px] border-b-[3px] border-[#5CC2FF] sm:min-w-[120px]" role="img" aria-label="bo‘sh joy" />
          )}
        </span>
      ))}
    </p>
  )
}

export function QuestionCard({ q, fb, onReplay, listening }) {
  const meta = TYPE_META[q.t] || TYPE_META.en_uz
  const pos = POS_UZ[q.pos] || ''
  const big = 'text-[30px] font-black leading-tight tracking-tight text-white sm:text-[42px]'
  let body
  if (q.t === 'cloze') {
    body = <Cloze text={q.prompt} />
  } else if (q.t === 'listen') {
    body = (
      <div className="flex items-center gap-4">
        <button type="button" onClick={onReplay} aria-label="Yana eshitish"
          className={`relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#5CC2FF] text-[#04121D] shadow-[0_12px_32px_-12px_rgba(92,194,255,.95)] transition hover:bg-[#7DD0FF] active:scale-95 sm:h-[72px] sm:w-[72px] ${listening ? 'wb-pulse' : ''}`}>
          <Volume2 size={28} />
        </button>
        {fb ? <span className={big}>{fb.word}</span> : (
          <span className="text-[15px] leading-snug text-white/55">
            {listening ? 'Tinglang…' : 'So‘zni eshitdingizmi? Ma’nosini tanlang.'}
            <span className="mt-0.5 block text-[13px] text-white/35">Yana eshitish uchun tugmani bosing<span className="hidden sm:inline"> (R)</span></span>
          </span>
        )}
      </div>
    )
  } else {
    body = <p className={`${big} break-words`} lang={q.t === 'uz_en' ? 'uz' : 'en'}>{q.prompt}</p>
  }
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#111118] px-5 py-5 sm:px-7 sm:py-6">
      <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white/45">
        <span className="text-[#8FD5FF]">{meta.label}</span>
        {pos && q.t !== 'cloze' && q.t !== 'uz_en' && q.t !== 'listen' && (
          <span className="rounded-md border border-white/[0.08] px-1.5 py-0.5 text-[11px] normal-case tracking-normal text-white/45">{pos}</span>
        )}
      </div>
      {body}
    </div>
  )
}

const LETTERS = ['A', 'B', 'C', 'D']

/* picked: the learner's choice (index or null) · fb: the server's verdict (has .key) */
export function Options({ q, picked, fb, locked, onPick }) {
  const uz = q.t === 'en_uz' || q.t === 'listen'
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3" role="group" aria-label="Javoblar">
      {q.options.map((opt, i) => {
        const isKey = fb && fb.key === i
        const isMine = picked === i
        const wrongMine = fb && isMine && !fb.correct
        const tone = isKey
          ? 'border-emerald-400/60 bg-emerald-400/[0.12] text-white'
          : wrongMine
            ? 'border-rose-400/60 bg-rose-400/[0.12] text-white'
            : fb
              ? 'border-white/[0.05] bg-[#0F0F15] text-white/35'
              : isMine
                ? 'border-[#5CC2FF]/70 bg-[#5CC2FF]/[0.12] text-white'
                : 'border-white/[0.08] bg-[#111118] text-white/90 hover:border-white/20 hover:bg-[#17171F]'
        return (
          <button key={i} type="button" disabled={locked} onClick={() => onPick(i)} lang={uz ? 'uz' : 'en'}
            className={`group flex min-h-[56px] w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition duration-150 active:scale-[0.99] disabled:cursor-default sm:min-h-[64px] sm:px-4 ${tone}`}>
            <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[13px] font-black
              ${isKey ? 'bg-emerald-400 text-[#052E1F]' : wrongMine ? 'bg-rose-400 text-[#3A0A14]' : 'bg-white/[0.06] text-white/55'}`}>
              {isKey ? <Check size={17} strokeWidth={3} /> : wrongMine ? <X size={17} strokeWidth={3} /> : LETTERS[i]}
            </span>
            <span className="min-w-0 flex-1 text-[16px] font-semibold leading-snug sm:text-[17px]">{opt}</span>
          </button>
        )
      })}
    </div>
  )
}
