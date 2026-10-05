/*
 * TOBY RUN — the saved state, pure (RUNNER_PLAN §B7 "Progress JSON"; node --test runs it). progress.js
 * adds localStorage and the server around it.
 *
 * Coins are a per-device ledger, not one number: wallet = { <device>: { e: earned, s: spent } }, and
 * coins = Σe − Σs. Each device only ever raises its own two counters, so merging two copies is a
 * per-device max — two quick saves, two tabs or two phones never lose a coin or a purchase (a single
 * "coins" field would let the newer copy overwrite the older one's earnings).
 *
 *   normalize(raw) · merge(a, b) · coinsOf(p) · earn(p, dev, n) · spend(p, dev, n) → p | null (not enough)
 *   own(p, id) · equip(p, slot, id) · upgrade(p, key) → p | null
 */
export const LEVEL_IDS = ['A1', 'A2', 'B1', 'B2', 'C1']
export const DEFAULT_SETTINGS = { calm: false, hearAlways: false, buttons: false, sound: true, music: true, listen: false, reduce: false }
// every browser profile (a school PC in private mode too) is a device: keep plenty (≈ 35 bytes each)
const MAX_DEVICES = 64

export function emptyProgress() {
  return {
    v: 1, ts: 0, coins: 0, wallet: {}, owned: [], equip: { outfit: '', carpet: 'carpet-klassik', runner: 'toby' },
    up: { magnet: 0, x2: 0, gilam: 0 }, missions: { day: '', active: [], done_today: 0, done: [], fixes: 0 },
    level: 'A1', topic: 'all', settings: { ...DEFAULT_SETTINGS }, best: {}, runs: [],
  }
}

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
const int0 = (v) => Math.max(0, Math.floor(num(v)))
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v)

export function coinsOf(p) {
  let c = 0
  for (const k of Object.keys(p.wallet || {})) c += int0(p.wallet[k].e) - int0(p.wallet[k].s)
  return Math.max(0, c)
}

function cleanWallet(raw, legacyCoins) {
  const w = {}
  if (isObj(raw)) {
    let rows = Object.entries(raw).filter(([k, v]) => isObj(v) && typeof k === 'string' && k.length <= 24)
    // over the cap: the devices that did the least go (never the first-come ones only — a new phone keeps its coins)
    if (rows.length > MAX_DEVICES) rows = rows.sort((a, b) => (int0(b[1].e) + int0(b[1].s)) - (int0(a[1].e) + int0(a[1].s))).slice(0, MAX_DEVICES)
    for (const [k, v] of rows) w[k] = { e: int0(v.e), s: int0(v.s) }
  }
  // a copy saved before the ledger: its coins become the "base" device's earnings
  if (!Object.keys(w).length && legacyCoins > 0) w.base = { e: legacyCoins, s: 0 }
  return w
}

function cleanMissions(raw) {
  const e = emptyProgress().missions
  if (!isObj(raw)) return e
  return {
    day: typeof raw.day === 'string' ? raw.day.slice(0, 10) : '',
    active: Array.isArray(raw.active) ? raw.active.filter(a => isObj(a) && typeof a.id === 'string').slice(0, 3).map(a => ({ id: a.id, p: Math.max(0, num(a.p)) })) : [],
    done_today: int0(raw.done_today),
    done: Array.isArray(raw.done) ? raw.done.filter(x => typeof x === 'string').slice(0, 12) : [],
    fixes: int0(raw.fixes),
  }
}

export function normalize(raw) {
  const e = emptyProgress()
  const r = isObj(raw) ? raw : {}
  const p = {
    ...e,
    ts: num(r.ts),
    wallet: cleanWallet(r.wallet, int0(r.coins)),
    owned: Array.isArray(r.owned) ? [...new Set(r.owned.filter(x => typeof x === 'string'))].slice(0, 60) : [],
    equip: { ...e.equip, ...(isObj(r.equip) ? r.equip : {}) },
    up: { magnet: Math.min(5, int0(r.up?.magnet)), x2: Math.min(5, int0(r.up?.x2)), gilam: Math.min(5, int0(r.up?.gilam)) },
    missions: cleanMissions(r.missions),
    level: LEVEL_IDS.includes(r.level) ? r.level : 'A1',
    topic: typeof r.topic === 'string' ? r.topic.slice(0, 30) : 'all',
    settings: { ...DEFAULT_SETTINGS, ...(isObj(r.settings) ? r.settings : {}) },
    best: Object.fromEntries(LEVEL_IDS.map(l => [l, int0(r.best?.[l])]).filter(([, v]) => v > 0)),
    runs: Array.isArray(r.runs) ? r.runs.filter(x => typeof x === 'string').slice(-20) : [],
  }
  p.coins = coinsOf(p)
  return p
}

/* two copies → one: per-device max of the ledger, the union of what was bought, the best upgrades and
   bests, the newer copy's choices (equip, level, topic, settings), today's missions merged */
export function merge(a, b) {
  const A = normalize(a)
  const B = normalize(b)
  const [n, o] = A.ts >= B.ts ? [A, B] : [B, A]
  const wallet = {}
  for (const src of [o.wallet, n.wallet]) {
    for (const [k, v] of Object.entries(src)) {
      const w = wallet[k] || { e: 0, s: 0 }
      wallet[k] = { e: Math.max(w.e, v.e), s: Math.max(w.s, v.s) }
    }
  }
  const best = { ...o.best }
  for (const [l, v] of Object.entries(n.best)) best[l] = Math.max(best[l] || 0, v)
  const up = {}
  for (const k of ['magnet', 'x2', 'gilam']) up[k] = Math.max(n.up[k] || 0, o.up[k] || 0)
  let missions = n.missions
  if (n.missions.day && n.missions.day === o.missions.day) {
    const prog = new Map(o.missions.active.map(a => [a.id, a.p]))
    const done = [...new Set([...o.missions.done, ...n.missions.done])]
    missions = {
      ...n.missions,
      // a mission finished on either copy leaves the active list (missions.js tops it up again)
      active: n.missions.active.filter(a => !done.includes(a.id)).map(a => ({ id: a.id, p: Math.max(a.p, prog.get(a.id) || 0) })),
      done_today: Math.max(n.missions.done_today, o.missions.done_today, done.length),
      done,
      fixes: Math.max(n.missions.fixes, o.missions.fixes),
    }
  } else if (o.missions.day > n.missions.day) missions = o.missions
  const out = {
    ...n, wallet, owned: [...new Set([...o.owned, ...n.owned])], up, best, missions,
    runs: [...new Set([...o.runs, ...n.runs])].slice(-20),
  }
  out.coins = coinsOf(out)
  return out
}

export function earn(p, dev, n) {
  const k = Math.max(0, Math.floor(n || 0))
  if (!k) return p
  const w = p.wallet[dev] || { e: 0, s: 0 }
  const out = { ...p, wallet: { ...p.wallet, [dev]: { e: w.e + k, s: w.s } } }
  out.coins = coinsOf(out)
  return out
}

/* → the new copy, or null when there are not enough coins */
export function spend(p, dev, n) {
  const k = Math.max(0, Math.floor(n || 0))
  if (coinsOf(p) < k) return null
  const w = p.wallet[dev] || { e: 0, s: 0 }
  const out = { ...p, wallet: { ...p.wallet, [dev]: { e: w.e, s: w.s + k } } }
  out.coins = coinsOf(out)
  return out
}
