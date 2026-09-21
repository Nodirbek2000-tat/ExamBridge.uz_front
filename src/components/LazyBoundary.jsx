import { Component, Suspense } from 'react'

/**
 * Sahifa kodi yuklanayotgandagi ko'rinish.
 * Ataylab juda yengil — hech qanday kutubxona ishlatmaydi, aks holda uni
 * ko'rsatish uchun ham kod yuklash kerak bo'lardi.
 */
function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-700 dark:border-slate-700 dark:border-t-sky-400" />
    </div>
  )
}

/**
 * Kod bo'lakni yuklab bo'lmaganini aniqlaydi.
 *
 * Ikki holatda uchraydi:
 *  1. Internet uzilgan
 *  2. Yangi versiya deploy qilingan — user ochib turgan eski sahifa endi
 *     serverda mavjud bo'lmagan fayl nomini so'raydi
 */
function isChunkLoadError(error) {
  const text = `${error?.name || ''} ${error?.message || ''}`
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload/i.test(text)
}

const RELOAD_MARK = 'eb:chunk-reload-at'
// Bir marta avtomatik yangilashga ruxsat; qayta-qayta yangilanib qolmasligi uchun
const RELOAD_COOLDOWN_MS = 15000

// sessionStorage maxfiy rejimda yoki cookie bloklanganda xato berishi mumkin
function readReloadMark() {
  try {
    return Number(sessionStorage.getItem(RELOAD_MARK) || 0)
  } catch {
    return 0
  }
}

function writeReloadMark() {
  try {
    sessionStorage.setItem(RELOAD_MARK, String(Date.now()))
  } catch {
    /* e'tiborsiz qoldiramiz */
  }
}

class ChunkErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    // Faqat kod yuklash xatosi bilan shug'ullanamiz
    if (!isChunkLoadError(error)) return

    if (Date.now() - readReloadMark() > RELOAD_COOLDOWN_MS) {
      // Odatda deploydan keyingi eskirgan fayl — jimgina yangilaymiz,
      // user hech narsa sezmaydi
      writeReloadMark()
      window.location.reload()
    }
    // Yangilash yordam bermadi (internet yo'q) — render() tugmani ko'rsatadi
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    // Kod yuklashga aloqasi yo'q xatolar bu qatlamga tegishli emas —
    // ilova avvalgidek o'zini tutsin deb yuqoriga uzatamiz
    if (!isChunkLoadError(error)) throw error

    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Sahifani yuklab bo'lmadi. Internet aloqangizni tekshiring.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-sky-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-sky-800"
        >
          Qayta urinish
        </button>
      </div>
    )
  }
}

/**
 * Kechiktirib yuklanadigan sahifalar uchun himoya qatlami:
 * yuklanayotganda spinner, yuklab bo'lmasa — avtomatik tiklanish.
 */
export default function LazyBoundary({ children }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  )
}
