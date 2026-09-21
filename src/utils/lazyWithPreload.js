import { lazy } from 'react'

/**
 * React.lazy ustiga `preload()` qo'shadi.
 *
 * Oddiy React.lazy sahifa kodini FAQAT user o'sha route'ga o'tganda yuklaydi.
 * Imtihon saytida bu xavfli: o'quvchi "Start" bosgan payt interneti uzilsa,
 * kod yuklanmay qoladi va oq ekran chiqadi.
 *
 * `preload()` esa kodni oldindan, fonda yuklab qo'yish imkonini beradi —
 * o'quvchi test ro'yxatini ko'rib turganda imtihon sahifasi allaqachon
 * brauzerda tayyor bo'ladi.
 *
 * Bir marta yuklangan modul brauzer tomonidan eslab qolinadi, shuning uchun
 * preload() ni necha marta chaqirsa ham tarmoqqa faqat bitta so'rov ketadi.
 */
export function lazyWithPreload(factory) {
  const Component = lazy(factory)
  Component.preload = () => factory().catch(() => {
    // Fonda oldindan yuklash — muvaffaqiyatsiz bo'lsa jim qolamiz.
    // User o'sha sahifaga o'tganda React.lazy qayta urinib ko'radi.
  })
  return Component
}

/**
 * Sahifalarni fonda yuklaydi.
 *
 * ATAYLAB bekor qilib bo'lmaydi. Avval bu funksiya bekor qilish funksiyasini
 * qaytarardi va uni useEffect cleanup sifatida ishlatgandik — natijada React
 * qayta render qilganda preload hamisha bekor bo'lib ketaverdi va hech qachon
 * ishlamadi (sinovda aniqlandi).
 *
 * Preload'ni bekor qilishning ma'nosi ham yo'q: user boshqa sahifaga o'tsa
 * ham yuklab olingan kod keyin asqotadi, zarari esa yo'q.
 */
export function preloadAll(components) {
  const run = () => components.forEach((c) => c?.preload?.())

  // Brauzer bo'sh turganda ishga tushadi — joriy sahifani sekinlashtirmaydi.
  // timeout: fon oynada ham kafolatlangan muddatda bajariladi.
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(run, { timeout: 2000 })
  } else {
    setTimeout(run, 500)
  }
}
