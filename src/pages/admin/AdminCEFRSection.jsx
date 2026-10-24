import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Headphones, GraduationCap, Layers, ChevronDown,
  Upload, X, AlertCircle, FileJson, Loader2, Check,
  Trash2, FileText, Music2, VolumeX, Eye, Crown, Clock, Search, Download, ImageIcon,
} from 'lucide-react'
import api from '../../api/client'
import { CEFR_EXAMPLES } from '../../data/importExamples'
import CopyJsonButton from '../../components/admin/CopyJsonButton'
import { useCanWriteAdmin, useIsOwnerAdmin } from './AdminWriteContext'

// Yuklangan audioni admin kompyuteriga saqlash (download)
async function downloadAudioFile(url, baseName = 'audio') {
  const ext = (url.split('?')[0].match(/\.(mp3|wav|m4a|ogg|aac)$/i)?.[1] || 'mp3').toLowerCase()
  const safe = String(baseName).replace(/[^\w.-]+/g, '_').slice(0, 60) || 'audio'
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = `${safe}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(objUrl)
  } catch {
    window.open(url, '_blank')
  }
}

// ── Level + QT helpers ────────────────────────────────────────────────────────
const LEVEL_COLORS = {
  A1: 'bg-green-100 text-green-700 border-green-200',
  A2: 'bg-teal-100 text-teal-700 border-teal-200',
  B1: 'bg-blue-100 text-blue-700 border-blue-200',
  B2: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  C1: 'bg-slate-100 text-slate-700 border-slate-200',
  C2: 'bg-sky-100 text-sky-700 border-sky-200',
}
const LEVELS = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']

const QT_COLORS = {
  PGAP:'bg-blue-600 text-white', TMATCH:'bg-blue-500 text-white',
  MCQ:'bg-blue-100 text-blue-700', MULTI:'bg-violet-100 text-violet-700',
  GAP:'bg-slate-100 text-slate-700', TABLE:'bg-sky-100 text-sky-700',
  TFNG:'bg-green-100 text-green-700', YNNG:'bg-teal-100 text-teal-700',
  MATCH:'bg-indigo-100 text-indigo-700', MINFO:'bg-pink-100 text-pink-700',
  MFEAT:'bg-fuchsia-100 text-fuchsia-700', MEND:'bg-purple-100 text-purple-700',
  SENT:'bg-rose-100 text-rose-700', SHORT:'bg-gray-100 text-gray-700',
  SUMM:'bg-yellow-100 text-yellow-700', NOTE:'bg-lime-100 text-lime-700',
  FLOW:'bg-emerald-100 text-emerald-700', TF:'bg-green-100 text-green-700',
  ERROR:'bg-red-100 text-red-700', WORD:'bg-purple-100 text-purple-700',
  TRANS:'bg-sky-100 text-sky-700',
}
const QT_LABEL = {
  PGAP:'Part 1 Gap', TMATCH:'Part 2–3 Match',
  MCQ:'MCQ', MULTI:'Multi', GAP:'Gap', TABLE:'Table', TFNG:'T/F/NG',
  YNNG:'Y/N/NG', MATCH:'Headings', MINFO:'M.Info', MFEAT:'M.Feat',
  MEND:'M.End', SENT:'Sentence', SHORT:'Short', SUMM:'Summary',
  NOTE:'Notes', FLOW:'Flow', TF:'T/F', ERROR:'Error', WORD:'Word', TRANS:'Transform',
}
function QtBadge({ qt }) {
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${QT_COLORS[qt] || 'bg-gray-100 text-gray-600'}`}>
      {QT_LABEL[qt] || qt}
    </span>
  )
}

// ── Question type reference data ──────────────────────────────────────────────
const CEFR_READING_QT_REF = [
  { qt:'PGAP',  label:'Part 1 — Gap in the text',    desc:"Bo'sh joylar matnning o'zida: content ichida [1]..[6]. Savolda faqat javob",  answer:'"turtles" yoki "turtles|animals"', fields:'passage.content [N]', extra:"content kerak emas — import [N] va savollarni solishtiradi" },
  { qt:'TMATCH',label:'Part 2–3 — Match text',       desc:"Tepada A–J variantlar (options bir marta), pastda matnlar — har biriga bitta variant", answer:'"D"', fields:'options[] (part), content', extra:"options bir marta yoziladi — har savolga o'zi biriktiriladi" },
  { qt:'MCQ',   label:'Part 4–5 — Multiple Choice',  desc:'A, B, C, D variantlardan bittasi. Javob harfi choices ichida bo\'lishi shart', answer:'"A" | "B" | "C" | "D"',         fields:'choices[], group_instruction', extra:null },
  { qt:'TFNG',  label:'Part 4 — True / False / Not Given', desc:'Matn asosida. Tugmalar o\'zi chiqadi — choices kerak emas',          answer:'"TRUE" | "FALSE" | "NOT GIVEN"', fields:'group_instruction', extra:null },
  { qt:'YNNG',  label:'Part 4 — Yes / No / Not Given', desc:"Muallif fikriga ko'ra — YES, NO yoki NOT GIVEN",                        answer:'"YES" | "NO" | "NOT GIVEN"',     fields:'group_instruction', extra:null },
  { qt:'NOTE',  label:'Part 5 — Summary gaps',       desc:"Summary matni 1-savol group_instruction'ida, ichida [30]..[33]. Savolda faqat javob", answer:'"coffee" yoki "light-brown|light brown"', fields:'group_instruction [N]', extra:"[N] belgisi summary'da bo'lishi shart — import tekshiradi" },
  { qt:'MULTI', label:'Multiple Select',             desc:"Bir necha variant — javoblar | bilan ajratiladi",                         answer:'"A|C" yoki "B|D"',               fields:'choices[], max_selections', extra:'max_selections: 2' },
  { qt:'GAP',   label:'Gap Fill',                    desc:"___ joy — matndan 1-2 so'z",                                             answer:'"21st"',                          fields:'group_instruction', extra:'choices kerak emas' },
  { qt:'SENT',  label:'Sentence Completion',         desc:"Jumlaning oxirini to'ldirish — matndan ibora",                            answer:'"social media"',                  fields:'group_instruction', extra:null },
  { qt:'TABLE', label:'Table Completion',            desc:"Jadval yacheykasini to'ldirish — bitta so'z",                             answer:'"annual"',                        fields:'group_instruction', extra:null },
  { qt:'SUMM',  label:'Summary Completion',          desc:"Xulosa bo'shliqlarini to'ldirish — word_bank bilan drag-and-drop",        answer:'"communication"',                 fields:'word_bank:[], group_instruction', extra:"word_bank = so'zlar ro'yxati" },
  { qt:'FLOW',  label:'Flowchart Completion',        desc:"Oqim-jadval bo'shliqlarini to'ldirish",                                   answer:'"published"',                     fields:'group_instruction', extra:null },
  { qt:'MATCH', label:'Matching Headings',           desc:"Paragrafga mos sarlavhani topish — choices = sarlavhalar ro'yxati",       answer:'"ii"',                            fields:'choices[], group_instruction', extra:"UI: sarlavhalar ro'yxati" },
  { qt:'MINFO', label:'Matching Information',        desc:'Tavsif qaysi paragrafda — harf (A, B, C...)',                            answer:'"C"',                             fields:'choices[], group_instruction', extra:null },
  { qt:'MFEAT', label:'Matching Features',           desc:'Element qaysi kategoriyaga tegishli — dropdown UI',                      answer:'"B"',                             fields:'choices[], group_instruction', extra:'UI: dropdown select' },
  { qt:'MEND',  label:'Matching Sentence Endings',   desc:'Jumlaning boshlanishiga mos tugashini tanlash',                          answer:'"C"',                             fields:'choices[], group_instruction', extra:'UI: dropdown select' },
  { qt:'SHORT', label:'Short Answer',                desc:"Matndan qisqa javob — 1-3 so'z",                                         answer:'"communication"',                 fields:'group_instruction', extra:null },
]

const CEFR_LISTENING_QT_REF = [
  { qt:'MCQ',   label:'Part 1 — Multiple Choice',    desc:"A, B, C javoblardan biri. Part 1 da savol matni (content) yo'q — faqat variantlar", answer:'"B"', fields:'choices[], group_instruction', extra:null },
  { qt:'NOTE',  label:'Part 2 — Form / Notes',       desc:"Forma 1-savol group_instruction'ida, har qator \\n bilan, bo'sh joy [N]. Savolda faqat javob", answer:'"Wednesday" yoki "5:30|5.30"', fields:'group_instruction [N]', extra:"[N] belgisi matnda bo'lishi shart — import tekshiradi" },
  { qt:'TMATCH',label:'Part 3–4 — Match / Map',      desc:"Part 3: A–F ro'yxat + Speaker 1..4. Part 4: options faqat harflar [\"A\",...,\"G\"] + joy nomlari, xarita rasmi admin'da yuklanadi", answer:'"A"', fields:'options[], content', extra:"options har savolga o'zi biriktiriladi" },
  { qt:'MCQ',   label:'Part 5–6 — Savol + A/B/C',    desc:"content = savol matni, choices A–C. Part 6 da NOTE bilan aralash bo'lishi mumkin", answer:'"B"', fields:'content, choices[], group_instruction', extra:null },
  { qt:'MULTI', label:'Multiple Select',             desc:"Bir necha variant — javoblar | bilan ajratiladi",                        answer:'"A|C" yoki "B|D"',               fields:'choices[], max_selections', extra:'max_selections: 2' },
  { qt:'GAP',   label:'Gap Fill',                    desc:"___ joy — transcript'da [N] belgisi kerak",                              answer:'"Mr Thompson"',                   fields:'group_instruction', extra:'transcript [N] marker' },
  { qt:'TABLE', label:'Table / Form Completion',     desc:"Jadval yoki anketa bo'shliqlarini to'ldirish",                           answer:'"Monday"',                        fields:'group_instruction', extra:null },
  { qt:'NOTE',  label:'Notes Completion',            desc:"Konspekt bo'shliqlarini to'ldirish — tinglash paytida",                  answer:'"2nd floor"',                     fields:'group_instruction', extra:null },
  { qt:'FLOW',  label:'Flowchart Completion',        desc:"Oqim-jadval bo'shliqlarini to'ldirish — tinglashdan",                    answer:'"key card"',                      fields:'group_instruction', extra:null },
  { qt:'SENT',  label:'Sentence Completion',         desc:"Jumlani to'ldirish — tinglashdan olingan so'z",                          answer:'"morning"',                       fields:'group_instruction', extra:null },
  { qt:'MATCH', label:'Matching',                    desc:"Ikkita ro'yxatni moslash — harf yozish",                                 answer:'"C"',                             fields:'choices[], group_instruction', extra:null },
  { qt:'MFEAT', label:'Matching Features',           desc:'Element qaysi manbaga tegishli — dropdown UI',                          answer:'"A"',                             fields:'choices[], group_instruction', extra:'UI: dropdown select' },
  { qt:'SHORT', label:'Short Answer',                desc:"Tinglashdan 1-3 so'z",                                                   answer:'"documents"',                     fields:'group_instruction', extra:null },
]

const CEFR_GRAMMAR_QT_REF = [
  { qt:'MCQ',   label:'Multiple Choice',             desc:"A, B, C, D variantlardan to'g'ri grammatik shaklni tanlash",             answer:'"A" | "B" | "C" | "D"',         fields:'choices[], group_instruction', extra:null },
  { qt:'GAP',   label:'Gap Fill',                    desc:"Gapda bo'sh joy — to'g'ri shaklni yozish",                               answer:'"haven\'t seen"',                 fields:'group_instruction', extra:null },
  { qt:'TF',    label:'True / False',                desc:"Grammatik jihatdan gap to'g'rimi yoki noto'g'rimi",                      answer:'"TRUE" | "FALSE"',                fields:'group_instruction', extra:null },
  { qt:'MATCH', label:'Matching',                    desc:"Ikkita ustunni moslash — harf yoki raqam yoziladi",                      answer:'"C" yoki "3"',                    fields:'choices[], group_instruction', extra:null },
  { qt:'ERROR', label:'Error Correction',            desc:"Gapdagi xato so'zni topib, to'g'ri shaklini yozish",                    answer:'"doesn\'t"',                      fields:'group_instruction', extra:null },
  { qt:'WORD',  label:'Word Formation',              desc:"Qavsda berilgan so'zdan kerakli shaklni hosil qilish",                  answer:'"decision"',                      fields:'group_instruction', extra:null },
  { qt:'TRANS', label:'Sentence Transformation',     desc:"Berilgan gapni boshqa so'zlar bilan yozish",                            answer:'"so tired that he couldn\'t"',    fields:'group_instruction', extra:null },
]

const QT_REF_MAP = { reading: CEFR_READING_QT_REF, listening: CEFR_LISTENING_QT_REF, grammar: CEFR_GRAMMAR_QT_REF }

function QtReferencePanel({ section }) {
  const rows = QT_REF_MAP[section] || CEFR_GRAMMAR_QT_REF
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex-shrink-0">Savol turlari</span>
          <div className="flex flex-wrap gap-1">{rows.map(r => <QtBadge key={r.qt + r.label} qt={r.qt} />)}</div>
        </div>
        <span className={`text-slate-400 text-xs ml-2 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="divide-y divide-slate-50 bg-white">
          {rows.map((r, ri) => (
            <div key={ri} className="px-3 py-2.5 grid grid-cols-[76px_1fr] gap-3 items-start hover:bg-slate-50/40">
              <div className="pt-0.5"><QtBadge qt={r.qt} /></div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 leading-tight">{r.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{r.desc}</p>
                <div className="flex flex-wrap gap-x-3 mt-1">
                  <span className="text-[10px] text-gray-400">
                    <span className="font-semibold text-gray-600">correct_answer:</span>{' '}
                    <code className="bg-green-50 text-green-700 px-1 rounded">{r.answer}</code>
                  </span>
                  <span className="text-[10px] text-gray-400">
                    <span className="font-semibold text-gray-600">fields:</span> {r.fields}
                  </span>
                </div>
                {r.extra && (
                  <span className="inline-block mt-0.5 text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-semibold">
                    ★ {r.extra}
                  </span>
                )}
              </div>
            </div>
          ))}
          {section === 'listening' && (
            <div className="px-3 py-2 bg-blue-50 text-[10px] text-blue-700">
              <span className="font-bold">Transcript:</span> Audio matnida{' '}
              <code className="bg-blue-100 px-1 rounded">[1]</code>,{' '}
              <code className="bg-blue-100 px-1 rounded">[2]</code> belgilari bilan javob joy ko'rsating.
            </div>
          )}
          {section === 'grammar' && (
            <div className="px-3 py-2 bg-blue-50 text-[10px] text-blue-700">
              <span className="font-bold">test_type:</span>{' '}
              <code className="bg-blue-100 px-1 rounded">"GRAMMAR"</code> yoki{' '}
              <code className="bg-blue-100 px-1 rounded">"VOCABULARY"</code> yoki{' '}
              <code className="bg-blue-100 px-1 rounded">"MIXED"</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── JSON Examples ─────────────────────────────────────────────────────────────
const READING_EXAMPLE = CEFR_EXAMPLES.reading

const LISTENING_EXAMPLE = CEFR_EXAMPLES.listening

const GRAMMAR_EXAMPLE = `{
  "type": "grammar",
  "title": "B2 Grammar Test 1",
  "level": "B2",
  "test_type": "GRAMMAR",
  "time_limit": 45,
  "is_premium": false,
  "questions": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "She ___ to Paris last year.",
      "correct_answer": "A",
      "explanation": "Past simple for completed actions.",
      "choices": [
        {"option": "A", "text": "went"},
        {"option": "B", "text": "goes"},
        {"option": "C", "text": "has gone"},
        {"option": "D", "text": "is going"}
      ]
    },
    {
      "number": 2,
      "question_type": "GAP",
      "content": "I ___ (not/see) him since Monday.",
      "correct_answer": "haven't seen",
      "explanation": "Present perfect with 'since'.",
      "group_instruction": "Questions 2-4: Complete with the correct form."
    },
    {
      "number": 3,
      "question_type": "ERROR",
      "content": "He don't know the answer.",
      "correct_answer": "doesn't",
      "explanation": "Third person singular needs 'doesn't'."
    }
  ]
}`

const EXAMPLES = { reading: READING_EXAMPLE, listening: LISTENING_EXAMPLE, grammar: GRAMMAR_EXAMPLE }

// ── Section configs ───────────────────────────────────────────────────────────
const SECTION_CONFIG = {
  reading: {
    label: 'Reading', icon: BookOpen, color: 'blue',
    listEndpoint: '/admin/cefr/reading/',
    detailEndpoint: (pk) => `/admin/cefr/reading/${pk}/detail/`,
    deleteEndpoint: (pk) => `/admin/cefr/reading/${pk}/`,
    importType: 'reading',
  },
  listening: {
    label: 'Listening', icon: Headphones, color: 'purple',
    listEndpoint: '/admin/cefr/listening/',
    detailEndpoint: (pk) => `/admin/cefr/listening/${pk}/detail/`,
    deleteEndpoint: (pk) => `/admin/cefr/listening/${pk}/`,
    audioEndpoint: (pk) => `/admin/cefr/listening/${pk}/audio/`,
    importType: 'listening',
    hasAudio: true,
  },
  grammar: {
    label: 'Grammar', icon: GraduationCap, color: 'slate',
    listEndpoint: '/admin/cefr/tests/',
    detailEndpoint: (pk) => `/cefr/tests/${pk}/`,
    deleteEndpoint: (pk) => `/admin/cefr/tests/${pk}/`,
    importType: 'grammar',
    hasLevelFilter: true,
  },
}

const COLOR_CLASSES = {
  blue:   { icon: 'bg-blue-100',   text: 'text-blue-600',   badge: 'bg-blue-50 text-blue-600' },
  purple: { icon: 'bg-purple-100', text: 'text-purple-600', badge: 'bg-purple-50 text-purple-600' },
  slate:  { icon: 'bg-slate-100',  text: 'text-slate-600',  badge: 'bg-slate-50 text-slate-600' },
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-600" />
        </div>
        <h3 className="font-bold text-gray-900 mb-2">O'chirilsinmi?</h3>
        <p className="text-sm text-gray-500 mb-6">Bu amalni qaytarib bo'lmaydi.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Bekor
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin" />}
            O'chirish
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Delete All Confirm ────────────────────────────────────────────────────────
function DeleteAllConfirm({ section, count, onConfirm, onCancel, loading, error }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Hammasini o'chirish</h3>
            <p className="text-xs text-gray-400">{section} — {count} ta element</p>
          </div>
        </div>
        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
          <p className="text-sm text-red-700 font-medium">Diqqat! Bu amal qaytarib bo'lmaydi.</p>
          <p className="text-xs text-red-500 mt-1">Barcha {count} ta element ma'lumotlar bazasidan butunlay o'chiriladi.</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-100 rounded-xl border border-red-200">
            <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
            <span className="text-xs text-red-700 font-medium">Xatolik: {String(error)}</span>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Bekor qilish
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Ha, o'chirish
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Audio Upload Modal ────────────────────────────────────────────────────────
function AudioUploadModal({ item, section, onClose, onSuccess }) {
  const config = SECTION_CONFIG[section]
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const fileRef = useRef()

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setStatus(null)
    const form = new FormData()
    form.append('audio', file)
    try {
      // A mock's single recording has its own endpoint; parts use the section one
      await api.post(item.audioEndpoint || config.audioEndpoint(item.id), form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus({ ok: true, msg: 'Audio yuklandi!' })
      setTimeout(() => onSuccess?.(), 900)
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Yuklash muvaffaqiyatsiz' })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Audio Yuklash</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4 truncate">{item.title}</p>

        {(item.audio_url || item.audio_file) && (
          <div className="p-3 bg-green-50 rounded-xl border border-green-100 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Music2 size={14} className="text-green-600" />
              <span className="text-xs font-semibold text-green-700">Audio yuklangan</span>
            </div>
            <audio src={item.audio_url || item.audio_file} controls className="w-full h-8 text-xs" />
            <button onClick={() => downloadAudioFile(item.audio_url || item.audio_file, item.title)}
              className="mt-2 w-full py-1.5 text-xs text-green-700 hover:bg-green-100 rounded-lg transition font-medium flex items-center justify-center gap-1.5 border border-green-200">
              <Download size={12} /> Save audio
            </button>
          </div>
        )}

        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-sky-300 rounded-xl text-sm text-sky-600 hover:bg-sky-50 transition font-medium">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Yuklanmoqda...' : (item.audio_url || item.audio_file) ? 'Audioni almashtirish' : 'Audio tanlash (MP3, WAV, OGG)'}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleUpload} />
        {status && (
          <div className={`mt-3 flex items-center gap-2 p-3 rounded-xl text-sm ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.ok ? <Check size={15} /> : <AlertCircle size={15} />}
            {status.msg}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Listening Part 4: map / picture upload ───────────────────────────────────
// Green when the part already has an image. Click → pick a file (replaces it);
// the list refreshes itself, so no props need to be threaded through.
function ImageButton({ item, compact = false }) {
  const fileRef = useRef()
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)
  const has = !!item.image

  const upload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      // The api client defaults to JSON — without this axios turns FormData into JSON and the file is lost
      await api.post(`/admin/cefr/listening/${item.id}/image/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      queryClient.invalidateQueries({ queryKey: ['admin-cefr-section'] })
    } catch (err) {
      alert(err.response?.data?.error || err.response?.data?.detail || `Rasm yuklanmadi (${err.response?.status || err.message}).`)
    } finally { setBusy(false) }
  }

  return (
    <>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
        title={has ? "Rasm bor — almashtirish uchun bosing (Part 4 xarita)" : "Rasm yuklash (Part 4 xarita)"}
        className={`${compact ? 'p-1.5' : 'p-2'} rounded-lg transition disabled:opacity-50 ${has ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-sky-600 hover:bg-sky-50'}`}>
        {busy ? <Loader2 size={compact ? 14 : 15} className="animate-spin" /> : <ImageIcon size={compact ? 14 : 15} />}
      </button>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={upload} />
    </>
  )
}

// ── Mock Group Row (IELTS uslubida) ──────────────────────────────────────────
function MockGroupRow({ testId, testTitle, testIsPremium, parts, section, colors, onAudio, onDelete }) {
  const canWrite = useCanWriteAdmin()
  const isOwner = useIsOwnerAdmin()   // only the owner deletes tests
  // Collapsed by default — one row per mock, click to see its parts
  const [open, setOpen] = useState(false)
  const totalQ = parts.reduce((s, p) => s + (p.question_count ?? 0), 0)
  const partWord = section === 'listening' ? 'parts' : 'parts'
  // Listening mock: one recording for all parts (optional)
  const mockHasAudio = section === 'listening' && !!parts[0]?.test_has_audio
  const pLabel = section === 'listening' ? 'S' : 'P'

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Group header — ochish tugmasi va JSON tugmasi yonma-yon
          (tugma ichiga tugma qo'yib bo'lmaydi, shuning uchun tashqi div) */}
      <div className="w-full flex items-center gap-2 pr-5 hover:bg-violet-50/40 transition-colors">
        <button onClick={() => setOpen(p => !p)}
          className="flex-1 min-w-0 flex items-center gap-4 px-5 py-3.5 text-left group">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Layers size={16} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900 text-sm">{testTitle}</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-semibold">Mock Test</span>
              {testIsPremium && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold flex items-center gap-1">
                  <Crown size={9} /> Premium
                </span>
              )}
              {mockHasAudio && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold flex items-center gap-1">
                  <Music2 size={9} /> To'liq audio
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{parts.length} {partWord}  ·  {totalQ} questions</p>
          </div>
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <ChevronDown size={16} />
          </span>
        </button>
        {/* Listening mock: bitta audio butun test uchun (har partga alohida ham bo'lishi mumkin) */}
        {section === 'listening' && (
          <button type="button"
            onClick={() => onAudio({
              id: testId,
              title: `${testTitle} — butun test uchun bitta audio`,
              audioEndpoint: `/admin/cefr/tests/${testId}/audio/`,
            })}
            title={mockHasAudio ? "To'liq audio bor — almashtirish" : "Butun test uchun bitta audio yuklash"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition ${mockHasAudio ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
            <Music2 size={13} /> {mockHasAudio ? "To'liq audio" : 'Bitta audio'}
          </button>
        )}
        {/* To'liq mock testni bitta JSON qilib nusxalash */}
        <CopyJsonButton
          url={`/admin/export/cefr/test/${testId}/?kind=${section}`}
          title="To'liq mock testni import formatidagi JSON sifatida nusxalash"
        />
      </div>

      {/* Parts */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            {parts.map((item, idx) => {
              const qCount = item.question_count ?? 0
              const hasAudio = !!(item.has_audio || item.audio_file)
              const lvl = item.level || ''
              const partNum = item.section_number ?? item.passage_number ?? (idx + 1)
              return (
                <div key={item.id}
                  className="flex items-center gap-4 pl-10 pr-5 py-3 hover:bg-sky-50/30 transition-colors border-t border-gray-50">
                  {/* Part badge */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-bold border
                    ${lvl ? LEVEL_COLORS[lvl] || 'bg-sky-100 text-sky-600 border-sky-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {pLabel}{partNum}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.time_limit && <span className="flex items-center gap-1 text-[11px] text-gray-400"><Clock size={9} />{item.time_limit} min</span>}
                      <span className="text-[11px] text-sky-600 font-medium">{qCount} Q</span>
                      {item.difficulty && <span className="text-[11px] text-gray-400">{item.difficulty}</span>}
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 font-medium">Mock Part</span>
                      {section === 'listening' && (
                        hasAudio
                          ? <span className="flex items-center gap-1 text-[11px] text-green-600"><Music2 size={9} />Audio</span>
                          : <span className="flex items-center gap-1 text-[11px] text-gray-400"><VolumeX size={9} />Audio yo'q</span>
                      )}
                      {section === 'listening' && (partNum === 4 || item.image) && (
                        item.image
                          ? <span className="flex items-center gap-1 text-[11px] text-green-600"><ImageIcon size={9} />Rasm</span>
                          : <span className="flex items-center gap-1 text-[11px] text-amber-600"><ImageIcon size={9} />Rasm yo'q</span>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(section === 'reading' || section === 'listening') && (
                      <CopyJsonButton url={`/admin/export/cefr/${section}/${item.id}/`} compact />
                    )}
                    {canWrite && section === 'listening' && (
                      <button onClick={() => onAudio(item)}
                        className={`p-1.5 rounded-lg transition ${hasAudio ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}>
                        <Music2 size={14} />
                      </button>
                    )}
                    {canWrite && section === 'listening' && (partNum === 4 || item.image) && <ImageButton item={item} compact />}
                    {isOwner && (
                      <button onClick={() => onDelete(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Standalone Row ────────────────────────────────────────────────────────────
function StandaloneRow({ item, index, section, colors, onAudio, onDelete }) {
  const canWrite = useCanWriteAdmin()
  const isOwner = useIsOwnerAdmin()
  const lvl = item.level || ''
  const qCount = item.question_count ?? 0
  const hasAudio = !!(item.has_audio || item.audio_file)
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50/30 transition-colors border-b border-gray-50 last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold border
        ${lvl ? LEVEL_COLORS[lvl] || 'bg-sky-100 text-sky-600 border-sky-200' : `${colors.icon} ${colors.text} border-transparent`}`}>
        {lvl || (index + 1)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
          {item.is_premium && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 flex items-center gap-1">
              <Crown size={9} /> Premium
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>{qCount} savol</span>
          {item.test_type && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{item.test_type}</span>}
          {item.time_limit && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={10} />{item.time_limit}m</span>}
          {item.is_mock && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Mock</span>}
          {section === 'listening' && (
            hasAudio
              ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Music2 size={10} />Audio</span>
              : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><VolumeX size={10} />Audio yo'q</span>
          )}
          {section === 'listening' && (item.section_number === 4 || item.image) && (
            item.image
              ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><ImageIcon size={10} />Rasm</span>
              : <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><ImageIcon size={10} />Rasm yo'q</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Import formatidagi JSON nusxasi */}
        {(section === 'reading' || section === 'listening') && (
          <CopyJsonButton url={`/admin/export/cefr/${section}/${item.id}/`} />
        )}
        {canWrite && section === 'listening' && (
          <button onClick={() => onAudio(item)}
            className={`p-2 rounded-lg transition ${hasAudio ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}>
            <Music2 size={15} />
          </button>
        )}
        {canWrite && section === 'listening' && (item.section_number === 4 || item.image) && <ImageButton item={item} />}
        {isOwner && (
          <button onClick={() => onDelete(item.id)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── TAB 1: Content (Ro'yxat) ──────────────────────────────────────────────────
function ContentTab({ items, section, config, colors, levelFilter, setLevelFilter, onAudio, onDelete, isLoading, error }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  let filtered = items
  if (search.trim()) {
    filtered = filtered.filter(it =>
      it.title?.toLowerCase().includes(search.toLowerCase()) ||
      it.test_title?.toLowerCase().includes(search.toLowerCase())
    )
  }
  if (typeFilter === 'PRACTICE') filtered = filtered.filter(it => it.is_standalone)
  if (typeFilter === 'MOCK')     filtered = filtered.filter(it => it.is_mock || !it.is_standalone)

  // Group: items with test_id → mock groups; others → standalone
  const { mockGroups, standalones } = (() => {
    const groups = {}
    const standalone = []
    for (const item of filtered) {
      if (item.test_id) {
        if (!groups[item.test_id]) {
          groups[item.test_id] = {
            testId: item.test_id,
            testTitle: item.test_title || `Mock Test #${item.test_id}`,
            testIsPremium: item.test_is_premium || false,
            parts: [],
          }
        }
        groups[item.test_id].parts.push(item)
      } else {
        standalone.push(item)
      }
    }
    Object.values(groups).forEach(g => {
      g.parts.sort((a, b) => (a.section_number ?? a.passage_number ?? 0) - (b.section_number ?? b.passage_number ?? 0))
    })
    return { mockGroups: Object.values(groups), standalones: standalone }
  })()

  const isEmpty = !mockGroups.length && !standalones.length

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Sarlavha bo'yicha qidirish..."
            className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition" />
        </div>
        <div className="flex gap-0.5 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
          {[['ALL', 'Hammasi'], ['PRACTICE', 'Practice'], ['MOCK', 'Mock']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTypeFilter(val)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${typeFilter === val ? 'bg-sky-500 text-white' : 'text-gray-500 hover:bg-sky-50 hover:text-sky-600'}`}>
              {lbl}
            </button>
          ))}
        </div>
        {config.hasLevelFilter && (
          <div className="flex gap-0.5 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
            {LEVELS.map(lv => (
              <button key={lv} onClick={() => setLevelFilter(lv)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${levelFilter === lv ? 'bg-sky-500 text-white' : 'text-gray-500 hover:bg-sky-50 hover:text-sky-600'}`}>
                {lv}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-sky-50 overflow-hidden">
        {error ? (
          <div className="p-8 flex items-center gap-3 text-red-600">
            <AlertCircle size={16} />
            <span className="text-sm">Yuklanmadi. Iltimos serverda restart qiling.</span>
          </div>
        ) : isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : isEmpty ? (
          <div className="p-16 text-center">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Hech narsa topilmadi.</p>
          </div>
        ) : (
          <div>
            {mockGroups.map(g => (
              <MockGroupRow
                key={`mock-${g.testId}`}
                testId={g.testId} testTitle={g.testTitle} testIsPremium={g.testIsPremium}
                parts={g.parts} section={section} colors={colors}
                onAudio={onAudio} onDelete={onDelete}
              />
            ))}
            {standalones.map((item, i) => (
              <StandaloneRow
                key={item.id} item={item} index={i} section={section}
                colors={colors} onAudio={onAudio} onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB 2: Questions Analysis (Savollar tahlili) ──────────────────────────────
function QuestionsTab({ items, section }) {
  const config = SECTION_CONFIG[section]
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(it => it.title?.toLowerCase().includes(search.toLowerCase()))
    : items

  const { data, isLoading } = useQuery({
    queryKey: ['cefr-qs-detail', section, selectedId],
    queryFn: () => api.get(config.detailEndpoint(selectedId)).then(r => r.data),
    enabled: !!selectedId,
    staleTime: 60_000,
  })

  const questions = data?.questions || []

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: 520 }}>
      {/* ── Left: item list ── */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-sky-50 shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-50">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Qidirish..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs border border-transparent focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition" />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-1">{filtered.length} ta content</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Topilmadi</p>
          ) : filtered.map(item => {
            const lvl = item.level || item.passage?.level || ''
            const qCount = item.question_count ?? item.total_questions ?? 0
            const active = selectedId === item.id
            return (
              <button key={item.id} onClick={() => setSelectedId(item.id)}
                className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${active ? 'bg-sky-50 border-sky-500' : 'border-transparent hover:bg-gray-50'}`}>
                <p className={`text-sm font-medium leading-snug line-clamp-2 ${active ? 'text-sky-700' : 'text-gray-800'}`}>{item.title}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {lvl && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${LEVEL_COLORS[lvl] || 'bg-sky-100 text-sky-600 border-sky-200'}`}>{lvl}</span>
                  )}
                  {item.is_mock && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Mock</span>
                  )}
                  <span className="text-[10px] text-gray-400 ml-auto">{qCount} Q</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right: analysis panel ── */}
      <div className="flex-1 bg-white rounded-2xl border border-sky-50 shadow-sm overflow-hidden flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-300">
              <Eye size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-400">Tahlil uchun chapdan content tanlang</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-sky-400" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Header */}
            <div className="pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">{data?.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {data?.level && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${LEVEL_COLORS[data.level] || 'bg-sky-100 text-sky-600 border-sky-200'}`}>{data.level}</span>
                )}
                {data?.is_mock && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Mock</span>}
                <span className="text-xs text-gray-400">{questions.length} savol</span>
                {data?.time_limit && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={10} />{data.time_limit}m</span>}
              </div>
            </div>

            {/* QT breakdown */}
            {questions.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-full mb-1">Savol turlari</span>
                {[...new Set(questions.map(q => q.question_type))].map(qt => (
                  <div key={qt} className="flex items-center gap-1">
                    <QtBadge qt={qt} />
                    <span className="text-xs text-gray-500 font-medium">
                      {questions.filter(q => q.question_type === qt).length}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Passage / transcript (collapsible) */}
            {(data?.content || data?.passage?.content) && (
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider select-none flex items-center gap-1.5 hover:text-gray-700 transition">
                  <span>Passage matni</span>
                  <span className="text-gray-300">▼</span>
                </summary>
                <div className="mt-2 bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {data.content || data.passage?.content}
                  </p>
                </div>
              </details>
            )}
            {(data?.transcript || data?.section?.transcript) && (
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider select-none flex items-center gap-1.5 hover:text-gray-700 transition">
                  <span>Transcript</span>
                  <span className="text-gray-300">▼</span>
                </summary>
                <div className="mt-2 bg-purple-50/60 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {data.transcript || data.section?.transcript}
                  </p>
                </div>
              </details>
            )}
            {(data?.audio_file || data?.section?.audio_file) && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 rounded-xl border border-green-100">
                <Music2 size={14} className="text-green-600" />
                <span className="text-xs text-green-700 flex-1">Audio fayl yuklangan</span>
              </div>
            )}

            {/* Questions list */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Savollar ({questions.length})</p>
              {questions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Savollar topilmadi</p>
              ) : (
                <div className="space-y-2">
                  {questions.map(q => (
                    <div key={q.id} className="border border-gray-100 rounded-xl p-3.5 hover:border-sky-200 transition-colors">
                      {q.group_instruction && (
                        <p className="text-xs font-semibold text-sky-600 mb-2 bg-sky-50 px-2.5 py-1.5 rounded-lg">{q.group_instruction}</p>
                      )}
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{q.number}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <QtBadge qt={q.question_type} />
                            {q.max_selections > 1 && (
                              <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-semibold">Choose {q.max_selections}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700">{q.content}</p>
                          {q.choices?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {q.choices.map(c => {
                                const isCorrect = q.correct_answer?.split('|').includes(c.option)
                                return (
                                  <div key={c.option} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${isCorrect ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-500'}`}>
                                    <span className="font-bold w-4 flex-shrink-0">{c.option}.</span>
                                    <span className="flex-1">{c.text}</span>
                                    {isCorrect && <Check size={11} className="text-green-600 flex-shrink-0" />}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-gray-400">Javob:</span>
                            <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">{q.correct_answer}</span>
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-gray-400 mt-1 italic">{q.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB 3: Import ─────────────────────────────────────────────────────────────
function ImportTab({ section, onSuccess }) {
  const config = SECTION_CONFIG[section]
  const [json, setJson] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setJson(ev.target.result)
    reader.readAsText(file)
  }

  const handleImport = async () => {
    setLoading(true); setStatus(null)
    try {
      const cleaned = json.replace(/^\s*\/\/.*$/gm, '')
      const parsed = JSON.parse(cleaned)
      await api.post('/import/cefr/', { ...parsed, type: config.importType })
      setStatus({ ok: true, msg: 'Muvaffaqiyatli import qilindi!' })
      setJson('')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof SyntaxError
        ? "JSON noto'g'ri formatlangan!"
        : err.response?.data?.error || err.response?.data?.detail || 'Import muvaffaqiyatsiz.'
      setStatus({ ok: false, msg })
    } finally { setLoading(false) }
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Left: format example */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Format namunasi</p>
        <div className="bg-gray-950 rounded-2xl p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre">{EXAMPLES[section]}</pre>
        </div>
      </div>
      {/* Right: input + reference */}
      <div className="flex flex-col gap-3">
        <QtReferencePanel section={section} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">JSON kiriting yoki fayldan yuklang</p>
        <textarea value={json} onChange={e => setJson(e.target.value)}
          placeholder="Paste JSON here... (// kommentlar qabul qilinadi)"
          className="flex-1 min-h-[220px] w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none" />
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition">
          <Upload size={15} /> Upload .json file
        </button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile} />
        {status && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${status.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
            {status.ok ? <Check size={15} /> : <AlertCircle size={15} />}
            {status.msg}
          </div>
        )}
        <button onClick={handleImport} disabled={loading || !json.trim()}
          className="w-full py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
          {loading && <Loader2 size={14} className="animate-spin" />}
          Import qilish
        </button>
      </div>
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS_BASE = [
  { key: 'content',   label: "Ro'yxat",        icon: FileText },
  { key: 'questions', label: 'Savollar tahlili', icon: BookOpen },
]
// Import creates content, so view-only admins (level 2/3) never see that tab
const IMPORT_TAB = { key: 'import', label: 'Import JSON', icon: FileJson }

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminCEFRSection({ section }) {
  const canWrite = useCanWriteAdmin()
  const isOwner = useIsOwnerAdmin()   // Delete All is the owner's
  const TABS = canWrite ? [...TABS_BASE, IMPORT_TAB] : TABS_BASE
  const config = SECTION_CONFIG[section]
  const colors = COLOR_CLASSES[config.color]
  const Icon = config.icon

  const [activeTab, setActiveTab] = useState('content')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [deleteAllError, setDeleteAllError] = useState(null)
  const [audioItem, setAudioItem] = useState(null)
  const [levelFilter, setLevelFilter] = useState('ALL')
  const queryClient = useQueryClient()

  const queryKey = ['admin-cefr-section', section, levelFilter]
  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => {
      const params = (config.hasLevelFilter && levelFilter !== 'ALL') ? { level: levelFilter } : {}
      return api.get(config.listEndpoint, { params }).then(r => r.data)
    },
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(config.deleteEndpoint(id)),
    onSuccess: () => { invalidate(); setDeleteId(null) },
  })

  const deleteAllEndpoint = section === 'reading'
    ? '/admin/cefr/reading/all/'
    : section === 'listening'
      ? '/admin/cefr/listening/all/'
      : null

  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete(deleteAllEndpoint),
    onSuccess: () => { invalidate(); setDeleteAllOpen(false); setDeleteAllError(null) },
    onError: (err) => setDeleteAllError(err.response?.data?.detail || err.response?.status || err.message || 'Xatolik'),
  })

  const items = Array.isArray(data) ? data : [
    ...(data?.practices || []),
    ...(data?.mocks || []),
    ...(data?.results || []),
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
            <Icon size={20} className={colors.text} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">CEFR {config.label}</h2>
            <p className="text-xs text-gray-400">{items.length} ta content mavjud</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Delete All — faqat reading va listening uchun */}
          {isOwner && deleteAllEndpoint && items.length > 0 && (
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-100 transition"
            >
              <Trash2 size={13} />
              Hammasini o'chirish ({items.length})
            </button>
          )}

          {/* Tab navigation */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-sky-50 shadow-sm">
            {TABS.map(({ key, label, icon: TIcon }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                  activeTab === key ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-500 hover:bg-sky-50 hover:text-sky-600'
                }`}>
                <TIcon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}>
          {activeTab === 'content' && (
            <ContentTab
              items={items} section={section} config={config} colors={colors}
              levelFilter={levelFilter} setLevelFilter={setLevelFilter}
              onAudio={setAudioItem} onDelete={setDeleteId}
              isLoading={isLoading} error={error}
            />
          )}
          {activeTab === 'questions' && (
            <QuestionsTab items={items} section={section} />
          )}
          {activeTab === 'import' && (
            <ImportTab section={section} onSuccess={() => { invalidate(); setActiveTab('content') }} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {deleteId && (
          <DeleteConfirm
            onConfirm={() => deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)}
            loading={deleteMutation.isPending}
          />
        )}
        {deleteAllOpen && (
          <DeleteAllConfirm
            section={`CEFR ${config.label}`}
            count={items.length}
            onConfirm={() => deleteAllMutation.mutate()}
            onCancel={() => { setDeleteAllOpen(false); setDeleteAllError(null) }}
            loading={deleteAllMutation.isPending}
            error={deleteAllError}
          />
        )}
        {audioItem && (
          <AudioUploadModal item={audioItem} section={section} onClose={() => setAudioItem(null)}
            onSuccess={() => { invalidate(); setAudioItem(null) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

