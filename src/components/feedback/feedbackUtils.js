/*
 * Helpers for the AI feedback pages: band colours/labels and matching the
 * examiner's quotes against the student's own text.
 */
// ── band helpers ──────────────────────────────────────────────────────────────
export function bandTheme(band) {
  const b = Number(band) || 0
  if (b >= 8) return { hex: '#059669', soft: '#ecfdf5', text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (b >= 6.5) return { hex: '#0284c7', soft: '#f0f9ff', text: 'text-sky-700', chip: 'bg-sky-50 text-sky-700 border-sky-200' }
  if (b >= 5) return { hex: '#d97706', soft: '#fffbeb', text: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { hex: '#dc2626', soft: '#fef2f2', text: 'text-red-700', chip: 'bg-red-50 text-red-700 border-red-200' }
}
export function bandLabel(band) {
  const b = Number(band) || 0
  if (b >= 9) return 'Expert'
  if (b >= 8) return 'Very good'
  if (b >= 7) return 'Good'
  if (b >= 6) return 'Competent'
  if (b >= 5) return 'Modest'
  if (b >= 4) return 'Limited'
  if (b > 0) return 'Extremely limited'
  return 'Not assessed'
}
// Common IELTS → CEFR mapping
export function bandToCefr(band) {
  const b = Number(band) || 0
  if (b >= 8.5) return 'C2'
  if (b >= 7) return 'C1'
  if (b >= 5.5) return 'B2'
  if (b >= 4) return 'B1'
  if (b > 0) return 'A2'
  return '—'
}
// colour any 0–max score on the same scale as a band (4/5 looks like band 7.2)
export const scoreTheme = (value, max = 9) => bandTheme(((Number(value) || 0) / (max || 9)) * 9)

// ── CEFR multilevel 0–75 ─────────────────────────────────────────────────────
export const CEFR_BANDS = [
  { level: 'C1', from: 65, to: 75, name: 'Advanced' },
  { level: 'B2', from: 51, to: 64, name: 'Upper-intermediate' },
  { level: 'B1', from: 38, to: 50, name: 'Intermediate' },
  { level: 'BELOW', from: 0, to: 37, name: 'Below B1' },
]
export function cefrLevel(score) {
  const s = Number(score) || 0
  return (CEFR_BANDS.find(b => s >= b.from) || CEFR_BANDS[3]).level
}
export const cefrLevelLabel = (level) => (level === 'BELOW' ? 'Below B1' : level || '—')
export const cefrLevelName = (level) => CEFR_BANDS.find(b => b.level === level)?.name || ''
export function cefrTheme(level) {
  return bandTheme({ C1: 8, B2: 7, B1: 5.5 }[level] ?? 3)
}

export const txt = (v) => {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number') return v
  if (typeof v === 'object') return v.text ?? v.point ?? v.feedback ?? v.issue ?? ''
  return String(v)
}

// ── marks ───────────────────────────────────────────────────────────────────────
export const MARK = {
  error: { label: 'Error', cls: 'bg-red-100/80 text-red-900 decoration-red-500', dot: 'bg-red-500', ring: 'border-red-200 bg-red-50' },
  weak: { label: 'Could be better', cls: 'bg-amber-100/80 text-amber-900 decoration-amber-500', dot: 'bg-amber-500', ring: 'border-amber-200 bg-amber-50' },
  good: { label: 'Strong', cls: 'bg-emerald-100/70 text-emerald-900 decoration-emerald-500', dot: 'bg-emerald-500', ring: 'border-emerald-200 bg-emerald-50' },
}
const PRIORITY = { error: 3, weak: 2, good: 1 }
const norm = (w) => w.toLowerCase().replace(/[’‘`]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')

/*
 * Turn the AI result into marks for the student's text.
 * criteria: [{ key, label, kind }] — kind decides the colour of that criterion's errors.
 */
export function buildMarks(result, criteria) {
  const marks = []
  for (const c of criteria) {
    const errors = Array.isArray(result?.[c.key]?.errors) ? result[c.key].errors : []
    for (const e of errors) {
      const quote = String(txt(e?.quote) || '').trim()
      if (quote) marks.push({ quote, kind: c.kind, title: c.label, issue: txt(e.issue), fix: txt(e.suggestion) })
    }
  }
  for (const p of Array.isArray(result?.good_phrases) ? result.good_phrases : []) {
    const quote = typeof p === 'string' ? p.trim() : ''
    if (quote) marks.push({ quote, kind: 'good', title: 'Strong phrase', issue: 'Natural, precise language — this is what raises your band.' })
  }
  return marks
}

/*
 * Mark the quoted phrases inside a text. Matching ignores case and punctuation,
 * a quote with "..." is matched piece by piece, a long quote that is off by
 * one word at either end still matches, and an error wins over a weaker mark
 * on the same words.
 */
export function buildSegments(text, marks) {
  const tokens = String(text || '').split(/(\s+)/)
  const words = []                       // [tokenIndex, normalised]
  tokens.forEach((t, i) => { if (t && !/^\s+$/.test(t)) words.push([i, norm(t)]) })
  const owner = new Array(tokens.length).fill(-1)
  // stronger kind first; within a kind the shorter (more precise) quote first,
  // so a long sentence-level quote only fills the words left around it
  const qlen = (m) => String(m.quote || '').length
  const order = marks.map((m, i) => i)
    .sort((a, b) => (PRIORITY[marks[b].kind] - PRIORITY[marks[a].kind]) || (qlen(marks[a]) - qlen(marks[b])))

  const place = (q, mi) => {
    let partial = null
    for (let s = 0; s + q.length <= words.length; s++) {
      let ok = true
      for (let k = 0; k < q.length; k++) if (words[s + k][1] !== q[k]) { ok = false; break }
      if (!ok) continue
      const from = words[s][0], to = words[s + q.length - 1][0]
      const taken = owner.slice(from, to + 1).filter(o => o !== -1).length
      if (taken === 0) { for (let ti = from; ti <= to; ti++) owner[ti] = mi; return true }
      if (!partial && taken < to - from + 1) partial = [from, to]
    }
    if (!partial || marks[mi].kind === 'good') return false   // praise never wraps around a mistake
    for (let ti = partial[0]; ti <= partial[1]; ti++) if (owner[ti] === -1) owner[ti] = mi
    return true
  }
  for (const mi of order) {
    const pieces = String(marks[mi].quote || '').split(/\.\.\.|…/)
      .map(p => p.split(/\s+/).map(norm).filter(Boolean)).filter(p => p.length)
    for (const q of pieces) {
      if (place(q, mi)) continue
      if (q.length >= 4 && !place(q.slice(1), mi)) place(q.slice(0, -1), mi)
    }
  }
  const segs = []
  tokens.forEach((t, i) => {
    const last = segs[segs.length - 1]
    if (last && last.mark === owner[i]) last.text += t
    else segs.push({ text: t, mark: owner[i] })
  })
  return segs
}

export const paragraphs = (text) => String(text || '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)

// indexes of the marks that were found in at least one of the texts
export function matchedMarks(texts, marks) {
  const found = new Set()
  for (const t of texts) for (const p of paragraphs(t)) for (const s of buildSegments(p, marks)) if (s.mark >= 0) found.add(s.mark)
  return found
}
