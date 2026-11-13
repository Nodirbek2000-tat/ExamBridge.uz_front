import { useSearchParams, Link } from 'react-router-dom'
import { Clock, CheckCircle2, XCircle, MessageCircle, Wallet, ArrowLeft } from 'lucide-react'
import { FaTelegramPlane } from 'react-icons/fa'
import Seo from '../../components/Seo.jsx'
import Navbar from '../home/Navbar'
import Footer from '../home/Footer'
import { SOCIALS } from '../home/data'
import '../home/home.css'

const UPDATED = { en: 'Last updated: 13 November 2026', uz: "Oxirgi yangilanish: 2026-yil 13-noyabr" }

const T = {
  en: {
    eyebrow: 'Refund policy',
    title: 'Any payment can be refunded within 24 hours.',
    lead: 'Premium is paid by card through our Telegram bot. If you change your mind, you have a full day to get your money back — no questions asked.',
    cards: [
      { icon: Clock, tone: 'sky', title: 'Within 24 hours', text: 'Full refund for any reason. The 24 hours start at the time on your payment receipt.' },
      { icon: XCircle, tone: 'gray', title: 'After 24 hours', text: 'The payment is no longer refunded. Your Premium keeps working until its end date.' },
      { icon: Wallet, tone: 'green', title: 'How fast', text: 'Usually the same day, and no later than 24 hours after we confirm your request.' },
    ],
    alwaysTitle: 'We refund at any time — even after 24 hours — when:',
    always: [
      'the money reached our card, but we could not confirm the payment;',
      'you paid twice for the same plan by mistake (we return the extra payment);',
      'you paid more than the plan price (we return the difference);',
      'Premium did not open because of a problem on our side and we could not fix it within 24 hours.',
    ],
    neverTitle: 'We cannot refund when:',
    never: [
      'more than 24 hours have passed since the payment (outside the cases above);',
      'the money was sent to a card other than the one our bot showed you;',
      'the account was blocked for breaking the rules (for example, sharing one account between several people).',
    ],
    howTitle: 'How to ask for a refund',
    how: [
      'Message our support on Telegram or tap “☎️ Yordam” in the bot.',
      'Send the payment receipt and the phone number or e-mail of your ExamBridge account.',
      'We send the money back to the same card it came from. Premium for that payment is switched off.',
    ],
    contact: 'Write to support',
    back: 'See plans',
  },
  uz: {
    eyebrow: "To'lovni qaytarish shartlari",
    title: "Har qanday to'lov 24 soat ichida qaytariladi.",
    lead: "Premium Telegram botimiz orqali karta bilan to'lanadi. Fikringiz o'zgarsa, pulingizni qaytarib olish uchun to'liq bir kun bor — hech qanday savolsiz.",
    cards: [
      { icon: Clock, tone: 'sky', title: '24 soat ichida', text: "Har qanday sabab bilan to'liq qaytariladi. 24 soat to'lov chekidagi vaqtdan boshlab hisoblanadi." },
      { icon: XCircle, tone: 'gray', title: "24 soatdan keyin", text: "To'lov qaytarilmaydi. Premium esa muddati tugaguncha ishlashda davom etadi." },
      { icon: Wallet, tone: 'green', title: 'Qancha vaqtda', text: "Odatda o'sha kuni, so'rovingiz tasdiqlangandan keyin ko'pi bilan 24 soat ichida." },
    ],
    alwaysTitle: "Quyidagi hollarda 24 soatdan keyin ham qaytaramiz:",
    always: [
      "pul kartamizga tushgan, lekin to'lovni tasdiqlay olmagan bo'lsak;",
      "bitta tarif uchun xato bilan ikki marta to'lagan bo'lsangiz (ortiqcha to'lov qaytariladi);",
      "tarif narxidan ko'p to'lagan bo'lsangiz (farqi qaytariladi);",
      "Premium bizning tomondagi xatolik sabab ochilmagan va biz uni 24 soat ichida tuzata olmagan bo'lsak.",
    ],
    neverTitle: 'Quyidagi hollarda qaytarib bo\'lmaydi:',
    never: [
      "to'lovdan keyin 24 soatdan ko'p vaqt o'tgan bo'lsa (yuqoridagi hollardan tashqari);",
      "pul botimiz ko'rsatgan kartadan boshqa kartaga o'tkazilgan bo'lsa;",
      "akkaunt qoidalarni buzgani uchun bloklangan bo'lsa (masalan, bitta akkauntdan bir necha kishi foydalansa).",
    ],
    howTitle: "To'lovni qanday qaytarib olish mumkin",
    how: [
      "Telegramda yordam xizmatiga yozing yoki botdagi «☎️ Yordam» tugmasini bosing.",
      "To'lov chekini va ExamBridge akkauntingizdagi telefon raqami yoki emailni yuboring.",
      "Pul qaysi kartadan kelgan bo'lsa, o'sha kartaga qaytariladi. Shu to'lov uchun ochilgan Premium o'chiriladi.",
    ],
    contact: 'Yordamga yozish',
    back: "Tariflarni ko'rish",
  },
}

const TONES = {
  sky: 'bg-(--sky-wash) text-(--sky-ink)',
  gray: 'bg-(--bg-soft) text-(--muted)',
  green: 'bg-emerald-50 text-emerald-700',
}

export default function RefundPolicyPage() {
  const [params, setParams] = useSearchParams()
  const lang = params.get('lang') === 'uz' ? 'uz' : 'en'
  const t = T[lang]
  const setLang = (l) => setParams(l === 'en' ? {} : { lang: l }, { replace: true })

  return (
    <div className="eb-home">
      <Seo
        title={lang === 'uz' ? "To'lovni qaytarish shartlari" : 'Refund policy'}
        path="/refund-policy"
        description="ExamBridge Premium: har qanday to'lov 24 soat ichida qaytariladi. Qaysi hollarda va qanday qaytarilishi."
      />
      <Navbar />
      <main className="pt-16">
        <section className="eb-section">
          <div className="eb-container max-w-[880px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="eb-eyebrow">{t.eyebrow}</p>
              <div role="group" aria-label="Language" className="inline-flex rounded-full p-1 shadow-[inset_0_0_0_1px_var(--line-strong)]">
                {['uz', 'en'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={`h-9 rounded-full px-4 text-[13px] font-medium transition-colors ${
                      lang === l ? 'bg-(--ink) text-white' : 'text-(--muted) hover:text-(--ink)'
                    }`}
                  >
                    {l === 'uz' ? "O'zbekcha" : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="eb-h2 mt-6 max-w-[14em]">{t.title}</h1>
            <p className="eb-lead mt-6 max-w-[600px]">{t.lead}</p>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {t.cards.map(({ icon: Icon, tone, title, text }) => (
                <div key={title} className="eb-card p-6">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${TONES[tone]}`}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
                  <p className="mt-2 text-[14px] leading-relaxed text-(--muted)">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 grid gap-10 sm:grid-cols-2">
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{t.alwaysTitle}</h2>
                <ul className="mt-5 space-y-3.5">
                  {t.always.map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-(--ink-soft)">
                      <CheckCircle2 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{t.neverTitle}</h2>
                <ul className="mt-5 space-y-3.5">
                  {t.never.map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] leading-relaxed text-(--ink-soft)">
                      <XCircle aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-(--subtle)" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="eb-card mt-14 p-7 sm:p-9">
              <h2 className="flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.01em]">
                <MessageCircle aria-hidden="true" className="h-5 w-5 text-(--sky-ink)" />
                {t.howTitle}
              </h2>
              <ol className="mt-6 space-y-4">
                {t.how.map((step, i) => (
                  <li key={step} className="flex gap-4 text-[15px] leading-relaxed text-(--ink-soft)">
                    <span className="eb-tnum grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--line-strong)]">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={SOCIALS.support} target="_blank" rel="noopener noreferrer" className="eb-btn eb-btn-primary">
                  <FaTelegramPlane aria-hidden="true" /> {t.contact}
                </a>
                <Link to="/pricing" className="eb-btn eb-btn-ghost">
                  <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {t.back}
                </Link>
              </div>
            </div>

            <p className="mt-10 text-[13px] text-(--subtle)">{UPDATED[lang]}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
