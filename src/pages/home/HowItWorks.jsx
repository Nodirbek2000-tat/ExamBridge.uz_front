import { useRef } from 'react'
import { STEPS } from './data'
import SectionHead from './SectionHead'
import { gsap, useScrollMotion } from './motion'

export default function HowItWorks() {
  const ref = useRef(null)

  // The connecting line fills as the steps scroll past; each node lights up when reached.
  useScrollMotion(ref, ({ desktop }, q) => {
    const fills = q('[data-step-fill]')
    const nodes = q('[data-step-node]')
    gsap.set(fills, desktop ? { scaleX: 0, scaleY: 1 } : { scaleY: 0, scaleX: 1 })
    gsap.set(nodes, { opacity: 0, scale: 0.6 })

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: q('[data-steps]')[0],
        start: desktop ? 'top 70%' : 'top 75%',
        end: desktop ? 'bottom 55%' : 'bottom 60%',
        scrub: 0.6,
      },
    })
    tl.to(nodes[0], { opacity: 1, scale: 1, duration: 0.15 })
    fills.forEach((fill, i) => {
      tl.to(fill, { [desktop ? 'scaleX' : 'scaleY']: 1, duration: 1 })
      tl.to(nodes[i + 1], { opacity: 1, scale: 1, duration: 0.15 })
    })
  })

  return (
    <section ref={ref} aria-labelledby="eb-how-title" className="eb-section border-t border-(--line) bg-(--bg-soft)">
      <div className="eb-container">
        <SectionHead
          id="eb-how-title"
          eyebrow="How it works"
          lines={['Three steps to', 'test-day ready.']}
        />

        <ol data-steps className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-3 lg:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative pl-16 lg:pl-0" data-reveal>
              {/* Segment to the next step: vertical on phones, horizontal on desktop */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[21.5px] top-[52px] -bottom-[40px] w-px overflow-hidden bg-(--line-strong) lg:left-[52px] lg:right-[-16px] lg:top-[21.5px] lg:bottom-auto lg:h-px lg:w-auto"
                >
                  <span data-step-fill className="absolute inset-0 origin-top bg-(--sky) lg:origin-left" />
                </span>
              )}

              <span className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full bg-white text-[13px] font-medium text-(--muted) shadow-[inset_0_0_0_1px_var(--line-strong)] lg:relative">
                <span className="eb-tnum">0{i + 1}</span>
                <span
                  data-step-node
                  aria-hidden="true"
                  className="eb-tnum absolute inset-0 grid place-items-center rounded-full bg-(--sky-wash) text-(--sky-ink) shadow-[inset_0_0_0_1.5px_var(--sky)]"
                >
                  0{i + 1}
                </span>
              </span>

              <h3 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] lg:mt-10 lg:text-[24px]">{step.title}</h3>
              <p className="mt-3 max-w-[340px] text-[16px] leading-relaxed text-(--muted)">{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
