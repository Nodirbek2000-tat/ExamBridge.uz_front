/**
 * Import JSON examples — one source for the admin panel and the center
 * Tests page, so a center imports exactly the format ExamBridge's admins use.
 */

export const IELTS_EXAMPLES = {
  reading: `// ═══════════════════════════════════════════════════════
// IELTS READING — BARCHA 17 SAVOL TURLARINING TO'LIQ QOLLANMASI
// ═══════════════════════════════════════════════════════
//
// OPTION 1: Bitta mashq (passage)
// OPTION 2: To'liq mock test (3 ta part)
// OPTION 3: MHEAD — sarlavhani matn ichidagi [[N]] katakka sudrash (pastda, ESLATMALAR oldida)
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
  // is_cambridge: true = Cambridge material (o'quvchida "Cambridge" filtrida chiqadi)
  "is_cambridge": false,
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
  // is_cambridge: true = Cambridge material (o'quvchida "Cambridge" filtrida chiqadi)
  "is_cambridge": false,
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
// ── OPTION 3: MHEAD — sarlavhani matn ichidagi katakka sudrash ──
// O'ng tomonda "List of Headings" turadi, o'quvchi sarlavhani passage ichidagi
// raqamli katakka sudrab (telefonda: bosib, keyin katakni bosib) qo'yadi.
//
// QOIDALAR:
//   1) content ichida katak turadigan joyga ALOHIDA QATORDA [[N]] yozing
//      (N = savol number). Odatda har paragrafdan oldin: "...\\n\\n[[14]]\\nParagraph text..."
//   2) Har [[N]] uchun bitta "question_type": "MHEAD" savol, "correct_answer" = sarlavha harfi
//   3) "choices" (sarlavhalar ro'yxati) va "group_instruction" — faqat BIRINCHI MHEAD savolda
//      yetarli, qolganlari undan oladi (hammasiga yozsangiz ham bo'ladi)
//   4) Sarlavhalar soni katakdan ko'p bo'lishi mumkin (ortiqcha variantlar)
//   5) Import tekshiradi: [[N]] bor-u savol yo'q (yoki aksincha) bo'lsa — xato qaytaradi
//   6) FULL MOCK: xuddi shu narsa "parts" ichidagi har bir part'ning
//      "content" va "questions" ida yoziladi (masalan Part 2: [[14]]...[[19]])
{
  "title": "Solving the problem of waste disposal",
  "content": "Solving the problem of waste disposal\\nHow a new generation of incineration plants may help\\n\\n[[14]]\\nFor many years, burning rubbish has been portrayed as the lazy option...\\n\\n[[15]]\\nThose who support burning waste say that a new generation of incinerators...",
  "passage_number": 2,
  "is_standalone": true,
  "difficulty": "MEDIUM",
  "is_premium": false,
  "is_cambridge": false,
  "questions": [
    {
      "number": 14,
      "question_type": "MHEAD",
      "correct_answer": "D",
      "answer_review": "Norway isn't alone: Germany, Sweden, Belgium and the Netherlands all burn significant quantities of rubbish",
      "group_instruction": "Questions 14–15\\nChoose the correct heading for each paragraph from the list of headings below.\\n**List of Headings**",
      "choices": [
        {"option": "A", "text": "New terminology reflecting changing attitudes to waste disposal"},
        {"option": "B", "text": "Fundamental changes in behaviour in the past and future"},
        {"option": "C", "text": "Ways of rewarding the public for recycling"},
        {"option": "D", "text": "A surprising approach to waste disposal by several countries"},
        {"option": "E", "text": "Difficult choices for individuals and businesses"},
        {"option": "F", "text": "Arguments against incineration from a country that uses it"},
        {"option": "G", "text": "A number of justifications for the use of incineration"}
      ]
    },
    {
      "number": 15,
      "question_type": "MHEAD",
      "correct_answer": "G",
      "answer_review": "a new generation of incinerators"
    }
  ]
}

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
// MHEAD          | sarlavhani matnga sudrash ★  | HA (birinchi savolda) + content'da [[N]]
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
  listening: `// ═══════════════════════════════════════════════════════
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
  // is_cambridge: true = Cambridge material (o'quvchida "Cambridge" filtrida chiqadi)
  "is_cambridge": false,
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
  // is_cambridge: true = Cambridge material (o'quvchida "Cambridge" filtrida chiqadi)
  "is_cambridge": false,
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
  speaking: `// Part 1 (general questions)
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
  writing: `// Task 1 (chart/graph — rasm yuklanadi import dan keyin)
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
}

export const CEFR_EXAMPLES = {
  reading: `// ═══════════════════════════════════════════════════════
// CEFR MULTILEVEL READING — IMPORT QO'LLANMASI (Part 1–5)
// ═══════════════════════════════════════════════════════
//
// TUZILISHI (35 savol, 60 daqiqa):
//   Part 1 | 1–6   | PGAP       | matn ichida bo'sh joy, 1 so'z
//   Part 2 | 7–14  | TMATCH     | 8 qisqa matn ↔ A–J gaplar (2 ortiqcha)
//   Part 3 | 15–20 | TMATCH     | 6 paragraf ↔ A–H sarlavhalar (2 ortiqcha)
//   Part 4 | 21–29 | MCQ + TFNG | chapda matn, o'ngda savollar
//   Part 5 | 30–35 | NOTE + MCQ | summary bo'shliqlari + MCQ
//
// IKKI XIL IMPORT:
//   A) Bitta part  → "passage": {...}  +  "questions": [...]
//   B) To'liq mock → "parts": [ {part1}, {part2}, ... ]  (1–5 tagacha)
//
// UMUMIY QOIDALAR:
//   • "type": "reading" — shart
//   • "level": A1 | A2 | B1 | B2 | C1 | C2
//   • "passage_number": 1–5 — SHART: qaysi part ekanini bildiradi.
//     O'quvchi ro'yxatida test shu raqam bo'yicha "Part 1…5" filtriga tushadi.
//     "parts" ichida 1 ta part bo'lsa ham u "Full Mock" emas, o'sha Part bo'lib chiqadi;
//     2+ part = Full Mock. Raqam 1–5 dan tashqari yoki takrorlansa — import xato beradi.
//     (bitta partli "parts" da raqamni tepada "passage_number" bilan ham yozish mumkin)
//   • content ichida paragraflar bo'sh qator bilan: "...\\n\\n..."
//   • **qalin** matn: group_instruction va summary'da ishlaydi
//   • answer_review — matndan AYNAN ko'chirilgan jumla (review'da
//     sariq bo'lib belgilanadi). Tavsiya etiladi.
//   • Matnli javoblarda muqobil: "light-brown|light brown"
//     Katta-kichik harf va ortiqcha bo'sh joy hisobga olinmaydi.
//   • group_instruction faqat guruhning 1-savoliga yoziladi —
//     keyingi savollar (bo'sh qoldirilsa) o'sha guruhga qo'shiladi.
//
// IMPORT TEKSHIRUVI (xato bo'lsa HECH NARSA saqlanmaydi):
//   ✗ PGAP: [N] belgisi va savol soni mos emas
//   ✗ TMATCH: options yo'q / content bo'sh / javob harfi options'da yo'q
//   ✗ MCQ: javob harfi choices ichida yo'q
//   ✗ TFNG: javob TRUE / FALSE / NOT GIVEN dan boshqa
//   ✗ YNNG: javob YES / NO / NOT GIVEN dan boshqa
//   ✗ NOTE: summary matnida [N] belgisi yo'q
//   → Xato xabari qaysi part va nechanchi savol ekanini aytadi.
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// PART 1 — MATN ICHIDA BO'SH JOYLAR  (PGAP, savollar 1–6)
// ═══════════════════════════════════════════════════════
// • Bo'sh joylar passage.content ICHIDA: [1], [2] ... [6]
// • Savolda "content" YO'Q — faqat number + correct_answer
// • Javob — bitta so'z (matnning boshqa joyida uchraydi)
// • Har [N] ga bitta savol, har savolga bitta [N] — SHART
{
  "type": "reading",
  "level": "B2",
  "title": "Reading Practice — Part 1",
  "time_limit": 10,
  "passage": {
    "title": "Sea turtles",
    "passage_number": 1,
    "content": "Sea turtles are amazing animals. Sea [1] have lived in our oceans for millions of years. However, today, these [2] face many dangers. One of these [3] comes from non-natural light. ... following the natural [4] of the Moon and stars ... much brighter than the [5]. These lights can confuse [6] sea turtles ..."
  },
  "questions": [
    { "number": 1, "question_type": "PGAP", "correct_answer": "turtles",
      "answer_review": "the baby turtles can get lost",
      "group_instruction": "Read the text. Fill in each gap with **ONE** word. You must use a word which is somewhere in the rest of the text." },
    { "number": 2, "question_type": "PGAP", "correct_answer": "turtles|animals" },
    { "number": 3, "question_type": "PGAP", "correct_answer": "dangers" },
    { "number": 4, "question_type": "PGAP", "correct_answer": "light" },
    { "number": 5, "question_type": "PGAP", "correct_answer": "Moon" },
    { "number": 6, "question_type": "PGAP", "correct_answer": "baby" }
  ]
}


// ═══════════════════════════════════════════════════════
// PART 2 — MATNNI GAPGA MOSLASH  (TMATCH, savollar 7–14)
// ═══════════════════════════════════════════════════════
// • "options" BIR MARTA yoziladi (A–J) → har savolga o'zi biriktiriladi
//   (bitta part: yuqori darajada; mock'da: part ichida)
// • Har savol: "content" = qisqa matn, "correct_answer" = harf
// • UI: tepada variantlar, pastda matn + tanlash ro'yxati;
//   boshqa savolda tanlangan variant "Q7" deb xira ko'rinadi
{
  "type": "reading",
  "level": "B2",
  "title": "Reading Practice — Part 2",
  "time_limit": 15,
  "passage": { "title": "Hotels around the world", "passage_number": 2, "content": "" },
  "options": [
    { "option": "A", "text": "You want to do different leisure activities with your family." },
    { "option": "B", "text": "You need a rural escape for a romantic retreat." },
    { "option": "C", "text": "You want a holiday watching the waves." },
    { "option": "D", "text": "You need a hotel in a city center during your business trip." },
    { "option": "E", "text": "..." }, { "option": "F", "text": "..." },
    { "option": "G", "text": "..." }, { "option": "H", "text": "..." },
    { "option": "I", "text": "..." }, { "option": "J", "text": "..." }
  ],
  "questions": [
    { "number": 7, "question_type": "TMATCH", "correct_answer": "D",
      "group_instruction": "Read the texts 7-14 and statements A-J. Decide which situation matches each text. Each statement can be used **ONCE** only. There are **TWO** extra statements which you do not need to use.",
      "content": "Nestled in the heart of bustling London, The Mayfair Hotel ... Perfect for business travelers.",
      "answer_review": "Perfect for business travelers" },
    { "number": 8, "question_type": "TMATCH", "correct_answer": "C",
      "content": "Escape to the sun-drenched shores of the Mediterranean ..." }
  ]
}


// ═══════════════════════════════════════════════════════
// PART 3 — PARAGRAFGA SARLAVHA  (TMATCH, savollar 15–20)
// ═══════════════════════════════════════════════════════
// • Part 2 bilan BIR XIL format — faqat matnlar uzunroq,
//   options = sarlavhalar (A–H, 2 tasi ortiqcha)
{
  "type": "reading",
  "level": "B2",
  "title": "Reading Practice — Part 3",
  "time_limit": 15,
  "passage": { "title": "Why we dream", "passage_number": 3, "content": "" },
  "options": [
    { "option": "A", "text": "A process that protects the brain" },
    { "option": "B", "text": "Dreams as a rehearsal for danger" },
    { "option": "C", "text": "Remembering dreams more easily" },
    { "option": "D", "text": "..." }, { "option": "E", "text": "..." },
    { "option": "F", "text": "..." }, { "option": "G", "text": "..." },
    { "option": "H", "text": "..." }
  ],
  "questions": [
    { "number": 15, "question_type": "TMATCH", "correct_answer": "A",
      "group_instruction": "Read the text. Choose the correct heading for each paragraph from the list of headings A-H. There are **TWO** extra headings which you do not need to use.",
      "content": "Another important job of sleep is cleaning. While we rest, the brain's drainage system removes waste products ..." }
  ]
}


// ═══════════════════════════════════════════════════════
// PART 4 — MCQ + TRUE/FALSE/NOT GIVEN  (savollar 21–29)
// ═══════════════════════════════════════════════════════
// • Ekran: chapda matn (content), o'ngda savollar
// • MCQ: "choices" A–D, correct_answer = harf
// • TFNG: choices KERAK EMAS — tugmalar o'zi chiqadi
//   (muallif fikri so'ralsa YNNG: YES / NO / NOT GIVEN)
{
  "type": "reading",
  "level": "B2",
  "title": "Reading Practice — Part 4",
  "time_limit": 20,
  "passage": {
    "title": "Deadly humid heatwaves",
    "passage_number": 4,
    "content": "Life-threatening periods of high heat and humidity will spread rapidly ...\\n\\nNormally, the human body cools itself by producing sweat ...\\n\\n..."
  },
  "questions": [
    { "number": 21, "question_type": "MCQ",
      "group_instruction": "For questions 21-24, choose the correct answer **A, B, C or D**.",
      "content": "What is the main concern highlighted in the study regarding global temperatures?",
      "choices": [
        { "option": "A", "text": "High temperatures will remain stable, with little impact on human health." },
        { "option": "B", "text": "Long seasons of hot and damp weather will spread quickly, causing more deaths." },
        { "option": "C", "text": "The increase in global temperatures will have no effect on the climate crisis." },
        { "option": "D", "text": "The number of deaths will decrease with a rise in temperatures." }
      ],
      "correct_answer": "B",
      "answer_review": "Life-threatening periods of high heat and humidity will spread rapidly across the world" },
    { "number": 25, "question_type": "TFNG",
      "group_instruction": "For questions 25-29, decide if the following statements agree with the information given.\\n\\n**TRUE** if the statement agrees with the information\\n**FALSE** if the statement contradicts the information\\n**NOT GIVEN** if there is no information on this",
      "content": "The research found that extreme heat stress has been experienced equally across all regions of the world since 1970.",
      "correct_answer": "FALSE",
      "answer_review": "these have been confined to date to hot places" },
    { "number": 26, "question_type": "TFNG",
      "content": "Germany would undergo unprecedented heat stress conditions.",
      "correct_answer": "TRUE" }
  ]
}


// ═══════════════════════════════════════════════════════
// PART 5 — SUMMARY + MCQ  (savollar 30–35)
// ═══════════════════════════════════════════════════════
// • Summary matni 30-savolning group_instruction'ida:
//   yo'riqnoma → bo'sh qator → matn ichida [30] [31] [32] [33]
// • NOTE savollarida "content" YO'Q — faqat javob
//   (31–33 da group_instruction yozilmaydi — o'zi qo'shiladi)
// • Keyin MCQ 34–35 — o'z group_instruction'i bilan
{
  "type": "reading",
  "level": "B2",
  "title": "Reading Practice — Part 5",
  "time_limit": 20,
  "passage": {
    "title": "The History of Cod Liver Oil",
    "passage_number": 5,
    "content": "Cod liver oil is a type of fish oil ...\\n\\nLudovicus Josephus de Jongh ...\\n\\n..."
  },
  "questions": [
    { "number": 30, "question_type": "NOTE", "correct_answer": "northern",
      "group_instruction": "For questions 30-33, fill in the missing information in the numbered spaces.\\nWrite no more than **ONE WORD** for each question.\\n\\nCod liver oil was traditionally used by [30] Europeans long before ... Ludovicus de Jongh concluded that the [31] oil was the healthiest ... Every bottle featured de Jongh's [32] and an official seal ... it was commonly mixed with [33], though ...",
      "answer_review": "northern European fishing communities used cod liver for centuries" },
    { "number": 31, "question_type": "NOTE", "correct_answer": "light-brown|light brown" },
    { "number": 32, "question_type": "NOTE", "correct_answer": "signature" },
    { "number": 33, "question_type": "NOTE", "correct_answer": "coffee" },
    { "number": 34, "question_type": "MCQ",
      "group_instruction": "For questions 34-35, choose the correct answer **A, B, C or D**.",
      "content": "What was a key factor in the success of Scott and Bowne's cod liver oil product?",
      "choices": [
        { "option": "A", "text": "They successfully promoted the product through advertising." },
        { "option": "B", "text": "Leading physicians publicly supported the product." },
        { "option": "C", "text": "Their product was more affordable than others on the market." },
        { "option": "D", "text": "They were the pioneers in selling cod liver oil in Asian markets." }
      ],
      "correct_answer": "A" }
  ]
}


// ═══════════════════════════════════════════════════════
// TO'LIQ MOCK — 5 PART BITTA JSON'DA
// ═══════════════════════════════════════════════════════
// • "passage" o'rniga "parts" massivi
// • Har part: passage_number, title, content, questions
//   (+ Part 2/3 da "options")
// • Savol raqamlari mock bo'yicha davom etadi: 1–6, 7–14, 15–20, 21–29, 30–35
// • Bitta part xato bo'lsa — butun mock import bo'lmaydi
{
  "type": "reading",
  "level": "B2",
  "title": "Reading Mock Test 1",
  "time_limit": 60,
  "is_premium": false,
  "parts": [
    { "passage_number": 1, "title": "Sea turtles", "content": "... [1] ... [6] ...",
      "questions": [ { "number": 1, "question_type": "PGAP", "correct_answer": "turtles" } ] },
    { "passage_number": 2, "title": "Hotels", "content": "",
      "options": [ { "option": "A", "text": "..." } ],
      "questions": [ { "number": 7, "question_type": "TMATCH", "content": "...", "correct_answer": "D" } ] },
    { "passage_number": 3, "title": "Why we dream", "content": "",
      "options": [ { "option": "A", "text": "..." } ],
      "questions": [ { "number": 15, "question_type": "TMATCH", "content": "...", "correct_answer": "A" } ] },
    { "passage_number": 4, "title": "Deadly humid heatwaves", "content": "...",
      "questions": [ { "number": 21, "question_type": "MCQ", "...": "..." } ] },
    { "passage_number": 5, "title": "The History of Cod Liver Oil", "content": "...",
      "questions": [ { "number": 30, "question_type": "NOTE", "...": "..." } ] }
  ]
}


// ═══════════════════════════════════════════════════════
// QO'SHIMCHA (eski IELTS-uslub turlar ham import bo'ladi)
// ═══════════════════════════════════════════════════════
// MULTI  — bir nechta javob: "A|C", + "max_selections": 2
// SUMM   — summary + "word_bank": ["...", "..."] (so'z banki bilan)
// GAP / SENT / SHORT / TABLE / FLOW — matnli javob
// MATCH / MINFO / MFEAT / MEND — choices bilan moslash
// ⚠ Bu turlar Part 4–5 da bo'lsa, o'sha part eski ko'rinishda chiqadi.
//   Multilevel format uchun yuqoridagi 5 part shablonidan foydalaning.
// ═══════════════════════════════════════════════════════`,
  listening: `// ═══════════════════════════════════════════════════════
// CEFR MULTILEVEL LISTENING — IMPORT (6 part)
// ═══════════════════════════════════════════════════════
//   Part 1 | 1–8   | MCQ    | savol matni YO'Q — faqat A/B/C javoblar
//   Part 2 | 9–14  | NOTE   | forma: "Start date: [9]" — bo'sh joyga yozish
//   Part 3 | 15–18 | TMATCH | tepada A–F ro'yxat, pastda Speaker 1..4 tanlash
//   Part 4 | 19–23 | TMATCH | xarita: rasm chapda, joy nomi + A–G tanlash
//   Part 5 | 24–29 | MCQ    | savol matni + A/B/C (radio qatorlar)
//   Part 6 | 30–35 | NOTE va/yoki MCQ — faqat gap filling YOKI aralash
//
// • Bitta part: "section": {...} + "questions": [...]
// • To'liq mock: "sections": [ {part 1}, ..., {part 6} ] — bitta test bo'lib tushadi
// • "section_number": 1–6 — SHART: qaysi part ekanini bildiradi. O'quvchi
//   ro'yxatida shu raqam bo'yicha "Part 1…6" filtriga tushadi. "sections" ichida
//   1 ta part bo'lsa ham u "Full Mock" emas, o'sha Part bo'lib chiqadi;
//   2+ part = Full Mock. 1–6 dan tashqari yoki takror raqam — import xato beradi.
// • Audio 2 xil:
//   1) Har partga alohida — part qatoridagi ♪ tugmasi (yoki part "audio_url")
//   2) Butun test uchun BITTA audio — mock qatoridagi "Bitta audio" tugmasi
//      (yoki mock JSON'ning yuqorisida "audio_url"). Bor bo'lsa u o'ynaydi,
//      partlar o'rtasida uzilmaydi; audio tugashi bilan test yakunlanadi.
// • transcript (Review'da chapda chiqadi): har gap yangi qatordan ("\\n"),
//   "EXAMINER:", "SPEAKER 1:", "Woman:" kabi nomlar avtomatik QALIN bo'ladi
// • Matnli javobda muqobil: "5:30|5.30" (harf/bo'sh joy farqi yo'q)
// • group_instruction faqat 1-savolda — qolganlari o'zi qo'shiladi
// • TEKSHIRUV: MCQ/TMATCH javob harfi variantlarda bo'lishi,
//   NOTE uchun [N] matnda bo'lishi SHART — aks holda 400, hech narsa saqlanmaydi

// ── PART 1 — faqat variantlar (MCQ, "content" yo'q) ─────
{
  "type": "listening", "level": "B2", "title": "Listening — Part 1", "time_limit": 10,
  "section": { "title": "Test 1 - Part 1", "section_number": 1, "audio_url": "", "transcript": "1. Who is that woman over there? ..." },
  "questions": [
    { "number": 1, "question_type": "MCQ", "correct_answer": "B",
      "group_instruction": "You will hear some sentences. You will hear each sentence twice. Choose the best reply to each sentence **(A, B or C)**.",
      "choices": [
        { "option": "A", "text": "What is his name?" },
        { "option": "B", "text": "I believe my aunt." },
        { "option": "C", "text": "Do I know her?" }
      ] },
    { "number": 2, "question_type": "MCQ", "correct_answer": "A",
      "choices": [ { "option": "A", "text": "..." }, { "option": "B", "text": "..." }, { "option": "C", "text": "..." } ] }
  ]
}

// ── PART 2 — forma to'ldirish (NOTE) ─────────────────────
// Forma 9-savolning group_instruction'ida: yo'riqnoma → bo'sh qator →
// har qator alohida ("\\n"), bo'sh joy = [N]. Savolda "content" yo'q.
{
  "type": "listening", "level": "B2", "title": "Listening — Part 2", "time_limit": 10,
  "section": { "title": "Test 1 - Part 2", "section_number": 2, "audio_url": "" },
  "questions": [
    { "number": 9, "question_type": "NOTE", "correct_answer": "15 September|15th September",
      "group_instruction": "You will hear someone giving a talk. For each question, fill in the missing information in the numbered space.\\nWrite **ONE WORD** and / or **A NUMBER** for each answer.\\n\\nStart date: [9]\\nDay the club will meet: [10]\\nTime: from 4:20 to [11]\\nTeacher's name: Mr [12]\\nTeacher's phone number: [13]\\nPlace: [14]" },
    { "number": 10, "question_type": "NOTE", "correct_answer": "Wednesday" },
    { "number": 11, "question_type": "NOTE", "correct_answer": "5:30|5.30" }
  ]
}

// ── PART 3 — gapiruvchini variantga moslash (TMATCH) ────
// "options" BIR MARTA yoziladi → har Speaker'ga o'zi biriktiriladi.
// "content" = "Speaker 1" (qisqa bo'lsa tanlash tugmasi yonida turadi)
{
  "type": "listening", "level": "B2", "title": "Listening — Part 3", "time_limit": 10,
  "section": { "title": "Test 1 - Part 3", "section_number": 3, "audio_url": "" },
  "options": [
    { "option": "A", "text": "They lied about something." },
    { "option": "B", "text": "They were injured." },
    { "option": "C", "text": "They were made redundant at work." },
    { "option": "D", "text": "They were issued a warning." },
    { "option": "E", "text": "They were doing a number of different things." },
    { "option": "F", "text": "It affected their career choice." }
  ],
  "questions": [
    { "number": 15, "question_type": "TMATCH", "content": "Speaker 1", "correct_answer": "A",
      "group_instruction": "You will hear people talking about their first employment experiences.\\nFor questions 15-18, choose from the list **(A-F)** what each person says about it. Use the letters only once." },
    { "number": 16, "question_type": "TMATCH", "content": "Speaker 2", "correct_answer": "B" }
  ]
}


// ── PART 4 — xarita (TMATCH, variantlar faqat harf) ─────
// • "options": ["A","B",...,"G"] — matnsiz harflar yetarli
// • "content" = joy nomi ("Car park 3")
// • RASM: import'dan keyin admin ro'yxatida Part 4 qatori yonidagi
//   🖼 tugmasi → PNG/JPG/WEBP (5 MB gacha). Yashil = rasm bor.
{
  "type": "listening", "level": "B2", "title": "Listening — Part 4", "time_limit": 10,
  "section": { "title": "Test 1 - Part 4", "section_number": 4, "audio_url": "" },
  "options": ["A", "B", "C", "D", "E", "F", "G"],
  "questions": [
    { "number": 19, "question_type": "TMATCH", "content": "Car park 3", "correct_answer": "B",
      "group_instruction": "You will hear someone giving a talk. Label the places (19-23) on the map **(A-G)**.
There are **TWO** extra options which you do not need to use." },
    { "number": 20, "question_type": "TMATCH", "content": "Changing room", "correct_answer": "D" }
  ]
}

// ── PART 5 — 3 ta parcha, har biriga 2 savol (MCQ) ──────
{
  "type": "listening", "level": "B2", "title": "Listening — Part 5", "time_limit": 10,
  "section": { "title": "Test 1 - Part 5", "section_number": 5, "audio_url": "" },
  "questions": [
    { "number": 24, "question_type": "MCQ", "correct_answer": "B",
      "group_instruction": "You will hear three different extracts. For questions 24-29, choose the answer **(A, B or C)** which fits best according to what you hear. There are two questions for each extract.",
      "content": "Extract One: What is Colin's opinion of their new boss?",
      "choices": [
        { "option": "A", "text": "She fails to consult with colleagues." },
        { "option": "B", "text": "She is too keen to establish new working practices." },
        { "option": "C", "text": "She has little understanding of the organisation's history." }
      ] }
  ]
}

// ── PART 6 — gap filling (NOTE), kerak bo'lsa + MCQ ─────
// Har gap alohida qator ("
"), bo'sh joy [N]. Aralash bo'lsa:
// avval NOTE savollar, keyin MCQ o'z group_instruction'i bilan —
// sahifada ikkita alohida "Questions" bloki bo'lib chiqadi.
{
  "type": "listening", "level": "B2", "title": "Listening — Part 6", "time_limit": 10,
  "section": { "title": "Test 1 - Part 6", "section_number": 6, "audio_url": "" },
  "questions": [
    { "number": 30, "question_type": "NOTE", "correct_answer": "signs",
      "group_instruction": "You will hear a part of a lecture. For each question, fill in the missing information in the numbered space.
Write no more than **ONE WORD** for each answer.

Brad says there are no [30] to warn extreme snowboarders of dangers.
Brad advises snowboarders always to follow the [31] when descending." },
    { "number": 31, "question_type": "NOTE", "correct_answer": "guide" },
    { "number": 33, "question_type": "MCQ", "correct_answer": "B",
      "group_instruction": "For questions 33-35, choose the correct answer **(A, B or C)**.",
      "content": "What does Brad say about beginners?",
      "choices": [ { "option": "A", "text": "..." }, { "option": "B", "text": "..." }, { "option": "C", "text": "..." } ] }
  ]
}


// ═══════════════════════════════════════════════════════
// ESKI (IELTS-uslub) QO'LLANMA — boshqa turlar uchun
// ═══════════════════════════════════════════════════════
// Audio file → import qilgandan so'ng admin panel orqali yuklanadi
//
// ── TRANSCRIPT FORMATTING (review sahifasida chiroyli ko'rinadi) ──
// transcript ichida "\\n" = yangi qator. Quyidagi belgilar ishlaydi:
//   # Sarlavha      → eng katta sarlavha
//   ## Sarlavha     → o'rta sarlavha
//   ### Sarlavha    → qalin mayda sarlavha
//   - matn  /  • matn  → ro'yxat (pastma-past)
//   **qalin**       → qalin
//   *kursiv*        → kursiv
//   [1], [2] ...    → javob joylari (sariq highlight + raqam)
// Misol: "## SHOPPING\\n\\n**Speaker:** Hello.\\n- Item: [1]\\n- Price: [2]"
// ═══════════════════════════════════════════════════════

// ── OPTION 1: Single Practice Section ───────────────────
{
  "type": "listening",
  "level": "B2",
  "title": "B2 Listening Practice — Job Interview",
  "time_limit": 20,
  "is_premium": false,
  "is_mock": false,
  "section": {
    "title": "Section 1 — A Job Interview",
    "section_number": 1,
    "transcript": "Full audio transcript. Use [1], [2] markers for answer positions.",
    "is_standalone": true
  },
  "questions": [

    // ── GAP / SHORT — oddiy matn input ─────────────────────
    {
      "number": 1,
      "question_type": "GAP",
      "content": "The applicant's surname is ___.",
      "correct_answer": "JOHNSON",
      "group_instruction": "Questions 1–3\\nComplete the notes. Write ONE WORD AND/OR A NUMBER."
    },

    // ── MCQ — radio tugmalar ────────────────────────────────
    {
      "number": 2,
      "question_type": "MCQ",
      "content": "Where did the applicant previously work?",
      "correct_answer": "A",
      "group_instruction": "Questions 2–3\\nChoose the correct letter A, B or C.",
      "choices": [
        {"option": "A", "text": "BrightAds"},
        {"option": "B", "text": "MediaStar"},
        {"option": "C", "text": "ClickPro"}
      ]
    },

    // ── MULTI — bir nechta tanlov ───────────────────────────
    {
      "number": 3,
      "question_type": "MULTI",
      "content": "Which TWO skills does the applicant mention?",
      "correct_answer": "B|D",
      "max_selections": 2,
      "group_instruction": "Questions 3–4\\nChoose TWO letters A–E.",
      "choices": [
        {"option": "A", "text": "Graphic design"},
        {"option": "B", "text": "Digital marketing"},
        {"option": "C", "text": "Accounting"},
        {"option": "D", "text": "Team management"},
        {"option": "E", "text": "Legal compliance"}
      ]
    },

    // ── TFNG — True / False / Not Given ────────────────────
    {
      "number": 4,
      "question_type": "TFNG",
      "content": "The company was founded more than 20 years ago.",
      "correct_answer": "TRUE",
      "group_instruction": "Questions 4–5\\nDo the following statements agree with what the speaker says?\\nWrite TRUE, FALSE or NOT GIVEN."
    },

    // ── YNNG — Yes / No / Not Given ────────────────────────
    {
      "number": 5,
      "question_type": "YNNG",
      "content": "The speaker believes remote work is always more productive.",
      "correct_answer": "NO",
      "group_instruction": "Questions 5–6\\nDo the following statements agree with the views of the speaker?\\nWrite YES, NO or NOT GIVEN."
    },

    // ── NOTE — matn ichida [N] inline inputs ───────────────
    // group_instruction ichida [N] = savol raqami
    // Bullet: •  yoki - bilan boshlanadi
    // Bold:   **Matn** (qalin harflar)
    // Barcha bir blokdagi savollarda group_instruction AYNAN BIR XIL bo'lishi kerak!
    {
      "number": 6,
      "question_type": "NOTE",
      "content": "",
      "correct_answer": "TUESDAY",
      "group_instruction": "Questions 6–8\\nComplete the notes below. Write ONE WORD AND/OR A NUMBER.\\n\\n**Conference Details**\\n• Date: [6]\\n• Duration: [7] days\\n• Venue: [8] Hall",
      "answer_review": "Transcript: 'The conference will take place on Tuesday...'"
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
    // word_bank: to'g'ri + chalg'ituvchi so'zlar
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

    // ── TABLE — jadval ichida [N] inputs ───────────────────
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

    // ── MFEAT — radio grid (har bir savol uchun ustun tanlov)
    // choices: ustun sarlavhalari; har bir savol = bitta qator
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
    },

    // ── MATCH — choices bo'lsa MCQ uslubi ──────────────────
    {
      "number": 16,
      "question_type": "MATCH",
      "content": "Section where salary is discussed.",
      "correct_answer": "iii",
      "group_instruction": "Question 16: Match each section.",
      "choices": [
        {"option": "i",   "text": "Introduction"},
        {"option": "ii",  "text": "Skills"},
        {"option": "iii", "text": "Salary"},
        {"option": "iv",  "text": "Questions"}
      ]
    },

    // ── SENT / FLOW / SHORT — matn input ──────────────────
    {
      "number": 17,
      "question_type": "SENT",
      "content": "The applicant worked at BrightAds for ___ years.",
      "correct_answer": "three",
      "group_instruction": "Question 17: Complete the sentence. ONE WORD OR NUMBER."
    }
  ]
}

// ── OPTION 2: Full Mock (multi-section) ─────────────────
{
  "type": "listening",
  "level": "B2",
  "title": "B2 Listening Full Mock 1",
  "time_limit": 90,
  "is_mock": true,
  "is_premium": true,
  "sections": [
    {
      "section_number": 1,
      "title": "Section 1 — A Job Interview",
      "transcript": "Full transcript of section 1...",
      "questions": [
        {"number": 1, "question_type": "GAP", "content": "Surname: ___.",
         "correct_answer": "JOHNSON",
         "group_instruction": "Questions 1–5\\nONE WORD ONLY."},
        {"number": 2, "question_type": "MCQ", "content": "What role is advertised?",
         "correct_answer": "C",
         "group_instruction": "Questions 2–3\\nChoose A, B or C.",
         "choices": [
           {"option":"A","text":"Sales Director"},
           {"option":"B","text":"HR Manager"},
           {"option":"C","text":"Marketing Manager"}
         ]}
      ]
    },
    {
      "section_number": 2,
      "title": "Section 2 — Campus Tour",
      "transcript": "Full transcript of section 2...",
      "questions": [
        {"number": 11, "question_type": "MFEAT",
         "content": "Explains the library opening hours.",
         "correct_answer": "A",
         "group_instruction": "Questions 11–13\\nWho says each thing?\\n**Speakers:**",
         "choices": [
           {"option":"A","text":"Tour guide"},
           {"option":"B","text":"Student"},
           {"option":"C","text":"Both"}
         ]}
      ]
    }
  ]
}

// ═══════════════════════════════════════════════════════
// ESLATMALAR
// ───────────────────────────────────────────────────────
// question_type | UI ko'rinishi
// ──────────────────────────────────────────────────────
// GAP / SHORT   | matn kiritish
// MCQ           | radio tugmalar (choices bilan)
// MULTI         | checkbox (correct_answer: "A|C", max_selections)
// TFNG          | True / False / Not Given tugmalar
// YNNG          | Yes / No / Not Given tugmalar
// NOTE          | group_instruction ichida [N] inline inputs
// SUMM          | NOTE + word_bank (pastda tugmalar)
// TABLE         | content ichida markdown jadval + [N] inputs
// MFEAT / MEND  | radio grid jadval (choices = ustun sarlavhalar)
// MATCH         | choices bo'lsa MCQ uslubida, yo'qsa matn input
// SENT          | matn kiritish
// FLOW          | flowchart ⬇ qutchalar (bitta group = bitta oqim)
//                 content ichida ___ → inline input, yo'qsa fon box
//
// MUHIM: bir blokdagi savollarda group_instruction AYNAN BIR XIL!
// MULTI → correct_answer: "A|C" (pipe bilan ajratiladi)
// word_bank → faqat SUMM da ishlatiladi
// group_list → group_instruction ostida A. text, B. text... ro'yxat
//   (MEND uchun endings ko'rsatish + choices faqat A,B,C harflar)
// answer_review → transcript dan aynan shu matn → review da sariq highlight
// ═══════════════════════════════════════════════════════`,
  writing: `{
  "title": "CEFR Writing Test 1",
  "is_premium": false,
  "situation": "You recently joined a sports club in your town. The club has sent its members a message asking what they think about its activities and timetable.",
  "task_1_1": "Write a letter to your friend who is also a member of the club. Tell your friend what you like about the club and what you would change. Write about 50 words.",
  "task_1_2": "Write a letter to the manager of the club. Say what you think about the activities and the timetable, and suggest how they could be improved. Write 120–150 words.",
  "part_2": "Some people believe that young people today spend too much time on their phones. To what extent do you agree or disagree? Give reasons and examples. Write 180–200 words."
}`,
  writing_parts: `[
  {
    "title": "Part 1 — New library",
    "situation": "A new library is opening in your neighbourhood...",
    "task_1_1": "Write to your friend ... Write about 50 words.",
    "task_1_2": "Write to the library manager ... Write 120–150 words."
  },
  {
    "title": "Part 1.2 — Trip proposals",
    "situation": "Your club is planning a trip and has asked members for ideas...",
    "task_1_2": "Write to the club leader ... Write 120–150 words."
  },
  {
    "title": "Part 2 — Online learning",
    "part_2": "Online lessons are better than lessons in a classroom. Do you agree? Write 180–200 words.",
    "time_limit": 35
  }
]`,
  speaking: `{
  "title": "CEFR Speaking Test 1",
  "is_premium": false,
  "part_1_1": [
    "Where do you live and what do you like about it?",
    "What do you usually do at the weekend?",
    "How often do you use public transport?"
  ],
  "part_1_2": [
    "Describe what you can see in the two pictures.",
    "Which of these two places would you prefer to study in? Why?",
    "Why do some people find it hard to study at home?"
  ],
  "part_2": {
    "prompt": "Describe a person who has had an important influence on your life.",
    "questions": ["Who is this person?", "How do you know them?", "Why have they influenced you so much?"]
  },
  "part_3": {
    "topic": "Social media does more harm than good.",
    "for": ["It wastes a lot of time", "It spreads false information", "It can make people feel lonely"],
    "against": ["It keeps families and friends connected", "It helps small businesses", "It gives quick access to news"]
  }
}`,
}
