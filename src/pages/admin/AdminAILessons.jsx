import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ExternalLink, FileText, GraduationCap, Link2, Play, Plus, Save, Search, Trash2, Type, Upload, X,
} from 'lucide-react'
import api from '../../api/client'
import LessonJob from './AdminLessonJob'
import LessonQuestions from './AdminLessonQuestions'
import LessonSteps from './AdminLessonSteps'
import { isLessonBusy } from './lessonStatus'

const SUBJECTS = ['SAT', 'IELTS', 'CEFR', 'GENERAL']
const SECTIONS = [
  { key: 'general', label: 'General' },
  { key: 'math', label: 'Math' },
  { key: 'reading_writing', label: 'Reading & Writing' },
  { key: 'reading', label: 'Reading' },
  { key: 'listening', label: 'Listening' },
  { key: 'writing', label: 'Writing' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'grammar', label: 'Grammar' },
]
const DURATIONS = [10, 15, 20]
const LANGUAGES = [{ key: 'uz', label: "O'zbekcha" }, { key: 'en', label: 'English' }]
// With the Azure engine the gender decides: female → Madina, male → Sardor (native Uzbek).
const VOICES = [
  { key: 'coral', label: 'Coral (female, warm)' },
  { key: 'nova', label: 'Nova (female)' },
  { key: 'sage', label: 'Sage (female, calm)' },
  { key: 'shimmer', label: 'Shimmer (female)' },
  { key: 'ash', label: 'Ash (male)' },
  { key: 'onyx', label: 'Onyx (male, deep)' },
  { key: 'echo', label: 'Echo (male)' },
]
const STATUS = {
  DRAFT: { label: 'Draft', cls: 'bg-gray-100 text-gray-600' },
  GENERATING: { label: 'Generating', cls: 'bg-sky-100 text-sky-700' },
  REVIEW: { label: 'In review', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', cls: 'bg-violet-100 text-violet-700' },
  VOICING: { label: 'Recording voice', cls: 'bg-sky-100 text-sky-700' },
  PUBLISHED: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
  FAILED: { label: 'Failed', cls: 'bg-red-100 text-red-700' },
}
const SOURCE_TABS = [
  { key: 'TEXT', label: 'Text', icon: <Type size={13} /> },
  { key: 'FILE', label: 'File', icon: <Upload size={13} /> },
  { key: 'LINK', label: 'Link', icon: <Link2 size={13} /> },
]
const SOURCE_ICON = { TEXT: Type, FILE: FileText, LINK: Link2 }
const EMPTY_LESSON = {
  title: '', subject: 'SAT', section: 'general', language: 'en', duration_minutes: 10, level: '', voice: 'coral', brief: '',
}

const JOB_POLL_MS = 3000
const inputCls = 'w-full px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-400'
const errorOf = (e) => e?.response?.data?.error || e?.response?.data?.detail || e.message

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.DRAFT
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

function LessonFields({ form, onChange }) {
  const set = (key) => (e) => onChange({ ...form, [key]: e.target.value })
  return (
    <div className="space-y-4">
      <Field label="Topic">
        <input value={form.title} onChange={set('title')} maxLength={200} className={inputCls} placeholder="e.g. IELTS Writing Task 2: opinion essays" />
      </Field>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Subject">
          <select value={form.subject} onChange={set('subject')} className={inputCls}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={form.section} onChange={set('section')} className={inputCls}>
            {SECTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Length">
          <select value={form.duration_minutes} onChange={set('duration_minutes')} className={inputCls}>
            {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
          </select>
        </Field>
        <Field label="Language">
          <select value={form.language} onChange={set('language')} className={inputCls}>
            {LANGUAGES.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Level">
          <input value={form.level} onChange={set('level')} maxLength={30} className={inputCls} placeholder="e.g. B2, Band 6+, SAT 1200+" />
        </Field>
        <Field label="Teacher's voice">
          <select value={form.voice} onChange={set('voice')} className={inputCls}>
            {VOICES.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </Field>
      </div>
      <Field label="What the lesson must cover">
        <textarea value={form.brief} onChange={set('brief')} rows={5} className={inputCls} placeholder="Key points, how to explain them, what to practise" />
      </Field>
    </div>
  )
}

function NewLessonModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_LESSON)
  const create = useMutation({
    mutationFn: () => api.post('/admin/ai-lessons/', form).then((r) => r.data),
    onSuccess: onCreated,
  })

  return (
    <Motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <Motion.div
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-label="New lesson"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">New lesson</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto"><LessonFields form={form} onChange={setForm} /></div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {create.error && <p className="text-sm text-red-500 mr-auto">{errorOf(create.error)}</p>}
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700">Cancel</button>
          <button
            type="button"
            disabled={!form.title.trim() || create.isPending}
            onClick={() => create.mutate()}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create lesson'}
          </button>
        </div>
      </Motion.div>
    </Motion.div>
  )
}

function AddSource({ lessonId, onAdded }) {
  const [kind, setKind] = useState('TEXT')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [inputKey, setInputKey] = useState(0)

  const add = useMutation({
    mutationFn: () => {
      if (kind !== 'FILE') {
        return api.post(`/admin/ai-lessons/${lessonId}/sources/`, { kind, title, text, url })
      }
      const fd = new FormData()
      fd.append('kind', kind)
      fd.append('title', title)
      fd.append('file', file)
      return api.post(`/admin/ai-lessons/${lessonId}/sources/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      setTitle('')
      setText('')
      setUrl('')
      setFile(null)
      setInputKey((k) => k + 1)
      onAdded()
    },
  })

  const ready = (kind === 'TEXT' && text.trim()) || (kind === 'LINK' && url.trim()) || (kind === 'FILE' && file)

  return (
    <div className="p-4 rounded-xl bg-gray-50/70 border border-gray-100 space-y-3">
      <div className="flex gap-1" role="group" aria-label="Source type">
        {SOURCE_TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              kind === key ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={`${inputCls} bg-white`} placeholder="Name (optional)" />

      {kind === 'TEXT' && (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className={`${inputCls} bg-white`} placeholder="Paste rules, notes, sample answers…" />
      )}
      {kind === 'LINK' && (
        <input value={url} onChange={(e) => setUrl(e.target.value)} type="url" className={`${inputCls} bg-white`} placeholder="https://…" />
      )}
      {kind === 'FILE' && (
        <div>
          <input
            key={inputKey}
            type="file"
            accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-sky-50 file:text-sky-700 file:font-semibold"
          />
          <p className="text-[11px] text-gray-400 mt-1">PDF, DOCX, TXT, MD or an image, up to 20 MB.</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {add.error && <p className="text-xs text-red-500 mr-auto">{errorOf(add.error)}</p>}
        <button
          type="button"
          disabled={!ready || add.isPending}
          onClick={() => add.mutate()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold disabled:opacity-50"
        >
          <Plus size={14} /> {add.isPending ? 'Adding…' : 'Add source'}
        </button>
      </div>
    </div>
  )
}

function SourceRow({ source, onDelete, deleting }) {
  const Icon = SOURCE_ICON[source.kind] || FileText
  const href = source.file || source.url
  return (
    <li className="py-3 flex items-start gap-3">
      <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 truncate">{source.title}</p>
        {source.text && <p className="text-xs text-gray-500 line-clamp-2 whitespace-pre-line">{source.text}</p>}
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-600 hover:underline">
            Open <ExternalLink size={11} />
          </a>
        )}
      </div>
      <button
        type="button"
        aria-label={`Delete ${source.title}`}
        disabled={deleting}
        onClick={onDelete}
        className="p-1.5 text-gray-300 hover:text-red-500 disabled:opacity-50 transition-colors"
      >
        <Trash2 size={15} />
      </button>
    </li>
  )
}

function LessonEditor({ lessonId, onBack }) {
  const { data: lesson, isLoading, error } = useQuery({
    queryKey: ['admin-ai-lesson', lessonId],
    queryFn: () => api.get(`/admin/ai-lessons/${lessonId}/`).then((r) => r.data),
    refetchInterval: (query) => (isLessonBusy(query.state.data) ? JOB_POLL_MS : false),
  })

  if (isLoading) return <div className="h-40 bg-gray-50 rounded-2xl animate-pulse" />
  if (error) return <p className="text-sm text-red-500">Failed to load the lesson: {errorOf(error)}</p>
  return <LessonForm lesson={lesson} onBack={onBack} />
}

function LessonForm({ lesson, onBack }) {
  const qc = useQueryClient()
  const [form, setForm] = useState(lesson)
  const lessonId = lesson.id

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-ai-lesson', lessonId] })
    qc.invalidateQueries({ queryKey: ['admin-ai-lessons'] })
  }

  const save = useMutation({
    mutationFn: () => {
      const { title, subject, section, language, duration_minutes, level, voice, brief } = form
      return api.patch(`/admin/ai-lessons/${lessonId}/`, {
        title, subject, section, language, duration_minutes, level, voice, brief,
      })
    },
    onSuccess: refresh,
  })
  const removeSource = useMutation({
    mutationFn: (id) => api.delete(`/admin/ai-lessons/sources/${id}/`),
    onSuccess: refresh,
  })
  const publish = useMutation({
    mutationFn: (value) => api.post(`/admin/ai-lessons/${lessonId}/publish/`, { publish: value }),
    onSuccess: refresh,
  })
  const removeLesson = useMutation({
    mutationFn: () => api.delete(`/admin/ai-lessons/${lessonId}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-ai-lessons'] })
      onBack()
    },
  })

  const confirmDelete = () => {
    if (window.confirm(`Delete "${lesson.title}" and all its sources?`)) removeLesson.mutate()
  }

  const busy = isLessonBusy(lesson)
  const published = lesson.status === 'PUBLISHED'
  const togglePublished = () => {
    const silent = !lesson.steps.some((s) => s.voiced)
    const question = published
      ? 'Take this lesson away from students? Their progress is kept.'
      : `Publish this lesson? Every student will be able to open it.${silent ? ' It has no voice yet.' : ''}`
    if (window.confirm(question)) publish.mutate(!published)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-sky-600">
          <ArrowLeft size={16} /> All lessons
        </button>
        <div className="flex items-center gap-3">
          {lesson.steps_count > 0 && (
            <Link
              to={`/admin-panel/ai-lessons/${lessonId}/preview`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-sm font-semibold hover:bg-sky-100"
            >
              <Play size={14} /> Preview ({lesson.steps_count} steps)
            </Link>
          )}
          {lesson.steps_count > 0 && lesson.ai_provider !== 'fake' && !busy && (
            <button
              type="button"
              disabled={publish.isPending}
              onClick={togglePublished}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                published ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {published ? 'Unpublish' : 'Publish'}
            </button>
          )}
          <StatusBadge status={lesson.status} />
        </div>
      </div>
      {publish.error && <p className="text-sm text-red-500">{errorOf(publish.error)}</p>}

      <LessonJob lesson={lesson} onChanged={refresh} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Lesson</h3>
          <LessonFields form={form} onChange={setForm} />
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              disabled={!form.title.trim() || save.isPending}
              onClick={() => save.mutate()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Save size={15} /> {save.isPending ? 'Saving…' : 'Save'}
            </button>
            {save.isSuccess && <span className="text-xs text-emerald-600 font-semibold">Saved</span>}
            {save.error && <span className="text-xs text-red-500">{errorOf(save.error)}</span>}
            <button
              type="button"
              disabled={removeLesson.isPending || busy}
              onClick={confirmDelete}
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Sources</h3>
            <p className="text-xs text-gray-400 mt-0.5">The material the AI will build this lesson from.</p>
          </div>
          <AddSource lessonId={lessonId} onAdded={refresh} />
          {lesson.sources.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {lesson.sources.map((s) => (
                <SourceRow
                  key={s.id}
                  source={s}
                  deleting={removeSource.isPending}
                  onDelete={() => removeSource.mutate(s.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-gray-400">No sources yet.</p>
          )}
          {removeSource.error && <p className="text-xs text-red-500">{errorOf(removeSource.error)}</p>}
        </section>
      </div>

      <LessonSteps lesson={lesson} busy={busy} onChanged={refresh} />

      <LessonQuestions lesson={lesson} busy={busy} onChanged={refresh} />
    </div>
  )
}

function LessonList({ onOpen, onNew }) {
  const [subject, setSubject] = useState('')
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(timer)
  }, [input])

  const { data: lessons, isLoading, error } = useQuery({
    queryKey: ['admin-ai-lessons', subject, q],
    queryFn: () => api.get('/admin/ai-lessons/', { params: { subject, q } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap size={20} className="text-sky-500" /> AI Lessons
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Give a topic and sources. Students see nothing until a lesson is published.</p>
        </div>
        <button type="button" onClick={onNew} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold">
          <Plus size={16} /> New lesson
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputCls} !w-40 bg-white`}>
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="relative block w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search topics" className={`${inputCls} pl-8 bg-white`} />
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}</div>
        ) : error ? (
          <p className="p-5 text-sm text-red-500">Failed to load lessons: {errorOf(error)}</p>
        ) : !lessons.length ? (
          <div className="py-14 text-center">
            <GraduationCap size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">{subject || q ? 'No lessons found.' : 'No lessons yet. Create your first one.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/70">
                  {['Topic', 'Subject', 'Length', 'Sources', 'Students', 'Finished', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lessons.map((l) => (
                  <tr
                    key={l.id}
                    tabIndex={0}
                    onClick={() => onOpen(l.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onOpen(l.id) }}
                    className="cursor-pointer hover:bg-sky-50/30 focus:bg-sky-50/30 focus:outline-none transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-gray-800 max-w-[380px] truncate">{l.title}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{l.subject}</td>
                    <td className="px-5 py-3 text-gray-600 whitespace-nowrap">{l.duration_minutes} min</td>
                    <td className="px-5 py-3 text-gray-600 tabular-nums">{l.sources_count}</td>
                    <td className="px-5 py-3 text-gray-600 tabular-nums">{l.students}</td>
                    <td className="px-5 py-3 text-gray-600 tabular-nums">{l.finished}</td>
                    <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminAILessons() {
  const qc = useQueryClient()
  // In the URL, so coming back from the preview lands on the same lesson.
  const [params, setParams] = useSearchParams()
  const openId = Number(params.get('lesson')) || null
  const setOpenId = (id) => setParams(id ? { lesson: id } : {})
  const [creating, setCreating] = useState(false)

  if (openId) return <LessonEditor key={openId} lessonId={openId} onBack={() => setOpenId(null)} />

  return (
    <>
      <LessonList onOpen={setOpenId} onNew={() => setCreating(true)} />
      <AnimatePresence>
        {creating && (
          <NewLessonModal
            onClose={() => setCreating(false)}
            onCreated={(lesson) => {
              qc.invalidateQueries({ queryKey: ['admin-ai-lessons'] })
              setCreating(false)
              setOpenId(lesson.id)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
