import { useRef } from 'react'
import Lines from './Lines'
import Magnetic from './Magnetic'
import { useScrollMotion } from './motion'

export default function FinalCTA() {
  const ref = useRef(null)
  useScrollMotion(ref)

  return (
    <section ref={ref} aria-labelledby="eb-cta-title" className="eb-section relative overflow-hidden border-t border-(--line)">
      <div className="eb-container flex flex-col items-center text-center">
        <h2 id="eb-cta-title" className="eb-h-giant" data-lines>
          <Lines lines={['Start today.']} />
        </h2>
        <p className="eb-lead mt-8 max-w-[520px]" data-reveal>
          Join students who train with realistic mocks, AI feedback,
          and analytics built for outcomes.
        </p>
        <div className="mt-10" data-reveal>
          <Magnetic to="/register" size="eb-btn-lg" arrow>Get started</Magnetic>
        </div>
      </div>
    </section>
  )
}
