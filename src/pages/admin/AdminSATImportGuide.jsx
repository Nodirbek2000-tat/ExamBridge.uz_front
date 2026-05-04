import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, FileJson, Copy, CheckCircle2, ChevronDown, ChevronRight,
  Info, Zap, AlertCircle, Hash,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.06 } }),
}

// ── JSON examples ─────────────────────────────────────────────────────────

const PRACTICE_MATH_JSON = `{
  "subject": "Math",
  "category": "algebra",
  "topics": [
    {
      "topic": "Linear Equations",
      "questions": [
        {
          "question_type": "MCQ",
          "content": "If 3x + 6 = 21, what is the value of x?",
          "choice_a": "3",
          "choice_b": "5",
          "choice_c": "7",
          "choice_d": "9",
          "correct_answer": "B",
          "difficulty": "easy",
          "explanation": "3x = 15, x = 5"
        },
        {
          "question_type": "INPUT",
          "content": "If 2x - 4 = 10, what is the value of x?",
          "correct_answer": "7",
          "difficulty": "easy",
          "explanation": "2x = 14, x = 7"
        }
      ]
    },
    {
      "topic": "Systems of Equations",
      "questions": [
        {
          "question_type": "MCQ",
          "content": "x + y = 10 va x - y = 4 bo'lsa, x necha?",
          "choice_a": "5",
          "choice_b": "6",
          "choice_c": "7",
          "choice_d": "8",
          "correct_answer": "C",
          "difficulty": "medium",
          "explanation": "2x = 14, x = 7"
        }
      ]
    }
  ]
}`

const PRACTICE_ENGLISH_JSON = `{
  "subject": "English",
  "category": "craft_structure",
  "topics": [
    {
      "topic": "Word Choice",
      "questions": [
        {
          "question_type": "MCQ",
          "content": "Which word best completes the sentence: The scientist's findings were ___.",
          "choice_a": "dubious",
          "choice_b": "groundbreaking",
          "choice_c": "mundane",
          "choice_d": "negligible",
          "correct_answer": "B",
          "difficulty": "medium",
          "explanation": "'Groundbreaking' means innovative and significant."
        }
      ]
    }
  ]
}`

const MOCK_JSON = `{
  "year": 2024,
  "month": 3,
  "form": "A",
  "is_international": false,
  "is_premium": false,

  "english_m1": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "Savol matni...",
      "passage": "O'qish matni (ixtiyoriy)...",
      "correct_answer": "A",
      "difficulty": "EASY",
      "explanation": "Nima uchun A to'g'ri...",
      "choices": [
        {"option": "A", "text": "Javob A"},
        {"option": "B", "text": "Javob B"},
        {"option": "C", "text": "Javob C"},
        {"option": "D", "text": "Javob D"}
      ]
    }
  ],

  "english_m2_easy": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "Oson M2 savoli...",
      "correct_answer": "B",
      "difficulty": "EASY",
      "choices": [...]
    }
  ],

  "english_m2_hard": [
    {
      "number": 1,
      "question_type": "MCQ",
      "content": "Qiyin M2 savoli...",
      "correct_answer": "C",
      "difficulty": "HARD",
      "choices": [...]
    }
  ],

  "math_m1": [...],
  "math_m2_easy": [...],
  "math_m2_hard": [...]
}`

// ── Helpers ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
        copied ? 'bg-green-100 text-green-700' : 'bg-white/80 text-gray-500 hover:bg-sky-50 hover:text-sky-600'
      }`}>
      {copied ? <><CheckCircle2 size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  )
}

function CodeBlock({ code, title }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <FileJson size={13} className="text-sky-400" />{title}
        </span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-xs font-mono text-gray-700 overflow-x-auto bg-gray-50/50 leading-relaxed max-h-64 overflow-y-auto">
        {code}
      </pre>
    </div>
  )
}

function Step({ num, title, desc, children }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-black shadow-sm">
          {num}
        </div>
      </div>
      <div className="flex-1 min-w-0 pb-6 border-l-2 border-sky-100 pl-4 ml-[-28px] mt-0.5" style={{ marginLeft: 0, paddingLeft: '1rem', borderLeft: 'none' }}>
        <div className="font-bold text-sm text-gray-800 mb-1">{title}</div>
        {desc && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{desc}</p>}
        {children}
      </div>
    </div>
  )
}

function FieldTable({ fields }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-sky-50/50">
            <th className="text-left px-3 py-2 font-semibold text-gray-600 w-36">Field</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600 w-24">Required</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Values / Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {fields.map((f) => (
            <tr key={f.name} className="hover:bg-gray-50/50">
              <td className="px-3 py-2 font-mono text-sky-600 font-semibold">{f.name}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${f.req ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                  {f.req ? 'required' : 'optional'}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600">{f.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Section({ title, icon: Icon, color = 'orange', children, index = 0 }) {
  const [open, setOpen] = useState(true)
  return (
    <motion.div custom={index} variants={fadeUp} initial="hidden" animate="visible"
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-${color}-100`}>
          <Icon size={16} className={`text-${color}-600`} />
        </div>
        <span className="flex-1 text-left font-bold text-gray-900 text-sm">{title}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-50">{children}</div>}
    </motion.div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AdminSATImportGuide() {
  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
          <FileJson size={17} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">SAT Import Guide</h2>
          <p className="text-xs text-gray-400">JSON formatlari va import qilish yo'riqnomasi</p>
        </div>
      </motion.div>

      {/* Overview */}
      <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-sky-50 border border-sky-200 rounded-2xl p-4 grid grid-cols-3 gap-3 text-sm">
        {[
          { icon: BookOpen, label: 'Practice Questions', path: 'SAT → Practice Questions → Import JSON', color: 'text-sky-600' },
          { icon: Hash, label: 'Full Mock Tests', path: 'SAT → Full-Length Tests → Import', color: 'text-slate-600' },
          { icon: Zap, label: 'Real Mock (adaptive)', path: 'SAT → Full-Length Tests → Import (same)', color: 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-3">
            <item.icon size={15} className={`${item.color} mb-1.5`} />
            <div className="font-bold text-gray-800 text-xs mb-0.5">{item.label}</div>
            <div className="text-[11px] text-gray-500 flex items-center gap-1">
              <ChevronRight size={10} />{item.path}
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── PRACTICE IMPORT ─────────────────────────────────────────── */}
      <Section title="Practice Questions Import" icon={BookOpen} color="orange" index={2}>
        <div className="pt-3 space-y-5">
          {/* Where */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl text-sm">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-800">Qayerda import qilinadi: </span>
              <span className="text-blue-700">Admin Panel → SAT → Practice Questions → "Import JSON" tab</span>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-gray-700">Qadamlar:</h4>
            <div className="space-y-2 text-sm">
              {[
                { n: 1, t: 'Admin panelga kiring', d: '/admin-panel → SAT → Practice Questions' },
                { n: 2, t: '"Import JSON" tabini bosing', d: null },
                { n: 3, t: 'JSONni tayyorlang', d: 'Quyidagi formatda JSON yozing yoki faylga saqlang' },
                { n: 4, t: '"Example" tugmasini bosing', d: 'Namuna JSON ko\'rish uchun — o\'zgartiring va import qiling' },
                { n: 5, t: '"Import Questions" tugmasini bosing', d: 'Natija: "Imported X questions from Y topics" xabari chiqadi' },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white flex-shrink-0 flex items-center justify-center text-xs font-black">{s.n}</span>
                  <div>
                    <span className="font-semibold text-gray-800">{s.t}</span>
                    {s.d && <span className="text-gray-500"> — {s.d}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Structure */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">Tuzilma (Structure):</h4>
            <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 space-y-1">
              <div><span className="text-sky-500">subject</span> → <span className="text-blue-500">category</span> → <span className="text-green-600">topics[]</span> → <span className="text-purple-500">questions[]</span></div>
              <div className="mt-2 pl-2 border-l-2 border-sky-200">
                <div><span className="text-sky-500">"Math"</span> → <span className="text-blue-500">"algebra"</span> → topic: <span className="text-green-600">"Linear Equations"</span> → savollar</div>
                <div><span className="text-sky-500">"English"</span> → <span className="text-blue-500">"craft_structure"</span> → topic: <span className="text-green-600">"Word Choice"</span> → savollar</div>
              </div>
            </div>
          </div>

          {/* Subject/Category values */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-2">Math categories:</h4>
              <div className="space-y-1.5 text-xs">
                {[
                  { key: 'algebra', label: 'Algebra' },
                  { key: 'advanced_math', label: 'Advanced Math' },
                  { key: 'problem_data', label: 'Problem-Solving & Data Analysis' },
                  { key: 'geometry', label: 'Geometry & Trigonometry' },
                ].map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <code className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded font-mono">{c.key}</code>
                    <span className="text-gray-500">→ {c.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm text-gray-700 mb-2">English categories:</h4>
              <div className="space-y-1.5 text-xs">
                {[
                  { key: 'craft_structure', label: 'Craft & Structure' },
                  { key: 'expression_ideas', label: 'Expression of Ideas' },
                  { key: 'info_ideas', label: 'Information & Ideas' },
                  { key: 'standard_english', label: 'Standard English Conventions' },
                ].map((c) => (
                  <div key={c.key} className="flex items-center gap-2">
                    <code className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">{c.key}</code>
                    <span className="text-gray-500">→ {c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">Savol maydonlari (question fields):</h4>
            <FieldTable fields={[
              { name: 'question_type', req: true, desc: '"MCQ" (4 javobli) yoki "INPUT" (o\'quvchi yozadi)' },
              { name: 'content', req: true, desc: 'Savol matni. HTML va LaTeX qo\'llab-quvvatlanadi: \\(...\\) inline, \\[...\\] block' },
              { name: 'choice_a/b/c/d', req: false, desc: 'MCQ uchun variant matni. INPUT uchun shart emas' },
              { name: 'correct_answer', req: true, desc: 'MCQ: "A", "B", "C" yoki "D". INPUT: to\'g\'ri qiymat, masalan "7" yoki "3/4"' },
              { name: 'difficulty', req: false, desc: '"easy", "medium" yoki "hard". Default: "medium"' },
              { name: 'explanation', req: false, desc: 'To\'g\'ri javob tushuntirmasi' },
              { name: 'year', req: false, desc: 'Savol yili, masalan 2024' },
              { name: 'source', req: false, desc: 'Manba, masalan "SAT 2024 March"' },
            ]} />
          </div>

          {/* Math example */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">Math (Algebra) — to'liq namuna:</h4>
            <CodeBlock code={PRACTICE_MATH_JSON} title="practice_math_algebra.json" />
          </div>

          {/* English example */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">English (Craft & Structure) — namuna:</h4>
            <CodeBlock code={PRACTICE_ENGLISH_JSON} title="practice_english_craft.json" />
          </div>
        </div>
      </Section>

      {/* ─── MOCK IMPORT ─────────────────────────────────────────────── */}
      <Section title="Full Mock Test Import (Adaptive)" icon={Zap} color="amber" index={3}>
        <div className="pt-3 space-y-5">
          {/* Where */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl text-sm">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-800">Qayerda import qilinadi: </span>
              <span className="text-blue-700">Admin Panel → SAT → Full-Length Tests → "Import" tab</span>
            </div>
          </div>

          {/* Adaptive explanation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
            <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Zap size={14} /> Adaptive Module 2 qanday ishlaydi?
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="font-bold text-green-700 mb-1">Module 1 da ≥ 50% to'g'ri</div>
                <div className="text-green-600">→ <strong>english_m2_hard</strong> yoki <strong>math_m2_hard</strong> ko'rsatiladi</div>
                <div className="text-gray-400 mt-1">Ball diapazoni: ~600–800</div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-slate-200">
                <div className="font-bold text-slate-700 mb-1">Module 1 da &lt; 50% to'g'ri</div>
                <div className="text-slate-600">→ <strong>english_m2_easy</strong> yoki <strong>math_m2_easy</strong> ko'rsatiladi</div>
                <div className="text-gray-400 mt-1">Ball diapazoni: ~400–600</div>
              </div>
            </div>
          </div>

          {/* Structure */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">Mock test tuzilmasi:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {[
                { label: 'English M1', key: 'english_m1', count: '27 savol', time: '32 daqiqa', color: 'bg-sky-50 border-sky-200' },
                { label: 'English M2 Easy', key: 'english_m2_easy', count: '27 savol', time: '32 daqiqa', color: 'bg-green-50 border-green-200' },
                { label: 'English M2 Hard', key: 'english_m2_hard', count: '27 savol', time: '32 daqiqa', color: 'bg-red-50 border-red-200' },
                { label: 'Math M1', key: 'math_m1', count: '22 savol', time: '35 daqiqa', color: 'bg-slate-50 border-slate-200' },
                { label: 'Math M2 Easy', key: 'math_m2_easy', count: '22 savol', time: '35 daqiqa', color: 'bg-green-50 border-green-200' },
                { label: 'Math M2 Hard', key: 'math_m2_hard', count: '22 savol', time: '35 daqiqa', color: 'bg-red-50 border-red-200' },
              ].map((m) => (
                <div key={m.key} className={`rounded-xl p-2.5 border ${m.color}`}>
                  <div className="font-bold text-gray-800 mb-0.5">{m.label}</div>
                  <code className="text-gray-500 text-[10px]">{m.key}</code>
                  <div className="text-gray-400 mt-1">{m.count} · {m.time}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top-level fields */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">Asosiy maydonlar:</h4>
            <FieldTable fields={[
              { name: 'year', req: true, desc: 'Test yili, masalan 2024' },
              { name: 'month', req: true, desc: 'Test oyi (raqam): 1=January, 3=March, 5=May, 10=October...' },
              { name: 'form', req: false, desc: 'Form harfi: "A", "B", "C". Default: "A"' },
              { name: 'is_international', req: false, desc: 'true/false. Default: false (US)' },
              { name: 'is_premium', req: false, desc: 'true/false. Default: false' },
              { name: 'english_m1', req: false, desc: 'English Module 1 savollari massivi (27 ta tavsiya)' },
              { name: 'english_m2_easy', req: false, desc: 'English Module 2 — Oson variant (M1 < 50%)' },
              { name: 'english_m2_hard', req: false, desc: 'English Module 2 — Qiyin variant (M1 ≥ 50%)' },
              { name: 'math_m1', req: false, desc: 'Math Module 1 savollari (22 ta tavsiya)' },
              { name: 'math_m2_easy', req: false, desc: 'Math Module 2 — Oson variant' },
              { name: 'math_m2_hard', req: false, desc: 'Math Module 2 — Qiyin variant' },
            ]} />
          </div>

          {/* Question fields */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">Har bir savol maydonlari:</h4>
            <FieldTable fields={[
              { name: 'number', req: true, desc: 'Savol raqami: 1, 2, 3...' },
              { name: 'question_type', req: true, desc: '"MCQ" yoki "INPUT"' },
              { name: 'content', req: true, desc: 'Savol matni (HTML/LaTeX qo\'llab-quvvatlanadi)' },
              { name: 'passage', req: false, desc: 'English savollari uchun o\'qish matni' },
              { name: 'correct_answer', req: true, desc: 'MCQ: "A"/"B"/"C"/"D". INPUT: son yoki kasrli javob' },
              { name: 'difficulty', req: false, desc: '"EASY", "MEDIUM" yoki "HARD"' },
              { name: 'explanation', req: false, desc: 'To\'g\'ri javob tushuntirmasi' },
              { name: 'choices', req: false, desc: 'MCQ uchun: [{option: "A", text: "..."}, ...]' },
            ]} />
          </div>

          {/* Mock example */}
          <div>
            <h4 className="font-bold text-sm text-gray-700 mb-2">To'liq namuna:</h4>
            <CodeBlock code={MOCK_JSON} title="sat_mock_2024_march.json" />
          </div>
        </div>
      </Section>

      {/* ─── LATEX GUIDE ─────────────────────────────────────────────── */}
      <Section title="LaTeX Yozish Qo'llanmasi" icon={Hash} color="purple" index={4}>
        <div className="pt-3 space-y-4">
          <div className="text-sm text-gray-600">
            Matematik formulalar uchun LaTeX ishlatiladi. Barcha savol va javoblar LaTeX-ni to'g'ri ko'rsatadi.
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { type: 'Inline (qatorda)', syntax: '\\( x^2 + 1 \\)', result: 'x² + 1 kabi ko\'rinadi' },
              { type: 'Block (alohida qatorda)', syntax: '\\[ \\frac{a}{b} = c \\]', result: 'Markazda alohida qatorda' },
              { type: 'Kasrlar', syntax: '\\frac{3}{4}', result: '3/4' },
              { type: 'Daraja', syntax: 'x^{2}', result: 'x²' },
              { type: 'Ildiz', syntax: '\\sqrt{x}', result: '√x' },
              { type: 'Pi', syntax: '\\pi', result: 'π' },
              { type: 'Ko\'paytma', syntax: '\\times', result: '×' },
              { type: 'Bo\'linma', syntax: '\\div', result: '÷' },
              { type: 'Tengsizlik', syntax: '\\leq, \\geq', result: '≤, ≥' },
              { type: 'Mutlaq qiymat', syntax: '|x|', result: '|x|' },
            ].map((item) => (
              <div key={item.type} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="font-semibold text-gray-700 mb-1">{item.type}</div>
                <code className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded block mb-1">{item.syntax}</code>
                <div className="text-gray-500">{item.result}</div>
              </div>
            ))}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
            <AlertCircle size={12} className="inline mr-1" />
            <strong>Eslatma:</strong> JSON ichida LaTeX yozganda backslash (\) ni ikki marta yozing: <code>\\( x^2 \\)</code> → <code>\\\\( x^2 \\\\)</code>
          </div>
        </div>
      </Section>

      {/* ─── TIPS ────────────────────────────────────────────────────── */}
      <motion.div custom={5} variants={fadeUp} initial="hidden" animate="visible"
        className="bg-gradient-to-br from-sky-50 to-slate-50 rounded-2xl border border-sky-100 p-5">
        <h3 className="font-bold text-sm text-sky-800 mb-3">💡 Foydali maslahatlar</h3>
        <ul className="space-y-2 text-xs text-sky-700">
          <li className="flex items-start gap-2"><CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-sky-500" />
            Bir JSON faylida bir nechta topic bo'lishi mumkin — barcha topiclar bir importda qo'shiladi
          </li>
          <li className="flex items-start gap-2"><CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-sky-500" />
            INPUT tipidagi savollarda choice_a/b/c/d shart emas, faqat correct_answer yetarli
          </li>
          <li className="flex items-start gap-2"><CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-sky-500" />
            Mock importda barcha 6 ta modul bo'lishi shart emas — mavjud modullar saqlanadi
          </li>
          <li className="flex items-start gap-2"><CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-sky-500" />
            Xato bo'lsa "autofix" tugmasi JSON-dagi // kommentlar va boshqa xatolarni tuzatadi
          </li>
          <li className="flex items-start gap-2"><CheckCircle2 size={13} className="flex-shrink-0 mt-0.5 text-sky-500" />
            Fayl yuklash ham mumkin (.json fayl) — yoki text maydoniga to'g'ridan-to'g'ri joylashtiring
          </li>
        </ul>
      </motion.div>
    </div>
  )
}

