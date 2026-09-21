/**
 * Review rejimidagi "Answer review" yoqish/o'chirish tugmasi.
 *
 * Yoqilgan bo'lsa — matnda javob joylari sariq bilan belgilanadi va
 * qizil raqamli nishonlar chiqadi. O'chirilgan bo'lsa ular umuman chizilmaydi.
 *
 * To'rttala imtihon sahifasi (IELTS/CEFR × Reading/Listening) shu bitta
 * komponentni ishlatadi — oldin har birida alohida, bir-biriga o'xshamagan
 * tugma bor edi.
 */
export default function AnswerReviewToggle({ enabled, onToggle, dark = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      title={enabled
        ? 'Answer review yoqilgan — bosib o\'chiring (matndagi sariq belgilar yo\'qoladi)'
        : 'Answer review o\'chirilgan — bosib yoqing (javob joylari sariq bilan belgilanadi)'}
      className={`inline-flex items-center gap-2 px-2 py-1.5 rounded-xl border text-xs font-semibold transition ${
        enabled
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : dark
            ? 'border-gray-600 bg-gray-800 text-gray-300'
            : 'border-gray-200 bg-white text-gray-600'
      }`}
    >
      <span className={`w-9 h-5 rounded-full p-0.5 transition flex-shrink-0 ${
        enabled ? 'bg-emerald-500' : dark ? 'bg-gray-600' : 'bg-gray-200'
      }`}>
        <span className={`block w-4 h-4 rounded-full bg-white transition ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </span>
      {/* Juda tor ekranda faqat kalit ko'rinadi, lekin title har doim bor */}
      <span className="hidden sm:inline whitespace-nowrap">Answer review</span>
    </button>
  )
}
