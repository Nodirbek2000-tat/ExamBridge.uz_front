import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { EXAMS } from './data'
import SectionHead from './SectionHead'
import { EASE, gsap, useScrollMotion } from './motion'

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

/** A small picture of each exam's real score range, drawn from its badge. */
function ExamScale({ kind }) {
  if (kind === 'sat') {
    return (
      <div>
        <div className="flex items-baseline gap-2">
          <span className="eb-tnum text-[44px] font-semibold leading-none tracking-[-0.04em]" data-count="1600" data-count-from="400">1600</span>
          <span className="text-[13px] text-(--subtle)">top score</span>
        </div>
        <div className="mt-6 flex h-12 items-end justify-between" data-scale>
          {Array.from({ length: 25 }, (_, i) => (
            <span
              key={i}
              data-scale-bar
              className={`w-[2px] rounded-full ${i === 24 ? 'bg-(--sky)' : i % 4 === 0 ? 'bg-(--ink)/40' : 'bg-(--line-strong)'}`}
              style={{ height: i % 4 === 0 ? '100%' : '50%' }}
            />
          ))}
        </div>
        <div className="eb-tnum mt-2 flex justify-between text-[12px] text-(--subtle)">
          <span>400</span><span>1000</span><span>1600</span>
        </div>
      </div>
    )
  }
  if (kind === 'ielts') {
    return (
      <div>
        <div className="flex items-baseline gap-2">
          <span className="eb-tnum text-[44px] font-semibold leading-none tracking-[-0.04em]" data-count="9" data-decimals="1">9.0</span>
          <span className="text-[13px] text-(--subtle)">top band</span>
        </div>
        <div className="mt-6 flex h-12 items-end gap-[6px]" data-scale>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              data-scale-bar
              className={`w-full rounded-[4px] ${i === 9 ? 'bg-(--sky)' : 'bg-(--line-strong)'}`}
              style={{ height: `${16 + i * 9.3}%` }}
            />
          ))}
        </div>
        <div className="eb-tnum mt-2 flex justify-between text-[12px] text-(--subtle)">
          <span>Band 0</span><span>Band 9</span>
        </div>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-[44px] font-semibold leading-none tracking-[-0.04em]">A1 → C2</span>
      </div>
      <div className="mt-6 flex h-12 items-end gap-[6px]" data-scale>
        {CEFR_LEVELS.map((lvl, i) => (
          <span
            key={lvl}
            data-scale-bar
            className={`w-full rounded-[6px] ${i === 5 ? 'bg-(--sky)' : 'bg-(--line-strong)'}`}
            style={{ height: `${(i + 1) * (100 / 6)}%` }}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-[6px] text-center text-[12px] text-(--subtle)">
        {CEFR_LEVELS.map((lvl) => <span key={lvl}>{lvl}</span>)}
      </div>
    </div>
  )
}

export default function ExamSection() {
  const ref = useRef(null)
  const cardRefs = useRef([])
  const [active, setActive] = useState(0)

  // Highlight the exam whose card crosses the middle of the screen.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setActive(Number(e.target.dataset.index)) }),
      { rootMargin: '-50% 0px -50% 0px' },
    )
    cardRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [])

  useScrollMotion(ref, (_, q) => {
    q('[data-scale]').forEach((row) => {
      gsap.from(row.querySelectorAll('[data-scale-bar]'), {
        scaleY: 0,
        transformOrigin: '50% 100%',
        duration: 0.8,
        ease: EASE,
        stagger: 0.04,
        scrollTrigger: { trigger: row, start: 'top 90%', once: true },
      })
    })
  })

  return (
    <section
      id="exams"
      ref={ref}
      tabIndex={-1}
      aria-labelledby="eb-exams-title"
      className="eb-section scroll-mt-16 focus:outline-none"
    >
      <div className="eb-container eb-grid gap-y-12">
        <div className="col-span-12 lg:col-span-5">
          <div className="lg:sticky lg:top-32">
            <SectionHead
              id="eb-exams-title"
              eyebrow="Exams"
              lines={['Three exams.', 'One platform.']}
              lead="Each path built for depth — not generic drills."
            />
            <ol className="mt-12 hidden flex-col gap-3 lg:flex" aria-label="Exams on this page" data-reveal>
              {EXAMS.map((exam, i) => (
                <li key={exam.name} className="flex items-center gap-4 text-[15px]">
                  <span className="eb-tnum w-6 text-[13px] text-(--subtle)">0{i + 1}</span>
                  <span
                    aria-hidden="true"
                    className="h-px w-10 origin-left bg-(--ink) transition-transform duration-500"
                    style={{ transform: `scaleX(${active === i ? 1 : 0.3})`, transitionTimingFunction: 'var(--ease)' }}
                  />
                  <span className={`transition-opacity duration-500 ${active === i ? 'opacity-100' : 'opacity-50'}`}>{exam.name}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <ul className="col-span-12 flex flex-col gap-4 lg:col-span-7 lg:gap-6">
          {EXAMS.map((exam, i) => (
            <li key={exam.name} ref={(el) => { cardRefs.current[i] = el }} data-index={i} data-reveal>
              <Link
                to={exam.href}
                className="eb-card eb-card-link flex flex-col p-6 sm:p-8 lg:min-h-[520px] lg:p-10"
                aria-label={`${exam.name} — ${exam.desc}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl shadow-[inset_0_0_0_1px_var(--line)]">
                      <exam.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                    </span>
                    <h3 className="text-[36px] font-semibold leading-none tracking-[-0.04em] sm:text-[44px]">{exam.name}</h3>
                  </div>
                  <span className="eb-chip eb-tnum shrink-0 font-medium text-(--ink)">{exam.badge}</span>
                </div>

                <p className="eb-lead mt-6 max-w-[440px]">{exam.desc}</p>

                <div className="mt-10 lg:mt-auto lg:pt-12">
                  <ExamScale kind={exam.scale} />
                </div>

                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-(--line) pt-6">
                  <ul className="flex flex-wrap gap-2" aria-label={`${exam.name} sections`}>
                    {exam.skills.map((s) => <li key={s} className="eb-chip">{s}</li>)}
                  </ul>
                  <span className="inline-flex items-center gap-2 text-[15px] font-medium">
                    Explore {exam.name}
                    <ArrowRight aria-hidden="true" className="eb-arrow h-4 w-4" />
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
