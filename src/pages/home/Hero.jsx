import Lines from './Lines'
import Magnetic from './Magnetic'
import HeroPreview from './HeroPreview'

function scrollToExams(e) {
  const target = document.getElementById('exams')
  if (!target) return
  e.preventDefault()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  target.focus({ preventScroll: true })
}

/**
 * Hero. The entrance is plain CSS (.eb-hero-in) so the headline is on screen as
 * soon as this chunk renders — it never waits for an animation library.
 */
export default function Hero() {
  return (
    <section aria-labelledby="eb-hero-title" className="eb-hero-in relative isolate overflow-hidden">
      <div aria-hidden="true" className="eb-dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-[820px]" />

      <div className="eb-container pb-20 pt-32 lg:pb-32 lg:pt-40">
        <p className="eb-fade eb-eyebrow" style={{ '--d': '0ms' }}>
          AI-powered exam preparation
        </p>

        <h1 id="eb-hero-title" className="eb-h-hero mt-6 max-w-[11.5em] lg:mt-8">
          <Lines lines={['Your path to the', 'perfect score.']} accentFrom={1} />
        </h1>

        <div className="eb-grid mt-12 gap-y-14 lg:mt-16">
          <div className="col-span-12 lg:col-span-5 lg:pt-2">
            <p className="eb-fade eb-lead max-w-[440px]" style={{ '--d': '320ms' }}>
              Real exam-format mock tests with AI feedback for SAT, IELTS and CEFR.
              Practice the way test day actually feels — then see exactly what to fix.
            </p>

            <div className="eb-fade mt-9 flex flex-wrap items-center gap-3" style={{ '--d': '420ms' }}>
              <Magnetic to="/register" arrow>Start free</Magnetic>
              <Magnetic to="/app/sat" variant="ghost">Try SAT</Magnetic>
            </div>

            <a
              href="#exams"
              onClick={scrollToExams}
              className="eb-fade mt-16 hidden w-fit items-center gap-4 rounded-md text-[12px] font-medium uppercase tracking-[0.18em] text-(--subtle) transition-colors hover:text-(--ink) lg:inline-flex"
              style={{ '--d': '700ms' }}
            >
              <span aria-hidden="true" className="eb-scroll-track" />
              Scroll
            </a>
          </div>

          <div className="eb-fade col-span-12 lg:col-span-7 lg:col-start-6 xl:col-span-5 xl:col-start-8 xl:-mt-[150px]" style={{ '--d': '520ms' }}>
            <HeroPreview />
          </div>
        </div>
      </div>
    </section>
  )
}
