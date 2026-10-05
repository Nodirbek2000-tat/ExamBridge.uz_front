/*
 * TOBY'S DAY — pure game rules (no React): how an attempt is judged, how many
 * stars / coins / XP it earns, when zones unlock, and how saved progress from
 * the server and from this device are combined.
 */
import { bestMatch, normalizeWords } from '../../../games/voice/speechMatch'
import { ZONES } from './content'
import { cleanDaily, emptyDaily, mergeDaily } from './missions'

/* ── what the recogniser heard → the spelling our lines use ─────────────── */
// Chrome writes some words its own way ("goodnight", "icecream", "pyjamas" in
// en-GB…). Bringing them to the line's spelling keeps the learner from being
// marked wrong for something they said correctly.
const HEARD_FIXES = [
  [/\bgood\s*-?\s*night\b/g, 'good night'],
  [/\bgood\s*-?\s*morning\b/g, 'good morning'],
  [/\bgood\s*-?\s*bye\b/g, 'goodbye'],
  [/\bice\s*-?\s*creams?\b/g, 'ice cream'],
  [/\bpyjamas\b/g, 'pajamas'],
  [/\bfoot\s*-?\s*ball\b/g, 'football'],
  [/\bhome\s*-?\s*work\b/g, 'homework'],
  [/\bt\.\s?v\.?/g, 'tv'],
  [/\btoby's\b/g, 'toby'],
  [/\bhead\s*-?\s*aches?\b/g, 'headache'],
  [/\b(stomach|tummy)\s*-?\s*aches?\b/g, 'stomachache'],
  [/\bthermometers?\b/g, 'thermometer'],
]
export function fixHeard(text) {
  return HEARD_FIXES.reduce((t, [re, to]) => t.replace(re, to), String(text || '').toLowerCase()).trim()
}

export const wordCount = (s) => String(s || '').split(/\s+/).filter(Boolean).length

// 4-word lines must be said completely (0.75 would let "I brush my …" pass without
// "teeth"); lines of 5+ words still forgive one word the recogniser lost.
export const PASS_AT = 0.8

/*
 * Listening time for one tap. The mic stays open (continuous) until the line is
 * heard — that ends it at once — so this is only the upper limit for a learner
 * who cannot get it right; a pause after speaking also ends it (PlayScreen).
 */
export function listenMs(step) {
  const n = step.choice ? Math.max(1, ...step.choice.map(o => wordCount(o.say))) : wordCount(step.say)
  return Math.min(15000, 9000 + 500 * n)
}

/* was the option's key word (apples, milk…) actually heard? */
function keywordHeard(result, keyword) {
  if (!keyword) return true
  const kw = normalizeWords(keyword)[0]
  if (!kw) return true
  const w = result.words.find(x => normalizeWords(x.text).includes(kw))
  return !!w && w.status !== 'miss'
}

const failed = (r) => ({ ...r, passed: false, verdict: r.score >= 0.5 ? 'almost' : 'wrong' })

/* "carrots" / "Carrots." → the same word (picture taps on listen / gap steps) */
export const sameWord = (a, b) => {
  const x = normalizeWords(a).join(' ')
  return !!x && x === normalizeWords(b).join(' ')
}

/* the word a listen / gap step cannot pass without (the picture's word) */
export const keyWordOf = (step) => (step.type === 'gap' ? step.gap : step.type === 'listen' ? step.answer : null)

/*
 * Judge one attempt. Normal step → bestMatch of its line.
 * Listen / gap step → the same, but the picture's word must be heard too
 * ("I add a little ball" is not "I add a little salt").
 * Choice / ask step → every option is tried; the best one that passed (and whose key
 * word was heard) wins; if none passed, the closest one is returned so its
 * words can be coloured.
 * → { result, option }  (option = null for steps without options)
 */
export function judge(step, alternatives) {
  const alts = alternatives.map(fixHeard).filter(Boolean)
  if (!step.choice) {
    const r = bestMatch(step.say, alts, { passAt: PASS_AT })
    const kw = keyWordOf(step)
    return { result: r.passed && kw && !keywordHeard(r, kw) ? failed(r) : r, option: null }
  }
  let best = null
  for (const o of step.choice) {
    const r = bestMatch(o.say, alts, { passAt: PASS_AT })
    const ok = r.passed && keywordHeard(r, o.keyword)
    const result = ok ? r : failed(r)
    if (!best || (ok && !best.ok) || (ok === best.ok && r.score > best.result.score)) best = { result, option: o, ok }
  }
  return { result: best.result, option: best.option }
}

/*
 * Listen / gap: did the learner say one of the WRONG pictures' words instead
 * ("… cold milk")? → that option, or null. Used for a clearer hint.
 */
export function wrongWordSaid(step, alternatives) {
  if (!step.options || !keyWordOf(step)) return null
  const heard = new Set(alternatives.map(fixHeard).flatMap(a => normalizeWords(a)))
  const right = normalizeWords(keyWordOf(step))
  for (const o of step.options) {
    const w = normalizeWords(o.word)
    if (!w.length || w.join() === right.join()) continue
    if (w.every(x => heard.has(x))) return o
  }
  return null
}

/*
 * May a try that passed on a PARTIAL result (the mic still open) end right now?
 * Lines of 5+ words pass with one word missing, so "I go to the kitchen for"
 * already passes — but the learner is still saying "breakfast". End early only
 * when the last word was heard too, or the line is (nearly) perfect; otherwise
 * keep listening — the final result (pause / time up / tap) is judged normally.
 */
export function earlyPass(result) {
  if (!result?.passed) return false
  if (result.score >= 0.9) return true
  const lastWord = result.words[result.words.length - 1]
  return !!lastWord && lastWord.status !== 'miss'
}

/* ── rewards ───────────────────────────────────────────────────────────── */
// first try: perfect 3 ★, good 2 ★ · passed after a failed try: 1 ★ · skipped: 0
export function starsFor(verdict, tries) {
  if (tries > 0) return 1
  return verdict === 'perfect' ? 3 : 2
}
export const COMBO_AT = 3
export function coinsFor(stars, combo) {
  return stars * 10 + (stars && combo >= COMBO_AT ? 5 : 0)
}
export const xpFor = (stars) => (stars ? stars * 10 + 5 : 0)

/* Speaking level from total XP: level n needs 100 + 40·(n−1) XP */
export function levelInfo(xp) {
  let level = 1
  let rest = Math.max(0, Math.floor(xp || 0))
  let need = 100
  while (rest >= need && level < 99) {
    rest -= need
    level += 1
    need = 100 + 40 * (level - 1)
  }
  return { level, into: rest, need, pct: rest / need }
}

/* ── zones ─────────────────────────────────────────────────────────────── */
export const maxStars = (zone) => (zone?.steps?.length || 0) * 3
export const unlockNeed = (zone) => Math.ceil(maxStars(zone) * 0.5)

/*
 * A zone opens when the zone before it has half of its stars. A zone that was
 * already played (or has stars) stays open for good — zones may be reordered or
 * new ones inserted before it, and nobody should lose a zone they had.
 */
export function zoneUnlocked(zones, index, progress) {
  if (index <= 0) return true
  const zone = zones[index]
  if (!zone) return false
  const own = progress?.zones?.[zone.key]
  if (own && (own.stars > 0 || own.plays > 0)) return true
  const prev = zones[index - 1]
  return (progress?.zones?.[prev.key]?.stars || 0) >= unlockNeed(prev)
}

/* 0–3 medal for a zone from its stars */
export function medal(stars, zone) {
  const max = maxStars(zone)
  const p = max ? (stars || 0) / max : 0
  return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.4 ? 1 : 0
}

/* what a passed / skipped step changes in the world (a choice also adds the picked item to world.basket) */
export function patchFor(step, world, option) {
  const after = step.after || {}
  if (step.choice) return option?.item ? { ...after, basket: [...(world.basket || []), option.item] } : after
  return after
}

/* ── saved progress ────────────────────────────────────────────────────── */
/*
 * data = {
 *   v, coins, xp, level,
 *   zones:    { [zoneKey]: { stars, best, plays } },
 *   wardrobe: { owned: [acc…], worn: acc | null, t? },   // t = Date.now() of the last change (newest wins on merge)
 *   room:     { said: { [commandKey]: count }, best },   // the play room (TobysDayGame / Room*)
 *   daily:    { d: 'YYYY-MM-DD', n: { [counter]: n }, got: [missionId…] },   // today's missions (missions.js)
 *   bonus:    stars won with missions,
 * }
 * Everything is validated and capped so the JSON stays far below the 20 KB limit.
 */
const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0)
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/
const token = (v) => (typeof v === 'string' && TOKEN.test(v) ? v : null)
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const MAX_ZONES = 40        // known zones + a few unknown ones (content from a newer / older version)
const MAX_OWNED = 32
const MAX_SAID = 64
const MAX_COUNT = 999999

export function emptyProgress() {
  return { v: 1, zones: {}, coins: 0, xp: 0, level: 1, wardrobe: { owned: [], worn: null }, room: { said: {}, best: 0 }, daily: emptyDaily(), bonus: 0 }
}

function cleanWardrobe(w) {
  const out = { owned: [], worn: null }
  if (!isObj(w)) return out
  if (Array.isArray(w.owned)) {
    for (const a of w.owned) {
      const t = token(a)
      if (t && !out.owned.includes(t) && out.owned.length < MAX_OWNED) out.owned.push(t)
    }
  }
  out.worn = token(w.worn)
  const t = num(w.t)
  if (t) out.t = t
  return out
}

function cleanRoom(r) {
  const out = { said: {}, best: 0 }
  if (!isObj(r)) return out
  if (isObj(r.said)) {
    let n = 0
    for (const [k, v] of Object.entries(r.said)) {
      const key = token(k)
      const count = Math.min(num(v), MAX_COUNT)
      if (!key || !count) continue
      if (n >= MAX_SAID) break
      out.said[key] = count
      n += 1
    }
  }
  out.best = Math.min(num(r.best), MAX_COUNT)
  return out
}

const cleanZone = (s, zone) => ({
  stars: zone ? Math.min(num(s.stars), maxStars(zone)) : Math.min(num(s.stars), 300),
  best: num(s.best),
  plays: num(s.plays),
})

/* anything (server JSON, old localStorage) → a clean progress object */
export function cleanProgress(raw) {
  const p = emptyProgress()
  if (!isObj(raw)) return p
  p.coins = num(raw.coins)
  p.xp = num(raw.xp)
  const zones = isObj(raw.zones) ? raw.zones : {}
  for (const z of ZONES) {
    const s = zones[z.key]
    if (isObj(s)) p.zones[z.key] = cleanZone(s, z)
  }
  // zones this version does not know (renamed / not deployed yet): kept, so a save never wipes them
  for (const [k, s] of Object.entries(zones)) {
    if (Object.keys(p.zones).length >= MAX_ZONES) break
    if (!p.zones[k] && token(k) && isObj(s)) p.zones[k] = cleanZone(s, null)
  }
  p.wardrobe = cleanWardrobe(raw.wardrobe)
  p.room = cleanRoom(raw.room)
  p.daily = cleanDaily(raw.daily)
  p.bonus = Math.min(num(raw.bonus), MAX_COUNT)
  p.level = levelInfo(p.xp).level
  return p
}

/* the newest wardrobe choice wins (t); without t the second argument (this device) wins */
function mergeWardrobe(a, b) {
  const owned = [...a.owned]
  for (const x of b.owned) if (!owned.includes(x) && owned.length < MAX_OWNED) owned.push(x)
  const ta = a.t || 0
  const tb = b.t || 0
  let worn
  if (ta !== tb) worn = ta > tb ? a.worn : b.worn
  else worn = b.worn ?? a.worn
  const out = { owned, worn }
  if (ta || tb) out.t = Math.max(ta, tb)
  return out
}

function mergeRoom(a, b) {
  const said = { ...a.said }
  for (const [k, v] of Object.entries(b.said)) {
    if (k in said) said[k] = Math.max(said[k], v)
    else if (Object.keys(said).length < MAX_SAID) said[k] = v
  }
  return { said, best: Math.max(a.best, b.best) }
}

/* server + this device → the best of both (so offline play is never lost) */
export function mergeProgress(a, b) {
  const x = cleanProgress(a)
  const y = cleanProgress(b)
  const out = emptyProgress()
  out.coins = Math.max(x.coins, y.coins)
  out.xp = Math.max(x.xp, y.xp)
  const keys = [...new Set([...Object.keys(x.zones), ...Object.keys(y.zones)])].slice(0, MAX_ZONES)
  for (const k of keys) {
    const p = x.zones[k]
    const q = y.zones[k]
    out.zones[k] = {
      stars: Math.max(p?.stars || 0, q?.stars || 0),
      best: Math.max(p?.best || 0, q?.best || 0),
      plays: Math.max(p?.plays || 0, q?.plays || 0),
    }
  }
  out.wardrobe = mergeWardrobe(x.wardrobe, y.wardrobe)
  out.room = mergeRoom(x.room, y.room)
  out.daily = mergeDaily(x.daily, y.daily)
  out.bonus = Math.max(x.bonus, y.bonus)
  out.level = levelInfo(out.xp).level
  return out
}

export const sameProgress = (a, b) => JSON.stringify(cleanProgress(a)) === JSON.stringify(cleanProgress(b))

export function totalStars(progress) {
  return ZONES.reduce((s, z) => s + (progress.zones[z.key]?.stars || 0), 0)
}

/* a finished run → the new saved progress */
export function applyRun(progress, zone, run) {
  const prev = progress.zones[zone.key] || { stars: 0, best: 0, plays: 0 }
  const next = {
    ...progress,
    coins: progress.coins + run.coins,
    xp: progress.xp + run.xp,
    zones: {
      ...progress.zones,
      [zone.key]: { stars: Math.max(prev.stars, run.stars), best: Math.max(prev.best, run.coins), plays: prev.plays + 1 },
    },
  }
  next.level = levelInfo(next.xp).level
  return next
}
