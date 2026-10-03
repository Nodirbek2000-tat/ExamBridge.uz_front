/*
 * VOICE DRIVE progress: best score per level, the garage (coin bank, cars,
 * upgrades, missions), finished runs and the weekly leaderboard. The server is
 * the source of truth, but every call falls back to localStorage so the game
 * always works offline or if the API is down.
 *
 * Saved data (PUT /games/voice/voice-drive/progress/, a few hundred bytes):
 *   { best: { easy, medium, hard }, garage: { ts, bank, car, owned, up, missions, mDone, lastRun } }
 * Old saves had only `best` — they load as an empty garage.
 */
import api from '../../../api/client'
import { SLUG } from './content'
import { emptyGarage, mergeGarage, normalizeGarage, withMissions } from './cars'

const KEY = 'eb:voice-drive:v1'
const EMPTY = { easy: 0, medium: 0, hard: 0 }
const OPTS = { timeout: 10000 }
const PROGRESS_URL = `/games/voice/${SLUG}/progress/`

function parse(raw) {
  const hear = raw.hear && typeof raw.hear === 'object' ? raw.hear : {}
  return {
    best: mergeBest(EMPTY, raw.best),
    level: EMPTY[raw.level] !== undefined ? raw.level : 'easy',
    garage: normalizeGarage(raw.garage),
    hear: { easy: hear.easy !== false, medium: hear.medium === true, hard: hear.hard === true },
    sound: raw.sound !== false,
  }
}

// when the browser refuses storage (private mode, full), this tab still remembers
let memory = null

function readRaw() {
  try {
    const s = localStorage.getItem(KEY)
    return s ? JSON.parse(s) || {} : memory || {}
  } catch {
    return memory || {}
  }
}

function store(state) {
  memory = state
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode / storage full — the game still works */ }
}

export function readLocal() {
  const state = parse(readRaw())
  // a fresh mission board is stored at once, so the run and the result screen see the same missions
  if (state.garage.missions.length < 3) {
    state.garage = withMissions(state.garage)
    store(state)
  }
  return state
}

function writeLocal(patch) {
  store({ ...readLocal(), ...patch })
}

export const rememberLevel = (level) => writeLocal({ level })
export const rememberHear = (hear) => writeLocal({ hear })
export const rememberSound = (sound) => writeLocal({ sound: !!sound })

export const mergeBest = (a, b) => Object.fromEntries(
  Object.keys(EMPTY).map(k => [k, Math.max(Number(a?.[k]) || 0, Number(b?.[k]) || 0)]),
)

/* Best scores + garage: server ∪ this device. */
export async function loadAll() {
  try {
    const { data } = await api.get(PROGRESS_URL, OPTS)
    // read the device again after the wait: a run may have finished meanwhile
    const local = readLocal()
    const best = mergeBest(local.best, data?.data?.best)
    const garage = withMissions(mergeGarage(local.garage, data?.data?.garage))
    writeLocal({ best, garage })
    return { best, garage }
  } catch {
    const local = readLocal()
    return { best: local.best, garage: local.garage }
  }
}

/*
 * PUT replaces the saved state, so merge in what the server already has (another
 * device may hold a higher best or a bought car) before writing it back.
 * Writes go one after another, never two at once.
 */
let chain = Promise.resolve()
function pushToServer() {
  const job = chain.then(async () => {
    const local = readLocal()
    let best = local.best
    let garage = local.garage
    try {
      const r = await api.get(PROGRESS_URL, OPTS)
      best = mergeBest(best, r.data?.data?.best)
      garage = withMissions(mergeGarage(garage, r.data?.data?.garage))
    } catch { /* offline: write what this device knows */ }
    await api.put(PROGRESS_URL, { data: { best, garage } }, OPTS).catch(() => null)
    // merge, never overwrite: a car bought / an upgrade made while this request was on its way must stay
    // (its own save is queued right after this one and sends it to the server)
    const now = readLocal()
    best = mergeBest(now.best, best)
    garage = withMissions(mergeGarage(now.garage, garage))
    writeLocal({ best, garage })
    return { best, garage }
  })
  chain = job.catch(() => null)
  return job
}

/* A garage change (buy / select / upgrade): saved on the device at once, then on the server. */
export function saveGarage(garage) {
  const g = normalizeGarage(garage)
  writeLocal({ garage: g })
  pushToServer().catch(() => null)
  return g
}

/*
 * Credit a finished run into the garage: the run's coins plus every mission done.
 * Done missions are replaced with fresh ones. Idempotent per run id.
 */
function creditRun(summary) {
  const g = readLocal().garage
  const doneIds = new Set((summary.missions || []).filter(m => m.done).map(m => m.id))
  const done = g.missions.filter(m => doneIds.has(m.id))
  const reward = done.reduce((s, m) => s + m.reward, 0)
  const coins = Math.max(0, Math.round(summary.coins || 0))
  if (g.lastRun === summary.id) return { garage: g, coins: 0, reward: 0, done: [], bankBefore: g.bank, already: true }
  const next = withMissions({
    ...g,
    bank: g.bank + coins + reward,
    missions: g.missions.filter(m => !doneIds.has(m.id)),
    mDone: g.mDone + done.length,
    lastRun: summary.id,
    ts: Date.now(),
  })
  writeLocal({ garage: next })
  return { garage: next, coins, reward, done, bankBefore: g.bank, already: false }
}

/*
 * Save a finished run → { best, isNew, prevBest, allTime, board, online, garage, credit }.
 * board = { top: [{ name, score, is_me }], me: { best_score, rank } } or null.
 */
export async function finishRun(summary, knownBest) {
  const prevAll = mergeBest(readLocal().best, knownBest)
  const prevBest = prevAll[summary.level] || 0
  const isNew = summary.score > prevBest
  const best = { ...prevAll, [summary.level]: Math.max(prevBest, summary.score) }
  writeLocal({ best })
  const credit = creditRun(summary)

  let posted = null
  try {
    const { data } = await api.post(`/games/voice/${SLUG}/runs/`, {
      score: Math.max(0, Math.min(100000, Math.round(summary.score))),
      stars: summary.stars,
      accuracy: Math.round(summary.accuracy * 10000) / 10000,
      level: summary.level,
      duration_sec: summary.duration,
      lines_said: summary.linesSaid,
    }, OPTS)
    posted = data
  } catch { /* offline — the local best is kept */ }

  const [saved, board] = await Promise.all([
    pushToServer().catch(() => ({ best, garage: credit.garage })),
    api.get(`/games/voice/${SLUG}/leaderboard/`, OPTS).then(r => r.data).catch(() => null),
  ])

  return {
    best: saved.best,
    garage: saved.garage,
    credit,
    isNew,
    prevBest,
    allTime: posted?.best_score ?? null,
    board: board && Array.isArray(board.top) ? board : null,
    online: !!posted,
  }
}

export { emptyGarage }
