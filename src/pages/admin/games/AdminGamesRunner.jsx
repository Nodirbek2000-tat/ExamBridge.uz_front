/*
 * Admin → Games → Runner (TOBY RUN, RUNNER_PLAN §B8.6)
 *
 *   - stats cards: runs, players, lines per run (target ≥ 15), first-try rate, average length,
 *     today's Whisper clips and cost, day-1 / day-7 return
 *   - a daily chart (7 / 30 days): runs per day, players on hover
 *   - first-try rate by kind and by level, browser / server / Listen / Card shares, median recognition
 *     time (browser vs server — tunes the windows), why runs were not ranked
 *   - the config form: sliders and switches → PATCH {config} (validated on the server; "Standart" sends
 *     null = back to the default)
 *   - the hardest 20 items (≥ 20 attempts, lowest ok share) with what Toby heard, ▶ the model voice and
 *     a link to edit the item in Games → So'zlar
 *
 *   GET   /api/games/runner/admin/stats/?days=1|7|30[&fresh=1]
 *   GET   /api/games/stats/admin/games/runner/          → {status, config, defaults, effective}
 *   PATCH /api/games/stats/admin/games/runner/          {config: {...}}
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import { AlertCircle, AudioLines, Check, Clock, ExternalLink, Gauge, Loader2, Mic, Play, RefreshCw, RotateCcw, Users, Volume2 } from 'lucide-react'
import api from '../../../api/client'
import { sayLine, stopVoice } from '../../../games/voice/voiceTts'
import { ItemIcon } from '../../games/tobys-day/items'

const ACCENT = '#A98BFF'
const RANGES = [{ days: 1, label: 'Bugun' }, { days: 7, label: '7 kun' }, { days: 30, label: '30 kun' }]
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const LEVEL_COLOR = { A1: '#D94A5A', A2: '#2E5AAC', B1: '#3BAA6B', B2: '#F5B14C', C1: '#A98BFF' }
const KIND_TITLE = { word: 'So‘z (shar)', echo: 'Takrorlash', answer: 'Javob', fill: 'Bo‘sh joy', twister: 'Tez aytish' }
const REASON_TITLE = {
  'too-fast': 'Juda tez javoblar', 'score-mismatch': 'Ball mos emas', distance: 'Masofa imkonsiz', spoken: 'Gaplar soni imkonsiz',
  listen: 'Tinglash rejimi', card: 'Karta rejimi', 'leaderboard-off': 'Reyting o‘chirilgan',
}
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ru-RU') : '—')
const pct = (r) => (r == null ? '—' : `${Math.round(r * 100)}%`)
const dayLabel = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d}-${MONTHS[m - 1]}` }
const errText = (e, fallback) => e?.response?.data?.error || (e?.response ? `${fallback} (${e.response.status})` : fallback)

const SLIDERS = [
  { key: 'speed_scale', label: 'Tezlik', min: 0.8, max: 1.2, step: 0.05, unit: '×', note: 'Barcha darajalarda yugurish tezligi' },
  { key: 'window_scale', label: 'Gapirish vaqti', min: 0.8, max: 1.5, step: 0.05, unit: '×', note: 'Mikrofon oynasi uzunligi' },
  { key: 'balloon_gap_scale', label: 'Sharlar oralig‘i', min: 0.7, max: 1.5, step: 0.05, unit: '×', note: 'Kichik — sharlar tez-tez' },
  { key: 'clips_per_run', label: 'Whisper klip / o‘yin', min: 0, max: 60, step: 1, unit: '', note: 'iPhone (server) rejimi uchun chegara' },
]
const SWITCHES = [
  { key: 'server_stt', label: 'Whisper (server) tanish', note: 'O‘chiq bo‘lsa, ovoz tanimaydigan qurilmalar Tinglash rejimida o‘ynaydi' },
  { key: 'twister', label: 'Tez aytishlar (B1+)', note: 'Oltin tanga — varrak' },
  { key: 'revive_voice', label: 'Ovoz bilan tirilish', note: 'Urilganda so‘zni aytib davom etish' },
  { key: 'leaderboard', label: 'Reyting', note: 'O‘chiq bo‘lsa, yangi o‘yinlar reytingga kirmaydi' },
]

const fade = (i = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.04, duration: 0.28 } })

function StatCard({ icon, label, value, sub, tone, index, warn }) {
  return (
    <Motion.div {...fade(index)} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="mb-1 text-xs font-medium leading-none text-gray-400">{label}</p>
        <p className={`text-2xl font-black leading-tight tabular-nums ${warn ? 'text-amber-600' : 'text-gray-900'}`}>
          {value === undefined ? <span className="inline-block h-6 w-14 animate-pulse rounded bg-gray-100" /> : value}
        </p>
        {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
      </div>
    </Motion.div>
  )
}

function Panel({ title, children, right, className = '' }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  )
}

/* runs per day; hover (or a tap) shows the day */
function DailyChart({ series }) {
  const [hover, setHover] = useState(null)
  const n = series.length
  const max = Math.max(1, ...series.map(s => s.runs))
  const W = 640
  const H = 120
  const slot = W / n
  const bw = Math.max(3, slot - (n > 20 ? 3 : 8))
  const h = hover == null ? null : series[hover]
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="block h-auto w-full" role="img" aria-label="Kunlik o‘yinlar"
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n)))) }}
        onPointerLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75, 1].map(k => <line key={k} x1="0" x2={W} y1={H - H * k} y2={H - H * k} stroke="#F1F1F4" />)}
        {series.map((s, i) => {
          const bh = Math.max(s.runs ? 3 : 1, (s.runs / max) * (H - 8))
          return (
            <g key={s.date}>
              <rect x={i * slot + (slot - bw) / 2} y={H - bh} width={bw} height={bh} rx={Math.min(6, bw / 2)}
                fill={hover === i ? '#7C5BEF' : ACCENT} opacity={s.runs ? 1 : 0.25} />
              {(n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) && (
                <text x={i * slot + slot / 2} y={H + 15} textAnchor="middle" fontSize="8" fill="#9CA3AF">{dayLabel(s.date)}</text>
              )}
            </g>
          )
        })}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-xl border border-gray-100 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `${((hover + 0.5) / n) * 100}%`, transform: `translateX(${hover / n < 0.2 ? '0%' : hover / n > 0.8 ? '-100%' : '-50%'})` }}>
          <p className="font-bold text-gray-800">{dayLabel(h.date)}</p>
          <p className="text-gray-500">{fmt(h.runs)} o‘yin · {fmt(h.players)} o‘yinchi · {fmt(h.lines)} gap</p>
        </div>
      )}
    </div>
  )
}

function RateBars({ rows }) {
  if (!rows.length) return <p className="text-sm text-gray-400">Hali ma’lumot yo‘q</p>
  return (
    <div className="space-y-3">
      {rows.map(r => (
        <div key={r.key}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">{r.label}</span>
            <span className="tabular-nums text-gray-500"><b className="text-gray-900">{pct(r.rate)}</b> · {fmt(r.said)} ta</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${Math.round((r.rate || 0) * 100)}%`, background: r.color || ACCENT }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function ShareBar({ parts }) {
  const total = parts.reduce((s, p) => s + p.value, 0)
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-gray-100">
        {total > 0 && parts.map(p => p.value > 0 && <div key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        {parts.map(p => (
          <span key={p.key} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.label} <b className="tabular-nums text-gray-800">{total ? Math.round((p.value / total) * 100) : 0}%</b>
          </span>
        ))}
      </div>
    </div>
  )
}

function Switch({ on, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-50 ${on ? 'bg-violet-500' : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function ConfigForm({ game }) {
  const qc = useQueryClient()
  const eff = game.effective || {}
  const [draft, setDraft] = useState({})
  const [msg, setMsg] = useState('')
  const val = (k) => (k in draft ? draft[k] : eff[k])
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const dirty = Object.keys(draft).length > 0
  const save = useMutation({
    mutationFn: (config) => api.patch('/games/stats/admin/games/runner/', { config }),
    onSuccess: () => { setMsg('Saqlandi'); qc.invalidateQueries({ queryKey: ['admin-runner-game'] }); qc.invalidateQueries({ queryKey: ['admin-runner-stats'] }) },
    onError: (e) => setMsg(errText(e, 'Saqlanmadi')),
  })
  useEffect(() => { if (!msg) return undefined; const id = setTimeout(() => setMsg(''), 3000); return () => clearTimeout(id) }, [msg])
  const station = val('station_every_m')
  const levels = val('levels') || LEVELS
  const overridden = (k) => game.config && k in game.config
  return (
    <Panel title="Sozlamalar" right={msg && <span className={`text-xs font-semibold ${msg === 'Saqlandi' ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</span>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {SLIDERS.map(s => (
            <label key={s.key} className="block">
              <span className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">{s.label}{overridden(s.key) && <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-600">o‘zgartirilgan</span>}</span>
                <span className="font-black tabular-nums text-gray-900">{s.unit === '×' ? `${Number(val(s.key)).toFixed(2)}×` : val(s.key)}</span>
              </span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={val(s.key)} onChange={(e) => set(s.key, Number(e.target.value))}
                className="mt-2 w-full accent-violet-500" />
              <span className="mt-0.5 flex justify-between text-[11px] text-gray-400"><span>{s.note}</span><span>{s.min} – {s.max}</span></span>
            </label>
          ))}
          <div>
            <span className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-700">Bekat oralig‘i</span>
              <span className="font-black tabular-nums text-gray-900">{station == null ? 'daraja bo‘yicha' : `${station} m`}</span>
            </span>
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min={400} max={1500} step={50} value={station ?? 800} disabled={station == null}
                onChange={(e) => set('station_every_m', Number(e.target.value))} className="w-full accent-violet-500 disabled:opacity-40" />
              <label className="flex flex-shrink-0 items-center gap-1.5 text-xs font-semibold text-gray-500">
                <input type="checkbox" checked={station == null} onChange={(e) => set('station_every_m', e.target.checked ? null : 800)} className="accent-violet-500" /> Standart
              </label>
            </div>
            <p className="mt-0.5 text-[11px] text-gray-400">Standart: A1 650 · A2 700 · B1 800 · B2 850 · C1 900 m</p>
          </div>
        </div>
        <div className="space-y-3">
          {SWITCHES.map(s => (
            <div key={s.key} className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                <p className="text-[11px] leading-snug text-gray-400">{s.note}</p>
              </div>
              <Switch on={!!val(s.key)} onChange={(v) => set(s.key, v)} />
            </div>
          ))}
          <div className="rounded-xl border border-gray-100 p-3">
            <p className="text-sm font-semibold text-gray-800">Ochiq darajalar</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LEVELS.map(l => {
                const on = levels.includes(l)
                return (
                  <button key={l} type="button" aria-pressed={on}
                    onClick={() => { const next = on ? levels.filter(x => x !== l) : [...levels, l]; if (next.length) set('levels', LEVELS.filter(x => next.includes(x))) }}
                    className={`h-8 rounded-lg border px-3 text-xs font-black transition ${on ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-400'}`}
                    style={on ? { background: LEVEL_COLOR[l] } : undefined}>{l}</button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
        <button type="button" disabled={!Object.keys(game.config || {}).length || save.isPending}
          onClick={() => save.mutate(Object.fromEntries(Object.keys(game.config || {}).map(k => [k, null])))}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40">
          <RotateCcw size={15} /> Hammasini standartga
        </button>
        <button type="button" disabled={!dirty} onClick={() => setDraft({})}
          className="h-10 rounded-xl px-4 text-sm font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-40">Bekor qilish</button>
        <button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate(draft)}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-40">
          {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Saqlash
        </button>
      </div>
    </Panel>
  )
}

function Hardest({ rows }) {
  const [playing, setPlaying] = useState('')
  useEffect(() => () => stopVoice(), [])
  const play = (r) => {
    const key = `${r.k}${r.id}`
    setPlaying(key)
    Promise.race([sayLine(r.text, { voice: r.voice || 'teacher' }), new Promise(res => setTimeout(res, 6000))]).then(() => setPlaying(p => (p === key ? '' : p)))
  }
  if (!rows.length) {
    return <p className="text-sm text-gray-400">Kamida 20 marta aytilgan so‘zlar hali yo‘q (ko‘rsatkichlar har kecha yangilanadi).</p>
  }
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <th className="px-5 pb-2">So‘z / ibora</th>
            <th className="pb-2">Daraja</th>
            <th className="pb-2 text-right">Urinish</th>
            <th className="pb-2 text-right">To‘g‘ri</th>
            <th className="px-4 pb-2">Toby eshitdi</th>
            <th className="pb-2 pr-5 text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={`${r.k}${r.id}`} className="border-b border-gray-50 last:border-0">
              <td className="px-5 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">{r.picture ? <ItemIcon name={r.picture} size={30} /> : <Mic size={16} className="text-gray-300" />}</span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">{r.text}</p>
                    <p className="truncate text-xs text-gray-400">{r.uz || '—'} · {KIND_TITLE[r.kind] || r.kind}</p>
                  </div>
                </div>
              </td>
              <td><span className="rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: LEVEL_COLOR[r.level] || '#9CA3AF' }}>{r.level || '—'}</span> <span className="text-xs text-gray-400">{r.topic}</span></td>
              <td className="text-right tabular-nums text-gray-600">{fmt(r.seen)}</td>
              <td className={`text-right font-bold tabular-nums ${r.rate < 0.5 ? 'text-red-600' : r.rate < 0.75 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct(r.rate)}</td>
              <td className="px-4">
                <div className="flex flex-wrap gap-1">
                  {(r.heard || []).length ? r.heard.map(h => <span key={h} className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">«{h}»</span>) : <span className="text-xs text-gray-300">—</span>}
                </div>
              </td>
              <td className="pr-5 text-right">
                <div className="inline-flex items-center gap-1">
                  <button type="button" onClick={() => play(r)} title="Tinglash" aria-label={`Tinglash: ${r.text}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600">
                    {playing === `${r.k}${r.id}` ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                  </button>
                  <Link to={`/admin-panel/games/words?kind=${r.k}&q=${encodeURIComponent(r.text)}`} title="Tahrirlash (So‘zlar)"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600"><ExternalLink size={15} /></Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminGamesRunner() {
  const [days, setDays] = useState(7)
  const qc = useQueryClient()
  const stats = useQuery({
    queryKey: ['admin-runner-stats', days],
    queryFn: () => api.get('/games/runner/admin/stats/', { params: { days } }).then(r => r.data),
    staleTime: 60 * 1000,
  })
  const game = useQuery({
    queryKey: ['admin-runner-game'],
    queryFn: () => api.get('/games/stats/admin/games/runner/').then(r => r.data),
  })
  const refresh = useMutation({
    mutationFn: () => api.get('/games/runner/admin/stats/', { params: { days, fresh: 1 } }).then(r => r.data),
    onSuccess: (d) => qc.setQueryData(['admin-runner-stats', days], d),
  })
  const s = stats.data
  const t = s?.totals || {}
  const kinds = useMemo(() => Object.entries(s?.by_kind || {}).map(([k, v]) => ({ key: k, label: KIND_TITLE[k] || k, ...v })), [s])
  const levels = useMemo(() => LEVELS.filter(l => s?.by_level?.[l]).map(l => ({ key: l, label: `${l} · ${fmt(s.by_level[l].runs)} o‘yin`, color: LEVEL_COLOR[l], ...s.by_level[l] })), [s])
  const reasons = Object.entries(s?.unranked_reasons || {}).sort((a, b) => b[1] - a[1])
  const lowLines = t.utterances_per_run != null && t.runs > 0 && t.utterances_per_run < 15

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">O‘yinlar · Runner</p>
          <h1 className="mt-1 text-2xl font-black text-gray-900">TOBY RUN</h1>
          <p className="mt-1 text-sm text-gray-500">
            Holat: <b className="text-gray-800">{game.data?.status === 'live' ? 'Live' : game.data?.status === 'hidden' ? 'Yashirin' : 'Tez orada'}</b>
            {' '}· <Link to="/admin-panel/games" className="font-semibold text-violet-600 hover:underline">Overview’da o‘zgartirish</Link>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-white p-1">
            {RANGES.map(r => (
              <button key={r.days} type="button" onClick={() => setDays(r.days)}
                className={`h-8 rounded-lg px-3 text-sm font-semibold transition ${days === r.days ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{r.label}</button>
            ))}
          </div>
          <button type="button" onClick={() => refresh.mutate()} title="Yangilash" aria-label="Yangilash"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
            <RefreshCw size={16} className={refresh.isPending ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {stats.isError && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={16} /> {errText(stats.error, 'Statistika yuklanmadi')}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={<Gauge size={20} className="text-violet-600" />} tone="bg-violet-50" label="O‘yinlar" value={s ? fmt(t.runs) : undefined}
          sub={s ? `${fmt(t.ranked)} reytingda · ${fmt(t.unranked)} reytingsiz` : ''} />
        <StatCard index={1} icon={<Users size={20} className="text-sky-600" />} tone="bg-sky-50" label="O‘yinchilar" value={s ? fmt(t.players) : undefined}
          sub={s?.retention?.cohort ? `Qaytish: ertasi ${pct(s.retention.d1)} · 7 kunda ${pct(s.retention.d7)} (${s.retention.cohort} yangi)` : 'Qaytish: ma’lumot yo‘q'} />
        <StatCard index={2} icon={<Mic size={20} className="text-emerald-600" />} tone="bg-emerald-50" label="Gap / o‘yin (maqsad ≥ 15)" warn={lowLines}
          value={s ? fmt(t.utterances_per_run) : undefined} sub={s ? `Birinchi urinishda ${pct(t.first_try_rate)} · ${fmt(t.lines_per_run)} o‘tgan gap` : ''} />
        <StatCard index={3} icon={<AudioLines size={20} className="text-amber-600" />} tone="bg-amber-50" label="Bugun Whisper" value={s ? `${fmt(s.clips_today)} klip` : undefined}
          sub={s ? `≈ $${(s.cost_today || 0).toFixed(2)} · o‘rtacha o‘yin ${fmt(t.avg_duration_s)} s` : ''} />
      </div>

      <Panel title={`Kunlik o‘yinlar · ${days === 1 ? 'bugun' : `${days} kun`}`} right={s && <span className="text-xs text-gray-400">{s.from} — {s.to}</span>}>
        {s ? <DailyChart series={s.series} /> : <div className="h-40 animate-pulse rounded-xl bg-gray-50" />}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Birinchi urinishda — turi bo‘yicha"><RateBars rows={kinds} /></Panel>
        <Panel title="Birinchi urinishda — daraja bo‘yicha"><RateBars rows={levels} /></Panel>
        <Panel title="Ovoz qanday tanildi">
          {s && (
            <div className="space-y-5">
              <ShareBar parts={[
                { key: 'b', label: 'Brauzer', value: s.share.stt.browser, color: ACCENT },
                { key: 's', label: 'Server (Whisper)', value: s.share.stt.server, color: '#F5B14C' },
              ]} />
              <ShareBar parts={[
                { key: 'v', label: 'Ovoz', value: s.share.mode.voice, color: '#34D3A0' },
                { key: 'l', label: 'Tinglash', value: s.share.mode.listen, color: '#5CC2FF' },
                { key: 'c', label: 'Karta', value: s.share.mode.card, color: '#9CA3AF' },
              ]} />
              <div className="grid grid-cols-2 gap-2">
                {['browser', 'server'].map(k => (
                  <div key={k} className="rounded-xl bg-gray-50 p-3">
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-gray-400"><Clock size={12} /> Mediana · {k === 'browser' ? 'brauzer' : 'server'}</p>
                    <p className="mt-0.5 text-lg font-black tabular-nums text-gray-900">{s.median_ms[k] != null ? `${(s.median_ms[k] / 1000).toFixed(2)} s` : '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {reasons.length > 0 && (
        <Panel title="Nega reytingga kirmadi">
          <div className="flex flex-wrap gap-2">
            {reasons.map(([k, n]) => <span key={k} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{REASON_TITLE[k] || k}: <b className="text-gray-900">{fmt(n)}</b></span>)}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">So‘nggi {fmt(s.sample)} ta o‘yin bo‘yicha.</p>
        </Panel>
      )}

      {game.data ? <ConfigForm key={JSON.stringify(game.data.config || {})} game={game.data} /> : <div className="h-64 animate-pulse rounded-2xl bg-white" />}

      <Panel title="Eng qiyin 20 ta" right={<span className="inline-flex items-center gap-1 text-xs text-gray-400"><Volume2 size={13} /> ≥ 20 urinish · eng past natija</span>}>
        {s ? <Hardest rows={s.hardest || []} /> : <div className="h-40 animate-pulse rounded-xl bg-gray-50" />}
      </Panel>
    </div>
  )
}
