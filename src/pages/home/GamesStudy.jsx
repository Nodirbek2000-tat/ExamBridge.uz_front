import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Gamepad2, Library } from 'lucide-react'
import { GAMES, STUDY_TOOLS } from './data'
import SectionHead from './SectionHead'
import { useScrollMotion } from './motion'

const CARDS = [
  {
    href: '/games',
    icon: Gamepad2,
    title: 'Games',
    desc: 'Short, playful English games — speak, react and keep your streak going.',
    items: GAMES,
    cta: 'Open Games',
  },
  {
    href: '/study',
    icon: Library,
    title: 'Study Tools',
    desc: 'Reading, listening and model answers to learn from between mock tests.',
    items: STUDY_TOOLS,
    cta: 'Open Study Tools',
  },
]

export default function GamesStudy() {
  const ref = useRef(null)
  useScrollMotion(ref)

  return (
    <section ref={ref} aria-labelledby="eb-more-title" className="eb-section border-t border-(--line)">
      <div className="eb-container">
        <SectionHead id="eb-more-title" eyebrow="Beyond the mock" lines={['Keep learning', 'between tests.']} />

        <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:mt-20 lg:gap-6">
          {CARDS.map((c) => (
            <li key={c.href} data-reveal>
              <Link to={c.href} className="eb-card eb-card-link flex h-full flex-col p-6 sm:p-8 lg:p-10">
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl shadow-[inset_0_0_0_1px_var(--line)]">
                    <c.icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <span className="eb-new">New</span>
                </div>
                <h3 className="mt-10 text-[32px] font-semibold leading-none tracking-[-0.035em] sm:text-[40px]">{c.title}</h3>
                <p className="mt-4 max-w-[400px] text-[16px] leading-relaxed text-(--muted)">{c.desc}</p>
                <ul className="mt-8 flex flex-wrap gap-2">
                  {c.items.map((it) => <li key={it} className="eb-chip">{it}</li>)}
                </ul>
                <span className="mt-auto inline-flex items-center gap-2 pt-10 text-[15px] font-medium">
                  {c.cta} <ArrowRight aria-hidden="true" className="eb-arrow h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
