import Seo from '../../components/Seo.jsx'
import Navbar from '../home/Navbar'
import Footer from '../home/Footer'
import Pricing from '../home/Pricing'
import '../home/home.css'

/** Public pricing page (/pricing) — the same section the home page shows. */
export default function PricingPage() {
  return (
    <div className="eb-home">
      <Seo
        title="Narxlar"
        path="/pricing"
        description="ExamBridge Premium: 1 oy — 49 000 so'm, 3 oy — 119 000 so'm. Barcha IELTS, CEFR va SAT mock testlari va AI baholash. To'lov 24 soat ichida qaytariladi."
      />
      <Navbar />
      <main className="pt-16">
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
