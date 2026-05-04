import ExamPricingSection from '../../components/pricing/ExamPricingSection.jsx'

/** Same Premium / Pro block as home — Telegram checkout modal included */
export default function SubscriptionPage() {
  return (
    <div id="subscription-plans" className="w-full min-h-[calc(100vh-4rem)] scroll-mt-4">
      <ExamPricingSection animateOnScroll={false} sectionId={null} className="border-t-0" />
    </div>
  )
}
