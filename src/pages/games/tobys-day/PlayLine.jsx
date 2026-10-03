/*
 * TOBY'S DAY — the line to say on the play screen.
 *
 * While the mic listens the words light up green one by one, like karaoke
 * (never red while the learner is still talking). After a try that did not
 * pass: missed words red, nearly-right words amber. Next to the line: the
 * step's picture card (step.pic, drawn by ItemIcon) and the Uzbek hint, which
 * grows after two failed tries. Choice steps show item cards to pick from.
 */
import { motion as Motion } from 'framer-motion'
import { Lightbulb } from 'lucide-react'
import { ItemIcon } from './items'

const JUDGED = {
  ok: 'text-emerald-300',
  close: 'text-amber-300 underline decoration-amber-400 decoration-2 underline-offset-4',
  miss: 'text-rose-300 underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-4',
}
const LIVE = { ok: 'text-emerald-300', close: 'text-emerald-200' }

/* mode: 'plain' · 'live' (green / white only) · 'judged' (green / amber / red) */
function Words({ words, mode, reduced }) {
  return words.map((w, i) => {
    const lit = mode === 'live' && !!LIVE[w.status]
    const tone = mode === 'live' ? LIVE[w.status] || 'text-white' : mode === 'judged' ? JUDGED[w.status] || 'text-white' : 'text-white'
    return (
      <span key={i}>
        <Motion.span className={`inline-block transition-colors duration-200 ${tone} ${lit ? 'drop-shadow-[0_0_10px_rgba(52,211,153,0.55)]' : ''}`}
          initial={false} animate={lit && !reduced ? { scale: [1, 1.16, 1] } : { scale: 1 }} transition={{ duration: 0.32 }}>
          {w.text}
        </Motion.span>
        {i < words.length - 1 ? ' ' : ''}
      </span>
    )
  })
}

const plainWords = (text) => String(text || '').split(/\s+/).filter(Boolean).map(t => ({ text: t }))

/*
 * The step's picture in a soft illustrated frame. It hides itself when the item
 * has no drawing (ItemIcon then draws an empty group) — no JS needed for that.
 */
export function PicCard({ name, className = '' }) {
  if (!name) return null
  return (
    <div className={`relative flex-shrink-0 rotate-[-4deg] rounded-[22px] bg-gradient-to-br from-amber-200 via-rose-100 to-sky-200 p-[5px] shadow-xl shadow-black/30 [&:not(:has(g>*))]:hidden ${className}`}
      aria-hidden>
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[18px] bg-white">
        <span className="absolute -left-3 -top-3 h-10 w-10 rounded-full bg-amber-100" />
        <span className="absolute -bottom-4 -right-2 h-12 w-12 rounded-full bg-sky-100" />
        <ItemIcon name={name} size={64} className="relative h-[80%] w-[80%] drop-shadow-sm" />
      </div>
    </div>
  )
}

function Hint({ text, strong }) {
  if (!text) return null
  if (!strong) return <p className="mt-1 text-[14px] font-semibold leading-snug text-white/60 lg:mt-3 lg:text-xl">{text}</p>
  return (
    <Motion.p initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="mx-auto mt-2 inline-flex max-w-full items-center gap-2 rounded-2xl bg-amber-400/15 px-3 py-1.5 text-[16px] font-extrabold leading-snug text-amber-200 ring-1 ring-amber-300/40 lg:mt-4 lg:px-4 lg:py-2.5 lg:text-2xl">
      <Lightbulb size={18} className="flex-shrink-0 text-amber-300 lg:h-6 lg:w-6" />
      <span>{text}</span>
    </Motion.p>
  )
}

const SENTENCE = 'text-balance text-[22px] font-black leading-snug sm:text-[25px] lg:text-[40px] lg:leading-[1.15] xl:text-[46px]'

/*
 * phase: ready · listening · fail · success · done
 * live:  { words, key } while listening (key = the choice option being said)
 * result / option: the last judged try
 */
export function PlayLine({ step, phase, live, result, option, focus, tries, onPick, reduced }) {
  const listening = phase === 'listening'
  const acting = phase === 'success' || phase === 'done'
  const strong = tries >= 2 && !acting

  if (step.choice) {
    const liveOpt = listening && live?.key ? step.choice.find(o => o.key === live.key) : null
    const current = liveOpt || option || step.choice.find(o => o.key === focus) || step.choice[0]
    let words = plainWords(current.say)
    let mode = 'plain'
    if (listening && live && liveOpt) { words = live.words; mode = 'live' }
    else if (!listening && option && result) { words = result.words; mode = 'judged' }
    return (
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300 lg:text-sm">Bittasini tanlang va ayting</p>
        <div className="mt-2 grid grid-cols-4 gap-2 lg:mt-4 lg:gap-3">
          {step.choice.map(o => {
            const picked = (option || liveOpt)?.key === o.key
            const ring = picked
              ? (acting ? 'bg-emerald-400/20 ring-2 ring-emerald-300' : listening ? 'bg-emerald-400/10 ring-2 ring-emerald-200/70' : 'bg-rose-400/15 ring-2 ring-rose-300')
              : current.key === o.key ? 'bg-white/15 ring-2 ring-white/40' : 'bg-white/[0.07] hover:bg-white/[0.12]'
            return (
              <Motion.button key={o.key} type="button" whileTap={{ scale: 0.94 }} onClick={() => onPick(o)}
                disabled={listening || acting}
                className={`flex min-h-[74px] flex-col items-center justify-center rounded-2xl px-1 py-2 transition disabled:cursor-default lg:min-h-[132px] lg:rounded-3xl lg:py-3 ${ring}`}
                aria-label={`${o.say} — tinglash`}>
                <ItemIcon name={o.item} size={36} className="h-9 w-9 lg:h-16 lg:w-16" />
                <span className="mt-1 text-center text-[11px] font-bold leading-tight text-white/85 lg:mt-2 lg:text-[15px]">{o.label}</span>
              </Motion.button>
            )
          })}
        </div>
        <p className={`mt-2.5 lg:mt-6 ${SENTENCE}`}><Words words={words} mode={mode} reduced={reduced} /></p>
        <Hint text={step.uz} strong={strong} />
      </div>
    )
  }

  let words = plainWords(step.say)
  let mode = 'plain'
  if (listening && live) { words = live.words; mode = 'live' }
  else if (!listening && result) { words = result.words; mode = 'judged' }
  return (
    <div className="flex items-center gap-3 lg:flex-col lg:gap-6">
      <PicCard name={step.pic} className="h-[62px] w-[62px] sm:h-[70px] sm:w-[70px] lg:h-[120px] lg:w-[120px] lg:rounded-[30px]" />
      <div className="min-w-0 flex-1 text-center lg:flex-none">
        <p className={SENTENCE}><Words words={words} mode={mode} reduced={reduced} /></p>
        <Hint text={step.uz} strong={strong} />
      </div>
    </div>
  )
}
