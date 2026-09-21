import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Kutubxonalarni alohida fayllarga ajratish.
 *
 * Nega: kutubxonalar (React, framer-motion, katex...) deyarli o'zgarmaydi.
 * Alohida faylda bo'lsa, biz kodni yangilaganimizda ham brauzer ularni
 * qaytadan yuklamaydi — xotirasidagi nusxasini ishlatadi. Ya'ni har deploydan
 * keyin o'quvchi 2.5 MB emas, faqat o'zgargan kichik qismni yuklaydi.
 *
 * Faqat node_modules ajratiladi — o'z kodimiz React.lazy orqali sahifa
 * bo'yicha bo'linadi (App.jsx ga qarang).
 */
function splitVendors(id) {
  const path = id.replace(/\\/g, '/')
  if (!path.includes('node_modules')) return

  // React o'zagi — hamma sahifaga kerak, hech qachon o'zgarmaydi
  if (/node_modules\/(react|react-dom|scheduler|use-sync-external-store)\//.test(path)) {
    return 'vendor-react'
  }
  if (path.includes('node_modules/react-router')) return 'vendor-router'
  if (path.includes('node_modules/@tanstack')) return 'vendor-query'

  // Qolganlarini ATAYLAB guruhlamayamiz — Rollup o'zi to'g'ri joylashtiradi.
  //
  // Tajriba shuni ko'rsatdi: katex/markdown/gsap ni majburan guruhlash zarar
  // qildi. main.jsx dagi bitta `import 'katex/.../katex.min.css'` qatori
  // butun 537 KB katex JS ini birinchi yuklamaga tortib keldi, gsap esa
  // framer-motion bilan birikib faqat HomePage'ga kerak bo'lsa ham hammaga
  // yuklanadigan bo'lib qoldi.
  //
  // Rollup dinamik import'larni o'zi hisobga oladi — aralashmaganimiz ma'qul.
  return undefined
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Endi bitta ulkan fayl bo'lmagani uchun ogohlantirish chegarasini pasaytiramiz —
    // biror chunk shundan oshsa, demak yana nimadir noto'g'ri birikkan
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: { manualChunks: splitVendors },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
