import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import SectionHead from './SectionHead'
import { useScrollMotion } from './motion'
import { PREMIUM_FEATURES, formatSom, usePlans, useTelegramCheckout } from '../../components/pricing/usePlans'

const STEPS = [
  'Open our Telegram bot and pick a plan',
  'Transfer the amount to the card it shows',
  'Send the receipt — Premium opens after a quick check',
]

function Plan({ plan, best, saving, checkout, accepting }) {
  const perMonth = Math.round(plan.price / plan.months / 100) * 100
  return (
    <article
      data-reveal
      className={`eb-card relative flex flex-col p-7 sm:p-9 ${best ? 'eb-dark' : ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-medium">{plan.months === 1 ? '1 month' : `${plan.months} months`}</h3>
        {best && saving > 0 && (
          <span className="inline-flex h-7 items-center rounded-full bg-(--sky) px-3 text-[12px] font-semibold text-white">
            Save {saving}%
          </span>
        )}
      </div>

      <p className="mt-8 flex items-baseline gap-2">
        <span className="eb-tnum whitespace-nowrap text-[48px] font-semibold leading-none tracking-[-0.04em] sm:text-[56px]">
          {formatSom(plan.price)}
        </span>
        <span className={`text-[17px] ${best ? 'text-white/70' : 'text-(--muted)'}`}>so'm</span>
      </p>
      <p className={`mt-3 text-[14px] ${best ? 'text-white/70' : 'text-(--muted)'}`}>
        {plan.months === 1 ? '30 days of Premium' : `≈ ${formatSom(perMonth)} so'm a month · ${plan.days} days`}
      </p>

      <ul className={`mt-8 flex-1 space-y-3 border-t pt-8 ${best ? 'border-white/10' : 'border-(--line)'}`}>
        {PREMIUM_FEATURES.map((f) => (
          <li key={f} className="flex gap-3 text-[15px] leading-snug">
            <Check aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${best ? 'text-(--sky)' : 'text-(--sky-ink)'}`} strokeWidth={2.5} />
            <span className={best ? 'text-white/90' : 'text-(--ink-soft)'}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={checkout.open}
        disabled={checkout.busy || !accepting}
        className={`eb-btn eb-btn-lg mt-10 w-full disabled:opacity-60 ${best ? 'eb-btn-light' : 'eb-btn-primary'}`}
      >
        {checkout.busy ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FaTelegramPlane aria-hidden="true" />}
        Pay via Telegram
      </button>
    </article>
  )
}

export default function Pricing() {
  const ref = useRef(null)
  useScrollMotion(ref)
  const { plans, accepting, bot_url: botUrl, refund_hours: refundHours, saving } = usePlans()
  const checkout = useTelegramCheckout(botUrl)

  return (
    <section ref={ref} id="pricing" aria-labelledby="eb-pricing-title" className="eb-section scroll-mt-16 border-t border-(--line)">
      <div className="eb-container">
        <div className="eb-grid gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <SectionHead
              id="eb-pricing-title"
              eyebrow="Pricing"
              lines={['One plan.', 'Every exam.']}
              lead="Premium opens every SAT, IELTS and CEFR mock and the AI scoring. Pay once by card in our Telegram bot — no subscription, nothing renews by itself."
            />
            <ol className="mt-10 space-y-4" data-reveal>
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-start gap-4 text-[15px] text-(--ink-soft)">
                  <span className="eb-tnum grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line-strong)]">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((p, i) => (
                <Plan
                  key={p.id}
                  plan={p}
                  best={i === plans.length - 1 && plans.length > 1}
                  saving={saving}
                  checkout={checkout}
                  accepting={accepting}
                />
              ))}
            </div>

            {checkout.error && <p role="alert" className="mt-4 text-[14px] text-red-600">{checkout.error}</p>}
            {!accepting && (
              <p className="mt-4 text-[14px] text-(--muted)">Payments are paused for a moment. Please check back soon.</p>
            )}

            <div className="mt-6 flex flex-col gap-2 text-[14px] text-(--muted) sm:flex-row sm:items-center sm:justify-between" data-reveal>
              <p>
                Any payment can be refunded within {refundHours} hours.{' '}
                <Link to="/refund-policy" className="inline-flex items-center gap-1 font-medium text-(--ink)">
                  <span className="eb-ulink">Details</span>
                  <ArrowRight aria-hidden="true" className="eb-arrow h-3.5 w-3.5" />
                </Link>
              </p>
              {!checkout.signedIn && (
                <p>
                  Have an account?{' '}
                  <Link to="/login" className="font-medium text-(--ink)"><span className="eb-ulink">Sign in first</span></Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
