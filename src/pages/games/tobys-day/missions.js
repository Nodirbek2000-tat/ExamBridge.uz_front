/*
 * TOBY'S DAY — daily missions: three small goals a day (one about speaking
 * well, one about a kind of task or the Play Room, one about zones), the same
 * three for everybody on the same date. Finishing one lets the learner claim
 * its coins / stars on the map.
 *
 * Saved inside the progress JSON (logic.js keeps it valid and merges it):
 *   data.daily = { d: 'YYYY-MM-DD', n: { [counter]: number }, got: [missionId…] }   // today's counters + claimed ids
 *   data.bonus = stars won with missions so far (they count toward the wardrobe)
 * Pure JS, no React.
 */

export const MISSIONS = [
  // speaking well
  { id: 'perfect5', bucket: 'speak', counter: 'perfect', goal: 5, title: '5 ta gapni a’lo ayting', sub: 'Birinchi urinishda, 3 ★ bilan', reward: { coins: 30 }, icon: 'perfect' },
  { id: 'lines10', bucket: 'speak', counter: 'lines', goal: 10, title: '10 ta gapni ayting', sub: 'Istalgan zonada', reward: { coins: 25 }, icon: 'mic' },
  { id: 'combo4', bucket: 'speak', counter: 'combo', goal: 4, title: 'Ketma-ket 4 ta gap', sub: 'Hammasi birinchi urinishda', reward: { coins: 20, stars: 1 }, icon: 'flame' },
  // a kind of task / the Play Room
  { id: 'room5', bucket: 'play', counter: 'room', goal: 5, title: 'Play Room’da 5 ta buyruq', sub: 'Toby bilan o‘ynang', reward: { coins: 20, stars: 1 }, icon: 'room' },
  { id: 'listen2', bucket: 'play', counter: 'listen', goal: 2, title: '2 ta «Tinglang va tanlang»', sub: 'Eshiting, rasmni toping, ayting', reward: { coins: 20, stars: 1 }, icon: 'ear' },
  { id: 'ask2', bucket: 'play', counter: 'ask', goal: 2, title: '2 ta savolga javob bering', sub: 'Qahramon so‘raydi — siz javob berasiz', reward: { coins: 20, stars: 1 }, icon: 'ask' },
  { id: 'gap2', bucket: 'play', counter: 'gap', goal: 2, title: '2 ta bo‘sh joyni to‘ldiring', sub: 'To‘g‘ri so‘zni topib, gapni ayting', reward: { coins: 20, stars: 1 }, icon: 'gap' },
  // zones
  { id: 'zone1', bucket: 'zone', counter: 'zones', goal: 1, title: '1 ta zonani tugating', sub: 'Boshidan oxirigacha', reward: { stars: 2 }, icon: 'flag' },
  { id: 'stars15', bucket: 'zone', counter: 'stars', goal: 15, title: 'Bugun 15 ★ yig‘ing', sub: 'Zonalardagi yulduzlar', reward: { coins: 40 }, icon: 'star' },
  { id: 'zone2', bucket: 'zone', counter: 'zones', goal: 2, title: '2 ta zonani tugating', sub: 'Bitta zonani ikki marta ham bo‘ladi', reward: { coins: 30, stars: 1 }, icon: 'flag' },
]
export const MISSION_BY_ID = Object.fromEntries(MISSIONS.map(m => [m.id, m]))
export const COUNTERS = ['lines', 'perfect', 'combo', 'room', 'listen', 'ask', 'gap', 'zones', 'stars']
const BUCKETS = ['speak', 'play', 'zone']
const MAX_COUNT = 9999
const DAY = /^\d{4}-\d{2}-\d{2}$/

const pad = (n) => String(n).padStart(2, '0')
/* the local date as 'YYYY-MM-DD' (sorts as text) */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/* today's three missions (one per bucket, the same for everybody on that date) */
export function todayMissions(day = dayKey()) {
  return BUCKETS.map((b, i) => {
    const pool = MISSIONS.filter(m => m.bucket === b)
    return pool[hash(`${day}:${i}`) % pool.length]
  })
}

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.min(MAX_COUNT, Math.floor(Number(v))) : 0)
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

export const emptyDaily = (d = '') => ({ d, n: {}, got: [] })

export function cleanDaily(raw) {
  if (!isObj(raw) || typeof raw.d !== 'string' || !DAY.test(raw.d)) return emptyDaily()
  const out = emptyDaily(raw.d)
  if (isObj(raw.n)) for (const k of COUNTERS) { const v = num(raw.n[k]); if (v) out.n[k] = v }
  if (Array.isArray(raw.got)) for (const id of raw.got) if (MISSION_BY_ID[id] && !out.got.includes(id) && out.got.length < 6) out.got.push(id)
  return out
}

/* two devices: the newer day wins; on the same day the bigger counters and every claim */
export function mergeDaily(a, b) {
  const x = cleanDaily(a)
  const y = cleanDaily(b)
  if (x.d !== y.d) return x.d > y.d ? x : y
  const out = emptyDaily(x.d)
  for (const k of COUNTERS) { const v = Math.max(x.n[k] || 0, y.n[k] || 0); if (v) out.n[k] = v }
  out.got = [...new Set([...x.got, ...y.got])].slice(0, 6)
  return out
}

/* the daily data for `day` (yesterday's counters do not count today) */
export function dailyFor(progress, day = dayKey()) {
  const d = cleanDaily(progress?.daily)
  return d.d === day ? d : emptyDaily(day)
}

/*
 * Something happened → progress with today's counters moved on.
 * delta: { lines, perfect, room, listen, ask, gap, zones, stars } are added; combo keeps the best streak.
 */
export function bumpDaily(progress, delta, day = dayKey()) {
  const d = dailyFor(progress, day)
  const n = { ...d.n }
  for (const [k, v] of Object.entries(delta || {})) {
    if (!COUNTERS.includes(k)) continue
    const add = num(v)
    if (!add) continue
    n[k] = k === 'combo' ? Math.max(n[k] || 0, add) : Math.min(MAX_COUNT, (n[k] || 0) + add)
  }
  return { ...progress, daily: { d: day, n, got: d.got } }
}

/* today's missions with their state → [{ ...mission, value, done, claimed }] */
export function missionList(progress, day = dayKey()) {
  const d = dailyFor(progress, day)
  return todayMissions(day).map(m => {
    const value = Math.min(m.goal, d.n[m.counter] || 0)
    return { ...m, value, done: value >= m.goal, claimed: d.got.includes(m.id) }
  })
}

/* how many of today's missions are done but not claimed yet (a dot on the map) */
export const unclaimedCount = (progress, day = dayKey()) => missionList(progress, day).filter(m => m.done && !m.claimed).length

/* claim a finished mission → progress with its coins / stars added (unchanged when not allowed) */
export function claimMission(progress, id, day = dayKey()) {
  const m = missionList(progress, day).find(x => x.id === id)
  if (!m || !m.done || m.claimed) return progress
  const d = dailyFor(progress, day)
  return {
    ...progress,
    coins: (Number(progress.coins) || 0) + (m.reward.coins || 0),
    bonus: Math.min(MAX_COUNT, (Number(progress.bonus) || 0) + (m.reward.stars || 0)),
    daily: { d: day, n: d.n, got: [...d.got, id] },
  }
}

/* what a run of a zone adds to today's counters (TobysDayGame, at the end of a zone) */
export const runDelta = (run) => ({ zones: 1, stars: run?.stars || 0 })

/* what one passed line adds (PlayScreen → onStep) */
export function stepDelta({ type, stars, combo }) {
  const out = { lines: 1, combo: combo || 0 }
  if (stars >= 3) out.perfect = 1
  if (type === 'listen' || type === 'ask' || type === 'gap') out[type] = 1
  return out
}
