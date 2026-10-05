/*
 * Bottom sheet for one word: what the learner said (cut from their own recording by
 * Whisper's word times), the teacher saying it right, and "try it" — record just that
 * word, check it, and update the chip.
 */
import { useEffect, useState } from 'react'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Loader2, Mic, Play, Square, X } from 'lucide-react'
import { useSpeech } from '../../../games/voice/useSpeech'
import { bestMatch } from '../../../games/voice/speechMatch'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { MiniWave } from './art'
import { STATUS_TONE } from './theme'

const FATAL = ['not-allowed', 'audio-capture', 'unsupported']
const REASON = {
  skip: 'Bu so‘z yozuvda aytilmagan',
  fix: 'Talaffuz noaniq',
  ok: 'To‘g‘ri talaffuz qilingan',
}

function PlayCard({ label, hint, disabled, active, onPlay, color, note }) {
  return (
    <button type="button" onClick={onPlay} disabled={disabled}
      className={`flex min-h-[112px] flex-col justify-between rounded-2xl border p-4 text-left transition
        ${disabled ? 'cursor-not-allowed border-white/[0.06] bg-white/[0.02]' : 'border-white/[0.08] bg-[#1D1D27] hover:bg-[#232330] active:scale-[0.99]'}`}>
      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/45">{label}</span>
      {disabled ? (
        <span className="text-[14px] font-semibold text-white/35">{note}</span>
      ) : (
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#0B0B10]" style={{ background: color }}>
            {active ? <Square size={14} fill="currentColor" strokeWidth={0} /> : <Play size={17} fill="currentColor" strokeWidth={0} className="ml-0.5" />}
          </span>
          <MiniWave color={color} active={active} />
        </span>
      )}
      {hint && !disabled && <span className="sr-only">{hint}</span>}
    </button>
  )
}

function Body({ words, original, index, player, speech, onTried }) {
  const w = words[index]
  const reduce = useReducedMotion()
  const [teacher, setTeacher] = useState(false)
  const [trial, setTrial] = useState(null)                // { passed, score, heard } | { error }
  const o = original?.[index] || w                         // what the recording said (before any "try it")
  const t = STATUS_TONE[o.status] || STATUS_TONE.skip
  const now = STATUS_TONE[w.status] || STATUS_TONE.skip
  const before = words.slice(Math.max(0, index - 2), index).map(x => x.word).join(' ')
  const after = words.slice(index + 1, index + 3).map(x => x.word).join(' ')
  const hasClip = player.available && o.status !== 'skip' && o.start != null && o.end != null
  const mine = player.playing === 'range'

  useEffect(() => () => stopVoice(), [])

  const playMine = () => {
    if (mine) { player.pause(); return }
    setTeacher(false)
    player.playRange(o.start, o.end)
  }
  const playTeacher = async () => {
    if (teacher) { stopVoice(); setTeacher(false); return }
    player.pause()
    setTeacher(true)
    await sayLine(w.say, { voice: 'teacher' })
    setTeacher(false)
  }
  const tryIt = async () => {
    if (speech.listening) { speech.stop(); return }
    if (speech.busy) return
    speech.prime()
    stopVoice()
    player.pause()
    setTeacher(false)
    setTrial(null)
    const { alternatives, error } = await speech.listen({ maxMs: 5000 })
    if (!alternatives.length) { setTrial({ error: error || 'no-speech' }); return }
    const r = bestMatch(w.say, alternatives)
    const score = Math.round(r.score * 100)
    setTrial({ passed: r.passed && score >= 90, score, heard: r.heard })
    onTried(index, { score, status: score >= 90 ? 'ok' : score >= 50 ? 'fix' : 'skip' })
  }

  const listening = speech.listening
  return (
    <div>
      <p className="truncate text-center text-[15px] text-white/40">
        {before && <span>… {before} </span>}<span className="font-semibold text-white">{w.word}</span>{after && <span> {after} …</span>}
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <h3 className="break-all text-[40px] font-bold leading-none tracking-tight text-white">{w.say}</h3>
        <span className={`rounded-lg border px-2 py-1 text-[15px] font-bold tabular-nums ${t.soft} ${t.ring} ${t.text}`}>{o.score}</span>
        {w.tried && w.score > o.score && (
          <span className={`flex items-center gap-1 text-[15px] font-bold tabular-nums ${now.text}`}>→ {w.score}</span>
        )}
      </div>
      <p className={`mt-3 text-center text-[15px] font-medium ${t.text}`}>
        {REASON[o.status]}
        {o.status === 'fix' && o.heard && <span className="text-white/45"> — «{o.heard}» eshitildi</span>}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <PlayCard label="Siz aytdingiz" color={t.hex} disabled={!hasClip} active={mine} onPlay={playMine}
          note={o.status === 'skip' ? 'Yozuvda yo‘q' : 'Yozuv mavjud emas'} />
        <PlayCard label="To‘g‘ri talaffuz" color="#C4B5FD" active={teacher} onPlay={playTeacher} />
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#111118] p-4">
        {FATAL.includes(speech.error) ? <VoiceNotice error={speech.error} /> : (
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 flex-shrink-0">
              {listening && !reduce && (
                <span className="absolute inset-0 rounded-full bg-[#7C3AED]/35 transition-transform duration-100"
                  style={{ transform: `scale(${1.05 + Math.min(1, speech.level) * 0.45})` }} />
              )}
              <Motion.button type="button" onClick={tryIt} whileTap={{ scale: 0.92 }} disabled={speech.busy}
                aria-label={listening ? 'To‘xtatish' : 'Sinab ko‘rish'}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-[0_10px_28px_-10px_rgba(124,58,237,0.9)] disabled:opacity-70">
                {speech.busy ? <Loader2 size={24} className="animate-spin" /> : listening ? <Square size={20} fill="currentColor" strokeWidth={0} /> : <Mic size={26} />}
              </Motion.button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-bold text-white">Sinab ko‘rish</p>
              <AnimatePresence mode="wait">
                <Motion.p key={listening ? 'l' : speech.busy ? 'b' : trial ? (trial.error || String(trial.passed)) : 'i'}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-0.5 text-[14px] leading-snug">
                  {listening ? <span className="text-[#C4B5FD]">Eshityapman… «{w.say}» deng</span>
                    : speech.busy ? <span className="text-white/55">Tekshirilmoqda…</span>
                      : trial?.error ? <span className="text-amber-200">{trial.error === 'no-speech' ? 'Eshitilmadi — yaqinroq gapiring' : 'Qayta urinib ko‘ring'}</span>
                        : trial?.passed ? <span className="flex items-center gap-1.5 font-semibold text-emerald-300"><Check size={16} strokeWidth={3} /> Zo‘r! To‘g‘ri aytdingiz</span>
                          : trial ? <span className="flex flex-wrap items-center gap-1.5 text-rose-300"><X size={16} strokeWidth={3} /> Yana urinib ko‘ring{trial.heard ? <span className="text-white/45">— «{trial.heard}»</span> : null}</span>
                            : <span className="text-white/50">Bosing va so‘zni ayting</span>}
                </Motion.p>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WordSheet({ words, original, index, player, onClose, onSwitch, onTried, problemIdx }) {
  const speech = useSpeech()
  const open = index != null && !!words[index]
  const pos = problemIdx.indexOf(index)
  const prev = pos > 0 ? problemIdx[pos - 1] : null
  const next = pos >= 0 && pos < problemIdx.length - 1 ? problemIdx[pos + 1] : null

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const was = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = was }
  }, [open, onClose])

  const close = () => { speech.stop({ discard: true }); stopVoice(); player.pause(); onClose() }

  return (
    <AnimatePresence>
      {open && (
        <Motion.div key="sheet" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-[2px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <Motion.div role="dialog" aria-modal="true" aria-label={`«${words[index].say}» so‘zi`}
            onClick={e => e.stopPropagation()}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) close() }}
            className="w-full max-w-[560px] rounded-t-[28px] border border-white/[0.08] bg-[#17171F] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3 shadow-2xl sm:rounded-[28px] sm:px-6 sm:pb-6">
            <div className="mx-auto h-1.5 w-10 rounded-full bg-white/15 sm:hidden" />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {problemIdx.length > 1 && pos >= 0 && (
                  <>
                    <button type="button" onClick={() => prev != null && onSwitch(prev)} disabled={prev == null} aria-label="Oldingi so‘z"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-25"><ChevronLeft size={19} /></button>
                    <span className="min-w-[3rem] text-center text-[13px] font-semibold tabular-nums text-white/45">{pos + 1} / {problemIdx.length}</span>
                    <button type="button" onClick={() => next != null && onSwitch(next)} disabled={next == null} aria-label="Keyingi so‘z"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-25"><ChevronRight size={19} /></button>
                  </>
                )}
              </div>
              <button type="button" onClick={close} aria-label="Yopish"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70 hover:text-white"><X size={18} /></button>
            </div>
            <div className="mt-2">
              <Body key={index} words={words} original={original} index={index} player={player} speech={speech} onTried={onTried} />
            </div>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>
  )
}
