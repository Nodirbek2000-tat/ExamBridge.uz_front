/**
 * CenterTests — the center's own IELTS / CEFR tests.
 * Route: /center/:centerId/tests
 *
 * Admins and teachers import tests with the same JSON as ExamBridge's admin
 * panel (full mocks or single parts), add listening audio and pictures, and
 * delete them. The tests show up for the center's students in the normal
 * exam pages, next to ExamBridge's — unless the director switches
 * ExamBridge's tests off, then students see only the center's own.
 * Ordinary users never see a center's tests.
 */
import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle, BookOpen, Check, ChevronDown, Copy, FileJson, Globe2, Headphones, Image as ImageIcon, Loader2, Mic,
  PenLine, Plus, Trash2, Upload, X,
} from 'lucide-react'
import api from '../../api/client'
import { CEFR_EXAMPLES, IELTS_EXAMPLES } from '../../data/importExamples'
import { Card, Empty, PageHeader, PrimaryButton } from './ui'

const SECTIONS = [
  { key: 'reading', label: 'Reading', icon: BookOpen },
  { key: 'listening', label: 'Listening', icon: Headphones },
  { key: 'writing', label: 'Writing', icon: PenLine },
  { key: 'speaking', label: 'Speaking', icon: Mic },
]
const EXAMPLE = {
  'ielts-reading': IELTS_EXAMPLES.reading, 'ielts-listening': IELTS_EXAMPLES.listening,
  'ielts-writing': IELTS_EXAMPLES.writing, 'ielts-speaking': IELTS_EXAMPLES.speaking,
  'cefr-reading': CEFR_EXAMPLES.reading, 'cefr-listening': CEFR_EXAMPLES.listening,
  'cefr-writing': `${CEFR_EXAMPLES.writing}\n\n// Part tests (only 1.1 + 1.2 or only Part 2):\n${CEFR_EXAMPLES.writing_parts}`,
  'cefr-speaking': CEFR_EXAMPLES.speaking,
}
const SLOT_LABEL = { p12a: 'Part 1.2 picture 1', p12b: 'Part 1.2 picture 2', p2: 'Part 2 picture' }

/* ── a file button that uploads straight away ───────────────── */
function UploadButton({ label, accept, onFile, busy, tone = 'amber' }) {
  const cls = tone === 'amber'
    ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
  return (
    <label className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${cls}`}>
      {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}{label}
      <input type="file" accept={accept} className="hidden" onChange={(e) => { const f = e.target.files[0]; e.target.value = ''; if (f) onFile(f) }} />
    </label>
  )
}

function useMedia(centerId, kind) {
  const qc = useQueryClient()
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const upload = async (item, field, file, slot) => {
    setBusy(`${item.type}-${item.id}-${slot || field}`)
    setErr('')
    const form = new FormData()
    form.append(field, file)
    try {
      await api.post(`/centers/${centerId}/content/${item.type}/${item.id}/media/${slot ? `?slot=${slot}` : ''}`, form,
        { headers: { 'Content-Type': 'multipart/form-data' } })
      qc.invalidateQueries({ queryKey: ['center-content', centerId, kind] })
    } catch (e) {
      setErr(e.response?.data?.error || 'Upload failed')
    } finally {
      setBusy(null)
    }
  }
  return { upload, busy, err }
}

/* ── list of the center's tests for one section ─────────────── */
function ContentList({ centerId, kind, data, canManage }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(null)
  const media = useMedia(centerId, kind)
  const remove = useMutation({
    mutationFn: (item) => api.delete(`/centers/${centerId}/content/${item.type}/${item.id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['center-content', centerId, kind] }),
  })
  const del = (item) => window.confirm(`Delete "${item.title}"? Students' results for it go too.`) && remove.mutate(item)
  const isListening = kind.endsWith('listening')

  if (!data.mocks.length && !data.items.length) {
    return <Empty icon={FileJson} title="No tests here yet" text={canManage ? 'Import your first one with the same JSON format as ExamBridge.' : 'Admins and teachers add tests here.'} />
  }

  return (
    <div className="divide-y divide-slate-100">
      {media.err && <p className="px-5 py-3 text-sm text-rose-600">{media.err}</p>}
      {data.mocks.map((m) => (
        <div key={`m${m.id}`}>
          <div className="px-5 py-3.5 flex items-center gap-3">
            <button onClick={() => setOpen(open === m.id ? null : m.id)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
              <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold flex-shrink-0">FULL MOCK</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900 truncate">{m.title}</span>
                <span className="block text-xs text-slate-400">{m.parts.length} parts · {m.parts.reduce((n, p) => n + p.questions, 0)} questions{m.meta ? ` · ${m.meta}` : ''}</span>
              </span>
              <ChevronDown size={15} className={`text-slate-300 transition-transform ${open === m.id ? 'rotate-180' : ''}`} />
            </button>
            {isListening && (m.audio
              ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} />Audio</span>
              : canManage && <UploadButton label="Add audio" accept="audio/*" busy={media.busy === `${m.type}-${m.id}-audio`} onFile={(f) => media.upload(m, 'audio', f)} />)}
            {canManage && <button onClick={() => del(m)} title="Delete" className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>}
          </div>
          {open === m.id && (
            <ul className="pb-3 pl-14 pr-5 space-y-1">
              {m.parts.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-12 text-slate-400">Part {p.number}</span>
                  <span className="flex-1 truncate">{p.title}</span>
                  <span className="text-slate-400">{p.questions} q</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {data.items.map((it) => (
        <div key={`i${it.type}${it.id}`} className="px-5 py-3.5 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{it.title}</p>
            <p className="text-xs text-slate-400">{it.meta}{it.questions != null ? ` · ${it.questions} questions` : ''}{it.attempts ? ` · ${it.attempts} attempts` : ''}</p>
          </div>
          {it.audio === true && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check size={13} />Audio</span>}
          {canManage && it.audio === false && (
            <UploadButton label="Add audio" accept="audio/*" busy={media.busy === `${it.type}-${it.id}-audio`} onFile={(f) => media.upload(it, 'audio', f)} />
          )}
          {canManage && it.type === 'ielts-writing' && it.meta.startsWith('Task 1') && (
            <UploadButton label={it.image ? 'Replace chart' : 'Add chart'} tone={it.needs_image ? 'amber' : 'plain'} accept="image/*"
              busy={media.busy === `${it.type}-${it.id}-image`} onFile={(f) => media.upload(it, 'image', f)} />
          )}
          {canManage && it.type === 'cefr-speaking' && it.slots?.map((slot) => (
            <UploadButton key={slot} label={SLOT_LABEL[slot]} tone={slot === 'p2' ? 'plain' : 'amber'} accept="image/*"
              busy={media.busy === `${it.type}-${it.id}-${slot}`} onFile={(f) => media.upload(it, 'image', f, slot)} />
          ))}
          {canManage && <button onClick={() => del(it)} title="Delete" className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>}
        </div>
      ))}
    </div>
  )
}

/* ── import panel — the admin panel's layout: format guide | your JSON ── */
function ImportPanel({ centerId, exam, section, onClose }) {
  const qc = useQueryClient()
  const kind = `${exam}-${section}`
  const [json, setJson] = useState('')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyExample = async () => {
    try { await navigator.clipboard.writeText(EXAMPLE[kind]); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* select it by hand */ }
  }

  const run = async () => {
    setMsg(null)
    let parsed
    // like the admin panel: whole-line // comments are allowed (the examples use them)
    try { parsed = JSON.parse(json.replace(/^\s*\/\/.*$/gm, '')) } catch { return setMsg({ ok: false, text: 'Invalid JSON — check for syntax errors (a missing comma or quote).' }) }
    setBusy(true)
    try {
      const body = exam === 'cefr' && (section === 'reading' || section === 'listening') ? { ...parsed, type: section } : parsed
      const { data } = await api.post(`/centers/${centerId}/content/import/${kind}/`, body)
      qc.invalidateQueries({ queryKey: ['center-content', centerId, kind] })
      const parts = data?.part_count ? ` · ${data.part_count} parts` : data?.section_count ? ` · ${data.section_count} sections` : ''
      setJson('')
      setMsg({ ok: true, text: `Imported successfully${parts}.${section === 'listening' ? ' Now add the audio.' : ' Students can see it now.'}` })
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || e.response?.data?.detail || 'Import failed — compare it with the format guide.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/30 z-40" onClick={onClose} />
      <motion.aside initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 h-full w-full max-w-6xl bg-slate-50 shadow-2xl z-50 flex flex-col">
        <header className="px-6 py-5 bg-white border-b border-slate-200/70 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Import {exam.toUpperCase()} {section}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Full mocks and single parts — exactly the format ExamBridge uses. Lines starting with // are ignored.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </header>
        <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-5 p-6 overflow-y-auto lg:overflow-hidden">
          {/* Format guide */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Format guide</p>
              <button onClick={copyExample} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex-1 min-h-[300px] bg-slate-950 rounded-2xl p-4 overflow-auto">
              <pre className="text-[11px] text-emerald-300 font-mono leading-relaxed whitespace-pre">{EXAMPLE[kind]}</pre>
            </div>
          </div>
          {/* Your JSON */}
          <div className="flex flex-col gap-3 min-h-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paste or upload JSON</p>
            <textarea value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false}
              placeholder="Paste your JSON here… (// comments are allowed)"
              className="flex-1 min-h-[260px] w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 resize-none" />
            <label className="flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer transition">
              <Upload size={15} /> Upload .json file
              <input type="file" accept=".json,application/json" className="hidden"
                onChange={async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) setJson(await f.text()) }} />
            </label>
            {msg && <p className={`p-3 rounded-xl text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{msg.text}</p>}
            <PrimaryButton className="w-full" icon={busy ? Loader2 : FileJson} disabled={busy || !json.trim()} onClick={run}>Import</PrimaryButton>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

/* ── director's switch ──────────────────────────────────────── */
function SiteSwitch({ centerId, value, canChange }) {
  const qc = useQueryClient()
  const [on, setOn] = useState(value)
  const save = useMutation({
    mutationFn: (v) => api.patch(`/centers/${centerId}/settings/`, { show_site_mocks: v }),
    onMutate: (v) => setOn(v),
    onError: () => setOn(value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['center-dashboard', centerId] }),
  })
  return (
    <Card className="p-5 mb-5 flex items-center gap-4">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}><Globe2 size={19} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900">ExamBridge tests for our students</p>
        <p className="text-xs text-slate-500">{on
          ? "On — students see ExamBridge's tests and ours."
          : 'Off — students see only our own tests.'}{!canChange && ' Only the director changes this.'}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} disabled={!canChange || save.isPending} onClick={() => save.mutate(!on)}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 disabled:opacity-60 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
      </button>
    </Card>
  )
}

export default function CenterTests() {
  const { centerId, myRole, center } = useOutletContext()
  const [exam, setExam] = useState('ielts')
  const [section, setSection] = useState('reading')
  const [importing, setImporting] = useState(false)
  const kind = `${exam}-${section}`

  const { data, isLoading } = useQuery({
    queryKey: ['center-content', centerId, kind],
    queryFn: () => api.get(`/centers/${centerId}/content/?kind=${kind}`).then((r) => r.data),
  })
  const canManage = !!data?.can_manage

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader eyebrow="Our tests" title="Tests"
        subtitle="Add your own IELTS and CEFR tests. Your students find them in the normal test pages."
        action={canManage && <PrimaryButton icon={Plus} onClick={() => setImporting(true)}>Import {section}</PrimaryButton>} />

      {center && <SiteSwitch key={String(center.show_site_mocks)} centerId={centerId} value={center.show_site_mocks !== false}
        canChange={myRole === 'director' || myRole === 'staff'} />}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/60 rounded-xl">
          {['ielts', 'cefr'].map((e) => (
            <button key={e} onClick={() => setExam(e)}
              className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all ${exam === e ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {e.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {SECTIONS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setSection(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                section === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-white'}`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading || !data
          ? <div className="py-16 flex justify-center"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
          : <ContentList centerId={centerId} kind={kind} data={data} canManage={canManage} />}
      </Card>
      {section === 'listening' && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400"><AlertTriangle size={12} />A listening test needs its audio before students can take it.</p>
      )}
      {exam === 'cefr' && section === 'speaking' && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-400"><ImageIcon size={12} />Part 1.2 needs both pictures before the test is shown to students.</p>
      )}

      <AnimatePresence>
        {importing && <ImportPanel centerId={centerId} exam={exam} section={section} onClose={() => setImporting(false)} />}
      </AnimatePresence>
    </div>
  )
}
