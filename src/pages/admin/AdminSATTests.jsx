import { useState, useRef, useCallback, useMemo } from 'react'
import katex from 'katex'

function renderMath(html) {
  if (!html) return ''
  let out = String(html)
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false }) }
    catch { return `[math]` }
  })
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
    try { return katex.renderToString(math.trim(), { throwOnError: false }) }
    catch { return math }
  })
  // Fallback: chegarasiz (delimiter'siz) LaTeX — "\cos B = \frac{1}{24}"
  out = out.replace(
    /\\[a-zA-Z]+(?:\s*\{[^{}]*\}|\s*\^\{[^{}]*\}|\s*\^[^\s{}]+|\s*_\{[^{}]*\}|\s*_[^\s{}]+|\s+[A-Za-z]\b)*/g,
    (m) => {
      try { return katex.renderToString(m.trim(), { throwOnError: false }) }
      catch { return m }
    }
  )
  return out
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Upload, X, AlertCircle, Filter, ChevronDown,
  Loader2, Check, Code2, ChevronRight, FileJson, ClipboardPaste,
  CheckCircle2, Globe, Lock, Unlock, Crown, ToggleLeft, ToggleRight,
  BookOpen, Layers, LayoutGrid, Trash2, Image as ImageIcon,
} from 'lucide-react'
import api from '../../api/client'
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.04 } }),
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const FULL_JSON_EXAMPLE = `{
  "test_mode": "FULL",
  "year": 2024,
  "month": 3,
  "form": "A",
  "is_international": false,
  "is_premium": false,

  "english_m1": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "The student wants to <u>emphasize</u> a similarity...",
      "math_equation": "",
      "passage": "While researching a topic, a student has taken the following notes:\\n• Bullet point 1\\n• Bullet point 2",
      "table_data": null,
      "correct_answer": "A",
      "difficulty": "EASY",
      "category": "information_and_ideas",
      "topic": "Central Ideas and Details",
      "explanation": "Why A is correct",
      "choices": [
        {"option": "A", "text": "Choice A text"},
        {"option": "B", "text": "Choice B text"},
        {"option": "C", "text": "Choice C text"},
        {"option": "D", "text": "Choice D text"}
      ]
    }
  ],

  "english_m2_easy":   [ "...27 questions..." ],
  "english_m2_medium": [ "...27 questions..." ],
  "english_m2_hard":   [ "...27 questions..." ],

  "math_m1": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "If \\\\(x^2 + 5x + 6 = 0\\\\), what is the value of x?",
      "math_equation": "\\\\( \\\\frac{48x + 144}{8} - \\\\frac{c}{15} = d(x-2) \\\\)",
      "table_data": [
        ["Year", "2019", "2020", "2021"],
        ["Value A", "$44.05", "$40.54", "$45.73"],
        ["Value B", "$66.40", "$58.30", "$64.64"]
      ],
      "correct_answer": "B",
      "difficulty": "MEDIUM",
      "category": "algebra",
      "topic": "Linear equations in one variable",
      "explanation": "Factor: (x+2)(x+3)=0",
      "choices": [
        {"option": "A", "text": "\\\\(x = -2\\\\) only"},
        {"option": "B", "text": "\\\\(x = -2\\\\) or \\\\(x = -3\\\\)"},
        {"option": "C", "text": "\\\\(x = 2\\\\) or \\\\(x = 3\\\\)"},
        {"option": "D", "text": "\\\\(x = 5\\\\)"}
      ]
    }
  ],

  "math_m2_easy":   [ "...22 questions..." ],
  "math_m2_medium": [ "...22 questions..." ],
  "math_m2_hard":   [ "...22 questions..." ]
}`

const INDIVIDUAL_JSON_EXAMPLE = `{
  "test_mode": "INDIVIDUAL",
  "year": 2024,
  "month": 3,
  "form": "B",
  "is_international": false,
  "is_premium": false,

  "english_m1": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "The student wants to <u>emphasize</u> a similarity...",
      "math_equation": "",
      "passage": "While researching a topic, a student has taken the following notes:\\n• Bullet point 1\\n• Bullet point 2",
      "table_data": null,
      "correct_answer": "A",
      "difficulty": "EASY",
      "category": "information_and_ideas",
      "topic": "Central Ideas and Details",
      "explanation": "Why A is correct",
      "choices": [
        {"option": "A", "text": "Choice A text"},
        {"option": "B", "text": "Choice B text"},
        {"option": "C", "text": "Choice C text"},
        {"option": "D", "text": "Choice D text"}
      ]
    }
  ],

  "english_m2": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "English M2 savol matni...",
      "math_equation": "",
      "passage": "",
      "table_data": null,
      "correct_answer": "B",
      "difficulty": "MEDIUM",
      "category": "craft_structure",
      "topic": "Word Choice",
      "explanation": "Why B is correct",
      "choices": [
        {"option": "A", "text": "Choice A text"},
        {"option": "B", "text": "Choice B text"},
        {"option": "C", "text": "Choice C text"},
        {"option": "D", "text": "Choice D text"}
      ]
    }
  ],

  "math_m1": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "If \\\\(x^2 + 5x + 6 = 0\\\\), what is the value of x?",
      "math_equation": "\\\\( \\\\frac{48x + 144}{8} - \\\\frac{c}{15} = d(x-2) \\\\)",
      "table_data": null,
      "correct_answer": "B",
      "difficulty": "MEDIUM",
      "category": "algebra",
      "topic": "Linear equations in one variable",
      "explanation": "Factor: (x+2)(x+3)=0",
      "choices": [
        {"option": "A", "text": "\\\\(x = -2\\\\) only"},
        {"option": "B", "text": "\\\\(x = -2\\\\) or \\\\(x = -3\\\\)"},
        {"option": "C", "text": "\\\\(x = 2\\\\) or \\\\(x = 3\\\\)"},
        {"option": "D", "text": "\\\\(x = 5\\\\)"}
      ]
    }
  ],

  "math_m2": [
    {
      "number": 1,
      "question_type": "INPUT",
      "content": "Math M2 savol matni...",
      "math_equation": "",
      "table_data": null,
      "correct_answer": "7",
      "difficulty": "HARD",
      "category": "advanced_math",
      "topic": "Nonlinear equations in one variable",
      "explanation": "Why 7 is correct"
    }
  ]
}`

function Select({ value, onChange, className = '', children, disabled, ...rest }) {
  return (
    <div className="relative inline-flex items-center">
      <select value={value} onChange={onChange} disabled={disabled}
        className={`appearance-none bg-white border border-gray-200 rounded-xl text-sm text-gray-700 pr-8 focus:outline-none focus:border-sky-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...rest}>
        {children}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

function Badge({ variant, children }) {
  const styles = {
    premium: 'bg-slate-100 text-slate-700', free: 'bg-gray-100 text-gray-500',
    easy: 'bg-emerald-100 text-emerald-700', medium: 'bg-slate-100 text-slate-700',
    hard: 'bg-red-100 text-red-700', mcq: 'bg-blue-100 text-blue-700',
    input: 'bg-purple-100 text-purple-700', standard: 'bg-gray-100 text-gray-600',
    EASY: 'bg-green-100 text-green-700', HARD: 'bg-red-100 text-red-700',
  }
  return <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${styles[variant] ?? 'bg-gray-100 text-gray-600'}`}>{children}</span>
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
            <div key={j} className="h-3.5 bg-gray-100 rounded animate-pulse" style={{ width: [160,60,70,70,80,70][j] ?? 80 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Question Edit Modal ────────────────────────────────────────────────────
// ── Choice Image Upload (full test) ────────────────────────────────────────
function ChoiceImageUpload({ questionId, letter, currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file || !questionId) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await api.post(
        `/admin/sat/questions/${questionId}/choice-image/${letter}/`,
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      onUploaded(letter, res.data.url)
    } catch (err) {
      console.error('Choice image upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!questionId || !currentUrl) return
    setDeleting(true)
    try {
      await api.delete(`/admin/sat/questions/${questionId}/choice-image/${letter}/`)
      onUploaded(letter, null)
    } catch (err) {
      console.error('Choice image delete failed', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <input type="file" ref={fileRef} accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files[0])} />
      <button type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading || deleting || !questionId}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition ${
          currentUrl ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-sky-300 hover:text-sky-600'
        } disabled:opacity-40`}
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

function QuestionEditModal({ question, onClose, onSave }) {
  const [form, setForm] = useState({
    content: question?.content || '',
    passage: question?.passage || '',
    question_type: question?.question_type || 'MCQ',
    correct_answer: question?.correct_answer || '',
    difficulty: question?.difficulty || 'MEDIUM',
    explanation: question?.explanation || '',
    choices: question?.choices?.length ? question.choices : [
      { option: 'A', text: '' }, { option: 'B', text: '' },
      { option: 'C', text: '' }, { option: 'D', text: '' },
    ],
  })
  const [choiceImages, setChoiceImages] = useState(() => {
    const imgs = {}
    if (question?.choices) {
      question.choices.forEach(c => { if (c.image) imgs[c.option] = c.image })
    }
    return imgs
  })
  const [imageFile, setImageFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const imgRef = useRef()

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setChoice = (idx, text) => setForm((f) => ({
    ...f,
    choices: f.choices.map((c, i) => i === idx ? { ...c, text } : c),
  }))

  const handle = async () => {
    setLoading(true); setError('')
    try {
      if (imageFile) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => {
          if (k === 'choices') fd.append(k, JSON.stringify(v))
          else fd.append(k, v ?? '')
        })
        fd.append('image', imageFile)
        await api.put(`/admin/sat/questions/${question.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      } else {
        await api.put(`/admin/sat/questions/${question.id}/`, { ...form, remove_image: removeImage })
      }
      onSave(); onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-sm">Edit Question #{question?.id}</h3>
            <p className="text-xs text-gray-400">{question?.section} · Module {question?.module} · Q{question?.number}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && <ErrorBanner msg={error} />}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
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
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Difficulty</label>
              <div className="relative">
                <select value={form.difficulty} onChange={(e) => set('difficulty', e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Correct Answer</label>
              <input value={form.correct_answer} onChange={(e) => set('correct_answer', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400"
                placeholder={form.question_type === 'MCQ' ? 'A' : '42'} />
            </div>
          </div>

          {form.passage !== undefined && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Passage (optional)</label>
              <textarea value={form.passage} onChange={(e) => set('passage', e.target.value)} rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 resize-y"
                placeholder="Reading passage..." />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Question Content</label>
            <textarea value={form.content} onChange={(e) => set('content', e.target.value)} rows={4} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 resize-y"
              placeholder="Use \(...\) for LaTeX..." />
          </div>

          {form.question_type === 'MCQ' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600">Choices (A/B/C/D)</label>
              <div className="grid grid-cols-2 gap-3">
                {form.choices.map((c, idx) => (
                  <div key={c.option}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      {c.option} {form.correct_answer === c.option && <span className="text-green-600">(correct)</span>}
                    </label>
                    <input value={c.text} onChange={(e) => setChoice(idx, e.target.value)}
                      className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-sky-400 transition ${
                        form.correct_answer === c.option ? 'border-green-400 bg-green-50' : 'border-gray-200'
                      }`}
                      placeholder={`Option ${c.option}`} />
                    <ChoiceImageUpload
                      questionId={question?.id}
                      letter={c.option}
                      currentUrl={choiceImages[c.option] || null}
                      onUploaded={(letter, url) => setChoiceImages(prev => ({ ...prev, [letter]: url }))}
                    />
                  </div>
                ))}
              </div>
              {!question?.id && (
                <p className="text-xs text-gray-400">* Rasm yuklash uchun avval savolni saqlang</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Explanation</label>
            <textarea value={form.explanation} onChange={(e) => set('explanation', e.target.value)} rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-sky-400 resize-y" />
          </div>

          {/* Question image upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Savol rasmi (optional)</label>
            {question?.image && !removeImage && (
              <div className="mb-2 flex items-center gap-3">
                <img src={question.image} alt="" className="h-20 rounded-lg border border-gray-200 object-contain" />
                <button type="button" onClick={() => setRemoveImage(true)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { setImageFile(e.target.files[0]); setRemoveImage(false) }} />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => imgRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-600 hover:border-sky-300 transition">
                <Upload size={12} /> {imageFile ? imageFile.name : 'Upload image'}
              </button>
              {imageFile && <button type="button" onClick={() => setImageFile(null)} className="text-xs text-gray-400 hover:text-red-500"><X size={12} /></button>}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
          <button onClick={handle} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-bold disabled:opacity-50">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Tests Tab ──────────────────────────────────────────────────────────────
function TestsTab() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [deletingTestId, setDeletingTestId] = useState(null)

  const { data: testsData, isLoading, error } = useQuery({
    queryKey: ['admin-sat-tests'],
    queryFn: () => api.get('/admin/sat/tests/').then((r) => r.data),
    staleTime: 30_000,
  })

  const patchTest = useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/admin/sat/tests/${id}/`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sat-tests'] }),
  })
  const deleteTest = useMutation({
    mutationFn: (id) => api.delete(`/admin/sat/tests/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-sat-tests'] }),
  })

  const tests = Array.isArray(testsData) ? testsData : (testsData?.results ?? [])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-bold hover:opacity-90 transition">
          <Plus size={14} /> Add Test
        </button>
      </div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
        {isLoading ? <TableSkeleton rows={4} cols={7} /> : error ? (
          <div className="p-8 flex items-center gap-3 text-red-600"><AlertCircle size={16} /><span className="text-sm">{error.message}</span></div>
        ) : !tests.length ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <BookOpen size={28} className="text-sky-200" />
            <p className="text-sm text-gray-400">No SAT tests yet. Add one or import via JSON.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-sky-50/50 border-b border-sky-100/50">
                  {['Test', 'Year', 'Month', 'Form', 'Mode', 'Region', 'Sections', 'Active', 'Premium', 'Delete'].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tests.map((t, i) => (
                  <motion.tr key={t.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                    className="hover:bg-sky-50/20 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-gray-800 max-w-[180px] truncate">
                      {t.name || t.display_name || `${t.test_type ?? 'SAT'} ${t.year}`}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.year ?? '—'}</td>
                    <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{t.month ? MONTHS[t.month - 1] ?? t.month : '—'}</td>
                    <td className="px-4 py-3.5 text-gray-600">{t.form ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      {t.test_mode === 'INDIVIDUAL'
                        ? <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-700">Individual</span>
                        : <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-100 text-sky-700">Full</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Globe size={11} />{t.is_international ? 'INTL' : 'US'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{t.sections ?? t.sections_count ?? '—'}</td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => patchTest.mutate({ id: t.id, patch: { is_active: !t.is_active } })}>
                        {t.is_active ? <ToggleRight size={24} className="text-sky-500" /> : <ToggleLeft size={24} className="text-gray-300" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => patchTest.mutate({ id: t.id, patch: { is_premium: !t.is_premium } })}>
                        {t.is_premium ? <Lock size={16} className="text-slate-500" /> : <Unlock size={16} className="text-gray-300 hover:text-slate-400" />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setDeletingTestId(t.id)}
                        disabled={deleteTest.isPending}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                        title="Delete test"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {showAdd && <AddTestModal onClose={() => setShowAdd(false)} onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-sat-tests'] })} />}

      {/* Delete test confirm */}
      <AnimatePresence>
        {deletingTestId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">Delete Test?</h3>
              <p className="text-sm text-gray-500">Bu test va uning barcha savollari o'chib ketadi. Bu amalni qaytarib bo'lmaydi.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingTestId(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button
                  onClick={() => { deleteTest.mutate(deletingTestId); setDeletingTestId(null) }}
                  disabled={deleteTest.isPending}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AddTestModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ year: new Date().getFullYear(), month: 1, form: 'A', test_type: 'SAT', is_international: false, is_premium: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handle = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      await api.post('/import/sat/test/', form)
      onSuccess(); onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-sm">Add SAT Test</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={16} /></button>
        </div>
        <form onSubmit={handle} className="p-5 space-y-4">
          {error && <ErrorBanner msg={error} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Year</label>
              <input type="number" value={form.year} onChange={(e) => set('year', +e.target.value)} min="2000" max="2099"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Month</label>
              <div className="relative">
                <select value={form.month} onChange={(e) => set('month', +e.target.value)}
                  className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-400">
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Form</label>
              <input value={form.form} onChange={(e) => set('form', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400" placeholder="A" />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_premium} onChange={(e) => set('is_premium', e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-gray-700">Premium</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-white text-sm font-bold disabled:opacity-50">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Create
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Module filter options ─────────────────────────────────────────────────
const MODULE_FILTERS_FULL = [
  { value: '', label: 'All Modules', section: '', module: '', variant: '' },
  { value: 'ENG_M1',    label: 'English — Module 1',    section: 'ENGLISH', module: '1', variant: 'STANDARD' },
  { value: 'ENG_M2_E',  label: 'English — M2 Easy',     section: 'ENGLISH', module: '2', variant: 'EASY' },
  { value: 'ENG_M2_M',  label: 'English — M2 Medium',   section: 'ENGLISH', module: '2', variant: 'MEDIUM' },
  { value: 'ENG_M2_H',  label: 'English — M2 Hard',     section: 'ENGLISH', module: '2', variant: 'HARD' },
  { value: 'MATH_M1',   label: 'Math — Module 1',        section: 'MATH',    module: '1', variant: 'STANDARD' },
  { value: 'MATH_M2_E', label: 'Math — M2 Easy',         section: 'MATH',    module: '2', variant: 'EASY' },
  { value: 'MATH_M2_M', label: 'Math — M2 Medium',       section: 'MATH',    module: '2', variant: 'MEDIUM' },
  { value: 'MATH_M2_H', label: 'Math — M2 Hard',         section: 'MATH',    module: '2', variant: 'HARD' },
]
const MODULE_FILTERS_INDIVIDUAL = [
  { value: '', label: 'All Modules', section: '', module: '', variant: '' },
  { value: 'ENG_M1',   label: 'English — Module 1', section: 'ENGLISH', module: '1', variant: 'STANDARD' },
  { value: 'ENG_M2_S', label: 'English — Module 2', section: 'ENGLISH', module: '2', variant: 'STANDARD' },
  { value: 'MATH_M1',  label: 'Math — Module 1',    section: 'MATH',    module: '1', variant: 'STANDARD' },
  { value: 'MATH_M2_S',label: 'Math — Module 2',    section: 'MATH',    module: '2', variant: 'STANDARD' },
]

// Module sort order for display
const MODULE_ORDER = ['ENG_M1','ENG_M2_E','ENG_M2_M','ENG_M2_H','ENG_M2_S','MATH_M1','MATH_M2_E','MATH_M2_M','MATH_M2_H','MATH_M2_S']
function moduleKey(q) {
  if (q.section === 'ENGLISH' && q.module === 1) return 'ENG_M1'
  if (q.section === 'ENGLISH' && q.module === 2 && q.difficulty_variant === 'EASY')     return 'ENG_M2_E'
  if (q.section === 'ENGLISH' && q.module === 2 && q.difficulty_variant === 'MEDIUM')   return 'ENG_M2_M'
  if (q.section === 'ENGLISH' && q.module === 2 && q.difficulty_variant === 'HARD')     return 'ENG_M2_H'
  if (q.section === 'ENGLISH' && q.module === 2 && q.difficulty_variant === 'STANDARD') return 'ENG_M2_S'
  if (q.section === 'MATH'    && q.module === 1) return 'MATH_M1'
  if (q.section === 'MATH'    && q.module === 2 && q.difficulty_variant === 'EASY')     return 'MATH_M2_E'
  if (q.section === 'MATH'    && q.module === 2 && q.difficulty_variant === 'MEDIUM')   return 'MATH_M2_M'
  if (q.section === 'MATH'    && q.module === 2 && q.difficulty_variant === 'HARD')     return 'MATH_M2_H'
  if (q.section === 'MATH'    && q.module === 2 && q.difficulty_variant === 'STANDARD') return 'MATH_M2_S'
  return 'ZZZ'
}

// ── Questions Analysis Tab ─────────────────────────────────────────────────
function QuestionsTab() {
  const qc = useQueryClient()
  const [modeFilter, setModeFilter] = useState('')        // '' | 'FULL' | 'INDIVIDUAL'
  const [testId, setTestId] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')   // one of MODULE_FILTERS values
  const [expandedId, setExpandedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const { data: testsData } = useQuery({
    queryKey: ['admin-sat-tests'],
    queryFn: () => api.get('/admin/sat/tests/').then((r) => r.data),
    staleTime: 60_000,
  })

  const deleteQuestion = useMutation({
    mutationFn: (id) => api.delete(`/admin/sat/questions/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-sat-questions'] })
      setDeletingId(null)
    },
  })

  const allTests = Array.isArray(testsData) ? testsData : (testsData?.results ?? [])
  const tests = modeFilter
    ? allTests.filter(t => modeFilter === 'FULL' ? (t.test_mode === 'FULL' || !t.test_mode) : t.test_mode === 'INDIVIDUAL')
    : allTests
  const selectedTest = allTests.find(t => String(t.id) === String(testId))
  const MODULE_FILTERS = selectedTest?.test_mode === 'INDIVIDUAL' ? MODULE_FILTERS_INDIVIDUAL : MODULE_FILTERS_FULL

  const selectedMod = MODULE_FILTERS.find(f => f.value === moduleFilter) || MODULE_FILTERS[0]

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-sat-questions', testId, moduleFilter],
    queryFn: () => api.get('/admin/sat/questions/', {
      params: {
        ...(testId && { test_id: testId }),
        ...(selectedMod.section  && { section: selectedMod.section }),
        ...(selectedMod.module   && { module:  selectedMod.module }),
        ...(selectedMod.variant  && { difficulty_variant: selectedMod.variant }),
      },
    }).then((r) => r.data).catch((err) => {
      if (err.response?.status === 404) return []
      throw err
    }),
    enabled: !!testId,
    staleTime: 30_000,
  })

  // Sort questions: module order → question number
  const questions = useMemo(() => {
    const raw = Array.isArray(data) ? data : (data?.results ?? [])
    return [...raw].sort((a, b) => {
      const oa = MODULE_ORDER.indexOf(moduleKey(a))
      const ob = MODULE_ORDER.indexOf(moduleKey(b))
      if (oa !== ob) return oa - ob
      return a.number - b.number
    })
  }, [data])

  const toggleExpand = useCallback((id) => setExpandedId((p) => p === id ? null : id), [])

  return (
    <div className="space-y-4">
      {/* Filters — 3 dropdowns */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center gap-3">
        {/* 0: Mode filter */}
        <Select
          value={modeFilter}
          onChange={(e) => { setModeFilter(e.target.value); setTestId(''); setModuleFilter(''); setExpandedId(null) }}
          className="py-2.5 min-w-[160px]"
        >
          <option value="">Barcha testlar</option>
          <option value="FULL">Full Test (Adaptive)</option>
          <option value="INDIVIDUAL">Individual Module</option>
        </Select>

        {/* 1: Test name */}
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <Select value={testId} onChange={(e) => { setTestId(e.target.value); setExpandedId(null); setModuleFilter('') }} className="pl-8 py-2.5 min-w-[220px]">
            <option value="">— Test tanlang —</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.display_name || `SAT ${t.year} ${MONTHS[(t.month ?? 1) - 1] ?? ''}`}{t.test_mode === 'INDIVIDUAL' ? ' [Individual]' : ''}
              </option>
            ))}
          </Select>
        </div>

        {/* 2: Module combined filter */}
        <div className="relative">
          <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <Select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setExpandedId(null) }}
            className="pl-8 py-2.5 min-w-[200px]" disabled={!testId}>
            {MODULE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </Select>
        </div>

        {testId && (
          <span className="text-xs text-gray-400 ml-auto">
            {isLoading ? 'Yuklanmoqda…' : `${questions.length} ta savol`}
          </span>
        )}
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
        {!testId ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <Layers size={28} className="text-sky-200" />
            <p className="text-sm font-semibold text-gray-600">Select a test to view questions</p>
          </div>
        ) : isLoading ? <TableSkeleton rows={5} cols={5} /> : error ? (
          <div className="p-8 flex items-center gap-3 text-red-600"><AlertCircle size={16} /><span className="text-sm">{error.message}</span></div>
        ) : !questions.length ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <FileText size={28} className="text-sky-200" />
            <p className="text-sm text-gray-600">No questions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-sky-50/50 border-b border-sky-100/50">
                  {['Q#', 'Section', 'Module', 'Type', 'Diff', 'Content', 'Answer', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {questions.map((q, i) => {
                  // Show module group header when module changes
                  const prev = questions[i - 1]
                  const showHeader = !prev || moduleKey(q) !== moduleKey(prev)
                  const modInfo = MODULE_FILTERS.find(f => f.value === moduleKey(q))
                  return (
                  <>
                    {showHeader && (
                      <tr key={`header-${moduleKey(q)}`}>
                        <td colSpan={8} className="px-4 py-2 bg-slate-800/5 border-t-2 border-slate-200">
                          <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">
                            {modInfo?.label || `${q.section} · M${q.module}`}
                          </span>
                        </td>
                      </tr>
                    )}
                    <motion.tr key={q.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                      className="hover:bg-sky-50/20 transition-colors cursor-pointer" onClick={() => toggleExpand(q.id)}>
                      <td className="px-4 py-3.5 font-bold text-gray-700">Q{q.number}</td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{q.section}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">M{q.module}</span>
                          {q.difficulty_variant && q.difficulty_variant !== 'STANDARD' && (
                            <Badge variant={q.difficulty_variant}>{q.difficulty_variant}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={q.question_type === 'MCQ' ? 'mcq' : 'input'}>{q.question_type}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={q.difficulty?.toLowerCase()}>{q.difficulty?.toLowerCase()}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 max-w-xs">
                        <p className="text-xs line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(q.content?.slice(0, 100) + (q.content?.length > 100 ? '…' : ''))) }}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-black text-sky-600">{q.correct_answer}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <ChevronRight size={14} className={`text-gray-400 transition-transform ${expandedId === q.id ? 'rotate-90' : ''}`} />
                          <button onClick={(e) => { e.stopPropagation(); setEditing(q) }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-sky-500 hover:bg-sky-50 transition" title="Edit">
                            <Code2 size={13} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingId(q.id) }}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition" title="Delete question">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>

                    {expandedId === q.id && (
                      <tr key={`exp-${q.id}`}>
                        <td colSpan={9} className="px-4 pb-4 pt-2 bg-sky-50/30">
                          <div className="space-y-2 text-sm">
                            {q.image && (
                              <img src={q.image} alt="Question" className="max-h-40 rounded-lg border border-gray-200 object-contain" />
                            )}
                            {q.passage && (
                              <div
                                className="text-xs bg-white rounded-xl p-3 border border-gray-100 max-h-32 overflow-y-auto text-gray-600 leading-relaxed
                                  [&_u]:underline [&_b]:font-bold [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-gray-200 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-gray-50 [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.passage.replace(/\n/g, '<br/>')) }}
                              />
                            )}
                            <div
                              className="text-sm bg-white rounded-xl p-3 border border-sky-100 text-gray-700 leading-relaxed"
                              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(q.content)) }}
                            />
                            {q.table_data && Array.isArray(q.table_data) && q.table_data.length > 0 && (
                              <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full border-collapse text-xs">
                                  <tbody>
                                    {q.table_data.map((row, ri) => (
                                      <tr key={ri} className={ri === 0 ? 'bg-gray-100' : ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                        {(Array.isArray(row) ? row : [row]).map((cell, ci) => (
                                          ri === 0
                                            ? <th key={ci} className="border border-gray-200 px-2 py-1.5 font-semibold text-left">{cell}</th>
                                            : <td key={ci} className="border border-gray-200 px-2 py-1.5">{cell}</td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {q.question_type === 'MCQ' && q.choices?.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {q.choices.map((c) => (
                                  <div key={c.option} className={`flex gap-2 px-3 py-1.5 rounded-xl text-xs ${
                                    q.correct_answer === c.option
                                      ? 'bg-green-100 border border-green-200 font-bold text-green-800'
                                      : 'bg-white border border-gray-100 text-gray-600'
                                  }`}>
                                    <span className="font-black">{c.option}</span>
                                    <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMath(c.text)) }} />
                                    {q.correct_answer === c.option && <CheckCircle2 size={12} className="text-green-600 ml-auto flex-shrink-0" />}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.explanation && (
                              <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800">
                                <strong>Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {editing && (
          <QuestionEditModal
            question={editing}
            onClose={() => setEditing(null)}
            onSave={() => qc.invalidateQueries({ queryKey: ['admin-sat-questions'] })}
          />
        )}
      </AnimatePresence>

      {/* Delete question confirm */}
      <AnimatePresence>
        {deletingId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.93 }} animate={{ scale: 1 }} exit={{ scale: 0.93 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Trash2 size={22} className="text-red-500" />
              </div>
              <h3 className="font-bold text-gray-900">Delete Question?</h3>
              <p className="text-sm text-gray-500">This question will be permanently deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => deleteQuestion.mutate(deletingId)} disabled={deleteQuestion.isPending}
                  className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                  {deleteQuestion.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Import Tab ─────────────────────────────────────────────────────────────
function ImportPanel({ mode }) {
  const [json, setJson] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  const isFull = mode === 'FULL'
  const example = isFull ? FULL_JSON_EXAMPLE : INDIVIDUAL_JSON_EXAMPLE

  const cleanJson = (raw) => {
    let s = raw.replace(/\/\/[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
    try { return JSON.parse(s) } catch {}
    return null
  }

  const handleImport = async () => {
    setError(''); setStatus(null)
    const data = cleanJson(json)
    if (!data) { setError('Invalid JSON. Check syntax.'); return }
    // Force correct test_mode based on selected tab
    data.test_mode = mode
    setLoading(true)
    try {
      const res = await api.post('/import/sat/mock/', data)
      setStatus({ ok: true, msg: `✓ ${res.data.total_questions} ta savol import qilindi — ${res.data.test_name} [${res.data.test_mode}]` })
      setJson('')
    } catch (err) {
      setError(err.response?.data?.error || JSON.stringify(err.response?.data) || 'Import failed.')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-5 space-y-4">
      {/* Info block */}
      {isFull ? (
        <div className="bg-sky-50 rounded-xl p-3 text-xs text-sky-700 leading-relaxed space-y-1">
          <p><strong>Full Test (Adaptive)</strong> — 4 ta M2 modul kerak:</p>
          <p className="font-mono bg-white/60 rounded px-2 py-1">
            english_m1 · english_m2_easy · english_m2_medium · english_m2_hard
          </p>
          <p className="font-mono bg-white/60 rounded px-2 py-1">
            math_m1 · math_m2_easy · math_m2_medium · math_m2_hard
          </p>
          <p className="text-sky-600 mt-1">
            M1 &lt;60% → Easy · 60–85% → Medium · &gt;85% → Hard (avtomatik yo'naltiriladi)
          </p>
        </div>
      ) : (
        <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-700 leading-relaxed space-y-1">
          <p><strong>Individual Module</strong> — faqat 1 ta M2 modul kerak:</p>
          <p className="font-mono bg-white/60 rounded px-2 py-1">
            english_m1 · english_m2
          </p>
          <p className="font-mono bg-white/60 rounded px-2 py-1">
            math_m1 · math_m2
          </p>
          <p className="text-violet-600 mt-1">
            User har bir modulni alohida yechadi. Adaptive routing yo'q.
          </p>
        </div>
      )}

      {error && <ErrorBanner msg={error} />}
      {status?.ok && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
          <CheckCircle2 size={15} />{status.msg}
        </div>
      )}

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={16}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-400 resize-y bg-gray-50"
        placeholder="JSON ni shu yerga paste qiling..."
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
        <button onClick={() => setJson(example)}
          className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-700 font-medium px-3 py-2 bg-sky-50 rounded-xl transition">
          <ClipboardPaste size={13} /> Example
        </button>
        <div className="flex-1" />
        <button onClick={handleImport} disabled={loading || !json.trim()}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition ${
            isFull ? 'gradient-primary' : 'bg-violet-600 hover:bg-violet-700'
          }`}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {loading ? 'Import qilinmoqda…' : 'Import'}
        </button>
      </div>
    </div>
  )
}

function ImportTab() {
  const [importMode, setImportMode] = useState('FULL')

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl shadow-card border border-sky-50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileJson size={16} className="text-sky-500" />
          <h3 className="font-bold text-sm text-gray-800">Import Mock Test (JSON)</h3>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setImportMode('FULL')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            importMode === 'FULL'
              ? 'border-sky-500 text-sky-600 bg-sky-50/50'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <Layers size={14} />
          Full Test
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-600 font-bold">ADAPTIVE</span>
        </button>
        <button
          onClick={() => setImportMode('INDIVIDUAL')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
            importMode === 'INDIVIDUAL'
              ? 'border-violet-500 text-violet-600 bg-violet-50/50'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <LayoutGrid size={14} />
          Individual Module
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold">STANDARD</span>
        </button>
      </div>

      <ImportPanel key={importMode} mode={importMode} />
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminSATTests() {
  const [tab, setTab] = useState('tests')

  return (
    <div className="space-y-5">
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <FileText size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Full-Length Tests</h2>
          <p className="text-xs text-gray-400">Manage SAT mock tests, questions, and adaptive modules</p>
        </div>
      </motion.div>

      <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-sm border border-sky-50 w-fit">
        {[
          { key: 'tests', label: 'Tests', icon: BookOpen },
          { key: 'questions', label: 'Questions', icon: FileText },
          { key: 'import', label: 'Import', icon: FileJson },
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
          {tab === 'tests' && <TestsTab />}
          {tab === 'questions' && <QuestionsTab />}
          {tab === 'import' && <ImportTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}


