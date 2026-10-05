/*
 * TOBY RUN — the track: a seeded stream of 40 m chunks (RUNNER_PLAN §B2).
 *
 *   const track = new Track({ seed, level, speedScale, calm, stationEvery, rng })
 *   track.ensure(dist, heat)            generate up to dist + VIEW (heat 0..1 = how far into the speed ramp)
 *   track.requestGate(s)                the next chunk starting at ≥ s − GATE_AT carries a So'z shari arch
 *   track.requestToken()                a gold twister token in the next normal chunk
 *   track.recycle(dist)                 forget what is behind Toby (no allocation: pooled objects, ring of coins)
 *   track.findLandingSlot(lane, from, to, need) → s | −1
 *
 * The same seed and the same requests always give the same track. Gate chunks keep 0–22 m clear
 * (the arch is at 12 m, reachable from every lane); a station block is two clear chunks with the
 * platform stop 60 m in. After a gate the next 3 chunks come from the "landable" set — chunks where
 * every lane has a landing slot within 25 m at the level's top speed (solver.landingSlots).
 */
import { seeded } from '../../../../games/three/random.js'
import { CHUNKS, CHUNK_LEN, CLEAR } from './chunks.js'
import { LANE_X, RAMP_LEN, SHAPES, groundAt, newPlayer, solidHit } from './physics.js'
import { landableSet, landingFree, plan } from './solver.js'
import { CALM_DENSITY, capSpeed, levelOf } from './levels.js'

export const VIEW = 120
export const GATE_AT = 12
export const GATE_CLEAR = 22
export const STATION_STOP = 60
export const BIOMES = ['metro', 'bozor', 'xiyobon', 'shahar']
const STATION_RIDE_GAP = 30      // + a typical ride: an arch at least this far before a platform
const COIN_CAP = 256
const COIN_GAP = 3
const COINS_PER_CHUNK = 6
const POWERS = [['magnet', 1 / 14], ['x2', 1 / 18], ['gilam', 1 / 40]]

const landableCache = new Map()
function landableFor(level, speedScale) {
  const key = `${level}:${speedScale}`
  let set = landableCache.get(key)
  if (!set) {
    const L = levelOf(level)
    const speed = capSpeed(level, speedScale)
    set = landableSet(CHUNKS.filter(c => !c.moving && c.d <= L.diff[1]), speed)
    if (!set.length) set = CHUNKS.filter(c => c.d <= 1)
    landableCache.set(key, set)
  }
  return set
}

export class Track {
  constructor({ seed = 1, level = 'A1', speedScale = 1, calm = false, stationEvery = null, noObstacles = false, firstGate = null, gapScale = 1, biome = 0 } = {}) {
    this.rng = seeded(seed)
    this.level = level
    this.L = levelOf(level)
    this.calm = calm
    this.noObstacles = noObstacles
    this.stationEvery = stationEvery || this.L.stationEvery
    this.speedScale = speedScale
    this._landable = null
    this.frontier = 0
    this.chunks = []                 // [{ s, id, kind }] the last few, for the renderer / tests
    this.obstacles = []
    this.pool = []
    this.nextId = 1
    this.coins = {
      cap: COIN_CAP, s: new Float32Array(COIN_CAP), x: new Float32Array(COIN_CAP), y: new Float32Array(COIN_CAP),
      alive: new Uint8Array(COIN_CAP), air: new Uint8Array(COIN_CAP), head: 0,
    }
    this.pickups = []                // { type: magnet | x2 | gilam | token, lane, s, y, alive }
    this.gates = []                  // { s, used }
    this.stations = []               // { s0, stop, used, biome }
    this.biomeMarks = [{ s: -1e9, b: biome }]
    this.tokenWant = false
    this.postGate = 0
    this.lastId = ''
    this.nextStationAt = this.stationEvery
    // arches: the next one at nextGateAt; spacing = (a typical ride + the running gap) × the pace
    this.gateGap = this.L.gap * gapScale
    this.pace = { v: this.L.start, ride: 5 * 0.85 }
    this.nextGateAt = firstGate == null ? Infinity : firstGate
    // the first stretch is clear (the countdown)
    this.place(CLEAR, 'clear')
    if (firstGate == null) this.place(CLEAR, 'clear')
  }

  /* chunks with landing slots in every lane (computed on first use: ≈ 0.1 s the first time per level) */
  get landable() {
    return this._landable || (this._landable = landableFor(this.level, this.speedScale))
  }

  /* ── generation ─────────────────────────────────────────────────── */

  /* v: the running speed now; ride: metres-per-(m/s) a typical ride covers (seconds × its slow factor) */
  ensure(dist, heat = 0, v = null, ride = null) {
    if (v != null) this.pace.v = Math.max(4, v)
    if (ride != null) this.pace.ride = ride
    while (this.frontier < dist + VIEW) this.generate(heat)
  }

  spacing() { return (this.pace.ride + this.gateGap) * this.pace.v }

  requestToken() { this.tokenWant = true }

  generate(heat) {
    const base = this.frontier
    if (base + STATION_STOP >= this.nextStationAt) {
      const stop = base + STATION_STOP
      const biome = (this.biomeMarks[this.biomeMarks.length - 1].b + 1) % BIOMES.length
      this.stations.push({ s0: base, stop, used: false, biome })
      this.biomeMarks.push({ s: stop, b: biome })
      this.place(CLEAR, 'station')
      this.place(CLEAR, 'station')
      this.nextStationAt = stop + this.stationEvery
      // after a Bekat the next balloon comes a little sooner
      if (Number.isFinite(this.nextGateAt)) this.nextGateAt = Math.max(this.nextGateAt, stop + this.gateGap * 0.5 * this.pace.v)
      return
    }
    // the arch nearest to where it is wanted (±20 m), never so close to a Bekat that the ride would reach it
    if (base + GATE_AT + CHUNK_LEN / 2 >= this.nextGateAt) {
      const s = base + GATE_AT
      if (this.nextStationAt - s < STATION_RIDE_GAP + this.pace.ride * this.pace.v) {
        this.nextGateAt = this.nextStationAt + CHUNK_LEN + this.gateGap * 0.5 * this.pace.v
      } else {
        const c = this.noObstacles ? CLEAR : this.pick(heat, false, true)
        this.gates.push({ s, used: false })
        this.place(c, 'gate', GATE_CLEAR)
        this.postGate = 3
        this.nextGateAt = s + this.spacing()
        return
      }
    }
    const landing = this.postGate > 0
    if (landing) this.postGate--
    const c = this.noObstacles ? CLEAR : this.pick(heat, landing)
    this.place(c, landing ? 'landing' : 'run')
  }

  /* a chunk for the level: easier early in the run, never the same twice in a row */
  pick(heat, landing, still = false) {
    const r = this.rng
    if (this.calm && r() > CALM_DENSITY) return CHUNKS.find(c => c.id === 'rest') || CLEAR
    let pool
    if (landing) pool = this.landable
    else {
      const [lo, hi] = this.L.diff
      const top = Math.min(hi, lo + Math.floor(heat * (hi - lo + 1) + r() * 1.2))
      // an oncoming carriage would roll back through a gate's clear zone
      const moving = !still && this.L.moving > 0 && r() < this.L.moving
      pool = CHUNKS.filter(c => c.d >= lo && c.d <= top && !!c.moving === moving)
      if (!pool.length) pool = CHUNKS.filter(c => c.d >= lo && c.d <= top && !c.moving)
    }
    let c = pool[Math.floor(r() * pool.length)]
    if (c.id === this.lastId && pool.length > 1) c = pool[(pool.indexOf(c) + 1) % pool.length]
    return c
  }

  takeObstacle() {
    const o = this.pool.pop() || {}
    o.id = this.nextId++
    o.on = false
    o.ghost = false
    o.hit = false
    o.passed = false
    return o
  }

  place(chunk, kind, clearTo = 0) {
    const base = this.frontier
    const first = this.obstacles.length
    if (!this.noObstacles) {
      for (const [type, lane, at, ramp] of chunk.items) {
        if (at - (ramp ? RAMP_LEN : 0) < clearTo) continue
        const sh = SHAPES[type]
        const o = this.takeObstacle()
        o.type = type
        o.lane = lane
        o.z = base + at
        o.z0 = o.z
        o.len = sh.len
        o.y0 = sh.y0
        o.top = sh.top
        o.ramp = ramp ? RAMP_LEN : 0
        o.vz = type === 'move' ? -6 : 0
        o.chunk = chunk.id
        this.obstacles.push(o)
      }
    }
    const mine = this.obstacles.slice(first)
    // coins: one line per chunk (≈ 1.2 a second of running), following roofs, arcing over barriers
    const line = chunk.coins && chunk.coins.length ? chunk.coins[Math.floor(this.rng() * chunk.coins.length)] : null
    if (line && (kind !== 'run' || this.rng() < 0.8)) {
      const [lane, from, to] = line
      const n = Math.min(COINS_PER_CHUNK, Math.floor((Math.max(from, clearTo) <= to ? to - Math.max(from, clearTo) : -1) / COIN_GAP) + 1)
      const mid = (Math.max(from, clearTo) + to) / 2
      for (let i = 0; i < n; i++) {
        const s = base + mid + (i - (n - 1) / 2) * COIN_GAP
        const y = this.coinY(mine, lane, s)
        if (y >= 0) this.addCoin(LANE_X[lane], y, s, false)
      }
    }
    // power-ups and the twister token: on a lane with nothing near
    if (kind === 'run' || kind === 'landing') {
      for (const [type, p] of POWERS) {
        if (this.rng() < p) this.placePickup(type, mine, base)
      }
      if (this.tokenWant && kind === 'run' && this.placePickup('token', mine, base)) this.tokenWant = false
    }
    this.chunks.push({ s: base, id: chunk.id, kind })
    if (this.chunks.length > 12) this.chunks.shift()
    this.lastId = chunk.id
    this.frontier = base + CHUNK_LEN
  }

  coinY(mine, lane, s) {
    const x = LANE_X[lane]
    let y = 0.6 + groundAt(mine, mine.length, x, s)
    for (const o of mine) {
      if (o.lane !== lane) continue
      if (o.type === 'low' && Math.abs(s - (o.z + o.len / 2)) < 2.8) y += 1.15 * (1 - ((s - (o.z + o.len / 2)) / 2.8) ** 2)
      if (o.type === 'high' && Math.abs(s - o.z) < 1.4) y = 0.32
      if (solidHit(o, x, y - 0.3, 0.6, s)) return -1
    }
    return y
  }

  placePickup(type, mine, base) {
    const r = this.rng
    for (let k = 0; k < 6; k++) {
      const lane = Math.floor(r() * 3)
      const s = base + 10 + Math.floor(r() * 7) * 3
      if (mine.some(o => o.lane === lane && s > o.z - (o.ramp || 0) - 4 && s < o.z + o.len + 4)) continue
      this.pickups.push({ type, lane, s, y: 0.9, alive: true })
      return true
    }
    return false
  }

  addCoin(x, y, s, air) {
    const c = this.coins
    const i = c.head
    c.head = (c.head + 1) % c.cap
    c.s[i] = s
    c.x[i] = x
    c.y[i] = y
    c.alive[i] = 1
    c.air[i] = air ? 1 : 0
    return i
  }

  /* ── upkeep ─────────────────────────────────────────────────────── */

  recycle(dist) {
    const obs = this.obstacles
    let w = 0
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i]
      if (o.z + o.len < dist - 14) this.pool.push(o)
      else obs[w++] = o
    }
    obs.length = w
    const c = this.coins
    for (let i = 0; i < c.cap; i++) if (c.alive[i] && c.s[i] < dist - 6) c.alive[i] = 0
    if (this.pickups.length && this.pickups[0].s < dist - 10) this.pickups = this.pickups.filter(p => p.s >= dist - 10)
    if (this.gates.length > 4) this.gates.shift()
    if (this.stations.length > 4) this.stations.shift()
    if (this.biomeMarks.length > 6) this.biomeMarks.shift()
  }

  /* obstacles overlapping [a, b] → out (reused array); n */
  near(a, b, out) {
    let n = 0
    const obs = this.obstacles
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i]
      if (o.z + o.len >= a && o.z - (o.ramp || 0) <= b) out[n++] = o
    }
    return n
  }

  /*
   * The first s in [from, to] where `lane` is free for `need` m (ground or roof) and from where a
   * player can still get through what follows (no dead end behind the slot) — or −1.
   */
  findLandingSlot(lane, from, to, need, speed = need) {
    const scratch = this._scratch || (this._scratch = [])
    const n = this.near(from - 2, to + need + 50, scratch)
    for (let s = from; s <= to; s += 1) {
      if (!landingFree(scratch, n, lane, s, need)) continue
      const p = this._probe || (this._probe = newPlayer(lane))
      Object.assign(p, newPlayer(lane))
      p.y = groundAt(scratch, n, LANE_X[lane], s)
      if (plan(p, scratch, n, { speed: Math.max(speed, 4), s0: s, horizon: 45, reaction: 0.35, maxNodes: 20000 })) return s
    }
    return -1
  }

  biomeAt(s) {
    const m = this.biomeMarks
    for (let i = m.length - 1; i >= 0; i--) if (s >= m[i].s) return m[i].b
    return 0
  }
}
