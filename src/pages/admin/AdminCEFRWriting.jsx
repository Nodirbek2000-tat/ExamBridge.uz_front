/* Admin: CEFR multilevel Writing tests — list, preview, delete and JSON import. */
import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, ChevronDown, Copy, Crown, FileJson, FileText, Loader2, PenLine, Trash2, Upload } from 'lucide-react'
import api from '../../api/client'

const KIND = {
  FULL: { label: "To'liq test", cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  PART1: { label: 'Part 1 (1.1 + 1.2)', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  PART2: { label: 'Part 2 (essay)', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
}

const EXAMPLE = `{
  "title": "CEFR Writing Test 1",
  "is_premium": false,
  "situation": "You recently joined a sports club in your town. The club has sent its members a message asking what they think about its activities and timetable.",
  "task_1_1": "Write a letter to your friend who is also a member of the club. Tell your friend what you like about the club and what you would change. Write about 50 words.",
  "task_1_2": "Write a letter to the manager of the club. Say what you think about the activities and the timetable, and suggest how they could be improved. Write 120–150 words.",
  "part_2": "Some people believe that young people today spend too much time on their phones. To what extent do you agree or disagree? Give reasons and examples. Write 180–200 words."
}`

const EXAMPLE_PARTS = `[
  {
    "title": "Part 1 — New library",
    "situation": "A new library is opening in your neighbourhood...",
    "task_1_1": "Write to your friend ... Write about 50 words.",
    "task_1_2": "Write to the library manager ... Write 120–150 words."
  },
  {
    "title": "Part 2 — Online learning",
    "part_2": "Online lessons are better than lessons in a classroom. Do you agree? Write 180–200 words.",
    "time_limit": 35
  }
]`

const RULES = [
  ['"title"', 'majburiy — test nomi.'],
  ["To'liq test", '"situation" + "task_1_1" + "task_1_2" + "part_2".'],
  ['Faqat Part 1', '"situation" + "task_1_1" + "task_1_2" — 1.1 va 1.2 doim birga, bitta vaziyat asosida.'],
  ['Faqat Part 2', '"part_2" (essay).'],
  ['"time_limit"', "ixtiyoriy, daqiqada. Standart: to'liq 60, Part 1 25, Part 2 35."],
  ['"is_premium"', 'ixtiyoriy, true bo\'lsa faqat Premium ko\'radi.'],
  ['Bir nechta test', '[ {...}, {...} ] yoki {"tests": [ ... ]} ko\'rinishida.'],
  ['Xato bo\'lsa', "hech narsa yaratilmaydi va qaysi testda nima xato ekani aytiladi."],
  ['Ball', "avtomatik: 1.1 ≈50 so'z → 15 ball, 1.2 120–150 → 25, Part 2 180–200 → 35. Jami 75 (C1 65+, B2 51–64, B1 38–50)."],
]

function Row({ item, onDelete }) {
  const [open, setOpen] = useState(false)
  const k = KIND[item.kind] || KIND.FULL
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen(o => !o)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          <span className="min-w-0">
            <span className="block truncate font-bold text-gray-900">{item.title}</span>
            <span className="text-xs text-gray-400">#{item.id} · {new Date(item.created_at).toLocaleDateString()} · {item.time_limit} daq · {item.responses} ta javob</span>
          </span>
        </button>
        <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${k.cls}`}>{k.label}</span>
        {item.is_premium && <span className="flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-0.5 text-xs font-bold text-yellow-700"><Crown size={11} /> Premium</span>}
        <button type="button" onClick={() => onDelete(item)} title="O'chirish"
          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-sm leading-relaxed text-gray-700">
              {item.situation && <p><b className="text-amber-700">Situation:</b> {item.situation}</p>}
              {item.task11 && <p><b className="text-sky-700">Task 1.1:</b> {item.task11}</p>}
              {item.task12 && <p><b className="text-sky-700">Task 1.2:</b> {item.task12}</p>}
              {item.task2 && <p><b className="text-violet-700">Part 2:</b> {item.task2}</p>}
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
    try {
      parsed = JSON.parse(json.replace(/^\s*\/\/.*$/gm, ''))
    } catch {
      setStatus({ ok: false, msg: "JSON noto'g'ri yozilgan — qavs yoki vergulni tekshiring." })
      return
    }
    setLoading(true)
    try {
      const r = await api.post('/import/cefr/writing/', parsed)
      setStatus({ ok: true, msg: `${r.data.created} ta test qo'shildi: ${r.data.items.map(i => i.title).join(', ')}` })
      setJson('')
      onDone()
    } catch (e) {
      setStatus({ ok: false, msg: e.response?.data?.error || e.response?.data?.detail || 'Import bajarilmadi.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-800">Qoidalar</p>
          <dl className="space-y-2 text-sm">
            {RULES.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-2">
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
          <pre className="max-h-72 overflow-auto px-4 pb-4 font-mono text-[11px] leading-relaxed text-green-400 whitespace-pre-wrap">{EXAMPLE}</pre>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gray-950">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400">Alohida partlar (bir nechta test bitta JSON'da)</p>
          <pre className="max-h-60 overflow-auto px-4 pb-4 font-mono text-[11px] leading-relaxed text-green-400 whitespace-pre-wrap">{EXAMPLE_PARTS}</pre>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">JSON kiriting yoki fayldan yuklang</p>
        <textarea value={json} onChange={e => setJson(e.target.value)} spellCheck={false}
          placeholder="JSON shu yerga… (// izohlar qabul qilinadi)"
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
          {loading && <Loader2 size={14} className="animate-spin" />} Import qilish
        </button>
      </div>
    </div>
  )
}

export default function AdminCEFRWriting() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('list')
  const [toDelete, setToDelete] = useState(null)
  const key = ['admin-cefr-writing']
  const { data = [], isLoading, error } = useQuery({ queryKey: key, queryFn: () => api.get('/admin/cefr/writing/').then(r => r.data) })
  const del = useMutation({
    mutationFn: (id) => api.delete(`/admin/cefr/writing/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: key }); setToDelete(null) },
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100"><PenLine size={20} className="text-amber-600" /></div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">CEFR Writing</h2>
            <p className="text-xs text-gray-400">{data.length} ta test · multilevel formati (1.1, 1.2, Part 2)</p>
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
          {data.map(item => <Row key={item.id} item={item} onDelete={setToDelete} />)}
        </div>
      )}
      {tab === 'import' && <ImportTab onDone={() => { queryClient.invalidateQueries({ queryKey: key }); setTab('list') }} />}

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
