import ExamSection from './ExamSection'
import HowItWorks from './HowItWorks'
import Features from './Features'
import AISection from './AISection'
import GamesStudy from './GamesStudy'
import Pricing from './Pricing'
import FinalCTA from './FinalCTA'

export { default as Footer } from './Footer'

/**
 * Every section under the hero. Loaded as its own chunk so GSAP and these
 * sections never delay the first paint of the hero.
 */
export default function BelowFold() {
  return (
    <>
      <ExamSection />
      <HowItWorks />
      <Features />
      <AISection />
      <GamesStudy />
      <Pricing />
      <FinalCTA />
    </>
  )
}
