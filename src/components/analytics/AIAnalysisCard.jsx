/*
 * AI analysis card shared by the SAT / IELTS / CEFR analytics pages.
 *
 * The answer is streamed (SSE) from /api/analytics/ai/ and revealed with a
 * typewriter so it reads like a chat reply. The model only sees the numbers on
 * the page, and its plan links point inside the site; any other link is shown
 * as plain text. Render it with key={range} so a new range starts clean.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react'
import api from '../../api/client'

const T = {
  uz: {
    title: 'AI tahlil', sub: "Natijalaringiz va xatolaringiz bo'yicha shaxsiy xulosa",
    run: 'Tahlil qilish', again: 'Yangilash', busy: 'Yozmoqda…',
    idle: "Tugmani bosing — AI pastdagi aniq raqamlaringiz va xatolaringizni ko'rib chiqib, kuchli va zaif tomonlaringizni hamda havolali 7 kunlik rejani yozib beradi.",
    few: (n, have) => `Aniq tahlil uchun kamida ${n} ta savol yoki javob kerak — hozir ${have} ta.`,
    foot: "AI faqat shu sahifadagi raqamlardan foydalanadi. Raqamlar o'zgarmaguncha tahlil saqlanib turadi.",
    fail: "AI tahlilni olib bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
  },
  en: {
    title: 'AI analysis', sub: 'A personal read of your results and mistakes',
    run: 'Analyse', again: 'Refresh', busy: 'Writing…',
    idle: 'Press the button — the AI reads the exact numbers and mistakes below and writes your strengths, weak spots and a 7-day plan with links.',
    few: (n, have) => `Answer at least ${n} questions for a reliable analysis — ${have} so far.`,
    foot: 'The AI uses only the numbers on this page. The analysis is kept until your numbers change.',
    fail: 'Could not get the AI analysis. Please try again in a moment.',
  },
}
const MIN = 10

// Read the SSE stream; a 401 is retried once after an axios call refreshes the token
async function streamAnalysis(body, signal, onEvent) {
  const send = () => fetch('/api/analytics/ai/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token') || ''}` },
    body: JSON.stringify(body),
    signal,
  })
  let res = await send()
  if (res.status === 401) { await api.get('/auth/me/').catch(() => {}); res = await send() }
  if (!(res.headers.get('content-type') || '').includes('text/event-stream')) {
    const json = await res.json().catch(() => ({}))
    onEvent(json.insufficient ? { type: 'insufficient', ...json } : { type: 'error', message: json.error })
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const chunk = buf.slice(0, i)
      buf = buf.slice(i + 2)
      if (chunk.startsWith('data: ')) {
        try { onEvent(JSON.parse(chunk.slice(6))) } catch { /* ignore a broken frame */ }
      }
    }
  }
}

const md = {
  h2: ({ children }) => <h3 className="mb-2 mt-5 text-base font-bold text-gray-900 first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1 mt-4 font-bold text-gray-900">{children}</h4>,
  p: ({ children }) => <p className="mb-2 leading-relaxed text-gray-700">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 space-y-1.5 pl-5 text-gray-700 [list-style:disc]">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 space-y-2 pl-5 text-gray-700 [list-style:decimal] marker:font-bold marker:text-blue-600">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
  // only links inside the app become links
  a: ({ href, children }) => (href && href.startsWith('/app/')
    ? <Link to={href} className="font-semibold text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-800">{children}</Link>
    : <span className="font-semibold">{children}</span>),
}

export default function AIAnalysisCard({ exam, range, volume }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('ai_lang') || 'uz' } catch { return 'uz' } })
  const t = T[lang]
  const [target, setTarget] = useState(null)     // full text received so far
  const [shown, setShown] = useState(0)          // characters revealed
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [insufficient, setInsufficient] = useState(null)
  const abortRef = useRef(null)

  // An earlier analysis of exactly these numbers is shown at once (it is cached — no new AI call)
  const prior = useQuery({
    queryKey: ['analytics-ai-prior', exam, range, lang],
    queryFn: () => api.post('/analytics/ai/', { exam, range, lang, cached_only: true }).then(r => r.data),
    enabled: volume >= MIN,
    staleTime: 5 * 60 * 1000,
  })
  const text = target ?? prior.data?.text ?? null
  const typing = target != null && shown < target.length

  // (a new range remounts the card through its key; a new language resets in pickLang)
  useEffect(() => () => abortRef.current?.abort(), [])

  // Typewriter: reveal at a steady pace, faster when far behind
  useEffect(() => {
    if (target == null || shown >= target.length) return
    const id = requestAnimationFrame(() => {
      const behind = target.length - shown
      setShown(s => Math.min(target.length, s + Math.max(2, Math.min(24, Math.ceil(behind / 40)))))
    })
    return () => cancelAnimationFrame(id)
  }, [target, shown])

  const run = async () => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setBusy(true); setError(null); setInsufficient(null); setTarget(''); setShown(0)
    try {
      await streamAnalysis({ exam, range, lang, refresh: !!text }, ctrl.signal, (ev) => {
        if (ev.type === 'delta') setTarget(prev => (prev || '') + ev.text)
        else if (ev.type === 'error') { setError(ev.message || t.fail); setTarget(null) }
        else if (ev.type === 'insufficient') { setInsufficient(ev); setTarget(null) }
      })
    } catch (e) {
      if (e.name !== 'AbortError') { setError(t.fail); setTarget(null) }
    } finally {
      if (abortRef.current === ctrl) setBusy(false)
    }
  }
  const pickLang = (l) => {
    abortRef.current?.abort()
    setTarget(null); setShown(0); setBusy(false); setError(null); setInsufficient(null)
    setLang(l)
    try { localStorage.setItem('ai_lang', l) } catch { /* */ }
  }

  const tooFew = insufficient || volume < MIN
  const visible = target != null ? target.slice(0, shown) : text

  return (
    <section className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-white p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-200">
            <Sparkles size={18} className={busy ? 'animate-pulse' : ''} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
            <p className="text-sm text-gray-500">{t.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white/80 p-0.5 text-xs font-bold backdrop-blur">
            {['uz', 'en'].map(l => (
              <button key={l} type="button" onClick={() => pickLang(l)} disabled={busy}
                className={`rounded-lg px-2.5 py-1 uppercase transition ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-slate-50'}`}>{l}</button>
            ))}
          </div>
          {!tooFew && (
            <button type="button" disabled={busy || typing} onClick={run}
              className="btn-glass inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-70">
              {busy || typing ? <Loader2 size={15} className="animate-spin" /> : text ? <RefreshCw size={15} /> : <Sparkles size={15} />}
              {busy || typing ? t.busy : text ? t.again : t.run}
            </button>
          )}
        </div>
      </div>

      <div className="relative mt-4">
        {tooFew ? (
          <p className="rounded-2xl bg-white/70 px-4 py-3 text-sm text-gray-600">{t.few(insufficient?.needed ?? MIN, insufficient?.have ?? volume)}</p>
        ) : error ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : busy && !visible ? (
          <div className="space-y-2.5 py-1" aria-live="polite">
            {[92, 78, 85, 60].map((w, i) => <div key={i} className="h-3 animate-pulse rounded-full bg-blue-100/70" style={{ width: `${w}%` }} />)}
          </div>
        ) : visible ? (
          <div className="text-[15px]" aria-live="polite">
            <ReactMarkdown components={md}>{visible}</ReactMarkdown>
            {(busy || typing) && <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-blue-600 align-baseline" />}
            {!busy && !typing && <p className="mt-3 text-xs text-gray-400">{t.foot}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-600">{t.idle}</p>
        )}
      </div>
    </section>
  )
}
