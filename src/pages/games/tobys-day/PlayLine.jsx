/*
 * TOBY'S DAY — the task card of the play screen (what to say, and how).
 *
 *   say     the line with its picture; the words light up while they are heard
 *           (karaoke — never red while the learner is still talking)
 *   choice  picture cards; the sentence follows the card being said
 *   listen  a character says something (the text is hidden): tap the matching
 *           picture — then the line to say appears
 *   ask     a character asks; the accepted answers are hint chips (tap = hear one)
 *   gap     the sentence with one word missing + three pictures; the right picture
 *           (or saying the right word) fills the gap
 *
 * After a try that did not pass: missed words red, nearly-right words amber.
 * The Uzbek hint is quiet, and grows after two failed tries.
 */
import { motion as Motion } from 'framer-motion'
import { Lightbulb, Volume2 } from 'lucide-react'
import { normalizeWords } from '../../../games/voice/speechMatch'
import { ItemIcon } from './items'
import { Portrait } from './characters'
import { SPEAKERS, STEP_TYPES, hasPortrait, stepType } from './content'

const JUDGED = {
  ok: 'text-emerald-300',
  close: 'text-amber-300 underline decoration-amber-400/80 decoration-2 underline-offset-[5px]',
  miss: 'text-rose-300 underline decoration-rose-400/80 decoration-wavy decoration-2 underline-offset-[5px]',
}
const LIVE = { ok: 'text-emerald-300', close: 'text-emerald-200' }
// a lit word hops up a little (a scale pop would cover the spaces around long words)
const HOP = { y: [0, -3, 0], scale: 1, opacity: 1 }
const STILL = { y: 0, scale: 1, opacity: 1 }

const plainWords = (text) => String(text || '').split(/\s+/).filter(Boolean).map(t => ({ text: t }))
const norm1 = (t) => normalizeWords(t)[0] || ''

/* the gap: an empty slot the size of the word (its punctuation stays) */
function Slot({ word }) {
  const m = String(word).match(/^(.*?)([.,!?…]*)$/)
  return (
    <span className="whitespace-nowrap">
      <span className="inline-block rounded-md border-b-[3px] border-dashed border-[#FFB020]/70 bg-white/[0.04] px-1 leading-[1.05] text-transparent">{m[1]}</span>
      {m[2]}
    </span>
  )
}

/* mode: 'plain' · 'live' (green / white only) · 'judged' (green / amber / red) · gapAt: index of the hidden word (−1: none) */
function Words({ words, mode, reduced, gapAt = -1, filled = false }) {
  return words.map((w, i) => {
    const isGap = i === gapAt
    const lit = mode === 'live' && !!LIVE[w.status]
    // the gap word shows when it was filled (picture), heard, or the line passed
    if (isGap && !filled && !(mode === 'live' && lit) && !(mode === 'judged' && w.status && w.status !== 'miss')) {
      return <span key={i}><Slot word={w.text} />{i < words.length - 1 ? ' ' : ''}</span>
    }
    const tone = mode === 'live' ? LIVE[w.status] || 'text-white' : mode === 'judged' ? JUDGED[w.status] || 'text-white'
      : isGap ? 'text-[#FFB020]' : 'text-white'
    return (
      <span key={i}>
        <Motion.span className={`inline-block transition-colors duration-200 ${tone}`}
          initial={isGap && filled && !reduced ? { scale: 0.6, opacity: 0 } : false}
          animate={lit && !reduced ? HOP : STILL} transition={{ duration: 0.3 }}>
          {w.text}
        </Motion.span>
        {i < words.length - 1 ? ' ' : ''}
      </span>
    )
  })
}

/* the step's picture in a quiet card (hidden when the item has no drawing) */
export function PicCard({ name, className = '' }) {
  if (!name) return null
  return (
    <div className={`relative flex flex-shrink-0 items-center justify-center rounded-2xl bg-[#1D1D27] ring-1 ring-white/[0.08] [&:not(:has(g>*))]:hidden ${className}`} aria-hidden>
      <span className="absolute inset-[14%] rounded-full bg-white/[0.06]" />
      <ItemIcon name={name} size={64} className="relative h-[74%] w-[74%] drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]" />
    </div>
  )
}

/* a picture to tap (listen / gap / choice): state idle · right · wrong · dim */
function PicTile({ item, label, state = 'idle', onClick, disabled, reduced, ariaLabel, tall = false }) {
  const ring = state === 'right' ? 'bg-emerald-400/[0.12] ring-2 ring-emerald-400'
    : state === 'wrong' ? 'bg-rose-500/[0.08] ring-2 ring-rose-400/70'
      : state === 'live' ? 'bg-white/[0.10] ring-2 ring-emerald-300/70'
        : state === 'focus' ? 'bg-white/[0.10] ring-2 ring-white/40'
          : state === 'dim' ? 'bg-white/[0.03] ring-1 ring-white/[0.06] opacity-45'
            : 'bg-[#1D1D27] ring-1 ring-white/[0.08] hover:bg-[#23232E]'
  return (
    <Motion.button type="button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      animate={state === 'wrong' && !reduced ? { x: [0, -7, 7, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.4 }}
      className={`relative flex flex-col items-center justify-center rounded-2xl px-1 transition-colors disabled:cursor-default lg:rounded-3xl
        ${tall ? 'min-h-[86px] py-2 lg:min-h-[132px]' : 'min-h-[72px] py-2 lg:min-h-[118px]'} ${ring}`}>
      <ItemIcon name={item} size={44} className={`${tall ? 'h-12 w-12 lg:h-[72px] lg:w-[72px]' : 'h-10 w-10 lg:h-16 lg:w-16'} drop-shadow-[0_3px_6px_rgba(0,0,0,0.3)]`} />
      {label && <span className="mt-1 text-center text-[11.5px] font-semibold leading-tight text-white/75 lg:mt-2 lg:text-[14px]">{label}</span>}
      {state === 'right' && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400" />}
      {state === 'wrong' && <span className="absolute right-1.5 top-1.5 text-[13px] font-black leading-none text-rose-300">✕</span>}
    </Motion.button>
  )
}

function Hint({ text, strong }) {
  if (!text) return null
  if (!strong) return <p className="mt-1.5 text-[13.5px] font-medium leading-snug text-white/50 lg:mt-3 lg:text-[18px]">{text}</p>
  return (
    <Motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="mt-2 inline-flex max-w-full items-start gap-2 rounded-xl bg-amber-300/[0.10] px-3 py-1.5 text-left text-[14.5px] font-semibold leading-snug text-amber-100 ring-1 ring-amber-200/20 lg:mt-4 lg:text-[19px]">
      <Lightbulb size={16} className="mt-0.5 flex-shrink-0 text-amber-300 lg:h-5 lg:w-5" />
      <span>{text}</span>
    </Motion.p>
  )
}

/* the small label on top: what kind of task, and who talks */
export function TaskLabel({ step, by }) {
  const type = stepType(step)
  const who = (type === 'listen' || type === 'ask') && SPEAKERS[by]?.name
  return (
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 lg:text-[12.5px]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#FFB020]" />
      {step.choice && type === 'say' ? 'Bittasini tanlang va ayting' : STEP_TYPES[type]}
      {who ? <span className="normal-case tracking-normal text-white/30">· {who}</span> : null}
    </p>
  )
}

const SENTENCE = 'text-balance text-[21px] font-extrabold leading-snug tracking-[-0.01em] sm:text-[24px] lg:text-[36px] lg:leading-[1.18] xl:text-[40px]'

/*
 * phase: ready · listening · fail · success · done
 * live:  { words, key } while listening (key = the option being said)
 * result / option: the last judged try
 * picked / misses / gapFilled: listen & gap state (PlayScreen)
 */
export function PlayLine({
  step, by, phase, live, result, option, focus, tries, picked, misses = [], gapFilled, talking,
  onPick, onTile, onAnswer, reduced,
}) {
  const type = stepType(step)
  const listening = phase === 'listening'
  const acting = phase === 'success' || phase === 'done'
  const strong = tries >= 2 && !acting

  /* ── listen: tap the picture of what was said, then say the line ── */
  if (type === 'listen') {
    const solved = !!picked || acting
    let words = plainWords(step.say)
    let mode = 'plain'
    if (listening && live) { words = live.words; mode = 'live' }
    else if (!listening && result) { words = result.words; mode = 'judged' }
    return (
      <div>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {step.options.map(o => {
            const right = norm1(o.word) === norm1(step.answer)
            const state = solved ? (right ? 'right' : 'dim') : misses.includes(o.item) ? 'wrong' : 'idle'
            return (
              <PicTile key={o.item} item={o.item} state={state} tall reduced={reduced} disabled={solved || listening}
                onClick={() => onTile(o)} ariaLabel={solved ? o.word : 'Rasm'} />
            )
          })}
        </div>
        {solved ? (
          <Motion.div initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center lg:mt-6">
            <p className={SENTENCE}><Words words={words} mode={mode} reduced={reduced} /></p>
            <Hint text={step.uz} strong={strong} />
            {step.hearUz && <p className="mt-1 text-[12.5px] font-medium text-white/35 lg:text-[15px]">“{step.hear}” — {step.hearUz}</p>}
          </Motion.div>
        ) : (
          <p className="mt-3 text-center text-[15px] font-semibold leading-snug text-white/70 lg:mt-6 lg:text-[21px]">
            {talking ? 'Diqqat bilan tinglang…' : misses.length ? 'Bu emas. Yana tinglang va boshqasini tanlang.' : 'Nima haqida gapirdi? To‘g‘ri rasmni tanlang.'}
          </p>
        )}
      </div>
    )
  }

  /* ── ask: the question, then the accepted answers as hints ── */
  if (type === 'ask') {
    const liveOpt = listening && live?.key ? step.choice.find(o => o.key === live.key) : null
    return (
      <div>
        <div className="flex items-start gap-3 lg:gap-4">
          {hasPortrait(by) && (
            <span className="mt-0.5 flex h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-[#1D1D27] ring-1 ring-white/10 lg:h-16 lg:w-16">
              <Portrait who={by} talking={talking} reduced={reduced} className="h-full w-full" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[19px] font-extrabold leading-snug text-white lg:text-[30px] lg:leading-tight">{step.ask}</p>
            <p className="mt-0.5 text-[13px] font-medium text-white/45 lg:mt-1.5 lg:text-[17px]">{step.uz}</p>
          </div>
        </div>
        <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/35 lg:mb-2.5 lg:mt-6 lg:text-[12px]">Javob bering — bittasini ayting</p>
        <div className="space-y-1.5 lg:space-y-2.5">
          {step.choice.map(o => {
            const mine = (liveOpt?.key || option?.key) === o.key
            let words = plainWords(o.say)
            let mode = 'plain'
            if (listening && liveOpt?.key === o.key && live) { words = live.words; mode = 'live' }
            else if (!listening && option?.key === o.key && result) { words = result.words; mode = 'judged' }
            const ring = acting && mine ? 'bg-emerald-400/[0.10] ring-2 ring-emerald-400'
              : mine && listening ? 'bg-white/[0.08] ring-1 ring-emerald-300/60'
                : mine && phase === 'fail' ? 'bg-rose-500/[0.06] ring-1 ring-rose-400/50'
                  : acting ? 'bg-white/[0.02] opacity-50 ring-1 ring-white/[0.05]' : 'bg-[#1D1D27] ring-1 ring-white/[0.07] hover:bg-[#23232E]'
            return (
              <button key={o.key} type="button" onClick={() => onAnswer(o)} disabled={listening || acting}
                className={`flex w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-colors disabled:cursor-default lg:gap-3.5 lg:px-4 lg:py-3 ${ring}`}
                aria-label={`${o.say} — tinglash`}>
                {o.item && <ItemIcon name={o.item} size={30} className="h-7 w-7 flex-shrink-0 lg:h-10 lg:w-10" />}
                <span className="min-w-0 flex-1 text-[16.5px] font-bold leading-snug lg:text-[22px]"><Words words={words} mode={mode} reduced={reduced} /></span>
                {!acting && <Volume2 size={16} className="flex-shrink-0 text-white/30 lg:h-5 lg:w-5" />}
              </button>
            )
          })}
        </div>
        {strong && <Hint text="Javoblardan birini bosib tinglang, keyin o‘zingiz ayting." strong />}
      </div>
    )
  }

  /* ── gap: three pictures, the sentence with a missing word ── */
  if (type === 'gap') {
    const gapAt = plainWords(step.say).findIndex(w => norm1(w.text) === norm1(step.gap))
    let words = plainWords(step.say)
    let mode = 'plain'
    if (listening && live) { words = live.words; mode = 'live' }
    else if (!listening && result) { words = result.words; mode = 'judged' }
    const filled = gapFilled || acting
    return (
      <div>
        <p className={`text-center ${SENTENCE}`}><Words words={words} mode={mode} reduced={reduced} gapAt={gapAt} filled={filled} /></p>
        <div className="mx-auto mt-3 grid max-w-[420px] grid-cols-3 gap-2 lg:mt-6 lg:max-w-none lg:gap-3">
          {step.options.map(o => {
            const right = norm1(o.word) === norm1(step.gap)
            const state = filled ? (right ? 'right' : 'dim') : misses.includes(o.item) ? 'wrong' : 'idle'
            return (
              <PicTile key={o.item} item={o.item} state={state} reduced={reduced} disabled={filled || listening}
                onClick={() => onTile(o)} ariaLabel="Rasm" />
            )
          })}
        </div>
        <div className="text-center">
          {tries > 0 || filled ? <Hint text={step.uz} strong={strong} /> : (
            <p className="mt-2 text-[13px] font-medium text-white/45 lg:mt-4 lg:text-[16px]">Mos rasmni tanlang yoki butun gapni darhol ayting</p>
          )}
        </div>
      </div>
    )
  }

  /* ── choice: picture cards, the sentence follows the card ── */
  if (step.choice) {
    const liveOpt = listening && live?.key ? step.choice.find(o => o.key === live.key) : null
    const current = liveOpt || option || step.choice.find(o => o.key === focus) || step.choice[0]
    let words = plainWords(current.say)
    let mode = 'plain'
    if (listening && live && liveOpt) { words = live.words; mode = 'live' }
    else if (!listening && option && result) { words = result.words; mode = 'judged' }
    return (
      <div className="text-center">
        <div className={`grid gap-2 lg:gap-3 ${step.choice.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {step.choice.map(o => {
            const picked = (option || liveOpt)?.key === o.key
            const state = picked ? (acting ? 'right' : listening ? 'live' : 'wrong') : current.key === o.key ? 'focus' : acting ? 'dim' : 'idle'
            return (
              <PicTile key={o.key} item={o.item} label={o.label} state={state} reduced={reduced} disabled={listening || acting}
                onClick={() => onPick(o)} ariaLabel={`${o.say} — tinglash`} />
            )
          })}
        </div>
        <p className={`mt-3 lg:mt-6 ${SENTENCE}`}><Words words={words} mode={mode} reduced={reduced} /></p>
        <Hint text={step.uz} strong={strong} />
      </div>
    )
  }

  /* ── say ── */
  let words = plainWords(step.say)
  let mode = 'plain'
  if (listening && live) { words = live.words; mode = 'live' }
  else if (!listening && result) { words = result.words; mode = 'judged' }
  return (
    <div className="flex items-center gap-3.5 lg:flex-col lg:gap-7">
      <PicCard name={step.pic} className="h-[64px] w-[64px] sm:h-[72px] sm:w-[72px] lg:h-[132px] lg:w-[132px] lg:rounded-[28px]" />
      <div className="min-w-0 flex-1 lg:flex-none lg:text-center">
        <p className={SENTENCE}><Words words={words} mode={mode} reduced={reduced} /></p>
        <Hint text={step.uz} strong={strong} />
      </div>
    </div>
  )
}
