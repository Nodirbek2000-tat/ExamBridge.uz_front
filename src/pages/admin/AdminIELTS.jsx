import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Headphones, BookOpen, Mic, PenLine, Trash2,
  Upload, X, AlertCircle, FileJson, Loader2, Check, FileText,
  Eye, Clock, Crown,
} from 'lucide-react'
import api from '../../api/client'

// ── JSON Examples ─────────────────────────────────────────────────────────────

const READING_EXAMPLE = `{
  "title": "The History of Coffee",
  "content": "Coffee was first discovered in Ethiopia...\\n\\nParagraph A: ...",
  "passage_number": 1,
  "time_limit": 20,
  "difficulty": "MEDIUM",
  "is_standalone": true,
  "is_premium": false,
  "questions": [
    {
      "number": 1,
      "question_type": "TFNG",
      "content": "Coffee was discovered in Brazil.",
      "correct_answer": "FALSE",
      "explanation": "The passage states Ethiopia.",
      "group_instruction": "Questions 1-4: TRUE, FALSE or NOT GIVEN?"
    },
    {
      "number": 2,
      "question_type": "YNNG",
      "content": "The author believes coffee is beneficial.",
      "correct_answer": "YES",
      "group_instruction": "Questions 2-5: YES, NO or NOT GIVEN?"
    },
    {
      "number": 3,
      "question_type": "MCQ",
      "content": "What is the main purpose of the passage?",
      "correct_answer": "B",
      "group_instruction": "Questions 3-6: Choose A, B, C or D.",
      "choices": [
        {"option": "A", "text": "Economic impact"},
        {"option": "B", "text": "Historical origins"},
        {"option": "C", "text": "Compare varieties"},
        {"option": "D", "text": "Health benefits"}
      ]
    },
    {
      "number": 4,
      "question_type": "MULTI",
      "content": "Which THREE factors are mentioned?",
      "correct_answer": "A|C|E",
      "max_selections": 3,
      "group_instruction": "Questions 4-6: Choose THREE letters A-G.",
      "choices": [
        {"option": "A", "text": "Ethiopia as origin"},
        {"option": "B", "text": "Cold climate growth"},
        {"option": "C", "text": "Spread to Arabia"},
        {"option": "D", "text": "18th century ban"},
        {"option": "E", "text": "Coffee houses"},
        {"option": "F", "text": "Brazil 90%"},
        {"option": "G", "text": "No medicinal use"}
      ]
    },
    {
      "number": 5,
      "question_type": "MATCH",
      "content": "Paragraph A",
      "correct_answer": "iii",
      "group_instruction": "Questions 5-9: Choose the correct heading.",
      "choices": [
        {"option": "i", "text": "Global spread"},
        {"option": "ii", "text": "Health benefits"},
        {"option": "iii", "text": "Ethiopian origins"},
        {"option": "iv", "text": "Modern production"}
      ]
    },
    {
      "number": 6,
      "question_type": "MINFO",
      "content": "A description of how coffee spreads to new regions",
      "correct_answer": "C",
      "group_instruction": "Questions 6-10: Which paragraph? Write A-F.",
      "choices": [
        {"option": "A", "text": "Paragraph A"},
        {"option": "B", "text": "Paragraph B"},
        {"option": "C", "text": "Paragraph C"}
      ]
    },
    {
      "number": 7,
      "question_type": "GAP",
      "content": "Coffee was first cultivated in ___ around the 9th century.",
      "correct_answer": "Ethiopia",
      "group_instruction": "Questions 7-11: Complete. NO MORE THAN TWO WORDS."
    },
    {
      "number": 8,
      "question_type": "TABLE",
      "content": "Country of origin: ___",
      "correct_answer": "Ethiopia",
      "group_instruction": "Questions 8-12: Complete the table. ONE WORD."
    },
    {
      "number": 9,
      "question_type": "SUMM",
      "content": "Coffee spread from ___ to Arabia in the 15th century.",
      "correct_answer": "Ethiopia",
      "group_instruction": "Questions 9-11: Complete the summary. NO MORE THAN TWO WORDS."
    },
    {
      "number": 10,
      "question_type": "NOTE",
      "content": "Discovery date: ___ century",
      "correct_answer": "9th",
      "group_instruction": "Questions 10-12: Complete the notes. ONE WORD AND/OR A NUMBER."
    },
    {
      "number": 11,
      "question_type": "FLOW",
      "content": "Beans collected → dried → ___ → exported",
      "correct_answer": "roasted",
      "group_instruction": "Questions 11-13: Complete the flowchart. ONE WORD."
    },
    {
      "number": 12,
      "question_type": "MFEAT",
      "content": "First documented written record of coffee",
      "correct_answer": "B",
      "group_instruction": "Questions 12-15: Match each statement to the correct source A-D.",
      "choices": [
        {"option": "A", "text": "Ancient Egyptian scrolls"},
        {"option": "B", "text": "15th-century Arab manuscripts"},
        {"option": "C", "text": "17th-century European records"},
        {"option": "D", "text": "Modern scientific research"}
      ]
    },
    {
      "number": 13,
      "question_type": "MEND",
      "content": "Coffee houses in 16th-century Arabia were known as...",
      "correct_answer": "C",
      "group_instruction": "Questions 13-15: Choose the correct ending A-E for each sentence beginning.",
      "choices": [
        {"option": "A", "text": "places only for wealthy merchants."},
        {"option": "B", "text": "religious gathering spaces."},
        {"option": "C", "text": "centres of intellectual debate."},
        {"option": "D", "text": "licensed by the government."},
        {"option": "E", "text": "banned after the 17th century."}
      ]
    },
    {
      "number": 14,
      "question_type": "SENT",
      "content": "Coffee houses originally served as ___ as well as places to drink coffee.",
      "correct_answer": "social centres",
      "group_instruction": "Questions 14-16: Complete each sentence."
    },
    {
      "number": 15,
      "question_type": "SHORT",
      "content": "Where was coffee first discovered?",
      "correct_answer": "Ethiopia",
      "group_instruction": "Questions 15-16: Answer. TWO WORDS max."
    },
    {
      "number": 16,
      "question_type": "MAP",
      "content": "Label the diagram: The main coffee-growing region marked X",
      "correct_answer": "Ethiopia",
      "group_instruction": "Questions 16: Complete the diagram label."
    }
  ]
}

--- FULL MOCK (multiple passages) ---
{
  "title": "IELTS Reading Mock 1",
  "test_type": "FULL_MOCK",
  "difficulty": "MEDIUM",
  "is_premium": false,
  "parts": [
    {
      "passage_number": 1,
      "title": "Part 1 — Coffee",
      "content": "Passage text...",
      "questions": [...]
    },
    {
      "passage_number": 2,
      "title": "Part 2 — Solar Energy",
      "content": "Passage text...",
      "questions": [...]
    }
  ]
}`

const LISTENING_EXAMPLE = `{
  "title": "Part 1: Hotel Booking",
  "section_number": 1,
  "audio_url": "https://example.com/audio/part1.mp3",
  "transcript": "Guest: I'd like to book a room for [1] nights.\\nName: [2] Johnson. Phone: [3].\\nRoom: [4]. Price: £[5]/night.",
  "difficulty": "EASY",
  "is_standalone": true,
  "is_premium": false,
  "questions": [
    {
      "number": 1,
      "question_type": "GAP",
      "content": "The guest wants to stay for ___ nights.",
      "correct_answer": "3",
      "group_instruction": "Questions 1-5: Complete. ONE WORD AND/OR NUMBER."
    },
    {
      "number": 2,
      "question_type": "MCQ",
      "content": "What type of room does the guest want?",
      "correct_answer": "B",
      "group_instruction": "Questions 2-4: Choose A, B or C.",
      "choices": [
        {"option": "A", "text": "Single"},
        {"option": "B", "text": "Double"},
        {"option": "C", "text": "Suite"}
      ]
    },
    {
      "number": 3,
      "question_type": "TABLE",
      "content": "Price per night: £___",
      "correct_answer": "85",
      "group_instruction": "Questions 3-6: Complete the form."
    },
    {
      "number": 4,
      "question_type": "MULTI",
      "content": "Which TWO facilities does the hotel offer?",
      "correct_answer": "A|D",
      "max_selections": 2,
      "group_instruction": "Questions 4-5: Choose TWO letters A-E.",
      "choices": [
        {"option": "A", "text": "Free parking"},
        {"option": "B", "text": "Airport shuttle"},
        {"option": "C", "text": "Business centre"},
        {"option": "D", "text": "Gym"},
        {"option": "E", "text": "Pool"}
      ]
    },
    {
      "number": 5,
      "question_type": "MULTI",
      "content": "Which THREE items are in breakfast?",
      "correct_answer": "B|C|E",
      "max_selections": 3,
      "group_instruction": "Questions 5-7: Choose THREE letters A-F.",
      "choices": [
        {"option": "A", "text": "Champagne"},
        {"option": "B", "text": "Fresh juice"},
        {"option": "C", "text": "Hot food"},
        {"option": "D", "text": "Sushi"},
        {"option": "E", "text": "Pastries"},
        {"option": "F", "text": "Afternoon tea"}
      ]
    },
    {
      "number": 6,
      "question_type": "SENT",
      "content": "Check-in from ___ o'clock.",
      "correct_answer": "2",
      "group_instruction": "Questions 6-8: Complete the sentences."
    },
    {
      "number": 7,
      "question_type": "NOTE",
      "content": "Guest surname: ___",
      "correct_answer": "Johnson",
      "group_instruction": "Questions 7-9: Complete the notes. ONE WORD ONLY."
    },
    {
      "number": 8,
      "question_type": "FLOW",
      "content": "Guest arrives → checks in → receives ___ → goes to room",
      "correct_answer": "key card",
      "group_instruction": "Questions 8-10: Complete the flowchart. NO MORE THAN TWO WORDS."
    },
    {
      "number": 9,
      "question_type": "MFEAT",
      "content": "Free parking",
      "correct_answer": "A",
      "group_instruction": "Questions 9-11: Which hotel offers each feature? Write A (Grand), B (Central) or C (Plaza).",
      "choices": [
        {"option": "A", "text": "Grand Hotel"},
        {"option": "B", "text": "Central Hotel"},
        {"option": "C", "text": "Plaza Hotel"}
      ]
    },
    {
      "number": 10,
      "question_type": "MATCH",
      "content": "The spa facility",
      "correct_answer": "C",
      "group_instruction": "Questions 10-11: Match features to hotels.",
      "choices": [
        {"option": "A", "text": "Grand Hotel"},
        {"option": "B", "text": "Central Hotel"},
        {"option": "C", "text": "Plaza Hotel"}
      ]
    },
    {
      "number": 11,
      "question_type": "SHORT",
      "content": "What is the name of the hotel manager?",
      "correct_answer": "Mr Davies",
      "group_instruction": "Questions 11-12: Answer. NO MORE THAN TWO WORDS."
    }
  ]
}

--- FULL MOCK (4 sections) ---
{
  "title": "IELTS Listening Mock 1",
  "difficulty": "MEDIUM",
  "is_premium": false,
  "sections": [
    {
      "section_number": 1,
      "title": "Section 1 — Hotel Booking",
      "transcript": "...",
      "questions": [...]
    },
    {
      "section_number": 2,
      "title": "Section 2 — Tour Guide",
      "transcript": "...",
      "questions": [...]
    }
  ]
}
Upload audio after: PATCH /api/admin/ielts/listening/<id>/audio/`

const SPEAKING_EXAMPLE = `[
  {
    "title": "Part 1 — Daily Life",
    "part": 1,
    "topic": "Lifestyle",
    "questions": [
      "Do you have a fixed daily routine?",
      "What time do you usually wake up?",
      "Has your routine changed in recent years?",
      "Do you prefer mornings or evenings?"
    ],
    "is_premium": false
  },
  {
    "title": "Part 2 — A Special Place",
    "part": 2,
    "topic": "Travel",
    "prompt": "Describe a place you have visited that you liked.",
    "bullet_points": [
      "Where it was",
      "When you went there",
      "What you did there",
      "Why you liked it"
    ],
    "follow_up": "Does tourism have a positive or negative impact?",
    "is_premium": false
  },
  {
    "title": "Part 3 — Technology",
    "part": 3,
    "topic": "Technology",
    "questions": [
      "How has technology changed communication?",
      "Has technology made life easier or more complicated?",
      "What technology will be most important in the future?"
    ],
    "is_premium": false
  }
]`

const SPEAKING_MOCK_EXAMPLE = `{
  "title": "IELTS Speaking Mock Test 1",
  "test_type": "MOCK",
  "topic": "Daily Life & Technology",
  "is_premium": false,
  "parts": [
    {
      "part": 1,
      "questions": [
        "Do you work or study?",
        "What do you enjoy about your work/studies?",
        "How do you usually spend your weekends?"
      ]
    },
    {
      "part": 2,
      "cue_card": "Describe a piece of technology you use every day.",
      "bullet_points": [
        "What it is",
        "How long you have had it",
        "How you use it",
        "Why it is important to you"
      ],
      "follow_up": "Do you think you rely too much on technology?"
    },
    {
      "part": 3,
      "questions": [
        "How has technology changed communication?",
        "Is technology making life easier or more complicated?",
        "What role will AI play in everyday life in the future?"
      ]
    }
  ]
}`

const WRITING_EXAMPLE = `[
  {
    "title": "Task 1 — Bar Chart",
    "task_type": 1,
    "test_type": "ACADEMIC",
    "prompt": "The chart shows internet access in five countries 2010-2020. Summarise the main features.",
    "min_words": 150,
    "time_limit": 20,
    "sample_answer": "The bar chart illustrates...",
    "is_premium": false
  },
  {
    "title": "Task 2 — Opinion Essay",
    "task_type": 2,
    "test_type": "ACADEMIC",
    "prompt": "Technology has made our lives more complicated. To what extent do you agree?",
    "min_words": 250,
    "time_limit": 40,
    "sample_answer": "In the modern world...",
    "is_premium": false
  }
]`

const EXAMPLES = { reading: READING_EXAMPLE, listening: LISTENING_EXAMPLE, speaking: SPEAKING_EXAMPLE, writing: WRITING_EXAMPLE }

// ── Question type badge ───────────────────────────────────────────────────────

const QT_COLORS = {
  TFNG:'bg-green-100 text-green-700',   YNNG:'bg-teal-100 text-teal-700',
  MCQ:'bg-blue-100 text-blue-700',      MULTI:'bg-violet-100 text-violet-700',
  GAP:'bg-slate-100 text-slate-700',    TABLE:'bg-sky-100 text-sky-700',
  SUMM:'bg-yellow-100 text-yellow-700', NOTE:'bg-lime-100 text-lime-700',
  FLOW:'bg-emerald-100 text-emerald-700',
  MATCH:'bg-indigo-100 text-indigo-700',MINFO:'bg-pink-100 text-pink-700',
  MFEAT:'bg-fuchsia-100 text-fuchsia-700', MEND:'bg-purple-100 text-purple-700',
  SENT:'bg-rose-100 text-rose-700',     SHORT:'bg-gray-100 text-gray-700',
  MAP:'bg-cyan-100 text-cyan-700',
}
const QT_LABEL = {
  TFNG:'T/F/NG', YNNG:'Y/N/NG', MCQ:'MCQ', MULTI:'Multi',
  GAP:'Gap', TABLE:'Table', SUMM:'Summary', NOTE:'Notes', FLOW:'Flow',
  MATCH:'Headings', MINFO:'M.Info', MFEAT:'M.Feat', MEND:'M.End',
  SENT:'Sentence', SHORT:'Short', MAP:'Map/Diag',
}
function QtBadge({ qt }) {
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${QT_COLORS[qt]||'bg-gray-100 text-gray-600'}`}>{QT_LABEL[qt]||qt}</span>
}

// ── Question Review Modal ─────────────────────────────────────────────────────

function QuestionReviewModal({ item, section, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ielts-review', section, item.id],
    queryFn: () => {
      if (section === 'reading')   return api.get(`/ielts/reading/${item.id}/`).then(r => r.data)
      if (section === 'listening') return api.get(`/ielts/listening/${item.id}/`).then(r => r.data)
      return null
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
              {section === 'reading' ? `Passage ${item.passage_number||''}` : `Section ${item.section_number||''}`}
              {' · '}{item.question_count||questions.length} savol
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-sky-500"/></div>
        ) : (
          <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
            {/* Passage content or transcript */}
            {(data?.content || data?.transcript) && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section === 'reading' ? 'Passage text' : 'Transcript'}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-6">
                  {data.content || data.transcript}
                </p>
              </div>
            )}
            {data?.audio_url && (
              <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2">
                <Headphones size={14} className="text-blue-500"/>
                <span className="text-xs text-blue-700 truncate">{data.audio_url}</span>
              </div>
            )}

            {/* Questions */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Savollar</p>
              <div className="space-y-2">
                {questions.map(q => (
                  <div key={q.id} className="border border-gray-100 rounded-xl p-3 hover:border-sky-200 transition-colors">
                    {q.group_instruction && (
                      <p className="text-xs font-semibold text-sky-600 mb-2 bg-sky-50 px-2 py-1 rounded">
                        {q.group_instruction}
                      </p>
                    )}
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                        {q.number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <QtBadge qt={q.question_type}/>
                          {q.max_selections > 1 && (
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-semibold">
                              Choose {q.max_selections}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">{q.content}</p>
                        {q.choices?.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.choices.map(c => {
                              const isCorrect = q.correct_answer?.split('|').includes(c.option)
                              return (
                                <div key={c.option} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${isCorrect ? 'bg-green-50 text-green-800 font-semibold' : 'text-gray-500'}`}>
                                  <span className="font-bold w-4">{c.option}.</span>
                                  <span>{c.text}</span>
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

const READING_QT_REF = [
  // ── Judgement types ──
  { qt:'TFNG',  label:'True / False / Not Given',       desc:'Matn asosida — TRUE, FALSE yoki NOT GIVEN',                        answer:'"TRUE" | "FALSE" | "NOT GIVEN"',  fields:'group_instruction',                              extra:null },
  { qt:'YNNG',  label:'Yes / No / Not Given',           desc:'Muallif fikriga ko\'ra — YES, NO yoki NOT GIVEN',                  answer:'"YES" | "NO" | "NOT GIVEN"',      fields:'group_instruction',                              extra:null },
  // ── Choice types ──
  { qt:'MCQ',   label:'Multiple Choice (bir javob)',    desc:'A, B, C, D variantlardan bittasini tanlash',                       answer:'"A" | "B" | "C" | "D"',          fields:'choices[], group_instruction',                   extra:null },
  { qt:'MULTI', label:'Multiple Select (bir necha)',    desc:'Bir necha variant — javoblar | belgisi bilan ajratiladi',          answer:'"A|C" yoki "B|D|E"',              fields:'choices[], max_selections, group_instruction',   extra:'max_selections: 2 yoki 3' },
  // ── Completion types ──
  { qt:'GAP',   label:'Gap Fill (bo\'sh joy)',          desc:'Gapda ___ bo\'sh joy — matndan 1–2 so\'z',                        answer:'"Ethiopia"',                       fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'SENT',  label:'Sentence Completion',            desc:'Jumlaning oxirini to\'ldirish — matndan ibora',                    answer:'"social centres"',                 fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'TABLE', label:'Table Completion',               desc:'Jadval yacheykasini to\'ldirish — bitta so\'z yoki raqam',         answer:'"85" yoki "Monday"',               fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'SUMM',  label:'Summary Completion',             desc:'Xulosa paragrafidagi bo\'shliqlarni to\'ldirish',                  answer:'"Arabia" yoki "15th century"',     fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'NOTE',  label:'Notes / Diagram Completion',     desc:'Konspekt yoki diagrammadagi bo\'shliqlarni to\'ldirish',           answer:'"9th" yoki "red"',                 fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'FLOW',  label:'Flowchart Completion',           desc:'Oqim-jadval (flowchart) bo\'shliqlarini to\'ldirish',              answer:'"roasted" yoki "stored"',          fields:'group_instruction',                              extra:'choices kerak emas' },
  // ── Matching types ──
  { qt:'MATCH', label:'Matching Headings',              desc:'Har bir paragrafga mos sarlavhani topish (i, ii, iii...)',         answer:'"iii" yoki "iv"',                  fields:'choices[] (i→sarlavha matni), group_instruction',extra:null },
  { qt:'MINFO', label:'Matching Information',           desc:'Tavsif qaysi paragrafda ekanligini topish (A, B...)',             answer:'"C" yoki "B"',                     fields:'choices[] (A→Paragraph A), group_instruction',  extra:null },
  { qt:'MFEAT', label:'Matching Features',              desc:'Har bir element qaysi kategoriya/manbaga tegishli (A, B, C...)',  answer:'"B" yoki "A"',                     fields:'choices[] (A→Category name), group_instruction',extra:null },
  { qt:'MEND',  label:'Matching Sentence Endings',      desc:'Jumlaning boshlanishiga mos tugashini tanlash',                   answer:'"C" yoki "E"',                     fields:'choices[] (A→ending text), group_instruction',  extra:null },
  // ── Other ──
  { qt:'SHORT', label:'Short Answer',                   desc:'Savolga matndan qisqa javob — 1–3 so\'z',                        answer:'"Ethiopia"',                       fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'MAP',   label:'Diagram / Map Labelling',        desc:'Diagramma yoki xaritadagi belgini to\'ldirish',                   answer:'"Ethiopia" yoki "A"',              fields:'group_instruction',                              extra:'choices kerak emas' },
]

const LISTENING_QT_REF = [
  // ── Choice types ──
  { qt:'MCQ',   label:'Multiple Choice (bir javob)',    desc:'A, B, C variantlardan biri — tinglash asosida',                  answer:'"B"',                              fields:'choices[], group_instruction',                   extra:null },
  { qt:'MULTI', label:'Multiple Select (bir necha)',    desc:'Bir necha variant — javoblar | bilan, tinglash asosida',         answer:'"A|D" yoki "B|C|E"',              fields:'choices[], max_selections, group_instruction',   extra:'max_selections: 2' },
  // ── Completion types ──
  { qt:'GAP',   label:'Gap Fill (bo\'sh joy)',          desc:'___ bo\'sh joy — transcript\'da [N] belgisi kerak',              answer:'"John Smith"',                     fields:'group_instruction',                              extra:'transcript[N] marker' },
  { qt:'TABLE', label:'Table / Form Completion',        desc:'Jadval yoki anketa bo\'shliqlarini to\'ldirish',                 answer:'"304" yoki "£85"',                 fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'NOTE',  label:'Notes Completion',               desc:'Konspekt bo\'shliqlarini to\'ldirish — tinglash paytida',        answer:'"Johnson" yoki "2nd floor"',       fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'FLOW',  label:'Flowchart Completion',           desc:'Oqim-jadval bo\'shliqlarini to\'ldirish — tinglashdan',          answer:'"key card" yoki "security"',       fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'SENT',  label:'Sentence Completion',            desc:'Jumlani to\'ldirish — tinglashdan olingan so\'z',               answer:'"2" yoki "morning"',               fields:'group_instruction',                              extra:'choices kerak emas' },
  // ── Matching types ──
  { qt:'MATCH', label:'Matching (ro\'yxatdan)',         desc:'Ikkita ro\'yxatni moslash — harfni yozish',                     answer:'"C" yoki "B"',                     fields:'choices[], group_instruction',                   extra:null },
  { qt:'MFEAT', label:'Matching Features',              desc:'Har bir element qaysi manbaga tegishli — harf yozish',          answer:'"A" yoki "C"',                     fields:'choices[] (A→source name), group_instruction',  extra:null },
  // ── Other ──
  { qt:'SHORT', label:'Short Answer',                   desc:'Qisqa javob — tinglashdan 1–3 so\'z',                           answer:'"Tuesday"',                        fields:'group_instruction',                              extra:'choices kerak emas' },
  { qt:'MAP',   label:'Map / Plan Labelling',           desc:'Xarita yoki rejadagi belgini aniqlash',                         answer:'"A" yoki "D"',                     fields:'group_instruction',                              extra:'choices kerak emas' },
]

function QtReferencePanel({ section }) {
  const rows = section === 'reading' ? READING_QT_REF : LISTENING_QT_REF
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Savol turlari — to'liq ma'lumotnoma</span>
          <div className="flex flex-wrap gap-1">
            {rows.map(r => <QtBadge key={r.qt} qt={r.qt} />)}
          </div>
        </div>
        <span className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''} text-xs ml-2 flex-shrink-0`}>▼</span>
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
          {section === 'reading' && (
            <div className="px-3 py-2 bg-blue-50 text-[10px] text-blue-700">
              <span className="font-bold">Mock test:</span> JSON ildiziga <code className="bg-blue-100 px-1 rounded">"parts":[]</code> qo'shing — har bir part alohida passage. Vaqt: 1 qism=20min, 2=40min, 3=60min.
            </div>
          )}
          {section === 'listening' && (
            <div className="px-3 py-2 bg-blue-50 text-[10px] text-blue-700">
              <span className="font-bold">Mock test:</span> <code className="bg-blue-100 px-1 rounded">"sections":[]</code> array — har bir section alohida. Audio keyin: <code className="bg-blue-100 px-1 rounded">PATCH /api/admin/ielts/listening/&lt;id&gt;/audio/</code>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Import Drawer ─────────────────────────────────────────────────────────────

function ImportDrawer({ onClose, section, onImported }) {
  const [json, setJson]       = useState('')
  const [status, setStatus]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [speakMode, setSpeakMode] = useState('part')  // 'part' | 'mock'
  const fileRef = useRef()

  const handleFile = (e) => {
    const f = e.target.files[0]; if (!f) return
    const reader = new FileReader()
    reader.onload = ev => setJson(ev.target.result)
    reader.readAsText(f)
  }

  // Strip comments and auto-wrap multiple objects into array
  const cleanJson = (raw) => {
    // Remove // line comments and /* block comments */
    let s = raw
      .replace(/\/\/[^\n\r]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim()
    // Try as-is
    try { return JSON.parse(s) } catch {}
    // Try wrapping multiple root objects into array
    // Replace }...{ boundaries with },{
    const wrapped = '[' + s.replace(/\}(\s*)\{/g, '},{') + ']'
    try { return JSON.parse(wrapped) } catch {}
    return null
  }

  const handleAutoFix = () => {
    const result = cleanJson(json)
    if (result !== null) {
      setJson(JSON.stringify(result, null, 2))
      setStatus({ ok: true, msg: 'JSON tozalandi — endi Import bosing.' })
    } else {
      setStatus({ ok: false, msg: "JSON tuzatib bo'lmadi. Sintaksisni qo'lda tekshiring." })
    }
  }

  const handleImport = async () => {
    setLoading(true); setStatus(null)
    try {
      const parsed = cleanJson(json)
      if (parsed === null) throw new SyntaxError('invalid')
      const res = await api.post(`/import/ielts/${section}/`, parsed)
      const count = res.data?.part_count || res.data?.section_count || res.data?.questions || res.data?.created || (Array.isArray(res.data?.items) ? res.data.items.length : 1)
      setStatus({ ok: true, msg: `Muvaffaqiyatli import! (${count} element)` })
      setJson(''); onImported?.()
    } catch (err) {
      const msg = err instanceof SyntaxError
        ? "JSON noto'g'ri formatlangan! 'Auto-fix' tugmasini bosib ko'ring."
        : err.response?.data?.error || err.response?.data?.detail || 'Import muvaffaqiyatsiz.'
      setStatus({ ok: false, msg })
    } finally { setLoading(false) }
  }

  const activeExample = section === 'speaking'
    ? (speakMode === 'mock' ? SPEAKING_MOCK_EXAMPLE : SPEAKING_EXAMPLE)
    : EXAMPLES[section]

  return (
    <motion.div initial={{ opacity:0, x:60 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:60 }}
      transition={{ duration:0.25 }} className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[820px] bg-white flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileJson size={18} className="text-sky-500"/>
            <h3 className="font-bold text-gray-900">Import IELTS {section.charAt(0).toUpperCase()+section.slice(1)} — JSON</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 gap-5">
          {/* Left: JSON example */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Format namunasi</p>
              {section === 'speaking' && (
                <div className="flex gap-1">
                  <button onClick={() => setSpeakMode('part')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${speakMode === 'part' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    PART
                  </button>
                  <button onClick={() => setSpeakMode('mock')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${speakMode === 'mock' ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    MOCK
                  </button>
                </div>
              )}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 overflow-auto max-h-[calc(100vh-220px)]">
              <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre">{activeExample}</pre>
            </div>
          </div>

          {/* Right: reference + textarea + upload + submit */}
          <div className="flex flex-col gap-3">
            {/* Question type reference panel */}
            {(section === 'reading' || section === 'listening') && (
              <QtReferencePanel section={section} />
            )}

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">JSON kiriting yoki fayldan yuklang</p>
            <textarea value={json} onChange={e => setJson(e.target.value)}
              placeholder="Paste your JSON here..."
              className="flex-1 min-h-[200px] w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none"/>
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50 transition">
                <Upload size={15}/> Upload .json file
              </button>
              <button onClick={handleAutoFix} disabled={!json.trim()}
                className="px-3 py-2.5 border border-sky-200 text-sky-600 rounded-xl text-xs font-semibold hover:bg-sky-50 transition disabled:opacity-40 whitespace-nowrap">
                Auto-fix
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFile}/>
            {status && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${status.ok ? 'bg-green-50 text-green-700':'bg-red-50 text-red-700'}`}>
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
        <h3 className="font-bold text-gray-900 mb-2">Delete Content?</h3>
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

// ── Section Tab ───────────────────────────────────────────────────────────────

const ENDPOINTS = {
  reading:  '/admin/ielts/reading/',
  listening:'/admin/ielts/listening/',
  speaking: '/admin/ielts/speaking/',
  writing:  '/admin/ielts/writing/',
}

const DIFF_COLORS = {
  EASY:   'bg-green-100 text-green-700 border-green-200',
  MEDIUM: 'bg-blue-100 text-blue-700 border-blue-200',
  HARD:   'bg-red-100 text-red-700 border-red-200',
}
const DIFF_FILTERS = ['ALL', 'EASY', 'MEDIUM', 'HARD']

// ── Reading / Listening Tab (CEFR style) ──────────────────────────────────────
function ReadingListeningTab({ section }) {
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [showImport, setShowImport]     = useState(false)
  const [deleteId, setDeleteId]         = useState(null)
  const [reviewItem, setReviewItem]     = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-ielts', section],
    queryFn: () => api.get(ENDPOINTS[section]).then(r => r.data),
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${ENDPOINTS[section]}${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ielts', section] }); setDeleteId(null) },
  })

  const allItems = Array.isArray(data) ? data : data?.results ?? []
  const items = activeFilter === 'ALL'
    ? allItems
    : allItems.filter(it => it.difficulty === activeFilter)

  const colNum = section === 'reading' ? 'Passage #' : 'Section #'
  const headers = ['Title', colNum, 'Difficulty', 'Questions', 'Time', 'Type', 'Premium', 'Actions']
  if (section === 'listening') headers.splice(5, 0, 'Audio')

  return (
    <div className="space-y-4">
      {/* Filter + Import */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-white rounded-xl p-1.5 shadow-sm border border-sky-50 w-fit">
          {DIFF_FILTERS.map(f => (
            <button key={f} onClick={() => setActiveFilter(f)}
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-all ${
                activeFilter === f
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                  : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50'
              }`}>
              {f}
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
        <motion.div key={activeFilter} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-sky-50 overflow-hidden">
          {error ? (
            <div className="p-8 flex items-center gap-3 text-red-600"><AlertCircle size={16}/><span className="text-sm">Failed to load.</span></div>
          ) : isLoading ? (
            <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse"/>)}</div>
          ) : !items.length ? (
            <div className="p-16 text-center">
              <FileText size={40} className="text-gray-200 mx-auto mb-3"/>
              <p className="text-sm font-medium text-gray-400">
                {activeFilter === 'ALL' ? `No ${section} content yet.` : `No ${activeFilter} ${section} content.`}
              </p>
              <p className="text-xs text-gray-300 mt-1">Click "Import JSON" to add.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60">
                    {['Title', section === 'reading' ? 'Passage #' : 'Section #', 'Difficulty', 'Savollar', 'Vaqt',
                      ...(section === 'listening' ? ['Audio'] : []),
                      'Tur', 'Premium', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.03 }}
                      className="hover:bg-sky-50/20 transition-colors">
                      {/* Title */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-semibold text-gray-800 truncate text-sm">{item.title}</p>
                      </td>
                      {/* Passage/Section number */}
                      <td className="px-4 py-3">
                        <span className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-600">
                          {item.passage_number || item.section_number || (i+1)}
                        </span>
                      </td>
                      {/* Difficulty */}
                      <td className="px-4 py-3">
                        {item.difficulty ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold border ${DIFF_COLORS[item.difficulty] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            {item.difficulty}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Questions */}
                      <td className="px-4 py-3 text-gray-600 font-medium text-sm">
                        {item.question_count ?? '—'}
                      </td>
                      {/* Time */}
                      <td className="px-4 py-3">
                        {item.time_limit
                          ? <span className="flex items-center gap-1 text-gray-500 text-xs"><Clock size={11}/>{item.time_limit}m</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      {/* Audio (listening only) */}
                      {section === 'listening' && (
                        <td className="px-4 py-3">
                          {item.has_audio
                            ? <span className="flex items-center gap-1 text-blue-500 text-xs font-semibold"><Headphones size={12}/>Yes</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                      )}
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.is_standalone === false
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-slate-50 text-slate-700'
                        }`}>
                          {item.is_standalone === false ? 'Mock part' : 'Standalone'}
                        </span>
                      </td>
                      {/* Premium */}
                      <td className="px-4 py-3">
                        {item.is_premium
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full"><Crown size={9}/>Yes</span>
                          : <span className="text-xs text-gray-400">Free</span>}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setReviewItem(item)}
                            className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors" title="Savollarni ko'rish">
                            <Eye size={14}/>
                          </button>
                          <button onClick={() => setDeleteId(item.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14}/>
                          </button>
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
          <ImportDrawer onClose={() => setShowImport(false)} section={section}
            onImported={() => { queryClient.invalidateQueries({ queryKey: ['admin-ielts', section] }); setShowImport(false) }}/>
        )}
        {deleteId && (
          <DeleteConfirm onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending}/>
        )}
      </AnimatePresence>
      {reviewItem && <QuestionReviewModal item={reviewItem} section={section} onClose={() => setReviewItem(null)}/>}
    </div>
  )
}

// ── Speaking / Writing simple tab ─────────────────────────────────────────────
function SimpleTab({ section }) {
  const [showImport, setShowImport] = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-ielts', section],
    queryFn: () => api.get(ENDPOINTS[section]).then(r => r.data),
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${ENDPOINTS[section]}${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ielts', section] }); setDeleteId(null) },
  })

  const items = Array.isArray(data) ? data : data?.results ?? []

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
          <div className="p-6 space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse"/>)}</div>
        ) : !items.length ? (
          <div className="p-12 text-center">
            <FileText size={36} className="text-gray-200 mx-auto mb-3"/>
            <p className="text-sm text-gray-400">No {section} content yet. Import JSON to add.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.03 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-sky-50/20 transition-colors">
                <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-sky-600">
                  {item.part || (i+1)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.title || item.prompt?.slice(0,60)}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.time_limit && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={10}/>{item.time_limit}m</span>}
                    {item.min_words  && <span className="text-xs text-gray-400">{item.min_words}+ words</span>}
                    {item.is_premium && <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold"><Crown size={9}/>Premium</span>}
                  </div>
                </div>
                <button onClick={() => setDeleteId(item.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14}/>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {showImport && (
          <ImportDrawer onClose={() => setShowImport(false)} section={section}
            onImported={() => { queryClient.invalidateQueries({ queryKey: ['admin-ielts', section] }); setShowImport(false) }}/>
        )}
        {deleteId && (
          <DeleteConfirm onConfirm={() => deleteMutation.mutate(deleteId)} onCancel={() => setDeleteId(null)} loading={deleteMutation.isPending}/>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionTab({ section }) {
  if (section === 'reading' || section === 'listening') return <ReadingListeningTab section={section} />
  return <SimpleTab section={section} />
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'reading',   label: 'Reading',   icon: BookOpen },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'speaking',  label: 'Speaking',  icon: Mic },
  { id: 'writing',   label: 'Writing',   icon: PenLine },
]

export default function AdminIELTS() {
  const [tab, setTab] = useState('reading')

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}
        className="flex items-center gap-2">
        <Headphones size={20} className="text-sky-500"/>
        <h2 className="text-lg font-bold text-gray-900">IELTS Management</h2>
      </motion.div>

      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm border border-sky-50 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${tab===t.id ? 'bg-sky-500 text-white shadow-sm shadow-sky-200' : 'text-gray-500 hover:text-sky-600 hover:bg-sky-50'}`}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}>
          <SectionTab section={tab}/>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

