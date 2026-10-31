import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  Captions, Maximize, Minimize, Pause, Play, RotateCcw, SkipBack, SkipForward,
} from 'lucide-react'
import Board from './Board'
import { LessonEngine } from './LessonEngine'
import QuestionCard from './QuestionCard'
import { formatClock } from './timeline'
import './lesson.css'

const RATES = [0.75, 1, 1.25, 1.5]
const FONT_ID = 'lesson-board-font'
const FONT_URL = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&display=swap'

/** The board's handwriting font, fetched only by people who open a lesson. */
function loadBoardFont() {
  if (document.getElementById(FONT_ID)) return
  const link = document.createElement('link')
  link.id = FONT_ID
  link.rel = 'stylesheet'
  link.href = FONT_URL
  document.head.appendChild(link)
}

function ControlButton({ label, active, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        active ? 'bg-sky-50 text-sky-600' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  )
}

/** Steps that still have a question nobody has answered. */
function stopsFor(steps, questions, answers) {
  const open = new Set(questions.filter((q) => !answers[q.id]).map((q) => q.step))
  return steps.flatMap((step, index) => (open.has(step.id) ? [index] : []))
}

/** The questions a step ends with, one at a time, under the board they are about. */
function QuestionGate({ questions, answers, onAnswer, onDone }) {
  const [at, setAt] = useState(() => Math.max(0, questions.findIndex((q) => !answers[q.id])))
  const cardRef = useRef(null)

  useEffect(() => {
    cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [at])

  const question = questions[at]
  const last = at === questions.length - 1
  const answered = Boolean(answers[question.id])
  const proceed = () => (last ? onDone() : setAt(at + 1))

  return (
    <div ref={cardRef} className="lp-bar lp-question rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-3">
      <p className="text-xs font-bold text-sky-600">
        Savol{questions.length > 1 ? ` ${at + 1} / ${questions.length}` : ''}
      </p>
      <QuestionCard key={question.id} question={question} answer={answers[question.id]} onAnswer={onAnswer} />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={proceed}
          className={answered
            ? 'px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold'
            : 'px-3 py-2 text-sm font-semibold text-gray-400 hover:text-gray-600'}
        >
          {!answered ? "O'tkazib yuborish" : last ? 'Darsni davom ettirish' : 'Keyingi savol'}
        </button>
      </div>
    </div>
  )
}

function useFullscreen(rootRef) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [rootRef])

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else rootRef.current.requestFullscreen?.()
  }
  return [fullscreen, toggle]
}

const NO_QUESTIONS = []
const NO_ANSWERS = {}

/**
 * Plays one lesson on the board. Render with a `key` of the lesson id: a new
 * lesson needs a new engine, and `steps`, `startIndex` and the questions already
 * answered are read once. `onProgress({ step, ended })` follows the student.
 */
export default function LessonPlayer({
  steps, startIndex = 0, questions = NO_QUESTIONS, answers = NO_ANSWERS, onAnswer, onProgress,
}) {
  const [engine] = useState(() => new LessonEngine(steps, {
    startIndex,
    stops: stopsFor(steps, questions, answers),
  }))
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const [captions, setCaptions] = useState(true)

  const rootRef = useRef(null)
  const sliderRef = useRef(null)
  const clockRef = useRef(null)
  const [fullscreen, toggleFullscreen] = useFullscreen(rootRef)

  useEffect(() => {
    loadBoardFont()
    engine.attach()
    engine.bindDom({ slider: sliderRef.current, clock: clockRef.current })
    return () => engine.destroy()
  }, [engine])

  useEffect(() => {
    if (state.started) onProgress?.({ step: state.index, ended: state.ended })
  }, [state.started, state.index, state.ended, onProgress])

  const { timeline } = engine
  const entry = timeline[state.index]
  const voiced = steps.some((step) => step.audio)

  const handleKeyDown = (event) => {
    if (event.target.closest('button, input, select, textarea')) return
    if (event.key === ' ') {
      event.preventDefault()
      engine.toggle()
    } else if (event.key === 'ArrowRight') {
      engine.next()
    } else if (event.key === 'ArrowLeft') {
      engine.previous()
    }
  }

  return (
    <div ref={rootRef} className="lp-root space-y-2" tabIndex={0} onKeyDown={handleKeyDown}>
      <Board
        key={entry.step.id}
        board={entry.step.board}
        count={state.count}
        instantUpTo={state.instantUpTo}
        rate={state.rate}
        paused={!state.playing}
      >
        {!state.started && (
          <button type="button" className="lp-overlay" onClick={engine.play} aria-label="Darsni boshlash">
            <span className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center shadow-lg">
              <Play size={30} className="ml-1" fill="currentColor" />
            </span>
            <span className="text-sm font-semibold">{startIndex > 0 ? 'Davom ettirish' : 'Darsni boshlash'}</span>
          </button>
        )}
        {state.ended && (
          <button type="button" className="lp-overlay" onClick={engine.play} aria-label="Qayta ko'rish">
            <span className="w-16 h-16 rounded-full bg-sky-500 flex items-center justify-center shadow-lg">
              <RotateCcw size={28} />
            </span>
            <span className="text-sm font-semibold">Dars tugadi. Qayta ko'rish</span>
          </button>
        )}
      </Board>

      {state.gate !== null && (
        <QuestionGate
          key={state.gate}
          questions={questions.filter((q) => q.step === timeline[state.gate].step.id)}
          answers={answers}
          onAnswer={onAnswer}
          onDone={engine.continueLesson}
        />
      )}

      {captions && (
        <p className="lp-bar min-h-[3.25rem] px-4 py-2 rounded-xl bg-slate-900 text-white text-sm sm:text-base font-medium leading-snug">
          {entry.sentences[state.sentence].text}
        </p>
      )}

      <div className="lp-bar rounded-xl bg-white border border-gray-100 shadow-sm px-3 py-2 space-y-1.5">
        <input
          ref={sliderRef}
          type="range"
          className="lp-slider"
          aria-label="Dars vaqti"
          min={0}
          max={engine.total}
          step={0.1}
          defaultValue={0}
          onPointerDown={() => engine.setScrubbing(true)}
          onPointerUp={() => engine.setScrubbing(false)}
          onChange={(event) => engine.seek(Number(event.target.value))}
        />
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
          <ControlButton label="Oldingi qism" onClick={engine.previous}><SkipBack size={18} /></ControlButton>
          <ControlButton label={state.playing ? "To'xtatish" : 'Davom ettirish'} onClick={engine.toggle}>
            {state.playing ? <Pause size={20} /> : <Play size={20} />}
          </ControlButton>
          <ControlButton label="Keyingi qism" onClick={engine.next}><SkipForward size={18} /></ControlButton>

          <span className="ml-1 text-xs text-gray-500 tabular-nums whitespace-nowrap">
            <span ref={clockRef}>0:00</span> / {formatClock(engine.total)}
          </span>
          <span className="ml-2 text-xs text-gray-400 whitespace-nowrap">
            {state.index + 1}-qism, {timeline.length} tadan
          </span>
          {state.buffering && <span className="ml-2 text-xs text-sky-600">Yuklanmoqda…</span>}

          <div className="ml-auto flex items-center gap-1">
            <label className="text-xs text-gray-500">
              <span className="sr-only">Tezlik</span>
              <select
                value={state.rate}
                onChange={(event) => engine.setRate(Number(event.target.value))}
                className="px-1.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-700 text-xs font-semibold"
              >
                {RATES.map((rate) => <option key={rate} value={rate}>{rate}x</option>)}
              </select>
            </label>
            <ControlButton label="Subtitr" active={captions} onClick={() => setCaptions((on) => !on)}>
              <Captions size={18} />
            </ControlButton>
            {document.fullscreenEnabled && (
              <ControlButton label={fullscreen ? 'Kichraytirish' : "To'liq ekran"} onClick={toggleFullscreen}>
                {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </ControlButton>
            )}
          </div>
        </div>
        {(state.audioFailed || !voiced) && (
          <p className="text-[11px] text-gray-400">
            {state.audioFailed ? "Ovoz yuklanmadi, dars matn bilan davom etyapti." : 'Ovoz hali yozilmagan, dars matn bilan ko\'rsatilmoqda.'}
          </p>
        )}
      </div>
    </div>
  )
}
