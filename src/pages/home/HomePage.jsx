import { lazy, Suspense } from 'react'
import Seo from '../../components/Seo.jsx'
import Navbar from './Navbar'
import Hero from './Hero'
import Marquee from './Marquee'
import './home.css'

// Sections below the fold (and GSAP with them) load as a separate chunk,
// so the hero paints without waiting for them.
const loadBelowFold = () => import('./BelowFold')
const BelowFold = lazy(loadBelowFold)
const Footer = lazy(() => loadBelowFold().then((m) => ({ default: m.Footer })))

export default function HomePage() {
  return (
    <div className="eb-home">
      <Seo
        path="/"
        description="ExamBridge — IELTS, CEFR va SAT imtihonlariga onlayn tayyorgarlik. Haqiqiy formatdagi mock testlar, AI orqali speaking va writing baholash, natijalar tahlili va shaxsiy statistika."
      />
      <Navbar />
      <main>
        <Hero />
        <Marquee />
        <Suspense fallback={<div className="min-h-screen" aria-hidden="true" />}>
          <BelowFold />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  )
}
