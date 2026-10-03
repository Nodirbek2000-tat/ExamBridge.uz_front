/*
 * CEFR multilevel Speaking exam — runs like the real computer-based test:
 * the examiner voice reads each question, a preparation countdown runs,
 * recording starts and stops by itself, and the next question follows.
 * The page only plays the lines the server sends (one fixed voice), so each
 * line is synthesized once and served from the cache for everyone.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft, Check, Clock, Loader2, Mic, MicOff, Play, RotateCcw, ThumbsDown, ThumbsUp, Volume2 } from 'lucide-react'
import api from '../../api/client'
import { preloadTts } from '../../utils/ttsPreload'

const HOME = '/app/cefr/skills?tab=speaking'
const SR = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

function pickMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m)) || ''
}

/* circular countdown */
function Ring({ total, left, tone, label }) {
  const size = 132, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r
  const done = total ? 1 - left / total : 0
  const color = tone === 'speak' ? '#dc2626' : '#d97706'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone === 'speak' ? '#fee2e2' : '#fef3c7'} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * done} style={{ transition: 'stroke-dashoffset 0.25s linear' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-black tabular-nums text-gray-900">{fmt(left)}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
      </div>
    </div>
  )
}

function MicMeter({ level, active = true }) {
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden>
      {[0.2, 0.45, 0.7, 1, 0.7, 0.45, 0.2].map((w, i) => (
        <span key={i} className={`w-2 rounded-full transition-[height] duration-100 ${active ? 'bg-red-500' : 'bg-sky-500'}`}
          style={{ height: `${8 + Math.min(1, level * 3) * w * 32}px` }} />
      ))}
    </div>
  )
}

/* what the student looks at for the current part */
function PartStage({ part, step, si }) {
  if (!part) return null
  return (
    <div className="space-y-5">
      {part.key === '1.2' && (
        <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3">
          {(part.images || []).map((src, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {src ? <img src={src} alt={`Picture ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                : <div className="flex aspect-[4/3] items-center justify-center text-sm text-gray-400">Picture {i + 1}</div>}
            </div>
          ))}
        </div>
      )}
      {part.key === '2' && part.image && (
        <img src={part.image} alt="Part 2" className="mx-auto max-h-64 rounded-2xl border border-slate-200 object-contain" />
      )}
      {part.key === '3' ? (
        <div className="space-y-4">
          <p className="text-center text-2xl font-bold leading-snug text-gray-900">“{part.topic}”</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-700"><ThumbsUp size={16} /> For</p>
              <ul className="space-y-1.5 text-[16px] text-gray-800">{(part.for || []).map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wider text-red-700"><ThumbsDown size={16} /> Against</p>
              <ul className="space-y-1.5 text-[16px] text-gray-800">{(part.against || []).map((x, i) => <li key={i}>• {x}</li>)}</ul>
            </div>
          </div>
        </div>
      ) : part.key === '2' ? (
        <div className="space-y-3 text-center">
          <p className="text-2xl font-bold leading-snug text-gray-900">{part.prompt}</p>
          {part.bullets?.length > 0 && (
            <ul className="mx-auto inline-block space-y-1 text-left text-[17px] text-gray-700">{part.bullets.map((b, i) => <li key={i}>• {b}</li>)}</ul>
          )}
        </div>
      ) : step ? (
        <div className="text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-sky-600">Question {si + 1} of {part.steps.length}</p>
          <p className="text-2xl font-bold leading-snug text-gray-900 sm:text-[28px]">{step.question}</p>
        </div>
      ) : null}
    </div>
  )
}

export default function CEFRSpeakingExam() {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const result = `/exam/cefr/speaking/test/${responseId}/result`

  const { data, isLoading, error } = useQuery({
    queryKey: ['cefr-speaking-attempt', responseId],
    queryFn: () => api.get(`/cefr/speaking/responses/${responseId}/`).then(r => r.data),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })
  useEffect(() => {
    if (data && data.status !== 'IN_PROGRESS') navigate(result, { replace: true })
  }, [data, navigate, result])

  const script = data?.script
  const parts = useMemo(() => script?.parts || [], [script])

  const [stage, setStage] = useState('gate')            // gate → run → upload | failed
  const [view, setView] = useState({ pi: 0, si: -1, phase: 'intro' })
  const [left, setLeft] = useState(0)
  const [level, setLevel] = useState(0)
  const [mic, setMic] = useState('idle')                // idle | asking | ok | denied | missing
  const [live, setLive] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [leaving, setLeaving] = useState(false)

  const streamRef = useRef(null)
  const ctxRef = useRef(null)
  const ttsCache = useRef(new Map())
  const skipRef = useRef(null)
  const aliveRef = useRef(true)
  const answersRef = useRef([])
  const audioRef = useRef(null)

  // ── microphone ────────────────────────────────────────────────────────────
  const askMic = async () => {
    setMic('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (Ctx) {
        const ctx = new Ctx()
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        ctx.createMediaStreamSource(stream).connect(analyser)
        ctxRef.current = ctx
        const buf = new Uint8Array(analyser.fftSize)
        const id = setInterval(() => {
          analyser.getByteTimeDomainData(buf)
          let sum = 0
          for (const v of buf) sum += ((v - 128) / 128) ** 2
          setLevel(Math.sqrt(sum / buf.length))
        }, 100)
        ctxRef.current.meter = id
      }
      setMic('ok')
    } catch (e) {
      setMic(e?.name === 'NotFoundError' ? 'missing' : 'denied')
    }
  }
  useEffect(() => {
    navigator.permissions?.query({ name: 'microphone' })
      .then(p => { if (p.state === 'granted') askMic() })
      .catch(() => {})
  }, [])

  // ── examiner voice: every line fetched once, in speaking order ────────────
  useEffect(() => {
    if (!script) return
    const lines = parts.flatMap(p => [p.intro, ...p.steps.map(s => s.say)]).concat(script.outro)
    return preloadTts(lines, { voice: script.voice, speed: script.speed, cache: ttsCache.current })
  }, [script, parts])

  // stop everything when leaving the page
  useEffect(() => () => {
    aliveRef.current = false
    skipRef.current?.()
    audioRef.current?.pause()
    window.speechSynthesis?.cancel()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (ctxRef.current) { clearInterval(ctxRef.current.meter); ctxRef.current.close().catch(() => {}) }
  }, [])

  useEffect(() => {
    if (stage !== 'run') return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [stage])

  const say = async (text) => {
    if (!aliveRef.current || !text) return
    const key = `${script.voice}:${text}`
    try {
      let url = ttsCache.current.get(key)
      if (!url) {
        const r = await api.post('/ielts/speaking/tts/', { text, voice: script.voice, speed: script.speed }, { responseType: 'blob' })
        url = URL.createObjectURL(r.data)
        ttsCache.current.set(key, url)
      }
      if (!aliveRef.current) return
      await new Promise((resolve) => {
        const el = new Audio(url)
        audioRef.current = el
        const done = () => { audioRef.current = null; resolve() }
        el.onended = done
        el.onerror = done
        el.play().catch(done)
      })
    } catch {
      // network trouble → the browser's own voice, so the test never gets stuck
      await new Promise((resolve) => {
        if (!window.speechSynthesis) return resolve()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-GB'
        u.rate = 0.95
        u.onend = resolve
        u.onerror = resolve
        window.speechSynthesis.speak(u)
        setTimeout(resolve, 2000 + text.length * 90)
      })
    }
  }

  const countdown = (sec) => new Promise((resolve) => {
    const end = Date.now() + sec * 1000
    setLeft(sec)
    const finish = () => { clearInterval(id); skipRef.current = null; resolve() }
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(l)
      if (l <= 0 || !aliveRef.current) finish()
    }, 200)
    skipRef.current = finish
  })

  const record = async (sec) => {
    const chunks = []
    let recorder = null
    try {
      const mime = pickMime()
      recorder = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : undefined)
      recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data) }
      recorder.start(1000)
    } catch { recorder = null }

    let text = ''
    let finalText = ''
    let stopped = false
    let rec = null
    if (SR) {
      try {
        rec = new SR()
        rec.lang = 'en-US'
        rec.continuous = true
        rec.interimResults = true
        rec.onresult = (e) => {
          let interim = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
            else interim += e.results[i][0].transcript
          }
          text = (finalText + interim).trim()
          setLive(text)
        }
        rec.onerror = () => {}
        rec.onend = () => { if (!stopped) { try { rec.start() } catch { /* already running */ } } }   // Chrome stops on silence
        rec.start()
      } catch { rec = null }
    }

    const started = Date.now()
    await countdown(sec)
    stopped = true
    try { rec?.stop() } catch { /* not running */ }
    await new Promise(r => setTimeout(r, 700))           // let the last words arrive
    const blob = await new Promise((resolve) => {
      const make = () => (chunks.length ? new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' }) : null)
      if (!recorder || recorder.state === 'inactive') return resolve(make())
      recorder.onstop = () => resolve(make())
      try { recorder.stop() } catch { resolve(make()) }
    })
    setLive('')
    return { blob, transcript: (finalText.trim() || text).trim(), seconds: Math.round((Date.now() - started) / 1000) }
  }

  const upload = async () => {
    setStage('upload')
    setUploadError('')
    const fd = new FormData()
    fd.append('answers', JSON.stringify(answersRef.current.map(({ blob, ...a }) => a)))   // eslint-disable-line no-unused-vars
    answersRef.current.forEach((a, i) => { if (a.blob) fd.append(`audio_${i}`, a.blob, `answer${i}.webm`) })
    try {
      await api.post(`/cefr/speaking/responses/${responseId}/submit/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      streamRef.current?.getTracks().forEach(t => t.stop())
      navigate(result, { replace: true })
    } catch (e) {
      setUploadError(e.response?.data?.error || e.response?.data?.detail || 'Your answers could not be saved. Check the connection and try again.')
      setStage('failed')
    }
  }

  const run = async () => {
    setStage('run')
    answersRef.current = []
    for (let pi = 0; pi < parts.length; pi++) {
      const part = parts[pi]
      setView({ pi, si: -1, phase: 'intro' })
      await say(part.intro)
      for (let si = 0; si < part.steps.length; si++) {
        if (!aliveRef.current) return
        const step = part.steps[si]
        setView({ pi, si, phase: 'question' })
        await say(step.say)
        if (!aliveRef.current) return
        setView({ pi, si, phase: 'prep' })
        await countdown(part.prep)
        if (!aliveRef.current) return
        setView({ pi, si, phase: 'speak' })
        const res = await record(part.speak)
        if (!aliveRef.current) return
        answersRef.current.push({ part: part.key, q: step.q, transcript: res.transcript, seconds: res.seconds, blob: res.blob })
      }
    }
    setView(v => ({ ...v, phase: 'outro' }))
    await say(script.outro)
    if (aliveRef.current) await upload()
  }

  // ── screens ───────────────────────────────────────────────────────────────
  if (isLoading) return <div className="flex flex-1 items-center justify-center"><Loader2 size={26} className="animate-spin text-sky-500" /></div>
  if (error || !data) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <AlertTriangle size={36} className="text-gray-300" />
        <p className="text-lg font-semibold text-gray-600">This test could not be opened.</p>
        <button type="button" onClick={() => navigate(HOME)} className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white">Back to Speaking</button>
      </div>
    )
  }

  if (stage === 'gate') {
    const total = parts.reduce((n, p) => n + p.steps.length, 0)
    return (
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-gradient-to-b from-sky-50 to-white p-4">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl space-y-6 rounded-3xl border border-sky-100 bg-white p-6 shadow-xl shadow-sky-500/10 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md"><Mic size={22} /></span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-sky-600">CEFR Speaking</p>
              <h1 className="truncate text-xl font-black text-gray-900">{data.test.title}</h1>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {parts.map(p => (
              <li key={p.key} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-[16px] font-bold text-gray-900">{p.label} <span className="font-semibold text-gray-500">· {p.name}</span></p>
                  <p className="text-sm text-gray-500">
                    {p.steps.length > 1 ? `${p.steps.length} questions · ` : ''}{p.prep} s to prepare · {p.speak >= 60 ? `${p.speak / 60} min` : `${p.speak} s`} to speak
                  </p>
                </div>
                <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-sm font-bold text-sky-700">{p.points} pts</span>
              </li>
            ))}
          </ul>

          <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
            <p className="text-[15px] font-bold text-gray-800">Microphone check</p>
            {mic === 'ok' ? (
              <div className="flex items-center gap-4">
                <MicMeter level={level} active={false} />
                <p className="text-[15px] text-gray-600">Say something — the bars should move. <span className="font-bold text-emerald-600">Microphone is on.</span></p>
              </div>
            ) : mic === 'denied' || mic === 'missing' ? (
              <p className="flex items-start gap-2 text-[15px] text-red-700">
                <MicOff size={18} className="mt-0.5 flex-shrink-0" />
                {mic === 'missing' ? 'No microphone was found. Connect one and try again.' : 'The microphone is blocked. Click the lock icon in the address bar, allow the microphone, then try again.'}
              </p>
            ) : (
              <p className="text-[15px] text-gray-600">The test records your voice. Allow the microphone to continue.</p>
            )}
            {mic !== 'ok' && (
              <button type="button" onClick={askMic} disabled={mic === 'asking'}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-700 hover:bg-sky-50">
                {mic === 'asking' ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />} Allow microphone
              </button>
            )}
            {!SR && (
              <p className="flex items-start gap-2 text-sm text-amber-700">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" /> This browser cannot turn speech into text. Use Google Chrome or Microsoft Edge so your answers can be scored.
              </p>
            )}
          </div>

          <div className="grid gap-2 text-[15px] text-gray-600">
            <p className="flex items-center gap-2"><Volume2 size={17} className="text-sky-600" /> The examiner reads every question aloud — turn your sound on.</p>
            <p className="flex items-center gap-2"><Clock size={17} className="text-sky-600" /> {total} answers, about {data.test.minutes} minutes. Recording starts and stops by itself.</p>
            <p className="flex items-center gap-2"><Check size={17} className="text-sky-600" /> Do not refresh the page during the test — the recordings would be lost.</p>
          </div>
          <button type="button" onClick={run} disabled={mic !== 'ok'}
            className="btn-glass flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-base font-bold text-white shadow-lg shadow-sky-500/25 hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Play size={18} /> Start the test
          </button>
        </motion.div>
      </div>
    )
  }

  const part = parts[view.pi]
  const step = view.si >= 0 ? part?.steps[view.si] : null
  const phase = view.phase

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-sky-50/70 via-white to-white">
      <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setLeaving(true)} disabled={stage !== 'run'}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-slate-50 disabled:opacity-40">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Exit</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-sky-600">CEFR Speaking · {part?.label}</p>
          <p className="truncate text-[15px] font-bold text-gray-900">{data.test.title}</p>
        </div>
        {(phase === 'prep' || phase === 'speak') && (
          <span className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-base font-extrabold tabular-nums ${phase === 'speak' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
            <Clock size={16} /> {fmt(left)}
          </span>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center gap-8 px-4 py-8 sm:px-6">
          <AnimatePresence mode="wait">
            <motion.section key={`${view.pi}-${view.si}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-sky-500/5 sm:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-sky-600 px-2.5 py-1 text-sm font-black text-white">{part?.label}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-gray-700">{part?.name}</span>
              </div>
              {phase === 'intro'
                ? <p className="text-center text-xl leading-relaxed text-gray-700">{part?.intro}</p>
                : <PartStage part={part} step={step} si={view.si} />}
            </motion.section>
          </AnimatePresence>

          <div className="flex min-h-[170px] flex-col items-center justify-center gap-4">
            {(phase === 'intro' || phase === 'question' || phase === 'outro') && (
              <div className="flex items-center gap-3 rounded-2xl bg-sky-50 px-5 py-3 text-[15px] font-semibold text-sky-800">
                <Volume2 size={20} className="animate-pulse" /> {phase === 'outro' ? 'That is the end of the test. Well done!' : 'The examiner is speaking…'}
              </div>
            )}
            {phase === 'prep' && (
              <>
                <Ring total={part.prep} left={left} tone="prep" label="Prepare" />
                <button type="button" onClick={() => skipRef.current?.()}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100">
                  I'm ready — start speaking
                </button>
              </>
            )}
            {phase === 'speak' && (
              <>
                <div className="flex items-center gap-6">
                  <Ring total={part.speak} left={left} tone="speak" label="Speak" />
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[15px] font-bold text-red-600"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> Recording</p>
                    <MicMeter level={level} />
                  </div>
                </div>
                {live && <p className="line-clamp-2 max-w-2xl text-center text-[15px] italic text-gray-400">…{live.slice(-160)}</p>}
                <button type="button" onClick={() => skipRef.current?.()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-slate-50">
                  Finish this answer
                </button>
              </>
            )}
          </div>
        </div>
      </main>

      <nav className="flex-shrink-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          <div className="mx-auto flex w-max items-center gap-3 px-4 py-3">
            {parts.map((p, i) => {
              const state = i < view.pi ? 'done' : i === view.pi ? 'now' : 'next'
              const doneSteps = state === 'done' ? p.steps.length : state === 'now' ? Math.max(0, view.si) : 0
              return (
                <div key={p.key} aria-current={state === 'now' ? 'step' : undefined}
                  className={`min-w-[8.5rem] rounded-2xl px-4 py-2 ${state === 'now' ? 'border-2 border-sky-400 bg-sky-50' : 'border border-slate-200 bg-white'}`}>
                  <p className={`flex items-center gap-1.5 text-[15px] font-bold ${state === 'now' ? 'text-sky-700' : state === 'done' ? 'text-emerald-700' : 'text-gray-500'}`}>
                    {state === 'done' && <Check size={15} />} {p.label}
                  </p>
                  <div className="mt-1.5 flex gap-1">
                    {p.steps.map((_, k) => (
                      <span key={k} className={`h-1.5 flex-1 rounded-full ${state === 'done' || (state === 'now' && k < doneSteps) ? 'bg-emerald-500' : state === 'now' && k === view.si ? 'bg-sky-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {(stage === 'upload' || stage === 'failed') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center shadow-2xl">
              {stage === 'upload' ? (
                <>
                  <Loader2 size={34} className="mx-auto animate-spin text-sky-600" />
                  <p className="text-lg font-black text-gray-900">Saving your answers…</p>
                  <p className="text-[15px] text-gray-500">Then the AI examiner will score them.</p>
                </>
              ) : (
                <>
                  <AlertTriangle size={34} className="mx-auto text-red-500" />
                  <p className="text-lg font-black text-gray-900">Not saved yet</p>
                  <p className="text-[15px] text-gray-600">{uploadError}</p>
                  <button type="button" onClick={upload}
                    className="btn-glass inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 font-bold text-white hover:bg-sky-700">
                    <RotateCcw size={17} /> Try again
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
        {leaving && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 text-center shadow-2xl">
              <p className="text-lg font-black text-gray-900">Leave the test?</p>
              <p className="text-[15px] text-gray-600">Your recordings will be lost and the test will not be scored.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setLeaving(false)} className="flex-1 rounded-2xl border-2 border-slate-200 py-3 font-bold text-gray-700 hover:bg-slate-50">Stay</button>
                <button type="button" onClick={() => navigate(HOME)} className="flex-1 rounded-2xl bg-red-600 py-3 font-bold text-white hover:bg-red-700">Leave</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
