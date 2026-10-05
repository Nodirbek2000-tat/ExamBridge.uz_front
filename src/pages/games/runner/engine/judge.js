/*
 * TOBY RUN — verdicts (RUNNER_PLAN §B3.7), built on games/voice/speechMatch.
 *
 *   judge(item, alts, { level, final }) → { v: 'ok' | 'close' | 'miss' | 'hold' | 'none', heard, words, score, wrong }
 *     'hold'  a live guess names another choice — it counts once it has lasted WRONG_HOLD (the director times it)
 *     'none'  nothing usable was heard (yet)
 *   tipFor(target, heard) → an Uzbek pronunciation tip for common Uzbek-speaker patterns, or null
 *
 * | kind            | ok                                  | close                                   | miss            |
 * | word / chunk    | every word ok (text or any say_also)| every word ok or close (sound-alike)    | otherwise       |
 * | choice          | target heard (said last)            | —                                       | another option  |
 * | echo / twister  | matchSentence perfect (≥ 0.9)       | good (≥ 0.8; A1–A2 ≥ 0.7)               | almost / wrong  |
 * | answer          | a keyword group + ≥ min_words words | group but short, or ≥ min_words + 2 words without one | otherwise |
 * | fill            | the chunk, or the whole text ≥ 0.8  | —                                       | otherwise       |
 */
import { bestMatch, matchSentence, normalizeWords, wordMatch } from '../../../../games/voice/speechMatch.js'

const RANK = { ok: 3, close: 2, miss: 1, none: 0 }
const better = (a, b) => (!a || RANK[b.v] > RANK[a.v] || (RANK[b.v] === RANK[a.v] && (b.score || 0) > (a.score || 0)) ? b : a)
// "T-shirt" / "t shirt" / "ice-cream": recognisers write hyphens either way
const dehyphen = (s) => String(s || '').replace(/(\w)-(\w)/g, '$1 $2')
const clean = (alts) => (alts || []).map(a => dehyphen(a).trim()).filter(Boolean)

/* one word / chunk against one target: every word ok → ok, every word ok/close → close */
function wordVerdict(target, alts) {
  const r = bestMatch(dehyphen(target), alts)
  const st = r.words.map(w => w.status)
  const v = st.length && st.every(s => s === 'ok') ? 'ok' : st.length && st.every(s => s !== 'miss') ? 'close' : 'miss'
  return { v, heard: r.heard, words: r.words, score: r.score }
}

export function judgeWord(item, alts) {
  alts = clean(alts)
  if (!alts.length) return { v: 'none', heard: '', words: null, score: 0 }
  let best = null
  const targets = [item.text, ...(item.say_also || [])].filter(Boolean)
  for (let i = 0; i < targets.length; i++) {
    const r = wordVerdict(targets[i], alts)
    // the colours always describe the main word
    if (i > 0) r.words = best?.words
    best = better(best, r)
  }
  if (best.v === 'ok' || best.v === 'close') return best
  return { ...wordVerdict(item.text, alts), v: 'miss' }
}

/* where an option was said in a transcript: the index of its last word, or −1 */
function lastIndexOf(option, heard) {
  const h = normalizeWords(heard)
  const t = normalizeWords(option)
  if (!t.length) return -1
  for (let j = h.length - t.length; j >= 0; j--) {
    let all = true
    for (let k = 0; k < t.length; k++) if (wordMatch(t[k], h[j + k]) === 0) { all = false; break }
    if (all) return j + t.length - 1
  }
  return -1
}

/* choice: the option said last counts (a learner may correct themselves: "bike… no, bus") */
export function judgeChoice(item, alts, { final = false } = {}) {
  alts = clean(alts)
  if (!alts.length) return { v: 'none', heard: '' }
  const heard = alts[0]
  let bestTarget = -1
  let bestOther = -1
  let other = null
  for (const alt of alts.slice(0, 3)) {
    for (const opt of item.choices || []) {
      const at = lastIndexOf(opt, alt)
      if (at < 0) continue
      if (opt === item.text) bestTarget = Math.max(bestTarget, at)
      else if (alt === heard && at > bestOther) { bestOther = at; other = opt }
    }
    if (bestTarget >= 0) break
  }
  if (bestTarget >= 0 && bestTarget >= bestOther) return { v: 'ok', heard, words: [{ text: item.text, status: 'ok' }], score: 1 }
  if (other) return { v: final ? 'miss' : 'hold', heard, wrong: other, words: [{ text: item.text, status: 'miss' }], score: 0 }
  return { v: final ? 'miss' : 'none', heard, words: [{ text: item.text, status: 'miss' }], score: 0 }
}

export function judgeEcho(item, alts, { level = 'A1', passAt } = {}) {
  alts = clean(alts)
  if (!alts.length) return { v: 'none', heard: '', words: null, score: 0 }
  const pa = passAt ?? (level === 'A1' || level === 'A2' ? 0.7 : 0.8)
  const r = bestMatch(item.text, alts, { passAt: pa })
  const v = r.verdict === 'perfect' ? 'ok' : r.verdict === 'good' ? 'close' : 'miss'
  return { v, heard: r.heard, words: r.words, score: r.score }
}

export function judgeAnswer(item, alts) {
  alts = clean(alts)
  if (!alts.length) return { v: 'none', heard: '', score: 0 }
  const groups = (item.accept || []).map(g => (Array.isArray(g) ? g : [g]).flatMap(normalizeWords)).filter(g => g.length)
  const min = item.min_words || 0
  let best = null
  for (const alt of alts) {
    const words = normalizeWords(alt)
    const hit = groups.some(g => g.every(k => words.some(w => wordMatch(k, w) === 2)))
    const n = words.length
    const v = hit && n >= min ? 'ok' : (hit || n >= min + 2) ? 'close' : 'miss'
    best = better(best, { v, heard: alt, score: v === 'ok' ? 1 : v === 'close' ? 0.6 : 0 })
  }
  return best
}

export function judgeFill(item, alts) {
  alts = clean(alts)
  if (!alts.length) return { v: 'none', heard: '', score: 0 }
  const chunks = [item.answer, ...(item.accept || []).filter(a => typeof a === 'string')].filter(Boolean)
  for (const c of chunks) {
    const r = wordVerdict(c, alts)
    if (r.v === 'ok') return { v: 'ok', heard: r.heard, words: r.words, score: 1 }
  }
  const whole = bestMatch(item.text, alts)
  if (whole.score >= 0.8) return { v: 'ok', heard: whole.heard, words: whole.words, score: whole.score }
  return { v: 'miss', heard: whole.heard, words: wordVerdict(item.answer || item.text, alts).words, score: whole.score }
}

/* the dispatcher the director uses (interim results: final = false) */
export function judge(item, alts, { level = 'A1', final = false, as } = {}) {
  const kind = as || (item.pt === 'choice' ? 'choice' : item.kind === 'word' ? 'word' : item.kind)
  if (kind === 'choice') return judgeChoice(item, alts, { final })
  if (kind === 'echo') return judgeEcho(item, alts, { level })
  if (kind === 'twister') return judgeEcho(item, alts, { level, passAt: 0.8 })
  if (kind === 'answer') return judgeAnswer(item, alts)
  if (kind === 'fill') return judgeFill(item, alts)
  return judgeWord(item, alts)
}

/* ── tips for common Uzbek-speaker patterns (§B4.4) ────────────────────── */

export const TIPS = {
  wv: '“v” — pastki lab tishga tegadi, “w” — lablar dumaloq: very, west.',
  th: '“th” — til uchi tishlar orasida: think, this, three.',
  final: 'So‘z oxiridagi tovushni yumshatmang: bag — “g”, bed — “d”.',
  ed: 'O‘tgan zamon “-ed” qo‘shimchasini aniq ayting: played, wanted.',
  article: 'Kichik so‘zlarni ham ayting: a, an, the.',
}

const DEVOICE = { b: 'p', d: 't', g: 'k', v: 'f', z: 's' }

export function tipFor(target, heard) {
  const t = normalizeWords(target)
  const h = normalizeWords(heard)
  if (!t.length || !h.length) return null
  const hs = new Set(h)
  for (const tw of t) {
    if (hs.has(tw)) continue
    const last = tw[tw.length - 1]
    for (const hw of h) {
      if (hw !== tw && hw.replace(/w/g, 'v') === tw.replace(/w/g, 'v')) return { key: 'wv', text: TIPS.wv }
      if (tw.includes('th') && ['t', 's', 'z', 'd', 'f'].some(r => tw.replace(/th/g, r) === hw)) return { key: 'th', text: TIPS.th }
      if (DEVOICE[last] && hw === tw.slice(0, -1) + DEVOICE[last]) return { key: 'final', text: TIPS.final }
      if (tw.length > 4 && tw.endsWith('ed') && (hw === tw.slice(0, -2) || hw === tw.slice(0, -1))) return { key: 'ed', text: TIPS.ed }
    }
  }
  const articles = ['a', 'an', 'the']
  const missing = t.filter(w => articles.includes(w) && !hs.has(w)).length
  if (missing && t.length >= 4 && matchSentence(t.filter(w => !articles.includes(w)).join(' '), heard).score >= 0.8) return { key: 'article', text: TIPS.article }
  return null
}
