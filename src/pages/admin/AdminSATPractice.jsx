import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Upload, X, AlertCircle, Filter, ChevronDown,
  Loader2, FileText, Check, Code2, ClipboardPaste, CheckCircle2,
  FileJson, ChevronRight, Image as ImageIcon, Table, AlignLeft,
} from 'lucide-react'
import api from '../../api/client'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.04 } }),
}

const SUBJECTS = [
  { value: '', label: 'All Subjects' },
  { value: 'Matematika', label: 'Math' },
  { value: 'Ingliz tili', label: 'English' },
]

const CATEGORIES = {
  Matematika: [
    { value: '', label: 'All Categories' },
    { value: 'algebra', label: 'Algebra' },
    { value: 'advanced_math', label: 'Advanced Math' },
    { value: 'problem_data', label: 'Problem-Solving & Data Analysis' },
    { value: 'geometry', label: 'Geometry & Trigonometry' },
  ],
  'Ingliz tili': [
    { value: '', label: 'All Categories' },
    { value: 'craft_structure', label: 'Craft & Structure' },
    { value: 'expression_ideas', label: 'Expression of Ideas' },
    { value: 'info_ideas', label: 'Information & Ideas' },
    { value: 'standard_english', label: 'Standard English Conventions' },
  ],
}

// New mock-style format example
const PRACTICE_EXAMPLE = `{
  "subject": "English",
  "category": "info_ideas",
  "topics": [
    {
      "topic": "Notes-Based Questions",
      "questions": [
        {
          "number": 1,
          "question_type": "MCQ",
          "passage": "A student has taken the following notes:\\n• In World War I, US soldiers who were members of the Choctaw Nation used their native language.\\n• The Choctaw Code Talkers were trained to relay coded military information.\\n• In World War II, the US Army recruited Navajo soldiers to transmit coded messages.",
          "math_equation": "",
          "content": "The student wants to emphasize a <u>similarity</u> between the two groups. Which choice most effectively uses relevant information from the notes?",
          "correct_answer": "C",
          "difficulty": "MEDIUM",
          "explanation": "Option C correctly identifies the shared characteristic.",
          "choices": [
            {"option": "A", "text": "US soldiers who were members of the Choctaw Nation used their native language."},
            {"option": "B", "text": "In World War I, Navajo soldiers were known as Code Talkers."},
            {"option": "C", "text": "Both the Choctaw and Navajo Code Talkers transmitted coded messages in their native languages."},
            {"option": "D", "text": "The Choctaw Code Talkers, not the Navajo Code Talkers, served in World War I."}
          ]
        }
      ]
    },
    {
      "topic": "Table-Based Questions",
      "questions": [
        {
          "number": 2,
          "question_type": "MCQ",
          "passage": "An employee at a clothing retailer is writing a report.",
          "math_equation": "\\( \\frac{48x + 144}{8} - \\frac{c}{15} = d(x-2) \\)",
          "table_data": [
            ["Clothing type", "2019", "2020", "2021", "2022"],
            ["button-down shirts", "$44.05", "$40.54", "$45.73", "$47.75"],
            ["sweaters", "$66.40", "$58.30", "$64.64", "$55.28"],
            ["dresses", "$128.17", "$95.96", "$106.98", "$101.29"],
            ["jackets", "$131.20", "$89.79", "$133.87", "$99.20"]
          ],
          "content": "Consulting the table, she finds that this was the case for ___",
          "correct_answer": "B",
          "difficulty": "HARD",
          "choices": [
            {"option": "A", "text": "button-down shirts and jackets only"},
            {"option": "B", "text": "sweaters and jackets only"},
            {"option": "C", "text": "button-down shirts only"},
            {"option": "D", "text": "all four clothing types"}
          ]
        }
      ]
    }
  ]
}`

function Select({ value, onChange, className = '', children, ...rest }) {
  return (
    <div className="relative inline-flex items-center">
      <select value={value} onChange={onChange}
        className={`appearance-none bg-white border border-gray-200 rounded-xl text-sm text-gray-700 pr-8 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition cursor-pointer ${className}`}
        {...rest}>
        {children}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

function Badge({ variant, children }) {
  const styles = {
    mcq: 'bg-blue-100 text-blue-700', input: 'bg-purple-100 text-purple-700',
    easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-slate-100 text-slate-700',
    hard: 'bg-red-100 text-red-700', math: 'bg-sky-100 text-sky-700',
    english: 'bg-sky-100 text-sky-700',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${styles[variant] ?? 'bg-gray-100 text-gray-600'}`}>{children}</span>
}

function FieldLabel({ children }) {
  return <label className="block text-xs font-semibold text-gray-600 mb-1.5">{children}</label>
}
function FieldInput({ className = '', ...props }) {
  return <input className={`w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition ${className}`} {...props} />
}
function ErrorBanner({ msg }) {
  return (
    <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
      <AlertCircle size={15} className="flex-shrink-0" />{msg}
    </div>
  )
}
function TableSkeleton({ rows = 4, cols = 6 }) {
  return (
    <div className="p-5 space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          {[...Array(cols)].map((__, j) => (
            <div key={j} className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: [60, 80, 100, 200, 60, 60][j] ?? 80 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Choice Image Upload ───────────────────────────────────────────────────────
function ChoiceImageUpload({ questionId, letter, currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post(`/admin/sat/bank-questions/${questionId}/image/${letter}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onUploaded(letter, res.data.url)
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!questionId || !currentUrl) return
    setDeleting(true)
    try {
      await api.delete(`/admin/sat/bank-questions/${questionId}/image/${letter}/`)
      onUploaded(letter, null)
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <input type="file" ref={fileRef} accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files[0])} />
      <button type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || deleting}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition ${
          currentUrl
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-sky-300 hover:text-sky-600'
        } disabled:opacity-50`}
        title="Upload image for this choice"
      >
        {uploading ? <Loader2 size={11} className="animate-spin" /> : <ImageIcon size={11} />}
        {currentUrl ? 'Img ✓' : 'Rasm'}
      </button>
      {currentUrl && (
        <div className="relative flex-shrink-0 group/img">
          <img src={currentUrl} alt="" className="w-8 h-8 object-cover rounded border border-gray-200" />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
            title="Rasmni o'chirish"
          >
            {deleting ? <Loader2 size={8} className="animate-spin" /> : <X size={8} />}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Edit Modal ─────────────────────────────────────────────────────────────
function EditModal({ question, onClose, onSave }) {
  const [form, setForm] = useState({
    subject: question?.subject || 'Matematika',
    category: question?.category || '',
    question_type: question?.question_type || 'MCQ',
    topic: question?.topic || '',
    content: question?.content || '',
    passage: question?.passage || '',
    table_data: question?.table_data ? JSON.stringify(question.table_data, null, 2) : '',
    difficulty: question?.difficulty || 'medium',
    choice_a: question?.choice_a || '',
    choice_b: question?.choice_b || '',
    choice_c: question?.choice_c || '',
    choice_d: question?.choice_d || '',
    correct_answer: question?.correct_answer || '',
    explanation: question?.explanation || '',
    year: question?.year || '',
    source: question?.source || '',
  })
  const [choiceImages, setChoiceImages] = useState({
    a: question?.choice_a_image || null,
    b: question?.choice_b_image || null,
    c: question?.choice_c_image || null,
    d: question?.choice_d_image || null,
  })
  const [questionImage, setQuestionImage] = useState(question?.image || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const categories = CATEGORIES[form.subject] || []

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const payload = { ...form }
      // parse table_data if provided
      if (payload.table_data) {
        try { payload.table_data = JSON.parse(payload.table_data) } catch { /* send as string */ }
      } else {
        payload.table_data = null
      }
      if (question?.id) {
        await api.put(`/admin/sat/bank-questions/${question.id}/`, payload)
      } else {
        await api.post('/admin/sat/bank-questions/create/', payload)
      }
      onSave(); onClose()
    } catch (err) {
      setError(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed.')
    } finally { setLoading(false) }
  }

  const handleImageUploaded = (letter, url) => {
    if (letter === 'q') {
      setQuestionImage(url)
    } else {
      setChoiceImages((prev) => ({ ...prev, [letter]: url }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-sm">{question?.id ? 'Edit Question' : 'Add Question'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handle} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Subject</FieldLabel>
              <div className="relative">
                <select value={form.subject} onChange={(e) => { set('subject', e.target.value); set('category', '') }}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="Matematika">Math</option>
                  <option value="Ingliz tili">English</option>
                  <option value="Reading">Reading</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>Category</FieldLabel>
              <div className="relative">
                <select value={form.category} onChange={(e) => set('category', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  {(categories.length ? categories : [{ value: '', label: 'No categories' }]).map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Type</FieldLabel>
              <div className="relative">
                <select value={form.question_type} onChange={(e) => set('question_type', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="MCQ">MCQ</option>
                  <option value="INPUT">Input</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>Difficulty</FieldLabel>
              <div className="relative">
                <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>Year</FieldLabel>
              <FieldInput type="number" value={form.year} onChange={(e) => set('year', e.target.value)} placeholder="2024" />
            </div>
          </div>
          <div>
            <FieldLabel>Topic (Mavzu)</FieldLabel>
            <FieldInput value={form.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. Linear Equations" required />
          </div>

          {/* Passage */}
          <div>
            <FieldLabel>
              <AlignLeft size={11} className="inline mr-1 text-sky-500" />
              Passage / Matn (HTML qo'llab-quvvatlanadi)
            </FieldLabel>
            <textarea value={form.passage} onChange={(e) => set('passage', e.target.value)} rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 resize-y"
              placeholder={'• Bullet point usul:\n"A student has taken the following notes:\\n• Note 1\\n• Note 2"\n\nHTML usul:\n"<ul><li>Note 1</li><li>Note 2</li></ul>"'} />
          </div>

          {/* Table data */}
          <div>
            <FieldLabel>
              <Table size={11} className="inline mr-1 text-sky-500" />
              Table Data (JSON array, ixtiyoriy)
            </FieldLabel>
            <textarea value={form.table_data} onChange={(e) => set('table_data', e.target.value)} rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-400 resize-y"
              placeholder={'[["Header1","Header2"],["Row1Col1","Row1Col2"]]'} />
          </div>

          <div>
            <FieldLabel>Content / Savol matni (HTML/LaTeX)</FieldLabel>
            <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={3} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 resize-y"
              placeholder="Use \(...\) for inline LaTeX, \[...\] for block. <u>underline</u>, <b>bold</b>" />
          </div>

          {/* Question image */}
          <div>
            <FieldLabel>Savol rasmi (ixtiyoriy)</FieldLabel>
            {question?.id ? (
              <ChoiceImageUpload
                questionId={question.id}
                letter="q"
                currentUrl={questionImage}
                onUploaded={handleImageUploaded}
              />
            ) : (
              <p className="text-xs text-gray-400">* Rasm yuklash uchun avval savolni saqlang, keyin tahrirlang</p>
            )}
            {questionImage && (
              <img src={questionImage} alt="Question" className="mt-2 max-h-48 max-w-full object-contain rounded-xl border border-gray-200" />
            )}
          </div>

          {form.question_type === 'MCQ' && (
            <div className="space-y-2">
              <FieldLabel>Choices (A, B, C, D)</FieldLabel>
              <div className="space-y-2">
                {['a', 'b', 'c', 'd'].map((l) => (
                  <div key={l} className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      form.correct_answer?.toUpperCase() === l.toUpperCase()
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>{l.toUpperCase()}</span>
                    <FieldInput
                      value={form[`choice_${l}`]}
                      onChange={(e) => set(`choice_${l}`, e.target.value)}
                      placeholder={`Option ${l.toUpperCase()}`}
                      className="flex-1 !mb-0"
                    />
                    {question?.id && (
                      <ChoiceImageUpload
                        questionId={question.id}
                        letter={l}
                        currentUrl={choiceImages[l]}
                        onUploaded={handleImageUploaded}
                      />
                    )}
                  </div>
                ))}
              </div>
              {!question?.id && (
                <p className="text-xs text-gray-400">* Rasm yuklash uchun avval savolni saqlang, keyin tahrirlang</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Correct Answer</FieldLabel>
              <FieldInput value={form.correct_answer} onChange={(e) => set('correct_answer', e.target.value)}
                placeholder={form.question_type === 'MCQ' ? 'A' : '42'} required />
            </div>
            <div>
              <FieldLabel>Source</FieldLabel>
              <FieldInput value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="SAT 2023 March" />
            </div>
          </div>
          <div>
            <FieldLabel>Explanation / Izoh</FieldLabel>
            <textarea value={form.explanation} onChange={(e) => set('explanation', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 resize-y" />
          </div>
        </form>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          <button onClick={handle} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-bold disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {question?.id ? 'Save Changes' : 'Create'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Import Panel ───────────────────────────────────────────────────────────
function ImportPanel() {
  const [json, setJson] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const cleanJson = (raw) => {
    let s = raw.replace(/\/\/[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
    try { return JSON.parse(s) } catch {}
    return null
  }

  const handleImport = async () => {
    setError(''); setStatus(null)
    const data = cleanJson(json)
    if (!data) { setError('Invalid JSON. Check the format.'); return }
    setLoading(true)
    try {
      const res = await api.post('/import/sat/practice/', data)
      setStatus({ ok: true, msg: `✓ Imported ${res.data.created} questions from ${res.data.topics} topics` })
      setJson('')
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Import failed.')
    } finally { setLoading(false) }
  }

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
      className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson size={16} className="text-sky-500" />
          <h3 className="font-bold text-sm text-gray-800">Import Practice Questions (JSON)</h3>
        </div>
        <button onClick={() => setJson(PRACTICE_EXAMPLE)}
          className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-700 font-medium">
          <ClipboardPaste size={13} /> Example (mock format)
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 leading-relaxed space-y-1">
          <div><strong>Format:</strong> subject → category → topics[] → questions[]</div>
          <div>Har bir savol: <code>passage</code> (matn), <code>table_data</code> (jadval), <code>choices</code> (array) yoki <code>choice_a/b/c/d</code></div>
          <div>HTML qo'llab-quvvatlanadi: <code>&lt;u&gt;</code>, <code>&lt;b&gt;</code>, <code>&lt;ul&gt;&lt;li&gt;</code>, bullet <code>\n•</code></div>
        </div>

        {error && <ErrorBanner msg={error} />}
        {status?.ok && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            <CheckCircle2 size={15} />{status.msg}
          </div>
        )}

        <textarea
          value={json} onChange={(e) => setJson(e.target.value)}
          rows={16}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-400 resize-y bg-gray-50"
          placeholder="Paste JSON here... (yoki 'Example' tugmasini bosing)"
        />

        <div className="flex items-center gap-3">
          <input type="file" ref={fileRef} accept=".json" className="hidden"
            onChange={(e) => {
              const f = e.target.files[0]
              if (f) { const r = new FileReader(); r.onload = (ev) => setJson(ev.target.result); r.readAsText(f) }
            }} />
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-sky-300 transition">
            <Upload size={14} /> Upload .json
          </button>
          <div className="flex-1" />
          <button onClick={handleImport} disabled={loading || !json.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-bold disabled:opacity-40 transition hover:opacity-90">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {loading ? 'Importing…' : 'Import Questions'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Question Preview (expanded row) ───────────────────────────────────────
function QuestionPreview({ q }) {
  const renderPassage = (passage) => {
    if (!passage) return null
    // Convert \n• to <ul><li> if not already HTML
    if (!passage.includes('<')) {
      const lines = passage.split('\n')
      const bullets = lines.filter(l => l.trim().startsWith('•'))
      if (bullets.length > 0) {
        const pre = lines.filter(l => !l.trim().startsWith('•')).join(' ').trim()
        return (
          <div className="text-xs text-gray-700 leading-relaxed">
            {pre && <p className="mb-1">{pre}</p>}
            <ul className="list-disc list-inside space-y-0.5">
              {bullets.map((b, i) => <li key={i}>{b.replace(/^•\s*/, '')}</li>)}
            </ul>
          </div>
        )
      }
    }
    return <div className="text-xs text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(passage) }} />
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Passage */}
      {q.passage && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-blue-700 mb-1.5 flex items-center gap-1">
            <AlignLeft size={11} /> Passage
          </p>
          {renderPassage(q.passage)}
        </div>
      )}

      {/* Table */}
      {q.table_data && Array.isArray(q.table_data) && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {q.table_data[0]?.map((cell, i) => (
                  <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{cell}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.table_data.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-gray-100 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-gray-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Content */}
      <div className="font-mono text-xs bg-white rounded-xl p-3 border border-sky-100 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.content || '') }} />

      {/* Choices */}
      {q.question_type === 'MCQ' && (
        <div className="grid grid-cols-2 gap-2">
          {['a', 'b', 'c', 'd'].map((l) => {
            const text = q[`choice_${l}`]
            const img = q[`choice_${l}_image`]
            if (!text && !img) return null
            const isCorrect = q.correct_answer?.toUpperCase() === l.toUpperCase()
            return (
              <div key={l} className={`flex gap-2 px-3 py-2 rounded-xl text-xs ${
                isCorrect
                  ? 'bg-green-100 border border-green-200 font-bold text-green-800'
                  : 'bg-white border border-gray-100 text-gray-600'
              }`}>
                <span className="font-black flex-shrink-0">{l.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  {text && <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }} />}
                  {img && <img src={img} alt={`Choice ${l.toUpperCase()}`} className="mt-1 max-h-16 rounded object-contain" />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {q.explanation && (
        <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800">
          <strong>Explanation:</strong> {q.explanation}
        </div>
      )}
    </div>
  )
}

// ── Questions Table ────────────────────────────────────────────────────────
function QuestionsTable() {
  const qc = useQueryClient()
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [qType, setQType] = useState('')
  const [topic, setTopic] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // Fetch topics for dropdown based on current subject/category filters
  const { data: topicsData } = useQuery({
    queryKey: ['admin-bank-topics', subject, category],
    queryFn: () => api.get('/admin/sat/bank-questions/', {
      params: { subject, category, topics_only: 1 },
    }).then((r) => r.data.topics || []),
    staleTime: 60_000,
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-bank-questions', subject, category, difficulty, qType, topic, search, page],
    queryFn: () => api.get('/admin/sat/bank-questions/', {
      params: { subject, category, difficulty, question_type: qType, topic, search, page, page_size: 30 },
    }).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/sat/bank-questions/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bank-questions'] }),
  })

  const categories = CATEGORIES[subject] || []
  const questions = data?.results || []
  const total = data?.total || 0
  const topics = topicsData || []

  const resetPage = () => setPage(1)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl p-4 border border-sky-50 shadow-card flex flex-wrap items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search content..." value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage() }}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition" />
        </div>

        {/* Subject */}
        <Select value={subject} onChange={(e) => { setSubject(e.target.value); setCategory(''); setTopic(''); resetPage() }} className="pl-3 py-2">
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>

        {/* Category */}
        {subject && (
          <Select value={category} onChange={(e) => { setCategory(e.target.value); setTopic(''); resetPage() }} className="pl-3 py-2">
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        )}

        {/* Topic filter */}
        {topics.length > 0 ? (
          <Select value={topic} onChange={(e) => { setTopic(e.target.value); resetPage() }} className="pl-3 py-2 max-w-48">
            <option value="">All Topics</option>
            {topics.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        ) : (
          <input
            type="text"
            placeholder="Filter by topic..."
            value={topic}
            onChange={(e) => { setTopic(e.target.value); resetPage() }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition min-w-36"
          />
        )}

        {/* Difficulty */}
        <Select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); resetPage() }} className="pl-3 py-2">
          <option value="">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>

        {/* Type */}
        <Select value={qType} onChange={(e) => { setQType(e.target.value); resetPage() }} className="pl-3 py-2">
          <option value="">All Types</option>
          <option value="MCQ">MCQ</option>
          <option value="INPUT">Input</option>
        </Select>

        <span className="text-xs text-gray-400 font-semibold">{total} questions</span>

        <button onClick={() => setEditing({})}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition">
          <Plus size={14} /> Add
        </button>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
        {isLoading ? <TableSkeleton rows={5} cols={7} /> : error ? (
          <div className="p-8 flex items-center gap-3 text-red-600">
            <AlertCircle size={16} /><span className="text-sm">{error.message}</span>
          </div>
        ) : questions.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <FileText size={28} className="text-sky-200" />
            <p className="text-sm text-gray-500">No questions. Import or add manually.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-sky-50/50 border-b border-sky-100/50">
                    {['#', 'Subject', 'Category', 'Topic', 'Type', 'Diff', 'Answer', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {questions.map((q, i) => (
                    <>
                      <motion.tr key={q.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                        className="hover:bg-sky-50/20 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">#{q.id}</td>
                        <td className="px-4 py-3">
                          <Badge variant={q.subject === 'Matematika' ? 'math' : 'english'}>
                            {q.subject === 'Matematika' ? 'Math' : q.subject === 'Ingliz tili' ? 'English' : q.subject}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-28 truncate">{q.category || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700 max-w-36 truncate font-medium" title={q.topic}>{q.topic || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Badge variant={q.question_type === 'MCQ' ? 'mcq' : 'input'}>{q.question_type}</Badge>
                            {q.passage && <AlignLeft size={11} className="text-blue-400" title="Has passage" />}
                            {q.table_data && <Table size={11} className="text-amber-500" title="Has table" />}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={q.difficulty?.toLowerCase()}>{q.difficulty}</Badge>
                        </td>
                        <td className="px-4 py-3 font-black text-sky-600 text-sm">{q.correct_answer}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition" title="Preview">
                              <ChevronRight size={14} className={`transition-transform ${expandedId === q.id ? 'rotate-90' : ''}`} />
                            </button>
                            <button onClick={() => setEditing(q)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition" title="Edit">
                              <Code2 size={14} />
                            </button>
                            <button onClick={() => { if (confirm(`Delete #${q.id}?`)) deleteMutation.mutate(q.id) }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Delete">
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>

                      {expandedId === q.id && (
                        <tr key={`exp-${q.id}`}>
                          <td colSpan={8} className="px-4 pb-4 pt-2 bg-sky-50/40">
                            <QuestionPreview q={q} />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {total > 30 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                <span className="text-xs text-gray-400">{(page - 1) * 30 + 1}–{Math.min(page * 30, total)} / {total}</span>
                <div className="flex gap-1.5">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:border-sky-300 disabled:opacity-40 transition">Prev</button>
                  <button disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:border-sky-300 disabled:opacity-40 transition">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      <AnimatePresence>
        {editing !== null && (
          <EditModal
            question={editing?.id ? editing : null}
            onClose={() => setEditing(null)}
            onSave={() => qc.invalidateQueries({ queryKey: ['admin-bank-questions'] })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminSATPractice() {
  const [tab, setTab] = useState('questions')

  return (
    <div className="space-y-5">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <BookOpen size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Practice Questions</h2>
          <p className="text-xs text-gray-400">Manage SAT practice question bank by topic</p>
        </div>
      </motion.div>

      <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm border border-sky-50 w-fit">
        {[
          { key: 'questions', label: 'Questions', icon: FileText },
          { key: 'import', label: 'Import JSON', icon: FileJson },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === key ? 'gradient-primary text-white shadow-sm' : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
          {tab === 'questions' && <QuestionsTable />}
          {tab === 'import' && <ImportPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

