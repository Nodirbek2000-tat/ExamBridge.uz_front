/* Admin → Games → Speaking: import texts from JSON, manage them (active, premium, order, edit, delete), see per-lesson stats. */
import { useEffect, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { AlertCircle, Check, Copy, FileJson, FileText, Loader2, Mic, Pencil, Search, Trash2, Upload, X } from 'lucide-react'
import api from '../../../api/client'

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
const KEY = ['admin-games-speaking']

const EXAMPLE = `[
  {
    "title": "My Morning",
    "level": "A1",
    "topic": "Kundalik hayot",
    "is_premium": false,
    "text": "I wake up at seven o'clock every day. First, I wash my face and brush my teeth. Then I eat bread and eggs for breakfast."
  },
  {
    "title": "The Power of Habits",
    "level": "B2",
    "topic": "Psixologiya",
    "order": 1,
    "text": "Most of what we do every day is not the result of careful decisions but of habits. Scientists believe that habits are formed through a simple loop."
  }
]`

const RULES = [
  ['"title"', 'majburiy — dars nomi (200 belgigacha).'],
  ['"level"', 'majburiy — A1, A2, B1, B2, C1 yoki C2.'],
  ['"text"', "majburiy — o‘qiladigan inglizcha matn, 5–350 so‘z (≈ 3 daqiqagacha). Har bir gap . ? ! bilan tugasin — o‘quvchiga gap-gap qilib ko‘rsatiladi."],
  ['"topic"', "ixtiyoriy — mavzu, masalan «Sayohat»."],
  ['"order"', "ixtiyoriy — daraja ichidagi tartib. Berilmasa, oxiriga qo‘shiladi."],
  ['"is_premium"', "ixtiyoriy — true bo‘lsa faqat Premium uchun (standart false)."],
  ['"is_active"', "ixtiyoriy — false bo‘lsa o‘quvchilarga ko‘rinmaydi."],
  ['Takrorlar', "bir xil title + level bor bo‘lsa — o‘tkazib yuboriladi (qayta import xavfsiz)."],
  ['Format', '[ {...}, {...} ] yoki {"lessons": [ ... ]}. Xato darslar yaratilmaydi, qolganlari yaratiladi.'],
  ['Tekshiruv', "AI (Whisper) har bir so‘zni baholaydi: to‘g‘ri 90–100, noaniq 50–89, aytilmagan 0. Raqam (10 / ten), qisqartma (I'm), britancha yozuv (colour) to‘g‘ri hisoblanadi."],
]

const accTone = (v) => (v == null ? 'text-gray-400' : v >= 80 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-600')

function Switch({ on, onChange, label, color = 'bg-violet-500', disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} title={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition disabled:opacity-50 ${on ? color : 'bg-gray-200'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function OrderInput({ value, onSave }) {
  const [v, setV] = useState(String(value))
  useEffect(() => { setV(String(value)) }, [value])
  const save = () => {
    const n = parseInt(v, 10)
    if (Number.isNaN(n) || n < 0) { setV(String(value)); return }
    if (n !== value) onSave(n)
  }
  return (
    <input value={v} onChange={e => setV(e.target.value.replace(/\D/g, '').slice(0, 5))} onBlur={save}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} inputMode="numeric" aria-label="Tartib"
      className="h-8 w-12 rounded-lg border border-gray-200 bg-white text-center text-sm font-semibold text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
  )
}

function Row({ item, onPatch, onEdit, onDelete, busy }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl border bg-white transition ${item.is_active ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/60'}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <OrderInput value={item.order} onSave={(order) => onPatch(item.id, { order })} />
        <button type="button" onClick={() => setOpen(o => !o)} className="min-w-0 flex-1 text-left">
          <span className="flex items-center gap-2">
            <span className="rounded-md bg-violet-50 px-1.5 py-0.5 text-xs font-bold text-violet-700">{item.level}</span>
            <span className={`truncate font-bold ${item.is_active ? 'text-gray-900' : 'text-gray-500'}`}>{item.title}</span>
          </span>
          <span className="mt-0.5 block text-xs text-gray-400">
            #{item.id}{item.topic ? ` · ${item.topic}` : ''} · {item.words} so‘z · ~{item.seconds} s
          </span>
        </button>
        <div className="flex items-center gap-4 text-center text-xs">
          <div><p className="font-bold text-gray-800">{item.attempts}</p><p className="text-gray-400">urinish</p></div>
          <div><p className="font-bold text-gray-800">{item.learners}</p><p className="text-gray-400">o‘quvchi</p></div>
          <div><p className={`font-bold ${accTone(item.avg_accuracy)}`}>{item.avg_accuracy != null ? `${item.avg_accuracy}%` : '—'}</p><p className="text-gray-400">o‘rtacha</p></div>
        </div>
        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
          <label className="flex items-center gap-1.5">Faol <Switch on={item.is_active} label="Faol" color="bg-emerald-500" disabled={busy} onChange={(v) => onPatch(item.id, { is_active: v })} /></label>
          <label className="flex items-center gap-1.5">Premium <Switch on={item.is_premium} label="Premium" color="bg-amber-500" disabled={busy} onChange={(v) => onPatch(item.id, { is_premium: v })} /></label>
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => onEdit(item)} title="Tahrirlash" className="rounded-lg p-2 text-gray-400 hover:bg-violet-50 hover:text-violet-600"><Pencil size={15} /></button>
          <button type="button" onClick={() => onDelete(item)} title="O‘chirish" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <Motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="whitespace-pre-line border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm leading-relaxed text-gray-700">{item.text}</p>
            {item.last_attempt && <p className="bg-slate-50/60 px-5 pb-3 text-xs text-gray-400">Oxirgi urinish: {new Date(item.last_attempt).toLocaleString()}</p>}
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EditModal({ item, onClose, onSaved }) {
  const [form, setForm] = useState({ title: item.title, topic: item.topic || '', level: item.level, text: item.text })
  const [err, setErr] = useState('')
  const save = useMutation({
    mutationFn: () => api.patch(`/games/speaking/admin/lessons/${item.id}/`, form),
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setErr(e.response?.data?.error || 'Saqlanmadi.'),
  })
  const words = form.text.split(/\s+/).filter(Boolean).length
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <Motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Darsni tahrirlash</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
          <label className="text-xs font-semibold text-gray-500">Nomi
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Daraja
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value })}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400">
              {LEVELS.map(l => <option key={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-gray-500">Mavzu
          <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </label>
        <label className="mt-3 block text-xs font-semibold text-gray-500">Matn <span className="font-normal text-gray-400">· {words} so‘z</span>
          <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={9}
            className="mt-1 w-full resize-y rounded-xl border border-gray-200 px-3 py-2 text-sm leading-relaxed text-gray-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        </label>
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <p className="mt-2 text-xs text-gray-400">Matn o‘zgarsa, eski urinishlar natijasi o‘zgarmaydi — yangi urinishlar yangi matn bo‘yicha baholanadi.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">Bekor</button>
          <button type="button" onClick={() => { setErr(''); save.mutate() }} disabled={save.isPending}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60">
            {save.isPending && <Loader2 size={14} className="animate-spin" />} Saqlash
          </button>
        </div>
      </Motion.div>
    </div>
  )
}

function ImportTab({ onDone }) {
  const [json, setJson] = useState('')
  const [report, setReport] = useState(null)
  const [fail, setFail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef()
  const readFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => setJson(String(ev.target.result || ''))
    reader.readAsText(f)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(EXAMPLE); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* blocked */ }
  }
  const submit = async () => {
    setReport(null); setFail('')
    let parsed
    try { parsed = JSON.parse(json.replace(/^\s*\/\/.*$/gm, '')) } catch {
      setFail("JSON noto‘g‘ri yozilgan — qavs yoki vergulni tekshiring.")
      return
    }
    setLoading(true)
    try {
      const r = await api.post('/games/speaking/admin/import/', parsed)
      setReport(r.data)
      if (r.data.created) { setJson(''); onDone() }
    } catch (e) {
      setFail(e.response?.data?.error || e.response?.data?.detail || 'Import bajarilmadi.')
    } finally { setLoading(false) }
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">Qo‘llanma</p>
          <dl className="space-y-2 text-sm">
            {RULES.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-2">
                <dt className="font-mono text-xs font-bold text-violet-700">{k}</dt>
                <dd className="text-gray-600">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gray-950">
          <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400">
            <span>Namuna</span>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Nusxa olindi' : 'Nusxa olish'}
            </button>
          </div>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap px-4 pb-4 font-mono text-[11px] leading-relaxed text-green-400">{EXAMPLE}</pre>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">JSON kiriting yoki fayldan yuklang</p>
        <textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false} placeholder="[ { &quot;title&quot;: …, &quot;level&quot;: …, &quot;text&quot;: … } ]"
          className="min-h-[300px] w-full flex-1 resize-y rounded-2xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-500 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600">
          <Upload size={15} /> .json fayl yuklash
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={readFile} />
        {fail && (
          <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{fail}</span>
          </div>
        )}
        {report && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold text-emerald-700"><Check size={16} /> {report.created} ta dars qo‘shildi</p>
            {report.skipped.length > 0 && (
              <div className="text-amber-700">
                <p className="font-semibold">{report.skipped.length} ta o‘tkazildi:</p>
                <ul className="ml-4 list-disc text-xs">{report.skipped.map(s => <li key={`s${s.index}`}>#{s.index} «{s.title}» — {s.reason}</li>)}</ul>
              </div>
            )}
            {report.errors.length > 0 && (
              <div className="text-red-700">
                <p className="font-semibold">{report.errors.length} ta xato:</p>
                <ul className="ml-4 list-disc text-xs">{report.errors.map(e => <li key={`e${e.index}`}>#{e.index}{e.title ? ` «${e.title}»` : ''} — {e.error}</li>)}</ul>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={submit} disabled={loading || !json.trim()}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
          {loading && <Loader2 size={14} className="animate-spin" />} Import qilish
        </button>
      </div>
    </div>
  )
}

export default function AdminGamesSpeaking() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('list')
  const [level, setLevel] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [patchErr, setPatchErr] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const { data, isLoading, error } = useQuery({
    queryKey: [...KEY, level, search],
    queryFn: () => api.get('/games/speaking/admin/lessons/', { params: { level: level || undefined, q: search || undefined } }).then(r => r.data),
    placeholderData: keepPreviousData,
  })
  const refresh = () => qc.invalidateQueries({ queryKey: KEY })
  const patch = useMutation({
    mutationFn: ({ id, body }) => api.patch(`/games/speaking/admin/lessons/${id}/`, body),
    onSuccess: () => { setPatchErr(''); refresh() },
    onError: (e) => setPatchErr(e.response?.data?.error || "O‘zgartirish saqlanmadi."),
  })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/games/speaking/admin/lessons/${id}/`),
    onSuccess: () => { refresh(); setToDelete(null) },
  })
  const askDelete = (item) => { del.reset(); setToDelete(item) }
  const lessons = data?.lessons || []
  const t = data?.totals

  const stats = t ? [
    ['Darslar', `${t.active} / ${t.lessons}`, 'faol / jami'],
    ['Premium', t.premium, 'dars'],
    ['Urinishlar', t.attempts, `7 kunda ${t.attempts_week}`],
    ["O‘quvchilar", t.learners, 'kamida 1 urinish'],
    ["O‘rtacha aniqlik", t.avg_accuracy != null ? `${t.avg_accuracy}%` : '—', t.failed_week ? `7 kunda ${t.failed_week} ta xato` : 'barcha urinishlar'],
  ] : []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100"><Mic size={20} className="text-violet-600" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Speaking</h2>
            <p className="text-xs text-gray-400">Matnni ovoz chiqarib o‘qish — AI har bir so‘zni baholaydi</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-violet-50 bg-white p-1 shadow-sm">
          {[['list', "Ro‘yxat", FileText], ['import', 'Import JSON', FileJson]].map(([k, label, icon]) => { const Icon = icon; return (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === k ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}>
              <Icon size={13} /> {label}
            </button>
          ) })}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(([label, value, sub]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'list' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {['', ...LEVELS].map(lv => (
              <button key={lv || 'all'} type="button" onClick={() => setLevel(lv)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${level === lv ? 'bg-violet-600 text-white' : 'border border-slate-200 bg-white text-gray-600 hover:border-violet-300'}`}>
                {lv || 'Barchasi'}
              </button>
            ))}
            <div className="relative ml-auto w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nomi, mavzu yoki matn…"
                className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
            </div>
          </div>
          {patchErr && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{patchErr}</p>}
          {isLoading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-500" /></div>}
          {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Ro‘yxat yuklanmadi.</p>}
          {!isLoading && !error && !lessons.length && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center text-sm text-gray-400">
              {search || level ? 'Hech narsa topilmadi.' : <>Hali dars yo‘q. <button type="button" onClick={() => setTab('import')} className="font-semibold text-violet-600 hover:underline">Import JSON</button> orqali qo‘shing.</>}
            </div>
          )}
          {lessons.map(item => (
            <Row key={item.id} item={item} busy={patch.isPending}
              onPatch={(id, body) => patch.mutate({ id, body })} onEdit={setEditing} onDelete={askDelete} />
          ))}
        </div>
      )}
      {tab === 'import' && <ImportTab onDone={refresh} />}

      {editing && <EditModal item={editing} onClose={() => setEditing(null)} onSaved={refresh} />}

      <AnimatePresence>
        {toDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <Motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"><Trash2 size={20} className="text-red-600" /></div>
              <h3 className="mb-2 font-bold text-gray-900">«{toDelete.title}» o‘chirilsinmi?</h3>
              <p className="mb-6 text-sm text-gray-500">
                {toDelete.attempts ? `Unga ${toDelete.attempts} ta urinish va ularning ovoz yozuvlari bog‘langan — ular ham o‘chadi. ` : ''}
                Faqat yashirish kerak bo‘lsa, «Faol»ni o‘chiring. Bu amalni qaytarib bo‘lmaydi.
              </p>
              {del.isError && (
                <p className="-mt-3 mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {del.error?.response?.data?.error || del.error?.response?.data?.detail || 'O‘chirib bo‘lmadi. Qayta urinib ko‘ring.'}
                </p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setToDelete(null)} className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">Bekor</button>
                <button type="button" onClick={() => del.mutate(toDelete.id)} disabled={del.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60">
                  {del.isPending && <Loader2 size={13} className="animate-spin" />} O‘chirish
                </button>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
