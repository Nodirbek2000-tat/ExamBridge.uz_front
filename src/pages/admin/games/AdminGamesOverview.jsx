/*
 * Admin → Games → Overview
 *
 * Every game the platform knows (hidden ones too), in hub order:
 *   - status (Live / Tez orada / Yashirin) and order — the hub follows at once
 *   - opens / players / plays for the chosen range, with a small daily chart
 *   - "Ovozlarni tayyorlash": synthesize every voice line of the games ahead of
 *     the learners, with live progress
 *
 *   GET   /api/games/stats/admin/overview/?days=1|7|30|90
 *   PATCH /api/games/stats/admin/games/<slug>/      {status?, order?}
 *   POST  /api/games/stats/admin/warm-voices/       {lines: [{text, voice}]}
 *   GET   /api/games/stats/admin/warm-voices/status/
 */
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import {
  AlertCircle, AudioLines, ChevronDown, ChevronUp, ExternalLink, Gamepad2, Loader2, MousePointerClick, Play, Users,
} from 'lucide-react'
import api from '../../../api/client'

const RANGES = [
  { days: 1, label: 'Bugun' },
  { days: 7, label: '7 kun' },
  { days: 30, label: '30 kun' },
  { days: 90, label: '90 kun' },
]

const STATUS = {
  live: { label: 'Live', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  soon: { label: 'Tez orada', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  hidden: { label: 'Yashirin', cls: 'border-gray-200 bg-gray-50 text-gray-500' },
}

// the same accent each game wears on the hub
const ACCENT = {
  'tobys-day': '#F5B14C',
  'voice-drive': '#FF5C5C',
  speaking: '#34D3A0',
  'word-battle': '#5CC2FF',
  runner: '#A98BFF',
}

// games whose content module lists every line it can say (allVoiceLines)
const VOICE_SOURCES = [
  { slug: 'tobys-day', title: 'Toby’s Day', load: () => import('../../games/tobys-day/content.js') },
  { slug: 'voice-drive', title: 'Voice Drive', load: () => import('../../games/voice-drive/content.js') },
]

const OVERVIEW_KEY = 'admin-games-overview'
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ru-RU') : '—')
const dayLabel = (iso) => {
  const [, m, d] = iso.split('-').map(Number)
  return `${d}-${MONTHS[m - 1]}`
}
const errText = (e, fallback) => e?.response?.data?.error || (e?.response ? `${fallback} (${e.response.status})` : fallback)

const fade = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
})

/* ── totals ───────────────────────────────────────────────────────────────── */

function StatCard({ icon, label, value, sub, tone, index }) {
  return (
    <Motion.div {...fade(index)} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium leading-none text-gray-400">{label}</p>
        <p className="text-2xl font-black leading-tight text-gray-900 tabular-nums">
          {value === undefined ? <span className="inline-block h-6 w-14 animate-pulse rounded bg-gray-100" /> : fmt(value)}
        </p>
        {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
      </div>
    </Motion.div>
  )
}

/* ── the daily chart of one game (opens per day) ─────────────────────────── */

const CW = 240
const CH = 52

function DailyBars({ series }) {
  const [hover, setHover] = useState(null)
  const n = series.length
  const max = Math.max(1, ...series.map(s => s.opens))
  const slot = CW / n
  const gap = n > 45 ? 0.6 : n > 20 ? 1.2 : 2
  const bw = Math.max(0.8, slot - gap)
  const h = hover == null ? null : series[hover]
  const at = hover == null ? 0 : (hover + 0.5) / n
  const shift = at < 0.2 ? '0%' : at > 0.8 ? '-100%' : '-50%'

  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.floor(((e.clientX - r.left) / r.width) * n)
    setHover(Math.min(n - 1, Math.max(0, i)))
  }
  // a mouse hides the tooltip on leave; a finger keeps it a moment after lifting
  const leave = (e) => {
    if (e.pointerType === 'mouse') setHover(null)
    else setTimeout(() => setHover(null), 2200)
  }

  return (
    <div className="relative w-full">
      <div className="mb-1 flex items-center justify-between text-[10.5px] leading-none text-gray-400">
        <span>Ochilgan / kun</span>
        <span className="tabular-nums">eng ko‘p {fmt(Math.max(...series.map(s => s.opens)))}</span>
      </div>
      <svg
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="none"
        className="block h-[52px] w-full cursor-crosshair touch-pan-y"
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={leave}
        role="img"
        aria-label={`Kunlik ochilishlar: ${series.map(s => `${dayLabel(s.date)} ${s.opens}`).join(', ')}`}
      >
        <line x1="0" x2={CW} y1={CH - 0.5} y2={CH - 0.5} stroke="#E5E7EB" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {series.map((s, i) => {
          const bh = s.opens ? Math.max(3, (s.opens / max) * (CH - 4)) : 1.5
          return (
            <rect
              key={s.date}
              x={i * slot + gap / 2}
              y={CH - bh}
              width={bw}
              height={bh}
              rx={Math.min(2, bw / 2)}
              fill={!s.opens ? '#E5E7EB' : hover === i ? '#0284C7' : '#38BDF8'}
            />
          )
        })}
      </svg>
      {h && (
        <div
          className="pointer-events-none absolute bottom-[58px] z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] leading-tight text-white shadow-lg"
          style={{ left: `${at * 100}%`, transform: `translateX(${shift})` }}
        >
          <p className="font-semibold">{dayLabel(h.date)}</p>
          <p className="text-white/75">
            {fmt(h.opens)} ochilgan · {fmt(h.players)} o‘yinchi · {fmt(h.plays)} o‘yin
          </p>
        </div>
      )}
    </div>
  )
}

// one day has no trend — show this game's share of today's opens instead
function ShareBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-[10.5px] leading-none text-gray-400">
        <span>Bugungi ochilishlar</span>
        <span className="tabular-nums">{max > 0 ? `${pct}%` : '—'}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-sky-400 transition-[width] duration-500" style={{ width: `${Math.max(value ? 3 : 0, pct)}%` }} />
      </div>
      <p className="mt-1.5 text-[10.5px] leading-none text-gray-400">eng ko‘p ochilgan o‘yinga nisbatan</p>
    </div>
  )
}

/* ── one game ─────────────────────────────────────────────────────────────── */

function Num({ value, today, showToday, label }) {
  return (
    <div className="min-w-0">
      <p className="text-[10.5px] font-medium leading-none text-gray-400 xl:hidden">{label}</p>
      <p className="mt-1 text-[17px] font-bold leading-tight text-gray-900 tabular-nums xl:mt-0">{fmt(value)}</p>
      {showToday && <p className="text-[11px] leading-tight text-gray-400 tabular-nums">bugun {fmt(today)}</p>}
    </div>
  )
}

function GameRow({ game, index, count, days, maxOpens, busy, onStatus, onMove }) {
  const accent = ACCENT[game.slug] || '#94A3B8'
  const st = STATUS[game.status] || STATUS.hidden
  const showToday = days > 1
  return (
    <Motion.div
      layout
      transition={{ layout: { duration: 0.25, ease: 'easeOut' } }}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-4 px-4 py-4 sm:px-5 xl:grid-cols-[auto_minmax(0,1.3fr)_140px_88px_88px_88px_minmax(180px,1.6fr)] xl:gap-x-5"
    >
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => onMove(index, -1)}
          disabled={index === 0 || busy}
          aria-label={`${game.title} — yuqoriga`}
          className="flex h-7 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 1)}
          disabled={index === count - 1 || busy}
          aria-label={`${game.title} — pastga`}
          className="flex h-7 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <span className="h-9 w-1.5 flex-shrink-0 rounded-full" style={{ background: accent }} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-gray-900">{game.title}</p>
          <p className="truncate font-mono text-[11.5px] text-gray-400">{game.slug}</p>
        </div>
      </div>

      <div className="relative w-[128px] xl:w-full">
        <select
          value={game.status}
          onChange={(e) => onStatus(game, e.target.value)}
          disabled={busy}
          aria-label={`${game.title} — holati`}
          className={`h-9 w-full cursor-pointer appearance-none rounded-lg border pl-3 pr-8 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60 ${st.cls}`}
        >
          {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
      </div>

      <div className="col-span-3 grid grid-cols-3 gap-3 border-t border-gray-50 pt-3 xl:contents">
        <Num label="Ochilgan" value={game.opens} today={game.today?.opens} showToday={showToday} />
        <Num label="O‘yinchilar" value={game.players} today={game.today?.players} showToday={showToday} />
        <Num label="O‘yinlar" value={game.plays} today={game.today?.plays} showToday={showToday} />
      </div>

      <div className="col-span-3 xl:col-span-1">
        {!game.opens ? (
          <p className="flex h-[52px] items-center justify-center rounded-xl bg-gray-50/80 text-[11.5px] text-gray-400 xl:h-[64px]">
            Bu davrda hali ochilmagan
          </p>
        ) : days === 1 ? (
          <ShareBar value={game.opens} max={maxOpens} />
        ) : (
          <DailyBars series={game.series} />
        )}
      </div>
    </Motion.div>
  )
}

function SkeletonRows() {
  return [0, 1, 2, 3, 4].map(i => (
    <div key={i} className="flex items-center gap-4 px-5 py-5">
      <div className="h-9 w-8 animate-pulse rounded-md bg-gray-50" />
      <div className="h-9 w-1.5 rounded-full bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-20 animate-pulse rounded bg-gray-50" />
      </div>
      <div className="hidden h-10 w-56 animate-pulse rounded-lg bg-gray-50 sm:block" />
    </div>
  ))
}

/* ── warm voices ──────────────────────────────────────────────────────────── */

const WARM_STATE = {
  queued: { label: 'Navbatda', cls: 'bg-sky-50 text-sky-700' },
  running: { label: 'Tayyorlanmoqda', cls: 'bg-sky-50 text-sky-700' },
  done: { label: 'Tayyor', cls: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'To‘xtadi', cls: 'bg-red-50 text-red-700' },
}

async function collectVoiceLines() {
  const loaded = await Promise.allSettled(VOICE_SOURCES.map(s => s.load()))
  const lines = []
  const report = VOICE_SOURCES.map((s, i) => {
    const mod = loaded[i].status === 'fulfilled' ? loaded[i].value : null
    let got = null
    try {
      got = typeof mod?.allVoiceLines === 'function' ? mod.allVoiceLines() : null
    } catch {
      got = null
    }
    const ok = Array.isArray(got) ? got.filter(l => (typeof l === 'string' ? l : l?.text)) : null
    if (ok) lines.push(...ok)
    return { slug: s.slug, title: s.title, count: ok ? ok.length : null }
  })
  return { lines, report }
}

function WarmVoices() {
  const qc = useQueryClient()
  const [phase, setPhase] = useState('')        // '' | 'collecting' | 'posting'
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)

  const { data: st } = useQuery({
    queryKey: ['admin-games-warm'],
    queryFn: () => api.get('/games/stats/admin/warm-voices/status/').then(r => r.data),
    refetchInterval: (q) => (['queued', 'running'].includes(q.state.data?.state) ? 1500 : false),
    staleTime: 0,
  })

  const running = ['queued', 'running'].includes(st?.state)
  const working = running || Boolean(phase)
  const total = st?.total || 0
  const pct = total ? Math.min(100, Math.round(((st?.done || 0) / total) * 100)) : 0
  const stateUi = WARM_STATE[st?.state]

  const start = async () => {
    setError('')
    setPhase('collecting')
    try {
      const { lines, report: rep } = await collectVoiceLines()
      setReport(rep)
      if (!lines.length) {
        setError('O‘yinlarda ovozli qatorlar topilmadi.')
        return
      }
      setPhase('posting')
      const { data } = await api.post('/games/stats/admin/warm-voices/', { lines })
      qc.setQueryData(['admin-games-warm'], data)
    } catch (e) {
      if (e?.response?.status === 409) {
        setError('Tayyorlash allaqachon ketmoqda — natijasi pastda.')
        qc.invalidateQueries({ queryKey: ['admin-games-warm'] })
      } else {
        setError(errText(e, 'Boshlab bo‘lmadi'))
      }
    } finally {
      setPhase('')
    }
  }

  return (
    <Motion.section {...fade(4)} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <AudioLines size={20} />
        </div>
        <div className="min-w-0 flex-1 basis-60">
          <h3 className="text-sm font-bold text-gray-900">Ovozlarni tayyorlash</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
            O‘yinlardagi barcha qahramon qatorlari oldindan bir marta yoziladi — o‘quvchi kutmaydi, limit sarflanmaydi.
            Tayyor bo‘lganlari o‘tkazib yuboriladi.
          </p>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={working}
          className="inline-flex h-10 flex-shrink-0 items-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-bold text-white shadow-sm shadow-sky-200 transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:shadow-none"
        >
          {working ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} fill="currentColor" />}
          {phase === 'collecting' ? 'Qatorlar yig‘ilmoqda…' : phase === 'posting' ? 'Yuborilmoqda…' : running ? 'Tayyorlanmoqda…' : 'Tayyorlash'}
        </button>
      </div>

      {(error || report || (st && st.state !== 'idle')) && (
        <div className="space-y-3 border-t border-gray-50 px-5 py-4">
          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </p>
          )}

          {report && (
            <div className="flex flex-wrap gap-2">
              {report.map(r => (
                <span
                  key={r.slug}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    r.count == null ? 'border-gray-200 bg-gray-50 text-gray-400' : 'border-gray-100 bg-white text-gray-600'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: ACCENT[r.slug] }} />
                  {r.title}: {r.count == null ? 'ro‘yxat hali yo‘q' : `${fmt(r.count)} ta qator`}
                </span>
              ))}
            </div>
          )}

          {st && st.state !== 'idle' && (
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {stateUi && <span className={`rounded-md px-2 py-0.5 font-bold ${stateUi.cls}`}>{stateUi.label}</span>}
                <span className="font-semibold text-gray-700 tabular-nums">
                  {fmt(st.done)} / {fmt(total)} <span className="font-normal text-gray-400">({pct}%)</span>
                </span>
                <span className="text-gray-400 tabular-nums">
                  tayyor edi {fmt(st.cached)} · yangi {fmt(st.made)}
                  {st.failed ? <span className="text-red-500"> · xato {fmt(st.failed)}</span> : null}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${st.state === 'failed' ? 'bg-red-400' : st.state === 'done' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {st.state === 'failed' && st.error && <p className="mt-2 text-xs text-red-600">{st.error}</p>}
            </div>
          )}
        </div>
      )}
    </Motion.section>
  )
}

/* ── page ─────────────────────────────────────────────────────────────────── */

export default function AdminGamesOverview() {
  const qc = useQueryClient()
  const [days, setDays] = useState(7)
  const [flash, setFlash] = useState('')

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: [OVERVIEW_KEY, days],
    queryFn: () => api.get(`/games/stats/admin/overview/?days=${days}`).then(r => r.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
  const games = data?.games || []
  const shown = data && data.days === days

  // change every cached range at once, so switching tabs never shows the old order or status
  const patchCached = (fn) => qc.setQueriesData({ queryKey: [OVERVIEW_KEY] }, (old) => (old ? { ...old, games: fn(old.games) } : old))
  const settle = () => {
    qc.invalidateQueries({ queryKey: [OVERVIEW_KEY] })
    qc.invalidateQueries({ queryKey: ['games-hub-list'] })
  }
  const fail = (e) => {
    setFlash(errText(e, 'Saqlanmadi'))
    setTimeout(() => setFlash(''), 4000)
  }

  const statusMut = useMutation({
    mutationFn: ({ slug, status }) => api.patch(`/games/stats/admin/games/${slug}/`, { status }),
    onMutate: ({ slug, status }) => patchCached(list => list.map(g => (g.slug === slug ? { ...g, status } : g))),
    onError: fail,
    onSettled: settle,
  })

  const orderMut = useMutation({
    // renumber 10, 20, 30… and save only the games whose number changed
    mutationFn: (changes) => Promise.all(changes.map(c => api.patch(`/games/stats/admin/games/${c.slug}/`, { order: c.order }))),
    onError: fail,
    onSettled: settle,
  })

  const move = (index, dir) => {
    const to = index + dir
    if (to < 0 || to >= games.length) return
    const next = [...games]
    ;[next[index], next[to]] = [next[to], next[index]]
    const renumbered = next.map((g, i) => ({ ...g, order: (i + 1) * 10 }))
    const changes = renumbered.filter(g => games.find(o => o.slug === g.slug)?.order !== g.order)
    const bySlug = Object.fromEntries(renumbered.map(g => [g.slug, g.order]))
    patchCached(list => [...list].map(g => ({ ...g, order: bySlug[g.slug] ?? g.order })).sort((a, b) => a.order - b.order))
    orderMut.mutate(changes.map(g => ({ slug: g.slug, order: g.order })))
  }

  const busy = statusMut.isPending || orderMut.isPending
  const maxOpens = Math.max(0, ...games.map(g => g.opens))
  const sumToday = (k) => games.reduce((a, g) => a + (g.today?.[k] || 0), 0)
  const t = shown ? data.totals : undefined
  const rangeLabel = RANGES.find(r => r.days === days)?.label.toLowerCase()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Gamepad2 size={20} className="flex-shrink-0 text-sky-500" />
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-gray-900">O‘yinlar</h2>
            <p className="text-xs text-gray-400">Hubdagi tartib, holat va kim qancha o‘ynayotgani</p>
          </div>
        </div>
        <a
          href="/games"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-gray-500 transition-colors hover:bg-sky-50 hover:text-sky-600"
        >
          Hubni ochish <ExternalLink size={13} />
        </a>
        <div className="flex rounded-xl border border-gray-100 bg-gray-50 p-1" role="tablist" aria-label="Davr">
          {RANGES.map(r => (
            <button
              key={r.days}
              type="button"
              role="tab"
              aria-selected={days === r.days}
              onClick={() => setDays(r.days)}
              className={`h-8 rounded-lg px-3 text-xs font-bold transition-all sm:px-3.5 ${
                days === r.days ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} /> Ma’lumot yuklanmadi: {errText(error, error.message)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            index={0} icon={<MousePointerClick size={20} />} label="Ochilgan" value={t?.opens} tone="bg-sky-50 text-sky-600"
            sub={shown && days > 1 ? `${rangeLabel} · bugun ${fmt(sumToday('opens'))}` : 'bugun'}
          />
          <StatCard
            index={1} icon={<Users size={20} />} label="O‘yinchilar" value={t?.players} tone="bg-violet-50 text-violet-600"
            sub={`noyob o‘quvchilar · ${days > 1 ? rangeLabel : 'bugun'}`}
          />
          <StatCard
            index={2} icon={<Play size={20} />} label="O‘yinlar" value={t?.plays} tone="bg-emerald-50 text-emerald-600"
            sub={shown && days > 1 ? `tugatilgan raundlar · bugun ${fmt(sumToday('plays'))}` : 'tugatilgan raundlar · bugun'}
          />
        </div>
      )}

      <Motion.section {...fade(3)} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Har bir o‘yin</h3>
            <p className="mt-0.5 text-xs text-gray-400">Tartib va holat o‘zgarishi hubda darhol ko‘rinadi</p>
          </div>
          {(isFetching || busy) && <Loader2 size={16} className="flex-shrink-0 animate-spin text-sky-500" />}
        </div>

        {flash && (
          <p className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-2.5 text-sm text-red-700">
            <AlertCircle size={15} /> {flash}
          </p>
        )}

        <div className="hidden grid-cols-[auto_minmax(0,1.3fr)_140px_88px_88px_88px_minmax(180px,1.6fr)] gap-x-5 border-b border-gray-50 bg-gray-50/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 xl:grid">
          <span className="w-8">#</span>
          <span>O‘yin</span>
          <span>Holat</span>
          <span>Ochilgan</span>
          <span>O‘yinchilar</span>
          <span>O‘yinlar</span>
          <span>{days === 1 ? 'Ulush' : 'Kunlar bo‘yicha'}</span>
        </div>

        <div className={`divide-y divide-gray-50 transition-opacity ${data && !shown ? 'opacity-60' : ''}`}>
          {isLoading ? (
            <SkeletonRows />
          ) : !games.length ? (
            <p className="py-12 text-center text-sm text-gray-400">O‘yinlar yo‘q</p>
          ) : (
            games.map((g, i) => (
              <GameRow
                key={g.slug}
                game={g}
                index={i}
                count={games.length}
                days={data.days}
                maxOpens={maxOpens}
                busy={busy}
                onStatus={(game, status) => status !== game.status && statusMut.mutate({ slug: game.slug, status })}
                onMove={move}
              />
            ))
          )}
        </div>

        <p className="border-t border-gray-50 px-5 py-3 text-[11.5px] leading-relaxed text-gray-400">
          <b className="font-semibold text-gray-500">Ochilgan</b> — o‘yin sahifasi ochilgani (bir daqiqadagi takror sanalmaydi).{' '}
          <b className="font-semibold text-gray-500">O‘yinchilar</b> — shu davrda o‘yinni ochgan yoki o‘ynagan noyob o‘quvchilar.{' '}
          <b className="font-semibold text-gray-500">O‘yinlar</b> — oxirigacha o‘ynalgan raund / urinishlar.
        </p>
      </Motion.section>

      <WarmVoices />
    </div>
  )
}
