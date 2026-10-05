/* Read screen: the text one sentence per line, a big record button with a ring and a timer. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, RotateCcw, Square, X } from 'lucide-react'
import { VoiceNotice } from '../../../games/voice/VoiceUI'
import { stopVoice } from '../../../games/voice/voiceTts'
import { errorText, fetchLesson, rememberClip, uploadAttempt } from './api'
import { EmptyArt, MicArt, PremiumArt } from './art'
import { aboutTime, fmtTimer } from './theme'
import { GhostButton, LevelBadge, PrimaryButton, ScoreBadge, TopBar } from './ui'
import { useRecorder } from './useRecorder'

const MAX_SEC = 180
const NOTICES = {
  short: 'Yozuv juda qisqa. Matnni boshidan oxirigacha ovoz chiqarib o‘qing.',
  interrupted: 'Ilova fonga o‘tgani uchun yozuv to‘xtatildi. Qaytadan boshlang.',
  ended: 'Mikrofon uzilib qoldi — o‘qilgan qismi yuborildi.',
}

function RecordButton({ state, elapsed, level, onPress, disabled }) {
  const reduce = useReducedMotion()
  const recording = state === 'recording'
  const R = 56
  const C = 2 * Math.PI * R
  const frac = Math.min(1, elapsed / MAX_SEC)
  return (
    <div className="relative h-[124px] w-[124px]">
      {recording && !reduce && (
        <span className="absolute inset-[14px] rounded-full bg-[#7C3AED]/30 transition-transform duration-100"
          style={{ transform: `scale(${1.04 + Math.min(1, level) * 0.32})` }} />
      )}
      {recording && !reduce && level === 0 && (
        <Motion.span className="absolute inset-[14px] rounded-full bg-[#7C3AED]/25"
          animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0.2, 0.7] }} transition={{ duration: 1.8, repeat: Infinity }} />
      )}
      <svg viewBox="0 0 124 124" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="62" cy="62" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        <circle cx="62" cy="62" r={R} fill="none" stroke="#A78BFA" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset 120ms linear' }} />
      </svg>
      <Motion.button type="button" onClick={onPress} disabled={disabled} whileTap={disabled ? undefined : { scale: 0.94 }}
        aria-label={recording ? 'To‘xtatish' : 'Yozishni boshlash'}
        className="absolute inset-[18px] flex items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-[0_16px_40px_-12px_rgba(124,58,237,0.9)] transition hover:bg-[#8B5CF6] disabled:cursor-not-allowed disabled:opacity-60">
        {recording ? <Square size={26} fill="currentColor" strokeWidth={0} /> : <MicArt size={36} />}
      </Motion.button>
    </div>
  )
}

export default function ReadScreen({ lessonId, onBack, onUploaded, onPremium }) {
  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['speaking-lesson', String(lessonId)],
    queryFn: () => fetchLesson(lessonId),
    retry: (n, e) => ![403, 404].includes(e?.response?.status) && n < 2,
  })
  const [phase, setPhase] = useState('ready')            // ready | uploading | failed
  const [progress, setProgress] = useState(0)
  const [take, setTake] = useState(null)                 // kept for "Qayta yuborish"
  const [uploadError, setUploadError] = useState('')
  const [notice, setNotice] = useState('')
  const alive = useRef(true)                             // left the screen while uploading → stay where the learner went
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  // the small title in the top bar appears once the big one has scrolled away
  const [heading, setHeading] = useState(null)
  const [headingGone, setHeadingGone] = useState(false)
  const headingRef = useCallback((el) => setHeading(el), [])
  useEffect(() => {
    if (!heading || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([e]) => setHeadingGone(!e.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    io.observe(heading)
    return () => io.disconnect()
  }, [heading])

  // one take is uploaded once: the 3-minute limit and the stop button can hand over the same take
  const handed = useRef(null)
  const sending = useRef(false)
  const submit = async (t, reason, { again = false } = {}) => {
    if (t && !again) {
      if (handed.current === t) return
      handed.current = t
    }
    if (sending.current) return
    if (!t || t.seconds < 2 || t.blob.size < 1500) { setNotice(reason === 'ended' ? 'interrupted' : 'short'); return }
    if (reason === 'ended') setNotice('ended')
    sending.current = true
    setTake(t)
    setPhase('uploading')
    setProgress(0)
    setUploadError('')
    try {
      const r = await uploadAttempt(lessonId, t, setProgress)
      rememberClip(r.id, t.blob)
      if (alive.current) onUploaded(r.id)
    } catch (e) {
      setPhase('failed')
      setUploadError(errorText(e, 'Yozuv yuborilmadi.'))
    } finally {
      sending.current = false
    }
  }
  const rec = useRecorder({ maxSec: MAX_SEC, onAutoStop: (t, reason) => submit(t, reason) })

  const press = async () => {
    if (rec.state === 'recording') { submit(await rec.stop()); return }
    if (rec.state !== 'idle' || phase === 'uploading') return
    stopVoice()
    setNotice('')
    setTake(null)
    setPhase('ready')
    rec.clearError()
    await rec.start()
  }
  const redo = () => { setTake(null); setPhase('ready'); setUploadError('') }

  const locked = error?.response?.status === 403
  const missing = error?.response?.status === 404
  const fatal = ['not-allowed', 'audio-capture', 'unsupported'].includes(rec.error)
  const recording = rec.state === 'recording'
  const shownNotice = rec.error === 'interrupted' ? 'interrupted' : notice

  return (
    <div className="pb-[calc(env(safe-area-inset-bottom)+250px)]">
      <TopBar onBack={() => { rec.cancel(); onBack(lesson?.level) }} title={<span className={`transition-opacity duration-200 ${lesson && headingGone ? 'opacity-100' : 'opacity-0'}`}>{lesson?.title}</span>}
        right={lesson && (
          <AnimatePresence mode="wait">
            {recording ? (
              <Motion.span key="rec" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-[12px] font-bold text-rose-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Yozilmoqda
              </Motion.span>
            ) : <LevelBadge key="lv" level={lesson.level} />}
          </AnimatePresence>
        )} />

      {isLoading && (
        <div className="mt-6 space-y-4" aria-hidden="true">
          <div className="h-8 w-2/3 animate-pulse rounded-xl bg-white/[0.06]" />
          {[0, 1, 2, 3].map(i => <div key={i} className="h-6 animate-pulse rounded-lg bg-white/[0.05]" style={{ width: `${92 - i * 9}%` }} />)}
        </div>
      )}

      {locked && (
        <div className="mx-auto mt-14 max-w-sm text-center">
          <div className="flex justify-center"><PremiumArt size={128} /></div>
          <h2 className="mt-4 text-2xl font-bold">Premium dars</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-white/60">Bu matn Premium obunachilar uchun. Obuna bo‘lib, barcha darslarni oching.</p>
          <PrimaryButton className="mt-6" onClick={onPremium}>Premium olish</PrimaryButton>
        </div>
      )}
      {(missing || (error && !locked)) && (
        <div className="mx-auto mt-12 flex max-w-sm flex-col items-center text-center">
          <EmptyArt size={120} />
          <p className="mt-3 text-lg font-bold">{missing ? 'Dars topilmadi' : 'Dars yuklanmadi'}</p>
          <p className="mt-2 text-[15px] text-white/60">{missing ? 'U o‘chirilgan yoki yashirilgan bo‘lishi mumkin.' : errorText(error)}</p>
          <GhostButton className="mt-5 max-w-[240px]" onClick={() => onBack()}>Darslar ro‘yxati</GhostButton>
        </div>
      )}

      {lesson && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/45">
            {lesson.topic && <span>{lesson.topic}</span>}
            <span>{lesson.words} so‘z</span>
            <span>{aboutTime(lesson.seconds)}</span>
            {lesson.best_accuracy != null && (
              <span className="flex items-center gap-1.5">Eng yaxshi natija <ScoreBadge score={lesson.best_accuracy} /></span>
            )}
          </div>
          <h1 ref={headingRef} className="mt-2 text-[26px] font-bold leading-tight tracking-tight sm:text-[32px]">{lesson.title}</h1>
          <div className={`mt-6 space-y-[0.9em] text-[20px] font-medium leading-[1.6] transition-colors sm:text-[23px] ${recording ? 'text-white' : 'text-white/85'}`}>
            {lesson.sentences.map((s, i) => <p key={i} className="text-pretty">{s}</p>)}
          </div>
        </>
      )}

      {lesson && (
        <div className="fixed inset-x-0 bottom-0 z-20">
          <div className="pointer-events-none h-10 bg-gradient-to-t from-[#0B0B10] to-transparent" />
          <div className="bg-[#0B0B10] px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] sm:px-0">
            <div className="mx-auto flex max-w-[760px] flex-col items-center sm:px-6">
              {fatal ? (
                <div className="w-full pb-2">
                  <VoiceNotice error={rec.error} />
                  {rec.error === 'audio-capture' && <GhostButton className="mx-auto mt-3 max-w-xs" onClick={press}><RotateCcw size={16} /> Qayta urinish</GhostButton>}
                </div>
              ) : phase === 'uploading' ? (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 py-6">
                  <p className="text-[15px] font-semibold text-white/85">{progress >= 1 ? 'Yuborildi — AI tekshirmoqda…' : `Yozuv yuborilmoqda… ${Math.round(progress * 100)}%`}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full rounded-full bg-[#A78BFA] transition-[width] duration-200" style={{ width: `${Math.max(4, progress * 100)}%` }} />
                  </div>
                  <p className="text-[13px] text-white/40">{take ? `${fmtTimer(take.seconds)} sek yozildi` : ''}</p>
                </div>
              ) : phase === 'failed' ? (
                <div className="flex w-full max-w-sm flex-col items-center gap-3 py-3">
                  <p className="flex items-center gap-2 text-center text-[15px] text-rose-300"><AlertCircle size={17} /> {uploadError}</p>
                  <PrimaryButton onClick={() => submit(take, undefined, { again: true })}>Qayta yuborish</PrimaryButton>
                  <GhostButton onClick={redo}>Qaytadan o‘qish</GhostButton>
                </div>
              ) : (
                <>
                  <AnimatePresence>
                    {shownNotice && !recording && (
                      <Motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mb-2 max-w-sm rounded-xl bg-amber-400/10 px-3 py-2 text-center text-[13px] font-medium text-amber-200">
                        {NOTICES[shownNotice]}
                      </Motion.p>
                    )}
                  </AnimatePresence>
                  <div className="relative flex w-full items-center justify-center">
                    {recording && (
                      <button type="button" onClick={() => rec.cancel()} aria-label="Bekor qilish"
                        className="absolute left-[calc(50%-120px)] flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#111118] text-white/60 hover:text-white">
                        <X size={18} />
                      </button>
                    )}
                    <RecordButton state={rec.state} elapsed={rec.elapsed} level={rec.level} onPress={press}
                      disabled={rec.state === 'starting'} />
                  </div>
                  <p className="mt-1 text-[17px] font-semibold tabular-nums text-white">{fmtTimer(rec.elapsed)} <span className="text-white/45">sek</span></p>
                  <p className="mt-1 text-center text-[13px] text-white/45">
                    {recording ? 'O‘qib bo‘lgach, to‘xtating' : rec.state === 'starting' ? 'Mikrofon ochilmoqda…' : 'Bosing va matnni ovoz chiqarib o‘qing · 3 daqiqagacha'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
