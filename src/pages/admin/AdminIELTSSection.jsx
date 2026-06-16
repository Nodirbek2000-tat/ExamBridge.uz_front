import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Headphones, Mic, PenLine,
  Upload, X, AlertCircle, FileJson, Loader2, Check,
  Trash2, Edit3, FileText, Clock, Star, Music2, VolumeX,
  Save, Eye, Zap, Search, ChevronDown, ChevronUp, Layers, Download,
} from 'lucide-react'

// Yuklangan audioni admin kompyuteriga saqlash (download)
async function downloadAudioFile(url, baseName = 'unified-audio') {
  const ext = (url.split('?')[0].match(/\.(mp3|wav|m4a|ogg|aac)$/i)?.[1] || 'mp3').toLowerCase()
  const safe = String(baseName).replace(/[^\w.-]+/g, '_').slice(0, 60) || 'unified-audio'
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
    window.open(url, '_blank')  // zaxira: yangi oynada ochish
  }
}
import api from '../../api/client'

// ── QT helpers ────────────────────────────────────────────────────────────────
const QT_COLORS = {
  MCQ:'bg-blue-100 text-blue-700', MULTI:'bg-violet-100 text-violet-700',
  GAP:'bg-slate-100 text-slate-700', TABLE:'bg-sky-100 text-sky-700',
  TFNG:'bg-green-100 text-green-700', YNNG:'bg-teal-100 text-teal-700',
  MATCH:'bg-indigo-100 text-indigo-700', MINFO:'bg-pink-100 text-pink-700',
  MFEAT:'bg-fuchsia-100 text-fuchsia-700', MEND:'bg-purple-100 text-purple-700',
  SENT:'bg-rose-100 text-rose-700', SHORT:'bg-gray-100 text-gray-700',
  SUMM:'bg-yellow-100 text-yellow-700', NOTE:'bg-lime-100 text-lime-700',
  FLOW:'bg-emerald-100 text-emerald-700', MAP:'bg-orange-100 text-orange-700',
  DIAG:'bg-cyan-100 text-cyan-700',
}
const QT_LABEL = {
  MCQ:'MCQ', MULTI:'Multi', GAP:'Gap', TABLE:'Table', TFNG:'T/F/NG',
  YNNG:'Y/N/NG', MATCH:'Headings', MINFO:'M.Info', MFEAT:'M.Feat',
  MEND:'M.End', SENT:'Sentence', SHORT:'Short', SUMM:'Summary',
  NOTE:'Notes', FLOW:'Flow', MAP:'Map', DIAG:'Diagram',
}
function QtBadge({ qt }) {
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${QT_COLORS[qt] || 'bg-gray-100 text-gray-600'}`}>
      {QT_LABEL[qt] || qt}
    </span>
  )
}

// ── Section config ─────────────────────────────────────────────────────────────
const SECTION_CONFIG = {
  reading: {
    label: 'Reading', icon: BookOpen, color: 'blue',
    endpoint: '/admin/ielts/reading/',
    importEndpoint: '/import/ielts/reading/',
    detailEndpoint: (pk) => `/admin/ielts/reading/${pk}/detail/`,
    hasDifficulty: true, hasEdit: true,
    exampleJson: `// ═══════════════════════════════════════════════════════
// IELTS READING — BARCHA 16 SAVOL TURLARINING TO'LIQ QOLLANMASI
// ═══════════════════════════════════════════════════════
//
// OPTION 1: Bitta mashq (passage)
// OPTION 2: To'liq mock test (3 ta part)
//
// group_instruction: **bold**, • bullet, \\n newline qo'llab-quvvatlanadi
// answer_review: MAJBURIY — har qanday savol turiga qo'shish kerak
//   → Passage/transcript dan to'g'ridan javobni isbotlovchi aniq matnni ko'chiring
//   → Review modeda o'sha matn passage ichida sariq highlight + qizil raqam doirasi bilan ko'rsatiladi
//   → Misol: "the six weeks after his resounding defeat at the Battle of Worcester"
//   → Listening uchun: transcript dan aynan shu gapni ko'chiring
// NOTE / SUMM uchun MUHIM: group_instruction ichida [N] marker ishlatilsa
//   → UI inline gap-fill formatida ko'rsatiladi
//   → [27] [28] [29] kabi raqamlar tegishli savol number bilan mos kelishi kerak
// ═══════════════════════════════════════════════════════

// ── OPTION 1: Single Practice Passage ───────────────────
// answer_review — MAJBURIY. Passage dan to'g'ridan aniq matnni ko'chiring.
// UI da o'sha matn sariq highlight + qizil raqam doirasi bilan ko'rsatiladi.
// "Paragraph X: '...'" formatini ISHLATMANG — faqat passajedagi aynan matnni yozing.
{
  "title": "Practice — Climate Change & Arctic Ice",
  "content": "Paragraph A\\nThe Arctic ice sheet has been shrinking at an alarming rate...\\n\\nParagraph B\\nScientists have linked this decline to rising CO2 levels...\\n\\nParagraph C\\nGovernments worldwide have pledged to reduce emissions...\\n\\nParagraph D\\nHowever, critics argue that pledges are insufficient...\\n\\nParagraph E\\nNew technologies such as carbon capture may offer hope...\\n\\nParagraph F\\nLocal communities in the Arctic face immediate consequences...\\n\\nParagraph G\\nThe economic cost of inaction is projected to be enormous...\\n\\nParagraph H\\nConclusion: urgent action is needed at all levels of society.",
  "passage_number": 1,
  "is_standalone": true,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "questions": [

    // ─── 1. TFNG ─────────────────────────────────────────
    // True / False / Not Given
    {
      "number": 1,
      "question_type": "TFNG",
      "content": "The Arctic ice sheet is shrinking faster than at any previous point in history.",
      "correct_answer": "TRUE",
      "answer_review": "The Arctic ice sheet has been shrinking at an alarming rate",
      "group_instruction": "Questions 1–4\\nDo the following statements agree with the information in the passage?\\nWrite TRUE, FALSE or NOT GIVEN."
    },
    {
      "number": 2,
      "question_type": "TFNG",
      "content": "All governments have fully implemented their emissions pledges.",
      "correct_answer": "FALSE",
      "answer_review": "critics argue that pledges are insufficient",
      "group_instruction": "Questions 1–4\\nDo the following statements agree with the information in the passage?\\nWrite TRUE, FALSE or NOT GIVEN."
    },

    // ─── 2. YNNG ─────────────────────────────────────────
    // Yes / No / Not Given (opinion-based)
    {
      "number": 3,
      "question_type": "YNNG",
      "content": "The author believes carbon capture is the only solution.",
      "correct_answer": "NO",
      "answer_review": "'New technologies such as carbon capture may offer hope' — muallif bu yagona yechim deb aytmagan",
      "group_instruction": "Questions 3–4\\nDo the following statements reflect the views of the writer?\\nWrite YES, NO or NOT GIVEN."
    },

    // ─── 3. MCQ ──────────────────────────────────────────
    // Multiple choice — ONE correct answer
    {
      "number": 4,
      "question_type": "MCQ",
      "content": "What does the passage suggest about economic consequences of inaction?",
      "correct_answer": "C",
      "answer_review": "The economic cost of inaction is projected to be enormous",
      "group_instruction": "Questions 4–5: Choose the correct letter A, B, C or D.",
      "choices": [
        {"option": "A", "text": "They are negligible"},
        {"option": "B", "text": "They affect only developing nations"},
        {"option": "C", "text": "They are projected to be enormous"},
        {"option": "D", "text": "They cannot be calculated"}
      ]
    },

    // ─── 4. MULTI ────────────────────────────────────────
    // Multiple choice — select TWO answers
    {
      "number": 5,
      "question_type": "MULTI",
      "content": "Which TWO groups are directly mentioned as affected by Arctic changes?",
      "correct_answer": "A,C",
      "answer_review": "'Local communities in the Arctic face immediate consequences'; Paragraph C: 'Governments worldwide have pledged'",
      "max_selections": 2,
      "group_instruction": "Question 5: Choose TWO letters A–E.",
      "choices": [
        {"option": "A", "text": "Local Arctic communities"},
        {"option": "B", "text": "Tropical island nations"},
        {"option": "C", "text": "Government policy makers"},
        {"option": "D", "text": "Technology companies"},
        {"option": "E", "text": "Financial institutions"}
      ]
    },

    // ─── 5. GAP ──────────────────────────────────────────
    // Sentence / paragraph gap-fill (ONE or TWO WORDS)
    {
      "number": 6,
      "question_type": "GAP",
      "content": "Scientists say the main driver of ice loss is rising ___ levels.",
      "correct_answer": "CO2",
      "answer_review": "Scientists have linked this decline to rising CO2 levels",
      "group_instruction": "Questions 6–8: Complete the sentences below.\\nUse NO MORE THAN TWO WORDS from the passage."
    },
    {
      "number": 7,
      "question_type": "GAP",
      "content": "Critics argue that government ___ are not strong enough.",
      "correct_answer": "pledges",
      "answer_review": "critics argue that pledges are insufficient",
      "group_instruction": "Questions 6–8: Complete the sentences below.\\nUse NO MORE THAN TWO WORDS from the passage."
    },

    // ─── 6. SENT ─────────────────────────────────────────
    // Sentence completion — similar to GAP but longer gap at end
    {
      "number": 8,
      "question_type": "SENT",
      "content": "New technologies like carbon capture are described as a source of ___.",
      "correct_answer": "hope",
      "answer_review": "New technologies such as carbon capture may offer hope",
      "group_instruction": "Questions 8–9: Complete the sentences.\\nChoose ONE WORD ONLY from the passage."
    },

    // ─── 7. NOTE ─────────────────────────────────────────
    // Notes completion — group_instruction ichida [N] marker → inline input box
    // UI: bold header + bullet + [N] o'rnida text input (screenshot 3 kabi)
    //
    // QOIDA: barcha NOTE savollar BITTA group_instruction share qiladi
    //        [N] marker = tegishli question.number
    //        content maydoni ixtiyoriy (faqat answer hint uchun)
    {
      "number": 9,
      "question_type": "NOTE",
      "correct_answer": "CO2",
      "answer_review": "Relevant passage excerpt here...",
      "group_instruction": "Questions 9–11: Complete the notes below. ONE WORD ONLY from the passage.\\n\\n**Climate Change**\\n**The problem**\\n• Main cause: rising [9] levels\\n• Ice loss is occurring at an [10] rate\\n**The solution**\\n• Carbon capture is a source of [11]"
    },
    {
      "number": 10,
      "question_type": "NOTE",
      "correct_answer": "alarming",
      "answer_review": "Relevant passage excerpt here...",
      "group_instruction": "Questions 9–11: Complete the notes below. ONE WORD ONLY from the passage.\\n\\n**Climate Change**\\n**The problem**\\n• Main cause: rising [9] levels\\n• Ice loss is occurring at an [10] rate\\n**The solution**\\n• Carbon capture is a source of [11]"
    },
    {
      "number": 11,
      "question_type": "NOTE",
      "correct_answer": "hope",
      "answer_review": "Relevant passage excerpt here...",
      "group_instruction": "Questions 9–11: Complete the notes below. ONE WORD ONLY from the passage.\\n\\n**Climate Change**\\n**The problem**\\n• Main cause: rising [9] levels\\n• Ice loss is occurring at an [10] rate\\n**The solution**\\n• Carbon capture is a source of [11]"
    },

    // ─── 8. SUMM ─────────────────────────────────────────
    // Summary completion — group_instruction: to'liq paragraf + [N] gap marker
    // UI: paragraf matn inline dashed box [N] + pastda 3-column word bank grid
    //
    // QOIDA: barcha SUMM savollar BITTA group_instruction share qiladi
    //        word_bank BARCHA savollarda bir xil bo'lishi SHART
    //        [N] = question.number bilan mos kelishi kerak
    {
      "number": 12,
      "question_type": "SUMM",
      "correct_answer": "urgent",
      "answer_review": "Relevant passage excerpt here...",
      "word_bank": ["urgent", "delayed", "optional", "immediate", "costly", "global", "rapid", "clear"],
      "group_instruction": "Questions 12–13: Complete the summary. Choose words from the box below.\\n\\nThe passage concludes that [12] action is required at every level of society. Arctic communities face [13] consequences from ongoing ice loss."
    },
    {
      "number": 13,
      "question_type": "SUMM",
      "correct_answer": "immediate",
      "answer_review": "Relevant passage excerpt here...",
      "word_bank": ["urgent", "delayed", "optional", "immediate", "costly", "global", "rapid", "clear"],
      "group_instruction": "Questions 12–13: Complete the summary. Choose words from the box below.\\n\\nThe passage concludes that [12] action is required at every level of society. Arctic communities face [13] consequences from ongoing ice loss."
    },

    // ─── 9. TABLE ────────────────────────────────────────
    // Table completion — group_instruction + content as markdown table with [N] markers
    // All TABLE questions in group share SAME content (the table) and group_instruction
    // Columns defined with | col | col | format, header row first
    {
      "number": 12,
      "question_type": "TABLE",
      "correct_answer": "versatile",
      "answer_review": "Roman stadiums of Europe have proved very versatile.",
      "group_instruction": "Questions 12–14: Complete the table below. ONE WORD ONLY from the passage.",
      "content": "| **Amphitheatre** | **Notable feature** | **Current use** |\\n| Arles | converted to [12] first | residential area |\\n| Verona | oldest Roman amphitheatre | venue for [13] |\\n| Lucca | storage of goods | market square with [14] |"
    },
    {
      "number": 13,
      "question_type": "TABLE",
      "correct_answer": "opera",
      "answer_review": "The arena in Verona is famous today as a venue where opera is performed.",
      "group_instruction": "Questions 12–14: Complete the table below. ONE WORD ONLY from the passage.",
      "content": "| **Amphitheatre** | **Notable feature** | **Current use** |\\n| Arles | converted to [12] first | residential area |\\n| Verona | oldest Roman amphitheatre | venue for [13] |\\n| Lucca | storage of goods | market square with [14] |"
    },
    {
      "number": 14,
      "question_type": "TABLE",
      "correct_answer": "homes",
      "answer_review": "It is now a market square with homes incorporated into the remains.",
      "group_instruction": "Questions 12–14: Complete the table below. ONE WORD ONLY from the passage.",
      "content": "| **Amphitheatre** | **Notable feature** | **Current use** |\\n| Arles | converted to [12] first | residential area |\\n| Verona | oldest Roman amphitheatre | venue for [13] |\\n| Lucca | storage of goods | market square with [14] |"
    },

    // ─── 10. FLOW ────────────────────────────────────────
    // Flowchart completion
    // UI: vertikal qutchalar ⬇ strelkalar bilan bog'langan
    // YANGI FORMAT: har bir FLOW savol = bitta qutcha (box)
    // content ichida ___ = javob kiritish joyi (shu savol uchun)
    // ___ bo'lmasa → oddiy matn qutchasi (savol numberi ko'rsatilmaydi)
    // Bitta group_instruction ostidagi barcha FLOW savollar → bitta flowchart
    //
    // group_list (ixtiyoriy): qutcha ichidagi ro'yxat — A. text, B. text...
    // Har qanday question turida group_instruction ostida label ro'yxat ko'rsatadi
    {
      "number": 14,
      "question_type": "FLOW",
      "content": "CO2 rises in the atmosphere",
      "correct_answer": "",
      "group_instruction": "Questions 14–16: Complete the flowchart.\\nWrite ONE WORD ONLY from the passage."
    },
    {
      "number": 15,
      "question_type": "FLOW",
      "content": "___ ice sheets begin to shrink",
      "correct_answer": "Arctic",
      "answer_review": "Local communities in the Arctic face immediate consequences",
      "group_instruction": "Questions 14–16: Complete the flowchart.\\nWrite ONE WORD ONLY from the passage."
    },
    {
      "number": 16,
      "question_type": "FLOW",
      "content": "Sea levels rise → coastal communities threatened",
      "correct_answer": "",
      "group_instruction": "Questions 14–16: Complete the flowchart.\\nWrite ONE WORD ONLY from the passage."
    },

    // ─── 11. MATCH ───────────────────────────────────────
    // Matching headings — each question = one paragraph
    // choices = list of headings with roman numerals as option
    {
      "number": 15,
      "question_type": "MATCH",
      "content": "Paragraph C",
      "correct_answer": "iv",
      "answer_review": "'Governments worldwide have pledged to reduce emissions' → International political commitments",
      "group_instruction": "Questions 15–16: Choose the correct heading for each paragraph from the list of headings below.",
      "choices": [
        {"option": "i",   "text": "The economic burden of delay"},
        {"option": "ii",  "text": "Community impact in polar regions"},
        {"option": "iii", "text": "Scientific evidence for warming"},
        {"option": "iv",  "text": "International political commitments"},
        {"option": "v",   "text": "Technological hope"},
        {"option": "vi",  "text": "Critics question effectiveness"}
      ]
    },
    {
      "number": 16,
      "question_type": "MATCH",
      "content": "Paragraph E",
      "correct_answer": "v",
      "answer_review": "'New technologies such as carbon capture may offer hope' → Technological hope",
      "group_instruction": "Questions 15–16: Choose the correct heading for each paragraph from the list of headings below.",
      "choices": [
        {"option": "i",   "text": "The economic burden of delay"},
        {"option": "ii",  "text": "Community impact in polar regions"},
        {"option": "iii", "text": "Scientific evidence for warming"},
        {"option": "iv",  "text": "International political commitments"},
        {"option": "v",   "text": "Technological hope"},
        {"option": "vi",  "text": "Critics question effectiveness"}
      ]
    },

    // ─── 12. MINFO ───────────────────────────────────────
    // Matching information — each statement → paragraph letter (A–H)
    // UI: GRID MATRIX — row=savol, col=A..H, radio button
    // QOIDA: barcha MINFO savollar BITTA group_instruction da bo'lishi kerak
    //        choices yo'q bo'lsa → UI default A–H ko'rsatadi
    {
      "number": 17,
      "question_type": "MINFO",
      "content": "A reference to financial projections about climate damage.",
      "correct_answer": "G",
      "answer_review": "The economic cost of inaction is projected to be enormous",
      "group_instruction": "Questions 17–19: The passage has eight paragraphs A–H.\\nWhich paragraph contains the following information?\\nWrite the correct letter A–H."
    },
    {
      "number": 18,
      "question_type": "MINFO",
      "content": "A mention of community-level hardship.",
      "correct_answer": "F",
      "answer_review": "Local communities in the Arctic face immediate consequences",
      "group_instruction": "Questions 17–19: The passage has eight paragraphs A–H.\\nWhich paragraph contains the following information?\\nWrite the correct letter A–H."
    },

    // ─── 13. MFEAT ───────────────────────────────────────
    // Matching features — each statement → researcher/category
    // choices shown as legend at top of group, dropdown per question
    {
      "number": 19,
      "question_type": "MFEAT",
      "content": "Governments have made formal commitments to cut emissions.",
      "correct_answer": "C",
      "answer_review": "Governments worldwide have pledged to reduce emissions",
      "group_instruction": "Questions 19–21: Match each statement with the correct paragraph label.\\n**Paragraph Labels:**",
      "choices": [
        {"option": "A", "text": "Paragraph A — Arctic ice decline"},
        {"option": "B", "text": "Paragraph B — CO2 link"},
        {"option": "C", "text": "Paragraph C — Government pledges"},
        {"option": "D", "text": "Paragraph D — Critics"},
        {"option": "E", "text": "Paragraph E — Technology"}
      ]
    },
    {
      "number": 20,
      "question_type": "MFEAT",
      "content": "New approaches to removing greenhouse gases are being explored.",
      "correct_answer": "E",
      "answer_review": "New technologies such as carbon capture may offer hope",
      "group_instruction": "Questions 19–21: Match each statement with the correct paragraph label.\\n**Paragraph Labels:**",
      "choices": [
        {"option": "A", "text": "Paragraph A — Arctic ice decline"},
        {"option": "B", "text": "Paragraph B — CO2 link"},
        {"option": "C", "text": "Paragraph C — Government pledges"},
        {"option": "D", "text": "Paragraph D — Critics"},
        {"option": "E", "text": "Paragraph E — Technology"}
      ]
    },

    // ─── 14. MEND ────────────────────────────────────────
    // Matching sentence endings — har bir starter → to'g'ri ending (A–G)
    // UI: GRID MATRIX — row=savol, col=A..G, radio button
    // QOIDA: barcha MEND savollar BITTA group_instruction + BIR XIL choices
    //
    // group_list (TAVSIYA ETILADI): endings to'liq matn sifatida qalin ro'yxatda ko'rsatiladi
    // → group_instruction ostida A. ...text, B. ...text ko'rinishida chiqadi
    // → choices → faqat GRID uchun (A, B, C... harflar — matn shart emas)
    // → group_list → ekranda ko'rsatiladigan to'liq matn
    {
      "number": 21,
      "question_type": "MEND",
      "content": "Scientists believe that the primary cause of ice loss is ...",
      "correct_answer": "B",
      "answer_review": "Scientists have linked this decline to rising CO2 levels",
      "group_instruction": "Questions 21–22: Complete each sentence with the correct ending A–G below.",
      "group_list": [
        {"option": "A", "text": "... insufficient government funding."},
        {"option": "B", "text": "... rising concentrations of CO2."},
        {"option": "C", "text": "... natural geological cycles."},
        {"option": "D", "text": "... urban expansion in polar regions."},
        {"option": "E", "text": "... changing ocean currents only."},
        {"option": "F", "text": "... a combination of solar activity and CO2."},
        {"option": "G", "text": "... deforestation in tropical areas."}
      ],
      "choices": [
        {"option": "A", "text": "A"},
        {"option": "B", "text": "B"},
        {"option": "C", "text": "C"},
        {"option": "D", "text": "D"},
        {"option": "E", "text": "E"},
        {"option": "F", "text": "F"},
        {"option": "G", "text": "G"}
      ]
    },
    {
      "number": 22,
      "question_type": "MEND",
      "content": "Critics of government action argue that the pledges are ...",
      "correct_answer": "A",
      "answer_review": "critics argue that pledges are insufficient",
      "group_instruction": "Questions 21–22: Complete each sentence with the correct ending A–G below.",
      "group_list": [
        {"option": "A", "text": "... insufficient government funding."},
        {"option": "B", "text": "... rising concentrations of CO2."},
        {"option": "C", "text": "... natural geological cycles."},
        {"option": "D", "text": "... urban expansion in polar regions."},
        {"option": "E", "text": "... changing ocean currents only."},
        {"option": "F", "text": "... a combination of solar activity and CO2."},
        {"option": "G", "text": "... deforestation in tropical areas."}
      ],
      "choices": [
        {"option": "A", "text": "A"},
        {"option": "B", "text": "B"},
        {"option": "C", "text": "C"},
        {"option": "D", "text": "D"},
        {"option": "E", "text": "E"},
        {"option": "F", "text": "F"},
        {"option": "G", "text": "G"}
      ]
    },

    // ─── 15. SHORT ───────────────────────────────────────
    // Short-answer questions (max 3 words)
    {
      "number": 23,
      "question_type": "SHORT",
      "content": "What type of technology is mentioned as potentially helpful in Paragraph E?",
      "correct_answer": "carbon capture",
      "answer_review": "New technologies such as carbon capture may offer hope",
      "group_instruction": "Questions 23–24: Answer the questions below.\\nChoose NO MORE THAN THREE WORDS from the passage."
    },

    // ─── 16. MAP ─────────────────────────────────────────
    // Map/diagram labelling (one label = one answer)
    {
      "number": 24,
      "question_type": "MAP",
      "content": "Label A on the diagram points to the region described in Paragraph F as facing 'immediate consequences'. What is this region called?",
      "correct_answer": "Arctic",
      "answer_review": "Local communities in the Arctic face immediate consequences",
      "group_instruction": "Question 24: Label the diagram below.\\nChoose ONE WORD ONLY from the passage."
    }

  ]
}

// ── OPTION 2: Full Mock Test (3 parts) ──────────────────
{
  "title": "IELTS Reading Mock Test 1",
  "test_type": "FULL_MOCK",
  "difficulty": "MEDIUM",
  "is_premium": true,
  "parts": [
    {
      "passage_number": 1,
      "title": "Part 1 — The History of Coffee",
      "content": "Full passage text...",
      "questions": [
        {"number": 1, "question_type": "TFNG", "content": "...", "correct_answer": "TRUE",
         "group_instruction": "Questions 1–5: TRUE, FALSE or NOT GIVEN?"},
        {"number": 2, "question_type": "GAP",  "content": "Coffee was first grown in ___.", "correct_answer": "Ethiopia",
         "group_instruction": "Questions 6–10: ONE WORD ONLY."}
      ]
    },
    {
      "passage_number": 2,
      "title": "Part 2 — Urban Planning",
      "content": "Full passage text...",
      "questions": [
        {"number": 14, "question_type": "MCQ", "content": "...", "correct_answer": "B",
         "choices": [{"option":"A","text":"..."},{"option":"B","text":"..."}]}
      ]
    },
    {
      "passage_number": 3,
      "title": "Part 3 — Behavioural Economics",
      "content": "Full passage text...",
      "questions": [
        {"number": 27, "question_type": "MEND", "content": "The researcher argues that ...",
         "correct_answer": "C",
         "group_instruction": "Questions 27–30: Complete each sentence ending A–G.",
         "choices": [
           {"option":"A","text":"... money drives all decisions."},
           {"option":"B","text":"... context shapes behaviour."},
           {"option":"C","text":"... small nudges change outcomes."}
         ]}
      ]
    }
  ]
}

// ═══════════════════════════════════════════════════════
// QISQACHA ESLATMALAR
// ═══════════════════════════════════════════════════════
// question_type  | UI ko'rinishi                | choices kerakmi?
// ────────────────────────────────────────────────────────────
// TFNG           | 3 tugma (T/F/NG)             | yo'q
// YNNG           | 3 tugma (Y/N/NG)             | yo'q
// MCQ            | radio buttons                | HA (A,B,C,D)
// MULTI          | checkbox multi-select        | HA + max_selections
// GAP            | matn kiritish                | yo'q
// SENT           | matn kiritish                | yo'q
// NOTE           | inline [N] gap blok ★        | yo'q  (group_instruction da [N] bo'lsa)
// SUMM           | inline [N] + word bank ★     | word_bank massiv
// TABLE          | markdown jadval [N] ★★       | yo'q  (content da [N] bo'lsa jadval blok)
// FLOW           | flowchart qutchalar ★★★      | yo'q  (bitta group → bitta oqim)
// MATCH          | dropdown yoki matn           | HA (roman: i,ii,iii)
// MINFO          | harf grid (A B C...) ★       | optional (default A–H)
// MFEAT          | dropdown (legend yuqori)     | HA (A,B,C,D...)
// MEND           | GRID MATRIX ★                | HA — group bo'lsa grid ko'rinadi
// SHORT          | matn kiritish                | yo'q
// MAP            | matn kiritish                | yo'q
//
// ★ NOTE/SUMM: group_instruction ichida [9],[10]... marker → inline gap blok
//              marker yo'q bo'lsa → oddiy card
// ★★ TABLE: content ichida | col | format + [N] marker → markdown table gap blok
//           Barcha TABLE savollar BITTA content (jadval) va group_instruction share qiladi
//           content = "| **Col1** | **Col2** |\n| data | [12] |" formatida
// ★★★ FLOW: Bitta group_instruction ostidagi FLOW savollar → vertikal flowchart
//            har bir savol = bitta qutcha, ⬇ strelka bilan bog'langan
//            content ichida ___ → inline input (savol numberi belgisi bilan)
//            ___ bo'lmasa → faqat matn qutchasi (fon box)
// ★ MEND/MINFO: choices bor + ketma-ket savollar → grid matrix (jadval)
//
// group_list maydoni (YANGI, ixtiyoriy):
//   → Har qanday savol turida group_instruction ostida label ro'yxat ko'rsatadi
//   → Format: [{"option": "A", "text": "..."}, {"option": "B", "text": "..."}]
//   → MEND uchun tavsiya: endings to'liq matn sifatida + choices faqat A,B,C harflar
//
// answer_review maydoni: barcha savol turlarida ishlatilishi mumkin
//   → review rejimida passage ichida sariq highlight + qizil raqam doirasi
//   → passage-dan aynan shu jumla yoki matnni ko'chiring
// ═══════════════════════════════════════════════════════`,
    renderMeta: (item) => [
      item.time_limit && `${item.time_limit} min`,
      `${item.question_count ?? 0} Q`,
      item.difficulty,
      item.is_standalone ? 'Practice' : 'Mock Part',
    ].filter(Boolean),
    numberField: (item, i) => item.passage_number || (i + 1),
  },
  listening: {
    label: 'Listening', icon: Headphones, color: 'purple',
    endpoint: '/admin/ielts/listening/',
    importEndpoint: '/import/ielts/listening/',
    detailEndpoint: (pk) => `/admin/ielts/listening/${pk}/detail/`,
    hasDifficulty: true, hasEdit: true, hasAudio: true,
    exampleJson: `// ═══════════════════════════════════════════════════════
// IELTS LISTENING — TO'LIQ IMPORT GUIDE
// ═══════════════════════════════════════════════════════

// ── TRANSCRIPT FORMATTING (review sahifasida chiroyli ko'rinadi) ──
// transcript ichida "\\n" = yangi qator. Quyidagi belgilar ishlaydi:
//   # Sarlavha          → eng katta sarlavha
//   ## Kichik sarlavha   → ko'k o'rta sarlavha
//   ### Mayda sarlavha   → qalin mayda sarlavha
//   - matn   yoki   • matn   → ro'yxat (nuqtali, pastma-past)
//   **qalin**            → qalin matn
//   *kursiv*             → kursiv matn
//   [1], [2] ...         → javob joylari (sariq highlight + raqam)
// Misol transcript:
//   "## CAR INSURANCE\\n\\n**Agent:** Good morning.\\n**Customer:** Hello.\\n\\n- Address: [1]\\n- Occupation: [2]"

// ── OPTION 1: Single practice section ────────────────────
{
  "title": "Section 1 — Hotel Booking",
  "section_number": 1,
  "is_standalone": true,
  "difficulty": "EASY",
  "is_premium": false,
  "transcript": "Full audio transcript (optional). Use [1], [2] markers for answer positions.",
  "questions": [

    // ── GAP / SHORT — oddiy matn input ─────────────────────
    {
      "number": 1,
      "question_type": "GAP",
      "content": "The guest surname is ___.",
      "correct_answer": "JOHNSON",
      "group_instruction": "Questions 1–4\\nComplete the form. Write ONE WORD ONLY."
    },

    // ── MCQ — radio tugmalar ────────────────────────────────
    {
      "number": 2,
      "question_type": "MCQ",
      "content": "What type of room does the guest want?",
      "correct_answer": "B",
      "group_instruction": "Questions 2–3\\nChoose the correct letter A, B or C.",
      "choices": [
        {"option": "A", "text": "Single room"},
        {"option": "B", "text": "Double room"},
        {"option": "C", "text": "Suite"}
      ]
    },

    // ── MULTI — bir nechta tanlov (2 ta to'g'ri javob) ─────
    {
      "number": 3,
      "question_type": "MULTI",
      "content": "Which TWO facilities does the hotel offer?",
      "correct_answer": "A|C",
      "max_selections": 2,
      "group_instruction": "Questions 3–4\\nChoose TWO letters A–E.",
      "choices": [
        {"option": "A", "text": "Swimming pool"},
        {"option": "B", "text": "Tennis court"},
        {"option": "C", "text": "Gym"},
        {"option": "D", "text": "Sauna"},
        {"option": "E", "text": "Restaurant"}
      ]
    },

    // ── TFNG — True / False / Not Given ────────────────────
    {
      "number": 4,
      "question_type": "TFNG",
      "content": "The hotel was built more than 50 years ago.",
      "correct_answer": "TRUE",
      "group_instruction": "Questions 4–5\\nDo the following statements agree with what the speaker says?\\nWrite TRUE, FALSE or NOT GIVEN."
    },

    // ── YNNG — Yes / No / Not Given ────────────────────────
    {
      "number": 5,
      "question_type": "YNNG",
      "content": "The researcher believes cities should limit car use.",
      "correct_answer": "YES",
      "group_instruction": "Questions 5–6\\nDo the following statements agree with the views of the speaker?\\nWrite YES, NO or NOT GIVEN."
    },

    // ── NOTE — inline input (matn ichida [N] markerlari) ───
    // group_instruction ichida [N] = savol raqami
    // Bullet: •  yoki -  bilan boshlanadi
    // Bold:   **Matn** (qalin harflar)
    {
      "number": 6,
      "question_type": "NOTE",
      "content": "",
      "correct_answer": "TUESDAY",
      "group_instruction": "Questions 6–8\\nComplete the notes below. Write ONE WORD AND/OR A NUMBER.\\n\\n**Conference Details**\\n• Date: [6]\\n• Duration: [7] days\\n• Venue: [8] Hall",
      "answer_review": "The speaker says: 'The conference starts on Tuesday...'"
    },
    {
      "number": 7,
      "question_type": "NOTE",
      "content": "",
      "correct_answer": "THREE",
      "group_instruction": "Questions 6–8\\nComplete the notes below. Write ONE WORD AND/OR A NUMBER.\\n\\n**Conference Details**\\n• Date: [6]\\n• Duration: [7] days\\n• Venue: [8] Hall"
    },
    {
      "number": 8,
      "question_type": "NOTE",
      "content": "",
      "correct_answer": "MAIN",
      "group_instruction": "Questions 6–8\\nComplete the notes below. Write ONE WORD AND/OR A NUMBER.\\n\\n**Conference Details**\\n• Date: [6]\\n• Duration: [7] days\\n• Venue: [8] Hall"
    },

    // ── SUMM — word bankdan tanlab to'ldirish ──────────────
    // word_bank: to'g'ri + chalg'ituvchi so'zlar ro'yxati
    {
      "number": 9,
      "question_type": "SUMM",
      "content": "",
      "correct_answer": "RENEWABLE",
      "word_bank": ["renewable", "fossil", "solar", "nuclear", "limited", "expensive"],
      "group_instruction": "Questions 9–10\\nComplete the summary. Choose ONE WORD from the box.\\n\\nThe scientist argues that [9] energy sources will replace [10] fuels within 20 years."
    },
    {
      "number": 10,
      "question_type": "SUMM",
      "content": "",
      "correct_answer": "FOSSIL",
      "word_bank": ["renewable", "fossil", "solar", "nuclear", "limited", "expensive"],
      "group_instruction": "Questions 9–10\\nComplete the summary. Choose ONE WORD from the box.\\n\\nThe scientist argues that [9] energy sources will replace [10] fuels within 20 years."
    },

    // ── TABLE — jadval ichida [N] input ────────────────────
    // content = markdown jadval, [N] = savol raqami
    {
      "number": 11,
      "question_type": "TABLE",
      "content": "| Feature | Details |\\n|---|---|\\n| Name | [11] |\\n| Cost | £[12] per night |\\n| Check-in | [13] pm |",
      "correct_answer": "LAKESIDE",
      "group_instruction": "Questions 11–13\\nComplete the table. Write NO MORE THAN TWO WORDS."
    },
    {
      "number": 12,
      "question_type": "TABLE",
      "content": "| Feature | Details |\\n|---|---|\\n| Name | [11] |\\n| Cost | £[12] per night |\\n| Check-in | [13] pm |",
      "correct_answer": "45",
      "group_instruction": "Questions 11–13\\nComplete the table. Write NO MORE THAN TWO WORDS."
    },
    {
      "number": 13,
      "question_type": "TABLE",
      "content": "| Feature | Details |\\n|---|---|\\n| Name | [11] |\\n| Cost | £[12] per night |\\n| Check-in | [13] pm |",
      "correct_answer": "3",
      "group_instruction": "Questions 11–13\\nComplete the table. Write NO MORE THAN TWO WORDS."
    },

    // ── MFEAT — grid (har bir savol uchun radio tanlov) ────
    // choices: ustun sarlavhalari (A, B, C...)
    // Har bir savol = bitta qator, choices = ustunlar
    {
      "number": 14,
      "question_type": "MFEAT",
      "content": "a strong interest in history",
      "correct_answer": "B",
      "group_instruction": "Questions 14–16\\nMatch each description with the correct person.\\nChoose A, B or C.",
      "choices": [
        {"option": "A", "text": "Maria"},
        {"option": "B", "text": "James"},
        {"option": "C", "text": "Sophie"}
      ]
    },
    {
      "number": 15,
      "question_type": "MFEAT",
      "content": "previous experience with children",
      "correct_answer": "A",
      "group_instruction": "Questions 14–16\\nMatch each description with the correct person.\\nChoose A, B or C.",
      "choices": [
        {"option": "A", "text": "Maria"},
        {"option": "B", "text": "James"},
        {"option": "C", "text": "Sophie"}
      ]
    }
  ]
}

// ── OPTION 2: Full mock (1–4 sections) ───────────────────
{
  "title": "IELTS Listening Mock Test 1",
  "difficulty": "MEDIUM",
  "is_premium": false,
  "sections": [
    {
      "section_number": 1,
      "title": "Section 1 — Hotel Booking",
      "transcript": "...",
      "questions": [ "... (yuqoridagi formatda)" ]
    },
    {
      "section_number": 2,
      "title": "Section 2 — Museum Tour",
      "transcript": "...",
      "questions": [ "..." ]
    }
  ]
}

// ═══════════════════════════════════════════════════════
// ESLATMALAR
// ───────────────────────────────────────────────────────
// question_type qiymatlari:
//   GAP      — oddiy matn input
//   SHORT    — qisqa javob
//   NOTE     — matn ichida [N] inline inputs (group_instruction)
//   SUMM     — word_bank dan tanlab to'ldirish
//   TABLE    — jadval ichida [N] inputs (content)
//   MCQ      — bir javobli tanlov (choices bilan)
//   MULTI    — ko'p javobli tanlov (max_selections qo'shing)
//   TFNG     — True / False / Not Given
//   YNNG     — Yes / No / Not Given
//   MFEAT    — radio grid (choices = ustun sarlavhalari)
//   MEND     — radio grid (jumlalar uchun) — group_list bilan endings ro'yxat
//   MATCH    — choices bo'lsa MCQ, yo'qsa matn input
//   SENT     — sentence completion
//   FLOW     — flowchart ⬇ qutchalar (bitta group = bitta oqim)
//
// correct_answer:  MULTI → "A|C";  NOTE/SUMM/TABLE → to'g'ri so'z
// word_bank:       faqat SUMM tipida ishlatiladi
// group_list:      group_instruction ostida label ro'yxat (A. text, B. text...)
//                  MEND uchun tavsiya: endings to'liq matn sifatida
// answer_review:   transcript dan aynan shu jumla/matn → review da sariq highlight
// group_instruction: BIR XUDDA savollarda aynan bir xil bo'lishi kerak!
// ═══════════════════════════════════════════════════════`,
    renderMeta: (item) => [
      `${item.question_count ?? 0} Q`,
      item.difficulty,
      item.is_standalone ? 'Practice' : 'Mock Section',
    ].filter(Boolean),
    numberField: (item, i) => item.section_number || (i + 1),
  },
  speaking: {
    label: 'Speaking', icon: Mic, color: 'green',
    endpoint: '/admin/ielts/speaking/',
    importEndpoint: '/import/ielts/speaking/',
    detailEndpoint: null,
    premiumEndpoint: (pk) => `/admin/ielts/speaking/${pk}/`,
    exampleJson: `// Part 1 (general questions)
{
  "title": "Part 1 — Work and Study",
  "part": 1,
  "topic": "Work and Study",
  "questions": [
    "Do you work or are you a student?",
    "What do you enjoy most about your work or studies?",
    "Would you like to change your job in the future?"
  ],
  "is_premium": false
}

// Part 2 (cue card)
{
  "title": "Part 2 — Describe a Place You Visited",
  "part": 2,
  "topic": "Travel",
  "cue_card": "Describe a place you have visited recently.",
  "bullet_points": [
    "where it is",
    "why you went there",
    "what you did there",
    "and explain whether you would recommend it"
  ],
  "follow_up": "Would you like to visit that place again?",
  "is_premium": false
}

// Part 3 (discussion)
{
  "title": "Part 3 — Tourism and Travel",
  "part": 3,
  "topic": "Tourism",
  "questions": [
    "Why do people enjoy travelling to other countries?",
    "How has international tourism changed recently?",
    "What are some negative effects of mass tourism?"
  ],
  "is_premium": false
}`,
    renderMeta: (item) => [
      item.test_type === 'MOCK' ? 'Full Mock' : 'Part ' + item.part,
      item.topic,
    ].filter(Boolean),
    numberField: (item, i) => item.part || (i + 1),
  },
  writing: {
    label: 'Writing', icon: PenLine, color: 'orange',
    endpoint: '/admin/ielts/writing/',
    importEndpoint: '/import/ielts/writing/',
    detailEndpoint: null,
    premiumEndpoint: (pk) => `/admin/ielts/writing/${pk}/`,
    hasImage: true,
    exampleJson: `// Task 1 (chart/graph — rasm yuklanadi import dan keyin)
{
  "title": "Task 1 — Bar Chart: Energy Sources",
  "task_type": 1,
  "test_type": "ACADEMIC",
  "difficulty": "MEDIUM",
  "prompt": "The bar chart shows the percentage of energy produced from different sources in four countries in 2020.",
  "min_words": 150,
  "time_limit": 20,
  "is_premium": false,
  "recommendations": ["significant", "proportion", "whereas", "in contrast"],
  "sample_answer": "Optional sample answer..."
}

// Task 2 (essay)
{
  "title": "Task 2 — Opinion: Technology",
  "task_type": 2,
  "test_type": "ACADEMIC",
  "difficulty": "HARD",
  "prompt": "Some people believe technology has made our lives more complicated. To what extent do you agree or disagree?",
  "min_words": 250,
  "time_limit": 40,
  "is_premium": false,
  "recommendations": ["argue", "contend", "furthermore", "nevertheless"]
}`,
    renderMeta: (item) => [
      item.task_type && `Task ${item.task_type}`,
      item.difficulty,
      item.min_words && `Min ${item.min_words}w`,
      item.time_limit && `${item.time_limit} min`,
    ].filter(Boolean),
    numberField: (item, i) => item.task_type || (i + 1),
  },
  tests: {
    label: 'Full Tests', icon: Zap, color: 'slate',
    endpoint: '/admin/ielts/tests/',
    importEndpoint: null, noImport: true,
    detailEndpoint: (pk) => `/admin/ielts/tests/${pk}/`,
    exampleJson: `// Full Tests are imported automatically via Reading or Listening import using OPTION 2 format.
// Reading full mock → use "parts" array in the Reading import.
// Listening full mock → use "sections" array in the Listening import.
// Each import creates an IELTSTest container that links all passages/sections.`,
    renderMeta: (item) => [
      item.test_type,
      item.passage_count > 0 ? `${item.passage_count} passages` : null,
      item.section_count > 0 ? `${item.section_count} sections` : null,
    ].filter(Boolean),
    numberField: (item, i) => i + 1,
  },
}

const COLOR_CLASSES = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100',   badge: 'bg-blue-50 text-blue-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100', badge: 'bg-purple-50 text-purple-600' },
  green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'bg-green-100',  badge: 'bg-green-50 text-green-600' },
  orange: { bg: 'bg-sky-50',    text: 'text-sky-600',    icon: 'bg-sky-100',    badge: 'bg-sky-50 text-sky-600' },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-600',  icon: 'bg-slate-100',  badge: 'bg-slate-50 text-slate-600' },
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
        <h3 className="font-bold text-gray-900 mb-2">Delete Content?</h3>
        <p className="text-sm text-gray-500 mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 size={13} className="animate-spin" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Audio Upload Modal ────────────────────────────────────────────────────────
function AudioUploadModal({ item, onClose, onSuccess }) {
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
      await api.post(`/admin/ielts/listening/${item.id}/audio/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus({ ok: true, msg: 'Audio uploaded!' })
      onSuccess?.()
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Upload failed' })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Upload Audio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4 truncate">{item.title}</p>
        {item.audio_file && (
          <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-xl mb-3 border border-green-100">
            <Music2 size={14} className="text-green-600 flex-shrink-0" />
            <span className="text-xs text-green-700">Has audio — uploading will replace it</span>
          </div>
        )}
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-sky-300 rounded-xl text-sm text-sky-600 hover:bg-sky-50 transition font-medium">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Uploading...' : 'Select audio (MP3, WAV, OGG)'}
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

// ── Test-level (Unified) Audio Upload Modal ───────────────────────────────────
function TestAudioUploadModal({ item, onClose, onSuccess }) {
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
      await api.post(`/admin/ielts/tests/${item.id}/audio/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus({ ok: true, msg: 'Unified audio uploaded! All parts will use this audio.' })
      onSuccess?.()
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Upload failed' })
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete unified audio? Parts will fall back to their individual audio files.')) return
    setLoading(true)
    try {
      await api.delete(`/admin/ielts/tests/${item.id}/audio/`)
      setStatus({ ok: true, msg: 'Unified audio removed.' })
      onSuccess?.()
    } catch {
      setStatus({ ok: false, msg: 'Delete failed' })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Unified Audio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-1 truncate font-semibold">{item.title}</p>
        <p className="text-xs text-gray-400 mb-4">One continuous audio track for the whole mock test. When students switch between Parts, the audio keeps playing without interruption.</p>

        {item.test_audio_url ? (
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Music2 size={14} className="text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Unified audio is set</span>
            </div>
            <audio src={item.test_audio_url} controls className="w-full h-8 text-xs" />
            <button onClick={() => downloadAudioFile(item.test_audio_url, item.title)}
              className="mt-2 w-full py-1.5 text-xs text-purple-700 hover:bg-purple-100 rounded-lg transition font-medium flex items-center justify-center gap-1.5 border border-purple-200">
              <Download size={12} /> Save audio
            </button>
            <button onClick={handleDelete} disabled={loading}
              className="mt-1.5 w-full py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition font-medium flex items-center justify-center gap-1">
              <Trash2 size={11} /> Remove unified audio
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl mb-3 border border-gray-100">
            <VolumeX size={14} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500">No unified audio — parts use individual audio files</span>
          </div>
        )}

        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-300 rounded-xl text-sm text-purple-600 hover:bg-purple-50 transition font-medium">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Uploading...' : item.test_audio_url ? 'Replace audio' : 'Upload unified audio (MP3, WAV)'}
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

// ── Image Upload Modal ────────────────────────────────────────────────────────
function ImageUploadModal({ item, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const fileRef = useRef()

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true); setStatus(null)
    const form = new FormData()
    form.append('image', file)
    try {
      await api.post(`/admin/ielts/writing/${item.id}/image/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setStatus({ ok: true, msg: 'Rasm yuklandi!' })
      onSuccess?.()
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Yuklash muvaffaqiyatsiz' })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Task 1 Rasm Yuklash</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4 truncate">{item.title}</p>
        <button onClick={() => fileRef.current?.click()} disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-sky-300 rounded-xl text-sm text-sky-600 hover:bg-sky-50 transition font-medium">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {loading ? 'Yuklanmoqda...' : 'Rasm tanlash (JPG, PNG, SVG)'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
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

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ item, section, onClose, onSuccess }) {
  const [title, setTitle] = useState(item.title)
  const [difficulty, setDifficulty] = useState(item.difficulty || 'MEDIUM')
  const [isPremium, setIsPremium] = useState(item.is_premium || false)
  const [isStandalone, setIsStandalone] = useState(item.is_standalone !== false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  const endpoint = section === 'reading'
    ? `/admin/ielts/reading/${item.id}/update/`
    : `/admin/ielts/listening/${item.id}/update/`

  const handleSave = async () => {
    setLoading(true); setStatus(null)
    try {
      await api.patch(endpoint, { title, difficulty, is_premium: isPremium, is_standalone: isStandalone })
      setStatus({ ok: true, msg: 'Saved!' })
      setTimeout(() => { onSuccess?.(); onClose() }, 800)
    } catch (err) {
      setStatus({ ok: false, msg: err.response?.data?.error || 'Save failed' })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Edit</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-sky-400 transition" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Difficulty</label>
          <div className="flex gap-2">
            {['EASY', 'MEDIUM', 'HARD'].map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                  difficulty === d
                    ? d === 'EASY' ? 'bg-green-500 text-white border-green-500'
                      : d === 'MEDIUM' ? 'bg-slate-500 text-white border-slate-500'
                      : 'bg-red-500 text-white border-red-500'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>{d}</button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className={`w-10 h-5 rounded-full transition-colors ${isPremium ? 'bg-slate-500' : 'bg-gray-200'}`}
            onClick={() => setIsPremium(p => !p)}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isPremium ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-gray-700">Premium content</span>
        </label>
        {section === 'reading' && (
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-10 h-5 rounded-full transition-colors ${isStandalone ? 'bg-sky-500' : 'bg-gray-200'}`}
              onClick={() => setIsStandalone(p => !p)}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isStandalone ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <div>
              <span className="text-sm text-gray-700">Standalone (visible on user side)</span>
              <p className="text-[10px] text-gray-400">O'chirsangiz foydalanuvchi ko'rmaydi</p>
            </div>
          </label>
        )}
        {status && (
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${status.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {status.ok ? <Check size={15} /> : <AlertCircle size={15} />}
            {status.msg}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-60">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Single section/passage row ────────────────────────────────────────────────
function SectionRow({ item, index, section, config, colors, onEdit, onAudio, onImage, onDelete, onTogglePremium, indent }) {
  const metas = config.renderMeta(item)
  const [premiumLoading, setPremiumLoading] = useState(false)
  const handlePremium = async () => {
    if (!onTogglePremium) return
    setPremiumLoading(true)
    try { await onTogglePremium(item, !item.is_premium) } finally { setPremiumLoading(false) }
  }
  return (
    <div className={`flex items-center gap-4 px-5 py-4 hover:bg-sky-50/30 transition-colors ${indent ? 'pl-12 bg-gray-50/40' : ''}`}>
      <div className={`w-10 h-10 rounded-xl ${indent ? 'bg-indigo-50' : colors.icon} flex items-center justify-center flex-shrink-0 text-sm font-bold ${indent ? 'text-indigo-600' : colors.text}`}>
        {indent
          ? <span>P{item.section_number ?? item.passage_number ?? (index + 1)}</span>
          : config.numberField(item, index)
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-800 text-sm truncate">{item.title}</p>
          {item.is_premium && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 flex items-center gap-1">
              <Star size={9} fill="currentColor" /> Premium
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {metas.map((m, mi) => (
            <span key={mi} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              m === 'EASY' ? 'bg-green-100 text-green-700' :
              m === 'MEDIUM' ? 'bg-slate-100 text-slate-700' :
              m === 'HARD' ? 'bg-red-100 text-red-700' :
              colors.badge
            }`}>{m}</span>
          ))}
          {section === 'listening' && (
            item.audio_file
              ? <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full"><Music2 size={10} />Audio</span>
              : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><VolumeX size={10} />No audio</span>
          )}
          {section === 'writing' && item.task_type === 1 && (
            item.has_image
              ? <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full"><FileText size={10} />Rasm bor</span>
              : <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full"><FileText size={10} />Rasm yo'q</span>
          )}
        </div>
        {section === 'writing' && item.recommendations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.recommendations.slice(0, 5).map((w, wi) => (
              <span key={wi} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{w}</span>
            ))}
            {item.recommendations.length > 5 && <span className="text-[10px] text-gray-400">+{item.recommendations.length - 5}</span>}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {onTogglePremium && (config.premiumEndpoint || config.detailEndpoint) && !indent && (
          <button onClick={handlePremium} disabled={premiumLoading}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              item.is_premium
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50 border border-gray-200'
            }`}
            title={item.is_premium ? 'Remove premium' : 'Make premium'}>
            {premiumLoading ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} fill={item.is_premium ? 'currentColor' : 'none'} />}
            {item.is_premium ? 'Premium ✓' : 'Premium'}
          </button>
        )}
        {section === 'listening' && (
          <button onClick={() => onAudio(item)}
            className={`p-2 rounded-lg transition ${item.audio_file ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`}
            title="Audio yuklash"><Music2 size={15} /></button>
        )}
        {section === 'writing' && item.task_type === 1 && (
          <button onClick={() => onImage(item)}
            className={`p-2 rounded-lg transition ${item.has_image ? 'text-blue-500 hover:bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
            title="Rasm yuklash"><FileText size={15} /></button>
        )}
        {config.hasEdit && (
          <button onClick={() => onEdit(item)}
            className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition" title="Edit">
            <Edit3 size={15} />
          </button>
        )}
        <button onClick={() => onDelete(item.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ── Mock test group row (collapsible) ─────────────────────────────────────────
function MockGroupRow({ testId, testTitle, parts, testIsPremium, section, config, colors, onEdit, onAudio, onImage, onDelete, onTestAudio, onTestPremium }) {
  const [open, setOpen] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(false)
  const totalQ = parts.reduce((s, p) => s + (p.question_count ?? p.total_questions ?? 0), 0)
  const hasAllAudio = section === 'listening' ? parts.every(p => p.audio_file) : true
  const someAudio = section === 'listening' ? parts.some(p => p.audio_file) : false
  const testAudioUrl = parts[0]?.test_audio_url || null

  const handleTogglePremium = async (e) => {
    e.stopPropagation()
    setPremiumLoading(true)
    try { await onTestPremium(testId, !testIsPremium) } finally { setPremiumLoading(false) }
  }

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 px-5 py-4 hover:bg-indigo-50/30 transition-colors">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-4 flex-1 min-w-0 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Layers size={18} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-800 text-sm truncate">{testTitle}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                Mock Test
              </span>
              {testIsPremium && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold flex items-center gap-1">
                  <Star size={9} fill="currentColor" /> Premium
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{parts.length} section{parts.length !== 1 ? 's' : ''}</span>
              {totalQ > 0 && <span>{totalQ} questions</span>}
              {section === 'listening' && (
                testAudioUrl
                  ? <span className="flex items-center gap-1 text-purple-600 font-semibold"><Music2 size={10} />Unified audio</span>
                  : hasAllAudio
                    ? <span className="flex items-center gap-1 text-green-600"><Music2 size={10} />Per-part audio</span>
                    : someAudio
                      ? <span className="flex items-center gap-1 text-amber-500"><Music2 size={10} />Partial audio</span>
                      : <span className="flex items-center gap-1 text-gray-400"><VolumeX size={10} />No audio</span>
              )}
            </div>
          </div>
          <div className="text-gray-400 flex-shrink-0 mr-1">
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {/* Premium toggle for mock test */}
        <button
          onClick={handleTogglePremium}
          disabled={premiumLoading}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
            testIsPremium
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
          }`}
          title={testIsPremium ? 'Remove premium' : 'Set as premium'}
        >
          {premiumLoading ? <Loader2 size={12} className="animate-spin" /> : <Star size={12} fill={testIsPremium ? 'currentColor' : 'none'} />}
          {testIsPremium ? 'Premium ✓' : 'Premium'}
        </button>

        {/* Upload unified audio button for listening mock tests */}
        {section === 'listening' && (
          <button
            onClick={() => onTestAudio({ id: testId, title: testTitle, test_audio_url: testAudioUrl })}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
              testAudioUrl
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'
            }`}
            title={testAudioUrl ? 'Replace unified audio' : 'Upload unified audio (all parts)'}
          >
            <Music2 size={13} />
            {testAudioUrl ? 'Unified ✓' : 'Unified audio'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {parts.map((part, pi) => (
                <SectionRow
                  key={part.id}
                  item={part}
                  index={pi}
                  section={section}
                  config={config}
                  colors={colors}
                  onEdit={onEdit}
                  onAudio={onAudio}
                  onImage={onImage}
                  onDelete={onDelete}
                  indent
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── TAB 1: Content (Ro'yxat) ──────────────────────────────────────────────────
function ContentTab({ section, config, colors, items, isLoading, error,
  onEdit, onAudio, onImage, onDelete, onTestAudio, onTestPremium, onTogglePremium }) {
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState('ALL')

  let filtered = items
  if (search.trim()) filtered = filtered.filter(it =>
    it.title?.toLowerCase().includes(search.toLowerCase()) ||
    it.test_title?.toLowerCase().includes(search.toLowerCase())
  )
  if (config.hasDifficulty && diffFilter !== 'ALL') {
    filtered = filtered.filter(it => it.difficulty === diffFilter)
  }

  // Group items: mock sections → group by test_id, standalone → keep flat
  const { mockGroups, standalones } = (() => {
    const groups = {}
    const standalone = []
    for (const item of filtered) {
      if (item.test_id) {
        if (!groups[item.test_id]) groups[item.test_id] = { testId: item.test_id, testTitle: item.test_title || `Mock Test #${item.test_id}`, testIsPremium: item.test_is_premium || false, parts: [] }
        else if (item.test_is_premium !== undefined) groups[item.test_id].testIsPremium = item.test_is_premium
        groups[item.test_id].parts.push(item)
      } else {
        standalone.push(item)
      }
    }
    // Sort parts within each group by section_number / passage_number
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
        {config.hasDifficulty && (
          <div className="flex gap-0.5 bg-white rounded-xl p-1 border border-gray-100 shadow-sm">
            {['ALL', 'EASY', 'MEDIUM', 'HARD'].map(d => (
              <button key={d} onClick={() => setDiffFilter(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  diffFilter === d
                    ? d === 'EASY' ? 'bg-green-500 text-white'
                      : d === 'MEDIUM' ? 'bg-slate-500 text-white'
                      : d === 'HARD' ? 'bg-red-500 text-white'
                      : 'bg-sky-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {d === 'ALL' ? 'Hammasi' : d}
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
            <span className="text-sm">Failed to load. Server restart may be needed for new endpoints.</span>
          </div>
        ) : isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />)}
          </div>
        ) : isEmpty ? (
          <div className="p-16 text-center">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No {config.label} content found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Mock test groups */}
            {mockGroups.map(g => (
              <MockGroupRow
                key={`mock-${g.testId}`}
                testId={g.testId}
                testTitle={g.testTitle}
                testIsPremium={g.testIsPremium}
                parts={g.parts}
                section={section}
                config={config}
                colors={colors}
                onEdit={onEdit}
                onAudio={onAudio}
                onImage={onImage}
                onDelete={onDelete}
                onTestAudio={onTestAudio}
                onTestPremium={onTestPremium}
              />
            ))}
            {/* Standalone items */}
            {standalones.map((item, i) => (
              <SectionRow
                key={item.id}
                item={item}
                index={i}
                section={section}
                config={config}
                colors={colors}
                onEdit={onEdit}
                onAudio={onAudio}
                onImage={onImage}
                onDelete={onDelete}
                onTogglePremium={onTogglePremium}
                indent={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── TAB 2: Questions Analysis ─────────────────────────────────────────────────
function QuestionsTab({ section, config, items }) {
  const [selectedId, setSelectedId] = useState(null)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? items.filter(it => it.title?.toLowerCase().includes(search.toLowerCase()))
    : items

  const { data, isLoading } = useQuery({
    queryKey: ['ielts-qs-detail', section, selectedId],
    queryFn: () => api.get(config.detailEndpoint(selectedId)).then(r => r.data),
    enabled: !!selectedId && !!config.detailEndpoint,
    staleTime: 60_000,
  })

  const questions = data?.questions || []

  if (section === 'tests') {
    // Full tests — special view
    return (
      <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: 520 }}>
        {/* Left */}
        <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-sky-50 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-50">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs border border-transparent focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition" />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 px-1">{filtered.length} test</p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filtered.map((item, i) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)}
                className={`w-full text-left px-4 py-3 transition border-l-2 ${selectedId === item.id ? 'bg-sky-50 border-sky-500' : 'border-transparent hover:bg-gray-50'}`}>
                <p className={`text-sm font-medium leading-snug line-clamp-2 ${selectedId === item.id ? 'text-sky-700' : 'text-gray-800'}`}>{item.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {item.test_type && <span className="text-[10px] text-gray-400">{item.test_type}</span>}
                  {item.passage_count > 0 && <span className="text-[10px] text-blue-500">{item.passage_count} passages</span>}
                  {item.section_count > 0 && <span className="text-[10px] text-purple-500">{item.section_count} sections</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
        {/* Right */}
        <div className="flex-1 bg-white rounded-2xl border border-sky-50 shadow-sm overflow-hidden flex flex-col">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-300">
                <Eye size={48} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-400">Test tanlang</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-sky-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">{data?.title}</h3>
                <p className="text-xs text-gray-400 mt-1">Type: {data?.test_type}</p>
              </div>
              {data?.passages?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reading Passages</p>
                  <div className="space-y-1">
                    {data.passages.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-blue-50/60 rounded-xl">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">{p.passage_number}</span>
                        <span className="text-sm font-medium text-gray-700 flex-1">{p.title}</span>
                        <span className="text-xs text-gray-400">{p.question_count} Q</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {data?.sections?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Listening Sections</p>
                  <div className="space-y-1">
                    {data.sections.map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 bg-purple-50/60 rounded-xl">
                        <span className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-600">{s.section_number}</span>
                        <span className="text-sm font-medium text-gray-700 flex-1">{s.title}</span>
                        <span className="text-xs text-gray-400">{s.question_count} Q</span>
                        {s.audio_file
                          ? <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Audio</span>
                          : <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">No audio</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Reading / Listening — question analysis
  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 260px)', minHeight: 520 }}>
      {/* Left */}
      <div className="w-72 flex-shrink-0 bg-white rounded-2xl border border-sky-50 shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-50">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Qidirish..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 rounded-xl text-xs border border-transparent focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition" />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 px-1">{filtered.length} ta content</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filtered.map((item, i) => (
            <button key={item.id} onClick={() => setSelectedId(item.id)}
              className={`w-full text-left px-4 py-3 transition border-l-2 ${selectedId === item.id ? 'bg-sky-50 border-sky-500' : 'border-transparent hover:bg-gray-50'}`}>
              <p className={`text-sm font-medium leading-snug line-clamp-2 ${selectedId === item.id ? 'text-sky-700' : 'text-gray-800'}`}>{item.title}</p>
              <div className="flex items-center gap-2 mt-1">
                {item.difficulty && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    item.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                    item.difficulty === 'HARD' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>{item.difficulty}</span>
                )}
                <span className="text-[10px] text-gray-400 ml-auto">{item.question_count ?? 0} Q</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 bg-white rounded-2xl border border-sky-50 shadow-sm overflow-hidden flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Eye size={48} className="mx-auto mb-3 text-gray-200" />
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
              <h3 className="font-bold text-gray-900">{data?.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {data?.difficulty && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    data.difficulty === 'EASY' ? 'bg-green-100 text-green-700' :
                    data.difficulty === 'HARD' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                  }`}>{data.difficulty}</span>
                )}
                <span className="text-xs text-gray-400">{questions.length} savol</span>
                {data?.time_limit && <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={10} />{data.time_limit} min</span>}
              </div>
            </div>

            {/* QT breakdown */}
            {questions.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-full mb-1">Savol turlari</span>
                {[...new Set(questions.map(q => q.question_type))].map(qt => (
                  <div key={qt} className="flex items-center gap-1">
                    <QtBadge qt={qt} />
                    <span className="text-xs text-gray-500">{questions.filter(q => q.question_type === qt).length}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Passage */}
            {data?.content && (
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider select-none flex items-center gap-1.5 hover:text-gray-700 transition">
                  <span>Passage Text</span><span className="text-gray-300">▼</span>
                </summary>
                <div className="mt-2 bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{data.content}</p>
                </div>
              </details>
            )}

            {/* Transcript */}
            {data?.transcript && (
              <details>
                <summary className="cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider select-none flex items-center gap-1.5 hover:text-gray-700 transition">
                  <span>Transcript</span><span className="text-gray-300">▼</span>
                </summary>
                <div className="mt-2 bg-purple-50/60 rounded-xl p-4">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{data.transcript}</p>
                </div>
              </details>
            )}

            {data?.audio_file && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 rounded-xl border border-green-100">
                <Music2 size={14} className="text-green-600" />
                <span className="text-xs text-green-700 flex-1">Audio fayl yuklangan</span>
                <a href={data.audio_file} target="_blank" rel="noreferrer"
                  className="text-xs text-green-600 font-medium hover:underline">Play</a>
              </div>
            )}

            {/* Questions */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Savollar ({questions.length})</p>
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
                          <span className="text-xs text-gray-400">Answer:</span>
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
      </div>
    </div>
  )
}

// ── TAB 3: Import ─────────────────────────────────────────────────────────────
function ImportTab({ config, onSuccess }) {
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
      const res = await api.post(config.importEndpoint, parsed)
      const extra = res.data.part_count ? `${res.data.part_count} parts` : res.data.section_count ? `${res.data.section_count} sections` : ''
      setStatus({ ok: true, msg: `Imported successfully! ${extra}` })
      setJson('')
      onSuccess?.()
    } catch (err) {
      const msg = err instanceof SyntaxError
        ? 'Invalid JSON format — check for syntax errors'
        : err.response?.data?.error || err.response?.data?.detail || 'Import failed'
      setStatus({ ok: false, msg })
    } finally { setLoading(false) }
  }

  if (config.noImport) {
    return (
      <div className="bg-white rounded-2xl border border-sky-50 shadow-sm p-8 text-center">
        <Zap size={40} className="text-gray-200 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-500">Full Tests are created automatically</p>
        <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
          Import Reading with a "parts" array, or Listening with a "sections" array.
          The system automatically creates an IELTSTest container that links all passages/sections.
        </p>
        <div className="mt-6 bg-gray-950 rounded-xl p-4 text-left max-w-lg mx-auto">
          <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre">{config.exampleJson}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-5">
      {/* Left: example */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Format Guide</p>
        <div className="bg-gray-950 rounded-2xl p-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <pre className="text-[10px] text-green-400 font-mono leading-relaxed whitespace-pre">{config.exampleJson}</pre>
        </div>
      </div>
      {/* Right: input */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Paste or Upload JSON</p>
        <textarea value={json} onChange={e => setJson(e.target.value)}
          placeholder="Paste your JSON here... (// comments are allowed)"
          className="flex-1 min-h-[260px] w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition resize-none" />
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
          Import
        </button>
      </div>
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────
function getTabsForSection(section) {
  const hasQuestions = ['reading', 'listening', 'tests'].includes(section)
  const tabs = [{ key: 'content', label: "Ro'yxat", icon: FileText }]
  if (hasQuestions) tabs.push({ key: 'questions', label: 'Savollar tahlili', icon: BookOpen })
  tabs.push({ key: 'import', label: 'Import JSON', icon: FileJson })
  return tabs
}

// ── Delete All Confirm Modal ───────────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminIELTSSection({ section }) {
  const config = SECTION_CONFIG[section]
  const colors = COLOR_CLASSES[config.color]
  const Icon = config.icon
  const TABS = getTabsForSection(section)

  const [activeTab, setActiveTab] = useState('content')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [audioItem, setAudioItem] = useState(null)
  const [testAudioItem, setTestAudioItem] = useState(null)
  const [imageItem, setImageItem] = useState(null)
  const queryClient = useQueryClient()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-ielts', section] })

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-ielts', section],
    queryFn: () => api.get(config.endpoint).then(r => r.data),
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(
      section === 'tests' ? `/admin/ielts/tests/${id}/` : `${config.endpoint}${id}/`
    ),
    onSuccess: () => { invalidate(); setDeleteId(null) },
  })

  const handleTestPremium = async (testId, isPremium) => {
    await api.patch(`/admin/ielts/tests/${testId}/premium/`, { is_premium: isPremium })
    invalidate()
  }

  const handleTogglePremium = async (item, isPremium) => {
    const ep = config.premiumEndpoint || config.detailEndpoint
    if (!ep) return
    await api.patch(ep(item.id), { is_premium: isPremium })
    invalidate()
  }

  const deleteAllEndpoint = section === 'reading'
    ? '/admin/ielts/reading/all/'
    : section === 'listening'
      ? '/admin/ielts/listening/all/'
      : null

  const [deleteAllError, setDeleteAllError] = useState(null)
  const deleteAllMutation = useMutation({
    mutationFn: () => api.delete(deleteAllEndpoint),
    onSuccess: () => { invalidate(); setDeleteAllOpen(false); setDeleteAllError(null) },
    onError: (err) => setDeleteAllError(err.response?.data?.detail || err.response?.status || err.message || 'Xatolik'),
  })

  const items = Array.isArray(data) ? data : data?.results ?? []

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
            <h2 className="text-lg font-bold text-gray-900">IELTS {config.label}</h2>
            <p className="text-xs text-gray-400">{items.length} items in database</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Delete All button — only for reading & listening */}
          {deleteAllEndpoint && items.length > 0 && (
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
              section={section} config={config} colors={colors}
              items={items} isLoading={isLoading} error={error}
              onEdit={setEditItem} onAudio={setAudioItem} onImage={setImageItem} onDelete={setDeleteId}
              onTestAudio={setTestAudioItem} onTestPremium={handleTestPremium} onTogglePremium={handleTogglePremium}
            />
          )}
          {activeTab === 'questions' && (
            <QuestionsTab section={section} config={config} items={items} />
          )}
          {activeTab === 'import' && (
            <ImportTab config={config} onSuccess={() => { invalidate(); setActiveTab('content') }} />
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
            section={`IELTS ${config.label}`}
            count={items.length}
            onConfirm={() => deleteAllMutation.mutate()}
            onCancel={() => { setDeleteAllOpen(false); setDeleteAllError(null) }}
            loading={deleteAllMutation.isPending}
            error={deleteAllError}
          />
        )}
        {editItem && (
          <EditModal item={editItem} section={section} onClose={() => setEditItem(null)} onSuccess={invalidate} />
        )}
        {audioItem && (
          <AudioUploadModal item={audioItem} onClose={() => setAudioItem(null)} onSuccess={() => { invalidate(); setAudioItem(null) }} />
        )}
        {testAudioItem && (
          <TestAudioUploadModal item={testAudioItem} onClose={() => setTestAudioItem(null)} onSuccess={() => { invalidate(); setTestAudioItem(null) }} />
        )}
        {imageItem && (
          <ImageUploadModal item={imageItem} onClose={() => setImageItem(null)} onSuccess={() => { invalidate(); setImageItem(null) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

