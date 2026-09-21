import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, Mic, Square, Play, Pause, Loader2, Sparkles,
  Gauge, CheckCircle2, ArrowRight, Lock,
} from 'lucide-react'
import api from '../../../api/client'

/* ── Word tokenizing (mirrors backend normalization) ─────────────────── */
const cleanWord = (w) => (w || '').toLowerCase().replace(/[^a-z']/g, '')

/* ── Level badge colors ───────────────────────────────────────────────── */
const LEVEL_COLORS = {
  A1: 'bg-emerald-500/20 text-emerald-300',
  A2: 'bg-teal-500/20 text-teal-300',
  B1: 'bg-sky-500/20 text-sky-300',
  B2: 'bg-violet-500/20 text-violet-300',
  C1: 'bg-rose-500/20 text-rose-300',
}

/* ── Passage picker ───────────────────────────────────────────────────── */
function PickScreen({ onPick, onBack }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['shadowing-texts'],
    queryFn: () => api.get('/games/shadowing/texts/').then((r) => r.data),
  })

  return (
    <div className="mx-auto max-w-lg px-5 pb-16 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-black">Shadowing</h1>
          <p className="text-xs text-white/40">Matnni tanla va ovoz chiqarib o‘qi</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={26} className="animate-spin text-white/30" />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((t, i) => (
            <motion.button
              key={t.id}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => !t.is_premium && onPick(t.id)}
              className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors hover:bg-white/[0.07] disabled:opacity-60"
              disabled={t.is_premium}
            >
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-xs font-black ${LEVEL_COLORS[t.level] || 'bg-white/10 text-white/60'}`}>
                {t.level}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.title}</p>
                <p className="mt-0.5 text-xs text-white/40">{t.topic || 'General'} · {t.word_count} so‘z</p>
              </div>
              {t.is_premium ? (
                <Lock size={16} className="flex-shrink-0 text-white/30" />
              ) : (
                <ArrowRight size={16} className="flex-shrink-0 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/60" />
              )}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Reading / recording screen ───────────────────────────────────────── */
function PlayScreen({ textId, onDone, onBack }) {
  const { data: text, isLoading } = useQuery({
    queryKey: ['shadowing-text', textId],
    queryFn: () => api.get(`/games/shadowing/texts/${textId}/`).then((r) => r.data),
  })

  const words = useMemo(() => (text?.body || '').split(/\s+/).filter(Boolean), [text])

  const [phase, setPhase] = useState('idle') // idle | recording | submitting
  const [readIndex, setReadIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [micError, setMicError] = useState('')

  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const recognitionRef = useRef(null)
  const finalWordsRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => () => {
    clearInterval(timerRef.current)
    recognitionRef.current?.stop?.()
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [])

  const start = async () => {
    setMicError('')
    setReadIndex(0)
    setSeconds(0)
    finalWordsRef.current = 0
    chunksRef.current = []

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
      recorderRef.current = recorder
      recorder.start()

      // Live word-tracking via browser speech recognition (visual only — final
      // scoring happens server-side against the recorded audio via Whisper)
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SR) {
        const rec = new SR()
        rec.continuous = true
        rec.interimResults = true
        rec.lang = 'en-US'
        rec.onresult = (e) => {
          let finalCount = 0
          for (let i = 0; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              finalCount += e.results[i][0].transcript.trim().split(/\s+/).filter(Boolean).length
            }
          }
          finalWordsRef.current = finalCount
          setReadIndex(Math.min(words.length, finalCount))
        }
        rec.onerror = () => {}
        rec.onend = () => { try { if (recognitionRef.current === rec) rec.start() } catch { /* */ } }
        recognitionRef.current = rec
        rec.start()
      }

      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      setPhase('recording')
    } catch {
      setMicError('Mikrofonga ruxsat berilmadi. Brauzer sozlamalarini tekshiring.')
    }
  }

  const stop = () => {
    clearInterval(timerRef.current)
    const rec = recognitionRef.current
    recognitionRef.current = null
    try { rec?.stop?.() } catch { /* */ }

    const recorder = recorderRef.current
    if (!recorder) return
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setPhase('submitting')
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
      try {
        const form = new FormData()
        form.append('audio', blob, 'shadowing.webm')
        form.append('duration_sec', String(seconds))
        const res = await api.post(`/games/shadowing/${textId}/submit/`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        onDone(res.data, text)
      } catch {
        setPhase('idle')
        setMicError('Yuborishda xato yuz berdi. Qayta urinib ko‘ring.')
      }
    }
    try { recorder.stop() } catch { setPhase('idle') }
  }

  if (isLoading || !text) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-white/30" />
      </div>
    )
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-5 pb-8 pt-6">
      <div className="mb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 transition-colors hover:bg-white/10"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{text.title}</p>
          <p className="text-xs text-white/40">{text.topic} · {text.level}</p>
        </div>
      </div>

      <div className="flex-1 pt-8">
        <p className="text-center text-[19px] sm:text-[21px] font-bold leading-[1.9]">
          {words.map((w, i) => (
            <span
              key={i}
              className={
                i < readIndex
                  ? 'text-white'
                  : i === readIndex
                    ? 'text-white underline decoration-violet-500 decoration-[3px] underline-offset-[6px]'
                    : 'text-white/25'
              }
            >
              {w}{' '}
            </span>
          ))}
        </p>
      </div>

      {micError && (
        <p className="mb-3 text-center text-xs font-semibold text-rose-400">{micError}</p>
      )}

      <div className="flex flex-col items-center gap-3 pt-6">
        {phase === 'recording' && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tabular-nums text-white/70">
            {fmt(seconds)} sek
          </span>
        )}

        {phase === 'submitting' ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/20">
            <Loader2 size={26} className="animate-spin text-white/60" />
          </div>
        ) : (
          <motion.button
            type="button"
            onClick={phase === 'recording' ? stop : start}
            whileTap={{ scale: 0.94 }}
            className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white shadow-[0_0_0_6px_rgba(255,255,255,0.06)]"
          >
            {phase === 'recording' ? (
              <div className="h-6 w-6 rounded-md bg-white" />
            ) : (
              <Mic size={26} className="text-white" />
            )}
          </motion.button>
        )}

        <p className="text-xs font-semibold text-white/40">
          {phase === 'recording' ? 'Tugatish uchun bosing' : phase === 'submitting' ? 'Baholanmoqda…' : 'Boshlash uchun bosing'}
        </p>

        <button
          type="button"
          disabled={phase !== 'recording'}
          onClick={stop}
          className="mt-3 w-full rounded-2xl bg-white/10 py-3.5 text-sm font-bold text-white/50 transition-colors disabled:cursor-not-allowed enabled:bg-gradient-to-r enabled:from-violet-600 enabled:to-fuchsia-600 enabled:text-white"
        >
          Davom etish
        </button>
      </div>
    </div>
  )
}

/* ── Results screen ───────────────────────────────────────────────────── */
const WORD_COLOR = {
  correct: 'bg-emerald-500/20 text-emerald-300',
  flagged: 'bg-amber-500/20 text-amber-300',
  skipped: 'bg-rose-500/20 text-rose-300',
}

function ResultAudio({ src }) {
  const ref = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  if (!src) return null
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  const bars = 34

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
      <audio
        ref={ref}
        src={src}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setProgress(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
      />
      <button
        type="button"
        onClick={() => {
          const a = ref.current
          if (!a) return
          if (playing) { a.pause(); setPlaying(false) } else { a.play(); setPlaying(true) }
        }}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white text-black"
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>
      <div className="flex h-6 flex-1 items-center gap-[2px]">
        {Array.from({ length: bars }).map((_, i) => {
          const active = duration ? i / bars < progress / duration : false
          const h = 6 + ((i * 37) % 16)
          return <span key={i} className={`w-[2px] rounded-full ${active ? 'bg-white' : 'bg-white/20'}`} style={{ height: h }} />
        })}
      </div>
      <span className="flex-shrink-0 text-[11px] font-mono tabular-nums text-white/40">{fmt(duration)}</span>
    </div>
  )
}

function ResultScreen({ result, text, onContinue }) {
  const ring = useMemo(() => {
    const r = 52
    const c = 2 * Math.PI * r
    return { r, c, dash: (result.overall_score / 100) * c }
  }, [result.overall_score])

  return (
    <div className="mx-auto max-w-lg px-5 pb-10 pt-6">
      <div className="mb-5 flex items-center gap-3">
        <div>
          <h1 className="text-xl font-black">Natija</h1>
          <p className="text-xs text-white/40">{text?.title}</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-3xl bg-white/[0.04] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/40">Umumiy ball</p>
            <p className="mt-1 text-4xl font-black">
              {result.overall_score}
              <span className="text-lg font-bold text-white/30">/100</span>
            </p>
          </div>
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="48" cy="48" r={ring.r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
              <circle
                cx="48" cy="48" r={ring.r} fill="none" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${ring.dash} ${ring.c}`}
              />
            </svg>
            <span className="absolute text-sm font-black">{result.overall_score}%</span>
          </div>
        </div>
        <p className="mt-4 rounded-xl bg-white/[0.04] p-3 text-xs leading-relaxed text-white/60">
          {result.overall_score >= 80
            ? 'Zo‘r natija! Talaffuzingiz va tezligingiz juda yaxshi.'
            : result.overall_score >= 55
              ? 'Yaxshi ish qilyapsiz! Noto‘g‘ri chiqqan so‘zlarni takrorlang va tezlikni oshiring.'
              : 'Yana mashq qiling — sekinroq va aniqroq o‘qib ko‘ring.'}
        </p>
      </motion.div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white/[0.04] p-4">
          <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
            <Gauge size={14} className="text-sky-300" />
          </div>
          <p className="text-xs font-semibold text-white/40">Ravonlik</p>
          <p className="mt-1 text-2xl font-black">{result.fluency_wpm}<span className="text-xs font-bold text-white/30"> so‘z/daq</span></p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-white/[0.04] p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
              <CheckCircle2 size={14} className="text-emerald-300" />
            </div>
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${LEVEL_COLORS[result.cefr_estimate] || 'bg-white/10 text-white/60'}`}>
              {result.cefr_estimate}
            </span>
          </div>
          <p className="text-xs font-semibold text-white/40">Aniqlik</p>
          <p className="mt-1 text-2xl font-black">{result.accuracy_pct}<span className="text-xs font-bold text-white/30">%</span></p>
        </motion.div>
      </div>

      <div className="mb-4">
        <ResultAudio src={result.audio_url} />
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-emerald-500/10 p-3 text-center">
          <p className="text-2xl font-black text-emerald-300">{result.correct_count}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-emerald-300/70">To‘g‘ri</p>
        </div>
        <div className="rounded-2xl bg-amber-500/10 p-3 text-center">
          <p className="text-2xl font-black text-amber-300">{result.flagged_count}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-amber-300/70">Aniqlash</p>
        </div>
        <div className="rounded-2xl bg-rose-500/10 p-3 text-center">
          <p className="text-2xl font-black text-rose-300">{result.skipped_count}</p>
          <p className="mt-0.5 text-[11px] font-semibold text-rose-300/70">O‘tkazib</p>
        </div>
      </div>

      <div className="mb-24">
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-white/40">So‘zlar bo‘yicha</p>
        <div className="flex flex-wrap gap-2">
          {result.word_results.map((w, i) => (
            <span key={i} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${WORD_COLOR[w.status]}`}>
              {w.word} <span className="opacity-70">{w.score}</span>
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="fixed bottom-5 left-1/2 w-[calc(100%-2.5rem)] max-w-lg -translate-x-1/2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 py-4 text-sm font-black shadow-2xl shadow-violet-900/40"
      >
        Davom etish
      </button>
    </div>
  )
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function ShadowingGame() {
  const navigate = useNavigate()
  const [step, setStep] = useState('pick') // pick | play | result
  const [textId, setTextId] = useState(null)
  const [result, setResult] = useState(null)
  const [text, setText] = useState(null)

  return (
    <AnimatePresence mode="wait">
      {step === 'pick' && (
        <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PickScreen onBack={() => navigate('/games')} onPick={(id) => { setTextId(id); setStep('play') }} />
        </motion.div>
      )}
      {step === 'play' && (
        <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PlayScreen
            textId={textId}
            onBack={() => setStep('pick')}
            onDone={(res, t) => { setResult(res); setText(t); setStep('result') }}
          />
        </motion.div>
      )}
      {step === 'result' && result && (
        <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ResultScreen result={result} text={text} onContinue={() => { setResult(null); setStep('pick') }} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
