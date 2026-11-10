import { useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { FEATURES, SKILLS } from './data'
import SectionHead from './SectionHead'
import { useScrollMotion } from './motion'
import { useReducedMotion } from './useMedia'

/** Sets data-play on the element while it is on screen, so its CSS loops only run then. */
function usePlayWhileVisible() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, visible]
}

function Frame({ children, className = '' }) {
  const [ref, visible] = usePlayWhileVisible()
  return (
    <div
      ref={ref}
      data-play={visible}
      aria-hidden="true"
      className={`eb-demo relative h-[220px] overflow-hidden rounded-[18px] bg-(--bg-soft) shadow-[inset_0_0_0_1px_var(--line)] ${className}`}
    >
      {typeof children === 'function' ? children(visible) : children}
    </div>
  )
}

function TimerDemo({ playing }) {
  const reduced = useReducedMotion()
  const [left, setLeft] = useState(32 * 60)
  useEffect(() => {
    if (!playing || reduced) return
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 32 * 60 : s - 1)), 1000)
    return () => clearInterval(id)
  }, [playing, reduced])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="flex h-full flex-col justify-between p-6">
      <div className="flex items-center justify-between text-[12px] text-(--subtle)">
        <span>Section 2 · Math</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-[inset_0_0_0_1px_var(--line)]">
          <Lock className="h-3 w-3" /> Fullscreen
        </span>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative h-14 w-14 shrink-0 rounded-full bg-white shadow-[inset_0_0_0_1px_var(--line-strong)]">
          <span className="eb-hand absolute bottom-1/2 left-[calc(50%-0.75px)] h-5 w-[1.5px] rounded-full bg-(--ink)" />
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--sky)" />
        </div>
        <span className="eb-tnum text-[52px] font-semibold leading-none tracking-[-0.04em]">{mm}:{ss}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-(--line)">
        <div className="eb-drain h-full rounded-full bg-(--sky)" />
      </div>
    </div>
  )
}

function ScoreDemo() {
  const lines = [92, 100, 78, 96, 64]
  const marks = [{ line: 1, left: 18, width: 34, d: '0s' }, { line: 3, left: 40, width: 28, d: '0.5s' }]
  return (
    <div className="flex h-full gap-5 p-6">
      <div className="relative flex flex-1 flex-col gap-3 pt-1">
        {lines.map((w, i) => (
          <div key={i} className="relative h-2.5 rounded-full bg-(--line)" style={{ width: `${w}%` }}>
            {marks.filter((m) => m.line === i).map((m) => (
              <span
                key={m.left}
                className="eb-mark absolute -inset-y-1.5 rounded-md bg-(--sky)/15 shadow-[inset_0_-1.5px_0_var(--sky)]"
                style={{ left: `${m.left}%`, width: `${m.width}%`, '--d': m.d }}
              />
            ))}
          </div>
        ))}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {['Coherence', 'Lexical resource', 'Grammar'].map((t) => (
            <span key={t} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-(--muted) shadow-[inset_0_0_0_1px_var(--line)]">{t}</span>
          ))}
        </div>
      </div>
      <div className="eb-pop flex w-[104px] shrink-0 flex-col justify-center rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--line)]">
        <span className="text-[11px] text-(--subtle)">Example</span>
        <span className="eb-tnum mt-1 text-[34px] font-semibold leading-none tracking-[-0.04em]">7.5</span>
        <span className="mt-1 text-[11px] text-(--subtle)">Band</span>
      </div>
    </div>
  )
}

function ChartDemo() {
  const bars = [0.42, 0.58, 0.5, 0.72, 0.64, 0.86, 0.78]
  return (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between text-[12px] text-(--subtle)">
        <span>Accuracy by topic</span>
        <span>Example</span>
      </div>
      <div className="mt-auto flex h-[130px] items-end gap-2.5">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`eb-bar h-full flex-1 rounded-[6px] ${i === 5 ? 'bg-(--sky)' : 'bg-(--line-strong)'}`}
            style={{ '--h': h, '--d': `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function StackDemo() {
  const cards = [
    { tag: 'SAT · Math', lines: [80, 56] },
    { tag: 'IELTS · Reading', lines: [72, 64] },
    { tag: 'CEFR · Grammar', lines: [88, 48] },
  ]
  return (
    <div className="flex h-full items-end justify-center px-6 pb-7">
      <div className="relative h-[124px] w-full max-w-[360px]">
        {cards.map((c, i) => (
          <div
            key={c.tag}
            className="eb-stack-card absolute inset-0 rounded-2xl bg-white p-4 shadow-[inset_0_0_0_1px_var(--line),0_1px_2px_rgba(11,11,15,0.04)]"
            style={{ '--d': `${-i * 2.5}s` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium">{c.tag}</span>
              <span className="h-2 w-2 rounded-full bg-(--sky)" />
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {c.lines.map((w, j) => <span key={j} className="h-2 rounded-full bg-(--line)" style={{ width: `${w}%` }} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DEMOS = {
  timer: (visible) => <TimerDemo playing={visible} />,
  score: () => <ScoreDemo />,
  chart: () => <ChartDemo />,
  stack: () => <StackDemo />,
}

// Bento layout on desktop: wide / narrow, then narrow / wide.
const SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7']

export default function Features() {
  const ref = useRef(null)
  useScrollMotion(ref)

  return (
    <section ref={ref} aria-labelledby="eb-features-title" className="eb-section">
      <div className="eb-container">
        <div className="eb-grid gap-y-6">
          <SectionHead
            id="eb-features-title"
            className="col-span-12 lg:col-span-6"
            eyebrow="Features"
            lines={['Built for', 'real results.']}
          />
          <p className="eb-lead col-span-12 max-w-[420px] self-end lg:col-span-5 lg:col-start-8" data-reveal>
            Product-grade tools — not flat marketing boxes. Everything you need to train like it is test day.
          </p>
        </div>

        <ul className="eb-grid mt-14 gap-y-4 lg:mt-20 lg:gap-y-6">
          {FEATURES.map((f, i) => (
            <li key={f.title} className={`col-span-12 md:col-span-6 ${SPANS[i]}`} data-reveal>
              <article className="eb-card flex h-full flex-col p-3 sm:p-4">
                <Frame>{DEMOS[f.demo]}</Frame>
                <div className="flex flex-1 flex-col px-3 pb-4 pt-6 sm:px-4">
                  <div className="flex items-center gap-2.5">
                    <f.icon aria-hidden="true" className="h-4 w-4 text-(--sky-ink)" strokeWidth={2} />
                    <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{f.title}</h3>
                  </div>
                  <p className="mt-2 max-w-[440px] text-[16px] leading-relaxed text-(--muted)">{f.desc}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        {/* The four skills, kept from the previous page */}
        <div className="mt-20 border-t border-(--line) pt-10 lg:mt-28">
          <h3 className="text-[15px] font-medium text-(--muted)" data-reveal>Every skill, elevated</h3>
          <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {SKILLS.map((s) => (
              <li key={s.label} data-reveal>
                <p className="text-[20px] font-semibold tracking-[-0.02em]">{s.label}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-(--muted)">{s.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
