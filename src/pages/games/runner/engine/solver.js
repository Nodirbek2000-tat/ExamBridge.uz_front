/*
 * TOBY RUN — proof that a chunk can be run (RUNNER_PLAN §B2 "Solver").
 *
 *   solveChunk(chunk, { speed, reaction })  → { ok, lanes: [plan | null ×3] }
 *     from every entry lane, on the ground, at a constant `speed`, is there a sequence of actions
 *     (at least `reaction` seconds apart) that gets Toby through the chunk without touching anything?
 *   landingSlots(chunk, { speed, within, next }) → { ok, worst: [m ×3] }
 *     from every point of every lane, a stretch free for v × 1.0 s (ground or roof) starts within `within` m
 *   plan(start, obs, n, opts)            the same search from any state (the autopilot uses it)
 *
 * The search runs the real physics (physics.js) at 60 Hz with a decision every 0.05 s, depth-first,
 * trying "do nothing" first — so the plan it finds acts as late as possible, like a calm player.
 */
import { CHUNK_LEN, CLEAR } from './chunks.js'
import {
  LANE_X, ONCOMING_ACT, RAMP_LEN, SHAPES, SUBSTEP, act, copyPlayer, groundAt, moveObstacles, newPlayer, solidHit, stepPlayer,
} from './physics.js'

export const DECISION = 0.05
const SUB_PER_DECISION = Math.round(DECISION / SUBSTEP)
const ACTIONS = ['left', 'right', 'jump', 'roll']

/* obstacle objects of a chunk placed at `base` (fresh objects; the solver may move them) */
export function chunkObstacles(chunk, base = 0, out = []) {
  for (const it of chunk.items) {
    const [type, lane, at, ramp] = it
    const sh = SHAPES[type]
    out.push({
      type, lane, z: base + at, len: sh.len, y0: sh.y0, top: sh.top, ramp: ramp ? RAMP_LEN : 0,
      vz: type === 'move' ? -6 : 0, on: false, ghost: false, z0: base + at,
    })
  }
  return out
}

const q = (v, k) => Math.round(v * k)

/*
 * Depth-first search from player state `start` at track position s0 (speed constant).
 * movers: per-decision positions of moving obstacles are re-simulated from their state at s0.
 * → [{ t, a }] (t = seconds from now) or null. `horizon` metres to look ahead.
 */
export function plan(start, obs, n, { speed, s0 = 0, horizon = 46, reaction = 0.35, cooldown = 0, margin = 0, maxNodes = 60000 } = {}) {
  const steps = Math.ceil(horizon / (speed * DECISION))
  const movers = []
  for (let i = 0; i < n; i++) if (obs[i].vz) movers.push(obs[i])
  // positions of moving obstacles at every substep (they do not depend on Toby)
  const totalSub = steps * SUB_PER_DECISION
  const mz = movers.map(o => {
    const arr = new Float64Array(totalSub + 1)
    const tmp = { ...o }
    arr[0] = tmp.z
    for (let k = 1; k <= totalSub; k++) {
      moveObstacles([tmp], 1, s0 + speed * SUBSTEP * (k - 1), SUBSTEP)
      arr[k] = tmp.z
    }
    return { o, arr, z: o.z }
  })
  const dead = new Set()
  let nodes = 0
  const pool = []
  const take = (d) => pool[d] || (pool[d] = newPlayer())
  const inflated = margin > 0

  const run = (p, k0) => {
    // simulate one decision interval → false on a hit
    for (let j = 0; j < SUB_PER_DECISION; j++) {
      const k = k0 * SUB_PER_DECISION + j
      for (const m of mz) m.o.z = m.arr[k + 1]
      const sa = s0 + speed * SUBSTEP * k
      const sb = sa + speed * SUBSTEP
      if (stepPlayer(p, SUBSTEP, obs, n, sa, sb) !== 0) return false
      if (inflated && stepHitsAhead(p, obs, n, sb, margin)) return false
    }
    return true
  }

  const dfs = (p, k, cd) => {
    if (k >= steps) return []
    if (++nodes > maxNodes) return null
    const key = `${k}|${p.lane}|${q(p.laneT, 20)}|${p.air ? 1 : 0}|${q(p.y, 50)}|${q(p.vy, 5)}|${q(p.rollT, 20)}|${q(cd, 20)}|${p.buffered}`
    if (dead.has(key)) return null
    const depth = k + 1
    // 1) do nothing
    const a0 = take(depth * 5)
    copyPlayer(a0, p)
    if (run(a0, k)) {
      const rest = dfs(a0, k + 1, Math.max(0, cd - DECISION))
      if (rest) return rest
    }
    // 2) one action, if the reaction time allows it
    if (cd <= 1e-9) {
      for (let i = 0; i < ACTIONS.length; i++) {
        const a = ACTIONS[i]
        const pa = take(depth * 5 + 1 + i)
        copyPlayer(pa, p)
        if (!act(pa, a)) continue
        if (run(pa, k)) {
          const rest = dfs(pa, k + 1, Math.max(0, reaction - DECISION))
          if (rest) return [{ t: k * DECISION, a }, ...rest]
        }
      }
    }
    dead.add(key)
    return null
  }

  const p0 = newPlayer()
  copyPlayer(p0, start)
  const saved = mz.map(m => m.o.z)
  const res = dfs(p0, 0, cooldown)
  mz.forEach((m, i) => { m.o.z = saved[i] })
  return res ? { actions: res, nodes } : null
}

/* the inflated check: also touching anything a little further ahead counts as a hit (autopilot slack) */
function stepHitsAhead(p, obs, n, s, margin) {
  const h = p.rollT > 0 ? 0.55 : 1.0
  for (let i = 0; i < n; i++) {
    const o = obs[i]
    if (!o.ghost && solidHit(o, p.x, p.y, h, s + margin)) return true
  }
  return false
}

/* every chunk: every entry lane must have a way through */
export function solveChunk(chunk, { speed, reaction = 0.35, tail = 6 } = {}) {
  const lanes = []
  for (let lane = 0; lane < 3; lane++) {
    const obs = chunkObstacles(chunk, 0)
    // oncoming carriages have been rolling since Toby was ONCOMING_ACT m away from them
    for (const o of obs) {
      if (!o.vz) continue
      let s = Math.min(0, o.z - ONCOMING_ACT)
      while (s < 0) { moveObstacles([o], 1, s, SUBSTEP); s += speed * SUBSTEP }
    }
    const p = newPlayer(lane)
    const res = plan(p, obs, obs.length, { speed, s0: 0, horizon: CHUNK_LEN + tail, reaction, maxNodes: 400000 })
    lanes.push(res ? res.actions : null)
  }
  return { ok: lanes.every(Boolean), lanes }
}

/* is lane `lane` free for `len` metres from s (Toby following the ground: up ramps, down off roofs)? */
export function landingFree(obs, n, lane, s, len) {
  const x = LANE_X[lane]
  let y = groundAt(obs, n, x, s)
  for (let d = 0; d <= len; d += 0.25) {
    // the highest ground under any part of his body (he leaves a roof only once all of him is past it)
    const g = Math.max(groundAt(obs, n, x, s + d - 0.3), groundAt(obs, n, x, s + d), groundAt(obs, n, x, s + d + 0.3))
    if (g <= y + 0.6) y = g
    for (let i = 0; i < n; i++) if (solidHit(obs[i], x, y, 1.0, s + d)) return false
  }
  return true
}

/*
 * The chunks the track uses right after an arch: every lane has a landing slot within 25 m at `speed`,
 * whichever of them (or a clear chunk) follows — shrunk until that holds for every pair.
 */
export function landableSet(chunks, speed, within = 25) {
  let set = chunks.filter(c => landingSlots(c, { speed, within }).ok)
  for (let pass = 0; pass < 8; pass++) {
    const keep = set.filter(c => [CLEAR, ...set].every(next => landingSlots(c, { speed, within, next }).ok))
    if (keep.length === set.length) break
    set = keep
  }
  return set
}

/* how many metres from s the lane stays free (the same probe as landingFree), up to `max` */
function freeRun(obs, n, lane, s, max) {
  const x = LANE_X[lane]
  let y = groundAt(obs, n, x, s)
  for (let d = 0; d <= max; d += 0.25) {
    const g = Math.max(groundAt(obs, n, x, s + d - 0.3), groundAt(obs, n, x, s + d), groundAt(obs, n, x, s + d + 0.3))
    if (g <= y + 0.6) y = g
    for (let i = 0; i < n; i++) if (solidHit(obs[i], x, y, 1.0, s + d)) return Math.max(0, d - 0.25)
  }
  return max
}

/* per chunk and lane: free metres from every whole metre of the chunk (nothing after it) — cached */
const PROFILE_MAX = 80
const profiles = new Map()
function profileOf(chunk) {
  let p = profiles.get(chunk)
  if (!p) {
    const obs = chunkObstacles(chunk, 0)
    p = [0, 1, 2].map(lane => Array.from({ length: CHUNK_LEN }, (_, s) => freeRun(obs, obs.length, lane, s, PROFILE_MAX)))
    profiles.set(chunk, p)
  }
  return p
}

/* §B2: every lane has a landing slot (free for v × 1.0 s) within `within` m — the chunk followed by `next` */
export function landingSlots(chunk, { speed, within = 25, next = chunk } = {}) {
  const P = profileOf(chunk)
  const N = profileOf(next)
  const need = speed * 1.0
  const worst = [0, 0, 0]
  for (let lane = 0; lane < 3; lane++) {
    const free = (q) => {
      if (q >= CHUNK_LEN) return N[lane][q - CHUNK_LEN] ?? PROFILE_MAX
      const f = P[lane][q]
      // free to the end of this chunk: it goes on into the next one
      return q + f >= CHUNK_LEN - 0.25 ? CHUNK_LEN - q + N[lane][0] : f
    }
    for (let p = 0; p < CHUNK_LEN; p++) {
      let d = 0
      while (d <= within && free(p + d) < need) d++
      worst[lane] = Math.max(worst[lane], d)
    }
  }
  return { ok: worst.every(w => w <= within), worst }
}
