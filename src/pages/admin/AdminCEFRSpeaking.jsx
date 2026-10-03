/* Admin: CEFR multilevel Speaking tests — list, pictures, delete and JSON import. */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, ChevronDown, Copy, Crown, FileJson, FileText, ImagePlus, Loader2, Mic, Trash2, Upload, X } from 'lucide-react'
import api from '../../api/client'

const PART_LABEL = { '1.1': '1.1', '1.2': '1.2', '2': 'Part 2', '3': 'Part 3' }
const SLOTS = [
  { slot: 'p12a', label: '1.2 — rasm A', part: '1.2' },
  { slot: 'p12b', label: '1.2 — rasm B', part: '1.2' },
  { slot: 'p2', label: 'Part 2 — rasm (ixtiyoriy)', part: '2' },
]

const EXAMPLE = `{
  "title": "CEFR Speaking Test 1",
  "is_premium": false,
  "part_1_1": [
    "Where do you live and what do you like about it?",
    "What do you usually do at the weekend?",
    "How often do you use public transport?"
  ],
  "part_1_2": [
    "Describe what you can see in the two pictures.",
    "Which of these two places would you prefer to study in? Why?",
    "Why do some people find it hard to study at home?"
  ],
  "part_2": {
    "prompt": "Describe a person who has had an important influence on your life.",
    "questions": ["Who is this person?", "How do you know them?", "Why have they influenced you so much?"]
  },
  "part_3": {
    "topic": "Social media does more harm than good.",
    "for": ["It wastes a lot of time", "It spreads false information", "It can make people feel lonely"],
    "against": ["It keeps families and friends connected", "It helps small businesses", "It gives quick access to news"]
  }
}`

const RULES = [
  ['"title"', 'majburiy — test nomi.'],
  ['"part_1_1"', "o'zi haqidagi savollar ro'yxati (1–5 ta, odatda 3). Har biriga 5 s tayyorlanish, 30 s javob."],
  ['"part_1_2"', "2 ta rasm haqidagi savollar (1–5 ta). Rasmlar import'dan KEYIN shu sahifada yuklanadi — ikkala rasm bo'lmaguncha test o'quvchilarga ko'rinmaydi."],
  ['"part_2"', '{"prompt": "...", "questions": [...]} — 1 daq tayyorlanish, 2 daq gapirish. Rasm ixtiyoriy.'],
  ['"part_3"', '{"topic": "...", "for": [...], "against": [...]} — 1 daq tayyorlanish, 2 daq gapirish.'],
  ["Qismlar", "hammasi bo'lsa — to'liq test; istalgan bittasi yoki bir nechtasi bo'lsa — alohida mashq."],
  ['Ovoz', "import'dan keyin barcha savollar AI ovozida bir marta tayyorlanadi va saqlanadi — o'quvchilar kutmaydi, qayta pul ketmaydi."],
  ['Bir nechta test', '[ {...}, {...} ] yoki {"tests": [ ... ]}.'],
  ["Xato bo'lsa", 'hech narsa yaratilmaydi, qaysi testda nima xato ekani aytiladi.'],
  ['Ball', "avtomatik: 1.1 → 12, 1.2 → 15, Part 2 → 24, Part 3 → 24. Jami 75 (C1 65+, B2 51–64, B1 38–50)."],
]

function ImageSlot({ item, slot, label, onDone }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const src = item.images?.[slot]
  const upload = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true); setErr('')
    try {
      const fd = new FormData()
      fd.append('image', f)
      await api.post(`/admin/cefr/speaking/${item.id}/image/?slot=${slot}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      onDone()
    } catch (x) {
      setErr(x.response?.data?.error || `Yuklanmadi (${x.response?.status || x.message})`)
    } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true); setErr('')
    try { await api.delete(`/admin/cefr/speaking/${item.id}/image/?slot=${slot}`); onDone() } catch { setErr("O'chmadi") } finally { setBusy(false) }
  }
  return (
    <div className="w-40 space-y-1.5">
      <p className="text-xs font-semibold text-gray-600">{label}</p>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
        {src ? <img src={src} alt={label} className="h-full w-full object-cover" /> : <ImagePlus size={22} className="text-slate-300" />}
        {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 size={18} className="animate-spin text-sky-600" /></div>}
        {src && !busy && (
          <button type="button" onClick={remove} title="Rasmni o'chirish"
            className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white hover:bg-black/75"><X size={12} /></button>
        )}
      </div>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className="w-full rounded-lg border border-sky-200 bg-sky-50 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100">
        {src ? 'Almashtirish' : 'Rasm yuklash'}
      </button>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}

function Row({ item, onDelete, onChanged }) {
  const [open, setOpen] = useState(!item.ready)
  const slots = SLOTS.filter(s => item.parts.includes(s.part))
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-gray-900">{item.title}</span>
            <span className="text-xs text-gray-400">#{item.id} · {new Date(item.created_at).toLocaleDateString()} · ~{item.minutes} daq · {item.responses} ta javob</span>
          </span>
        </button>
        <span className="flex gap-1">
          {item.parts.map(p => <span key={p} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-gray-600">{PART_LABEL[p]}</span>)}
        </span>
        {item.ready
          ? <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Tayyor</span>
          : <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">1.2 rasmlari kerak</span>}
        {item.is_premium && <span className="flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-0.5 text-xs font-bold text-yellow-700"><Crown size={11} /> Premium</span>}
        <button type="button" onClick={() => onDelete(item)} title="O'chirish" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="grid gap-5 border-t border-slate-100 bg-slate-50/60 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2 text-sm leading-relaxed text-gray-700">
                {item.part11?.length > 0 && <p><b className="text-sky-700">1.1:</b> {item.part11.join(' · ')}</p>}
                {item.part12?.length > 0 && <p><b className="text-sky-700">1.2:</b> {item.part12.join(' · ')}</p>}
                {item.part2?.prompt && <p><b className="text-violet-700">Part 2:</b> {item.part2.prompt} {item.part2.questions?.length ? `— ${item.part2.questions.join(' · ')}` : ''}</p>}
                {item.part3?.topic && (
                  <p><b className="text-rose-700">Part 3:</b> {item.part3.topic} <span className="text-emerald-700">For: {item.part3.for?.join('; ')}</span> · <span className="text-red-700">Against: {item.part3.against?.join('; ')}</span></p>
                )}
              </div>
              {slots.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {slots.map(s => <ImageSlot key={s.slot} item={item} slot={s.slot} label={s.label} onDone={onChanged} />)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ImportTab({ onDone }) {
  const [json, setJson] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef()
  const readFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => setJson(String(ev.target.result || ''))
    reader.readAsText(f)
    e.target.value = ''
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(EXAMPLE); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ }
  }
  const submit = async () => {
    setStatus(null)
    let parsed
    try { parsed = JSON.parse(json.replace(/^\s*\/\/.*$/gm, '')) } catch {
      setStatus({ ok: false, msg: "JSON noto'g'ri yozilgan — qavs yoki vergulni tekshiring." })
      return
    }
    setLoading(true)
    try {
      const r = await api.post('/import/cefr/speaking/', parsed)
      const needs = r.data.items.filter(i => i.needs_images).length
      setStatus({ ok: true, msg: `${r.data.created} ta test qo'shildi.${needs ? ` ${needs} tasiga 1.2 rasmlarini yuklang (Ro'yxat bo'limida).` : ''}` })
      setJson('')
      onDone()
    } catch (e) {
      setStatus({ ok: false, msg: e.response?.data?.error || e.response?.data?.detail || 'Import bajarilmadi.' })
    } finally { setLoading(false) }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">Qoidalar</p>
          <dl className="space-y-2 text-sm">
            {RULES.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2">
                <dt className="font-mono text-xs font-bold text-sky-700">{k}</dt>
                <dd className="text-gray-600">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gray-950">
          <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400">
            <span>To'liq test namunasi</span>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Nusxa olindi' : 'Nusxa olish'}
            </button>
          </div>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap px-4 pb-4 font-mono text-[11px] leading-relaxed text-green-400">{EXAMPLE}</pre>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">JSON kiriting yoki fayldan yuklang</p>
        <textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false} placeholder="JSON shu yerga… (// izohlar qabul qilinadi)"
          className="min-h-[320px] w-full flex-1 resize-y rounded-2xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600">
          <Upload size={15} /> .json fayl yuklash
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={readFile} />
        {status && (
          <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${status.ok ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-700'}`}>
            {status.ok ? <Check size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
            <span>{status.msg}</span>
          </div>
        )}
        <button type="button" onClick={submit} disabled={loading || !json.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />} {loading ? 'Import va ovoz tayyorlanmoqda…' : 'Import qilish'}
        </button>
      </div>
    </div>
  )
}

export default function AdminCEFRSpeaking() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('list')
  const [toDelete, setToDelete] = useState(null)
  const key = ['admin-cefr-speaking']
  const refresh = () => queryClient.invalidateQueries({ queryKey: key })
  const { data = [], isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get('/admin/cefr/speaking/').then(r => r.data) })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/admin/cefr/speaking/${id}/`),
    onSuccess: () => { refresh(); setToDelete(null) },
  })
  const notReady = data.filter(t => !t.ready).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100"><Mic size={20} className="text-rose-600" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">CEFR Speaking</h2>
            <p className="text-xs text-gray-400">{data.length} ta test{notReady ? ` · ${notReady} tasida rasm yetishmaydi` : ''} · multilevel formati (1.1, 1.2, 2, 3)</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-sky-50 bg-white p-1 shadow-sm">
          {[['list', "Ro'yxat", FileText], ['import', 'Import JSON', FileJson]].map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === k ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-500 hover:bg-sky-50 hover:text-sky-600'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'list' && (
        <div className="space-y-2">
          {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sky-500" /></div>}
          {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Ro'yxat yuklanmadi.</p>}
          {!isLoading && !data.length && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-400">
              Hali test yo'q. <button type="button" onClick={() => setTab('import')} className="font-semibold text-sky-600 hover:underline">Import JSON</button> orqali qo'shing.
            </div>
          )}
          {data.map(item => <Row key={item.id} item={item} onDelete={setToDelete} onChanged={refresh} />)}
        </div>
      )}
      {tab === 'import' && <ImportTab onDone={() => { refresh(); setTab('list') }} />}

      <AnimatePresence>
        {toDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"><Trash2 size={20} className="text-red-600" /></div>
              <h3 className="mb-2 font-bold text-gray-900">"{toDelete.title}" o'chirilsinmi?</h3>
              <p className="mb-6 text-sm text-gray-500">
                {toDelete.responses ? `Unga ${toDelete.responses} ta o'quvchi javobi bog'langan — ular ham o'chadi. ` : ''}Bu amalni qaytarib bo'lmaydi.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setToDelete(null)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Bekor</button>
                <button type="button" onClick={() => del.mutate(toDelete.id)} disabled={del.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                  {del.isPending && <Loader2 size={13} className="animate-spin" />} O'chirish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
