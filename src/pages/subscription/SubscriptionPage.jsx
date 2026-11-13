import ExamPricingSection from '../../components/pricing/ExamPricingSection.jsx'

/** In-app Premium page: plans, Telegram card payment, refund note. */
export default function SubscriptionPage() {
  return (
    <div id="subscription-plans" className="w-full min-h-[calc(100vh-4rem)]">
      <ExamPricingSection />
    </div>
  )
}
