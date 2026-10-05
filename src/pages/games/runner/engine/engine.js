/*
 * TOBY RUN — the engine (RUNNER_PLAN §B9.2): its own clock, Toby's state machine, physics,
 * collisions, coins, power-ups, Shovqin, the balloon ride, the Bekat stop, crash and revive.
 * No React, no three.js, no network — pure JS (node --test runs whole games with it).
 *
 *   const game = new RunnerEngine({ level, deck, config, hooks, ui, seed, sttMode, reduced, calm, listenMode })
 *   game.start()             3-2-1, then run          game.step(dt)   every frame (renderer / CardMode / tests)
 *   game.input('left' | 'right' | 'jump' | 'roll')    game.pause() / resume() / quit() / halt()
 *
 * The renderer reads: player { lane, x, y, z, state, t, shield, roll, air }, obstacles, coins (typed arrays),
 * pickups, gates, stations, choices, ride { phase, alt, t, pic, pop, kite }, shovqin { on, k, puff },
 * biome { key, next, blend }, speed, dist, status, phase, paused, clock, powers.
 * Speech moments live in director.js; the page talks to both through `hooks` (see director.js).
 * Per-frame numbers (score, coins, distance, the countdown bar) go straight into `ui` DOM refs.
 */
import { seeded } from '../../../../games/three/random.js'
import { Director } from './director.js'
import {
  LANE_X, SUBSTEP, act, groundAt, moveObstacles, newPlayer, solidHit, stepPlayer,
} from './physics.js'
import { BIOMES, Track, VIEW } from './track.js'
import {
  BEKAT, DEFAULT_CONFIG, LEVELS, RAMP_S, REVIVE, RIDE, SHOVQIN_TIME, VARRAK_TIME, X2_TIME, speedAt,
} from './levels.js'
import { liveScore } from './score.js'

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const ease = (t) => t * t * (3 - 2 * t)
const easeOut = (t) => 1 - (1 - t) * (1 - t)
const NEAR_BACK = 2
const NEAR_AHEAD = 18
const FIRST_GATE_AT = 52           // the first So'z shari right after the clear start (≈ 6 s of running)
const RIDE_GUESS = { browser: 5, server: 8 }   // seconds a typical ride takes (arches are spaced with it)

export class RunnerEngine {
  constructor({
    level = 'A1', deck = null, config = {}, hooks = {}, ui = {}, seed = 1, sttMode = 'browser', reduced = false,
    calm = false, listenMode = false, upgrades = {}, outfit = '', hearAlways = false, noWorld = false, attract = false,
    carpet = 'carpet-klassik', runner = 'toby', startBiome = 0,
  } = {}) {
    this.level = LEVELS[level] ? level : 'A1'
    this.cfg = { ...DEFAULT_CONFIG, ...(config || {}) }
    this.hooks = hooks
    this.ui = ui
    this.seed = seed
    this.reduced = reduced
    this.calm = calm
    this.outfit = outfit
    this.carpet = carpet || ''
    this.runner = runner || 'toby'
    this.upgrades = upgrades || {}
    this.noWorld = noWorld
    this.attract = attract
    this.rng = seeded((seed * 7 + 13) >>> 0)

    this.clock = 0
    this.worldT = 0
    this.runT = 0
    this.playStart = 0
    this.status = 'ready'          // ready | countdown | running | over
    this.phase = 'run'             // run | ride | brake | station | resume | crash | revive
    this.paused = false
    this.halted = false
    this.timers = []

    this.dist = 0
    this.speed = 0
    this.speedK = 1                // ride / station / crash multipliers, eased
    this.track = new Track({
      seed, level: this.level, speedScale: this.cfg.speed_scale || 1, calm,
      stationEvery: this.cfg.station_every_m || null, noObstacles: noWorld, firstGate: attract ? null : FIRST_GATE_AT,
      gapScale: this.cfg.balloon_gap_scale || 1, biome: attract ? 1 : startBiome,
    })
    this.track.ensure(0, 0)
    this.obstacles = this.track.obstacles
    this.coins = this.track.coins
    this.pickups = this.track.pickups
    this.gates = this.track.gates
    this.stations = this.track.stations
    this.near = []
    this.nNear = 0

    const p = newPlayer(1)
    Object.assign(p, { z: 0, state: 'idle', t: 0, shield: 0, stumbleT: 0, cheerT: -9 })
    this.player = p
    this.ride = { phase: 'none', alt: 0, t: 0, y0: 0, pic: '', pt: '', pop: -9, kite: false, land: 0, start: 0, seekT: 0, listen: false }
    this.shovqin = { on: false, k: 0, until: 0, puff: -9 }
    this.biome = { key: BIOMES[0], next: BIOMES[0], blend: 0 }
    this.powers = { magnet: 0, x2: 0, gilam: 0 }
    this.choices = []              // Listen mode: 3 balloons ahead, one per lane
    this.coinsGot = 0
    this.stationsDone = 0
    this.revives = 0
    this.crashT = 0
    this.over = null
    this.fx = { coinT: -9, popT: -9, landT: -9, hitT: -9, puffT: -9, powerT: -9 }
    this.hud = { score: -1, coins: -1, dist: -1, bar: -1 }
    this.last = { phase: '', powers: -1 }
    this.auto = null
    this.sttMode = sttMode
    this.director = noWorld && attract ? null : new Director(this, {
      deck, level: this.level, config: this.cfg, hooks, listenMode, sttMode, hearAlways,
      cheerVoice: runner === 'lola' ? 'girl' : runner === 'bek' ? 'boy' : 'toby',
    })
  }

  /* ── public API ─────────────────────────────────────────────────── */

  get listenMode() { return !!this.director?.listenMode }

  start() {
    if (this.status !== 'ready' || this.halted) return
    this.status = 'countdown'
    this.countT = 3
    this.set({ phase: 'countdown', count: 3 })
    this.sfx('count')
  }

  input(a) {
    if (this.halted || this.paused || this.status !== 'running') return false
    const p = this.player
    if (this.phase === 'run' || this.phase === 'resume') {
      const did = act(p, a)
      if (did) this.sfx(a === 'jump' ? 'jump' : a === 'roll' ? 'roll' : 'swoosh')
      return did
    }
    if (this.phase === 'ride' && (a === 'left' || a === 'right')) {
      const did = act(p, a)
      if (did) this.sfx('swoosh')
      return did
    }
    return false
  }

  /* Listen mode: a tap on a choice steers Toby into that balloon's lane */
  steerTo(lane) {
    const p = this.player
    if (this.phase !== 'ride' || lane === p.lane || lane < 0 || lane > 2) return
    p.prevLane = p.lane
    p.lane = lane
    p.fromX = p.x
    p.laneT = 0
  }

  /* no WebGL any more (CardMode): the run goes on without obstacles, the moments keep coming */
  toCardMode() {
    if (this.noWorld) return
    this.noWorld = true
    this.track.noObstacles = true
    for (const o of this.obstacles) this.track.pool.push(o)
    this.obstacles.length = 0
    this.nNear = 0
  }

  pause() {
    if (this.paused || this.halted || this.status === 'over' || this.status === 'ready') return
    this.paused = true
    this.director?.pause()
    this.set({ paused: true, pauseInfo: { biome: this.biome.key, meters: this.meters() } })
  }

  resume() {
    if (!this.paused || this.halted) return
    this.paused = false
    this.set({ paused: false })
    this.director?.resume()
  }

  quit() {
    if (this.status === 'over' || this.halted) return
    this.paused = false
    this.set({ paused: false })
    this.director?.abort()
    this.gameOver('quit')
  }

  halt() {
    this.halted = true
    this.director?.abort()
  }

  after(sec, fn) { this.timers.push({ at: this.clock + sec, fn }) }

  /* ── frame ──────────────────────────────────────────────────────── */

  step(dt) {
    if (this.halted) return false
    if (this.paused) return false
    dt = Math.min(Math.max(dt || 0, 0), 0.05)
    this.clock += dt
    if (this.status === 'ready') {
      this.player.t += dt
      this.player.state = 'idle'
      return true
    }
    if (this.status === 'countdown') {
      this.player.t += dt
      const before = Math.ceil(this.countT)
      this.countT -= dt
      if (this.countT <= 0) {
        this.status = 'running'
        this.phase = 'run'
        this.playStart = this.clock
        this.set({ phase: 'running', count: 'GO' })
        this.after(0.6, () => this.set({ count: null }))
        this.sfx('go')
        this.director?.start()
      } else if (Math.ceil(this.countT) !== before) {
        this.set({ count: Math.ceil(this.countT) })
        this.sfx('count')
      }
      this.runTimers()
      return true
    }
    if (this.status === 'running') {
      const n = Math.max(1, Math.ceil(dt / SUBSTEP - 1e-6))
      const h = dt / n
      for (let i = 0; i < n && this.status === 'running' && !this.halted; i++) {
        this.auto?.update(this, h)
        this.tick(h)
      }
    }
    this.runTimers()
    if (this.status === 'running') this.director?.update()
    this.writeHud()
    return true
  }

  runTimers() {
    if (!this.timers.length) return
    const due = []
    let w = 0
    for (let i = 0; i < this.timers.length; i++) {
      const tm = this.timers[i]
      if (tm.at <= this.clock) due.push(tm)
      else this.timers[w++] = tm
    }
    this.timers.length = w
    if (!due.length) return
    due.sort((a, b) => a.at - b.at)
    for (const tm of due) {
      if (this.halted) return
      tm.fn()
    }
  }

  baseSpeed() {
    return speedAt(this.level, this.runT, { speedScale: this.cfg.speed_scale || 1, calm: this.calm, reduced: this.reduced })
  }

  tick(h) {
    const p = this.player
    // speed: the level's ramp × what is happening now
    let k = this.speedK
    if (this.phase === 'ride') {
      const slow = this.director?.serverMode ? RIDE.slowServer : RIDE.slow
      k += (slow - k) * Math.min(1, h / RIDE.ease * 2.2)
    } else if (this.phase === 'run') {
      k += (1 - k) * Math.min(1, h / RIDE.ease * 2.2)
    } else if (this.phase === 'resume') {
      k = Math.min(1, k + h / BEKAT.resume)
      if (k >= 1) this.phase = 'run'
    } else if (this.phase === 'crash') {
      this.crashT += h
      k = Math.max(0, 0.25 * (1 - this.crashT / REVIVE.slowmo))
    } else if (this.phase === 'station' || this.phase === 'revive') k = 0
    this.speedK = k
    const base = this.baseSpeed()
    if (this.phase === 'brake') {
      const st = this.braking
      const left = st.stop - this.dist
      this.speed = left > 0.05 ? Math.min(this.speed, Math.sqrt(Math.max(0, 2 * this.brakeA * left))) : 0
      if (left <= 0.05 || this.speed < 0.3) this.arriveStation(st)
    } else this.speed = base * k
    const moving = this.speed > 0
    if (moving) this.worldT += h
    if (this.phase === 'run') this.runT += h

    const sPrev = this.dist
    this.dist += this.speed * h
    const dist = this.dist
    this.track.ensure(dist, clamp(this.runT / RAMP_S), base, this.ridePace())
    if (moving) moveObstacles(this.obstacles, this.obstacles.length, dist, h)
    this.nNear = this.track.near(dist - NEAR_BACK, dist + NEAR_AHEAD, this.near)

    p.t += h
    if (p.shield > 0) p.shield = Math.max(0, p.shield - h)
    if (p.stumbleT > 0) p.stumbleT = Math.max(0, p.stumbleT - h)

    if (this.phase === 'ride') this.rideTick(h)
    else if (this.phase === 'run' || this.phase === 'resume' || this.phase === 'brake') {
      const shielded = p.shield > 0
      const hit = stepPlayer(p, h, this.near, this.nNear, sPrev, dist, shielded)
      if (shielded) this.ghostOverlaps()
      if (hit === 2) this.hitFront()
      else if (hit === 1) this.stumble()
      else this.countMoves(h)
    } else if (this.phase === 'crash') {
      if (this.crashT >= REVIVE.slowmo) this.afterCrash()
    }

    this.collect()
    this.checkGates()
    if (this.phase === 'run' || this.phase === 'resume') this.checkStations()
    this.updateShovqin(h)
    this.updatePowers()
    this.updateBiome()
    this.updateState()
    if (this.coins.head % 16 === 0 || dist - (this._recycledAt || 0) > 20) {
      this._recycledAt = dist
      this.track.recycle(dist)
      this.pickups = this.track.pickups
    }
  }

  /* what the missions count: barriers rolled under, metres run on carriage roofs */
  countMoves(h) {
    const p = this.player
    if (!p.air && p.y > 3.0) this.stats.roofM += this.speed * h
    for (let i = 0; i < this.nNear; i++) {
      const o = this.near[i]
      if (o.type !== 'high' || o.passed || o.z + o.len > this.dist) continue
      o.passed = true
      if (p.rollT > 0 && Math.abs(LANE_X[o.lane] - p.x) < 1.2) this.stats.rolls++
    }
  }

  /* obstacles Toby passes through under a shield never hit him afterwards */
  ghostOverlaps() {
    const p = this.player
    for (let i = 0; i < this.nNear; i++) {
      const o = this.near[i]
      if (!o.ghost && solidHit(o, p.x, p.y, 1.0, this.dist)) o.ghost = true
    }
  }

  /* ── hits ───────────────────────────────────────────────────────── */

  stumble() {
    const p = this.player
    this.fx.hitT = this.clock
    if (this.shovqin.on && this.clock < this.shovqin.until) { this.hitFront(true); return }
    p.stumbleT = 0.3
    this.shovqin.on = true
    this.shovqin.until = this.clock + SHOVQIN_TIME
    this.sfx('bump')
    this.set({ shovqin: true })
    this.stats.stumbles++
  }

  hitFront() {
    const p = this.player
    this.fx.hitT = this.clock
    if (this.powers.gilam > this.clock) {
      // the flying carpet takes the crash
      this.powers.gilam = 0
      p.shield = REVIVE.shield
      this.ghostOverlaps()
      this.sfx('shield')
      this.toast({ kind: 'gilam' })
      return
    }
    this.phase = 'crash'
    this.crashT = 0
    this.stats.crashes++
    p.state = 'crash'
    p.t = 0
    this.sfx('crash')
    this.set({ phase: 'crash' })
  }

  afterCrash() {
    this.phase = 'revive'
    this.speed = 0
    const offered = this.director?.onCrash()
    if (!offered) this.gameOver('crash')
  }

  /* back on his feet: whatever he hit is passed through, 2 s shield, Shovqin gone */
  revive() {
    const p = this.player
    this.revives++
    this.ghostOverlaps()
    for (let i = 0; i < this.nNear; i++) {
      const o = this.near[i]
      if (Math.abs(LANE_X[o.lane] - p.x) < 1.5 && o.z - (o.ramp || 0) < this.dist + 4) o.ghost = true
    }
    p.shield = REVIVE.shield
    p.air = false
    p.vy = 0
    p.y = groundAt(this.near, this.nNear, p.x, this.dist)
    p.state = 'stand'
    p.t = 0
    this.shovqin.on = false
    this.shovqin.puff = this.clock
    this.phase = 'resume'
    this.speedK = 0
    this.set({ phase: 'running', shovqin: false })
  }

  /* ── the balloon ride (§B3.3) ───────────────────────────────────── */

  /* an arch passed while running starts a ride; one passed while already in the air is let go.
     An arch coming into view gets its item early, so it can show the item's picture. */
  checkGates() {
    for (const g of this.gates) {
      if (!g.used && !g.item && this.director && g.s - this.dist < 110) g.item = this.director.reserve(g)
      if (g.used || g.s > this.dist) continue
      g.used = true
      // (also while speeding up again after a revive or a Bekat — an arch is never wasted)
      if ((this.phase === 'run' || this.phase === 'resume') && this.director) this.director.onGate(g)
    }
  }


  startRide({ pic = '', pt = '', kite = false, listen = false } = {}) {
    const p = this.player
    const r = this.ride
    this.phase = 'ride'
    r.phase = kite ? 'kite' : 'lift'
    r.t = 0
    r.y0 = p.y
    r.alt = p.y
    r.pic = pic
    r.pt = pt
    r.kite = kite
    r.listen = listen
    r.pop = -9
    p.air = true
    p.vy = 0
    p.rollT = 0
    p.jumping = false
    // air coins: arcs in two lanes, worth swiping for
    const lanes = [0, 1, 2].sort(() => this.rng() - 0.5).slice(0, kite ? 3 : 2)
    for (const lane of lanes) {
      const s0 = this.dist + 14 + this.rng() * 10
      for (let i = 0; i < (kite ? 9 : 5); i++) this.track.addCoin(LANE_X[lane], RIDE.alt + 0.45 + Math.sin(i / 4 * Math.PI) * 0.5, s0 + i * 2.6, true)
    }
    this.sfx('lift')
    this.set({ phase: 'ride' })
  }

  /* the moment is over: glide on until a safe landing slot shows up in Toby's lane */
  endRide() {
    const r = this.ride
    if (this.phase !== 'ride' || r.phase === 'seek' || r.phase === 'glide' || r.phase === 'descent') return
    r.phase = 'seek'
    r.seekT = 0
  }

  startKite() {
    const r = this.ride
    r.phase = 'kite'
    r.t = 0
    r.kite = true
    for (let i = 0; i < 12; i++) this.track.addCoin(LANE_X[this.player.lane], RIDE.alt + 0.9 + Math.sin(i / 3) * 0.4, this.dist + 10 + i * 2.6, true)
    this.toast({ kind: 'varrak' })
  }

  popBalloon(ok = true) {
    this.ride.pop = this.clock
    this.fx.popT = this.clock
    if (ok) {
      this.player.cheerT = this.clock
      // coin rain: a short shower right ahead
      for (let i = 0; i < 8; i++) this.track.addCoin(LANE_X[this.player.lane] + (this.rng() - 0.5) * 1.2, RIDE.alt - 0.4 - this.rng() * 1.8, this.dist + 4 + i * 1.4, true)
    }
  }

  rideTick(h) {
    const p = this.player
    const r = this.ride
    r.t += h
    if (p.laneT < 1) {
      p.laneT = Math.min(1, p.laneT + h / 0.15)
      p.x = p.fromX + (LANE_X[p.lane] - p.fromX) * easeOut(p.laneT)
    } else p.x = LANE_X[p.lane]
    const bob = this.reduced ? 0 : (Math.sin(this.clock * 2.4) + 1) * 0.07      // never below the ride altitude
    if (r.phase === 'lift') {
      const k = ease(clamp(r.t / RIDE.lift))
      p.y = r.y0 + (RIDE.alt - r.y0) * k
      if (r.t >= RIDE.lift) r.phase = 'hold'
    } else if (r.phase === 'hold') {
      p.y = RIDE.alt + bob
    } else if (r.phase === 'kite') {
      p.y = RIDE.alt + 0.6 + bob
      if (r.t >= VARRAK_TIME) { r.phase = 'seek'; r.seekT = 0 }
    } else if (r.phase === 'seek') {
      p.y += (RIDE.alt + bob - p.y) * Math.min(1, h * 3)
      r.seekT -= h
      if (r.seekT <= 0) {
        r.seekT = 0.1
        const v = Math.max(this.speed, 4)
        const need = v * RIDE.landFree
        const from = this.dist + Math.max(RIDE.landMin, v * RIDE.descent)
        const s = this.track.findLandingSlot(p.lane, from, this.dist + RIDE.landMax, need, this.baseSpeed())
        if (s >= 0) {
          r.land = s
          r.lane = p.lane
          r.start = s - v * RIDE.descent
          r.phase = 'glide'
        }
      }
    } else if (r.phase === 'glide') {
      p.y += (RIDE.alt + bob - p.y) * Math.min(1, h * 3)
      if (this.dist >= r.start) { r.phase = 'descent'; r.y0 = p.y; r.dStart = this.dist }
    }
    if (r.phase === 'descent') {
      const span = Math.max(0.5, r.land - r.dStart)
      const k = clamp((this.dist - r.dStart) / span)
      const g = groundAt(this.near, this.nNear, p.x, this.dist)
      p.y = Math.max(g, r.y0 + (g - r.y0) * ease(k))
      if (k >= 1 || (k > 0.6 && p.y <= g + 0.02)) this.land()
    }
    // Listen mode: Toby reaches the three balloons
    if (this.choices.length && this.choices[0].s <= this.dist && !this.choices[0].hit) {
      for (const c of this.choices) c.hit = true
      this.director?.choiceContact(p.lane)
    }
  }

  land() {
    const p = this.player
    const r = this.ride
    r.phase = 'none'
    r.kite = false
    this.choices.length = 0
    p.y = groundAt(this.near, this.nNear, p.x, this.dist)
    p.air = false
    p.vy = 0
    p.landed = 0.12
    p.shield = Math.max(p.shield, RIDE.shield)
    this.phase = 'run'
    this.fx.landT = this.clock
    this.sfx('land')
    this.set({ phase: 'running' })
    this.director?.onLanded()
  }

  /* Listen mode: three balloons, one per lane, ~3 s ahead */
  spawnChoices(options) {
    this.choices.length = 0
    const s = this.dist + Math.max(this.speed, 6) * 3.2
    options.forEach((o, lane) => this.choices.push({ lane, s, text: o.text, picture: o.picture, hit: false }))
  }

  /* how far a typical ride carries Toby, per m/s of running speed (the track spaces the arches with it) */
  ridePace() {
    const server = this.director?.serverMode
    return RIDE_GUESS[server ? 'server' : 'browser'] * (server ? RIDE.slowServer : RIDE.slow)
  }

  /* ── Bekat (§B3.4) ──────────────────────────────────────────────── */

  checkStations() {
    for (const st of this.stations) {
      if (st.used) continue
      if (this.dist > st.stop + 1) { st.used = true; continue }
      const v = this.speed
      const brakeDist = (v * BEKAT.brake) / 2
      if (this.dist >= st.stop - brakeDist - 0.05 && this.phase === 'run') {
        st.used = true
        this.phase = 'brake'
        this.braking = st
        this.brakeA = (v * v) / Math.max(0.5, 2 * (st.stop - this.dist))
      }
    }
  }

  arriveStation(st) {
    this.dist = Math.max(this.dist, st.stop)
    this.speed = 0
    this.speedK = 0
    this.phase = 'station'
    this.stationsDone++
    this.player.state = 'idle'
    this.player.t = 0
    this.sfx('brake')
    this.set({ phase: 'station' })
    if (this.director) this.director.onStation(st)
    else this.after(1, () => this.resumeFromStation())
  }

  resumeFromStation() {
    if (this.phase !== 'station') return
    this.phase = 'resume'
    this.speedK = 0
    this.set({ phase: 'running' })
  }

  /* ── coins, pickups, powers, Shovqin ────────────────────────────── */

  addCoins(n) {
    this.coinsGot += n * (this.powers.x2 > this.clock ? 2 : 1)
  }

  collect() {
    const p = this.player
    const c = this.coins
    const magnet = this.powers.magnet > this.clock
    const cy = p.y + 0.5
    let got = 0
    for (let i = 0; i < c.cap; i++) {
      if (!c.alive[i]) continue
      const ds = c.s[i] - this.dist
      if (ds > 6 || ds < -1) continue
      const close = Math.abs(ds) < 0.9 && Math.abs(c.x[i] - p.x) < 1.0 && Math.abs(c.y[i] - cy) < 1.15
      if (close || (magnet && ds < 5.5 && Math.abs(c.y[i] - cy) < 3)) {
        c.alive[i] = 0
        got++
      }
    }
    if (got) {
      this.addCoins(got)
      if (this.clock - this.fx.coinT > 0.07) this.sfx('coin')
      this.fx.coinT = this.clock
    }
    for (const u of this.pickups) {
      if (!u.alive || Math.abs(u.s - this.dist) > 0.9 || Math.abs(LANE_X[u.lane] - p.x) > 1.0 || p.y > 2.6) continue
      u.alive = false
      this.pickup(u.type)
    }
  }

  pickup(type) {
    const up = this.upgrades || {}
    this.fx.powerT = this.clock
    if (type === 'token') { this.sfx('token'); this.director?.onToken(); return }
    // shop upgrades, 5 levels each (§B7): Magnit 6 → 12 s · x2 8 → 16 s · Gilam 8 → 14 s
    if (type === 'magnet') this.power('magnet', 6 + Math.min(5, up.magnet || 0) * 1.2)
    else if (type === 'x2') this.power('x2', 8 + Math.min(5, up.x2 || 0) * 1.6)
    else if (type === 'gilam') this.power('gilam', 8 + Math.min(5, up.gilam || 0) * 1.2)
    this.sfx('power')
  }

  power(name, sec) {
    if (name === 'magnet') this.stats.magnets++
    this.powers[name] = Math.max(this.powers[name], this.clock) + sec
    this.updatePowers(true)
  }

  updatePowers(force = false) {
    const t = this.clock
    const key = (this.powers.magnet > t ? 4 : 0) | (this.powers.x2 > t ? 2 : 0) | (this.powers.gilam > t ? 1 : 0)   // no string per step
    if (key === this.last.powers && !force) return
    this.last.powers = key
    this.set({ powers: { magnet: this.powers.magnet > t ? this.powers.magnet : 0, x2: this.powers.x2 > t ? this.powers.x2 : 0, gilam: this.powers.gilam > t ? this.powers.gilam : 0, at: t } })
  }

  blowShovqin() {
    if (!this.shovqin.on) return
    this.shovqin.on = false
    this.shovqin.puff = this.clock
    this.fx.puffT = this.clock
    this.stats.puffs++
    this.set({ shovqin: false })
    this.sfx('puff')
  }

  updateShovqin(h) {
    const s = this.shovqin
    if (s.on && this.clock >= s.until) { s.on = false; this.set({ shovqin: false }) }
    const goal = s.on ? 1 : 0
    s.k += (goal - s.k) * Math.min(1, h * (s.on ? 2.5 : 4))
  }

  updateBiome() {
    const b = this.biome
    const idx = this.track.biomeAt(this.dist)
    b.key = BIOMES[idx]
    b.next = b.key
    b.blend = 0
    for (const st of this.stations) {
      const ahead = st.stop - this.dist
      if (ahead > 0 && ahead < 80) {
        b.next = BIOMES[st.biome]
        b.blend = clamp(1 - ahead / 80)
        break
      }
    }
  }

  /* Toby's animation state for the renderer */
  updateState() {
    const p = this.player
    let s
    if (this.phase === 'crash' || this.phase === 'revive') s = 'crash'
    else if (this.phase === 'ride') s = this.clock - p.cheerT < 0.9 ? 'cheer' : 'ride'
    else if (this.phase === 'station') s = this.clock - p.cheerT < 1.2 ? 'cheer' : 'idle'
    else if (p.stumbleT > 0) s = 'stumble'
    else if (p.rollT > 0) s = 'roll'
    else if (p.air) s = p.vy > 0 ? 'jump' : 'fall'
    else if (p.landed > 0) s = 'land'
    else if (this.phase === 'resume' && p.state === 'stand' && p.t < 0.5) s = 'stand'
    else s = 'run'
    if (s !== p.state) { p.state = s; p.t = 0 }
  }

  /* ── end ────────────────────────────────────────────────────────── */

  gameOver(reason = 'crash') {
    if (this.status === 'over') return
    this.status = 'over'
    this.over = reason
    this.speed = 0
    this.director?.abort()
    this.sfx('over')
    this.set({ phase: 'over', paused: false })
    const summary = this.summary()
    this.after(reason === 'quit' ? 0.2 : 1.4, () => this.hooks.finish?.(summary))
  }

  meters() { return Math.max(0, Math.floor(this.dist)) }

  summary() {
    const d = this.director
    return {
      level: this.level,
      mode: d?.listenMode ? 'listen' : this.noWorld ? 'card' : 'voice',
      stt: d?.serverMode ? 'server' : 'browser',
      distance_m: this.meters(),
      duration_s: Math.max(1, Math.round(this.clock - this.playStart)),
      coins: this.coinsGot,
      revives: this.revives,
      stations: this.stationsDone,
      clips: d?.clips || 0,
      outcomes: d ? d.outcomes.slice() : [],
      points: d?.points || 0,
      passes: d?.passes || 0,
      score_client: this.score(),
      reason: this.over,
      stats: { ...this.stats, balloons: d?.balloons || 0 },
    }
  }

  score() {
    const d = this.director
    return liveScore(d?.points || 0, d?.passes || 0, this.meters(), this.level)
  }

  stats = { crashes: 0, stumbles: 0, puffs: 0, rolls: 0, roofM: 0, magnets: 0, perfect: 0 }

  /* ── page plumbing ──────────────────────────────────────────────── */

  set(patch) { this.hooks.set?.(patch) }

  sfx(name) { if (!this.attract) this.hooks.sfx?.(name) }

  toast(t) { this.set({ toast: { ...t, id: Math.round(this.clock * 1000) } }) }

  /* per-frame numbers straight into the DOM (no React render per frame) */
  writeHud() {
    const ui = this.ui
    if (!ui) return
    const hud = this.hud
    const score = this.score()
    if (score !== hud.score && ui.score?.current) { hud.score = score; ui.score.current.textContent = score.toLocaleString('en-US') }
    if (this.coinsGot !== hud.coins && ui.coins?.current) { hud.coins = this.coinsGot; ui.coins.current.textContent = String(this.coinsGot) }
    const m = this.meters()
    if (m !== hud.dist && ui.dist?.current) { hud.dist = m; ui.dist.current.textContent = `${m} m` }
    const bar = this.director ? this.director.barFrac() : -1
    const q = bar < 0 ? -1 : Math.round(bar * 200) / 200
    if (q !== hud.bar && ui.bar?.current) {
      hud.bar = q
      ui.bar.current.style.transform = `scaleX(${Math.max(0, q)})`
      ui.bar.current.dataset.low = q >= 0 && q < 0.3 ? '1' : '0'
    }
  }
}

export { VIEW }
