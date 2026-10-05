/*
 * TOBY RUN — the prompt card of a So'z shari ride (RUNNER_PLAN §B3.3): the drawn picture (Toby's Day
 * ItemArt), the Uzbek instruction, the uz hint (A1), choices, live words, the mic level and the
 * countdown bar (written by the engine through a ref, no React render per frame). Also the shared
 * bits the Bekat panel and the revive card use: WordLine (karaoke colours) and MicRow.
 */
import { memo } from 'react'
import { motion as Motion } from 'framer-motion'
import { Check, Loader2, Mic, Volume2, X } from 'lucide-react'
import { ItemIcon } from '../tobys-day/items'
import { hasPicture } from './engine/deck.js'

const GLASS = 'border border-white/[0.08] bg-[#0B0B10]/80 backdrop-blur-xl'
export const ACCENT = '#A98BFF'

const TONE = {
  ok: 'text-emerald-300',
  close: 'text-amber-200 underline decoration-amber-300/80 decoration-2 underline-offset-[6px]',
  miss: 'text-rose-300 underline decoration-rose-400 decoration-wavy decoration-2 underline-offset-[6px]',
}

/* the words of a line, coloured after an attempt (matchSentence words) */
export function WordLine({ text, words, className = '' }) {
  const list = words?.length ? words : String(text || '').split(/\s+/).filter(Boolean).map(w => ({ text: w }))
  return (
    <p className={`text-balance font-black leading-[1.1] tracking-tight text-white ${className}`}>
      {list.map((w, i) => (
        <span key={i} className={`${w.status ? TONE[w.status] : ''} transition-colors`}>{w.text}{i < list.length - 1 ? ' ' : ''}</span>
      ))}
    </p>
  )
}

/* the picture, on a soft cream tile */
export function Picture({ name, size = 76, className = '' }) {
  if (!name || !hasPicture({ picture: name })) return null
  return (
    <span className={`flex flex-shrink-0 items-center justify-center rounded-[20px] bg-[#F6EBD9] shadow-[inset_0_-3px_0_rgba(0,0,0,0.08)] ${className}`}
      style={{ width: size, height: size }}>
      <ItemIcon name={name} size={size * 0.78} />
    </span>
  )
}

/* listening state + live words */
export function MicRow({ listening, busy, interim, level = 0, serverMode, idleText = '' }) {
  return (
    <div className="flex min-h-[34px] items-center gap-2.5">
      <span className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
        {listening && (
          <span className="absolute inset-0 rounded-full bg-[#A98BFF]/30 transition-transform duration-100"
            style={{ transform: `scale(${1 + Math.min(1, level * 1.6) * 0.55})` }} />
        )}
        <span className={`relative flex h-8 w-8 items-center justify-center rounded-full ${listening ? 'bg-[#A98BFF] text-[#0B0B10]' : 'bg-white/[0.07] text-white/45'}`}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} strokeWidth={2.4} />}
        </span>
      </span>
      <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-white/60 lg:text-base">
        {interim ? <span className="text-white">“{interim}”</span>
          : busy ? 'Tekshirilmoqda…'
            : listening ? (serverMode ? 'Ayting va biroz jim turing' : 'Tinglayapman…')
              : idleText}
      </p>
    </div>
  )
}

export function Bar({ barRef }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
      <div ref={barRef} data-low="0" className="h-full w-full origin-left rounded-full bg-[#A98BFF] transition-colors data-[low=1]:bg-rose-400" style={{ transform: 'scaleX(1)' }} />
    </div>
  )
}

function Verdict({ card }) {
  const m = card.mode
  if (m === 'ok' || m === 'close') {
    return (
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black ${m === 'ok' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-300/15 text-amber-200'}`}>
          <Check size={15} strokeWidth={3} /> {m === 'ok' ? (card.tries > 1 ? 'Endi to‘g‘ri!' : 'Zo‘r!') : 'Yaxshi!'}
        </span>
        {card.points != null && <span className="text-sm font-bold tabular-nums text-[#F5B14C]">+{card.points} ball · +{card.coins} tanga</span>}
      </div>
    )
  }
  if (m === 'miss') {
    return (
      <div className="mt-3 space-y-1.5">
        <p className="flex items-center gap-1.5 text-[15px] font-semibold text-rose-200">
          <X size={16} strokeWidth={3} /> {card.heard ? <>Toby eshitdi: <b className="font-black">«{card.heard}»</b></> : 'Hech narsa eshitilmadi'}
        </p>
        {card.tip && <p className="text-[13px] font-medium leading-snug text-white/60">{card.tip}</p>}
        {!card.final && (
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-white/55">
            <Volume2 size={14} className="animate-pulse text-[#A98BFF]" /> Tinglang — keyin yana bir bor ayting
          </p>
        )}
      </div>
    )
  }
  if (m === 'skip') return <p className="mt-3 text-[14px] font-semibold text-white/55">Eshitilmadi — so‘z keyinroq yana chiqadi</p>
  return null
}

function PromptCard({ card, barRef, interim, listening, busy, serverMode, level, onChoice }) {
  const pt = card.pt
  const mode = card.mode
  const open = mode === 'open' || mode === 'retry'
  // Listen mode: the word is heard and its picture chosen — the card must not show the answer
  const pic = card.picture && !card.options && (pt === 'picture' || pt === 'choice' || pt === 'hear' || card.reveal)
  const showWord = card.reveal || mode === 'retry'
  const border = mode === 'ok' ? 'border-emerald-400/40' : mode === 'close' ? 'border-amber-300/40' : mode === 'miss' ? 'border-rose-400/40' : ''
  return (
    <Motion.div
      initial={{ y: -14, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -8, opacity: 0, transition: { duration: 0.14 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={`pointer-events-auto relative mx-auto w-full max-w-[360px] overflow-hidden rounded-[26px] px-4 pb-3.5 pt-3.5 shadow-[0_22px_60px_-24px_rgba(0,0,0,0.85)] sm:max-w-[440px] lg:max-w-[520px] lg:rounded-[30px] lg:px-6 lg:pb-5 lg:pt-5 ${GLASS} ${border}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold uppercase tracking-[0.2em] lg:text-[13px]" style={{ color: ACCENT }}>
          {mode === 'hold' ? 'Tekshirilmoqda' : mode === 'retry' ? 'Yana bir bor ayting' : card.instruction}
        </span>
        {card.tries > 1 && mode !== 'ok' && <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] font-bold text-white/70">2-urinish</span>}
      </div>

      {card.options && !card.reveal ? (
        <p className="flex items-center gap-2 text-[17px] font-bold text-white/85 lg:text-xl">
          <Volume2 size={20} className="animate-pulse text-[#A98BFF]" /> So‘zni tinglang — rasmini tanlang
        </p>
      ) : (
      <div className="flex items-center gap-3.5 lg:gap-5">
        {pic && <Picture name={card.picture} size={72} className="lg:!h-[96px] lg:!w-[96px]" />}
        <div className="min-w-0 flex-1">
          {pt === 'uz' && !showWord && <p className="text-[30px] font-black leading-tight text-[#F6EBD9] lg:text-[40px]">{card.uz}</p>}
          {(pt === 'definition' || pt === 'opposite' || pt === 'synonym') && !showWord && (
            <>
              <p className="text-[12px] font-bold uppercase tracking-wider text-white/40">{pt === 'opposite' ? 'Teskarisi' : pt === 'synonym' ? 'Ma’nodoshi' : 'Ta’rif'}</p>
              <p className={`${pt === 'definition' ? 'text-[18px] lg:text-[22px]' : 'text-[30px] lg:text-[40px]'} font-black leading-tight text-[#F6EBD9]`}>{card.prompt}</p>
            </>
          )}
          {pt === 'fill' && !showWord && (
            <p className="text-[20px] font-black leading-snug text-[#F6EBD9] lg:text-[26px]">
              {String(card.prompt).split('___').map((part, i, arr) => (
                <span key={i}>{part}{i < arr.length - 1 && <span className="mx-1 inline-block min-w-[3.2em] border-b-[3px] border-[#A98BFF] align-baseline">&nbsp;</span>}</span>
              ))}
            </p>
          )}
          {pt === 'picture' && !showWord && (
            <p className="text-[26px] font-black leading-tight text-white/25 lg:text-[34px]">? ? ?</p>
          )}
          {showWord && pt !== 'choice' && <WordLine text={card.type === 'twister' || pt === 'fill' ? card.text : card.text} words={card.words} className="text-[30px] lg:text-[42px]" />}
          {/* the Uzbek caption of what the model voice says (§B9.6) — once the word is on the card anyway */}
          {showWord && pt !== 'choice' && card.uz && !card.hint && <p className="mt-0.5 text-[15px] font-semibold text-white/50">{card.uz}</p>}
          {pt === 'choice' && !card.options && (
            <div className="flex flex-wrap gap-1.5">
              {(card.choices || []).map(c => {
                const target = c === card.text
                const done = mode === 'ok' || mode === 'close' || mode === 'miss'
                return (
                  <span key={c} className={`rounded-full border px-3 py-1.5 text-[17px] font-black lg:text-[21px] ${done && target ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200' : 'border-white/[0.1] bg-white/[0.05] text-white'}`}>{c}</span>
                )
              })}
            </div>
          )}
          {card.hint && (!showWord || pt === 'choice') && <p className="mt-1 text-[14px] font-semibold text-white/50">{card.hint}</p>}
          {mode === 'intro' && pt === 'hear' && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-white/55"><Volume2 size={14} className="animate-pulse text-[#A98BFF]" /> Avval eshiting</p>
          )}
        </div>
      </div>
      )}

      {card.options && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {card.options.map((o, i) => {
            const done = mode === 'ok' || mode === 'miss'
            const target = o.text === card.text
            return (
              <button key={o.text + i} type="button" onClick={() => onChoice?.(i)} disabled={done}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition ${done && target ? 'border-emerald-400/60 bg-emerald-400/12' : done && card.picked === i ? 'border-rose-400/60 bg-rose-500/10' : 'border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.09]'}`}>
                {o.picture ? <Picture name={o.picture} size={44} className="rounded-xl" /> : null}
                <span className="text-[13px] font-black leading-tight text-white lg:text-[15px]">{done || !o.picture ? o.text : ['Chap', 'O‘rta', 'O‘ng'][i]}</span>
              </button>
            )
          })}
        </div>
      )}

      <Verdict card={card} />

      {(open || mode === 'hold') && (
        <div className="mt-3 space-y-2">
          <Bar barRef={barRef} />
          <MicRow listening={listening} busy={busy || mode === 'hold'} interim={interim} level={level} serverMode={serverMode} idleText="Ayting!" />
        </div>
      )}
    </Motion.div>
  )
}

export default memo(PromptCard)
