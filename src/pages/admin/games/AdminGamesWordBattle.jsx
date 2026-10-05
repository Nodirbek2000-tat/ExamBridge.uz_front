/*
 * Admin → Games → Word Battle
 *
 *   - numbers for the chosen range: rounds, players, average score, accuracy, completion, duels
 *   - rounds per day (chart), levels, question types, opponents
 *   - the hardest words (lowest share of right answers) with ▶ — fix them on the So‘zlar page
 *   - tuning (time per question, grace, round length, levels, question types, ghost share, duel hours)
 *
 *   GET   /api/games/word-battle/admin/stats/?days=1|7|30
 *   GET   /api/games/stats/admin/games/word-battle/        {config, defaults, effective, status}
 *   PATCH /api/games/stats/admin/games/word-battle/        {config: {...}}  (null = back to the default)
 * Words are imported on the shared So‘zlar page (one bank for Word Battle and Toby Run).
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion as Motion } from 'framer-motion'
import {
  AlertCircle, BookOpen, Check, Gauge, Loader2, Play, RotateCcw, Swords, Target, Timer, Trophy, Users,
} from 'lucide-react'
import api from '../../../api/client'
import { sayLine } from '../../../games/voice/voiceTts'

const RANGES = [{ days: 1, label: 'Bugun' }, { days: 7, label: '7 kun' }, { days: 30, label: '30 kun' }]
const STATS_KEY = 'admin-wb-stats'
const CONFIG_KEY = 'admin-wb-config'
const LEVELS = ['A2', 'B1', 'B2', 'C1', 'SAT']
const TYPES = {
  en_uz: 'EN → UZ ma’no', uz_en: 'UZ → EN', syn: 'Sinonim', ant: 'Antonim', cloze: 'Gapni to‘ldirish', listen: 'Tinglab topish',
}
const OPPONENTS = { ghost: 'Yozib olingan o‘yinchi', bot: 'Bot', duel: 'Duel (do‘st o‘ynagan)', wait: 'Duel (do‘st hali o‘ynamagan)' }
const STATUS = {
  live: { label: 'Live', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  soon: { label: 'Tez orada', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  hidden: { label: 'Yashirin', cls: 'border-gray-200 bg-gray-50 text-gray-500' },
}
const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek']

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ru-RU') : '—')
const pct = (n) => (typeof n === 'number' ? `${n}%` : '—')
const dayLabel = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d}-${MONTHS[m - 1]}` }
const errText = (e, fallback) => e?.response?.data?.error || (e?.response ? `${fallback} (${e.response.status})` : fallback)
const accTone = (v) => (v == null ? 'text-gray-400' : v >= 75 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-600')
const fade = (i = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.04, duration: 0.28 } })

function StatCard({ icon, label, value, sub, tone, index }) {
  return (
    <Motion.div {...fade(index)} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium leading-none text-gray-400">{label}</p>
        <p className="mt-1 text-[22px] font-black leading-tight text-gray-900 tabular-nums">
          {value === undefined ? <span className="inline-block h-6 w-12 animate-pulse rounded bg-gray-100" /> : value}
        </p>
        {sub && <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{sub}</p>}
      </div>
    </Motion.div>
  )
}

function Section({ title, sub, right, children, index = 0, className = '' }) {
  return (
    <Motion.section {...fade(index)} className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-5 py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </Motion.section>
  )
}

/* rounds per day — one series, so no legend: the title names it. Bars keep a fixed maximum width. */
function DayBars({ series }) {
  const [hover, setHover] = useState(null)
  const n = series.length
  const max = Math.max(1, ...series.map(s => s.rounds))
  const h = hover == null ? null : series[hover]
  const at = hover == null ? 0 : (hover + 0.5) / n
  const shift = at < 0.2 ? '0%' : at > 0.8 ? '-100%' : '-50%'
  const every = n <= 7 ? 1 : n <= 14 ? 2 : 5
  return (
    <div className="relative px-5 pb-4 pt-5">
      <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>Tugatilgan raundlar / kun</span>
        <span className="tabular-nums">eng ko‘p {fmt(Math.max(0, ...series.map(s => s.rounds)))}</span>
      </div>
      <div className="relative h-[132px] border-b border-gray-200" role="img"
        aria-label={`Kunlik raundlar: ${series.map(s => `${dayLabel(s.date)} ${s.rounds}`).join(', ')}`}
        onPointerLeave={(e) => (e.pointerType === 'mouse' ? setHover(null) : setTimeout(() => setHover(null), 2000))}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-gray-100" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-100" />
        <div className="relative flex h-full items-end gap-[2px]">
          {series.map((s, i) => (
            <div key={s.date} className="flex h-full flex-1 cursor-crosshair items-end justify-center"
              onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <div className={`w-full max-w-[36px] rounded-t-[4px] transition-colors ${!s.rounds ? 'bg-gray-200' : hover === i ? 'bg-sky-600' : 'bg-sky-400'}`}
                style={{ height: s.rounds ? `${Math.max(3, (s.rounds / max) * 100)}%` : 2 }} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[10.5px] text-gray-400">
        {series.map((s, i) => (
          <span key={s.date} className="flex-1 truncate text-center">{i % every === 0 || i === n - 1 ? dayLabel(s.date) : ''}</span>
        ))}
      </div>
      {h && (
        <div className="pointer-events-none absolute top-8 z-10 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] leading-tight text-white shadow-lg"
          style={{ left: `calc(20px + (100% - 40px) * ${at})`, transform: `translateX(${shift})` }}>
          <p className="font-semibold">{dayLabel(h.date)}</p>
          <p className="text-white/75">{fmt(h.rounds)} raund · {fmt(h.players)} o‘yinchi · o‘rtacha {h.avg_score != null ? fmt(h.avg_score) : '—'}</p>
        </div>
      )}
    </div>
  )
}

function ShareRow({ label, value, total, right, tone = 'bg-sky-400' }) {
  const p = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="px-5 py-2.5">
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold tabular-nums text-gray-900">{right ?? fmt(value)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone}`} style={{ width: `${Math.max(value ? 2 : 0, p)}%` }} />
      </div>
    </div>
  )
}

/* ── tuning ───────────────────────────────────────────────────────────────── */

const NUMBERS = [
  { key: 'question_ms', label: 'Savol vaqti', min: 4000, max: 15000, step: 500, show: (v) => `${(v / 1000).toFixed(1)} s`, hint: 'Har bir savolga beriladigan vaqt' },
  { key: 'grace_ms', label: 'Tarmoq uchun qo‘shimcha', min: 500, max: 3000, step: 100, show: (v) => `${(v / 1000).toFixed(1)} s`, hint: 'Taymer tugagach server yana shuncha kutadi' },
  { key: 'questions', label: 'Raunddagi savollar', min: 10, max: 20, step: 1, show: (v) => `${v} ta`, hint: 'Yangi raundlar uchun' },
  { key: 'ghost_share', label: 'Yozib olingan raqib ulushi', min: 0, max: 1, step: 0.05, show: (v) => `${Math.round(v * 100)}%`, hint: 'Mos o‘yin bo‘lsa — shu ehtimol bilan haqiqiy o‘yinchi, aks holda bot' },
  { key: 'duel_hours', label: 'Duel muddati', min: 6, max: 168, step: 6, show: (v) => `${v} soat`, hint: 'Havola shuncha vaqt ochiq turadi' },
]

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function ConfigForm({ data }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(() => ({ ...data.effective }))
  const [msg, setMsg] = useState(null)
  const defaults = data.defaults || {}
  const dirty = Object.keys(form).some(k => !same(form[k], data.effective[k]))

  const save = useMutation({
    mutationFn: (config) => api.patch('/games/stats/admin/games/word-battle/', { config }).then(r => r.data),
    onSuccess: (res) => {
      qc.setQueryData([CONFIG_KEY], res)
      setForm({ ...res.effective })
      setMsg({ ok: true, text: 'Saqlandi — yangi raundlarda ishlaydi.' })
      setTimeout(() => setMsg(null), 3000)
    },
    onError: (e) => setMsg({ ok: false, text: errText(e, 'Saqlanmadi') }),
  })
  const submit = () => {
    const patch = {}
    for (const k of Object.keys(form)) {
      if (same(form[k], data.effective[k])) continue
      patch[k] = same(form[k], defaults[k]) ? null : form[k]       // the default again = drop the override
    }
    if (Object.keys(patch).length) save.mutate(patch)
  }
  const toggle = (key, value, all) => setForm(f => {
    const has = f[key].includes(value)
    const next = has ? f[key].filter(v => v !== value) : [...f[key], value]
    return next.length ? { ...f, [key]: all.filter(v => next.includes(v)) } : f
  })
  const chip = (on) => `rounded-lg border px-3 py-1.5 text-xs font-bold transition ${on ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-200 bg-white text-gray-500 hover:border-sky-300'}`

  return (
    <div className="space-y-5 px-5 py-5">
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        {NUMBERS.map(f => (
          <label key={f.key} className="block">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold text-gray-700">{f.label}</span>
              <span className="text-[13px] font-bold tabular-nums text-sky-600">{f.show(form[f.key])}</span>
            </span>
            <input type="range" min={f.min} max={f.max} step={f.step} value={form[f.key]}
              onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
              style={{ background: `linear-gradient(to right, #0EA5E9 ${((form[f.key] - f.min) / (f.max - f.min)) * 100}%, #E5E7EB 0)` }}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-200
                [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-sky-500
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-sky-500 [&::-webkit-slider-thumb]:shadow" />
            <span className="mt-0.5 flex justify-between text-[11px] text-gray-400">
              <span>{f.hint}</span>
              {!same(form[f.key], defaults[f.key]) && (
                <button type="button" onClick={() => setForm({ ...form, [f.key]: defaults[f.key] })} className="flex-shrink-0 font-semibold text-sky-600 hover:underline">
                  standart: {f.show(defaults[f.key])}
                </button>
              )}
            </span>
          </label>
        ))}
        <div>
          <span className="text-[13px] font-semibold text-gray-700">Haftalik reyting</span>
          <button type="button" role="switch" aria-checked={form.leaderboard} onClick={() => setForm({ ...form, leaderboard: !form.leaderboard })}
            className="mt-2 flex items-center gap-3 text-[13px] text-gray-500">
            <span className={`relative h-6 w-11 rounded-full transition ${form.leaderboard ? 'bg-sky-500' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.leaderboard ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
            {form.leaderboard ? 'Bosh sahifada ko‘rsatiladi' : 'Yashirilgan'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold text-gray-700">Darajalar</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {LEVELS.map(lv => <button key={lv} type="button" onClick={() => toggle('levels', lv, LEVELS)} className={chip(form.levels.includes(lv))}>{lv}</button>)}
        </div>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-gray-700">Savol turlari</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(TYPES).map(([t, label]) => (
            <button key={t} type="button" onClick={() => toggle('types', t, Object.keys(TYPES))} className={chip(form.types.includes(t))}>{label}</button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">Kamida bittasi yoqilgan bo‘lishi kerak. O‘chirilgan tur yangi savollar to‘plamiga kirmaydi.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-gray-50 pt-4">
        <button type="button" onClick={submit} disabled={!dirty || save.isPending}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50">
          {save.isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Saqlash
        </button>
        <button type="button" onClick={() => setForm({ ...data.effective })} disabled={!dirty}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40">
          <RotateCcw size={14} /> Bekor qilish
        </button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
      </div>
    </div>
  )
}

export default function AdminGamesWordBattle() {
  const [days, setDays] = useState(7)
  const { data, error, isFetching } = useQuery({
    queryKey: [STATS_KEY, days],
    queryFn: () => api.get('/games/word-battle/admin/stats/', { params: { days } }).then(r => r.data),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
  const cfg = useQuery({
    queryKey: [CONFIG_KEY],
    queryFn: () => api.get('/games/stats/admin/games/word-battle/').then(r => r.data),
  })
  const shown = data && data.days === days
  const t = shown ? data.totals : undefined
  const typeMax = useMemo(() => Math.max(1, ...(data?.types || []).map(x => x.answers)), [data])
  const oppTotal = data ? Object.values(data.opponents).reduce((a, b) => a + b, 0) : 0
  const st = STATUS[cfg.data?.status] || null
  const eff = cfg.data?.effective

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-[min(100%,280px)] flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-100"><Swords size={20} className="text-sky-600" /></div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold leading-tight text-gray-900">
              Word Battle
              {st && <span className={`rounded-md border px-1.5 py-0.5 text-[11px] font-bold ${st.cls}`}>{st.label}</span>}
            </h2>
            <p className="text-xs text-gray-400">
              {eff ? `${eff.questions} savol × ${(eff.question_ms / 1000).toLocaleString('ru-RU')} soniya` : 'Savol-javob dueli'} · har bir javobni server tekshiradi · holat «Overview» sahifasida
            </p>
          </div>
        </div>
        {isFetching && <Loader2 size={16} className="animate-spin text-sky-500" />}
        <div className="flex rounded-xl border border-gray-100 bg-gray-50 p-1" role="tablist" aria-label="Davr">
          {RANGES.map(r => (
            <button key={r.days} type="button" role="tab" aria-selected={days === r.days} onClick={() => setDays(r.days)}
              className={`h-8 rounded-lg px-3.5 text-xs font-bold transition-all ${days === r.days ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={16} /> Statistika yuklanmadi: {errText(error, error.message)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard index={0} icon={<Swords size={19} />} tone="bg-sky-50 text-sky-600" label="Raundlar" value={t && fmt(t.rounds)}
            sub={t ? `boshlangan ${fmt(t.started)} · to‘xtatilgan ${fmt(t.abandoned)}` : null} />
          <StatCard index={1} icon={<Users size={19} />} tone="bg-violet-50 text-violet-600" label="O‘yinchilar" value={t && fmt(t.players)} sub="noyob o‘quvchilar" />
          <StatCard index={2} icon={<Trophy size={19} />} tone="bg-amber-50 text-amber-600" label="O‘rtacha ball" value={t && fmt(t.avg_score)} sub={t ? `reytingda ${fmt(t.ranked)} raund` : null} />
          <StatCard index={3} icon={<Target size={19} />} tone="bg-emerald-50 text-emerald-600" label="Aniqlik" value={t && pct(t.accuracy)} sub={t ? `${fmt(t.answers)} javob` : null} />
          <StatCard index={4} icon={<Timer size={19} />} tone="bg-rose-50 text-rose-600" label="O‘rtacha javob" value={t && (t.avg_ms != null ? `${(t.avg_ms / 1000).toFixed(1)} s` : '—')}
            sub={t ? `tugatish ${pct(t.completion)}` : null} />
          <StatCard index={5} icon={<Gauge size={19} />} tone="bg-orange-50 text-orange-600" label="Duellar" value={data && fmt(data.duels.created)}
            sub={data ? `${fmt(data.duels.accepted)} qabul · ${fmt(data.duels.completed)} yakun · ${fmt(data.duels.expired)} o‘tgan` : null} />
        </div>
      )}

      {data && (
        <>
          <Section index={6} title="Kunlar bo‘yicha" sub="Oxirigacha o‘ynalgan raundlar (bot, yozib olingan o‘yinchi va duellar)">
            <div className={shown ? '' : 'opacity-60'}><DayBars series={data.series} /></div>
            {t?.flagged > 0 && (
              <p className="border-t border-gray-50 px-5 py-2.5 text-xs text-amber-700">
                {fmt(t.flagged)} ta raund juda tez javoblar sababli reytingdan chiqarildi.
              </p>
            )}
          </Section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Section index={7} title="Darajalar" sub="So‘zlar — chop etilgan, o‘zbekchasi bor so‘zlar soni">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[460px] text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      <th className="px-5 py-2.5">Daraja</th><th className="px-3 py-2.5 text-right">So‘zlar</th>
                      <th className="px-3 py-2.5 text-right">Raundlar</th><th className="px-3 py-2.5 text-right">O‘yinchilar</th>
                      <th className="px-3 py-2.5 text-right">O‘rt. ball</th><th className="px-5 py-2.5 text-right">O‘rt. to‘g‘ri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.levels.map(l => (
                      <tr key={l.level} className="text-gray-700">
                        <td className="px-5 py-2.5"><b className="text-gray-900">{l.level}</b> <span className="text-xs text-gray-400">{l.title}</span></td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${l.words < 40 ? 'text-red-600' : ''}`}>{fmt(l.words)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(l.rounds)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(l.players)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(l.avg_score)}</td>
                        <td className="px-5 py-2.5 text-right tabular-nums">{l.avg_correct != null ? l.avg_correct : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section index={8} title="Savol turlari" sub="Javoblar soni va to‘g‘ri javoblar ulushi">
              <div className="py-2">
                {data.types.map(x => (
                  <ShareRow key={x.type} label={TYPES[x.type]} value={x.answers} total={typeMax}
                    right={<span>{fmt(x.answers)} <span className={`ml-1 ${accTone(x.accuracy)}`}>{pct(x.accuracy)}</span></span>} />
                ))}
              </div>
            </Section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Section index={9} title="Eng qiyin so‘zlar"
              sub={`Kamida ${data.hard_min} ta javob, to‘g‘ri javob ulushi eng past. Tarjima yoki variantni «So‘zlar» sahifasida tuzating.`}
              right={<Link to="/admin-panel/games/words" className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50"><BookOpen size={13} /> So‘zlar</Link>}>
              {data.hardest.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="bg-gray-50/60 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        <th className="w-10 px-5 py-2.5" /><th className="px-2 py-2.5">So‘z</th><th className="px-3 py-2.5">Daraja</th>
                        <th className="px-3 py-2.5 text-right">Javob</th><th className="px-3 py-2.5 text-right">To‘g‘ri</th><th className="px-5 py-2.5">Xato turlari</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.hardest.map(w => (
                        <tr key={w.id} className="text-gray-700">
                          <td className="px-5 py-2">
                            <button type="button" onClick={() => sayLine(w.word, { voice: 'teacher' })} aria-label={`Tinglash: ${w.word}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100"><Play size={12} fill="currentColor" /></button>
                          </td>
                          <td className="px-2 py-2"><b className="text-gray-900">{w.word}</b><span className="block text-xs text-gray-400">{w.uz}</span></td>
                          <td className="px-3 py-2 text-xs font-semibold">{w.level}{w.sat && <span className="ml-1 rounded bg-rose-50 px-1 text-rose-600">SAT</span>}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{fmt(w.answers)}</td>
                          <td className={`px-3 py-2 text-right font-bold tabular-nums ${accTone(w.accuracy)}`}>{w.accuracy}%</td>
                          <td className="px-5 py-2 text-xs text-gray-500">
                            {Object.entries(w.miss_types).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${TYPES[k] || k} ${v}`).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-gray-400">Hali yetarli javob yo‘q — so‘zlar {data.hard_min} tadan ko‘p javob olgach shu yerda chiqadi.</p>
              )}
            </Section>

            <Section index={10} title="Raqiblar" sub="Tugatilgan raundlar kimga qarshi o‘ynalgan">
              <div className="py-2">
                {Object.entries(OPPONENTS).map(([k, label]) => (
                  <ShareRow key={k} label={label} value={data.opponents[k] || 0} total={oppTotal}
                    right={`${fmt(data.opponents[k] || 0)} · ${oppTotal ? Math.round(((data.opponents[k] || 0) / oppTotal) * 100) : 0}%`} />
                ))}
              </div>
              <p className="border-t border-gray-50 px-5 py-3 text-[11.5px] leading-relaxed text-gray-400">
                <b className="font-semibold text-gray-500">Yozib olingan</b> — boshqa o‘quvchining shu savollardagi haqiqiy o‘yini (server vaqtlari bilan).
                Mos o‘yin bo‘lmasa, «Bot» belgisi bilan bot o‘ynaydi.
              </p>
            </Section>
          </div>
        </>
      )}

      <Section index={11} title="Sozlamalar" sub="Yangi raundlarga ta’sir qiladi; boshlangan raund o‘z sozlamasi bilan tugaydi">
        {cfg.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin text-sky-500" /></div>}
        {cfg.error && <p className="px-5 py-6 text-sm text-red-600">Sozlamalar yuklanmadi: {errText(cfg.error, 'xato')}</p>}
        {cfg.data && <ConfigForm key={JSON.stringify(cfg.data.effective)} data={cfg.data} />}
      </Section>
    </div>
  )
}
