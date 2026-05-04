import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Check, X, CreditCard, Smartphone } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import { useAuthStore } from '../../store/authStore'

gsap.registerPlugin(ScrollTrigger)

/** Telegram support — prefilled purchase messages open here */
const TELEGRAM_SUPPORT_USER = 'nodirbek_shukurov1'

/** Optional: extra line appended to the Telegram body */
const RECEIPT_TRANSFER_NOTE = ''

/** Receiving account — Uzcard / HUMO (shown in Telegram when that method is chosen) */
export const RECEIVER_CARD_UZCARD = {
  number: '9860 1701 0951 8093',
  holder: 'Nodirbek Shukurov',
}

/** Receiving account — Visa / Mastercard (shown in Telegram when that method is chosen) */
export const RECEIVER_CARD_VISA = {
  number: '4023 0605 1837 1512',
  holder: 'Nodirbek Shukurov',
}

function payerFullName(user) {
  if (!user) return ''
  const fn = user.first_name?.trim()
  const ln = user.last_name?.trim()
  if (fn && ln) return `${fn} ${ln}`
  if (user.full_name?.trim()) return user.full_name.trim()
  if (fn) return fn
  if (ln) return ln
  return ''
}

const PAYMENT_METHODS = [
  { id: 'uzcard', label: 'UZCARD / HUMO', shortLabel: 'UZCARD / HUMO', Icon: CreditCard },
  { id: 'visa', label: 'VISA / Mastercard', shortLabel: 'VISA / Mastercard', Icon: Smartphone },
]

/** Two tiers only — Premium + Pro (unlimited practice framing) */
export const EXAM_PRICING_PLANS = [
  {
    id: 'premium',
    name: 'Premium',
    tag: null,
    description:
      'Unlimited monthly access to SAT mocks, IELTS Speaking, and IELTS Writing — with AI feedback where it matters.',
    price: "79 000 so'm",
    compareAt: "119 000 so'm",
    billing: '/ month',
    cta: 'Get Premium',
    highlight: false,
    telegramNote:
      'Plan: Premium (monthly). I want unlimited access to SAT mocks, IELTS Speaking AI, and IELTS Writing AI feedback.',
    features: [
      'Unlimited SAT full mocks & practice modules',
      'IELTS Speaking — AI scoring, fluency & topic cues',
      'IELTS Writing — AI feedback & structure tips',
      'Score breakdowns & progress snapshots',
      'Telegram support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tag: 'SAVE 258 000',
    description:
      '3 months at a steep discount — everything in Premium, plus deeper AI coaching: progress, chat, explanations, and a private AI teacher.',
    price: "189 000 so'm",
    compareAt: "447 000 so'm",
    billing: '/ 3 months',
    cta: 'Get Pro Access',
    highlight: true,
    telegramNote:
      'Plan: Pro (3 months). I want unlimited SAT + IELTS Speaking + Writing, plus AI progress, AI chat, AI explanations, and private AI teacher.',
    features: [
      'Everything in Premium — unlimited SAT, Speaking & Writing',
      '3 months billed once — best value for steady prep',
      'AI progress — weak areas, streaks, and next steps',
      'AI chat — ask anything about SAT / IELTS tasks',
      'AI explanations — step-by-step reasoning on tough items',
      'Private AI teacher — guided prompts tailored to you',
      'Priority Telegram support',
    ],
  },
]

function buildPricingTelegramText(plan, paymentMethodId, userEmail, user) {
  const pm = PAYMENT_METHODS.find((m) => m.id === paymentMethodId) ?? PAYMENT_METHODS[0]
  const purchaseLine = `${plan.name} — ${plan.price} ${plan.billing}`.trim()
  const emailLine = userEmail?.trim()
    ? userEmail.trim()
    : '(not logged in — please tell us your signup email)'
  let body = [
    `Hi! I want to purchase: ${purchaseLine}`,
    `Payment method: ${pm.shortLabel}`,
    `My email: ${emailLine}`,
  ].join('\n')
  if (plan.telegramNote) {
    body += `\n${plan.telegramNote}`
  }

  if (paymentMethodId === 'uzcard') {
    const c = RECEIVER_CARD_UZCARD
    body += `\nTransfer to (Uzcard / HUMO): ${c.number} — ${c.holder}`
    const payer = payerFullName(user)
    body += payer
      ? `\nPayer full name (must match bank / receipt): ${payer}`
      : `\nPayer full name (must match bank / receipt): (please type your first & last name)`
  } else if (paymentMethodId === 'visa') {
    const c = RECEIVER_CARD_VISA
    body += `\nTransfer to (Visa / Mastercard): ${c.number} — ${c.holder}`
  }

  if (RECEIPT_TRANSFER_NOTE.trim()) {
    body += `\n${RECEIPT_TRANSFER_NOTE.trim()}`
  } else {
    body += `\nI will send the payment receipt screenshot after transferring.`
  }
  return body
}

function buildPricingTelegramUrl(plan, paymentMethodId, userEmail, user) {
  const text = encodeURIComponent(buildPricingTelegramText(plan, paymentMethodId, userEmail, user))
  return `https://t.me/${TELEGRAM_SUPPORT_USER}?text=${text}`
}

function PricingPaymentModal({ plan, paymentMethodId, onPaymentMethodChange, onClose, userEmail, user }) {
  const selected = PAYMENT_METHODS.find((m) => m.id === paymentMethodId) ?? null
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!plan) return null

  const summary = `${plan.name} — ${plan.price} ${plan.billing}`

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/65 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl shadow-sky-500/25 border border-sky-100 overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Premium access payment</h2>
            <p className="text-sm text-slate-500 mt-1">{summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[min(76vh,520px)] overflow-y-auto">
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3 text-sm text-slate-600 leading-relaxed">
            <p className="font-semibold text-slate-800 mb-2">How it works</p>
            <ol className="list-decimal list-inside space-y-1.5 text-[13px]">
              <li>Choose payment method below (tap <strong>Change</strong> anytime).</li>
              <li>Complete the transfer in your bank app.</li>
              <li>Open Telegram — your plan and details are prefilled.</li>
              <li>Send your receipt screenshot; Premium is activated after verification.</li>
            </ol>
          </div>

          {!paymentMethodId ? (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Choose payment method</p>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_METHODS.map(({ id, label, Icon }) => {
                  const sel = paymentMethodId === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onPaymentMethodChange(id)}
                      className={`rounded-2xl border-2 px-3 py-4 flex flex-col items-center gap-2 transition-all ${
                        sel
                          ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-200/70'
                          : 'border-slate-200 hover:border-sky-200 bg-white'
                      }`}
                    >
                      <Icon className={`w-7 h-7 ${sel ? 'text-sky-600' : 'text-slate-400'}`} strokeWidth={1.75} />
                      <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">Selected:</span>
              <span className="font-bold text-slate-800">{selected?.shortLabel}</span>
              <button
                type="button"
                className="ml-1 text-sky-600 font-semibold underline underline-offset-2 hover:text-sky-800"
                onClick={() => onPaymentMethodChange(null)}
              >
                Change
              </button>
            </div>
          )}

          <a
            href={paymentMethodId ? buildPricingTelegramUrl(plan, paymentMethodId, userEmail, user) : undefined}
            target={paymentMethodId ? '_blank' : undefined}
            rel={paymentMethodId ? 'noopener noreferrer' : undefined}
            className={`flex items-center justify-center gap-3 w-full rounded-2xl py-4 text-[15px] font-bold text-white shadow-lg transition-all ${
              paymentMethodId
                ? 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 shadow-sky-500/30 hover:shadow-sky-500/40'
                : 'bg-slate-200 text-slate-500 cursor-not-allowed pointer-events-none shadow-none'
            }`}
            aria-disabled={!paymentMethodId}
            onClick={(e) => { if (!paymentMethodId) e.preventDefault() }}
          >
            <FaTelegramPlane className="w-6 h-6" />
            Continue in Telegram
          </a>
          {!paymentMethodId && (
            <p className="text-xs text-center text-slate-400">
              UZCARD/HUMO: Telegram will include our Uzcard number and your name for the receipt. Visa/Mastercard: our international card details are included.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{ animateOnScroll?: boolean; sectionId?: string | null; className?: string }} props
 */
export default function ExamPricingSection({ animateOnScroll = true, sectionId = 'pricing', className = '' }) {
  const ref = useRef(null)
  const user = useAuthStore((s) => s.user)
  const userEmail = user?.email ?? ''
  const [modalPlanId, setModalPlanId] = useState(null)
  const [paymentMethodId, setPaymentMethodId] = useState(null)

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

  const openModal = (id) => {
    setPaymentMethodId(null)
    setModalPlanId(id)
  }

  const closeModal = () => {
    setModalPlanId(null)
    setPaymentMethodId(null)
  }

  const plan = EXAM_PRICING_PLANS.find((p) => p.id === modalPlanId) ?? null

  const revealClassHd = animateOnScroll ? 'opacity-0' : 'opacity-100'
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
      <div className="relative z-10 max-w-3xl mx-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 items-stretch">
          {EXAM_PRICING_PLANS.map((p) => (
            <div key={p.id} className={`exam-price-card ${revealClassCard} relative flex min-w-0`}>
              {p.tag && (
                <div
                  className="absolute -top-1.5 left-3 right-3 z-10 text-center py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide text-white"
                  style={{ background: 'linear-gradient(135deg,#0EA5E9,#2563EB)' }}
                >
                  {p.tag}
                </div>
              )}
              <div
                className={`rounded-2xl flex-1 h-full flex flex-col ${p.tag ? 'pt-8' : 'pt-5'} px-4 sm:px-5 pb-5 sm:pb-6 bg-white transition-shadow duration-300 ${
                  p.highlight
                    ? 'border-2 border-sky-400 shadow-lg shadow-sky-500/15 ring-2 ring-sky-100/90'
                    : 'border border-slate-200/80 shadow-sm hover:shadow-md hover:border-sky-200'
                }`}
              >
                <div className="mb-0.5 flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-slate-900">{p.name}</h3>
                  {p.highlight && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-sky-600 px-1.5 py-0.5 rounded-full bg-sky-50 border border-sky-200">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-[12.5px] sm:text-[13px] leading-relaxed min-h-[3.25rem] mb-4">{p.description}</p>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mb-4">
                  <span className="text-2xl font-black text-slate-900">{p.price}</span>
                  <span className="text-xs text-slate-400 line-through">{p.compareAt}</span>
                  <span className="text-xs font-medium text-slate-400">{p.billing}</span>
                </div>
                <ul className="flex-1 space-y-2 mb-5">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 text-[11.5px] sm:text-[12.5px] text-slate-600 leading-snug">
                      <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-sky-600" strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => openModal(p.id)}
                  className={`w-full rounded-xl py-2.5 text-[13px] font-bold transition-all mt-auto ${
                    p.highlight
                      ? 'text-white bg-gradient-to-r from-sky-500 to-blue-600 shadow-md shadow-sky-400/30 hover:from-sky-600 hover:to-blue-700'
                      : 'text-slate-800 bg-slate-50 border border-slate-200 hover:border-sky-200 hover:bg-sky-50/80 hover:text-sky-900'
                  }`}
                >
                  {p.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalPlanId && (
        <PricingPaymentModal
          plan={plan}
          paymentMethodId={paymentMethodId}
          onPaymentMethodChange={setPaymentMethodId}
          onClose={closeModal}
          userEmail={userEmail}
          user={user}
        />
      )}
    </section>
  )
}
