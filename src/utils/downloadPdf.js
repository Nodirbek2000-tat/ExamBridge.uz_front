// ── Text-based PDF Generator (selectable text, no image rendering) ─────────────
// Uses jsPDF directly — no html2canvas, so text is fully selectable in the PDF

import logoAsset from '../assets/logo.jpg'

async function getLogoBase64() {
  try {
    const res  = await fetch(logoAsset)
    const blob = await res.blob()
    const b64 = await new Promise(resolve => {
      const r = new FileReader()
      r.onloadend = () => resolve(r.result)
      r.readAsDataURL(blob)
    })
    // Get natural dimensions for correct aspect ratio
    const ratio = await new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth / img.naturalHeight)
      img.onerror = () => resolve(1)
      img.src = b64
    })
    return { b64, ratio }
  } catch {
    return null
  }
}

// ── Layout helpers ─────────────────────────────────────────────────────────────
function sanitizePdfText(raw) {
  if (raw == null) return ''
  let s = String(raw)
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  s = s.replace(/\u0000/g, '')
  return s
}

function txt(doc, text, x, y, opts = {}) {
  const { size = 10, bold = false, color = [17, 17, 17], maxW = 170 } = opts
  const str = sanitizePdfText(text)
  doc.setFontSize(size)
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(str, maxW)
  const lineStep = size * 0.3528 * 1.5
  let yy = y
  for (let i = 0; i < lines.length; i++) {
    yy = checkPage(doc, yy, lineStep + 2)
    doc.text(String(lines[i]), x, yy)
    yy += lineStep
  }
  return yy + 2
}

function checkPage(doc, y, needed = 15) {
  if (y + needed > 277) {
    doc.addPage()
    return 20
  }
  return y
}

function hLine(doc, y, margin = 20) {
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.line(margin, y, 210 - margin, y)
  return y + 5
}

function sectionTitle(doc, label, y, layout = {}) {
  const x = layout.x ?? 20
  const w = layout.w ?? 170
  y = checkPage(doc, y, 14)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(x, y - 4, w, 10, 1, 1, 'F')
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.2)
  doc.rect(x, y - 4, w, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(80, 80, 80)
  let display = sanitizePdfText(label).toUpperCase()
  if (display.length > 95) display = `${display.slice(0, 92)}...`
  doc.text(display, x + 4, y + 2)
  return y + 12
}

/**
 * Bir xil jsPDF.text() massiv xatosi va & orasida harf ko‘rinishini oldini olish uchun
 * har bir qatorni alohida chizamiz (faqat oddiy qator qatori).
 */
function writeParagraph(doc, raw, x, y, maxW, opts = {}) {
  const {
    size = 9.5,
    bold = false,
    fontStyle = null,
    color = [40, 40, 40],
    lineHeightFactor = 1.45,
  } = opts
  const str = sanitizePdfText(raw)
  if (!str.trim()) return y + 2

  doc.setFontSize(size)
  const style =
    fontStyle || (bold ? 'bold' : 'normal')
  doc.setFont('helvetica', style)
  doc.setTextColor(...color)

  const lines = doc.splitTextToSize(str, maxW)
  const lineStep = size * 0.3528 * lineHeightFactor
  let yy = y
  for (let i = 0; i < lines.length; i++) {
    yy = checkPage(doc, yy, lineStep + 2)
    doc.text(String(lines[i]), x, yy)
    yy += lineStep
  }
  return yy + 2
}

// ── Writing Practice PDF ───────────────────────────────────────────────────────
export async function downloadWritingPdf({ task, text, wordCount, ownTitle }) {
  const [{ jsPDF }, logoB64] = await Promise.all([
    import('jspdf'),
    getLogoBase64(),
  ])

  const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = 210
  const margin = 20
  let y = 20

  // ── Logo only (centered, proportional — matn yozilmaydi) ──
  if (logoB64) {
    const h = 20
    const w = h * logoB64.ratio
    doc.addImage(logoB64.b64, 'JPEG', (pageW - w) / 2, y, w, h, '', 'FAST')
    y += h + 8
  } else {
    const size = 52
    doc.setFillColor(30, 30, 30)
    doc.roundedRect((pageW - size) / 2, y, size, size, 5, 5, 'F')
    doc.setFontSize(26)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('E', pageW / 2, y + size * 0.62, { align: 'center' })
    y += size + 8
  }

  // ── Header line ──
  doc.setDrawColor(30, 30, 30)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  // ── Meta row ──
  const title     = task ? task.title : (ownTitle || 'Custom Writing Practice')
  const taskLabel = task ? `Task ${task.task_type}` : 'Writing Practice'
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Task: ${taskLabel}`, margin, y)
  doc.text(`Words: ${wordCount}`, pageW - margin, y, { align: 'right' })
  y += 5
  y = txt(doc, title, margin, y, { size: 9, bold: true, maxW: 170, color: [30, 30, 30] })
  y += 6

  // ── Task Prompt ──
  y = sectionTitle(doc, 'Task Prompt', y)
  const prompt = task?.prompt || ownTitle || '—'
  y = txt(doc, prompt, margin, y, { size: 10, maxW: 170, color: [40, 40, 40] })
  y += 8

  // ── Your Writing ──
  y = checkPage(doc, y, 20)
  y = sectionTitle(doc, `Your Writing  (${wordCount} words)`, y)
  y = txt(doc, text || '(blank)', margin, y, { size: 10.5, maxW: 170, color: [17, 17, 17] })
  y += 10

  // ── Footer ──
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(180, 180, 180)
    doc.text('exambridge.uz', pageW / 2, 290, { align: 'center' })
    doc.text(`${i} / ${totalPages}`, pageW - margin, 290, { align: 'right' })
  }

  const safe = title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  doc.save(`${safe}.pdf`)
}

// ── Writing Analysis PDF ───────────────────────────────────────────────────────
// Tartib: 1) o‘qituvchi yozgan asl matn 2) task prompt 3) umumiy ball 4) mezonlar bo‘yicha feedback
// Matn: doc.text() ga massiv bermaslik — har qatorni alohida (jsPDF 4 va &/buzilish xatolarini oldini olish)
export async function downloadAnalysisPdf({ task, text, wordCount, result, ownTitle }) {
  const [{ jsPDF }, logoB64] = await Promise.all([
    import('jspdf'),
    getLogoBase64(),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const mL = 14
  const mR = 14
  const maxW = pageW - mL - mR
  let y = 16

  const criteriaKeys = ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']
  const shortLabels = ['Task', 'Cohesion', 'Lexical', 'Grammar']
  const titleLabel = task?.title || ownTitle || 'Writing Practice'

  // ── Logo only (kattaroq, markazda; "ExamBridge" matni PDFda chiqarilmaydi) ──
  if (logoB64) {
    const h = 22
    const w = h * logoB64.ratio
    doc.addImage(logoB64.b64, 'JPEG', (pageW - w) / 2, y, w, h, '', 'FAST')
    y += h + 10
  } else {
    const size = 56
    doc.setFillColor(234, 88, 12)
    doc.roundedRect((pageW - size) / 2, y, size, size, 5, 5, 'F')
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('E', pageW / 2, y + size * 0.62, { align: 'center' })
    y += size + 10
  }

  doc.setDrawColor(251, 146, 60)
  doc.setLineWidth(0.4)
  doc.line(mL, y, pageW - mR, y)
  y += 8

  y = writeParagraph(doc, titleLabel, mL, y, maxW, {
    size: 9,
    bold: true,
    color: [55, 55, 55],
    lineHeightFactor: 1.4,
  })
  y = writeParagraph(doc, `${wordCount} words`, mL, y, maxW, {
    size: 8.5,
    color: [110, 110, 110],
    lineHeightFactor: 1.35,
  })
  y += 4

  // ── 1) YOUR WRITING FIRST (student essay) ──
  y = checkPage(doc, y, 24)
  y = sectionTitle(doc, `Your writing (${wordCount} words)`, y, { x: mL, w: maxW })
  y = writeParagraph(doc, text || '—', mL, y, maxW, {
    size: 10,
    color: [20, 20, 20],
    lineHeightFactor: 1.5,
  })
  y += 6

  // ── 2) Task prompt ──
  y = checkPage(doc, y, 20)
  y = sectionTitle(doc, 'Task prompt', y, { x: mL, w: maxW })
  const promptText = task?.prompt || ownTitle || '—'
  y = writeParagraph(doc, promptText, mL, y, maxW, { size: 9.5, color: [55, 55, 55] })
  y += 6

  // ── 3) Overall band (compact) ──
  y = checkPage(doc, y, 28)
  y = sectionTitle(doc, 'Overall result', y, { x: mL, w: maxW })
  const overall = result?.overall_band ?? '—'
  const bColor = overall >= 7 ? [22, 163, 74] : overall >= 5 ? [194, 65, 12] : [153, 27, 27]
  doc.setFontSize(28)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...bColor)
  doc.text(String(overall), mL, y)
  y += 10
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(40, 40, 40)
  doc.text('Overall band score (out of 9.0)', mL, y)
  y += 6
  const scoreParts = criteriaKeys
    .map((k, i) => {
      const b = result?.[k]?.band
      return b != null && b !== '' ? `${shortLabels[i]} ${b}` : null
    })
    .filter(Boolean)
  y = writeParagraph(doc, scoreParts.join('   |   '), mL, y, maxW, {
    size: 8.5,
    color: [75, 75, 75],
    lineHeightFactor: 1.4,
  })
  y += 4
  y = hLine(doc, y, mL)

  // ── 4) Criteria: feedback, strengths, issues (line-by-line only) ──
  for (let i = 0; i < criteriaKeys.length; i++) {
    const k = criteriaKeys[i]
    const cr = result?.[k]
    if (!cr) continue

    y = checkPage(doc, y, 36)
    y = sectionTitle(doc, cr.label || k, y, { x: mL, w: maxW })
    y = writeParagraph(doc, `Band ${cr.band} / 9`, mL, y, maxW, {
      size: 9,
      bold: true,
      color: [194, 65, 12],
      lineHeightFactor: 1.3,
    })

    y = writeParagraph(doc, cr.feedback, mL, y, maxW, { size: 9.5, color: [35, 35, 35] })

    if (cr.strengths?.length) {
      y = checkPage(doc, y, 8)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(21, 128, 61)
      doc.text('Strengths', mL, y)
      y += 4
      for (const s of cr.strengths) {
        const line = `- ${sanitizePdfText(s)}`
        y = writeParagraph(doc, line, mL + 2, y, maxW - 2, { size: 8.5, color: [30, 80, 45] })
      }
      y += 2
    }

    if (cr.errors?.length) {
      y = checkPage(doc, y, 8)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(180, 83, 9)
      doc.text('Issues and suggestions', mL, y)
      y += 4
      for (const e of cr.errors.slice(0, 8)) {
        y = checkPage(doc, y, 20)
        if (e.quote) {
          y = writeParagraph(doc, `"${sanitizePdfText(e.quote)}"`, mL + 2, y, maxW - 4, {
            size: 8,
            color: [75, 75, 75],
            fontStyle: 'italic',
          })
        }
        if (e.issue) {
          y = writeParagraph(doc, `Issue: ${sanitizePdfText(e.issue)}`, mL + 2, y, maxW - 4, {
            size: 8.5,
            bold: true,
            color: [153, 27, 27],
          })
        }
        if (e.suggestion) {
          y = writeParagraph(doc, `Suggestion: ${sanitizePdfText(e.suggestion)}`, mL + 2, y, maxW - 4, {
            size: 8.5,
            color: [21, 101, 52],
          })
        }
        y += 2
      }
    }
    y += 4
  }

  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text('exambridge.uz', pageW / 2, 292, { align: 'center' })
    doc.text(`Page ${i} of ${totalPages}`, pageW - mR, 292, { align: 'right' })
  }

  const safe = titleLabel.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  doc.save(`${safe}-analysis.pdf`)
}
