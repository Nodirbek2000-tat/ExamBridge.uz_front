import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Check, CreditCard, Loader2, CheckCircle2, X, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'

gsap.registerPlugin(ScrollTrigger)

export const EXAM_PRICING_PLANS = [
  {
    id: '1month',
    name: 'Premium',
    tag: null,
    description:
      'Unlimited monthly access to SAT mocks, IELTS Speaking, and IELTS Writing — with AI feedback where it matters.',
    price: "$7.99",
    compareAt: "$11.99",
    billing: '/ month',
    cta: 'Get Premium',
    highlight: false,
    features: [
      'Unlimited SAT full mocks & practice modules',
      'IELTS Speaking — AI scoring, fluency & topic cues',
      'IELTS Writing — AI feedback & structure tips',
      'Score breakdowns & progress snapshots',
      'Priority support',
    ],
  },
  {
    id: '3month',
    name: 'Pro',
    tag: 'SAVE 33%',
    description:
      '3 months at a steep discount — everything in Premium, plus deeper AI coaching: progress, chat, explanations, and a private AI teacher.',
    price: "$15.99",
    compareAt: "$23.97",
    billing: '/ 3 months',
    cta: 'Get Pro Access',
    highlight: true,
    features: [
      'Everything in Premium — unlimited SAT, Speaking & Writing',
      '3 months billed once — great value for steady prep',
      'AI progress — weak areas, streaks, and next steps',
      'AI chat — ask anything about SAT / IELTS tasks',
      'AI explanations — step-by-step reasoning on tough items',
      'Private AI teacher — guided prompts tailored to you',
      'Priority support',
    ],
  },
  {
    id: '6month',
    name: 'Pro 6M',
    tag: 'BEST VALUE',
    description:
      'Our best deal — 6 months of full Pro access billed once. Everything in Pro at the lowest monthly rate, ideal for a full prep season.',
    price: "$28.99",
    compareAt: "$47.94",
    billing: '/ 6 months',
    cta: 'Get 6-Month Pro',
    highlight: false,
    features: [
      'Everything in Pro — all AI coaching features included',
      '6 months billed once — lowest monthly price',
      'Best for a full SAT / IELTS prep season',
      'AI progress, chat, explanations & private AI teacher',
      'Priority support',
    ],
  },
]

// ─── Success banner ───────────────────────────────────────────────────────────
function SuccessBanner({ onClose }) {
  return (
    <div className="mb-8 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4">
      <CheckCircle2 size={22} className="text-emerald-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-bold text-emerald-800">Payment successful! 🎉</p>
        <p className="text-sm text-emerald-700 mt-0.5">
          Your Premium access has been activated. Enjoy unlimited SAT & IELTS practice!
        </p>
      </div>
      <button onClick={onClose} className="text-emerald-400 hover:text-emerald-600 transition">
        <X size={16} />
      </button>
    </div>
  )
}

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, revealClass, onCheckout, loading }) {
  return (
    <div className={`exam-price-card ${revealClass} relative flex min-w-0`}>
      {plan.tag && (
        <div
          className="absolute -top-1.5 left-3 right-3 z-10 text-center py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide text-white"
          style={{ background: 'linear-gradient(135deg,#0EA5E9,#2563EB)' }}
        >
          {plan.tag}
        </div>
      )}
      <div
        className={`rounded-2xl flex-1 h-full flex flex-col ${plan.tag ? 'pt-8' : 'pt-5'} px-4 sm:px-5 pb-5 sm:pb-6 bg-white transition-shadow duration-300 ${
          plan.highlight
            ? 'border-2 border-sky-400 shadow-lg shadow-sky-500/15 ring-2 ring-sky-100/90'
            : 'border border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-200'
        }`}
      >
        <div className="mb-0.5 flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
          {plan.highlight && (
            <span className="text-[9px] font-bold uppercase tracking-wide text-sky-600 px-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200">
              Most popular
            </span>
          )}
        </div>
        <p className="text-slate-500 text-[12.5px] sm:text-[13px] leading-relaxed min-h-[3.25rem] mb-4">
          {plan.description}
        </p>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mb-4">
          <span className="text-2xl font-black text-slate-900">{plan.price}</span>
          <span className="text-xs text-slate-400 line-through">{plan.compareAt}</span>
          <span className="text-xs font-medium text-slate-400">{plan.billing}</span>
        </div>
        <ul className="flex-1 space-y-2 mb-5">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2 text-[11.5px] sm:text-[12.5px] text-slate-600 leading-snug">
              <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-sky-600" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>

        {/* Stripe checkout button */}
        <button
          type="button"
          onClick={() => onCheckout(plan.id)}
          disabled={loading === plan.id}
          className={`w-full rounded-xl py-2.5 text-[13px] font-bold transition-all mt-auto flex items-center justify-center gap-2 disabled:opacity-70 ${
            plan.highlight
              ? 'text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-400/30 hover:from-sky-600 hover:to-blue-700'
              : 'text-slate-800 bg-slate-50 border border-slate-200 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-900'
          }`}
        >
          {loading === plan.id ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <>
              <CreditCard size={14} />
              {plan.cta}
            </>
          )}
        </button>

        {/* Card badge */}
        <p className="text-center text-[10px] text-slate-400 mt-2 flex items-center justify-center gap-1">
          <Sparkles size={9} className="text-sky-300" />
          Secure payment · Auto-renews · Cancel anytime
        </p>
      </div>
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────
/**
 * @param {{ animateOnScroll?: boolean; sectionId?: string | null; className?: string }} props
 */
export default function ExamPricingSection({ animateOnScroll = true, sectionId = 'pricing', className = '' }) {
  const ref = useRef(null)
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(null)  // plan id being loaded
  const [error, setError] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const showSuccess = searchParams.get('success') === '1'

  // ── GSAP scroll animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!animateOnScroll) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo('.exam-price-hd', { opacity: 0, y: 28 }, {
        opacity: 1, y: 0, duration: 0.75, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 82%', once: true },
      })
      gsap.fromTo('.exam-price-card', { opacity: 0, y: 50 }, {
        opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: ref.current, start: 'top 76%', once: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [animateOnScroll])

  // ── Stripe checkout ────────────────────────────────────────────────────────
  const handleCheckout = async (planId) => {
    if (!user) {
      setError('Please sign in first to purchase a plan.')
      return
    }
    setError('')
    setLoading(planId)
    try {
      const res = await api.post('/payments/checkout/', { plan: planId })
      window.location.href = res.data.url
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  const dismissSuccess = () => {
    const p = new URLSearchParams(searchParams)
    p.delete('success')
    p.delete('plan')
    setSearchParams(p, { replace: true })
  }

  const revealClassHd   = animateOnScroll ? 'opacity-0' : 'opacity-100'
  const revealClassCard = animateOnScroll ? 'opacity-0' : 'opacity-100'

  return (
    <section
      id={sectionId == null ? undefined : sectionId}
      ref={ref}
      className={`py-16 sm:py-20 px-4 sm:px-6 bg-white border-t border-slate-100 relative overflow-hidden ${className}`}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.45]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(14,165,233,0.09) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Success banner */}
        {showSuccess && <SuccessBanner onClose={dismissSuccess} />}

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            <X size={14} className="flex-shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
              <X size={13} />
            </button>
          </div>
        )}

        <div className={`exam-price-hd ${revealClassHd} text-center mb-10 sm:mb-12`}>
          <p className="text-xs sm:text-sm font-bold text-sky-600 uppercase tracking-[0.18em] mb-2">Early access pricing</p>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3 tracking-tight">
            Choose your preparation plan
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            <span className="text-sky-600 font-semibold">Unlimited practice</span>{' '}
            on SAT, IELTS Speaking & Writing — Pro adds AI progress, chat, explanations, and a private AI teacher.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 items-stretch">
          {EXAM_PRICING_PLANS.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              revealClass={revealClassCard}
              onCheckout={handleCheckout}
              loading={loading}
            />
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <CreditCard size={13} className="text-sky-400" /> Powered by Stripe
          </span>
          <span>·</span>
          <span>256-bit SSL encryption</span>
          <span>·</span>
          <span>Cancel anytime</span>
          <span>·</span>
          <span>Auto-renews · Visa, Mastercard accepted</span>
        </div>
      </div>
    </section>
  )
}
