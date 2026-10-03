/*
 * VOICE DRIVE engine — the world simulation and the event director, no React.
 *
 * Everything runs on the game's own clock (advanced by the render loop), so
 * pausing freezes the road, the countdown and every scheduled step at once.
 * The page talks to it through `hooks` (UI state, speech, voice, sounds) and the
 * renderer reads the world fields when drawing. Per-frame numbers (score,
 * distance, coins, fuel, countdown bar) are written straight into DOM nodes via
 * `ui` refs — no React render per frame.
 *
 * One event = one spoken command:
 *   (intro: the model voice says it first, mic closed) → open → listen
 *   (continuous, hands-free) → ok: the car does it at once · wrong / too late:
 *   ✗, a life lost, the model voice says the line, and the same command comes
 *   back next. Bonus events (turbo, passenger) cost no life when missed.
 *
 * Speech on the server (no browser recogniser): the window is longer, every
 * phrase is judged as it comes back, and when time runs out while a phrase is
 * still being transcribed the car waits in front of the obstacle for it.
 */
import { FATAL } from '../../../games/voice/useSpeech'
import { BONUS, LIVES, evaluate, formatDistance, missionValue, rivalNamed, starsFor } from './content'
import { THEME_ORDER } from './art'

export const CAR_Z = 6            // camera → car distance (world units; a lane is 1 unit wide)
export const Z_FAR = 150          // draw distance
export const LANE_X = [-1, 0, 1]
export const METERS_PER_UNIT = 2
const GRACE = 0.35                // seconds between the countdown running out and the obstacle reaching the car
const HIT_GAP = 1.4               // an obstacle "hits" when it is this far in front of the car
const STOP_GAP = 2.0              // the car stops this far before a stop line
const APPROACH = 0.75             // while a command is open the road eases down, so what is ahead is close enough to see
const SERVER_EXTRA = 2.5          // extra seconds per line when speech is transcribed on the server
const SERVER_TAIL = 6             // a server listen may run this long past the deadline (the engine ends it)
const JUDGE_MAX = 6               // the longest the car waits for the server's answer
const WRONG_HOLD = 0.45           // a live (interim) guess naming another command must last this long to count
const ZONE_LEN = 300              // a theme lasts 600 m
const TUNNEL_LEN = 26
const FUEL_PER_UNIT = 0.075       // a full tank lasts ≈ 2.6 km
const FUEL_LOW = 28

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

const BLOCKERS = {
  easy: ['cones', 'works', 'truck'],
  medium: ['truck', 'works', 'cones', 'truck'],
  hard: ['truck', 'works', 'truck', 'cones'],
}
const DEFAULT_CAR = { id: 'klassik', color: '#b3122e', engine: 1, turbo: 1, speedMul: 1, windowMul: 1, windowAdd: 0, scoreMul: 1, magnet: false, shield: 0, turboDur: 5 }

export class DriveGame {
  constructor({ level, hooks, ui, reduced = false, car = null, missions = [], best = 0, hearFirst = false }) {
    this.level = level
    this.hooks = hooks
    this.ui = ui
    this.reduced = reduced
    this.carSetup = { ...DEFAULT_CAR, ...(car || {}) }
    this.best = best || 0
    this.hearFirst = !!hearFirst

    this.clock = 0
    this.playTime = 0
    this.status = 'ready'            // ready | countdown | running | over
    this.paused = false
    this.halted = false

    this.dist = 0
    this.startDist = 0
    this.v = 3
    this.braking = false
    this.motion = { kind: 'cruise' }
    this.speedMod = 1
    this.speedModUntil = 0

    this.car = { lane: 1, x: 0, from: 0, to: 0, laneT0: -9, y: 0, rot: 0, sx: 1, jx: 0, jumpT0: -9, fx: null }
    this.camX = 0

    this.objects = []
    this.decals = []
    this.particles = []
    this.timers = []

    // themes: the level's own first, then the rest in order, one zone every 600 m
    const first = THEME_ORDER.indexOf(level.theme)
    this.themeSeq = first >= 0 ? [...THEME_ORDER.slice(first), ...THEME_ORDER.slice(0, first)] : THEME_ORDER
    this.zones = [{ from: -1e9, theme: this.themeSeq[0] }]
    this.zoneShown = 0
    this.lightsOn = false
    this.tunnelDark = 0
    this.fuel = 100
    this.shield = this.carSetup.shield
    this.coinsX2Until = -9

    this.ev = null
    this.evSeq = 0
    this.evKey = 0
    this.queue = []
    this.history = []
    this.used = {}
    this.tries = {}                  // line → failed tries in a row (a "Go" in between does not reset "Stop")
    this.waiting = null

    this.lives = LIVES
    this.points = 0
    this.coins = 0
    this.streak = 0
    this.mult = 1
    this.stats = { ok: 0, fail: 0, skip: 0, miss: 0, perfect: 0, done: 0, cmds: {} }
    this.mstat = { actions: {}, maxMult: 1, pickups: 0, turbos: 0, cleanFrom: 0, cleanBest: 0 }
    this.missions = (missions || []).map(m => ({ ...m, value: 0, done: false }))
    this.missionKey = ''
    this.nextCheck = 0
    this.bestBeaten = false
    this.fx = { flashT0: -9, shakeT0: -9, shakePow: 0, boostUntil: -9, honkT0: -9, okT0: -9, shieldT0: -9, confettiT0: -9, goldT0: -9 }
    this.hud = {}
    this.serverMode = false          // speech goes to the server (no browser recogniser): slower answers
  }

  /* ── public API (called by the page) ─────────────────────────────── */

  /* The recogniser lives on the server: give more time, and wait for its answer before judging. */
  setServerMode(on) {
    this.serverMode = !!on
  }

  start() {
    if (this.status !== 'ready' || this.halted) return
    this.status = 'countdown'
    // the HUD starts from the car's own numbers (the Jip's shield shows from the start)
    this.hooks.set({ phase: 'countdown', count: 3, lives: this.lives, shield: this.shield })
    this.sfx('count')
    // ended from the pause menu during the countdown: none of these may run any more
    const counting = (fn) => () => { if (this.status === 'countdown') fn() }
    this.after(0.8, counting(() => { this.hooks.set({ count: 2 }); this.sfx('count') }))
    this.after(1.6, counting(() => { this.hooks.set({ count: 1 }); this.sfx('count') }))
    this.after(2.4, counting(() => {
      this.status = 'running'
      this.startDist = this.dist
      this.playTime = 0
      this.mstat.cleanFrom = 0
      this.hooks.set({ phase: 'running', count: 'GO' })
      this.sfx('go')
    }))
    this.after(3.1, () => this.hooks.set({ count: null }))
    this.after(3.5, () => this.openNext())
    this.pushMissions(true)
  }

  pause() {
    if (this.paused || this.halted || this.status === 'over' || this.status === 'ready') return
    this.paused = true
    this.hooks.stopListening()
    this.hooks.stopVoice()
    this.hooks.set({ paused: true, saying: false })
  }

  resume() {
    if (!this.paused || this.halted) return
    this.paused = false
    this.hooks.set({ paused: false, fatal: '' })
    const ev = this.ev
    if (ev && (ev.phase === 'open' || ev.phase === 'judging')) {
      ev.phase = 'open'
      this.reopen(ev)
    }
  }

  /* End the run now (pause menu): the coins of the run still count. */
  quit() {
    if (this.halted || this.status === 'over' || this.status === 'ready') return
    this.paused = false
    this.hooks.set({ paused: false })
    this.gameOver()
  }

  /* Leaving the page: stop the mic, the voice and every scheduled step. */
  halt() {
    this.halted = true
    this.timers = []
    this.hooks.stopListening()
    this.hooks.stopVoice()
  }

  /*
   * The mic button during play. Not listening (the recogniser stopped): listen again.
   * Listening in server mode: "I have finished" — send what was said now.
   */
  kickListen() {
    const ev = this.ev
    if (this.halted || this.paused || !ev || ev.phase !== 'open') return
    if (this.hooks.isListening?.()) {
      if (this.serverMode && !this.hooks.isBusy?.()) this.hooks.finishListening()
      return
    }
    const ms = (ev.deadline - this.clock) * 1000
    if (ms > 500) this.listenFor(ev, ms)
  }

  /* After two failed tries the learner may skip: the car does it by itself, no points. */
  skip() {
    const ev = this.ev
    if (this.halted || this.paused || !ev || ev.phase !== 'open') return
    ev.phase = 'skip'
    this.hooks.stopListening()
    this.streak = 0
    this.mult = 1
    this.stats.skip++
    this.cmdStat(ev.cmd).skip++
    delete this.tries[ev.cmd.text]
    this.queue = this.queue.filter(q => q.cmd.text !== ev.cmd.text)
    this.hooks.set({ card: { mode: 'skip', id: ev.id, text: ev.cmd.text, action: ev.action }, mult: 1 })
    this.perform(ev)
  }

  /* Speech in: interim / final alternatives. Returns true when this listen should end. */
  heard(id, alts) {
    const ev = this.ev
    if (this.halted || this.paused || !ev || ev.id !== id || (ev.phase !== 'open' && ev.phase !== 'judging')) return false
    if (!alts || !alts.length) return false
    ev.lastAlts = alts
    ev.heardAt = this.clock
    const r = evaluate(this.level, ev.cmd, alts)
    // server phrases (and anything heard after time is up) are final; the browser's live guesses are not
    const final = this.serverMode || ev.phase === 'judging'
    if (r.status === 'ok') {
      // "left … right" for a Right card: the other command was said first and is still there
      if (ev.wrongAt != null && rivalNamed(this.level, ev.cmd, alts[0]) === ev.wrongR?.wrong) { this.fail('wrong', ev.wrongR); return true }
      this.succeed(r)
      return true
    }
    if (r.status === 'wrong') {
      if (final) { this.fail('wrong', r); return true }
      // a live guess can still change ("right" → "lights on"): it counts once it has lasted WRONG_HOLD (frame())
      if (ev.wrongAt == null || ev.wrongR?.wrong !== r.wrong) ev.wrongAt = this.clock
      ev.wrongR = r
      return false
    }
    ev.wrongAt = null
    ev.wrongR = null
    // server mode: each phrase is a finished recording — end it; a fresh listen takes the next phrase
    return final
  }

  /* The recogniser stopped (silence, a phrase judged, network…): decide, or listen again while time is left. */
  listenEnded(id, alts, error) {
    const ev = this.ev
    if (this.halted || this.paused || !ev || ev.id !== id || (ev.phase !== 'open' && ev.phase !== 'judging')) return
    if (error && FATAL.has(error)) { this.fatal(error); return }
    if (error === 'retry') {
      // the browser's recogniser just failed and the server takes over: this line starts again, no penalty
      this.serverMode = true
      ev.phase = 'open'
      this.reopen(ev)
      // after reopen(): the hint belongs to the card's new id
      this.hooks.set({ hint: { id: ev.id, text: 'Qaytadan ayting' } })
      return
    }
    if (ev.phase === 'judging') {
      // the server could not transcribe the answer: not the learner's fault — this line starts again once, no penalty
      if (error === 'server-failed' && !(alts && alts.length) && !ev.serverRetry) {
        ev.serverRetry = true
        ev.phase = 'open'
        this.reopen(ev)
        this.hooks.set({ hint: { id: ev.id, text: 'Qaytadan ayting' } })
        return
      }
      this.decide(ev, alts)
      return
    }
    if (alts && alts.length) {
      // the final words of this listen: judged like heard(), but a guess naming another command counts at once
      ev.lastAlts = alts
      const r = evaluate(this.level, ev.cmd, alts)
      if (r.status === 'ok') {
        if (ev.wrongAt != null && rivalNamed(this.level, ev.cmd, alts[0]) === ev.wrongR?.wrong) { this.fail('wrong', ev.wrongR); return }
        this.succeed(r)
        return
      }
      if (r.status === 'wrong') { this.fail('wrong', r); return }
      ev.wrongAt = null             // the live guess was revised: nothing else was said
      ev.wrongR = null
    }
    if (ev.deadline - this.clock > 0.7 && ev.restarts < 12) {
      ev.restarts++
      this.after(0.12, () => {
        // (the learner may have tapped the mic meanwhile — that listen is already on)
        if (this.ev === ev && ev.id === id && ev.phase === 'open' && !this.paused && !this.hooks.isListening?.()) this.listenFor(ev, (ev.deadline - this.clock) * 1000)
      })
    }
  }

  score() {
    return this.points + Math.floor(this.meters() / 10)
  }

  meters() {
    return this.status === 'running' || this.status === 'over' ? Math.max(0, this.dist - this.startDist) * METERS_PER_UNIT : 0
  }

  /* The theme at a world position, and the next zone boundary after it (renderer). */
  themeAt(pos) {
    const z = this.zones
    for (let i = z.length - 1; i >= 0; i--) if (pos >= z[i].from) return z[i].theme
    return z[0].theme
  }

  nextZone(pos) {
    for (const zn of this.zones) if (zn.from > pos) return zn
    return null
  }

  /* Numbers the missions are judged on. */
  missionStats() {
    const clean = Math.max(this.mstat.cleanBest, this.meters() - this.mstat.cleanFrom)
    return {
      actions: this.mstat.actions, coins: this.coins, clean, meters: this.meters(), maxMult: this.mstat.maxMult,
      perfect: this.stats.perfect, pickups: this.mstat.pickups, turbos: this.mstat.turbos,
    }
  }

  /* ── frame ───────────────────────────────────────────────────────── */

  frame(dt) {
    if (this.halted || this.paused) return
    dt = Math.min(Math.max(dt, 0), 0.05)
    const before = this.dist
    this.clock += dt
    if (this.status === 'running') this.playTime += dt
    this.updateMotion(dt)
    this.updateCar(dt)
    this.updateObjects(dt)
    this.updateWorld(dt, this.dist - before)
    this.runTimers()
    const ev = this.ev
    if (ev && ev.phase === 'open') {
      if (ev.wrongAt != null && this.clock - ev.wrongAt >= WRONG_HOLD) {
        // a live guess naming another command ("turn right" on a Turn left card) that stayed: it was said
        this.fail('wrong', ev.wrongR)
      } else if (this.clock >= ev.deadline) {
        // a phrase still at the server (or a server listen): wait for the answer
        if (this.serverMode || this.hooks.isBusy?.()) this.judge(ev)
        else {
          const r = evaluate(this.level, ev.cmd, ev.lastAlts)
          this.fail(r.status === 'wrong' ? 'wrong' : 'timeout', r)
        }
      }
    }
    if (ev && ev.phase === 'judging' && !ev.flushed && !this.hooks.isBusy?.()) {
      // nothing on its way to the server any more: stop the recorder (its tail is transcribed), or decide now
      ev.flushed = true
      if (!this.hooks.finishListening()) this.decide(ev, null)
    }
    if (this.clock >= this.nextCheck) {
      this.nextCheck = this.clock + 0.3
      this.checkMissions()
      this.checkBest()
    }
    this.writeHud()
  }

  /*
   * Server mode, time is up: the last words may still be on their way to the
   * server. The car brakes in front of what is ahead and waits (≤ 6 s) for the
   * final transcript, then the line is judged as usual.
   */
  judge(ev) {
    ev.phase = 'judging'
    ev.flushed = false
    const id = ev.id
    this.hooks.set({ card: { mode: 'judging', id, text: ev.cmd.text, action: ev.action } })
    if (!ev.held) {
      const stopAt = ev.pos - CAR_Z - STOP_GAP
      const D = stopAt - this.dist
      if (D > 0.3) this.tweenTo(stopAt, clamp((2 * D) / Math.max(this.v, 1), 0.3, 1.2), 0)
      else { this.motion = { kind: 'hold' }; this.v = 0 }
    }
    this.after(JUDGE_MAX, () => {
      if (this.ev === ev && ev.id === id && ev.phase === 'judging') {
        this.hooks.stopListening()
        this.fail('timeout', evaluate(this.level, ev.cmd, ev.lastAlts))
      }
    })
  }

  decide(ev, alts) {
    if (alts && alts.length) ev.lastAlts = alts
    const r = evaluate(this.level, ev.cmd, ev.lastAlts)
    if (r.status === 'ok') this.succeed(r)
    else this.fail(r.status === 'wrong' ? 'wrong' : 'timeout', r)
  }

  listenFor(ev, ms) {
    const tail = this.serverMode ? SERVER_TAIL * 1000 : 250
    this.hooks.listen(ev.id, Math.max(400, ms + tail))
  }

  after(sec, fn) {
    this.timers.push({ at: this.clock + sec, fn })
  }

  runTimers() {
    if (!this.timers.length) return
    const due = []
    this.timers = this.timers.filter(tm => {
      if (tm.at <= this.clock) { due.push(tm); return false }
      return true
    })
    due.sort((a, b) => a.at - b.at)
    for (const tm of due) {
      if (this.halted) return
      tm.fn()
    }
  }

  cruise() {
    const turbo = this.clock < this.coinsX2Until ? 1.6 : 1
    return this.level.speed * this.carSetup.speedMul * (1 + Math.min(0.4, this.stats.done * 0.012)) * this.speedMod * turbo
  }

  /* Seconds to say the line, and how far ahead (world units) its obstacle starts. */
  windowSec() {
    const base = this.level.window * Math.max(0.72, 1 - this.stats.done * 0.015) * this.carSetup.windowMul + this.carSetup.windowAdd
    return base + (this.serverMode ? SERVER_EXTRA : 0)
  }

  spawnDistance(win) {
    const base = win - (this.serverMode ? SERVER_EXTRA : 0)
    // ≥ half the cruise distance keeps the approach curve monotonic (no rolling backwards)
    return this.cruise() * Math.max(APPROACH * (base + GRACE), 0.5 * (win + GRACE))
  }

  /* Move the camera to `p1` in T seconds, ending at speed v1 (cubic Hermite: no jumps in position or speed). */
  tweenTo(p1, T, v1, onDone) {
    const D = p1 - this.dist
    if (D <= 0.01) {
      this.motion = { kind: v1 > 0.01 ? 'cruise' : 'hold' }
      if (v1 <= 0.01) this.v = 0
      onDone?.()
      return
    }
    const v0 = Math.max(0, this.v)
    const t = Math.max(0.12, Math.min(T, (2.8 * D) / Math.max(v0, v1, 0.01)))   // keeps the curve monotonic
    this.motion = { kind: 'tween', t0: this.clock, T: t, p0: this.dist, p1, v0, v1, onDone }
  }

  updateMotion(dt) {
    const m = this.motion
    const prev = this.v
    if (m.kind === 'tween') {
      const s = clamp((this.clock - m.t0) / m.T)
      const s2 = s * s
      const s3 = s2 * s
      const { p0, p1, v0, v1, T } = m
      this.dist = (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * T * v0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * T * v1
      this.v = Math.max(0, ((6 * s2 - 6 * s) * p0 + (3 * s2 - 4 * s + 1) * T * v0 + (-6 * s2 + 6 * s) * p1 + (3 * s2 - 2 * s) * T * v1) / T)
      if (s >= 1) {
        this.dist = p1
        this.v = v1
        this.motion = { kind: v1 > 0.01 ? 'cruise' : 'hold' }
        m.onDone?.()
      }
    } else if (m.kind === 'hold') {
      this.v = 0
    } else {
      const target = this.status === 'running' ? this.cruise() : this.status === 'over' ? 0 : 3
      if (this.v < target) this.v = Math.min(target, this.v + 11 * dt)
      else this.v = Math.max(target, this.v - Math.max(5, (this.v - target) * 2.5) * dt)
      this.dist += this.v * dt
    }
    this.braking = (prev - this.v) / Math.max(dt, 1e-3) > 2.5 || (this.v < 0.3 && this.status !== 'ready')
    if (this.speedMod !== 1 && this.clock >= this.speedModUntil) this.speedMod = 1
  }

  updateCar(dt) {
    const c = this.car
    const t = this.clock
    const lp = clamp((t - c.laneT0) / 0.3)
    c.x = c.from + (c.to - c.from) * easeInOut(lp)
    let rot = lp < 1 ? Math.sin(lp * Math.PI) * Math.sign(c.to - c.from) * 0.1 : 0
    const jp = (t - c.jumpT0) / 0.75
    let y = jp >= 0 && jp <= 1 ? Math.sin(jp * Math.PI) * 1.2 : 0
    let sx = 1
    let jx = 0
    const f = c.fx
    if (f) {
      const ft = t - f.t0
      if (f.kind === 'hit') {
        if (ft < 0.9) { const k = Math.exp(-ft * 4); rot += Math.sin(ft * 34) * 0.22 * k; jx = Math.sin(ft * 47) * 0.07 * k } else c.fx = null
      } else if (f.kind === 'spin') {
        if (ft < 1.1) { const a = easeInOut(ft / 1.1) * Math.PI * 2; sx = Math.cos(a); rot += Math.sin(a) * 0.12; this.smoke(0.7) } else c.fx = null
      } else if (f.kind === 'bounce') {
        if (ft < 0.9) { const k = 1 - ft / 0.9; y += Math.abs(Math.sin(ft * Math.PI * 3)) * 0.5 * k; rot += Math.sin(ft * 23) * 0.09 * k } else c.fx = null
      } else if (f.kind === 'nudge') {
        if (ft < 0.7) { const k = 1 - ft / 0.7; y += Math.abs(Math.sin(ft * Math.PI * 3)) * 0.12 * k } else c.fx = null
      } else if (f.kind === 'skid') {
        const dur = f.dur || 0.8
        if (ft < dur) { const k = 1 - ft / dur; rot += Math.sin(ft * 38) * 0.05 * k; jx = Math.sin(ft * 61) * 0.03 * k; this.smoke(0.8) } else c.fx = null
      } else if (f.kind === 'hop') {
        if (ft < 0.5) { y += Math.sin((ft / 0.5) * Math.PI) * 0.25 } else c.fx = null
      }
    }
    if (Math.abs(sx) < 0.1) sx = sx < 0 ? -0.1 : 0.1
    c.y = y
    c.sx = sx
    c.rot = this.reduced ? rot * 0.4 : rot
    c.jx = this.reduced ? 0 : jx
    this.camX += (c.x * 0.45 - this.camX) * Math.min(1, dt * 4)
  }

  updateObjects(dt) {
    const t = this.clock
    const car = this.car
    const objs = this.objects
    const magnet = this.carSetup.magnet
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i]
      const z = o.pos - this.dist
      if (o.kind === 'coin' && !o.done) {
        // the van pulls coins in from the next lanes
        if (magnet && z < CAR_Z + 9 && Math.abs(o.x - car.x) < 1.7) o.x += (car.x - o.x) * Math.min(1, dt * 7)
        if (z <= CAR_Z + 0.25) {
          o.done = true
          if (Math.abs(o.x - car.x) < (magnet ? 0.9 : 0.55) && car.y < 0.9) {
            const n = t < this.coinsX2Until ? 2 : 1
            this.coins += n
            this.points += 5 * n
            this.sfx('coin')
            for (let k = 0; k < 5; k++) {
              this.particles.push({ kind: 'spark', x: o.x + rand(-0.15, 0.15), h: 0.5, pos: this.dist + CAR_Z + 0.3, vx: rand(-1, 1), vh: rand(1, 2.5), g: 4, size: 0.06, grow: 0, life: 0.5, max: 0.5, follow: true })
            }
            objs.splice(i, 1)
            continue
          }
        }
      }
      if (o.kind === 'ped' && o.walkT0 != null) {
        const p = clamp((t - o.walkT0) / (o.walkDur || 2.2))
        o.x = o.x0 + (o.x1 - o.x0) * p
        o.bob = p > 0 && p < 1 ? Math.abs(Math.sin(p * 16)) * 0.05 : 0
      }
      if (o.kind === 'passenger' && o.walkT0 != null && !o.gone) {
        const p = clamp((t - o.walkT0) / 1.1)
        o.x = o.x0 + (car.x + 0.2 - o.x0) * p
        o.pos = o.pos0 + (this.dist + CAR_Z + 0.4 - o.pos0) * p
        o.bob = Math.abs(Math.sin(p * 14)) * 0.05
        if (p >= 1) o.gone = true
      }
      if (o.kind === 'animal' && o.flee) {
        const ft = t - o.flee.t0
        if (ft > 0) {
          o.x += o.flee.dir * o.flee.speed * dt
          o.hop = Math.abs(Math.sin(ft * (o.v === 'cow' ? 9 : 14))) * (o.v === 'cow' ? 0.12 : 0.2)
          if (Math.abs(o.x) > 4.5) o.fade = clamp(1 - (Math.abs(o.x) - 4.5) / 1.5)
        }
      }
      if (o.kind === 'rail') {
        if (o.openT0 != null) o.angle = Math.min(Math.PI / 2, o.angle + dt * 2)
        else if (!o.frozen) o.angle = (1 - clamp((t - o.closeStart) / (o.closeEnd - o.closeStart))) * (Math.PI / 2)
        o.flashing = o.openT0 == null && t >= o.closeStart - 0.8
      }
      if (o.fly && t - o.fly.t0 > 0.9) { objs.splice(i, 1); continue }
      if (z < (o.kind === 'station' || o.kind === 'landmark' ? -2 : 0.6)) objs.splice(i, 1)
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i]
      if (d.pos + (d.len || 0.5) - this.dist < (d.kind === 'tunnel' ? -1 : 0.5)) this.decals.splice(i, 1)
    }
    const ps = this.particles
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]
      p.life -= dt
      if (p.life <= 0 || p.pos - this.dist < 0.8) { ps.splice(i, 1); continue }
      p.x += p.vx * dt
      p.h += p.vh * dt
      p.vh -= (p.g || 0) * dt
      if (p.h < 0) { p.h = 0; p.vh *= -0.3 }
      p.size += (p.grow || 0) * dt
      if (p.follow) p.pos += this.v * dt
    }
  }

  /* Themes, the tunnel's darkness and the fuel tank. */
  updateWorld(dt, moved) {
    // keep the next zone scheduled well beyond the draw distance
    const last = this.zones[this.zones.length - 1]
    if (this.status !== 'ready' && last.from < this.dist + Z_FAR + 60) {
      const from = Math.max(this.dist + Z_FAR + 60, (last.from < 0 ? this.dist : last.from) + ZONE_LEN)
      this.zoneCount = (this.zoneCount || 0) + 1
      const theme = this.themeSeq[this.zoneCount % this.themeSeq.length]
      this.zones.push({ from, theme })
      if (this.zones.length > 4) this.zones.splice(0, this.zones.length - 4)
      this.hooks.warm?.(theme)
    }
    // a new theme reached the car: say so
    const zi = this.zones.findIndex((z, i) => this.dist + CAR_Z >= z.from && (i === this.zones.length - 1 || this.dist + CAR_Z < this.zones[i + 1].from))
    const zone = this.zones[zi]
    if (zone && zone.from > -1e8 && zone.from !== this.zoneShown && this.status === 'running') {
      this.zoneShown = zone.from
      this.hooks.set({ zone: { key: zone.from, theme: zone.theme } })
      const key = zone.from
      this.after(2.8, () => this.hooks.set(v => (v.zone?.key === key ? { zone: null } : {})))
    }
    // inside a tunnel?
    const carPos = this.dist + CAR_Z
    let inside = false
    for (const d of this.decals) {
      if (d.kind === 'tunnel' && carPos > d.pos + 0.5 && carPos < d.pos + d.len + 0.5) inside = true
    }
    const target = inside ? 1 : 0
    this.tunnelDark += (target - this.tunnelDark) * Math.min(1, dt * (inside ? 5 : 3))
    if (!inside && this.lightsOn && this.tunnelLightsUntil != null && carPos > this.tunnelLightsUntil) {
      this.lightsOn = false
      this.tunnelLightsUntil = null
    }
    // fuel: only while the run is on, never empty (the gas station event comes first)
    if (this.status === 'running' && moved > 0) {
      const pending = this.ev?.action === 'fuel' || this.queue.some(q => q.cmd.action === 'fuel')
      this.fuel = Math.max(pending ? 6 : 8, this.fuel - moved * FUEL_PER_UNIT)
    }
  }

  smoke(rate) {
    if (this.particles.length > 70 || Math.random() > rate) return
    const c = this.car
    this.particles.push({
      kind: 'smoke', x: c.x + (Math.random() < 0.5 ? -0.32 : 0.32), h: 0.1, pos: this.dist + CAR_Z - 0.05,
      vx: rand(-0.4, 0.4), vh: rand(0.3, 0.8), g: 0, size: 0.16, grow: 0.9, life: 0.8, max: 0.8,
    })
  }

  sparks(x, n = 10, color = '#fde047') {
    for (let k = 0; k < n; k++) {
      this.particles.push({ kind: 'spark', color, x: x + rand(-0.2, 0.2), h: rand(0.2, 0.6), pos: this.dist + CAR_Z + 0.4, vx: rand(-2.2, 2.2), vh: rand(1.5, 4), g: 9, size: 0.05, grow: 0, life: 0.6, max: 0.6, follow: true })
    }
  }

  writeHud() {
    const ui = this.ui
    if (!ui) return
    const score = this.score()
    const sEl = ui.score?.current
    if (sEl && (score !== this.hud.score || sEl !== this.hud.sEl)) { this.hud.score = score; this.hud.sEl = sEl; sEl.textContent = String(score) }
    const cEl = ui.coins?.current
    if (cEl && (this.coins !== this.hud.coins || cEl !== this.hud.cEl)) { this.hud.coins = this.coins; this.hud.cEl = cEl; cEl.textContent = String(this.coins) }
    const dEl = ui.dist?.current
    const d = formatDistance(this.meters())
    if (dEl && (d !== this.hud.d || dEl !== this.hud.dEl)) { this.hud.d = d; this.hud.dEl = dEl; dEl.textContent = d }
    const fEl = ui.fuel?.current
    const f = Math.round(this.fuel)
    if (fEl && (f !== this.hud.f || fEl !== this.hud.fEl)) {
      this.hud.f = f
      this.hud.fEl = fEl
      fEl.style.transform = `scaleX(${f / 100})`
      const low = f < FUEL_LOW ? '1' : '0'
      if (fEl.dataset.low !== low) fEl.dataset.low = low
    }
    const bar = ui.bar?.current
    if (bar) {
      const ev = this.ev
      const frac = ev && ev.phase === 'open' ? clamp((ev.deadline - this.clock) / ev.window) : (this.hud.frac ?? 1)
      if (bar !== this.hud.bar || Math.abs(frac - this.hud.frac) > 0.002) {
        this.hud.bar = bar
        this.hud.frac = frac
        bar.style.transform = `scaleX(${frac})`
        const low = frac < 0.35 ? '1' : '0'
        if (bar.dataset.low !== low) bar.dataset.low = low
      }
    }
  }

  sfx(name) {
    this.hooks.sfx?.(name)
  }

  /* ── missions, best score ────────────────────────────────────────── */

  checkMissions() {
    if (!this.missions.length || this.status === 'ready') return
    const s = this.missionStats()
    for (const m of this.missions) {
      if (m.done) continue
      m.value = missionValue(m, s)
      if (m.value >= m.n) {
        m.done = true
        this.sfx('mission')
        this.hooks.set({ toast: { id: `m-${m.id}`, kind: 'mission', mission: m.id, reward: m.reward } })
        const id = `m-${m.id}`
        this.after(2.6, () => this.hooks.set(v => (v.toast?.id === id ? { toast: null } : {})))
      }
    }
    this.pushMissions()
  }

  pushMissions(force = false) {
    const key = this.missions.map(m => `${m.id}:${Math.min(m.value, m.n)}:${m.done ? 1 : 0}`).join('|')
    if (!force && key === this.missionKey) return
    this.missionKey = key
    this.hooks.set({ missions: this.missions.map(m => ({ id: m.id, value: Math.min(m.value, m.n), n: m.n, done: m.done })) })
  }

  checkBest() {
    if (this.bestBeaten || this.best <= 0 || this.status !== 'running') return
    if (this.score() > this.best) {
      this.bestBeaten = true
      this.fx.confettiT0 = this.clock
      this.sfx('best')
      this.hooks.set({ toast: { id: 'best', kind: 'best' } })
      this.after(2.8, () => this.hooks.set(v => (v.toast?.id === 'best' ? { toast: null } : {})))
    }
  }

  /* ── events ──────────────────────────────────────────────────────── */

  valid(cmd) {
    const held = this.motion.kind === 'hold'
    if (held) return cmd.action === 'go' || cmd.action === 'straight'
    if (cmd.action === 'go') return false
    if (cmd.action === 'left') return this.car.lane > 0
    if (cmd.action === 'right') return this.car.lane < 2
    if (cmd.action === 'turbo') return this.clock >= this.coinsX2Until
    return true
  }

  openNext() {
    if (this.halted || this.status !== 'running' || this.ev) return
    let item = this.queue.shift()
    while (item && !this.valid(item.cmd)) item = this.queue.shift()
    if (!item && this.motion.kind === 'hold') this.go()     // nothing to say at a stop — just drive on
    this.openEvent(item ? item.cmd : this.pickCommand(), item?.repeat)
  }

  pickCommand() {
    const L = this.level
    // the tank is low: the next stop is the gas station
    if (this.fuel < FUEL_LOW) {
      const fuel = L.commands.find(c => c.action === 'fuel')
      if (fuel) return fuel
    }
    const lane = this.car.lane
    const last = this.history.slice(-2)
    const entries = Object.entries(L.weights).filter(([a]) => !(a === 'left' && lane === 0) && !(a === 'right' && lane === 2)
      && !(a === 'turbo' && this.clock < this.coinsX2Until)
      && !(BONUS.has(a) && last.includes(a))
      && !(last.length === 2 && last[0] === a && last[1] === a))
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let r = Math.random() * total
    let action = entries[0][0]
    for (const [a, w] of entries) { r -= w; if (r <= 0) { action = a; break } }
    const options = L.commands.filter(c => c.action === action)
    const least = Math.min(...options.map(c => this.used[c.text] || 0))
    return pick(options.filter(c => (this.used[c.text] || 0) === least))
  }

  openEvent(cmd, repeat = false) {
    const held = this.motion.kind === 'hold'
    const attempt = this.tries[cmd.text] || 0
    const ev = {
      key: ++this.evKey, id: ++this.evSeq, cmd, action: cmd.action, window: 0, openedAt: this.clock,
      deadline: Infinity, phase: 'intro', attempt, held, lastAlts: [], restarts: 0, blockers: [], join: 1,
      scene: cmd.scenes ? pick(cmd.scenes) : cmd.scene, bonus: BONUS.has(cmd.action),
    }
    this.used[cmd.text] = (this.used[cmd.text] || 0) + 1
    this.ev = ev
    // kids' mode: the model voice says the line first (the mic stays closed meanwhile)
    if (this.hearFirst && !repeat) {
      this.hooks.set({ card: { mode: 'intro', id: ev.id, text: cmd.text, action: ev.action, scene: ev.scene, bonus: ev.bonus }, saying: true })
      const begin = () => {
        if (this.ev !== ev || ev.phase !== 'intro') return
        this.hooks.set({ saying: false })
        this.beginWindow(ev)
      }
      Promise.resolve(this.hooks.say(cmd.text)).catch(() => {}).then(() => this.after(0.15, begin))
      this.after(7, begin)                          // never wait on a stuck voice
      return
    }
    this.beginWindow(ev)
  }

  beginWindow(ev) {
    if (this.halted || this.status !== 'running' || this.ev !== ev) return
    // never listen while the model voice is still talking (the mic would hear it)
    if (this.hearFirst) this.hooks.stopVoice()
    const win = this.windowSec()
    ev.phase = 'open'
    ev.window = win
    ev.openedAt = this.clock
    ev.deadline = this.clock + win
    ev.held = this.motion.kind === 'hold'
    if (ev.held) {
      ev.pos = this.waiting?.pos ?? this.dist + CAR_Z + STOP_GAP
      if (this.waiting?.light) this.waiting.light.state = 'green'
    } else {
      const cruise = this.cruise()
      ev.pos = this.dist + CAR_Z + HIT_GAP + this.spawnDistance(win)
      this.spawnScene(ev)
      this.tweenTo(ev.pos - CAR_Z - HIT_GAP, win + GRACE, cruise)
    }
    this.showOpen(ev)
    this.listenFor(ev, win * 1000)
  }

  /* After a pause (or a recogniser hand-over) the open command starts over with a full countdown. */
  reopen(ev) {
    ev.id = ++this.evSeq
    ev.window = this.windowSec()
    ev.openedAt = this.clock
    ev.deadline = this.clock + ev.window
    ev.lastAlts = []
    ev.restarts = 0
    ev.wrongAt = null               // a guess heard before the pause does not count against the new try
    ev.wrongR = null
    if (!ev.held) {
      const cruise = this.cruise()
      const pos = this.dist + CAR_Z + HIT_GAP + this.spawnDistance(ev.window)
      const delta = pos - ev.pos
      if (delta > 0) {
        for (const o of this.objects) if (o.ev === ev.key) { o.pos += delta; if (o.pos0 != null) o.pos0 += delta }
        for (const d of this.decals) if (d.ev === ev.key) d.pos += delta
        ev.pos = pos
      }
      if (ev.rail) { ev.rail.closeStart = this.clock + ev.window * 0.35; ev.rail.closeEnd = ev.deadline + GRACE }
      if (this.motion.kind === 'hold') this.motion = { kind: 'cruise' }
      this.tweenTo(ev.pos - CAR_Z - HIT_GAP, ev.window + GRACE, cruise)
    }
    this.showOpen(ev)
    this.listenFor(ev, ev.window * 1000)
  }

  showOpen(ev) {
    this.hooks.set({
      card: { mode: 'open', id: ev.id, text: ev.cmd.text, action: ev.action, attempt: ev.attempt, canSkip: ev.attempt >= 2, scene: ev.scene, bonus: ev.bonus },
    })
  }

  addObj(o, ev) {
    o.ev = ev.key
    this.objects.push(o)
    return o
  }

  addDecal(d, ev) {
    d.ev = ev.key
    this.decals.push(d)
    return d
  }

  spawnBlocker(ev, lane, P) {
    const kind = pick(BLOCKERS[this.level.id] || BLOCKERS.easy)
    const x = LANE_X[lane]
    if (kind === 'truck') return this.addObj({ kind: 'truck', v: Math.floor(Math.random() * 3), x, pos: P }, ev)
    if (kind === 'works') {
      const o = this.addObj({ kind: 'works', x, pos: P }, ev)
      this.addObj({ kind: 'cone', x: x - 0.25, pos: P + 1.4 }, ev)
      this.addObj({ kind: 'cone', x: x + 0.25, pos: P + 2.6 }, ev)
      return o
    }
    const o = this.addObj({ kind: 'cone', x, pos: P }, ev)
    this.addObj({ kind: 'cone', x: x - 0.22, pos: P + 1.5 }, ev)
    this.addObj({ kind: 'cone', x: x + 0.22, pos: P + 3 }, ev)
    return o
  }

  spawnScene(ev) {
    const P = ev.pos
    const scene = ev.scene
    const obj = (o) => this.addObj(o, ev)
    const decal = (d) => this.addDecal(d, ev)
    const lane = this.car.lane
    switch (ev.action) {
      case 'left':
      case 'right': {
        const dir = ev.action === 'left' ? -1 : 1
        const target = Math.max(0, Math.min(2, lane + dir))
        const blocked = [lane, lane - dir].filter(l => l >= 0 && l <= 2)
        for (const l of blocked) ev.blockers.push({ lane: l, obj: this.spawnBlocker(ev, l, P) })
        for (let i = 0; i < 5; i++) obj({ kind: 'coin', x: LANE_X[target], pos: P + 3 + i * 2.2 })
        const landmark = scene === 'bank' || scene === 'school-corner' || scene === 'park'
        obj({ kind: 'sign', face: ev.action, x: dir * 2.1, pos: P - (landmark ? 15 : 9) })
        decal({ kind: 'arrow', x: LANE_X[target], dir, pos: P - 6.5, len: 2 })
        if (scene === 'green-lights') ev.light = obj({ kind: 'light', pos: P + 0.6, state: 'green' })
        if (scene === 'side-left' || scene === 'side-right') decal({ kind: 'junction', side: dir, pos: P + 1.5, len: 3.4 })
        if (landmark) {
          decal({ kind: 'junction', side: dir, pos: P + 1.5, len: 3.4 })
          decal({ kind: 'clear', side: dir, pos: P - 5, len: 5 })
          obj({ kind: 'landmark', v: scene === 'school-corner' ? 'school' : scene, x: dir * 4.1, pos: P - 0.4 })
        }
        break
      }
      case 'jump':
        ev.beam = obj({ kind: 'beam', x: 0, pos: P })
        obj({ kind: 'sign', face: 'works', x: 2.1, pos: P - 9 })
        for (let i = 0; i < 4; i++) obj({ kind: 'coin', x: LANE_X[lane], pos: P + 2.5 + i * 2 })
        break
      case 'stop':
        decal({ kind: 'stopline', pos: P, len: 0.3 })
        if (scene === 'zebra') {
          decal({ kind: 'zebra', pos: P + 0.5, len: 2.2 })
          ev.peds = [0, 1, 2].map(i => obj({ kind: 'ped', v: i, x: -2.0 - i * 0.3, x0: -2.0 - i * 0.3, x1: 2.0 + i * 0.25, pos: P + 1.0 + i * 0.6, bob: 0 }))
          obj({ kind: 'sign', face: 'ped', x: 2.1, pos: P - 9 })
          obj({ kind: 'sign', face: 'ped', x: -2.1, pos: P - 0.3 })
        } else {
          ev.light = obj({ kind: 'light', pos: P + 0.4, state: 'red' })
          decal({ kind: 'junction', side: 0, pos: P + 1.2, len: 3.4 })
          obj({ kind: 'sign', face: 'lights', x: 2.1, pos: P - 10 })
        }
        break
      case 'straight':
        decal({ kind: 'junction', side: 0, pos: P, len: 3.4 })
        if (scene === 'roundabout') {
          decal({ kind: 'giveway', pos: P - 0.4, len: 0.15 })
          decal({ kind: 'ring', pos: P + 1.7, len: 0.6 })
          obj({ kind: 'sign', face: 'round', x: 2.1, pos: P - 9 })
          obj({ kind: 'sign', face: 'round', x: -2.1, pos: P - 9 })
        } else {
          obj({ kind: 'sign', face: 'straight', x: 2.1, pos: P - 9 })
          for (const x of LANE_X) decal({ kind: 'arrow', x, dir: 0, pos: P - 6.5, len: 2 })
        }
        break
      case 'slow':
        if (scene === 'school') {
          // a school by the road and children waiting at the crossing
          decal({ kind: 'stopline', pos: P, len: 0.3 })
          decal({ kind: 'zebra', pos: P + 0.5, len: 2.2 })
          decal({ kind: 'clear', side: 1, pos: P - 4, len: 6 })
          obj({ kind: 'landmark', v: 'school', x: 3.9, pos: P - 1.5 })
          obj({ kind: 'sign', face: 'school', x: 2.1, pos: P - 10 })
          obj({ kind: 'sign', face: 'school', x: -2.1, pos: P - 10 })
          ev.peds = [0, 1, 2].map(i => obj({ kind: 'ped', kid: true, v: i, x: 2.1 + i * 0.3, x0: 2.1 + i * 0.3, x1: -2.0 - i * 0.3, pos: P + 1.0 + i * 0.55, bob: 0, walkDur: 2.0 }))
        } else {
          decal({ kind: 'bumps', pos: P, len: 0.45 })
          decal({ kind: 'bumps', pos: P + 1.6, len: 0.45 })
          obj({ kind: 'sign', face: 'bump', x: 2.1, pos: P - 9 })
          obj({ kind: 'sign', face: 'bump', x: -2.1, pos: P - 9 })
        }
        break
      case 'fast':
        ev.rail = obj({ kind: 'rail', pos: P, angle: Math.PI / 2, closeStart: this.clock + ev.window * 0.35, closeEnd: ev.deadline + GRACE, frozen: false, flashing: false })
        decal({ kind: 'rail', pos: P + 0.25, len: 1.1 })
        obj({ kind: 'sign', face: 'rail', x: 2.1, pos: P - 9 })
        obj({ kind: 'sign', face: 'rail', x: -2.1, pos: P - 9 })
        for (let i = 0; i < 4; i++) obj({ kind: 'coin', x: LANE_X[lane], pos: P + 3 + i * 2.2 })
        break
      case 'honk': {
        // sheep or cows standing in the car's lane (and maybe the next one)
        const cow = scene === 'cows'
        const lanes = [lane, lane === 1 ? pick([0, 2]) : 1]
        ev.animals = []
        lanes.forEach((l, i) => {
          const n = cow ? 1 : 2
          for (let k = 0; k < n; k++) {
            ev.animals.push(obj({ kind: 'animal', v: cow ? 'cow' : 'sheep', x: LANE_X[l] + rand(-0.18, 0.18), pos: P + i * 0.8 + k * 0.9, dir: Math.random() < 0.5 ? -1 : 1, hop: 0, flee: null }))
          }
        })
        obj({ kind: 'sign', face: 'animals', x: 2.1, pos: P - 10 })
        obj({ kind: 'sign', face: 'animals', x: -2.1, pos: P - 10 })
        for (let i = 0; i < 4; i++) obj({ kind: 'coin', x: LANE_X[lane], pos: P + 3 + i * 2 })
        break
      }
      case 'lights':
        ev.tunnel = decal({ kind: 'tunnel', pos: P, len: TUNNEL_LEN })
        obj({ kind: 'sign', face: 'tunnel', x: 2.1, pos: P - 12 })
        obj({ kind: 'sign', face: 'tunnel', x: -2.1, pos: P - 12 })
        for (let i = 0; i < 6; i++) obj({ kind: 'coin', x: LANE_X[lane], pos: P + 4 + i * 3 })
        break
      case 'fuel':
        decal({ kind: 'clear', side: 1, pos: P - 6, len: 9 })
        ev.station = obj({ kind: 'station', x: 4.0, pos: P + 0.2 })
        obj({ kind: 'sign', face: 'fuel', x: 2.1, pos: P - 12 })
        break
      case 'pickup':
        decal({ kind: 'clear', side: 1, pos: P - 4, len: 6 })
        obj({ kind: 'busstop', x: 2.9, pos: P + 0.6 })
        ev.passenger = obj({ kind: 'passenger', x: 2.15, x0: 2.15, pos: P + 0.2, pos0: P + 0.2, bob: 0 })
        obj({ kind: 'sign', face: 'pickup', x: 2.1, pos: P - 11 })
        break
      case 'turbo':
        decal({ kind: 'pad', pos: P - 0.6, len: 2.4 })
        obj({ kind: 'sign', face: 'turbo', x: 2.1, pos: P - 10 })
        obj({ kind: 'sign', face: 'turbo', x: -2.1, pos: P - 10 })
        break
      default:
        break
    }
  }

  cmdStat(cmd) {
    const s = this.stats.cmds
    if (!s[cmd.text]) s[cmd.text] = { text: cmd.text, action: cmd.action, ok: 0, fail: 0, skip: 0, best: 0, heard: '' }
    return s[cmd.text]
  }

  succeed(r) {
    const ev = this.ev
    ev.phase = 'success'
    this.hooks.stopListening()
    this.streak++
    this.mult = 1 + Math.min(4, Math.floor(this.streak / 3)) * 0.5
    this.mstat.maxMult = Math.max(this.mstat.maxMult, this.mult)
    this.mstat.actions[ev.action] = (this.mstat.actions[ev.action] || 0) + 1
    const base = r.verdict === 'perfect' ? this.level.points.perfect : this.level.points.good
    let pts = Math.round(base * this.mult * this.carSetup.scoreMul)
    let bonus = (r.verdict === 'perfect' ? 3 : 2) * (this.clock < this.coinsX2Until ? 2 : 1)
    // said at the very last moment: a near miss — sparks and a little extra
    const near = !ev.held && ev.window > 0 && (ev.deadline - this.clock) / ev.window < 0.22 && ['left', 'right', 'jump', 'honk'].includes(ev.action)
    if (near) { pts += 25; this.sparks(this.car.x, 14, '#fde68a') }
    if (ev.action === 'pickup') bonus += 15
    if (ev.action === 'fuel') bonus += 5
    if (ev.action === 'turbo') bonus += 5
    this.points += pts
    this.coins += bonus
    this.stats.ok++
    if (r.verdict === 'perfect') this.stats.perfect++
    const st = this.cmdStat(ev.cmd)
    st.ok++
    st.best = Math.max(st.best, r.match?.score || 0)
    delete this.tries[ev.cmd.text]
    const id = ev.id
    this.sfx(r.verdict === 'perfect' ? 'perfect' : 'ok')
    this.hooks.set({
      card: { mode: 'ok', id, text: ev.cmd.text, action: ev.action, match: r.match, verdict: r.verdict, scene: ev.scene, bonus: ev.bonus },
      pop: { id, verdict: r.verdict, points: pts, coins: bonus, mult: this.mult, near },
      mult: this.mult,
    })
    this.after(1.3, () => this.hooks.set(v => (v.pop?.id === id ? { pop: null } : {})))
    this.perform(ev)
    this.checkMissions()
  }

  /* The car does the command (a correct answer, or a skip). */
  perform(ev) {
    const rem = Math.max(0.05, ev.deadline + GRACE - this.clock)
    const target = ev.pos - CAR_Z - HIT_GAP
    const cruise = this.cruise()
    ev.join = 1
    this.fx.okT0 = this.clock
    // after judging (server mode) the car waits right in front of the obstacle: do it and drive off
    if (!ev.held && this.motion.kind === 'hold' && !['stop', 'fuel', 'pickup'].includes(ev.action) && !(ev.action === 'slow' && ev.scene === 'school')) {
      this.performFromStill(ev)
      return
    }
    switch (ev.action) {
      case 'left':
      case 'right': {
        this.changeLane(ev.action === 'left' ? -1 : 1)
        const T = Math.min(rem, 1.0)
        this.tweenTo(target, T, cruise)
        this.after(T + 0.4, () => this.part(ev))
        break
      }
      case 'jump': {
        const T = Math.min(rem, 1.0)
        this.tweenTo(target, T, cruise)
        this.after(Math.max(0, T + HIT_GAP / cruise - 0.36), () => { this.car.jumpT0 = this.clock; this.sfx('jump') })
        this.after(T + 0.9, () => this.part(ev))
        break
      }
      case 'stop': {
        ev.gap = 0.15
        const stopAt = ev.pos - CAR_Z - STOP_GAP
        const D = stopAt - this.dist
        this.sfx('brake')
        if (D <= 0.3) { this.motion = { kind: 'hold' }; this.v = 0; this.atStop(ev, true); break }
        const T = clamp((2 * D) / Math.max(this.v, 1), 0.4, 1.7)
        this.tweenTo(stopAt, T, 0, () => this.atStop(ev, true))
        break
      }
      case 'go':
        this.go()
        this.after(0.8, () => this.part(ev))
        break
      case 'straight': {
        if (ev.held) { this.go(); this.after(0.8, () => this.part(ev)); break }
        const T = Math.min(rem, 1.0)
        this.tweenTo(target, T, cruise)
        this.after(T + 0.3, () => this.part(ev))
        break
      }
      case 'slow': {
        if (ev.scene === 'school') {
          // a gentle stop before the crossing; the children cross; drive on
          ev.gap = 0.2
          const stopAt = ev.pos - CAR_Z - STOP_GAP
          const D = stopAt - this.dist
          if (D <= 0.3) { this.motion = { kind: 'hold' }; this.v = 0; this.atStop(ev, true); break }
          this.tweenTo(stopAt, clamp((2.4 * D) / Math.max(this.v, 1), 0.6, 2.2), 0, () => this.atStop(ev, true))
          break
        }
        this.speedMod = 0.5
        const slow = this.cruise()
        const T = Math.min(rem, 1.2)
        this.speedModUntil = this.clock + T + 2.2
        this.tweenTo(target, T, slow)
        this.after(T + HIT_GAP / slow, () => { this.car.fx = { kind: 'nudge', t0: this.clock } })
        this.after(T + 1.1, () => this.part(ev))
        break
      }
      case 'fast': {
        if (ev.rail) ev.rail.frozen = true
        this.speedMod = 1.45
        const T = Math.min(rem, 0.75)
        this.speedModUntil = this.clock + T + 1.6
        this.fx.boostUntil = this.clock + T + 1.3
        this.tweenTo(target, T, this.cruise())
        this.after(T + 0.7, () => { if (ev.rail) ev.rail.frozen = false; this.part(ev) })
        break
      }
      case 'honk': {
        this.honk(true)
        this.scatter(ev, 3.4)
        const T = Math.max(Math.min(rem, 1.0), 0.8)
        this.tweenTo(target, T, cruise)
        this.after(T + 0.6, () => this.part(ev))
        break
      }
      case 'lights': {
        this.switchLights(ev)
        const T = Math.min(rem, 1.0)
        this.tweenTo(target, T, cruise)
        this.after(T + 0.5, () => this.part(ev))
        break
      }
      case 'fuel':
        this.pullOver(ev, () => {
          this.sfx('fuel')
          this.hooks.set({ refuel: ev.id })
          const from = this.fuel
          const steps = 8
          for (let i = 1; i <= steps; i++) this.after(i * 0.15, () => { this.fuel = from + ((100 - from) * i) / steps })
          this.after(1.5, () => { this.go(); this.after(0.5, () => this.part(ev)) })
        })
        break
      case 'pickup':
        this.pullOver(ev, () => {
          const p = ev.passenger
          if (p) { p.walkT0 = this.clock; p.x0 = p.x; p.pos0 = p.pos }
          this.after(1.2, () => this.sfx('door'))
          this.mstat.pickups++
          this.after(1.5, () => { this.go(); this.after(0.5, () => this.part(ev)) })
        })
        break
      case 'turbo': {
        const dur = this.carSetup.turboDur
        this.mstat.turbos++
        this.coinsX2Until = this.clock + dur
        this.fx.boostUntil = this.clock + dur
        this.fx.goldT0 = this.clock
        this.sfx('turbo')
        const T = Math.min(rem, 0.8)
        this.tweenTo(target, T, this.cruise())
        // a long coin trail in the car's lane for the boost (every coin counts double)
        const start = ev.pos + 4
        for (let i = 0; i < 16; i++) this.addObj({ kind: 'coin', x: LANE_X[this.car.lane], pos: start + i * 2.4 }, ev)
        ev.gap = Math.max(0.6, dur - 1.2)
        this.after(T + 0.4, () => this.part(ev))
        this.checkMissions()
        break
      }
      default:
        this.after(0.5, () => this.part(ev))
    }
  }

  performFromStill(ev) {
    // the obstacle is STOP_GAP ahead; from rest the car covers that in ≈ √(2·STOP_GAP / 11) s
    const reach = Math.sqrt((2 * STOP_GAP) / 11)
    switch (ev.action) {
      case 'left':
      case 'right':
        this.changeLane(ev.action === 'left' ? -1 : 1)
        break
      case 'jump':
        this.after(Math.max(0, reach - 0.36), () => { this.car.jumpT0 = this.clock })
        break
      case 'slow':
        this.speedMod = 0.5
        this.speedModUntil = this.clock + 3
        this.after(reach + 0.1, () => { this.car.fx = { kind: 'nudge', t0: this.clock } })
        break
      case 'fast':
        if (ev.rail) ev.rail.frozen = true
        this.speedMod = 1.45
        this.speedModUntil = this.clock + 2.2
        this.fx.boostUntil = this.clock + 1.8
        this.after(1.2, () => { if (ev.rail) ev.rail.frozen = false })
        break
      case 'honk':
        this.honk(true)
        this.scatter(ev, 3.4)
        this.after(0.6, () => this.go())
        this.after(1.6, () => this.part(ev))
        return
      case 'lights':
        this.switchLights(ev)
        break
      case 'turbo':
        this.mstat.turbos++
        this.coinsX2Until = this.clock + this.carSetup.turboDur
        this.fx.boostUntil = this.coinsX2Until
        this.sfx('turbo')
        break
      default:
        break
    }
    this.go()
    this.after(1.2, () => this.part(ev))
  }

  /* Move to the right lane and stop beside the pumps / the bus stop. */
  pullOver(ev, then) {
    if (this.car.lane < 2) this.changeLane(2 - this.car.lane)
    const stopAt = ev.pos - CAR_Z - 0.3
    const D = stopAt - this.dist
    this.sfx('brake')
    if (D <= 0.3) { this.motion = { kind: 'hold' }; this.v = 0; then(); return }
    this.tweenTo(stopAt, clamp((2.4 * D) / Math.max(this.v, 1), 0.6, 2.2), 0, () => { this.motion = { kind: 'hold' }; this.v = 0; then() })
  }

  /* The animals run off the road. */
  scatter(ev, speed) {
    for (const a of ev.animals || []) {
      const dir = a.x < this.car.x - 0.05 ? -1 : a.x > this.car.x + 0.05 ? 1 : (Math.random() < 0.5 ? -1 : 1)
      a.dir = dir
      a.flee = { t0: this.clock, dir, speed: speed * (a.v === 'cow' ? 0.8 : 1) }
    }
  }

  switchLights(ev) {
    this.lightsOn = true
    this.tunnelLightsUntil = ev.tunnel ? ev.tunnel.pos + ev.tunnel.len + CAR_Z + 1 : this.dist + CAR_Z + 40
    this.sfx('lights')
  }

  fail(reason, r) {
    const ev = this.ev
    if (!ev || (ev.phase !== 'open' && ev.phase !== 'judging')) return
    ev.phase = 'fail'
    this.hooks.stopListening()
    this.streak = 0
    this.mult = 1
    let lost = false
    let shielded = false
    if (ev.bonus) {
      this.stats.miss++
    } else {
      if (this.shield > 0) { this.shield--; shielded = true; this.fx.shieldT0 = this.clock; this.sfx('shield') } else { this.lives = Math.max(0, this.lives - 1); lost = true }
      this.stats.fail++
      this.tries[ev.cmd.text] = (this.tries[ev.cmd.text] || 0) + 1
      if (this.lives > 0) this.queue.unshift({ cmd: ev.cmd, repeat: true })
      // the clean-driving mission starts over
      this.mstat.cleanBest = Math.max(this.mstat.cleanBest, this.meters() - this.mstat.cleanFrom)
      this.mstat.cleanFrom = this.meters()
    }
    const st = this.cmdStat(ev.cmd)
    st.fail++
    const heard = String(ev.lastAlts[0] || '').trim()
    if (heard) st.heard = heard.slice(0, 80)
    ev.join = this.lives > 0 ? 2 : 1
    const id = ev.id
    if (lost) this.sfx('fail')
    this.hooks.set({
      card: {
        mode: 'fail', id, text: ev.cmd.text, action: ev.action, match: r?.match || null, scene: ev.scene,
        heard, reason, wrong: r?.wrong || null, bonus: ev.bonus, shielded, lost,
      },
      burst: ev.bonus ? null : id,
      lives: this.lives,
      shield: this.shield,
      mult: 1,
    })
    this.after(1.5, () => this.hooks.set(v => (v.burst === id ? { burst: null } : {})))
    this.consequence(ev, r || {})
    if (this.lives > 0) this.after(1.0, () => this.sayCorrect(ev))
  }

  /* What a wrong answer / silence does to the car. */
  consequence(ev, r) {
    const rem = Math.max(0.05, ev.deadline + GRACE - this.clock)
    const target = ev.pos - CAR_Z - HIT_GAP
    // standing in front of it (after server judging): roll into it slowly instead of a jump-start
    const still = !ev.held && this.motion.kind === 'hold'
    const cruise = still ? 2 : this.cruise()
    const T = still ? 0.35 : Math.min(rem, 0.8)
    switch (ev.action) {
      case 'left':
      case 'right':
        if (r.wrong === 'left' || r.wrong === 'right') this.changeLane(r.wrong === 'left' ? -1 : 1)
        this.tweenTo(target, T, cruise)
        this.after(T, () => {
          const b = ev.blockers.find(x => x.lane === this.car.lane) || ev.blockers[0]
          this.crash(b?.obj, 'hit')
          this.after(1.0, () => this.part(ev))
        })
        break
      case 'jump':
        this.tweenTo(target, T, cruise)
        this.after(T, () => { this.crash(ev.beam, 'hit'); this.after(1.0, () => this.part(ev)) })
        break
      case 'stop':
        this.emergencyStop(ev, () => this.atStop(ev, false))
        break
      case 'fast':
        this.emergencyStop(ev, () => this.trainPasses(ev))
        break
      case 'straight':
        if (ev.held) { this.honk(); this.after(1.0, () => this.part(ev)); break }
        this.tweenTo(target, T, cruise)
        this.after(T, () => { this.crash(null, 'spin'); this.after(1.2, () => this.part(ev)) })
        break
      case 'slow':
        if (ev.scene === 'school') { this.emergencyStop(ev, () => this.atStop(ev, false)); break }
        this.tweenTo(target, T, cruise)
        this.after(T + HIT_GAP / Math.max(cruise, 1), () => { this.crash(null, 'bounce'); this.after(1.0, () => this.part(ev)) })
        break
      case 'honk':
        // the animals stay put: brake hard in front of them, they wander off, drive on
        this.emergencyStop(ev, () => {
          this.after(1.2, () => this.scatter(ev, 1.6))
          this.after(2.4, () => { this.go(); this.after(0.4, () => this.part(ev)) })
        })
        break
      case 'lights':
        // into the dark tunnel without lights: bump along slowly, then the lights come on by themselves
        this.tweenTo(target, T, cruise)
        this.after(T + 0.5, () => {
          this.crash(null, 'bounce')
          this.speedMod = 0.45
          this.speedModUntil = this.clock + 2.2
          this.after(1.0, () => this.part(ev))
        })
        break
      case 'fuel':
      case 'pickup':
      case 'turbo':
        // drive past (the tank stays low; the passenger waits for someone else; no boost)
        if (ev.passenger) ev.passenger.sad = true
        this.tweenTo(target, T, cruise)
        this.after(T + 0.4, () => this.part(ev))
        break
      case 'go':
      default:
        this.honk()
        this.after(1.0, () => this.part(ev))
    }
  }

  sayCorrect(ev) {
    if (this.halted || this.ev !== ev) return
    this.hooks.set({ saying: true })
    // continue on the game clock: a voice cut short by a pause resolves while paused,
    // and the next command must not open before the learner resumes
    Promise.resolve(this.hooks.say(ev.cmd.text)).catch(() => {}).then(() => {
      if (this.halted || this.ev !== ev) return
      this.after(0, () => {
        if (this.ev !== ev) return
        this.hooks.set({ saying: false })
        if (ev.action === 'lights' && !this.lightsOn) this.switchLights(ev)
        this.part(ev)
      })
    })
  }

  part(ev) {
    ev.join -= 1
    if (ev.join <= 0) this.complete(ev, ev.gap)
  }

  complete(ev, gap) {
    if (this.ev !== ev || ev.phase === 'done') return
    ev.phase = 'done'
    this.ev = null
    this.stats.done++
    this.history.push(ev.action)
    this.hooks.set({ card: null, saying: false })
    if (this.lives <= 0) { this.gameOver(); return }
    this.after(gap ?? rand(0.9, 1.6), () => this.openNext())
  }

  atStop(ev, ok) {
    this.motion = { kind: 'hold' }
    this.v = 0
    if (ev.peds) {
      ev.peds.forEach((p, i) => { p.walkT0 = this.clock + 0.2 + i * 0.3 })
      this.after(3.1, () => { this.go(); this.after(0.6, () => this.part(ev)) })
      return
    }
    const follow = this.level.commands.find(c => c.action === this.level.afterStop)
    if (follow) {
      this.waiting = { pos: ev.pos, light: ev.light }
      this.queue.unshift({ cmd: follow })
      this.after(ok ? 0.7 : 1.1, () => this.part(ev))
    } else {
      this.after(1.0, () => {
        if (ev.light) ev.light.state = 'green'
        this.go()
        this.after(0.5, () => this.part(ev))
      })
    }
  }

  trainPasses(ev) {
    this.motion = { kind: 'hold' }
    this.v = 0
    const rail = ev.rail
    if (!rail) { this.after(0.8, () => { this.go(); this.part(ev) }); return }
    const wait = Math.max(0.2, rail.closeEnd - this.clock + 0.1)
    this.after(wait, () => {
      const train = this.addObj({ kind: 'train', pos: rail.pos + 0.75, t0: this.clock }, ev)
      this.after(1.9, () => {
        this.objects = this.objects.filter(o => o !== train)
        rail.openT0 = this.clock
        this.after(0.9, () => { this.go(); this.after(0.5, () => this.part(ev)) })
      })
    })
  }

  emergencyStop(ev, then) {
    const stopAt = ev.pos - CAR_Z - STOP_GAP
    const D = stopAt - this.dist
    this.car.fx = { kind: 'skid', t0: this.clock, dur: 0.9 }
    this.fx.flashT0 = this.clock
    this.sfx('skid')
    if (D <= 0.3) { this.motion = { kind: 'hold' }; this.v = 0; this.shake(0.8); then(); return }
    const T = clamp((2 * D) / Math.max(this.v, 1), 0.3, 1.2)
    this.tweenTo(stopAt, T, 0, () => { this.shake(0.7); then() })
  }

  crash(obj, kind) {
    const t = this.clock
    if (obj && !obj.fly) {
      obj.fly = { t0: t, vx: obj.kind === 'beam' ? 0 : (obj.x <= this.car.x ? -1 : 1) * rand(2.5, 4), vh: rand(3.5, 5), spin: obj.kind === 'beam' ? rand(-1, 1) : rand(-8, 8) }
      const colors = obj.kind === 'truck' ? ['#94a3b8', '#e2e8f0', '#334155'] : ['#f97316', '#fff7ed', '#ef4444']
      for (let k = 0; k < 10; k++) {
        this.particles.push({ kind: 'debris', color: pick(colors), x: obj.x + rand(-0.3, 0.3), h: rand(0.2, 0.6), pos: obj.pos, vx: rand(-2.5, 2.5), vh: rand(2, 5), g: 12, size: rand(0.05, 0.1), grow: 0, life: 0.9, max: 0.9 })
      }
    }
    this.car.fx = { kind, t0: t }
    this.fx.flashT0 = t
    this.shake(kind === 'spin' ? 0.7 : 1)
    this.sfx('crash')
    this.v *= kind === 'bounce' ? 0.7 : 0.3
    if (this.motion.kind !== 'hold') this.motion = { kind: 'cruise' }
  }

  honk(real = false) {
    this.fx.honkT0 = this.clock
    if (!real) this.fx.flashT0 = this.clock
    this.sfx('horn')
    this.shake(real ? 0.2 : 0.35)
  }

  shake(power) {
    if (this.reduced) return
    this.fx.shakeT0 = this.clock
    this.fx.shakePow = power
  }

  changeLane(dir) {
    const c = this.car
    const to = Math.max(0, Math.min(2, c.lane + dir))
    if (to === c.lane) return false
    c.from = c.x
    c.lane = to
    c.to = LANE_X[to]
    c.laneT0 = this.clock
    this.sfx('swoosh')
    return true
  }

  go() {
    this.motion = { kind: 'cruise' }
    this.waiting = null
  }

  fatal(error) {
    this.pause()
    this.hooks.set({ fatal: error })
  }

  gameOver() {
    if (this.status === 'over') return
    this.status = 'over'
    // a command still on the card (the run was ended from the pause menu) is dropped
    if (this.ev) { this.ev.phase = 'done'; this.ev = null }
    this.hooks.stopListening()
    this.hooks.stopVoice()
    this.checkMissions()
    this.hooks.set({ phase: 'over', card: null })
    this.sfx('over')
    const summary = this.summary()
    this.after(1.0, () => this.hooks.over(summary))
  }

  summary() {
    const score = this.score()
    const { ok, fail, skip, perfect } = this.stats
    const total = ok + fail + skip
    return {
      id: `${this.level.id}-${this.evKey}-${Math.round(this.clock * 1000)}-${Math.floor(Math.random() * 1e6)}`,
      level: this.level.id,
      score,
      stars: starsFor(score),
      meters: Math.round(this.meters()),
      coins: this.coins,
      accuracy: total ? ok / total : 0,
      duration: Math.round(this.playTime),
      linesSaid: ok,
      perfect,
      total,
      car: this.carSetup.id,
      best: this.best,
      cmds: Object.values(this.stats.cmds),
      missions: this.missions.map(m => ({ id: m.id, done: m.done, value: Math.min(m.value, m.n), n: m.n })),
    }
  }
}
