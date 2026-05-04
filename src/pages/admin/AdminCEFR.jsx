import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Trash2, Upload, X, AlertCircle, FileJson, Loader2,
  Check, Crown, Clock, FileText, BookOpen, Headphones, Eye,
} from 'lucide-react'
import api from '../../api/client'

// ── JSON Examples ─────────────────────────────────────────────────────────────

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
      "group_instruction": "",
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
      "group_instruction": "Questions 2-5: Complete with the correct form."
    },
    {
      "number": 3,
      "question_type": "TF",
      "content": "The sentence 'She has went' is grammatically correct.",
      "correct_answer": "FALSE",
      "explanation": "Should be 'has gone'.",
      "group_instruction": "Questions 3-6: True or False?"
    },
    {
      "number": 4,
      "question_type": "ERROR",
      "content": "He don't know the answer.",
      "correct_answer": "doesn't",
      "explanation": "Third person singular needs 'doesn't'.",
      "group_instruction": "Questions 4-7: Find and correct the error."
    },
    {
      "number": 5,
      "question_type": "WORD",
      "content": "The ___ (decide) was made yesterday. (noun form)",
      "correct_answer": "decision",
      "explanation": "'Decision' is the noun form of 'decide'.",
      "group_instruction": "Questions 5-8: Use the word in brackets in correct form."
    },
    {
      "number": 6,
      "question_type": "MATCH",
      "content": "It is raining heavily.",
      "correct_answer": "C",
      "explanation": "Match the sentence to its function.",
      "group_instruction": "Questions 6-8: Match each sentence to its grammatical function.",
      "choices": [
        {"option": "A", "text": "Giving advice"},
        {"option": "B", "text": "Expressing possibility"},
        {"option": "C", "text": "Describing current action"},
        {"option": "D", "text": "Talking about the future"}
      ]
    },
    {
      "number": 7,
      "question_type": "TRANS",
      "content": "He was so tired that he couldn't walk. (Begin: He was too...)",
      "correct_answer": "too tired to walk",
      "explanation": "'So...that he couldn't' = 'too...to'",
      "group_instruction": "Questions 7-8: Complete the second sentence so it means the same."
    }
  ]
}

Question types (test_type): MCQ | GAP | TF | MATCH | ERROR | WORD | TRANS`

const READING_EXAMPLE = `// OPTION 1: Single practice passage
{
  "type": "reading",
  "level": "B2",
  "title": "B2 Reading Practice 1",
  "time_limit": 20,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_mock": false,
  "passage": {
    "title": "The Impact of Social Media",
    "content": "Social media has transformed communication...\\n\\nParagraph A: Origins\\nParagraph B: Benefits\\nParagraph C: Drawbacks",
    "passage_number": 1,
    "is_standalone": true
  },
  "questions": [
    {
      "number": 1,
      "question_type": "TFNG",
      "content": "Social media has had no effect on personal relationships.",
      "correct_answer": "FALSE",
      "explanation": "The passage clearly states social media has transformed communication.",
      "group_instruction": "Questions 1-3: TRUE, FALSE or NOT GIVEN?"
    },
    {
      "number": 2,
      "question_type": "YNNG",
      "content": "The author believes social media should be banned.",
      "correct_answer": "NOT GIVEN",
      "explanation": "The author does not express this opinion.",
      "group_instruction": "Questions 2-4: YES, NO or NOT GIVEN?"
    },
    {
      "number": 3,
      "question_type": "MCQ",
      "content": "What is the main advantage of social media according to the passage?",
      "correct_answer": "C",
      "explanation": "Paragraph B mentions instant communication.",
      "group_instruction": "Questions 3-5: Choose A, B, C or D.",
      "choices": [
        {"option": "A", "text": "Reduces work hours"},
        {"option": "B", "text": "Improves mental health"},
        {"option": "C", "text": "Enables instant communication"},
        {"option": "D", "text": "Increases academic performance"}
      ]
    },
    {
      "number": 4,
      "question_type": "MULTI",
      "content": "Which TWO negative effects of social media are mentioned?",
      "correct_answer": "B|D",
      "max_selections": 2,
      "explanation": "The passage mentions anxiety (B) and reduced attention span (D).",
      "group_instruction": "Questions 4-5: Choose TWO letters A-E.",
      "choices": [
        {"option": "A", "text": "Increased loneliness"},
        {"option": "B", "text": "Anxiety and stress"},
        {"option": "C", "text": "Poor academic results"},
        {"option": "D", "text": "Reduced attention span"},
        {"option": "E", "text": "Loss of language skills"}
      ]
    },
    {
      "number": 5,
      "question_type": "GAP",
      "content": "Social media was first introduced in the ___ century.",
      "correct_answer": "21st",
      "explanation": "The text states the 21st century.",
      "group_instruction": "Questions 5-7: Complete. NO MORE THAN TWO WORDS."
    },
    {
      "number": 6,
      "question_type": "MATCH",
      "content": "Paragraph A",
      "correct_answer": "ii",
      "explanation": "Paragraph A discusses origins.",
      "group_instruction": "Questions 6-8: Choose the correct heading for each paragraph.",
      "choices": [
        {"option": "i", "text": "The drawbacks of social media"},
        {"option": "ii", "text": "The origins of social media"},
        {"option": "iii", "text": "Benefits for businesses"},
        {"option": "iv", "text": "Future of social platforms"}
      ]
    },
    {
      "number": 7,
      "question_type": "SHORT",
      "content": "According to the passage, what do young people use social media for most?",
      "correct_answer": "communication",
      "explanation": "The passage states communication is the primary use.",
      "group_instruction": "Questions 7-8: Answer. NO MORE THAN TWO WORDS."
    }
  ]
}

Question types: TFNG | YNNG | MCQ | MULTI | GAP | MATCH | SHORT

// OPTION 2: Multi-part mock test (is_mock: true)
{
  "type": "reading",
  "level": "B2",
  "title": "B2 Reading Full Mock 1",
  "time_limit": 90,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_mock": true,
  "parts": [
    {
      "passage_number": 1,
      "title": "Passage 1 — Topic A",
      "is_standalone": false,
      "content": "Full passage text here...",
      "questions": [
        {
          "number": 1, "question_type": "TFNG",
          "content": "...", "correct_answer": "TRUE",
          "group_instruction": "Questions 1-5: TRUE, FALSE or NOT GIVEN?"
        }
      ]
    },
    {
      "passage_number": 2,
      "title": "Passage 2 — Topic B",
      "is_standalone": false,
      "content": "Full passage text here...",
      "questions": [ ... ]
    }
  ]
}`

const LISTENING_EXAMPLE = `{
  "type": "listening",
  "level": "B1",
  "title": "B1 Listening Practice 1",
  "time_limit": 25,
  "is_premium": false,
  "is_mock": false,
  "section": {
    "title": "A phone conversation about a job interview",
    "section_number": 1,
    "audio_url": "https://example.com/audio/b1_listen1.mp3",
    "transcript": "A: Hello, can I speak to [1]?\\nB: Speaking.\\nA: I'm calling about your [2] application.\\nB: Oh yes, when is the [3]?\\nA: It's on [4] at [5] o'clock.\\nB: Great. What should I [6]?",
    "_comment_transcript": "Use [1],[2],[N] to mark where answers appear in the audio.",
    "is_standalone": true
  },
  "questions": [
    {
      "number": 1,
      "question_type": "GAP",
      "content": "The caller asks to speak to ___.",
      "correct_answer": "Mr Thompson",
      "explanation": "The name is mentioned at the start.",
      "group_instruction": "Questions 1-3: Complete. NO MORE THAN THREE WORDS."
    },
    {
      "number": 2,
      "question_type": "GAP",
      "content": "The call is about a ___ application.",
      "correct_answer": "job",
      "explanation": "The word 'job' is used.",
      "group_instruction": ""
    },
    {
      "number": 3,
      "question_type": "MCQ",
      "content": "What is the caller confirming?",
      "correct_answer": "B",
      "explanation": "The caller confirms an interview date.",
      "group_instruction": "Questions 3-4: Choose A, B or C.",
      "choices": [
        {"option": "A", "text": "A meeting room booking"},
        {"option": "B", "text": "An interview date"},
        {"option": "C", "text": "A job offer acceptance"}
      ]
    },
    {
      "number": 4,
      "question_type": "TABLE",
      "content": "Interview day: ___",
      "correct_answer": "Monday",
      "explanation": "Monday is stated in the conversation.",
      "group_instruction": "Questions 4-5: Complete the table. ONE WORD."
    },
    {
      "number": 5,
      "question_type": "MULTI",
      "content": "Which TWO things does the caller tell the candidate to bring?",
      "correct_answer": "A|C",
      "max_selections": 2,
      "explanation": "Passport (A) and certificates (C) are mentioned.",
      "group_instruction": "Questions 5-6: Choose TWO letters A-D.",
      "choices": [
        {"option": "A", "text": "Passport"},
        {"option": "B", "text": "Bank statement"},
        {"option": "C", "text": "Certificates"},
        {"option": "D", "text": "Reference letter"}
      ]
    },
    {
      "number": 6,
      "question_type": "SHORT",
      "content": "What does the interviewer ask the candidate to bring?",
      "correct_answer": "documents",
      "explanation": "The caller says 'bring your documents'.",
      "group_instruction": "Questions 6: Answer. ONE WORD."
    }
  ]
}

Question types: MCQ | MULTI | GAP | TABLE | SHORT

// OPTION 2: Multi-section mock test (is_mock: true)
{
  "type": "listening",
  "level": "B2",
  "title": "B2 Listening Full Mock 1",
  "time_limit": 90,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_mock": true,
  "sections": [
    {
      "section_number": 1,
      "title": "Section 1 — Phone Conversation",
      "transcript": "...",
      "questions": [
        { "number": 1, "question_type": "GAP", "content": "...", "correct_answer": "..." }
      ]
    },
    {
      "section_number": 2,
      "title": "Section 2 — Lecture",
      "transcript": "...",
      "questions": [ ... ]
    }
  ]
}`

const EXAMPLES = { grammar: GRAMMAR_EXAMPLE, reading: READING_EXAMPLE, listening: LISTENING_EXAMPLE }

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVELS = ['ALL','A1','A2','B1','B2','C1','C2']

const LEVEL_COLORS = {
  A1:'bg-green-100 text-green-700 border-green-200',
  A2:'bg-teal-100 text-teal-700 border-teal-200',
  B1:'bg-blue-100 text-blue-700 border-blue-200',
  B2:'bg-indigo-100 text-indigo-700 border-indigo-200',
  C1:'bg-slate-100 text-slate-700 border-slate-200',
  C2:'bg-sky-100 text-sky-700 border-sky-200',
}

const QT_COLORS = {
  TFNG:'bg-green-100 text-green-700',   YNNG:'bg-teal-100 text-teal-700',
  MCQ:'bg-blue-100 text-blue-700',      MULTI:'bg-violet-100 text-violet-700',
  GAP:'bg-slate-100 text-slate-700',    TABLE:'bg-sky-100 text-sky-700',
  SUMM:'bg-yellow-100 text-yellow-700', NOTE:'bg-lime-100 text-lime-700',
  FLOW:'bg-emerald-100 text-emerald-700',
  MATCH:'bg-indigo-100 text-indigo-700',MINFO:'bg-pink-100 text-pink-700',
  MFEAT:'bg-fuchsia-100 text-fuchsia-700', MEND:'bg-purple-100 text-purple-700',
  SENT:'bg-rose-100 text-rose-700',     SHORT:'bg-gray-100 text-gray-700',
  TF:'bg-green-100 text-green-700',     ERROR:'bg-red-100 text-red-700',
  WORD:'bg-purple-100 text-purple-700', TRANS:'bg-sky-100 text-sky-700',
}
const QT_LABEL = {
  TFNG:'T/F/NG', YNNG:'Y/N/NG', MCQ:'MCQ', MULTI:'Multi',
  GAP:'Gap', TABLE:'Table', SUMM:'Summary', NOTE:'Notes', FLOW:'Flow',
  SENT:'Sentence', SHORT:'Short',
  MATCH:'Headings', MINFO:'M.Info', MFEAT:'M.Feat', MEND:'M.End',
  TF:'T/F', ERROR:'Error', WORD:'Word', TRANS:'Transform',
}
function QtBadge({ qt }) {
  return <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${QT_COLORS[qt]||'bg-gray-100 text-gray-600'}`}>{QT_LABEL[qt]||qt}</span>
}

// ── Question Review Modal ─────────────────────────────────────────────────────

function QuestionReviewModal({ item, contentType, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cefr-review', contentType, item.id],
    queryFn: () => {
      if (contentType === 'reading')   return api.get(`/cefr/reading/${item.id}/`).then(r => r.data)
      if (contentType === 'listening') return api.get(`/cefr/listening/${item.id}/`).then(r => r.data)
      return api.get(`/cefr/tests/${item.id}/`).then(r => r.data)
    },
    staleTime: 60_000,
  })
  const questions = data?.questions || []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <motion.div initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900">{item.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {item.level && <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold border mr-1 ${LEVEL_COLORS[item.level]||''}`}>{item.level}</span>}
              {questions.length} savol
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-sky-500"/></div>
        ) : (
          <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
            {data?.content && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Passage</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6">{data.content}</p>
              </div>
            )}
            {data?.transcript && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Transcript</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{data.transcript}</p>
              </div>
            )}
            {data?.audio_url && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                <Headphones size={14} className="text-blue-500"/>
                <span className="text-xs text-blue-700 truncate">{data.audio_url}</span>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Savollar</p>
              <div className="space-y-2">
                {questions.map(q => (
                  <div key={q.id} className="border border-gray-100 rounded-xl p-3 hover:border-sky-200 transition-colors">
                    {q.group_instruction && (
                      <p className="text-xs font-semibold text-sky-600 mb-2 bg-sky-50 px-2 py-1 rounded">{q.group_instruction}</p>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{q.number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <QtBadge qt={q.question_type}/>
                          {q.max_selections > 1 && <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-semibold">Choose {q.max_selections}</span>}
                        </div>
                        <p className="text-sm text-gray-700">{q.content}</p>
                        {q.choices?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.choices.map(c => {
                              const isCorrect = q.correct_answer?.split('|').includes(c.option)
                              return (
                                <div key={c.option} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${isCorrect?'bg-green-50 text-green-800 font-semibold':'text-gray-500'}`}>
                                  <span className="font-bold w-4">{c.option}.</span><span>{c.text}</span>
                                  {isCorrect && <Check size={11} className="ml-auto text-green-600"/>}
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-xs text-gray-400">Javob:</span>
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">{q.correct_answer}</span>
                        </div>
                        {q.explanation && <p className="text-xs text-gray-400 mt-1 italic">{q.explanation}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Question type reference data ──────────────────────────────────────────────

const CEFR_READING_QT_REF = [
  // ── Judgement ──
  { qt:'TFNG',  label:'True / False / Not Given',     desc:'Matn asosida — TRUE, FALSE yoki NOT GIVEN',                       answer:'"TRUE" | "FALSE" | "NOT GIVEN"', fields:'group_instruction',                              extra:null },
  { qt:'YNNG',  label:'Yes / No / Not Given',         desc:'Muallif fikriga ko\'ra — YES, NO yoki NOT GIVEN',                 answer:'"YES" | "NO" | "NOT GIVEN"',     fields:'group_instruction',                              extra:null },
  // ── Choice ──
  { qt:'MCQ',   label:'Multiple Choice',              desc:'A, B, C, D variantlardan bittasini tanlash',                      answer:'"A" | "B" | "C" | "D"',         fields:'choices[], group_instruction',                   extra:null },
  { qt:'MULTI', label:'Multiple Select',              desc:'Bir necha variant — javoblar | bilan ajratiladi',                 answer:'"A|C" yoki "B|D"',               fields:'choices[], max_selections, group_instruction',   extra:'max_selections: 2' },
  // ── Completion ──
  { qt:'GAP',   label:'Gap Fill',                     desc:'___ bo\'sh joy — matndan 1–2 so\'z',                             answer:'"21st"',                          fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'SENT',  label:'Sentence Completion',          desc:'Jumlaning oxirini to\'ldirish — matndan ibora',                   answer:'"social media"',                  fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'TABLE', label:'Table Completion',             desc:'Jadval yacheykasini to\'ldirish — bitta so\'z',                   answer:'"annual"',                        fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'SUMM',  label:'Summary Completion',           desc:'Xulosa bo\'shliqlarini to\'ldirish — word_bank bilan drag-and-drop', answer:'"communication"', fields:'word_bank: ["word1","word2",...], group_instruction', extra:'word_bank = so\'zlar ro\'yxati (chip tugmalari)' },
  { qt:'NOTE',  label:'Notes / Diagram Completion',   desc:'Konspekt yoki diagrammadagi bo\'shliqlarni to\'ldirish',          answer:'"21st century"',                  fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'FLOW',  label:'Flowchart Completion',         desc:'Oqim-jadval bo\'shliqlarini to\'ldirish',                         answer:'"published"',                     fields:'group_instruction',                              extra:'choices kerak emas' },
  // ── Matching ──
  { qt:'MATCH', label:'Matching Headings',            desc:'Paragrafga mos sarlavhani topish — choices = sarlavhalar ro\'yxati', answer:'"ii"',             fields:'choices[] (i→sarlavha matn), group_instruction', extra:'UI: sarlavhalar ro\'yxati yuqorida ko\'rinadi' },
  { qt:'MINFO', label:'Matching Information',         desc:'Tavsif qaysi paragrafda — harf (A, B, C...)',                    answer:'"C"',                             fields:'choices[] (A→Paragraph A), group_instruction',  extra:null },
  { qt:'MFEAT', label:'Matching Features',            desc:'Element qaysi kategoriyaga tegishli — dropdown UI',              answer:'"B"',                             fields:'choices[] (A→Category), group_instruction',     extra:'UI: har savol uchun dropdown select' },
  { qt:'MEND',  label:'Matching Sentence Endings',    desc:'Jumlaning boshlanishiga mos tugashini tanlash — dropdown UI',   answer:'"C"',                             fields:'choices[] (A→ending), group_instruction',       extra:'UI: har savol uchun dropdown select' },
  // ── Grid Table ──
  { qt:'TABLE', label:'Grid Table (auto-detected)',   desc:'Bir guruh TABLE savollar, xuddi choices bilan → jadval ko\'rinishida', answer:'"A"',            fields:'choices[] (A→option text), group_instruction',  extra:'2+ TABLE+xuddi choices → grid jadval (radio)' },
  // ── Other ──
  { qt:'SHORT', label:'Short Answer',                 desc:'Matndan qisqa javob — 1–3 so\'z',                                answer:'"communication"',                 fields:'group_instruction',                              extra:'choices kerak emas' },
]

const CEFR_LISTENING_QT_REF = [
  // ── Choice ──
  { qt:'MCQ',   label:'Multiple Choice',              desc:'A, B, C variantlardan biri — tinglash asosida',                  answer:'"B"',                             fields:'choices[], group_instruction',                   extra:null },
  { qt:'MULTI', label:'Multiple Select',              desc:'Bir necha variant — javoblar | bilan ajratiladi',                answer:'"A|C" yoki "B|D"',               fields:'choices[], max_selections, group_instruction',   extra:'max_selections: 2' },
  // ── Completion ──
  { qt:'GAP',   label:'Gap Fill',                     desc:'___ bo\'sh joy — transcript\'da [N] belgisi kerak',             answer:'"Mr Thompson"',                   fields:'group_instruction',                              extra:'transcript[N] marker' },
  { qt:'TABLE', label:'Table / Form Completion',      desc:'Jadval yoki anketa bo\'shliqlarini to\'ldirish. 2+ savol + xuddi choices → grid jadval', answer:'"Monday"', fields:'group_instruction yoki choices[] grid uchun', extra:'choices bo\'lsa → grid jadval' },
  { qt:'NOTE',  label:'Notes Completion',             desc:'Konspekt bo\'shliqlarini to\'ldirish — tinglash paytida',        answer:'"2nd floor"',                     fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'FLOW',  label:'Flowchart Completion',         desc:'Oqim-jadval bo\'shliqlarini to\'ldirish — tinglashdan',          answer:'"key card"',                      fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'SENT',  label:'Sentence Completion',          desc:'Jumlani to\'ldirish — tinglashdan olingan so\'z',               answer:'"morning"',                       fields:'group_instruction',                              extra:'choices kerak emas' },
  // ── Matching ──
  { qt:'MATCH', label:'Matching',                     desc:'Ikkita ro\'yxatni moslash — harf yozish',                       answer:'"C"',                             fields:'choices[], group_instruction',                   extra:null },
  { qt:'MFEAT', label:'Matching Features',            desc:'Element qaysi manbaga tegishli — dropdown UI',                 answer:'"A"',                             fields:'choices[] (A→source), group_instruction',       extra:'UI: dropdown select' },
  // ── Other ──
  { qt:'SHORT', label:'Short Answer',                 desc:'Tinglashdan 1–3 so\'z',                                         answer:'"documents"',                     fields:'group_instruction',                              extra:'choices kerak emas' },
]

const CEFR_GRAMMAR_QT_REF = [
  { qt:'MCQ',   label:'Multiple Choice',              desc:'A, B, C, D variantlardan to\'g\'ri grammatik shaklni tanlash',  answer:'"A" | "B" | "C" | "D"',         fields:'choices[], group_instruction',                   extra:null },
  { qt:'GAP',   label:'Gap Fill',                     desc:'Gapda bo\'sh joy — to\'g\'ri shaklni yozish',                  answer:'"haven\'t seen"',                 fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'TF',    label:'True / False',                 desc:'Grammatik jihatdan gap to\'g\'rimi yoki noto\'g\'rimi',        answer:'"TRUE" | "FALSE"',                fields:'group_instruction',                              extra:null },
  { qt:'MATCH', label:'Matching',                     desc:'Ikkita ustunni moslash — harf yoki raqam yoziladi',            answer:'"C" yoki "3"',                    fields:'choices[], group_instruction',                   extra:null },
  { qt:'ERROR', label:'Error Correction',             desc:'Gapdagi xato so\'zni topib, to\'g\'ri shaklini yozish',        answer:'"doesn\'t" (don\'t o\'rniga)',    fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'WORD',  label:'Word Formation',               desc:'Qavsda berilgan so\'zdan kerakli shaklni hosil qilish',        answer:'"decision" (decide→noun)',        fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'TRANS', label:'Sentence Transformation',      desc:'Berilgan gapni o\'zgartirmay boshqa so\'zlar bilan yozish',    answer:'"so tired that he couldn\'t"',    fields:'group_instruction',                              extra:'choices kerak emas' },
]

function QtReferencePanel({ contentType }) {
  const rows = contentType === 'reading'
    ? CEFR_READING_QT_REF
    : contentType === 'listening'
    ? CEFR_LISTENING_QT_REF
    : CEFR_GRAMMAR_QT_REF
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 flex-shrink-0">Savol turlari</span>
          <div className="flex flex-wrap gap-1">
            {rows.map(r => <QtBadge key={r.qt} qt={r.qt} />)}
          </div>
        </div>
        <span className={`text-slate-500 text-xs ml-2 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="divide-y divide-slate-50 bg-white">
          {rows.map(r => (
            <div key={r.qt} className="px-3 py-2.5 grid grid-cols-[80px_1fr] gap-3 items-start hover:bg-slate-50/40 transition-colors">
              <div className="pt-0.5">
                <QtBadge qt={r.qt} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800 leading-tight">{r.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{r.desc}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
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
          {contentType === 'listening' && (
            <div className="px-3 py-2 bg-blue-50 text-[10px] text-blue-700">
              <span className="font-bold">Transcript:</span> Audio matnida{' '}
              <code className="bg-blue-100 px-1 rounded">[1]</code>,{' '}
              <code className="bg-blue-100 px-1 rounded">[2]</code> belgilari bilan javob o'rnini ko'rsating.
              Audio keyinchalik yuklanadi.
            </div>
          )}
          {contentType === 'grammar' && (
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

// ── Import Drawer ─────────────────────────────────────────────────────────────

function ImportDrawer({ onClose, contentType, level, onImported }) {
  const [json, setJson]       = useState('')
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setJson(ev.target.result)
    reader.readAsText(f)
  }

  const handleImport = async () => {
    setLoading(true); setStatus(null)
    try {
      const parsed = JSON.parse(json)
      const body = {
        ...parsed,
        type: contentType,
        ...((!parsed.level && level && level !== 'ALL') ? { level } : {}),
      }
      await api.post('/import/cefr/', body)
      setStatus({ ok: true, msg: 'Muvaffaqiyatli import!' })
      setJson(''); onImported?.()
    } catch (err) {
      const msg = err instanceof SyntaxError
        ? "JSON noto'g'ri formatlangan!"
        : err.response?.data?.error || err.response?.data?.detail || 'Import muvaffaqiyatsiz.'
      setStatus({ ok: false, msg })
    } finally { setLoading(false) }
  }

  return (
    <motion.div initial={{ opacity:0, x:60 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:60 }}
      transition={{ duration:0.25 }} className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[820px] bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileJson size={18} className="text-sky-500"/>
            <h3 className="font-bold text-gray-900">
              Import CEFR {contentType.charAt(0).toUpperCase()+contentType.slice(1)} — JSON
            </h3>
            {level && level !== 'ALL' && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${LEVEL_COLORS[level]||''}`}>{level}</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Format namunasi</p>
            <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-[calc(100vh-200px)]">
              <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre">{EXAMPLES[contentType]}</pre>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {/* Question type reference panel */}
            <QtReferencePanel contentType={contentType} />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">JSON kiriting yoki fayldan yuklang</p>
            <textarea value={json} onChange={e => setJson(e.target.value)}
              placeholder="Paste JSON here..."
              className="flex-1 min-h-[200px] w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none"/>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition">
              <Upload size={15}/> Upload .json file
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile}/>
            {status && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${status.ok?'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
                {status.ok ? <Check size={15}/> : <AlertCircle size={15}/>} {status.msg}
              </div>
            )}
            <button onClick={handleImport} disabled={loading || !json.trim()}
              className="w-full py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin"/>} Import
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-600"/>
        </div>
        <h3 className="font-bold text-gray-900 mb-2">Delete?</h3>
        <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin"/>} Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Grammar Tab ───────────────────────────────────────────────────────────────

function GrammarTab() {
  const [activeLevel, setActiveLevel] = useState('ALL')
  const [showImport, setShowImport]   = useState(false)
  const [deleteId, setDeleteId]       = useState(null)
  const [reviewItem, setReviewItem]   = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-cefr-grammar', activeLevel],
    queryFn: () => {
      const params = activeLevel !== 'ALL' ? { level: activeLevel } : {}
      return api.get('/admin/cefr/tests/', { params }).then(r => r.data)
    },
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/cefr/tests/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey:['admin-cefr-grammar'] }); setDeleteId(null) },
  })

  const tests = Array.isArray(data) ? data : data?.results ?? []

  return (
    <div className="space-y-4">
      {/* Level filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-sky-50 w-fit flex-wrap">
          {LEVELS.map(level => (
            <button key={level} onClick={() => setActiveLevel(level)}
              className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${activeLevel===level?'bg-sky-500 text-white shadow-sm shadow-sky-200':'text-gray-500 hover:text-sky-600 hover:bg-sky-50'}`}>
              {level}
            </button>
          ))}
        </div>
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition shadow-sm shadow-sky-200">
          <FileJson size={15}/> Import JSON
        </button>
      </div>

      {/* Table */}
      <AnimatePresence mode="wait">
        <motion.div key={activeLevel} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-sky-50 overflow-hidden">
          {error ? (
            <div className="p-8 flex items-center gap-3 text-red-600"><AlertCircle size={16}/><span className="text-sm">Failed to load.</span></div>
          ) : isLoading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse"/>)}</div>
          ) : !tests.length ? (
            <div className="p-16 text-center">
              <FileText size={40} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm font-medium text-gray-400">No {activeLevel==='ALL'?'':activeLevel+' '} tests yet.</p>
              <p className="text-xs text-gray-300 mt-1">Click "Import JSON" to add tests.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    {['Title','Level','Type','Questions','Time','Premium','Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tests.map((test, i) => (
                    <motion.tr key={test.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:i*0.04 }}
                      className="hover:bg-sky-50/20 transition-colors">
                      <td className="px-5 py-3 font-semibold text-gray-800 max-w-[200px] truncate">{test.title}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${LEVEL_COLORS[test.level]||'bg-gray-100 text-gray-600 border-gray-200'}`}>{test.level}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">{test.test_type||'—'}</span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 font-medium">{test.question_count??'—'}</td>
                      <td className="px-5 py-3">
                        {test.time_limit ? <span className="flex items-center gap-1 text-gray-500"><Clock size={12}/>{test.time_limit}m</span> : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {test.is_premium ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full"><Crown size={9}/>Yes</span>
                        ) : <span className="text-xs text-gray-400">Free</span>}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setReviewItem(test)}
                            className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"><Eye size={14}/></button>
                          <button onClick={() => setDeleteId(test.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportDrawer onClose={() => setShowImport(false)} contentType="grammar" level={activeLevel}
            onImported={() => { queryClient.invalidateQueries({ queryKey:['admin-cefr-grammar'] }); setShowImport(false) }}/>
        )}
        {deleteId && (
          <DeleteConfirm onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending}/>
        )}
      </AnimatePresence>
      {reviewItem && <QuestionReviewModal item={reviewItem} contentType="grammar" onClose={() => setReviewItem(null)}/>}
    </div>
  )
}

// ── Reading / Listening Tab ───────────────────────────────────────────────────

function ReadingListeningTab({ contentType }) {
  const [showImport, setShowImport] = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const [reviewItem, setReviewItem] = useState(null)
  const queryClient = useQueryClient()

  const listEndpoint   = contentType === 'reading' ? '/cefr/reading/' : '/cefr/listening/'
  const deleteEndpoint = contentType === 'reading' ? '/admin/cefr/reading/' : '/admin/cefr/listening/'

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-cefr', contentType],
    queryFn: () => api.get(listEndpoint).then(r => r.data),
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${deleteEndpoint}${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cefr', contentType] })
      setDeleteId(null)
    },
  })

  const allItems = Array.isArray(data) ? data : [
    ...(data?.practices || []),
    ...(data?.mocks     || []),
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition shadow-sm shadow-sky-200">
          <FileJson size={15}/> Import JSON
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-sky-50 overflow-hidden">
        {error ? (
          <div className="p-8 flex items-center gap-3 text-red-600"><AlertCircle size={16}/><span className="text-sm">Failed to load.</span></div>
        ) : isLoading ? (
          <div className="p-6 space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse"/>)}</div>
        ) : !allItems.length ? (
          <div className="p-12 text-center">
            <FileText size={36} className="text-gray-200 mx-auto mb-3"/>
            <p className="text-sm text-gray-400">No {contentType} content yet. Import JSON to add.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allItems.map((item, i) => (
              <motion.div key={`${item.id}-${i}`} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50/20 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${item.level ? LEVEL_COLORS[item.level]?.split(' ').slice(0,2).join(' ') || 'bg-sky-100 text-sky-600' : 'bg-sky-100 text-sky-600'}`}>
                  {item.level || (item.passage_number || item.section_number || (i+1))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {item.question_count !== undefined && <span className="text-xs text-gray-400">{item.question_count} savol</span>}
                    {item.total_questions !== undefined && <span className="text-xs text-gray-400">{item.total_questions} savol</span>}
                    {item.has_audio && <span className="flex items-center gap-1 text-xs text-blue-500"><Headphones size={10}/>Audio</span>}
                    {item.is_premium && <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold"><Crown size={9}/>Premium</span>}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.attempted !== undefined ? '' : ''} bg-gray-50 text-gray-500`}>
                      {item.level ? 'Mock' : 'Standalone'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setReviewItem(item)}
                    className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Savollarni ko'rish">
                    <Eye size={15}/>
                  </button>
                  <button onClick={() => setDeleteId(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="O'chirish">
                    <Trash2 size={15}/>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showImport && (
          <ImportDrawer onClose={() => setShowImport(false)} contentType={contentType} level="ALL"
            onImported={() => { queryClient.invalidateQueries({ queryKey:['admin-cefr', contentType] }); setShowImport(false) }}/>
        )}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
              className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={20} className="text-red-600"/>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">O'chirilsinmi?</h3>
              <p className="text-sm text-gray-500 mb-6">Bu amalni qaytarib bo'lmaydi.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                  Bekor
                </button>
                <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                  {deleteMutation.isPending && <span className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/>}
                  O'chirish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {reviewItem && <QuestionReviewModal item={reviewItem} contentType={contentType} onClose={() => setReviewItem(null)}/>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'grammar',   label: 'Grammar',   icon: GraduationCap },
  { id: 'reading',   label: 'Reading',   icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
]

export default function AdminCEFR() {
  const [tab, setTab] = useState('grammar')

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
        className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <GraduationCap size={20} className="text-slate-600"/>
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">CEFR Management</h2>
          <p className="text-xs text-gray-400">Grammar, Reading, Listening</p>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-sky-50 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab===t.id?'bg-sky-500 text-white shadow-sm shadow-sky-200':'text-gray-500 hover:text-sky-600 hover:bg-sky-50'}`}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}>
          {tab === 'grammar'   && <GrammarTab/>}
          {tab === 'reading'   && <ReadingListeningTab contentType="reading"/>}
          {tab === 'listening' && <ReadingListeningTab contentType="listening"/>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

