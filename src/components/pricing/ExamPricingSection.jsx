import { Link } from 'react-router-dom'
import { Check, Crown, Loader2, ShieldCheck, ArrowUpRight, Receipt, CreditCard, Send } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import { useAuthStore } from '../../store/authStore'
import { PREMIUM_FEATURES, formatSom, usePlans, useTelegramCheckout } from './usePlans'

const STEPS = [
  { icon: Send, title: 'Open our bot', text: 'Pick 1 or 3 months in the ExamBridge Telegram bot.' },
  { icon: CreditCard, title: 'Pay to the card', text: 'Transfer the exact amount to the card the bot shows you.' },
  { icon: Receipt, title: 'Send the receipt', text: 'Send a screenshot — Premium opens as soon as it is checked.' },
]

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function PlanCard({ plan, best, saving, onPay, busy, accepting }) {
  const perMonth = plan.price / plan.months
  return (
    <div
      className={`relative flex flex-col rounded-3xl p-6 sm:p-7 transition-shadow ${
        best
          ? 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-xl shadow-sky-500/25'
          : 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 shadow-sm'
      }`}
    >
      {best && saving > 0 && (
        <span className="absolute -top-3 right-6 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-amber-950 shadow">
          Save {saving}%
        </span>
      )}
      <p className={`text-sm font-semibold ${best ? 'text-sky-100' : 'text-gray-500 dark:text-gray-400'}`}>
        {plan.months === 1 ? 'Monthly' : `${plan.months} months`}
      </p>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-4xl sm:text-5xl font-black tracking-tight tabular-nums">{formatSom(plan.price)}</span>
        <span className={`text-base font-semibold ${best ? 'text-sky-100' : 'text-gray-500 dark:text-gray-400'}`}>so'm</span>
      </div>
      <p className={`mt-1 text-sm ${best ? 'text-sky-100' : 'text-gray-500 dark:text-gray-400'}`}>
        {plan.months === 1
          ? 'for 30 days of Premium'
          : `≈ ${formatSom(Math.round(perMonth / 100) * 100)} so'm a month · ${plan.days} days`}
      </p>

      <ul className="mt-6 flex-1 space-y-3">
        {PREMIUM_FEATURES.map((f) => (
          <li key={f} className="flex gap-2.5 text-[14px] leading-snug">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                best ? 'bg-white/20' : 'bg-sky-50 dark:bg-sky-900/40'
              }`}
            >
              <Check size={12} strokeWidth={3} className={best ? 'text-white' : 'text-sky-600 dark:text-sky-400'} />
            </span>
            <span className={best ? 'text-white' : 'text-gray-700 dark:text-gray-300'}>{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onPay}
        disabled={busy || !accepting}
        className={`mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          best
            ? 'bg-white text-sky-700 hover:bg-sky-50'
            : 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
        }`}
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <FaTelegramPlane size={17} />}
        Pay via Telegram
      </button>
    </div>
  )
}

/**
 * Premium plans with card payment through the Telegram bot.
 * Used on the in-app Premium page (/app/subscription).
 */
export default function ExamPricingSection({ className = '' }) {
  const user = useAuthStore((s) => s.user)
  const { plans, accepting, bot_url: botUrl, refund_hours: refundHours, saving } = usePlans()
  const { open, busy, error, signedIn } = useTelegramCheckout(botUrl)
  const premiumActive = user?.is_premium

  return (
    <section className={`px-4 py-10 sm:px-6 sm:py-14 ${className}`}>
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Crown size={13} /> ExamBridge Premium
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Unlock every mock and AI feedback
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-gray-500 dark:text-gray-400">
            One plan for SAT, IELTS and CEFR. Pay by card in our Telegram bot — no subscription, nothing renews by itself.
          </p>
        </div>

        {premiumActive && (
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <ShieldCheck size={20} className="shrink-0" />
            <span>
              Premium is active{user.premium_until ? <> until <b>{formatDate(user.premium_until)}</b></> : null}.
              Buying again adds the days on top.
            </span>
          </div>
        )}

        {!accepting && (
          <p className="mx-auto mt-8 max-w-xl rounded-2xl bg-gray-100 px-4 py-3 text-center text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Payments are paused for a moment. Please check back soon.
          </p>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              best={i === plans.length - 1 && plans.length > 1}
              saving={saving}
              onPay={open}
              busy={busy}
              accepting={accepting}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
        {!signedIn && (
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400">Sign in first</Link>
            {' '}so Premium lands on it.
          </p>
        )}

        <ol className="mt-12 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400">
                  <Icon size={17} />
                </span>
                <span className="text-xs font-bold text-gray-400">STEP {i + 1}</span>
              </div>
              <p className="mt-3 font-bold text-gray-900 dark:text-white">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col items-center justify-center gap-1 text-center text-sm text-gray-500 dark:text-gray-400 sm:flex-row sm:gap-2">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-500" />
            Any payment can be refunded within {refundHours} hours.
          </span>
          <Link
            to="/refund-policy"
            className="inline-flex items-center gap-0.5 font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
          >
            Details <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
