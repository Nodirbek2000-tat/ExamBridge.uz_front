/*
 * TOBY RUN — the learner's saved state (RUNNER_PLAN §B7 "Progress JSON"): VoiceGameProgress.data for
 * slug `runner` (≤ 20 KB), mirrored in localStorage so the game works offline. The pure parts (the
 * shape, the coin ledger, merging) live in wallet.js; this file adds the device, the storage and the
 * server: merge, then one PUT at a time — two quick saves, two tabs or two phones never lose anything.
 *
 *   { v: 1, ts, coins, wallet: { <device>: { e, s } }, owned: [], equip: { outfit, carpet, runner },
 *     up: { magnet, x2, gilam }, missions: { day, active: [{ id, p }], done_today, done, fixes },
 *     level, topic, settings: { calm, hearAlways, buttons, sound, music, listen, reduce },
 *     best: { A1: 5400, … }, runs: [refs] }
 *
 * The leaderboard score is computed on the server, so editing this wallet gains nothing that matters.
 */
import api from '../../../api/client'
import { earn, merge, normalize, spend } from './wallet.js'
import { applyFixes, applyRun, rollMissions, tashkentDay } from './missions.js'

export { DEFAULT_SETTINGS, emptyProgress, normalize, merge } from './wallet.js'

const KEY = 'eb:runner:v1'
const DEV_KEY = 'eb:runner:dev'
const PROGRESS_URL = '/games/voice/runner/progress/'
const OPTS = { timeout: 10000 }

let memory = null
let devMemory = ''

/* this device's name in the coin ledger (random, kept in localStorage) */
export function deviceId() {
  if (devMemory) return devMemory
  try {
    let d = localStorage.getItem(DEV_KEY)
    if (!d) {
      d = `d${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem(DEV_KEY, d)
    }
    devMemory = d
  } catch {
    devMemory = `d${Math.random().toString(36).slice(2, 10)}`
  }
  return devMemory
}

export function readLocal() {
  try {
    const s = localStorage.getItem(KEY)
    return normalize(s ? JSON.parse(s) : memory)
  } catch {
    return normalize(memory)
  }
}

function writeLocal(p) {
  const n = normalize(p)
  memory = n
  try { localStorage.setItem(KEY, JSON.stringify(n)) } catch { /* private mode: this tab still remembers */ }
  return n
}

/* server ∪ device */
export async function loadProgress() {
  try {
    const { data } = await api.get(PROGRESS_URL, OPTS)
    return writeLocal(merge(readLocal(), data?.data))
  } catch {
    return readLocal()
  }
}

let chain = Promise.resolve()
let pending = 0
function push() {
  pending++
  const job = chain.then(async () => {
    pending--
    if (pending > 0) return readLocal()                 // a newer save is queued: it carries this one too
    let p = readLocal()
    try {
      const r = await api.get(PROGRESS_URL, OPTS)
      p = merge(p, r.data?.data)
    } catch { /* offline: write what this device knows */ }
    await api.put(PROGRESS_URL, { data: p }, OPTS).catch(() => null)
    return writeLocal(merge(readLocal(), p))
  })
  chain = job.catch(() => null)
  return job
}

/* the save queue is empty (tests) */
export const saved = () => chain

function commit(p) {
  const next = writeLocal({ ...p, ts: Math.max(Date.now(), (p.ts || 0) + 1) })
  push().catch(() => null)
  return next
}

/* a change from a screen (level, topic, settings, equip): saved here at once, then on the server */
export function saveProgress(patch) {
  return commit({ ...readLocal(), ...patch })
}

/* today's missions, topped up (a new day starts a new set) */
export function ensureMissions(server = false) {
  const p = readLocal()
  const day = tashkentDay()
  const m = rollMissions(p.missions, { day, server })
  if (JSON.stringify(m) === JSON.stringify(p.missions)) return p
  return commit({ ...p, missions: m })
}

/*
 * A finished run — once per run ref: its coins into the wallet, the local best, mission progress
 * (completed missions pay their reward at once). → { progress, already, completed, reward }
 */
export function creditRun({ ref, level, coins = 0, score = 0, summary = null, server = false }) {
  const p = readLocal()
  if (ref && p.runs.includes(ref)) return { progress: p, already: true, completed: [], reward: 0 }
  const dev = deviceId()
  const best = { ...p.best, [level]: Math.max(p.best[level] || 0, score) }
  let next = earn({ ...p, best, runs: [...p.runs, ref].slice(-20) }, dev, coins)
  let completed = []
  let reward = 0
  if (summary) {
    const r = applyRun(next.missions, summary, { day: tashkentDay(), server })
    next = earn({ ...next, missions: r.missions }, dev, r.reward)
    completed = r.completed
    reward = r.reward
  }
  return { progress: commit(next), already: false, completed, reward }
}

/* a fix on the results screen (Tuzat): +coins and the "fix 3" mission */
export function creditFix(coins, server = false) {
  const dev = deviceId()
  let p = earn(readLocal(), dev, coins)
  const r = applyFixes(p.missions, 1, { day: tashkentDay(), server })
  p = earn({ ...p, missions: r.missions }, dev, r.reward)
  return { progress: commit(p), completed: r.completed, reward: r.reward }
}

/* extra coins */
export function addCoins(n) {
  if (!n) return readLocal()
  return commit(earn(readLocal(), deviceId(), n))
}

/* the shop: → the new progress, or null when the coins are not enough */
export function buy(price, patch) {
  const p = spend(readLocal(), deviceId(), price)
  if (!p) return null
  return commit({ ...p, ...patch(p) })
}

