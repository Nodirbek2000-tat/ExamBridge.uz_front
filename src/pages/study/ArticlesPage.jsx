import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, Loader2, Newspaper, ChevronLeft, Lock, FileText } from 'lucide-react'
import api from '../../api/client'

const LEVEL_COLORS = {
  A2: 'bg-teal-50 text-teal-600',
  B1: 'bg-sky-50 text-sky-600',
  B2: 'bg-violet-50 text-violet-600',
  C1: 'bg-rose-50 text-rose-600',
}

/* ── Card ─────────────────────────────────────────────────────────────── */
function ArticleCard({ article, index, onOpen }) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(article)}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-lg"
    >
      {/* Cover */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        {article.cover_url ? (
          <img
            src={article.cover_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <Newspaper size={34} className="text-slate-300" />
          </div>
        )}

        {article.level && (
          <span className={`absolute left-3 top-3 rounded-lg px-2 py-1 text-[10px] font-black ${LEVEL_COLORS[article.level] || 'bg-white/90 text-slate-600'}`}>
            {article.level}
          </span>
        )}
        {article.is_premium && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-black text-white">
            <Lock size={9} /> PRO
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[17px] font-bold leading-snug text-slate-900 line-clamp-2">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2.5 flex-1 text-[13.5px] leading-relaxed text-slate-500 line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {/* Footer: topic left, views right */}
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
          <span className="text-[11px] font-semibold text-slate-400">
            {article.topic || 'Article'}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400">
            <Eye size={14} />
            {article.views_count}
          </span>
        </div>
      </div>
    </motion.button>
  )
}

/* ── PDF reader ───────────────────────────────────────────────────────── */
// Deliberately chrome-free: no zoom or download buttons of our own. The
// browser's built-in PDF viewer already handles zoom (Ctrl + wheel), paging
// and printing — duplicating it would just steal reading space.
function PdfReader({ article, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex flex-col bg-slate-100"
    >
      {/* Slim bar — just a way back and the title */}
      <div className="flex h-16 flex-shrink-0 items-center gap-3 bg-white px-4 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronLeft size={24} />
        </button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-bold text-slate-900">{article.title}</p>
      </div>

      {/* PDF surface — fills everything that is left.
          #toolbar=0&navpanes=0 hides the browser's own PDF chrome so only the
          page itself shows; zoom still works with Ctrl + wheel. */}
      <div className="min-h-0 flex-1 px-2 pb-2 sm:px-3 sm:pb-3">
        {article.pdf_url ? (
          <object
            data={`${article.pdf_url}#toolbar=0&navpanes=0&statusbar=0&view=FitH`}
            type="application/pdf"
            className="h-full w-full rounded-lg bg-white"
          >
            {/* Fallback when the browser has no built-in PDF viewer */}
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText size={38} className="text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">
                Brauzeringiz PDF'ni bu yerda ko'rsata olmadi
              </p>
              <a
                href={article.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white"
              >
                Yangi oynada ochish
              </a>
            </div>
          </object>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <Newspaper size={40} />
            <p className="text-sm font-semibold">Bu maqolaga hali PDF yuklanmagan</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function ArticlesPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { articleId } = useParams()
  const [open, setOpen] = useState(null)
  const [opening, setOpening] = useState(null)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['study-articles'],
    queryFn: () => api.get('/study/articles/').then((r) => r.data),
  })

  // The URL is the source of truth: /study/articles/:id opens that article.
  // Fetching the detail is also what counts the read (+1).
  useEffect(() => {
    if (!articleId) { setOpen(null); return }
    if (open?.id === Number(articleId)) return

    let cancelled = false
    setOpening(Number(articleId))
    api.get(`/study/articles/${articleId}/`)
      .then(({ data }) => {
        if (cancelled) return
        setOpen(data)
        queryClient.invalidateQueries({ queryKey: ['study-articles'] })
      })
      .catch((err) => {
        if (cancelled) return
        if (err?.response?.status === 403) alert('Bu maqola Premium foydalanuvchilar uchun.')
        navigate('/study/articles', { replace: true })
      })
      .finally(() => { if (!cancelled) setOpening(null) })

    return () => { cancelled = true }
  }, [articleId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openArticle = (article) => navigate(`/study/articles/${article.id}`)
  const closeArticle = () => navigate('/study/articles')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Articles</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Maqolani tanlang — PDF ochiladi, o‘lchamini o‘zgartirib o‘qishingiz mumkin.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-slate-300" />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <Newspaper size={38} className="mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-600">Hozircha maqola yo‘q</p>
          <p className="mt-1 text-sm text-slate-400">Admin panel → Study Tools → Articles orqali qo‘shing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <div key={a.id} className="relative">
              <ArticleCard article={a} index={i} onOpen={openArticle} />
              {opening === a.id && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
                  <Loader2 size={24} className="animate-spin text-violet-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && <PdfReader article={open} onClose={closeArticle} />}
      </AnimatePresence>
    </div>
  )
}
