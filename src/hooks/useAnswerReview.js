import { useCallback, useState } from 'react'

/**
 * Review rejimida "answer review" ni ko'rsatish/yashirish sozlamasi.
 *
 * Bu — matndagi sariq belgilashlar va javob joyini ko'rsatuvchi qizil raqamlar.
 * O'chirilsa, ular umuman chizilmaydi.
 *
 * Tanlov localStorage'da saqlanadi: o'quvchi bir marta o'chirsa, boshqa
 * testlarda ham o'chiq qoladi (har safar qaytadan bosish shart emas).
 *
 * Oldin har bir sahifa o'zicha holat tutardi va standart qiymatlari ham
 * har xil edi (Reading'da o'chiq, qolganlarida yoqiq).
 */

const STORAGE_KEY = 'exam:answer-review'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true      // standart holat: yoqiq
    return raw === '1'
  } catch {
    return true                        // maxfiy rejim / bloklangan xotira
  }
}

export function useAnswerReview() {
  const [enabled, setEnabled] = useState(readStored)

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0') } catch { /* */ }
      return next
    })
  }, [])

  return [enabled, toggle]
}
