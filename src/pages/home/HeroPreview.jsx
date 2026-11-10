import { useEffect, useRef, useState } from 'react'
import { Check, Clock } from 'lucide-react'
import { PREVIEW } from './data'
import { useReducedMotion } from './useMedia'

// Loop timing (ms): question → answer picked → score counts up → next exam.
const PICK_AT = 1900
const SCORE_AFTER = 900
const NEXT_AFTER = 4400
const COUNT_MS = 1300
const LETTERS = ['A', 'B', 'C', 'D']

const easeOut = (t) => 1 - Math.pow(1 - t, 4)

function formatScore(score, t) {
  if (score.kind === 'level') {
    const i = Math.min(score.steps.length - 1, Math.floor(t * (score.steps.length - 1) + 0.0001))
    return score.steps[i]
  }
  const v = score.from + (score.to - score.from) * t
  if (score.kind === 'band') return (Math.round(v * 2) / 2).toFixed(1)
  return String(Math.round(v / 10) * 10)
}

/** Score that counts up while `active`; text is written directly so the card does not re-render per frame. */
function ScoreValue({ score, active, instant }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (instant) { el.textContent = formatScore(score, 1); return }
    if (!active) { el.textContent = formatScore(score, 0); return }
    let frame = 0
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / COUNT_MS)
      el.textContent = formatScore(score, easeOut(t))
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [score, active, instant])

  return (
    <span ref={ref} className="eb-tnum inline-block min-w-[4ch]">
      {formatScore(score, instant ? 1 : 0)}
    </span>
  )
}

/** Exam clock that ticks down while the card is playing. */
function Timer({ seconds, running }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [running])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <span className="eb-tnum inline-flex items-center gap-1.5 text-[13px] text-(--muted)">
      <Clock aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="sr-only">Time left </span>{mm}:{ss}
    </span>
  )
}

export default function HeroPreview() {
  const reduced = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState(0)
  const [visible, setVisible] = useState(true)
  const cardRef = useRef(null)

  // Pause the loop while the card is off screen or the tab is in the background.
  useEffect(() => {
    const el = cardRef.current
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && !document.hidden))
    const onVis = () => setVisible(!document.hidden && el.getBoundingClientRect().bottom > 0)
    io.observe(el)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const playing = visible && !reduced

  useEffect(() => {
    if (!playing) return
    const wait = phase === 0 ? PICK_AT : phase === 1 ? SCORE_AFTER : NEXT_AFTER
    const id = setTimeout(() => {
      if (phase < 2) setPhase(phase + 1)
      else {
        setIdx((i) => (i + 1) % PREVIEW.length)
        setPhase(0)
      }
    }, wait)
    return () => clearTimeout(id)
  }, [phase, idx, playing])

  const shown = reduced ? 2 : phase
  const item = PREVIEW[idx]

  const choose = (i) => {
    setIdx(i)
    setPhase(0)
  }

  return (
    <div ref={cardRef} className="eb-card overflow-hidden" role="group" aria-label="Example of an ExamBridge mock test">
      {/* Top bar: exam switcher + "Example" label */}
      <div className="flex items-center justify-between gap-3 border-b border-(--line) px-4 py-3 sm:px-5">
        <div className="relative grid grid-cols-3 rounded-full bg-(--bg-soft) p-1 shadow-[inset_0_0_0_1px_var(--line)]">
          <span
            aria-hidden="true"
            className="eb-pv-tab-ind absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-white shadow-[0_1px_2px_rgba(11,11,15,0.06),inset_0_0_0_1px_var(--line)]"
            style={{ transform: `translateX(${idx * 100}%)` }}
          />
          {PREVIEW.map((p, i) => (
            <button
              key={p.exam}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={i === idx}
              className={`relative z-10 h-11 min-w-[64px] sm:h-9 rounded-full px-3 text-[13px] font-medium transition-colors ${
                i === idx ? 'text-(--ink)' : 'text-(--subtle) hover:text-(--ink)'
              }`}
            >
              {p.exam}
            </button>
          ))}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-(--muted) shadow-[inset_0_0_0_1px_var(--line)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-(--sky)" />
          Example
        </span>
      </div>

      {/* Body — keyed by exam so the entrance replays on every switch */}
      <div key={item.exam} className="p-5 sm:p-7" aria-live="off">
        <div className="eb-pv-enter flex items-center justify-between gap-3" style={{ '--d': '0ms' }}>
          <span className="text-[13px] font-medium text-(--subtle)">{item.section}</span>
          <Timer key={item.exam} seconds={item.time} running={playing} />
        </div>

        <p
          className="eb-pv-enter mt-4 min-h-[2.8em] text-[17px] font-medium leading-snug tracking-[-0.01em] sm:text-[19px]"
          style={{ '--d': '60ms' }}
        >
          {item.question}
        </p>

        <ul className="mt-4 grid min-h-[200px] content-start gap-1.5">
          {item.options.map((opt, i) => {
            const picked = shown >= 1 && i === item.answer
            return (
              <li
                key={opt}
                className="eb-pv-enter eb-pv-opt relative flex h-11 items-center gap-3 rounded-[14px] px-3.5 text-[14px] shadow-[inset_0_0_0_1px_var(--line)]"
                style={{ '--d': `${120 + i * 70}ms` }}
                data-picked={picked}
              >
                <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-(--muted) shadow-[inset_0_0_0_1px_var(--line-strong)]">
                  {LETTERS[i]}
                </span>
                <span className="relative flex-1 truncate">{opt}</span>
                <span className="eb-pv-check relative grid h-6 w-6 place-items-center rounded-full bg-(--sky) text-white">
                  <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              </li>
            )
          })}
        </ul>

        <div className="eb-pv-score mt-4 rounded-[18px] bg-(--bg-soft) p-4 shadow-[inset_0_0_0_1px_var(--line)] sm:p-5" data-show={shown >= 2}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-medium text-(--subtle)">{item.score.label}</p>
              <p className="mt-1 flex items-baseline gap-2 text-[36px] font-semibold leading-none tracking-[-0.04em] sm:text-[40px]">
                <ScoreValue score={item.score} active={shown >= 2} instant={reduced} />
                <span className="text-[14px] font-medium tracking-normal text-(--subtle)">{item.score.suffix}</span>
              </p>
            </div>
            <span className="mb-1 text-[12px] text-(--subtle)">Instant result</span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-(--line)">
            <div
              className="eb-pv-bar h-full rounded-full bg-(--sky)"
              style={{ transform: `scaleX(${shown >= 2 ? item.score.pct : 0})` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
