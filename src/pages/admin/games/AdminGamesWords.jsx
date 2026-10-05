/*
 * Admin → Games → So‘zlar — the word bank shared by Word Battle and Toby Run.
 *
 *   Ro‘yxat: filters, inline status / level / topic / picture / uz edit, picture preview, ▶ voice, full edit
 *   Import:  paste or upload the JSON → dry-run report (errors red, warnings amber) → Import
 *   Xulosa:  counts per level × topic, phrases per kind, "Ovozlarni tayyorlash", JSON export
 *
 *   POST  /api/games/words/admin/import/?dry_run=1
 *   GET   /api/games/words/admin/items/?kind=w|p&level=&topic=&status=&tag=&q=&page=
 *   PATCH /api/games/words/admin/items/<kind>/<id>/
 *   GET   /api/games/words/admin/export/?level=&topic=&kind=&status=&tag=
 *   GET   /api/games/words/admin/summary/
 *   GET/POST /api/games/words/admin/warm/
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  AlertCircle, AlertTriangle, AudioLines, BarChart3, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download,
  FileJson, ImageOff, Library, ListChecks, Loader2, Pencil, Play, Search, Square, Upload, X,
} from 'lucide-react'
import api from '../../../api/client'
import { ItemIcon } from '../../games/tobys-day/items'
import { ITEM_NAMES } from '../../games/tobys-day/world-items'
import { CHARACTERS, sayLine, stopVoice } from '../../../games/voice/voiceTts'

const PICTURES = new Set(ITEM_NAMES)
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']
const POS = ['noun', 'verb', 'adj', 'adv', 'phrase', 'other']
const KINDS = { echo: 'Takror', answer: 'Javob', fill: 'To‘ldir', twister: 'Tez ayt' }
const STATUS = {
  published: { label: 'Chop etilgan', short: 'Chop', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  reviewed: { label: 'Tekshirilgan', short: 'Tekshir.', cls: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  draft: { label: 'Qoralama', short: 'Qoralama', cls: 'border-gray-200 bg-gray-50 text-gray-500', dot: 'bg-gray-400' },
}
// mirrors vocabulary.bank.TOPICS (the summary endpoint sends the live list)
const TOPICS_FALLBACK = [
  ['metro', 'Metro'], ['bozor', 'Bozor'], ['park', 'Xiyobon'], ['home', 'Uy'], ['food', 'Ovqat'], ['school', 'Maktab'],
  ['city', 'Shahar'], ['travel', 'Sayohat'], ['health', 'Salomatlik'], ['feelings', 'His-tuyg‘u'], ['work', 'Ish'],
  ['nature', 'Tabiat'], ['general', 'Umumiy'],
]
const SUMMARY_KEY = ['admin-words-summary']
const ITEMS_KEY = 'admin-words-items'

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('ru-RU') : '—')
const errText = (e, fallback = 'Saqlanmadi') =>
  e?.response?.data?.error || e?.response?.data?.detail || (e?.response ? `${fallback} (${e.response.status})` : fallback)
const listText = (v) => (Array.isArray(v) ? v.join(', ') : '')
const textList = (s) => String(s || '').split(',').map(x => x.trim()).filter(Boolean)
const fade = (i = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.04, duration: 0.28, ease: 'easeOut' } })
const inputCls = 'h-9 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[13px] text-gray-800 outline-none transition-colors focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:opacity-60'

function useTopics(summary) {
  return useMemo(() => (summary?.topics?.length ? summary.topics.map(t => [t.slug, t.title]) : TOPICS_FALLBACK), [summary])
}

function useSummary() {
  return useQuery({ queryKey: SUMMARY_KEY, queryFn: () => api.get('/games/words/admin/summary/').then(r => r.data), staleTime: 20_000 })
}

/* ── small parts ──────────────────────────────────────────────────────────── */

function Picture({ name, size = 40 }) {
  if (name && PICTURES.has(name)) {
    return (
      <span className="flex flex-shrink-0 items-center justify-center rounded-xl bg-amber-50/70 ring-1 ring-amber-100" style={{ width: size, height: size }}>
        <ItemIcon name={name} size={Math.round(size * 0.86)} />
      </span>
    )
  }
  return (
    <span title={name ? `Rasm topilmadi: ${name}` : 'Rasm yo‘q'}
      className={`flex flex-shrink-0 items-center justify-center rounded-xl border border-dashed ${name ? 'border-amber-300 bg-amber-50 text-amber-500' : 'border-gray-200 text-gray-300'}`}
      style={{ width: size, height: size }}>
      {name ? <AlertTriangle size={size * 0.4} /> : <ImageOff size={size * 0.38} />}
    </span>
  )
}

function PlayButton({ text, voice, label = 'Tinglash' }) {
  const [on, setOn] = useState(false)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])
  const click = async () => {
    if (on) { stopVoice(); setOn(false); return }
    setOn(true)
    try { await sayLine(text, { voice }) } finally { if (alive.current) setOn(false) }
  }
  return (
    <button type="button" onClick={click} disabled={!text} aria-label={`${label}: ${text}`} title={`${label} (${voice})`}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${on ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}>
      {on ? <Square size={11} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
    </button>
  )
}

function Select({ value, onChange, options, label, className = '', disabled, tone = '' }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} aria-label={label} title={label}
      className={`h-9 cursor-pointer rounded-lg border px-2 text-[13px] font-medium outline-none transition-colors focus:ring-2 focus:ring-sky-100 disabled:cursor-wait disabled:opacity-60 ${tone || 'border-gray-200 bg-white text-gray-700 focus:border-sky-400'} ${className}`}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

function InlineText({ value, onCommit, label, placeholder, disabled, className = '', mono, list }) {
  const [v, setV] = useState(value || '')
  const [seen, setSeen] = useState(value)
  if (seen !== value) { setSeen(value); setV(value || '') }      // the saved value changed (a save, a refetch)
  const commit = () => { if (v.trim() !== (value || '')) onCommit(v.trim()) }
  return (
    <input value={v} onChange={e => setV(e.target.value)} onBlur={commit} list={list}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setV(value || ''); e.currentTarget.blur() } }}
      aria-label={label} placeholder={placeholder} disabled={disabled}
      className={`${inputCls} ${mono ? 'font-mono text-[12px]' : ''} ${className}`} />
  )
}

function Stat({ label, seen, ok }) {
  const pct = seen ? Math.round((ok / seen) * 100) : null
  const tone = pct == null ? 'text-gray-300' : pct >= 80 ? 'text-emerald-600' : pct >= 55 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="min-w-0 leading-tight" title={seen ? `${label}: ${ok} / ${seen} to‘g‘ri` : `${label}: hali yo‘q`}>
      <p className={`text-[13px] font-bold tabular-nums ${tone}`}>{pct == null ? '—' : `${pct}%`}</p>
      <p className="text-[10.5px] text-gray-400 tabular-nums">{label} · {fmt(seen)}</p>
    </div>
  )
}

/* ── picture picker (every Toby's Day drawing) ───────────────────────────── */

function PicturePicker({ value, onPick }) {
  const [q, setQ] = useState('')
  const box = useRef(null)
  useEffect(() => {
    const el = box.current?.querySelector('[aria-pressed="true"]')
    if (el && box.current) box.current.scrollTop = el.offsetTop - 8      // the box is `relative`: offsetTop is inside it
  }, [])                                             // only when it opens — not on every pick
  const names = ITEM_NAMES.filter(n => !q || n.includes(q.toLowerCase()))
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-2">
      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rasm qidirish…" className={`${inputCls} h-8 pl-7`} />
      </div>
      <div ref={box} className="relative grid max-h-44 grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-1 overflow-y-auto pr-1">
        <button type="button" onClick={() => onPick('')} title="Rasmsiz"
          className={`flex h-[52px] flex-col items-center justify-center rounded-lg text-[9.5px] text-gray-400 transition ${!value ? 'bg-white ring-2 ring-sky-400' : 'hover:bg-white'}`}>
          <ImageOff size={16} /> yo‘q
        </button>
        {names.map(n => (
          <button key={n} type="button" onClick={() => onPick(n)} title={n} aria-pressed={value === n}
            className={`flex h-[52px] flex-col items-center justify-center rounded-lg transition ${value === n ? 'bg-white ring-2 ring-sky-400' : 'hover:bg-white'}`}>
            <ItemIcon name={n} size={30} />
            <span className="w-full truncate px-0.5 text-center text-[9px] text-gray-400">{n}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── full edit ────────────────────────────────────────────────────────────── */

function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block text-[11.5px] font-semibold text-gray-500 ${className}`}>
      <span className="flex items-baseline justify-between gap-2">{label}{hint && <span className="font-normal text-gray-400">{hint}</span>}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

function wordForm(it) {
  return {
    word: it.word, uz: it.uz, pos: it.pos, level: it.level, topic: it.topic, picture: it.picture, status: it.status,
    definition: it.definition, example: it.example, speak: it.speak,
    say_also: listText(it.say_also), synonyms: listText(it.synonyms), antonyms: listText(it.antonyms),
    distractors: listText(it.distractors), tags: listText(it.tags),
  }
}

function phraseForm(it) {
  return {
    kind: it.kind, text: it.text, prompt: it.prompt, answer: it.answer, uz: it.uz, level: it.level, topic: it.topic,
    picture: it.picture, status: it.status, voice: it.voice, min_words: String(it.min_words ?? 0),
    accept: it.kind === 'answer' ? (it.accept || []).map(g => g.join(' + ')).join('\n') : listText(it.accept),
  }
}

function formToPatch(item, form) {
  const out = {}
  const lists = ['say_also', 'synonyms', 'antonyms', 'distractors', 'tags']
  for (const [k, v] of Object.entries(form)) {
    let val = v
    if (item.k === 'w' && lists.includes(k)) val = textList(v)
    else if (k === 'accept') {
      val = item.kind === 'answer' || form.kind === 'answer'
        ? String(v).split('\n').map(line => line.split('+').map(x => x.trim()).filter(Boolean)).filter(g => g.length)
        : textList(v)
    } else if (k === 'min_words') val = parseInt(v, 10) || 0
    else if (typeof v === 'string') val = v.trim()
    if (JSON.stringify(val) !== JSON.stringify(item[k] ?? (lists.includes(k) || k === 'accept' ? [] : ''))) out[k] = val
  }
  return out
}

function EditModal({ item, topics, onClose, onSaved }) {
  const isWord = item.k === 'w'
  const [form, setForm] = useState(() => (isWord ? wordForm(item) : phraseForm(item)))
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e }))
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async () => {
    const patch = formToPatch(item, form)
    if (!Object.keys(patch).length) { onClose(); return }
    setSaving(true); setErr('')
    try {
      const { data } = await api.patch(`/games/words/admin/items/${item.k}/${item.id}/`, patch)
      onSaved(data.item, data.warnings)
      onClose()
    } catch (e) {
      setErr(errText(e))
    } finally { setSaving(false) }
  }

  const topicOptions = [['', '—'], ...topics, ...(form.topic && !topics.some(([s]) => s === form.topic) ? [[form.topic, `${form.topic} (boshqa)`]] : [])]
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={onClose}>
      <Motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Tahrirlash"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
          <Picture name={form.picture} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-gray-900">{isWord ? form.word : (form.prompt || form.text)}</p>
            <p className="text-xs text-gray-400">{isWord ? 'So‘z' : `Ibora · ${KINDS[form.kind] || form.kind}`} · #{item.id}{item.source ? ` · ${item.source}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto px-5 py-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="grid content-start gap-3 sm:grid-cols-2">
            {isWord ? (
              <>
                <Field label="So‘z (inglizcha)"><input value={form.word} onChange={set('word')} className={inputCls} /></Field>
                <Field label="O‘zbekcha"><input value={form.uz} onChange={set('uz')} className={inputCls} /></Field>
                <Field label="Ta’rif" className="sm:col-span-2"><input value={form.definition} onChange={set('definition')} className={inputCls} /></Field>
                <Field label="Misol gap" hint="Word Battle'da bo‘shliq bo‘ladi" className="sm:col-span-2"><input value={form.example} onChange={set('example')} className={inputCls} /></Field>
                <Field label="Aytilsa ham qabul" hint="vergul bilan"><input value={form.say_also} onChange={set('say_also')} className={inputCls} placeholder="tickets, a ticket" /></Field>
                <Field label="Noto‘g‘ri variantlar" hint="≤ 6"><input value={form.distractors} onChange={set('distractors')} className={inputCls} /></Field>
                <Field label="Sinonimlar"><input value={form.synonyms} onChange={set('synonyms')} className={inputCls} /></Field>
                <Field label="Antonimlar"><input value={form.antonyms} onChange={set('antonyms')} className={inputCls} /></Field>
                <Field label="Teglar" hint="sat, kids"><input value={form.tags} onChange={set('tags')} className={inputCls} /></Field>
                <Field label="So‘z turkumi">
                  <Select value={form.pos} onChange={set('pos')} label="So‘z turkumi" className="w-full" options={[['', '—'], ...POS.map(p => [p, p])]} />
                </Field>
                <label className="flex items-center gap-2 text-[13px] text-gray-600 sm:col-span-2">
                  <input type="checkbox" checked={form.speak} onChange={set('speak')} className="h-4 w-4 accent-sky-500" />
                  Yakka so‘z sifatida aytishga beriladi (Toby Run)
                </label>
              </>
            ) : (
              <>
                <Field label="Turi">
                  <Select value={form.kind} onChange={set('kind')} label="Turi" className="w-full" options={Object.entries(KINDS).map(([k, l]) => [k, `${l} (${k})`])} />
                </Field>
                <Field label="Ovoz">
                  <Select value={form.voice} onChange={set('voice')} label="Ovoz" className="w-full" options={CHARACTERS.map(c => [c, c])} />
                </Field>
                {(form.kind === 'answer' || form.kind === 'fill') && (
                  <Field label={form.kind === 'answer' ? 'Savol' : 'Bo‘shliqli gap'} hint={form.kind === 'fill' ? '___ bilan' : ''} className="sm:col-span-2">
                    <input value={form.prompt} onChange={set('prompt')} className={inputCls} />
                  </Field>
                )}
                <Field label={form.kind === 'answer' ? 'Namuna javob' : form.kind === 'fill' ? 'To‘liq gap' : 'Gap'} className="sm:col-span-2">
                  <input value={form.text} onChange={set('text')} className={inputCls} />
                </Field>
                <Field label="O‘zbekcha" className="sm:col-span-2"><input value={form.uz} onChange={set('uz')} className={inputCls} /></Field>
                {form.kind === 'fill' && <Field label="Tushib qolgan qism"><input value={form.answer} onChange={set('answer')} className={inputCls} /></Field>}
                {form.kind === 'answer' && <Field label="Kamida so‘z"><input value={form.min_words} onChange={set('min_words')} inputMode="numeric" className={inputCls} /></Field>}
                {(form.kind === 'answer' || form.kind === 'fill') && (
                  <Field label="Qabul qilinadi" hint={form.kind === 'answer' ? 'har qatorda bitta guruh: go + to' : 'vergul bilan'} className="sm:col-span-2">
                    <textarea value={form.accept} onChange={set('accept')} rows={form.kind === 'answer' ? 3 : 1} className={`${inputCls} h-auto py-2 font-mono text-[12px]`} />
                  </Field>
                )}
              </>
            )}
          </div>
          <div className="grid content-start gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daraja"><Select value={form.level} onChange={set('level')} label="Daraja" className="w-full" options={LEVELS.map(l => [l, l])} /></Field>
              <Field label="Holat"><Select value={form.status} onChange={set('status')} label="Holat" className="w-full" options={Object.entries(STATUS).map(([k, s]) => [k, s.label])} /></Field>
            </div>
            <Field label="Mavzu"><Select value={form.topic} onChange={set('topic')} label="Mavzu" className="w-full" options={topicOptions} /></Field>
            <Field label="Rasm" hint={form.picture || 'yo‘q'}>
              <PicturePicker value={form.picture} onPick={(n) => setForm(f => ({ ...f, picture: n }))} />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          {err && <p className="mr-auto flex items-center gap-1.5 text-sm text-red-600"><AlertCircle size={14} /> {err}</p>}
          <button type="button" onClick={onClose} className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-gray-600 hover:bg-gray-50">Bekor</button>
          <button type="button" onClick={save} disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-bold text-white shadow-sm shadow-sky-200 hover:bg-sky-600 disabled:opacity-60">
            {saving && <Loader2 size={14} className="animate-spin" />} Saqlash
          </button>
        </div>
      </Motion.div>
    </div>
  )
}

/* ── items ────────────────────────────────────────────────────────────────── */

function ItemRow({ initial, topics, onEdit, onChanged }) {
  const [item, setItem] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState([])
  const [flash, setFlash] = useState(false)
  const [seen, setSeen] = useState(initial)
  if (seen !== initial) { setSeen(initial); setItem(initial) }   // a refetch brought a newer row
  const isWord = item.k === 'w'

  const save = async (patch) => {
    const prev = item
    setItem(it => ({ ...it, ...patch }))
    setBusy(true); setErr('')
    try {
      const { data } = await api.patch(`/games/words/admin/items/${item.k}/${item.id}/`, patch)
      setItem(data.item)
      setWarn(data.warnings || [])
      setFlash(true)
      setTimeout(() => setFlash(false), 1200)
      onChanged?.()
    } catch (e) {
      setItem(prev)
      setErr(errText(e))
    } finally { setBusy(false) }
  }

  const st = STATUS[item.status] || STATUS.draft
  const unknownPic = item.picture && !PICTURES.has(item.picture)
  const topicOptions = [['', '—'], ...topics, ...(item.topic && !topics.some(([s]) => s === item.topic) ? [[item.topic, `${item.topic}*`]] : [])]
  const spoken = isWord ? item.word : (item.prompt || item.text)

  return (
    <div className={`px-4 py-3 transition-colors sm:px-5 ${flash ? 'bg-emerald-50/50' : ''}`}>
      <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 xl:grid-cols-[40px_minmax(0,1.25fr)_minmax(0,1.15fr)_68px_118px_124px_128px_112px_32px]">
        <Picture name={item.picture} />
        <div className="flex min-w-0 items-center gap-2">
          <PlayButton text={spoken} voice={item.voice} />
          {isWord ? (
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-gray-900" title={spoken}>{spoken}</p>
              <p className="truncate text-[11.5px] text-gray-400" title={item.definition}>{[item.pos, item.definition].filter(Boolean).join(' · ') || '—'}</p>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-gray-900" title={spoken}>{spoken}</p>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11.5px] text-gray-400">
                <span className="flex-shrink-0 rounded bg-violet-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-violet-600">{KINDS[item.kind] || item.kind}</span>
                <span className="truncate" title={item.prompt ? item.text : item.voice}>{item.prompt ? item.text : `ovoz: ${item.voice}`}</span>
              </p>
            </div>
          )}
        </div>
        <button type="button" onClick={() => onEdit(item, setItem)} aria-label="To‘liq tahrirlash" title="To‘liq tahrirlash"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600 xl:order-last">
          <Pencil size={15} />
        </button>

        <div className="col-span-3 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1.6fr)_68px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:contents">
          <div className="col-span-2 sm:col-span-1">
            <InlineText value={item.uz} onCommit={(uz) => save({ uz })} label="O‘zbekcha" placeholder="o‘zbekcha…" disabled={busy}
              className={!item.uz ? 'border-amber-200 bg-amber-50/40' : ''} />
          </div>
          <Select value={item.level} onChange={(level) => save({ level })} label="Daraja" disabled={busy} options={LEVELS.map(l => [l, l])} />
          <Select value={item.topic} onChange={(topic) => save({ topic })} label="Mavzu" disabled={busy} options={topicOptions} className="min-w-0" />
          <InlineText value={item.picture} onCommit={(picture) => save({ picture: picture.toLowerCase() })} label="Rasm kaliti" placeholder="rasm…"
            disabled={busy} mono list="bank-pictures" className={unknownPic ? 'border-amber-300 bg-amber-50 text-amber-800' : ''} />
          <Select value={item.status} onChange={(status) => save({ status })} label="Holat" disabled={busy} tone={st.cls}
            options={Object.entries(STATUS).map(([k, s]) => [k, s.label])} className="min-w-0 font-semibold" />
        </div>
        <div className="col-span-3 flex items-center gap-4 xl:col-span-1">
          {isWord ? (
            <>
              <Stat label="aytish" seen={item.say_seen} ok={item.say_ok} />
              <Stat label="ma’no" seen={item.mean_seen} ok={item.mean_ok} />
            </>
          ) : <Stat label="aytish" seen={item.say_seen} ok={item.say_ok} />}
          {busy && <Loader2 size={14} className="animate-spin text-sky-500" />}
          {item.say_heard?.length > 0 && <span className="truncate text-[11px] text-gray-400 xl:hidden">eshitildi: {item.say_heard.join(', ')}</span>}
        </div>
      </div>
      {(err || warn.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 pl-[52px] text-[12px]">
          {err && <span className="flex items-center gap-1 text-red-600"><AlertCircle size={13} /> {err}</span>}
          {warn.map(w => <span key={w} className="flex items-center gap-1 text-amber-600"><AlertTriangle size={12} /> {w}</span>)}
        </div>
      )}
    </div>
  )
}

function ItemsTab({ summary, topics, onGoImport, initialQ = '', initialKind = 'w' }) {
  const qc = useQueryClient()
  const [kind, setKind] = useState(initialKind)
  const [level, setLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('')
  const [tag, setTag] = useState('')
  const [q, setQ] = useState(initialQ)
  const [search, setSearch] = useState(initialQ)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [q])
  const reset = (set) => (v) => { set(v); setPage(1) }      // a new filter starts from page 1

  const params = { kind, level: level || undefined, topic: topic || undefined, status: status || undefined, tag: kind === 'w' ? tag || undefined : undefined, q: search || undefined, page }
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [ITEMS_KEY, params],
    queryFn: () => api.get('/games/words/admin/items/', { params }).then(r => r.data),
    placeholderData: keepPreviousData,
  })
  const items = data?.items || []
  const tags = Object.keys(summary?.tags || {})
  const refreshSummary = () => qc.invalidateQueries({ queryKey: SUMMARY_KEY })
  const filtered = level || topic || status || tag || search

  return (
    <div className="space-y-4">
      <datalist id="bank-pictures">{ITEM_NAMES.map(n => <option key={n} value={n} />)}</datalist>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-gray-100 bg-gray-50 p-1" role="tablist" aria-label="Tur">
          {[['w', 'So‘zlar', summary?.words?.total], ['p', 'Iboralar', summary?.phrases?.total]].map(([k, l, n]) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => reset(setKind)(k)}
              className={`h-8 rounded-lg px-3.5 text-xs font-bold transition-all ${kind === k ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              {l} {n != null && <span className="ml-1 font-semibold text-gray-400 tabular-nums">{fmt(n)}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {['', ...LEVELS].map(lv => (
            <button key={lv || 'all'} type="button" onClick={() => reset(setLevel)(lv)}
              className={`h-8 rounded-lg px-2.5 text-xs font-bold transition ${level === lv ? 'bg-sky-500 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:border-sky-300'}`}>
              {lv || 'Barchasi'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <Select value={topic} onChange={reset(setTopic)} label="Mavzu" options={[['', 'Barcha mavzular'], ...topics]} className="sm:w-44" />
        <Select value={status} onChange={reset(setStatus)} label="Holat" options={[['', 'Barcha holatlar'], ...Object.entries(STATUS).map(([k, s]) => [k, s.label])]} className="sm:w-44" />
        {kind === 'w' && tags.length > 0 && (
          <Select value={tag} onChange={reset(setTag)} label="Teg" options={[['', 'Barcha teglar'], ...tags.map(t => [t, `#${t} · ${summary.tags[t]}`])]} className="sm:w-40" />
        )}
        <div className="relative col-span-2 sm:ml-auto sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={kind === 'w' ? 'So‘z, o‘zbekcha yoki ta’rif…' : 'Gap, savol yoki o‘zbekcha…'}
            className={`${inputCls} pl-8`} aria-label="Qidirish" />
        </div>
      </div>

      <Motion.section {...fade(1)} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="hidden grid-cols-[40px_minmax(0,1.25fr)_minmax(0,1.15fr)_68px_118px_124px_128px_112px_32px] gap-x-3 border-b border-gray-50 bg-gray-50/70 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 xl:grid">
          <span />
          <span>{kind === 'w' ? 'So‘z' : 'Ibora'}</span>
          <span>O‘zbekcha</span>
          <span>Daraja</span>
          <span>Mavzu</span>
          <span>Rasm</span>
          <span>Holat</span>
          <span>To‘g‘ri</span>
          <span />
        </div>
        {error && <p className="flex items-center gap-2 p-5 text-sm text-red-600"><AlertCircle size={15} /> Ro‘yxat yuklanmadi: {errText(error, 'xato')}</p>}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>
        ) : !items.length && !error ? (
          <div className="px-5 py-16 text-center text-sm text-gray-400">
            {filtered ? 'Bu filtrlar bo‘yicha hech narsa topilmadi.' : (
              <>Bank hali bo‘sh. <button type="button" onClick={onGoImport} className="font-semibold text-sky-600 hover:underline">Import</button> orqali qo‘shing.</>
            )}
          </div>
        ) : (
          <div className={`divide-y divide-gray-50 transition-opacity ${isFetching ? 'opacity-70' : ''}`}>
            {items.map(it => (
              <ItemRow key={`${it.k}${it.id}`} initial={it} topics={topics} onChanged={refreshSummary}
                onEdit={(item, setRow) => setEditing({ item, setRow })} />
            ))}
          </div>
        )}
        {data && data.count > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-gray-50 px-5 py-3 text-xs text-gray-500">
            <span className="tabular-nums">{fmt(data.count)} ta · {data.page} / {data.pages} sahifa</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Oldingi sahifa"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-sky-300 hover:text-sky-600 disabled:opacity-40">
                <ChevronLeft size={15} />
              </button>
              <button type="button" onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages} aria-label="Keyingi sahifa"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-sky-300 hover:text-sky-600 disabled:opacity-40">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </Motion.section>

      <AnimatePresence>
        {editing && (
          <EditModal item={editing.item} topics={topics} onClose={() => setEditing(null)}
            onSaved={(item) => { editing.setRow(item); refreshSummary(); qc.invalidateQueries({ queryKey: [ITEMS_KEY] }) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── import ───────────────────────────────────────────────────────────────── */

const SAMPLE = `{
  "version": 1,
  "source": "runner-a1a2-v1",
  "defaults": { "level": "A1", "topic": "metro", "status": "published" },
  "words": [
    { "word": "ticket", "uz": "chipta", "pos": "noun", "picture": "ticket",
      "definition": "a small card that shows you paid to travel",
      "example": "I need a ticket for the metro.",
      "say_also": ["tickets"], "distractors": ["chair", "window", "coat"] },
    { "word": "expensive", "uz": "qimmat", "pos": "adj", "level": "A2", "topic": "bozor",
      "antonyms": ["cheap"], "synonyms": ["costly"], "tags": ["kids"] }
  ],
  "phrases": [
    { "kind": "echo", "text": "Excuse me, where is the exit?",
      "uz": "Kechirasiz, chiqish qayerda?", "level": "A2", "voice": "grandma" },
    { "kind": "answer", "prompt": "Where are you going?", "text": "I'm going to the bazaar.",
      "accept": [["going"], ["go", "to"]], "min_words": 3, "uz": "Qayerga ketyapsiz?", "level": "B1" },
    { "kind": "fill", "text": "I'm looking for my keys.", "prompt": "I'm ___ my keys.",
      "answer": "looking for", "uz": "Kalitlarimni qidiryapman.", "level": "B1", "topic": "home" }
  ]
}`

const GUIDE = [
  ['words[]', 'word (1–3 so‘z, harf / - / \'), uz, pos, level, topic, picture, definition, example, say_also, synonyms, antonyms, distractors, tags, speak'],
  ['phrases[]', 'kind: echo · answer (prompt + accept) · fill (prompt ___ + answer) · twister; text, uz, level, topic, voice'],
  ['defaults', 'level, topic, status, pos, speak, tags, voice — qatorda berilmasa shu olinadi'],
  ['status', 'draft → reviewed → published. O‘yinlarga faqat published beriladi'],
  ['Takror', 'so‘z — word bo‘yicha, ibora — kind + level + matn bo‘yicha yangilanadi. Qatorda yo‘q maydon o‘zgarmaydi'],
  ['Ovoz', 'haqiqiy importdan keyin yangi chop etilgan qatorlarning ovozi avtomatik tayyorlanadi'],
]

function pictureIssues(payload) {
  const out = []
  const check = (rows, kind) => (Array.isArray(rows) ? rows : []).forEach((r, i) => {
    const pic = r && typeof r === 'object' && typeof r.picture === 'string' ? r.picture.trim().toLowerCase() : ''
    if (pic && !PICTURES.has(pic)) out.push({ index: i, kind, key: r.word || r.prompt || r.text || '', warning: `rasm topilmadi: «${pic}» — Toby’s Day rasmlaridan birini tanlang`, page: true })
  })
  check(payload?.words, 'word')
  check(payload?.phrases, 'phrase')
  return out
}

function Counts({ title, c, dry }) {
  const cells = [
    ['yangi', c.created, 'text-emerald-600'],
    [dry ? 'o‘zgaradi' : 'yangilandi', c.updated, 'text-sky-600'],
    ['o‘zgarmagan', c.unchanged, 'text-gray-500'],
  ]
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {cells.map(([l, n, cls]) => (
          <div key={l}><p className={`text-xl font-black tabular-nums ${cls}`}>{fmt(n)}</p><p className="text-[11px] text-gray-400">{l}</p></div>
        ))}
      </div>
    </div>
  )
}

function IssueTable({ rows, tone }) {
  const red = tone === 'red'
  if (!rows.length) return <p className="px-4 py-6 text-center text-sm text-gray-400">{red ? 'Xato yo‘q' : 'Ogohlantirish yo‘q'}</p>
  const where = (r) => (r.kind === 'file' ? 'defaults' : `${r.kind === 'word' ? 'words' : 'phrases'}[${r.index}]`)
  const msg = (r) => (
    <>{r.error || r.warning}{r.page && <span className="ml-1.5 rounded bg-white px-1 text-[10px] text-gray-400 ring-1 ring-gray-100">sahifa</span>}</>
  )
  return (
    <div className="max-h-[420px] overflow-auto">
      <ul className="divide-y divide-gray-50 sm:hidden">
        {rows.map((r, i) => (
          <li key={i} className={`px-4 py-2.5 text-[12.5px] ${red ? 'bg-red-50/40' : 'bg-amber-50/30'}`}>
            <p className="flex min-w-0 items-baseline gap-2">
              <span className="flex-shrink-0 font-mono text-[11px] text-gray-400">{where(r)}</span>
              <span className="truncate font-semibold text-gray-800">{r.key || '—'}</span>
            </p>
            <p className={`mt-0.5 ${red ? 'text-red-700' : 'text-amber-700'}`}>{msg(r)}</p>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-[12.5px] sm:table">
        <thead className="sticky top-0 bg-white text-[10.5px] uppercase tracking-wide text-gray-400">
          <tr><th className="px-4 py-2 font-semibold">Qator</th><th className="px-2 py-2 font-semibold">Kalit</th><th className="px-2 py-2 font-semibold">{red ? 'Xato' : 'Ogohlantirish'}</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((r, i) => (
            <tr key={i} className={red ? 'bg-red-50/40' : 'bg-amber-50/30'}>
              <td className="whitespace-nowrap px-4 py-2 font-mono text-[11.5px] text-gray-500">{where(r)}</td>
              <td className="max-w-[180px] truncate px-2 py-2 font-semibold text-gray-800" title={r.key}>{r.key || '—'}</td>
              <td className={`px-2 py-2 ${red ? 'text-red-700' : 'text-amber-700'}`}>{msg(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Report({ report, extra }) {
  const [tab, setTab] = useState(report.error_count ? 'errors' : 'warnings')
  const warnings = [...extra, ...report.warnings]
  const dry = report.dry_run
  return (
    <Motion.div {...fade(0)} className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
      <div className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold ${dry ? 'text-gray-700' : 'bg-emerald-50 text-emerald-700'}`}>
        {dry ? <ListChecks size={16} className="text-sky-500" /> : <CheckCircle2 size={16} />}
        {dry ? 'Tekshiruv natijasi — hali hech narsa yozilmadi' : 'Import tugadi'}
      </div>
      <div className="grid gap-2 px-4 sm:grid-cols-2">
        <Counts title="So‘zlar" c={report.words} dry={dry} />
        <Counts title="Iboralar" c={report.phrases} dry={dry} />
      </div>
      {!dry && report.warm && (
        <p className="flex items-center gap-2 px-4 pt-3 text-xs text-gray-500">
          <AudioLines size={14} className="text-violet-500" />
          {report.warm.started ? `${fmt(report.warm.lines)} ta yangi ovoz tayyorlanmoqda (Xulosa bo‘limida kuzating).`
            : report.warm.running ? 'Ovozlar boshqa ish bilan tayyorlanmoqda — keyinroq Xulosa bo‘limidan qayta ishga tushiring.'
              : 'Yangi ovoz kerak emas.'}
        </p>
      )}
      <div className="mt-3 flex gap-1 px-4">
        {[['errors', `Xatolar ${fmt(report.error_count)}`, 'red'], ['warnings', `Ogohlantirishlar ${fmt(report.warning_count + extra.length)}`, 'amber']].map(([k, l, c]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`h-8 rounded-t-lg px-3 text-xs font-bold transition ${tab === k ? (c === 'red' ? 'bg-white text-red-600' : 'bg-white text-amber-600') : 'text-gray-400 hover:text-gray-600'}`}>
            {l}
          </button>
        ))}
      </div>
      <div className="bg-white">
        {tab === 'errors' ? <IssueTable rows={report.errors} tone="red" /> : <IssueTable rows={warnings} tone="amber" />}
        {(tab === 'errors' ? report.error_count > report.errors.length : report.warning_count > report.warnings.length) && (
          <p className="border-t border-gray-50 px-4 py-2 text-[11.5px] text-gray-400">Faqat birinchi 500 tasi ko‘rsatildi.</p>
        )}
      </div>
    </Motion.div>
  )
}

function ImportTab({ onImported }) {
  const [text, setText] = useState('')
  const [report, setReport] = useState(null)
  const [checkedText, setCheckedText] = useState(null)
  const [extra, setExtra] = useState([])
  const [fail, setFail] = useState('')
  const [busy, setBusy] = useState('')
  const [copied, setCopied] = useState(false)
  const fileRef = useRef()

  const parse = () => {
    try { return JSON.parse(text) } catch (e) {
      setFail(`JSON noto‘g‘ri: ${e.message.replace(/^JSON\.parse: /, '')}`)
      return null
    }
  }
  const run = async (dry) => {
    setFail('')
    const payload = parse()
    if (!payload) return
    setBusy(dry ? 'check' : 'import')
    try {
      const { data } = await api.post(`/games/words/admin/import/${dry ? '?dry_run=1' : ''}`, payload)
      setReport(data)
      setExtra(pictureIssues(payload))
      setCheckedText(dry ? text : null)
      if (!dry) onImported()
    } catch (e) {
      setReport(null)
      setFail(errText(e, 'Import bajarilmadi'))
    } finally { setBusy('') }
  }
  const readFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 2 * 1024 * 1024) { setFail('Fayl 2 MB dan katta — bo‘lib yuklang.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => { setText(String(ev.target.result || '')); setReport(null); setFail('') }
    reader.readAsText(f)
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(SAMPLE); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* blocked */ }
  }
  const canImport = checkedText === text && report?.dry_run && (report.words.created + report.words.updated + report.phrases.created + report.phrases.updated) > 0
  const rows = useMemo(() => {
    try { const p = JSON.parse(text); return (p?.words?.length || 0) + (p?.phrases?.length || 0) } catch { return null }
  }, [text])

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">JSON — matnni joylang yoki fayl tanlang</p>
          {rows != null && <span className="text-xs text-gray-400 tabular-nums">{fmt(rows)} qator · {fmt(new Blob([text]).size / 1024 | 0)} KB</span>}
        </div>
        <textarea value={text} onChange={e => { setText(e.target.value); setFail('') }} spellCheck={false} aria-label="Import JSON"
          placeholder='{ "version": 1, "words": [ … ], "phrases": [ … ] }'
          className="min-h-[260px] w-full resize-y rounded-2xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs leading-relaxed text-gray-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 text-sm text-gray-500 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600">
            <Upload size={15} /> .json fayl
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={readFile} />
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" onClick={() => run(true)} disabled={!text.trim() || Boolean(busy)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 text-sm font-bold text-sky-600 hover:bg-sky-50 disabled:opacity-50">
              {busy === 'check' ? <Loader2 size={15} className="animate-spin" /> : <ListChecks size={15} />} Tekshirish
            </button>
            <button type="button" onClick={() => run(false)} disabled={!canImport || Boolean(busy)}
              title={canImport ? '' : 'Avval «Tekshirish» bosing'}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-bold text-white shadow-sm shadow-sky-200 hover:bg-sky-600 disabled:bg-sky-300 disabled:shadow-none">
              {busy === 'import' ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import qilish
            </button>
          </div>
        </div>
        {fail && <p className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={16} className="mt-0.5 flex-shrink-0" /> {fail}</p>}
        {report && <Report key={`${report.dry_run}${report.error_count}${report.warning_count}`} report={report} extra={extra} />}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-bold text-gray-900">Qo‘llanma</p>
          <dl className="space-y-2.5 text-[12.5px]">
            {GUIDE.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
                <dt className="font-mono text-[11.5px] font-bold text-sky-700">{k}</dt>
                <dd className="leading-relaxed text-gray-600">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[11.5px] leading-relaxed text-gray-500">
            Namunalar: <span className="font-mono">games_import_samples/runner_bank_a1a2.json</span> (Toby Run, A1–A2) va
            <span className="font-mono"> bank_draft_a2_c1.json</span> (Word Battle, qoralama).
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gray-950">
          <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-400">
            <span className="flex items-center gap-1.5"><FileJson size={13} /> Namuna</span>
            <div className="flex gap-1">
              <button type="button" onClick={() => { setText(SAMPLE); setReport(null) }} className="rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">Joylash</button>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Olindi' : 'Nusxa'}
              </button>
            </div>
          </div>
          <pre className="max-h-72 overflow-auto px-4 pb-4 font-mono text-[11px] leading-relaxed text-sky-200">{SAMPLE}</pre>
        </div>
      </div>
    </div>
  )
}

/* ── summary ──────────────────────────────────────────────────────────────── */

const WARM_STATE = {
  queued: { label: 'Navbatda', cls: 'bg-sky-50 text-sky-700' },
  running: { label: 'Tayyorlanmoqda', cls: 'bg-sky-50 text-sky-700' },
  done: { label: 'Tayyor', cls: 'bg-emerald-50 text-emerald-700' },
  failed: { label: 'To‘xtadi', cls: 'bg-red-50 text-red-700' },
}

function Matrix({ title, rows, levels, grid, rowKey, rowTitle }) {
  const cell = {}
  const totals = {}
  for (const g of grid) {
    const k = `${g[rowKey] || ''}|${g.level || ''}`
    cell[k] = cell[k] || { pub: 0, other: 0 }
    if (g.status === 'published') cell[k].pub += g.n
    else cell[k].other += g.n
    totals[g.level || ''] = (totals[g.level || ''] || 0) + (g.status === 'published' ? g.n : 0)
  }
  const max = Math.max(1, ...Object.values(cell).map(c => c.pub))
  const shown = rows.filter(r => levels.some(l => cell[`${r}|${l}`]))
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <span className="text-[11px] text-gray-400">chop etilgan <span className="text-gray-300">+ qoralama</span></span>
      </div>
      {!shown.length ? <p className="py-10 text-center text-sm text-gray-400">Hali yo‘q</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[330px] table-fixed text-[12.5px] sm:text-[13px]">
            <colgroup><col className="w-[27%]" />{levels.map(l => <col key={l} />)}<col className="w-[12%]" /></colgroup>
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2 text-left font-semibold sm:px-5" />
                {levels.map(l => <th key={l} className="px-2 py-2 text-center font-semibold">{l}</th>)}
                <th className="px-3 py-2 text-right font-semibold sm:px-4">Jami</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map(r => {
                const rowTotal = levels.reduce((a, l) => a + (cell[`${r}|${l}`]?.pub || 0), 0)
                return (
                  <tr key={r}>
                    <td className="truncate px-3 py-2 font-semibold text-gray-700 sm:px-5" title={rowTitle(r)}>{rowTitle(r)}</td>
                    {levels.map(l => {
                      const c = cell[`${r}|${l}`]
                      const a = c ? 0.08 + 0.5 * (c.pub / max) : 0
                      return (
                        <td key={l} className="px-1 py-1 text-center">
                          {c ? (
                            <span className="inline-flex w-full max-w-[56px] flex-col items-center rounded-lg px-1 py-1" style={{ background: `rgba(14,165,233,${a.toFixed(3)})` }}>
                              <span className={`font-bold tabular-nums ${c.pub / max > 0.6 ? 'text-white' : 'text-gray-800'}`}>{fmt(c.pub)}</span>
                              {c.other > 0 && <span className={`text-[10px] tabular-nums ${c.pub / max > 0.6 ? 'text-white/80' : 'text-gray-400'}`}>+{fmt(c.other)}</span>}
                            </span>
                          ) : <span className="text-gray-200">·</span>}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2 text-right font-bold text-gray-900 tabular-nums sm:px-4">{fmt(rowTotal)}</td>
                  </tr>
                )
              })}
              <tr className="bg-gray-50/70">
                <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:px-5">Jami</td>
                {levels.map(l => <td key={l} className="px-1 py-2 text-center font-bold text-gray-700 tabular-nums">{fmt(totals[l] || 0)}</td>)}
                <td className="px-3 py-2 text-right font-black text-gray-900 tabular-nums sm:px-4">{fmt(Object.values(totals).reduce((a, b) => a + b, 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function WarmCard({ summary, topics }) {
  const qc = useQueryClient()
  const [level, setLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)
  const { data: st } = useQuery({
    queryKey: ['admin-words-warm'],
    queryFn: () => api.get('/games/words/admin/warm/').then(r => r.data),
    initialData: summary?.warm?.status,
    refetchInterval: (q) => (['queued', 'running'].includes(q.state.data?.state) ? 1500 : false),
  })
  const running = ['queued', 'running'].includes(st?.state)
  const total = st?.total || 0
  const pct = total ? Math.min(100, Math.round(((st?.done || 0) / total) * 100)) : 0
  const ui = WARM_STATE[st?.state]
  useEffect(() => { if (st?.state === 'done') qc.invalidateQueries({ queryKey: SUMMARY_KEY }) }, [st?.state, qc])

  const start = async () => {
    setError(''); setPosting(true)
    try {
      const { data } = await api.post('/games/words/admin/warm/', { level: level || undefined, topic: topic || undefined })
      if (data.nothing) setError('Bu tanlovdagi hamma ovoz allaqachon tayyor.')
      qc.setQueryData(['admin-words-warm'], data.nothing ? st : data)
    } catch (e) {
      setError(e?.response?.status === 409 ? 'Tayyorlash allaqachon ketmoqda.' : errText(e, 'Boshlab bo‘lmadi'))
    } finally { setPosting(false) }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><AudioLines size={20} /></div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900">Ovozlarni tayyorlash</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">
            Chop etilgan so‘z va iboralar ovozi oldindan bir marta yoziladi — o‘quvchi kutmaydi. Tayyorlari o‘tkazib yuboriladi.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 px-5">
        <div className="rounded-xl bg-gray-50 px-3 py-2.5">
          <p className="text-[11px] text-gray-400">Jami qator</p>
          <p className="text-xl font-black text-gray-900 tabular-nums">{fmt(summary?.warm?.lines)}</p>
        </div>
        <div className={`rounded-xl px-3 py-2.5 ${summary?.warm?.unwarmed ? 'bg-amber-50' : 'bg-emerald-50'}`}>
          <p className="text-[11px] text-gray-400">Hali yozilmagan</p>
          <p className={`text-xl font-black tabular-nums ${summary?.warm?.unwarmed ? 'text-amber-700' : 'text-emerald-700'}`}>{fmt(summary?.warm?.unwarmed)}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-5 py-4">
        <Select value={level} onChange={setLevel} label="Daraja" options={[['', 'Barcha darajalar'], ...LEVELS.map(l => [l, l])]} className="flex-1" />
        <Select value={topic} onChange={setTopic} label="Mavzu" options={[['', 'Barcha mavzular'], ...topics]} className="flex-1" />
        <button type="button" onClick={start} disabled={running || posting}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-bold text-white shadow-sm shadow-violet-200 transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-violet-300 disabled:shadow-none sm:w-auto">
          {running || posting ? <Loader2 size={15} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          {running ? 'Tayyorlanmoqda…' : 'Tayyorlash'}
        </button>
      </div>
      {(error || (st && st.state && st.state !== 'idle')) && (
        <div className="space-y-2 border-t border-gray-50 px-5 py-3.5">
          {error && <p className="flex items-center gap-2 text-xs text-amber-700"><AlertCircle size={14} /> {error}</p>}
          {st && st.state && st.state !== 'idle' && (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {ui && <span className={`rounded-md px-2 py-0.5 font-bold ${ui.cls}`}>{ui.label}</span>}
                <span className="font-semibold text-gray-700 tabular-nums">{fmt(st.done)} / {fmt(total)} <span className="font-normal text-gray-400">({pct}%)</span></span>
                <span className="text-gray-400 tabular-nums">tayyor edi {fmt(st.cached)} · yangi {fmt(st.made)}{st.failed ? <span className="text-red-500"> · xato {fmt(st.failed)}</span> : null}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-[width] duration-700 ${st.state === 'failed' ? 'bg-red-400' : st.state === 'done' ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${pct}%` }} />
              </div>
              {st.state === 'failed' && st.error && <p className="text-xs text-red-600">{st.error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ExportCard() {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const download = async (key, params) => {
    setBusy(key); setErr('')
    try {
      const r = await api.get('/games/words/admin/export/', { params, responseType: 'blob' })
      const name = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || 'bank.json'
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url; a.download = name
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (e) { setErr(errText(e, 'Yuklab bo‘lmadi')) } finally { setBusy('') }
  }
  const opts = [
    ['all', 'Hammasi', {}],
    ['w', 'So‘zlar', { kind: 'w' }],
    ['p', 'Iboralar', { kind: 'p' }],
    ['draft', 'Qoralamalar', { status: 'draft' }],
    ['sat', '#sat', { tag: 'sat', kind: 'w' }],
  ]
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Download size={20} /></div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">Eksport (JSON)</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-400">Import bilan bir xil format — tahrirlab qayta yuklasangiz, faqat o‘zgargan qatorlar yangilanadi.</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {opts.map(([k, l, p]) => (
          <button key={k} type="button" onClick={() => download(k, p)} disabled={Boolean(busy)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:border-sky-300 hover:text-sky-600 disabled:opacity-50">
            {busy === k ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} {l}
          </button>
        ))}
      </div>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  )
}

function SummaryTab({ summary, topics, loading }) {
  if (loading || !summary) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-sky-500" /></div>
  const topicTitle = Object.fromEntries(topics)
  const topicRows = [...topics.map(([s]) => s), ...new Set(summary.words.grid.map(g => g.topic).filter(t => !topicTitle[t]))]
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <Matrix title="So‘zlar: mavzu × daraja" rows={topicRows} levels={LEVELS} grid={summary.words.grid} rowKey="topic"
          rowTitle={(t) => (t ? topicTitle[t] || `${t} (boshqa)` : 'Mavzusiz')} />
        <Matrix title="Iboralar: tur × daraja" rows={Object.keys(KINDS)} levels={LEVELS} grid={summary.phrases.by_kind} rowKey="kind"
          rowTitle={(k) => `${KINDS[k]} · ${k}`} />
      </div>
      <div className="space-y-5">
        <WarmCard summary={summary} topics={topics} />
        <ExportCard />
      </div>
    </div>
  )
}

/* ── page ─────────────────────────────────────────────────────────────────── */

const TABS = [['items', 'Ro‘yxat', ListChecks], ['import', 'Import', FileJson], ['summary', 'Xulosa', BarChart3]]

export default function AdminGamesWords() {
  const qc = useQueryClient()
  // ?q=…&kind=w|p — links from other admin pages (e.g. Runner's hardest words) open the item in the list
  const [searchParams] = useSearchParams()
  const linkQ = searchParams.get('q') || ''
  const linkKind = searchParams.get('kind') === 'p' ? 'p' : 'w'
  const [tab, setTab] = useState(() => {
    if (linkQ) return 'items'
    try { return sessionStorage.getItem('admin-words-tab') || 'items' } catch { return 'items' }
  })
  useEffect(() => { try { sessionStorage.setItem('admin-words-tab', tab) } catch { /* private mode */ } }, [tab])
  useEffect(() => () => stopVoice(), [])
  const { data: summary, isLoading } = useSummary()
  const topics = useTopics(summary)
  const w = summary?.words
  const p = summary?.phrases
  const sat = summary?.tags?.sat || 0
  const cards = [
    ['So‘zlar', w?.total, w ? `${fmt(w.by_status.published || 0)} chop etilgan · ${fmt(w.by_status.draft || 0)} qoralama` : ''],
    ['Iboralar', p?.total, p ? `${fmt(p.by_status.published || 0)} chop etilgan` : ''],
    ['SAT so‘zlari', summary ? sat : undefined, '#sat teg'],
    ['Ovoz kerak', summary?.warm?.unwarmed, summary ? `${fmt(summary.warm.lines)} qatordan` : ''],
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Library size={20} /></div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-gray-900">So‘zlar banki</h2>
            <p className="text-xs text-gray-400">Word Battle va Toby Run uchun bitta bank: import, tahrir, ovozlar</p>
          </div>
        </div>
        <div className="flex w-full rounded-xl border border-gray-100 bg-gray-50 p-1 sm:w-auto" role="tablist" aria-label="Bo‘lim">
          {TABS.map(([k, label, icon]) => {
            const Icon = icon
            return (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition-all sm:flex-none ${tab === k ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                <Icon size={14} /> {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value, sub], i) => (
          <Motion.div key={label} {...fade(i)} className="min-w-0 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-sm sm:p-4">
            <p className="text-xs font-medium text-gray-400">{label}</p>
            <p className="mt-1 text-xl font-black leading-tight text-gray-900 tabular-nums sm:text-2xl">
              {value === undefined ? <span className="inline-block h-6 w-12 animate-pulse rounded bg-gray-100" /> : fmt(value)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-400">{sub}</p>
          </Motion.div>
        ))}
      </div>

      {tab === 'items' && <ItemsTab summary={summary} topics={topics} onGoImport={() => setTab('import')} initialQ={linkQ} initialKind={linkKind} />}
      {tab === 'import' && (
        <ImportTab onImported={() => { qc.invalidateQueries({ queryKey: SUMMARY_KEY }); qc.invalidateQueries({ queryKey: [ITEMS_KEY] }) }} />
      )}
      {tab === 'summary' && <SummaryTab summary={summary} topics={topics} loading={isLoading} />}
    </div>
  )
}
