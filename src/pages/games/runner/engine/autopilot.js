/*
 * TOBY RUN — test bots (RUNNER_PLAN §B9.7, §B11). Not used in normal play.
 *
 *   game.auto = new Autopilot({ reaction: 0.35 })   dodges by itself (window.__rnAuto = true in the page)
 *     every 0.1 s it plans the next 40 m with the solver's search (the real physics) and acts at the
 *     planned moments; plans keep a small safety margin and fall back to an exact plan when needed.
 *     In Listen mode it can also steer into the right balloon (answer: true).
 *   simHooks(gameRef, profile)                        a fake recogniser + voice on the engine clock
 *     profile: { latency: s, accuracy: 0..1, silence: 0..1, server: bool, serverLatency: s, wrongFirst }
 */
import { plan } from './solver.js'

export class Autopilot {
  constructor({ reaction = 0.35, margin = 1.2, horizon = 40, answer = false, every = 0.1 } = {}) {
    this.every = every
    this.reaction = reaction
    this.margin = margin
    this.horizon = horizon
    this.answer = answer
    this.queue = []
    this.replanAt = 0
    this.cool = 0
    this.buf = []
    this.plans = 0
    this.fails = 0
  }

  update(game, h) {
    if (this.cool > 0) this.cool = Math.max(0, this.cool - h)
    if (game.phase === 'ride') {
      if (this.answer && game.choices.length && game.director?.m?.item) {
        const lane = game.choices.findIndex(c => c.text === game.director.m.item.text)
        if (lane >= 0 && lane !== game.player.lane) game.steerTo(lane)
      }
      this.queue.length = 0
      return
    }
    if (game.phase !== 'run' && game.phase !== 'resume' && game.phase !== 'brake') { this.queue.length = 0; return }
    if (this.queue.length && this.queue[0].at <= game.clock + 1e-9) {
      const a = this.queue.shift()
      game.input(a.a)
      this.cool = this.reaction
      this.replanAt = 0
    }
    if (game.clock >= this.replanAt) {
      this.replanAt = game.clock + this.every
      this.replan(game)
    }
  }

  replan(game) {
    const n = game.track.near(game.dist - 2, game.dist + this.horizon + 8, this.buf)
    const speed = Math.max(game.speed, 0.5)
    const opts = { speed, s0: game.dist, horizon: this.horizon, reaction: this.reaction, cooldown: this.cool, maxNodes: 30000 }
    this.plans++
    let res = this.margin > 0 ? plan(game.player, this.buf, n, { ...opts, margin: this.margin }) : null
    if (!res) res = plan(game.player, this.buf, n, opts)
    if (!res) { this.fails++; this.queue.length = 0; return }
    // only the actions of the next few tenths are kept: the plan is redone every 0.1 s
    this.queue = res.actions.filter(x => x.t < 0.3).map(x => ({ a: x.a, at: game.clock + x.t }))
  }
}

/*
 * A fake speech layer for whole simulated runs (node) and for the page's debug mode.
 * It answers what the current moment wants (or a wrong word / nothing), after `latency` seconds.
 */
export function simHooks(gameRef, profile = {}, extra = {}) {
  const {
    latency = 0.6, accuracy = 1, silence = 0, server = false, serverLatency = 2.5, seed = 7, sayRate = 0.055, wrongFirst = false,
  } = profile
  let s = seed >>> 0
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
  let active = null       // { lid, done, busy }
  const log = { listens: 0, says: 0, maxOpenWhileSaying: 0, saying: 0, openDuringSay: 0, events: [] }
  const game = () => gameRef.current || gameRef

  const answerFor = (m) => {
    const it = m.item
    if (m.type === 'bekat' && it.kind === 'answer') return it.text
    if (it.kind === 'fill') return it.answer || it.text
    return it.text
  }

  const hooks = {
    log,
    set: () => {},
    sfx: () => {},
    prefetch: () => {},
    finish: (summary) => { log.summary = summary },
    stopVoice: () => {},
    say: (text) => new Promise((res) => {
      log.says++
      log.saying++
      if (active) log.openDuringSay++
      const g = game()
      g.after(0.25 + String(text).length * sayRate, () => { log.saying--; res() })
    }),
    listen: (lid, ms, onInterim) => {
      const g = game()
      log.listens++
      if (log.saying > 0) log.maxOpenWhileSaying++
      const me = { lid, done: false, busy: false }
      active = me
      const m = g.director?.m
      const wrong = rnd() > accuracy || (wrongFirst && m?.tries === 1 && m.type === 'balloon')
      const quiet = rnd() < silence
      const text = !m ? '' : quiet ? '' : wrong ? 'banana' : answerFor(m)
      log.events.push({ t: g.clock, lid, type: m?.type, text })
      const end = (alts, err) => {
        if (me.done) return
        me.done = true
        me.busy = false
        if (active === me) active = null
        g.director?.listenEnded(lid, alts, err)
      }
      if (text) {
        const at = server ? serverLatency : latency
        if (server) g.after(Math.max(0.3, at - 0.8), () => { if (!me.done) me.busy = true })
        g.after(at, () => {
          if (me.done) return
          me.busy = false
          if (onInterim([text])) { end([text], ''); return }
        })
      }
      g.after(ms / 1000, () => end(text ? [text] : [], text ? '' : 'no-speech'))
    },
    stopListening: () => { if (active) { active.done = true; active = null } },
    finishListening: () => {
      if (!active) return false
      const me = active
      const g = game()
      g.after(0.05, () => { if (!me.done) { me.done = true; active = null; g.director?.listenEnded(me.lid, [], 'no-speech') } })
      return true
    },
    isListening: () => !!active && !active.done,
    isBusy: () => !!active && active.busy,
    ...extra,
  }
  return hooks
}
