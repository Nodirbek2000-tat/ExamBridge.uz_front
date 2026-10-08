/*
 * Shown when the hidden daily speaking limit is reached (server 429, code "speaking_daily_limit").
 * The server's message is shown as it is: "Kunlik limitingiz tugadi. Limitingiz N soatdan keyin ochiladi."
 * Nothing here ever shows how many tests are left — the limit is only visible once it is hit.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Hourglass, Loader2, RotateCcw } from 'lucide-react'

function split(message) {
  const text = String(message || '').trim()
  const i = text.indexOf('. ')
  return i < 0 ? [text, ''] : [text.slice(0, i + 1), text.slice(i + 2)]
}

/**
 * kept    the recordings are still on this page (a refused submit) — say so and offer to send again
 * onRetry send again; onBack leave (backLabel names the button, backIcon shows an arrow)
 */
export function SpeakingLimitCard({ message, kept = false, onRetry, retrying = false, onBack, backLabel = 'Orqaga qaytish', backIcon = true }) {
  const [head, rest] = split(message)
  return (
    <motion.div role="alert" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md space-y-5 rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-xl shadow-amber-500/10 sm:p-8">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <Hourglass size={30} strokeWidth={2} />
      </span>
      <div className="space-y-2">
        <p className="text-xl font-black leading-snug text-gray-900 sm:text-2xl">{head}</p>
        {rest && <p className="text-[17px] font-semibold leading-relaxed text-amber-700">{rest}</p>}
      </div>
      {kept && (
        <p className="rounded-2xl bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-gray-600">
          Javoblaringiz shu sahifada saqlanib turibdi. Sahifani yopmang — limit ochilgach «Qayta yuborish» tugmasini bosing.
        </p>
      )}
      {(onRetry || onBack) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={retrying}
              className="btn-glass inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-[15px] font-bold text-white shadow-md shadow-amber-500/25 transition hover:bg-amber-600 disabled:opacity-60">
              {retrying ? <Loader2 size={17} className="animate-spin" /> : <RotateCcw size={17} />} Qayta yuborish
            </button>
          )}
          {onBack && (
            <button type="button" onClick={onBack}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-[15px] font-bold text-gray-700 transition hover:bg-slate-50">
              {backIcon && <ArrowLeft size={17} />} {backLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

/** Full-page version for a speaking page that cannot start. */
export function SpeakingLimitScreen({ message, onBack }) {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-y-auto bg-gradient-to-b from-amber-50/60 via-white to-white p-4 sm:p-6">
      <SpeakingLimitCard message={message} onBack={onBack} backLabel="Speaking bo'limiga qaytish" />
    </div>
  )
}

/** Over a list: the start button was refused. */
export function SpeakingLimitDialog({ message, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex w-full justify-center" onClick={(e) => e.stopPropagation()}>
        <SpeakingLimitCard message={message} onBack={onClose} backLabel="Tushunarli" backIcon={false} />
      </div>
    </motion.div>
  )
}
