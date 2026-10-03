/*
 * Shared pieces of the voice games: the mic button, the line to say with its
 * words coloured after an attempt, the ✓ / ✗ verdict, and the notice for
 * browsers that cannot recognise speech.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, Mic, MicOff, RotateCcw, Star, Volume2, X } from 'lucide-react'

/* state: 'idle' | 'listening' | 'busy' | 'disabled'; level 0–1 from useSpeech makes the ring follow the voice */
export function MicButton({ state = 'idle', onPress, size = 92, label, level = 0 }) {
  const listening = state === 'listening'
  const disabled = state === 'disabled' || state === 'busy'
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {listening && (
          <span className="absolute inset-0 rounded-full bg-rose-400/50 transition-transform duration-100"
            style={{ transform: `scale(${1 + Math.min(1, level) * 0.7})` }} />
        )}
        {listening && [0, 1, 2].map(i => (
          <motion.span key={i} className="absolute inset-0 rounded-full bg-rose-500/40"
            initial={{ scale: 1, opacity: 0.6 }} animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: 'easeOut' }} />
        ))}
        <motion.button type="button" onClick={onPress} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.92 }}
          aria-label={listening ? 'Stop' : 'Speak'}
          className={`relative flex h-full w-full items-center justify-center rounded-full text-white shadow-2xl transition
            ${listening ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/40'
              : disabled ? 'cursor-not-allowed bg-slate-500/60'
                : 'bg-gradient-to-br from-sky-400 to-indigo-600 shadow-sky-500/40 hover:brightness-110'}`}>
          {state === 'busy' ? <Loader2 size={size * 0.38} className="animate-spin" />
            : listening ? <MicOff size={size * 0.38} /> : <Mic size={size * 0.38} />}
        </motion.button>
      </div>
      {label && <p className="text-sm font-bold text-white/80">{label}</p>}
    </div>
  )
}

const WORD_TONE = {
  ok: 'text-emerald-300',
  close: 'text-amber-300 underline decoration-amber-400 decoration-2 underline-offset-4',
  miss: 'text-rose-300 underline decoration-rose-500 decoration-wavy decoration-2 underline-offset-4',
}

/* The line to say. After an attempt, pass `result` (from matchSentence) to colour each word. */
export function SpokenLine({ text, result, onListen, hint }) {
  const words = result?.words || String(text || '').split(/\s+/).filter(Boolean).map(w => ({ text: w }))
  return (
    <div className="space-y-2 text-center">
      <p className="text-balance text-2xl font-black leading-snug text-white drop-shadow sm:text-3xl">
        {words.map((w, i) => (
          <span key={i} className={`${w.status ? WORD_TONE[w.status] : ''} transition-colors`}>{w.text}{i < words.length - 1 ? ' ' : ''}</span>
        ))}
      </p>
      {hint && <p className="text-[15px] font-semibold text-white/60">{hint}</p>}
      {onListen && (
        <button type="button" onClick={onListen}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold text-white/85 backdrop-blur hover:bg-white/20">
          <Volume2 size={15} /> Listen
        </button>
      )}
    </div>
  )
}

const VERDICT = {
  perfect: { icon: Check, text: 'Perfect!', tone: 'from-emerald-400 to-green-600', stars: 3 },
  good: { icon: Check, text: 'Good!', tone: 'from-emerald-400 to-teal-600', stars: 2 },
  almost: { icon: RotateCcw, text: 'Almost — try again', tone: 'from-amber-400 to-orange-500', stars: 0 },
  wrong: { icon: X, text: 'Try again', tone: 'from-rose-500 to-red-600', stars: 0 },
}

/* Big ✓ / ✗ that pops in over the scene. */
/* stars overrides the default for the verdict (e.g. 1 star for a pass after a retry) */
export function VerdictBurst({ verdict, show, stars }) {
  const v = VERDICT[verdict] && { ...VERDICT[verdict], stars: stars ?? VERDICT[verdict].stars }
  return (
    <AnimatePresence>
      {show && v && (
        <motion.div key={verdict} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
          className="pointer-events-none flex flex-col items-center gap-2">
          <span className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${v.tone} text-white shadow-2xl`}>
            <v.icon size={44} strokeWidth={3} />
          </span>
          <span className="rounded-full bg-black/40 px-4 py-1 text-lg font-black text-white backdrop-blur">{v.text}</span>
          {v.stars > 0 && (
            <span className="flex gap-1">
              {[0, 1, 2].map(i => (
                <motion.span key={i} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.15 + i * 0.12 }}>
                  <Star size={26} className={i < v.stars ? 'fill-yellow-300 text-yellow-300' : 'text-white/30'} />
                </motion.span>
              ))}
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* Shown when the browser cannot turn speech into text, or the mic is blocked. */
export function VoiceNotice({ error }) {
  const blocked = error === 'not-allowed' || error === 'service-not-allowed'
  const noMic = error === 'audio-capture'
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-white backdrop-blur">
      <MicOff size={34} className="mx-auto mb-3 text-rose-300" />
      <p className="text-lg font-black">
        {blocked ? 'Mikrofon bloklangan' : noMic ? 'Mikrofon topilmadi' : "Bu brauzer mikrofonni ishlata olmaydi"}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-white/70">
        {blocked ? "Manzil satridagi qulf belgisini bosib, mikrofonga ruxsat bering va sahifani yangilang."
          : noMic ? 'Qurilmangizga mikrofon ulanganini tekshiring.'
            : "Brauzerni yangilang yoki Google Chrome / Microsoft Edge'da oching (telefonda — Chrome)."}
      </p>
    </div>
  )
}
