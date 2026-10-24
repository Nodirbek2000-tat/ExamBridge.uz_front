/**
 * AdminFullMocks — build IELTS / CEFR full mocks.
 * Routes: /admin-panel/ielts/full-mocks, /admin-panel/cefr/full-mocks
 *
 * A full mock is the four sections in real exam order. Each section is its
 * own test: pick one that was already imported, or paste its JSON here and
 * import it on the spot (same importers as the section pages). Listening
 * needs audio, so it can be uploaded right in the slot. Save keeps a draft;
 * Publish checks that every section is ready and shows it to students.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, ArrowLeft, BookOpen, Check, Crown, Eye, EyeOff, FileJson, Headphones, Loader2, Mic, PenLine,
  Plus, Search, Trash2, Upload, X,
} from 'lucide-react'
import api from '../../api/client'
import { useCanWriteAdmin } from './AdminWriteContext'

const SLOTS = {
  ielts: [
    { key: 'listening', label: 'Listening', icon: Headphones, minutes: 30, importUrl: '/import/ielts/listening/',
      hint: 'Full listening test — JSON with "sections" (4 parts). Upload the audio after importing.' },
    { key: 'reading', label: 'Reading', icon: BookOpen, minutes: 60, importUrl: '/import/ielts/reading/',
      hint: 'Full reading test — JSON with "parts" (3 passages).' },
    { key: 'writing1', label: 'Writing Task 1', icon: PenLine, minutes: 20, importUrl: '/import/ielts/writing/',
      hint: 'One Task 1 — "task_type": 1. Add the chart image on the Writing page.' },
    { key: 'writing2', label: 'Writing Task 2', icon: PenLine, minutes: 40, importUrl: '/import/ielts/writing/',
      hint: 'One Task 2 essay — "task_type": 2.' },
    { key: 'speaking', label: 'Speaking', icon: Mic, minutes: 14, importUrl: '/import/ielts/speaking/',
      hint: 'A full speaking mock — "test_type": "MOCK" with all three parts.' },
  ],
  cefr: [
    { key: 'listening', label: 'Listening', icon: Headphones, minutes: 35, importUrl: '/import/cefr/', importType: 'listening',
      hint: 'Full listening mock — JSON with "parts". Upload the audio after importing.' },
    { key: 'reading', label: 'Reading', icon: BookOpen, minutes: 60, importUrl: '/import/cefr/', importType: 'reading',
      hint: 'Full reading mock — JSON with "parts".' },
    { key: 'writing', label: 'Writing', icon: PenLine, minutes: 60, importUrl: '/import/cefr/writing/',
      hint: 'A full writing paper — Task 1.1, 1.2 and Part 2.' },
    { key: 'speaking', label: 'Speaking', icon: Mic, minutes: 15, importUrl: '/import/cefr/speaking/',
      hint: 'A full speaking test — Parts 1.1, 1.2, 2 and 3. Add the Part 1.2 pictures on the Speaking page.' },
  ],
}
const SECTION_PAGE = {
  ielts: { listening: 'listening', reading: 'reading', writing1: 'writing', writing2: 'writing', speaking: 'speaking' },
  cefr: { listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking' },
}

const INPUT = 'w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100'

/* ── one section slot ───────────────────────────────────────── */
function Slot({ exam, slot, index, value, onChange, canWrite }) {
  const qc = useQueryClient()
  const [mode, setMode] = useState(null)   // null | 'choose' | 'import'
  const [q, setQ] = useState('')
  const [json, setJson] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const Icon = slot.icon

  const optKey = ['full-mock-options', exam, slot.key]
  const { data: options = [], isLoading } = useQuery({
    queryKey: optKey,
    queryFn: () => api.get(`/admin/${exam}/full-mocks/options/?section=${slot.key}`).then((r) => r.data),
  })
  const picked = options.find((o) => o.id === value)
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? options.filter((o) => `${o.title} ${o.meta}`.toLowerCase().includes(t)) : options
  }, [options, q])

  const runImport = async () => {
    setMsg(null)
    let parsed
    try { parsed = JSON.parse(json) } catch { return setMsg({ ok: false, text: 'JSON is not valid.' }) }
    setBusy(true)
    const before = new Set(options.map((o) => o.id))
    try {
      await api.post(slot.importUrl, slot.importType ? { ...parsed, type: slot.importType } : parsed)
      const fresh = await qc.fetchQuery({ queryKey: optKey, queryFn: () => api.get(`/admin/${exam}/full-mocks/options/?section=${slot.key}`).then((r) => r.data), staleTime: 0 })
      const created = fresh.find((o) => !before.has(o.id))
      if (created) {
        onChange(created.id)
        setMode(null)
        setJson('')
        setMsg({ ok: true, text: `Imported “${created.title}” and picked it.` })
      } else {
        setMsg({ ok: false, text: 'Imported, but it is not a full test for this section (check the JSON shape).' })
      }
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Import failed.' })
    } finally {
      setBusy(false)
    }
  }

  const uploadAudio = async (file) => {
    if (!file || !picked) return
    setBusy(true)
    setMsg(null)
    const form = new FormData()
    form.append('audio', file)
    try {
      await api.post(`/admin/${exam}/tests/${picked.id}/audio/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      await qc.invalidateQueries({ queryKey: optKey })
      setMsg({ ok: true, text: 'Audio uploaded.' })
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'Upload failed.' })
    } finally {
      setBusy(false)
    }
  }

  const needsAudio = picked?.issues?.some((i) => i.startsWith('Audio missing'))

  return (
    <section className="bg-white rounded-2xl border border-slate-200/70">
      <div className="p-5 flex items-start gap-4">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${picked ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {picked ? <Check size={18} /> : <Icon size={18} />}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="font-semibold text-slate-900">{slot.label}</h3>
            <span className="text-xs text-slate-400">{slot.minutes} min</span>
          </div>
          {picked ? (
            <div className="mt-1">
              <p className="text-sm font-medium text-slate-700">{picked.title} <span className="text-slate-400 font-normal">· {picked.meta}</span></p>
              {picked.issues.map((i) => (
                <p key={i} className="mt-1 inline-flex items-center gap-1 mr-3 text-xs font-medium text-amber-700"><AlertTriangle size={12} />{i}</p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-400">{value ? 'This test was removed — pick another one.' : 'No test picked yet.'}</p>
          )}
        </div>
        {canWrite && (
          <div className="flex gap-1 flex-shrink-0">
            {[{ k: 'choose', icon: Search, label: 'Choose' }, { k: 'import', icon: FileJson, label: 'Import' }].map(({ k, icon: I, label }) => (
              <button key={k} type="button" onClick={() => setMode(mode === k ? null : k)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  mode === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                <I size={13} />{label}
              </button>
            ))}
          </div>
        )}
      </div>

      {canWrite && needsAudio && (
        <label className="mx-5 mb-4 flex items-center gap-3 p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 cursor-pointer hover:bg-amber-50">
          <Upload size={16} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Upload the listening audio (one file for the whole test)</span>
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => uploadAudio(e.target.files[0])} />
          {busy && <Loader2 size={14} className="ml-auto animate-spin text-amber-600" />}
        </label>
      )}

      <AnimatePresence initial={false}>
        {mode && canWrite && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100">
            {mode === 'choose' ? (
              <div className="p-4">
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200/70 mb-2">
                  <Search size={14} className="text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${slot.label.toLowerCase()} tests`}
                    className="flex-1 bg-transparent text-sm outline-none" />
                </label>
                <ul className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {isLoading ? <li className="py-6 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-300" /></li>
                    : shown.length === 0 ? <li className="py-6 text-center text-sm text-slate-400">Nothing imported yet — use Import.</li>
                    : shown.map((o) => (
                      <li key={o.id}>
                        <button type="button" onClick={() => { onChange(o.id); setMode(null) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 ${o.id === value ? 'bg-slate-50' : ''}`}>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-slate-800 truncate">{o.title}</span>
                            <span className="block text-[11px] text-slate-400">{o.meta}{o.issues.length ? ` · ${o.issues.join(' · ')}` : ''}</span>
                          </span>
                          {o.id === value && <Check size={15} className="text-emerald-600" />}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <p className="text-xs text-slate-500">{slot.hint} Same JSON as on the{' '}
                  <a href={`/admin-panel/${exam}/${SECTION_PAGE[exam][slot.key]}`} target="_blank" rel="noreferrer" className="font-semibold text-slate-700 underline">{SECTION_PAGE[exam][slot.key]} page</a>.</p>
                <textarea rows={8} value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false}
                  placeholder='{ "title": "…" }' className={`${INPUT} font-mono text-xs`} />
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer hover:border-slate-300">
                    <Upload size={13} />From file
                    <input type="file" accept=".json,application/json" className="hidden"
                      onChange={async (e) => { const f = e.target.files[0]; if (f) setJson(await f.text()) }} />
                  </label>
                  <button type="button" onClick={runImport} disabled={busy || !json.trim()}
                    className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <FileJson size={13} />}Import & pick
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {msg && <p className={`px-5 pb-4 text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>}
    </section>
  )
}

/* ── editor ─────────────────────────────────────────────────── */
function Editor({ exam, mock, onClose, canWrite }) {
  const qc = useQueryClient()
  const slots = SLOTS[exam]
  const [title, setTitle] = useState(mock?.title || '')
  const [description, setDescription] = useState(mock?.description || '')
  const [premium, setPremium] = useState(!!mock?.is_premium)
  const [picked, setPicked] = useState(() =>
    Object.fromEntries(slots.map((s) => [s.key, mock?.sections?.[s.key]?.id || null])))
  const [problems, setProblems] = useState([])
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async (publish) => {
    setErr('')
    setProblems([])
    if (!title.trim()) return setErr('Give the full mock a title.')
    setSaving(true)
    const body = { title, description, is_premium: premium, sections: picked }
    try {
      let saved = mock
        ? (await api.patch(`/admin/${exam}/full-mocks/${mock.id}/`, body)).data
        : (await api.post(`/admin/${exam}/full-mocks/`, body)).data
      if (publish != null) saved = (await api.patch(`/admin/${exam}/full-mocks/${saved.id}/`, { is_published: publish })).data
      qc.invalidateQueries({ queryKey: ['admin-full-mocks', exam] })
      onClose()
    } catch (e) {
      setErr(e.response?.data?.error || 'Could not save.')
      setProblems(e.response?.data?.problems || [])
      qc.invalidateQueries({ queryKey: ['admin-full-mocks', exam] })
    } finally {
      setSaving(false)
    }
  }

  const done = slots.filter((s) => picked[s.key]).length
  return (
    <div className="max-w-3xl">
      <button onClick={onClose} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700"><ArrowLeft size={14} />All full mocks</button>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{exam.toUpperCase()} full mock</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{mock ? 'Edit full mock' : 'New full mock'}</h1>
          <p className="mt-1 text-sm text-slate-500">{done} of {slots.length} sections ready · students take them in this order</p>
        </div>
        {mock && <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${mock.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{mock.is_published ? 'Published' : 'Draft'}</span>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 space-y-3 mb-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title — e.g. IELTS Academic Full Mock 1" className={INPUT} disabled={!canWrite} />
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short note for students (optional)" className={`${INPUT} resize-none`} disabled={!canWrite} />
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} disabled={!canWrite} className="rounded" />
          <Crown size={14} className="text-amber-500" />Premium only
        </label>
      </div>

      <div className="space-y-3">
        {slots.map((s, i) => (
          <Slot key={s.key} exam={exam} slot={s} index={i} value={picked[s.key]} canWrite={canWrite}
            onChange={(id) => setPicked((p) => ({ ...p, [s.key]: id }))} />
        ))}
      </div>

      {(err || problems.length > 0) && (
        <div className="mt-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
          {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}
          {problems.map((p) => <p key={p} className="mt-1 text-sm text-rose-700">• {p}</p>)}
        </div>
      )}

      {canWrite && (
        <div className="sticky bottom-0 mt-5 -mx-1 px-1 py-4 bg-gradient-to-t from-slate-50 via-slate-50 flex flex-wrap gap-2 justify-end">
          <button onClick={() => save(null)} disabled={saving}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50">Save draft</button>
          {mock?.is_published && (
            <button onClick={() => save(false)} disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-50">Unpublish</button>
          )}
          <button onClick={() => save(true)} disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}{mock?.is_published ? 'Save' : 'Save & publish'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── list ───────────────────────────────────────────────────── */
export default function AdminFullMocks({ exam = 'ielts' }) {
  const qc = useQueryClient()
  const canWrite = useCanWriteAdmin()
  const [editing, setEditing] = useState(null)   // null | 'new' | mock
  const slots = SLOTS[exam]

  const { data: mocks = [], isLoading } = useQuery({
    queryKey: ['admin-full-mocks', exam],
    queryFn: () => api.get(`/admin/${exam}/full-mocks/`).then((r) => r.data),
  })
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/admin/${exam}/full-mocks/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-full-mocks', exam] }),
  })
  const togglePublish = useMutation({
    mutationFn: (m) => api.patch(`/admin/${exam}/full-mocks/${m.id}/`, { is_published: !m.is_published }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['admin-full-mocks', exam] }),
    onError: (e) => window.alert((e.response?.data?.problems || [e.response?.data?.error || 'Could not publish']).join('\n')),
  })

  if (editing) {
    return <Editor key={editing === 'new' ? 'new' : editing.id} exam={exam} mock={editing === 'new' ? null : editing}
      canWrite={canWrite} onClose={() => setEditing(null)} />
  }

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{exam.toUpperCase()}</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Full Mocks</h1>
          <p className="mt-1 text-sm text-slate-500">Real exam rehearsal: {slots.map((s) => s.label).join(' → ')}.</p>
        </div>
        {canWrite && (
          <button onClick={() => setEditing('new')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700">
            <Plus size={15} />New full mock
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
      ) : mocks.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/70">
          <p className="font-semibold text-slate-600">No full mocks yet</p>
          <p className="mt-1 text-sm text-slate-400">Create one and pick (or import) a test for each section.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {mocks.map((m) => (
            <article key={m.id} className="bg-white rounded-2xl border border-slate-200/70 p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setEditing(m)} className="text-left min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate hover:underline">{m.title}</h3>
                  <p className="text-xs text-slate-400">{m.total_minutes} min{m.is_premium ? ' · Premium' : ''}</p>
                </button>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold flex-shrink-0 ${m.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {m.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <ol className="mt-3 space-y-1">
                {slots.map((s, i) => (
                  <li key={s.key} className="flex items-center gap-2 text-xs">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center ${m.sections[s.key] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {m.sections[s.key] ? <Check size={9} /> : <span className="text-[9px]">{i + 1}</span>}
                    </span>
                    <span className="font-medium text-slate-600 w-28 flex-shrink-0">{s.label}</span>
                    <span className="truncate text-slate-400">{m.sections[s.key]?.title || 'not picked'}</span>
                  </li>
                ))}
              </ol>
              {canWrite && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1">
                  <button onClick={() => setEditing(m)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">Edit</button>
                  <button onClick={() => togglePublish.mutate(m)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100">
                    {m.is_published ? <><EyeOff size={12} />Unpublish</> : <><Eye size={12} />Publish</>}
                  </button>
                  <button onClick={() => window.confirm(`Delete "${m.title}"? The section tests stay.`) && remove.mutate(m.id)}
                    className="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {!canWrite && <p className="mt-6 inline-flex items-center gap-1.5 text-xs text-slate-400"><X size={12} />View only</p>}
    </div>
  )
}
