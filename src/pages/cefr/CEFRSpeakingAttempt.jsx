import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mic, MicOff, Loader2, Volume2, Check, Lightbulb, Upload } from 'lucide-react'
import api from '../../api/client'

const AI_PERSONAS = [
  { name: 'Sarah',   gender: 'female', voice: 'nova',    speed: 0.90, greeting: "Hello! I'm Sarah, your CEFR speaking examiner today." },
  { name: 'Emily',   gender: 'female', voice: 'shimmer', speed: 0.92, greeting: "Hi there! My name is Emily, and I'll be your examiner today." },
  { name: 'James',   gender: 'male',   voice: 'onyx',    speed: 0.88, greeting: "Hello! I'm James. I'll be conducting your CEFR speaking test today." },
  { name: 'David',   gender: 'male',   voice: 'echo',    speed: 0.90, greeting: "Good day! My name is David, and I'm your speaking examiner." },
  { name: 'Sophia',  gender: 'female', voice: 'alloy',   speed: 0.93, greeting: "Hello! I'm Sophia. Welcome to your CEFR speaking practice today." },
  { name: 'Michael', gender: 'male',   voice: 'fable',   speed: 0.89, greeting: "Hi! I'm Michael. I'll be your CEFR speaking examiner for this session." },
]

function speakBrowser(text, persona, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.88
  u.pitch = persona.gender === 'female' ? 1.1 : 0.9
  const setVoice = () => {
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.lang.startsWith('en') && (
        persona.gender === 'female'
          ? v.name.match(/female|samantha|karen|victoria|fiona|susan|kate/i)
          : v.name.match(/male|daniel|alex|fred|bruce|ralph/i)
      )
    ) || voices.find(v => v.lang.startsWith('en-')) || voices[0]
    if (preferred) u.voice = preferred
    u.onend = onEnd
    u.onerror = onEnd
    window.speechSynthesis.speak(u)
  }
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) setVoice()
  else window.speechSynthesis.onvoiceschanged = setVoice
}

function buildQuestions(task) {
  if (!task) return []
  if (task.test_type === 'MOCK' && task.parts_data?.length) {
    const qs = []
    for (const part of task.parts_data) {
      if (part.part === 2) {
        const cueText = part.cue_card || part.prompt || ''
        const bullets = (part.bullet_points || []).map(b => `• ${b}`).join('\n')
        qs.push({
          part: 2, type: 'cue_card',
          text: cueText + (bullets ? '\n\n' + bullets : ''),
          intro: "Now I'd like to give you a topic. You have one minute to prepare. Please speak for one to two minutes.",
          acceptPhrase: "Thank you. That was well done.",
        })
        if (part.follow_up) {
          qs.push({ part: 2, type: 'followup', text: part.follow_up, intro: '', acceptPhrase: "Thank you." })
        }
      } else {
        const questions = part.questions || []
        questions.forEach((q, i) => {
          qs.push({
            part: part.part, type: 'question', text: q,
            intro: i === 0 && part.part === 1
              ? "Let's begin. I'd like to ask you some questions."
              : i === 0 && part.part === 3
              ? "We've been talking about that topic. I'd now like to ask you some broader questions."
              : '',
            acceptPhrase: randomAccept(),
          })
        })
      }
    }
    return qs
  }
  if (task.part === 2) {
    const qs = []
    const cueText = task.prompt || ''
    const bullets = (task.bullet_points || []).map(b => `• ${b}`).join('\n')
    qs.push({
      part: 2, type: 'cue_card',
      text: cueText + (bullets ? '\n\n' + bullets : ''),
      intro: "Now I'd like to give you a topic. You have one minute to prepare. Please speak for one to two minutes.",
      acceptPhrase: "Thank you. That was very good.",
    })
    if (task.follow_up) {
      qs.push({ part: 2, type: 'followup', text: task.follow_up, intro: '', acceptPhrase: "Thank you very much." })
    }
    return qs
  }
  return (task.questions || []).map((q, i) => ({
    part: task.part, type: 'question', text: q,
    intro: i === 0 && task.part === 1 ? "I'd like to ask you some general questions." : '',
    acceptPhrase: randomAccept(),
  }))
}

function randomAccept() {
  const phrases = ["Thank you.","Thank you very much.","OK, thank you.","That's great, thank you.","I see, thank you.","Right, thank you for that.","Good, thank you."]
  return phrases[Math.floor(Math.random() * phrases.length)]
}

function WaveBars({ active }) {
  return (
    <div className="flex items-center gap-1 h-8">
      {[...Array(7)].map((_, i) => (
        <motion.div key={i} className="w-1.5 rounded-full bg-emerald-500"
          animate={active ? { height: ['6px', `${14 + Math.random() * 20}px`, '6px'] } : { height: '6px' }}
          transition={{ repeat: Infinity, duration: 0.35 + i * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function ExaminerBlock({ persona, state }) {
  const speaking = state === 'AI_SPEAKING'
  const listening = state === 'RECORDING' || state === 'PREPARING_MIC'
  return (
    <div className="flex flex-col items-center">
      <motion.div className="relative flex items-center justify-center"
        animate={speaking || listening ? { scale: [1, 1.03, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}>
        <div className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full border-4 flex items-center justify-center shadow-lg transition-colors ${
          speaking ? 'border-slate-400' : listening ? 'border-emerald-400' : 'border-emerald-600'
        } bg-white p-1`}>
          <div className={`w-full h-full rounded-full flex items-center justify-center ${
            speaking ? 'bg-gradient-to-br from-emerald-500 to-teal-700'
            : listening ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : 'bg-gradient-to-br from-emerald-500 to-teal-700'
          }`}>
            <Lightbulb className="w-14 h-14 sm:w-16 sm:h-16 text-white" strokeWidth={1.5} />
          </div>
        </div>
        {speaking && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }} />
            ))}
          </div>
        )}
      </motion.div>
      <p className="mt-5 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{persona.name}</p>
      <p className="mt-1 text-xs font-semibold tracking-[0.2em] text-slate-400">CEFR EXAMINER</p>
    </div>
  )
}

export default function CEFRSpeakingAttempt() {
  const { taskId } = useParams()
  const [searchParams] = useSearchParams()
  const attemptId = searchParams.get('attempt')
  const navigate = useNavigate()

  const [persona] = useState(() => AI_PERSONAS[Math.floor(Math.random() * AI_PERSONAS.length)])
  const [state, setState] = useState('MIC_GATE')
  const [micGateStatus, setMicGateStatus] = useState('idle')
  const [micGateMsg, setMicGateMsg] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [transcripts, setTranscripts] = useState([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [subText, setSubText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [micError, setMicError] = useState('')

  const recorderRef = useRef(null)
  const recognitionRef = useRef(null)
  const streamRef = useRef(null)
  const transcriptRef = useRef('')
  const audioChunksRef = useRef([])
  const questionAudiosRef = useRef([])
  const currentAudioRef = useRef(null)
  const ttsCacheRef = useRef(new Map())
  const stopSpeechRequestedRef = useRef(false)
  const recordingStartedAtRef = useRef(0)
  const micAbortRef = useRef(null)

  const handleAllowMic = async () => {
    setMicGateStatus('requesting')
    setMicGateMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      setState('LOADING')
    } catch (err) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setMicGateStatus('denied')
        setMicGateMsg('Ruxsat berilmadi. Brauzer URL bar\'dagi 🔒 belgisini bosib mikrofonni "Allow" ga o\'zgartiring.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setMicGateStatus('error')
        setMicGateMsg('Mikrofon topilmadi. Qurilmangizga mikrofon ulangan ekanligini tekshiring.')
      } else {
        setMicGateStatus('error')
        setMicGateMsg('Xato yuz berdi. Sahifani yangilab qayta urinib ko\'ring.')
      }
    }
  }

  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then(result => {
        if (result.state === 'granted') setState('LOADING')
        else handleAllowMic()
      }).catch(() => handleAllowMic())
    } else {
      handleAllowMic()
    }
  }, [])

  const { data: task } = useQuery({
    queryKey: ['cefr-speaking-task', taskId],
    queryFn: () => api.get('/ielts/speaking/?source=CEFR').then(r => r.data.find(t => String(t.id) === String(taskId))),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!task) return
    setQuestions(buildQuestions(task))
  }, [task])

  const speakAPI = useCallback(async (text, onEnd) => {
    setState('AI_SPEAKING')
    // Stop STT immediately so AI speaker audio isn't picked up by the mic
    stopSpeechRequestedRef.current = true
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* */ }
      recognitionRef.current = null
    }
    const cacheKey = `${persona.voice}:${text}`
    try {
      let audioUrl = ttsCacheRef.current.get(cacheKey)
      if (!audioUrl) {
        const resp = await api.post('/ielts/speaking/tts/', { text, voice: persona.voice, speed: persona.speed }, { responseType: 'blob' })
        audioUrl = URL.createObjectURL(resp.data)
        ttsCacheRef.current.set(cacheKey, audioUrl)
      }
      if (currentAudioRef.current) { currentAudioRef.current.pause(); currentAudioRef.current = null }
      const audio = new Audio(audioUrl)
      currentAudioRef.current = audio
      audio.onended = () => { currentAudioRef.current = null; onEnd?.() }
      audio.onerror = () => { currentAudioRef.current = null; onEnd?.() }
      audio.play().catch(() => { currentAudioRef.current = null; onEnd?.() })
    } catch {
      speakBrowser(text, persona, onEnd)
    }
  }, [persona])

  const say = useCallback((text, onDone) => { speakAPI(text, onDone) }, [speakAPI])

  const showQuestionRef = useRef(null)
  showQuestionRef.current = (idx, qs) => {
    const questionsToUse = qs || questions
    if (idx >= questionsToUse.length) {
      const farewell = "That is the end of the speaking test. Thank you very much for your answers. Well done!"
      setSubText(farewell)
      say(farewell, () => setState('FAREWELL'))
      return
    }
    const q = questionsToUse[idx]
    setSubText(q.text)
    setCurrentTranscript('')
    transcriptRef.current = ''
    const textToSay = q.intro ? q.intro + ' ' + q.text : q.text
    say(textToSay, () => setState('WAIT_RECORD'))
  }

  useEffect(() => {
    if (!questions.length) return
    if (state !== 'LOADING') return
    const greetText = `${persona.greeting} We have ${questions.length} question${questions.length > 1 ? 's' : ''} today.`
    setSubText(greetText)
    say(greetText, () => showQuestionRef.current(0, questions))
  }, [questions, state])

  useEffect(() => {
    if (state !== 'RECORDING' || !questions.length) return
    const nextIdx = qIndex + 1
    if (nextIdx >= questions.length) return
    const next = questions[nextIdx]
    const nextText = next.intro ? next.intro + ' ' + next.text : next.text
    const cacheKey = `${persona.voice}:${nextText}`
    if (ttsCacheRef.current.has(cacheKey)) return
    api.post('/ielts/speaking/tts/', { text: nextText, voice: persona.voice, speed: persona.speed }, { responseType: 'blob' })
      .then(r => { ttsCacheRef.current.set(cacheKey, URL.createObjectURL(r.data)) }).catch(() => {})
  }, [state, qIndex, questions, persona])

  const cleanupMicStream = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    recorderRef.current = null
    if (recognitionRef.current) { try { recognitionRef.current.stop() } catch { /* */ } recognitionRef.current = null }
  }

  const startRecording = async () => {
    if (state !== 'WAIT_RECORD') return
    setCurrentTranscript(''); setMicError(''); transcriptRef.current = ''; audioChunksRef.current = []; stopSpeechRequestedRef.current = false
    const ac = new AbortController(); micAbortRef.current = ac; setState('PREPARING_MIC')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (ac.signal.aborted) { stream.getTracks().forEach(t => t.stop()); return }
      streamRef.current = stream
      let recorder
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : ''
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      } catch { /* */ }
      if (!recorder) { stream.getTracks().forEach(t => t.stop()); setState('WAIT_RECORD'); return }
      recorderRef.current = recorder
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data) }
      try { recorder.start() } catch { stream.getTracks().forEach(t => t.stop()); setState('WAIT_RECORD'); return }
      ;(() => {
        try {
          const SR = window.SpeechRecognition || window.webkitSpeechRecognition
          if (!SR) return
          const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'
          rec.onresult = e => { let full = ''; for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' '; transcriptRef.current = full.trim(); setCurrentTranscript(full.trim()) }
          rec.onerror = () => {}
          rec.onend = () => { if (stopSpeechRequestedRef.current) return; if (recognitionRef.current !== rec) return; try { rec.start() } catch { /* */ } }
          recognitionRef.current = rec; rec.start()
        } catch { /* */ }
      })()
      recordingStartedAtRef.current = Date.now(); setState('RECORDING')
    } catch (err) {
      const name = err?.name || ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') setMicError('Mikrofon ruxsati berilmagan.')
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setMicError('Mikrofon topilmadi.')
      else if (name !== 'AbortError') setMicError(`Mikrofon xatosi: ${err?.message || name || 'noma\'lum'}`)
      setState('WAIT_RECORD'); cleanupMicStream()
    } finally { micAbortRef.current = null }
  }

  const stopRecording = () => {
    if (state !== 'RECORDING') return
    const recorder = recorderRef.current; if (!recorder) return
    if (Date.now() - recordingStartedAtRef.current < 280) return
    const savedTranscript = transcriptRef.current.trim() || '(no transcript)'
    const q = questions[qIndex]; const next = qIndex + 1
    stopSpeechRequestedRef.current = true
    const rec = recognitionRef.current; recognitionRef.current = null
    if (rec) { try { rec.stop() } catch { /* */ } }
    // Save stream ref and clear — stop tracks AFTER recorder flushes data
    const streamToStop = streamRef.current; streamRef.current = null
    recorderRef.current = null
    const advance = () => {
      setTranscripts(prev => [...prev, { question: q.text, transcript: savedTranscript }])
      setQIndex(next)
      say(q.acceptPhrase, () => showQuestionRef.current(next))
    }
    if (recorder.state !== 'inactive') {
      recorder.onstop = () => {
        // Stop tracks AFTER ondataavailable has fired and data is collected
        if (streamToStop) streamToStop.getTracks().forEach(t => t.stop())
        if (audioChunksRef.current.length > 0) questionAudiosRef.current.push(new Blob(audioChunksRef.current))
        else questionAudiosRef.current.push(null)
        advance()
      }
      try { recorder.stop() } catch {
        if (streamToStop) streamToStop.getTracks().forEach(t => t.stop())
        questionAudiosRef.current.push(null); advance()
      }
    } else {
      if (streamToStop) streamToStop.getTracks().forEach(t => t.stop())
      questionAudiosRef.current.push(null); advance()
    }
  }

  const handleMicClick = () => {
    if (state === 'PREPARING_MIC') return
    if (state === 'WAIT_RECORD') startRecording()
    else if (state === 'RECORDING') stopRecording()
  }

  useEffect(() => {
    return () => {
      try { micAbortRef.current?.abort() } catch { /* */ }
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    }
  }, [])

  const handleFinish = async () => {
    if (!attemptId) {
      navigate('/exam/cefr/speaking/result/0', { state: { task, transcripts, persona }, replace: true })
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('task_id', String(taskId))
      formData.append('transcripts', JSON.stringify(transcripts))
      questionAudiosRef.current.forEach((blob, i) => { if (blob) formData.append(`audio_${i}`, blob, `q${i}.webm`) })
      const resp = await api.post(`/ielts/speaking/${attemptId}/submit/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      navigate(`/exam/cefr/speaking/result/${resp.data.id}`, { replace: true })
    } catch {
      navigate('/exam/cefr/speaking/result/0', { state: { task, transcripts, persona }, replace: true })
    }
  }

  const currentQ = questions[qIndex]
  const progressLabel = currentQ && questions.length ? `PART ${currentQ.part} | Q ${qIndex + 1}/${questions.length}` : null

  if (state === 'MIC_GATE') {
    return (
      <div className="flex flex-col h-full min-h-0 items-center justify-center bg-slate-50 px-6"
        style={{ backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(167, 243, 208, 0.3), transparent 55%)' }}>
        <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-emerald-100 p-8 flex flex-col items-center gap-6 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg ${
            micGateStatus === 'denied' || micGateStatus === 'error'
              ? 'bg-gradient-to-br from-red-400 to-rose-600'
              : 'bg-gradient-to-br from-emerald-400 to-teal-600'
          }`}>
            {micGateStatus === 'requesting' ? <Loader2 size={40} className="text-white animate-spin" />
              : micGateStatus === 'denied' || micGateStatus === 'error' ? <MicOff size={40} className="text-white" />
              : <Mic size={40} className="text-white" />}
          </div>
          {(micGateStatus === 'idle' || micGateStatus === 'requesting') && (
            <>
              <div>
                <p className="text-2xl font-black text-slate-900 mb-2">Mikrofon tekshirilmoqda…</p>
                <p className="text-sm text-slate-500 leading-relaxed">Brauzer so'rovini ko'rsatsa, <strong>"Allow"</strong> tugmasini bosing.</p>
              </div>
              <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
                <Loader2 size={22} className="animate-spin" /> Ruxsat so'ralmoqda…
              </div>
            </>
          )}
          {(micGateStatus === 'denied' || micGateStatus === 'error') && (
            <div>
              <p className="text-xl font-black text-slate-900 mb-3">
                {micGateStatus === 'denied' ? '🔒 Mikrofon bloklangan' : '⚠ Mikrofon xatosi'}
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">{micGateMsg}</p>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-slate-50"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(167, 243, 208, 0.18), transparent 55%)' }}>
      <header className="relative flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 flex-shrink-0 border-b border-slate-200/80 bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Mic size={20} className="text-emerald-600 shrink-0" />
          <span className="text-sm sm:text-base font-bold text-slate-900 truncate">CEFR Speaking</span>
        </div>
        {progressLabel && state !== 'FAREWELL' && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-bold tracking-wide text-emerald-900 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-emerald-100 border border-emerald-200/80 whitespace-nowrap pointer-events-none max-w-[min(52vw,220px)] truncate text-center">
            {progressLabel}
          </span>
        )}
        <div className="w-9 sm:w-10 shrink-0" aria-hidden />
      </header>

      <div className="flex-1 flex flex-col items-center px-4 sm:px-8 py-6 sm:py-10 overflow-y-auto min-h-0">
        <div className="w-full max-w-lg flex flex-col items-center flex-1 justify-center gap-8 sm:gap-10">
          <ExaminerBlock persona={persona} state={state} />

          <motion.div key={`${qIndex}-${state}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-[28px] sm:rounded-[36px] bg-white shadow-lg shadow-slate-200/80 border border-slate-100 px-6 sm:px-10 py-8 sm:py-12">
            {state === 'LOADING' ? (
              <div className="flex items-center justify-center gap-2 text-slate-400 text-sm min-h-[120px]">
                <Loader2 size={18} className="animate-spin" /> Loading...
              </div>
            ) : state === 'FAREWELL' ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check size={28} className="text-emerald-600" />
                </div>
                <p className="font-bold text-slate-900 text-lg">Session complete</p>
                <p className="text-sm text-slate-500">Your answers were recorded.</p>
                <button type="button" onClick={handleFinish} disabled={submitting}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md transition flex items-center justify-center gap-2 disabled:opacity-70">
                  {submitting ? <><Upload size={15} className="animate-bounce" /> Yuklanmoqda...</> : 'Natijalarni ko\'rish →'}
                </button>
              </div>
            ) : (
              <>
                {currentQ && (
                  <div className="space-y-3">
                    {currentQ.type === 'cue_card' && (
                      <div className="text-center text-xs font-bold text-emerald-600 uppercase tracking-wider">Cue card</div>
                    )}
                    <p className="text-center text-lg sm:text-xl font-medium text-slate-900 leading-relaxed whitespace-pre-line font-serif">
                      {currentQ?.text || subText}
                    </p>
                  </div>
                )}
                {!currentQ && subText && (
                  <p className="text-center text-base text-slate-600 leading-relaxed">{subText}</p>
                )}
              </>
            )}
          </motion.div>

          {state === 'AI_SPEAKING' && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold">
              <Volume2 size={15} className="animate-pulse shrink-0" /> {persona.name} is speaking…
            </div>
          )}

          {state === 'PREPARING_MIC' && (
            <div className="flex flex-col items-center gap-2 w-full">
              <Loader2 size={28} className="animate-spin text-slate-500" />
              <p className="text-xs text-slate-700 font-semibold">Mikrofon ochilmoqda…</p>
            </div>
          )}

          {state === 'RECORDING' && (
            <div className="flex flex-col items-center gap-2 w-full">
              <WaveBars active />
              <p className="text-xs text-emerald-600 font-semibold">Yozilmoqda…</p>
            </div>
          )}

          {micError && state === 'WAIT_RECORD' && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 max-w-xs w-full">
              <span className="text-red-500 text-lg leading-none mt-0.5">⚠</span>
              <div>
                <p className="text-xs font-bold text-red-700 mb-0.5">Mikrofon xatosi</p>
                <p className="text-xs text-red-600">{micError}</p>
              </div>
            </div>
          )}

          {(state === 'WAIT_RECORD' || state === 'PREPARING_MIC' || state === 'RECORDING') && (
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <motion.button type="button" onClick={handleMicClick}
                className={`w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-xl transition-all ${
                  state === 'RECORDING' ? 'bg-red-500 shadow-red-200/80 ring-4 ring-red-100'
                  : state === 'PREPARING_MIC' ? 'bg-slate-400 ring-4 ring-slate-100 cursor-wait'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/60'
                }`}
                whileTap={state === 'PREPARING_MIC' ? undefined : { scale: 0.94 }}>
                {state === 'RECORDING' ? <MicOff size={30} className="text-white" />
                  : state === 'PREPARING_MIC' ? <Loader2 size={30} className="text-white animate-spin" />
                  : <Mic size={30} className="text-white" />}
              </motion.button>
              <p className="text-center text-xs sm:text-sm text-slate-500 font-medium px-2">
                {state === 'RECORDING' ? 'Tugash uchun yana bir marta bos'
                  : state === 'PREPARING_MIC' ? 'Mikrofon ruxsati va yozuv tayyorlanmoqda…'
                  : 'Bosing va gapirishni boshlang'}
              </p>
            </div>
          )}

          {questions.length > 0 && state !== 'LOADING' && state !== 'FAREWELL' && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {questions.map((_, i) => (
                <span key={i} className={`h-2 rounded-full transition-all ${
                  i < qIndex ? 'w-2 bg-emerald-400' : i === qIndex ? 'w-6 bg-emerald-700' : 'w-2 bg-slate-300'
                }`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
