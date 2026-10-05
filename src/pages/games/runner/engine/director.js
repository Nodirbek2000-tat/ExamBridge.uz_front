/*
 * TOBY RUN — the speaking moments (RUNNER_PLAN §B3): So'z shari (balloon ride), Bekat, revive by
 * voice, twister, and Listen mode. Runs on the engine's clock (pausing freezes every step).
 *
 * Rules every moment keeps (§B3.1): the mic is open only inside a moment; model lines play before
 * the mic opens (awaited) and never while it is open; one continuous listen per window; an interim
 * match ends it at once; the alternatives the listen resolves with are always judged too.
 *
 * hooks (the page adapts useSpeech / voiceTts / sfx to these):
 *   set(patch)                       React UI state (only on changes)
 *   listen(lid, ms, onInterim)       open the mic for ms; onInterim(alts) → true ends the listen
 *                                    the page calls director.listenEnded(lid, alts, error) when it ends
 *   stopListening({ discard })       finishListening() → false when nothing is listening
 *   isListening() · isBusy()         busy = a phrase is still at the server
 *   say(text, voice) → Promise       stopVoice()
 *   sfx(name) · prefetch(items) · finish(summary)
 */
import { judge, tipFor } from './judge.js'
import {
  BEKAT_WINDOW, COINS, JUDGE_MAX, READ_TIME, RETRY_WORD, REVIVE_PHRASE, REVIVE_WORD, RIDE, SERVER_EXTRA, WRONG_HOLD,
  X2_TIME, twisterWindow, wordWindow,
} from './levels.js'
import { isPass, itemPoints } from './score.js'

export const FATAL = new Set(['not-allowed', 'audio-capture', 'unsupported'])
export const CHEERS = ['Yes!', 'Super!', 'Great!', 'Well done!', 'Wow!', 'Nice!', 'Awesome!', 'Perfect!', 'You did it!',
  'Brilliant!', 'Good job!', 'Amazing!']
const REVIVE_SERVER_EXTRA = 4

/* the Uzbek instruction on the prompt card */
export const INSTRUCTION = {
  hear: 'Eshiting va takrorlang',
  choice: 'Qaysi biri? Ayting!',
  picture: 'Inglizchasini ayting!',
  uz: 'Inglizchasi?',
  definition: 'Qaysi so‘z?',
  opposite: 'Teskarisi?',
  synonym: 'Ma’nodoshi?',
  fill: 'Bo‘sh joyni ayting',
  twister: 'Tez va aniq ayting!',
  listen: 'Tinglang va to‘g‘ri sharga o‘ting',
}

export class Director {
  constructor(game, { deck, level, config, hooks, listenMode = false, sttMode = 'browser', hearAlways = false, cheerVoice = 'toby' }) {
    this.game = game
    this.deck = deck
    this.level = level
    this.cfg = config
    this.hooks = hooks
    this.listenMode = !!listenMode
    this.serverMode = sttMode === 'server'
    this.hearAlways = !!hearAlways
    this.cheerVoice = cheerVoice
    this.reserved = null           // the item of the next arch (picked when the arch comes into view)
    this.reservedFor = null
    this.m = null
    this.seq = 0
    this.lseq = 0
    this.outcomes = []
    this.points = 0
    this.passes = 0
    this.skipsInRow = 0
    this.streak = 0
    this.clips = 0
    this.balloons = 0
    this.revivesUsed = 0
    this.resumeQueue = []
    this.cardState = null
  }

  get ws() { return this.cfg.window_scale || 1 }

  /* ── wiring ─────────────────────────────────────────────────────── */

  start() {
    if (!this.deck) return
    // (the first arch is already on the track, right after the clear start)
    if (this.cfg.twister !== false && !['A1', 'A2'].includes(this.level) && this.deck.twisters.length) this.game.after(50, () => this.game.track.requestToken())
  }

  /* speech goes to the server from now on (no recogniser, or it broke) — unless the admin switched Whisper off */
  setServerMode(on) {
    this.serverMode = !!on
    if (on && this.cfg.server_stt === false && !this.listenMode) this.toListenMode('server')
  }

  alive(m) { return this.m === m && !this.game.halted && this.game.status === 'running' }

  /* run fn after sec of game time, only while this moment is still the current one */
  later(m, sec, fn) {
    this.game.after(sec, () => {
      if (!this.alive(m)) return
      if (this.game.paused) this.resumeQueue.push(() => this.alive(m) && fn())
      else fn()
    })
  }

  /* a model line, mic closed; resolves true if the moment is still on (and the game not paused) */
  say(m, text, voice) {
    this.hooks.stopListening?.({ discard: true })
    return Promise.resolve(this.hooks.say ? this.hooks.say(text, voice) : null).then(() => new Promise((res) => {
      if (!this.alive(m)) return res(false)
      if (this.game.paused) this.resumeQueue.push(() => res(this.alive(m)))
      else res(true)
    }))
  }

  set(patch) { this.hooks.set?.(patch) }

  sfx(name) { this.hooks.sfx?.(name) }

  prefetch() {
    const next = this.deck.peek(2)
    if (next.length) this.hooks.prefetch?.(next.map(it => ({ text: it.kind === 'answer' ? it.prompt : it.text, voice: it.kind === 'word' ? 'teacher' : it.voice || 'narrator' })))
  }

  pause() {
    const m = this.m
    this.hooks.stopVoice?.()
    if (m && (m.phase === 'open' || m.phase === 'hold')) {
      this.hooks.stopListening?.({ discard: true })
      m.phase = 'paused-open'
    }
  }

  resume() {
    const q = this.resumeQueue
    this.resumeQueue = []
    const m = this.m
    if (m && m.phase === 'paused-open') {
      // the window starts again in full (a pause never costs the learner time)
      this.open(m, m.sec, m.onDone, m.extra)
    }
    for (const fn of q) fn()
  }

  abort() {
    if (this.m) this.hooks.stopListening?.({ discard: true })
    this.m = null
    this.resumeQueue = []
  }

  /* ── listening ──────────────────────────────────────────────────── */

  begin(type, item, extra = {}) {
    const m = { id: ++this.seq, type, item, tries: 1, phase: 'start', lid: 0, ...extra }
    this.m = m
    return m
  }

  /* open the mic for a window of `sec` seconds (+3 s in server mode) */
  open(m, sec, onDone, extra = SERVER_EXTRA) {
    if (this.serverMode && this.cfg.clips_per_run != null && this.clips >= this.cfg.clips_per_run) {
      this.toListenMode('cap')
      return
    }
    const g = this.game
    m.sec = sec
    m.extra = extra
    m.onDone = onDone
    m.win = sec + (this.serverMode ? extra : 0)
    m.phase = 'open'
    m.openAt = g.clock
    m.deadline = g.clock + m.win
    m.alts = null
    m.best = null
    m.wrongAt = null
    m.wrong = null
    m.wrongR = null
    m.heardAt = null
    m.flushed = false
    m.restarts = 0
    this.sfx('chime')
    this.listenNow(m)
  }

  listenNow(m) {
    m.lid = ++this.lseq
    if (this.serverMode) this.clips++
    this.hooks.stopVoice?.()
    const tail = this.serverMode ? JUDGE_MAX : 0.25
    const ms = Math.max(400, Math.round((m.deadline - this.game.clock + tail) * 1000))
    const lid = m.lid
    this.hooks.listen?.(lid, ms, (alts) => this.heard(lid, alts))
  }

  judgeM(m, alts, final) {
    const it = m.item
    if (m.type === 'bekat') return judge(it, alts, { level: this.level, final, as: it.as === 'picture' ? 'word' : it.kind })
    if (m.type === 'twister') return judge(it, alts, { level: this.level, final, as: 'twister' })
    if (m.type === 'revive') return judge(it, alts, { level: this.level, final, as: it.kind === 'word' ? 'word' : 'echo' })
    return judge(it, alts, { level: this.level, final })
  }

  /* interim (browser) or a finished phrase (server) — true ends this listen */
  heard(lid, alts) {
    const m = this.m
    const g = this.game
    if (!m || m.lid !== lid || (m.phase !== 'open' && m.phase !== 'hold') || g.paused || g.halted) return false
    if (!alts || !alts.length) return false
    m.alts = alts
    const final = this.serverMode || m.phase === 'hold'
    const r = this.judgeM(m, alts, final)
    if (r.v === 'ok' || (r.v === 'close' && final)) {
      m.heardAt = m.heardAt ?? g.clock
      if (r.v === 'ok') m.heardAt = g.clock
      this.decide(m, r)
      return true
    }
    if (r.v === 'close') {
      // a live guess that may still improve — keep it, and decide at the end
      if (!m.best || m.best.v !== 'close') m.heardAt = g.clock
      m.best = r
      m.wrongAt = null
      return false
    }
    if (r.v === 'hold') {
      if (m.wrong !== r.wrong) { m.wrongAt = g.clock; m.wrong = r.wrong }
      m.wrongR = r
      return false
    }
    m.wrongAt = null
    m.wrong = null
    if (r.v === 'miss' && (!m.best || m.best.v === 'miss')) m.best = r
    return false
  }

  listenEnded(lid, alts, error) {
    const m = this.m
    const g = this.game
    if (!m || m.lid !== lid || g.paused || g.halted) return
    if (m.phase !== 'open' && m.phase !== 'hold') return
    if (error && FATAL.has(error)) { this.toListenMode('mic', error); return }
    if (error === 'limit') { this.toListenMode('limit'); return }
    if (error === 'retry') {
      // the browser's recogniser broke and the server takes over: this window starts again, no penalty
      this.setServerMode(true)
      if (this.listenMode) return
      this.set({ hint: 'Qaytadan ayting' })
      this.open(m, m.sec, m.onDone, m.extra)
      return
    }
    if (alts && alts.length) {
      m.alts = alts
      const r = this.judgeM(m, alts, true)
      if (r.v === 'ok' || r.v === 'close') {
        if (r.v === 'ok' || !m.heardAt) m.heardAt = g.clock
        this.decide(m, r)
        return
      }
      if (m.best?.v === 'close') { this.decide(m, m.best); return }
      if (r.v === 'miss' && m.wrongAt != null) { this.decide(m, r); return }
      if (r.v === 'miss') m.best = r
    }
    if (m.phase === 'hold') { this.decideEnd(m); return }
    if (m.deadline - g.clock > 0.7 && m.restarts < 12) {
      m.restarts++
      this.later(m, 0.12, () => {
        if (m.phase === 'open' && !this.hooks.isListening?.()) this.listenNow(m)
      })
    }
    // otherwise time is up: update() decides at the deadline
  }

  /* every frame */
  update() {
    const m = this.m
    if (!m) return
    const t = this.game.clock
    if (m.phase === 'open') {
      if (m.wrongAt != null && t - m.wrongAt >= WRONG_HOLD) {
        // a live guess naming another option that stayed: it was said
        this.decide(m, { ...m.wrongR, v: 'miss' })
      } else if (t >= m.deadline) {
        if (this.serverMode || this.hooks.isBusy?.()) this.hold(m)
        else this.decideEnd(m)
      }
    } else if (m.phase === 'hold') {
      if (!m.flushed && !this.hooks.isBusy?.()) {
        m.flushed = true
        if (!this.hooks.finishListening?.()) this.decideEnd(m)
      } else if (t - m.holdAt >= JUDGE_MAX) {
        this.hooks.stopListening?.({ discard: true })
        this.decide(m, m.best?.v === 'close' ? m.best : { v: 'skip', heard: '', timeout: true })
      }
    }
  }

  /* server mode, time is up: the last words may still be at Whisper — hold the balloon (≤ 6 s) */
  hold(m) {
    m.phase = 'hold'
    m.holdAt = this.game.clock
    m.flushed = false
    this.view(m, 'hold')
  }

  decideEnd(m) {
    let r = m.best?.v === 'close' ? m.best : null
    if (!r && m.alts && m.alts.length) r = this.judgeM(m, m.alts, true)
    if (!r || r.v === 'none' || r.v === 'hold') r = m.best || null
    this.decide(m, r && r.v !== 'none' && r.v !== 'hold' ? r : { v: 'skip', heard: '' })
  }

  decide(m, r) {
    if (m.phase !== 'open' && m.phase !== 'hold') return
    m.phase = 'judged'
    this.hooks.stopListening?.({ discard: true })
    const v = r.v === 'ok' || r.v === 'close' ? r.v : r.v === 'skip' ? 'skip' : 'miss'
    m.onDone?.({ ...r, v })
  }

  barFrac() {
    const m = this.m
    if (!m) return -1
    if (m.phase === 'open') return Math.max(0, (m.deadline - this.game.clock) / m.win)
    if (m.phase === 'hold') return 0
    return -1
  }

  /* one outcome for the server (and the results screen) */
  record(m, v, r, { mm = 'b', tries = m.tries, ms = null } = {}) {
    const it = m.item
    const o = {
      k: it.k, id: it.id, kind: it.kind, pt: m.listen ? 'listen' : it.pt || it.kind, v, tries, ms,
      heard: String(r?.heard || '').slice(0, 80), m: mm, n: it.n || 1, text: it.text, uz: it.uz || '',
      picture: it.picture || '', voice: it.kind === 'word' ? 'teacher' : it.voice || 'narrator',
      prompt: it.prompt || '', as: it.as || '', score: r?.score ?? null, uid: it.uid,
    }
    this.outcomes.push(o)
    // a starter-deck item is never posted, so it scores only when the whole run is offline (keeps HUD = server)
    if (it.k === 'local' && !this.deck?.offline) return o
    this.points += itemPoints(o, { level: this.level, stt: this.serverMode ? 'server' : 'browser', mode: this.listenMode ? 'listen' : 'voice', windowScale: this.ws })
    if (isPass(o)) this.passes++
    return o
  }

  msOf(m) {
    return m.heardAt != null && m.openAt != null ? Math.max(0, Math.round((m.heardAt - m.openAt) * 1000)) : null
  }

  /* ── So'z shari: the balloon ride ───────────────────────────────── */

  /* an arch came into view: its item now, so the arch can show the picture (one arch at a time) */
  reserve(g) {
    if (!this.deck) return null
    if (this.reserved && this.reservedFor && !this.reservedFor.used && this.reservedFor !== g) return null
    if (!this.reserved) {
      this.reserved = this.deck.nextBalloon(this.game.clock)
      const it = this.reserved
      if (it) this.hooks.prefetch?.([{ text: it.kind === 'answer' ? it.prompt : it.text, voice: it.kind === 'word' ? 'teacher' : it.voice || 'narrator' }])
    }
    this.reservedFor = g
    return this.reserved
  }

  onGate(g) {
    if (this.m || !this.deck) return false
    const item = this.reserved && (!g || g.item === this.reserved) ? this.reserved : this.deck.nextBalloon(this.game.clock)
    if (item === this.reserved) { this.reserved = null; this.reservedFor = null }
    if (!item) return false
    const m = this.begin('balloon', item, { listen: this.listenMode })
    this.balloons++
    this.game.startRide({ pic: item.picture, pt: item.pt, listen: this.listenMode })
    this.prefetch()
    this.later(m, RIDE.cardAt, () => (m.listen ? this.listenBalloon(m) : this.introBalloon(m)))
    return true
  }

  card(m, mode, extra = {}) {
    const it = m.item
    const c = {
      id: `${m.id}-${m.tries}`, mid: m.id, type: m.type, mode, pt: it.pt, text: it.text, uz: it.uz || '', picture: it.picture || '',
      prompt: it.prompt || '', answer: it.answer || '', choices: it.choices || null, tries: m.tries,
      instruction: INSTRUCTION[m.type === 'twister' ? 'twister' : m.listen ? 'listen' : it.pt] || INSTRUCTION.picture,
      hint: this.level === 'A1' && (it.pt === 'picture' || it.pt === 'choice') ? it.uz || '' : '',
      reveal: it.pt === 'hear' || it.pt === 'choice' || m.type === 'twister' || mode === 'retry' || mode === 'ok' || mode === 'close' || mode === 'miss' || mode === 'skip',
      win: m.win || 0,
      ...extra,
    }
    this.cardState = c
    this.set({ card: c })
  }

  view(m, mode, extra) {
    if (m.type === 'bekat') this.station(m, mode, extra)
    else if (m.type === 'revive') this.reviveUi(m, mode, extra)
    else this.card(m, mode, extra)
  }

  introBalloon(m) {
    const it = m.item
    const hear = it.pt === 'hear' || (this.hearAlways && m.tries === 1)
    this.card(m, 'intro')
    if (hear) {
      this.say(m, it.text, 'teacher').then(ok => { if (ok) this.later(m, READ_TIME.hear, () => this.openBalloon(m)) })
    } else {
      this.later(m, Math.max(READ_TIME[it.pt] ?? 0.5, RIDE.micAt - RIDE.cardAt), () => this.openBalloon(m))
    }
  }

  openBalloon(m) {
    const it = m.item
    const sec = m.tries === 1 ? wordWindow(it.n || 1, this.level, this.ws) : RETRY_WORD
    this.open(m, sec, (r) => this.balloonResult(m, r))
    if (this.m === m && m.phase === 'open') this.card(m, m.tries === 1 ? 'open' : 'retry')
  }

  balloonResult(m, r) {
    const it = m.item
    const g = this.game
    const v = r.v
    if (v === 'skip') {
      this.record(m, 'skip', r)
      this.skipsInRow++
      this.streak = 0
      this.deck.result(it, 'skip', g.clock)
      this.card(m, 'skip')
      if (this.skipsInRow >= 3) {
        this.skipsInRow = 0
        this.set({ toast: { kind: 'mic-tip', id: g.clock, offerListen: true } })
      }
      this.say(m, it.text, 'teacher').then(ok => { if (ok) this.later(m, 0.3, () => this.finishRide(m)) })
      return
    }
    this.skipsInRow = 0
    if (v === 'ok' || v === 'close') {
      const ms = m.tries === 1 ? this.msOf(m) : null
      const o = this.record(m, v, r, { ms })
      g.addCoins(m.tries === 1 ? COINS.balloon : COINS.retry)
      g.popBalloon(true)
      g.blowShovqin()
      this.sfx(v === 'ok' ? 'ok' : 'close')
      if (m.tries === 1 && v === 'ok') {
        this.streak++
        if (this.streak >= 3) { this.streak = 0; g.power('magnet', 8); this.set({ toast: { kind: 'magnet', id: g.clock } }) }
      } else this.streak = 0
      this.deck.result(it, v, g.clock)
      this.card(m, v, { words: r.words, heard: r.heard, points: itemPoints(o, { level: this.level, stt: this.serverMode ? 'server' : 'browser', windowScale: this.ws }), coins: m.tries === 1 ? COINS.balloon : COINS.retry })
      this.hooks.say?.(CHEERS[(this.balloons * 7 + this.outcomes.length) % CHEERS.length], this.cheerVoice)
      this.later(m, 1.1, () => this.finishRide(m))
      return
    }
    // miss: the model voice says it (mic closed), then one echo retry for half points
    this.streak = 0
    this.record(m, 'miss', r)
    this.sfx('miss')
    if (m.tries === 1) {
      this.card(m, 'miss', { words: r.words, heard: r.heard, tip: tipFor(it.kind === 'fill' ? it.answer : it.text, r.heard)?.text || '' })
      this.say(m, it.kind === 'fill' ? it.text : it.text, 'teacher').then(ok => {
        if (!ok) return
        m.tries = 2
        this.later(m, 0.15, () => this.openBalloon(m))
      })
      return
    }
    this.deck.result(it, 'miss', g.clock)
    this.card(m, 'miss', { words: r.words, heard: r.heard, final: true })
    this.later(m, 1.0, () => this.finishRide(m))
  }

  finishRide(m) {
    if (this.m !== m) return
    this.m = null
    this.cardState = null
    this.set({ card: null })
    this.game.endRide()
  }

  /* back on the ground (the track has already spaced the next arch) */
  onLanded() {}

  /* Listen mode: three balloons, one per lane — the model voice says the word, Toby swipes into it */
  listenBalloon(m) {
    const it = m.item
    m.options = this.deck.optionsFor(it)
    this.card(m, 'listen', { options: m.options, reveal: false })
    this.game.spawnChoices(m.options)
    this.say(m, it.text, 'teacher')
  }

  choiceContact(lane) {
    const m = this.m
    if (!m || !m.options || m.done) return
    m.done = true
    const pick = m.options[lane]
    const v = pick && pick.text === m.item.text ? 'ok' : 'miss'
    this.record(m, v, { heard: pick?.text || '' }, { mm: m.type === 'bekat' ? 's' : 'b' })
    if (v === 'ok') { this.game.addCoins(COINS.balloon); this.game.popBalloon(true); this.game.blowShovqin(); this.sfx('ok') } else this.sfx('miss')
    this.deck.result(m.item, v, this.game.clock)
    this.card(m, v, { options: m.options, picked: lane, reveal: true })
    if (v === 'miss') this.say(m, m.item.text, 'teacher')
    this.later(m, v === 'ok' ? 0.9 : 1.6, () => this.finishRide(m))
  }

  /* a tap on a choice (Listen mode) steers Toby into that lane */
  tapChoice(i) {
    const m = this.m
    if (!m || !m.options) return
    if (m.type === 'balloon') this.game.steerTo(i)
    else if (m.type === 'bekat' || m.type === 'revive') this.pickOption(m, i)
  }

  /* ── Bekat (§B3.4) ──────────────────────────────────────────────── */

  onStation(st) {
    if (this.m) this.abort()
    const lines = this.deck ? this.deck.nextBekat() : []
    if (!lines.length) { this.game.after(0.8, () => this.game.resumeFromStation()); return }
    const m = this.begin('bekat', lines[0], { lines, i: 0, results: [], st, coins: 0 })
    this.station(m, 'arrive')
    this.later(m, 0.9, () => this.bekatLine(m))
  }

  station(m, mode, extra = {}) {
    const it = m.item
    const as = it.as === 'picture' ? 'picture' : it.kind
    this.set({
      station: {
        id: `${m.id}-${m.i}-${m.tries}`, mode, i: m.i, n: m.lines.length, as, npc: npcFor(m.lines[0]),
        line: as === 'answer' ? it.prompt : as === 'picture' ? 'What’s this?' : it.text,
        caption: it.uz || '', target: it.text, picture: as === 'picture' ? it.picture : it.picture || '',
        tries: m.tries, results: m.results.slice(), coins: m.coins, win: m.win || 0, ...extra,
      },
    })
  }

  bekatLine(m) {
    const it = m.lines[m.i]
    m.item = it
    m.tries = m.tries || 1
    const as = it.as === 'picture' ? 'picture' : it.kind
    const line = as === 'answer' ? it.prompt : as === 'picture' ? 'What’s this?' : it.text
    const voice = as === 'picture' ? 'teacher' : it.voice || 'narrator'
    this.station(m, 'npc')
    this.say(m, line, voice).then(ok => {
      if (!ok) return
      if (this.listenMode) { this.listenBekat(m); return }
      this.later(m, 0.2, () => {
        const sec = BEKAT_WINDOW
        this.open(m, sec, (r) => this.bekatResult(m, r))
        if (this.m === m && m.phase === 'open') this.station(m, 'open')
      })
    })
  }

  bekatResult(m, r) {
    const it = m.item
    const g = this.game
    const v = r.v
    if ((v === 'miss' || v === 'skip') && m.tries < 2) {
      m.tries = 2
      this.station(m, 'retry', { words: r.words, heard: r.heard })
      this.sfx('miss')
      this.later(m, 1.1, () => this.bekatLine(m))
      return
    }
    if (v === 'ok' || v === 'close') { this.sfx(v === 'ok' ? 'ok' : 'close'); g.blowShovqin(); g.player.cheerT = g.clock } else this.sfx('miss')
    this.record(m, v, r, { mm: 's', ms: this.msOf(m) })
    m.results.push(v)
    const reward = v === 'ok' ? COINS.bekatOk : v === 'close' ? COINS.bekatClose : 0
    m.coins += reward
    g.addCoins(reward)
    this.station(m, v, { words: r.words, heard: r.heard, tip: v === 'miss' ? tipFor(it.text, r.heard)?.text || '' : '' })
    const next = () => {
      m.i++
      m.tries = 1
      if (m.i < m.lines.length) this.later(m, 0.5, () => this.bekatLine(m))
      else this.bekatDone(m)
    }
    if (it.kind === 'answer' && it.text) {
      // the NPC says a model answer
      this.later(m, 0.7, () => {
        this.station(m, 'model', { words: r.words, heard: r.heard })
        this.say(m, it.text, it.voice || 'teacher').then(ok => { if (ok) this.later(m, 0.4, next) })
      })
    } else this.later(m, 1.1, next)
  }

  /* Listen mode at a Bekat: which Uzbek sentence did the NPC say? (this phrase + 2 others) */
  listenBekat(m) {
    const it = m.item
    const others = [...this.deck.bekat, ...this.deck.starterBekat].filter(p => p.uz && p.uz !== it.uz).map(p => p.uz)
    const opts = [it.uz || it.text]
    for (let k = 0; k < 12 && opts.length < 3 && others.length; k++) {
      const u = others[(m.id * 5 + k * 7) % others.length]
      if (!opts.includes(u)) opts.push(u)
    }
    while (opts.length < 3) opts.push(opts[0])
    const order = [0, 1, 2].sort((a, b) => ((m.id * 31 + a * 17) % 7) - ((m.id * 31 + b * 17) % 7))
    m.options = order.map(i => ({ text: opts[i], target: i === 0 }))
    m.listen = true
    this.station(m, 'listen', { options: m.options })
  }

  pickOption(m, i) {
    if (m.picked != null) return
    const pick = m.options[i]
    if (!pick) return
    m.picked = i
    const ok = pick.target === true || pick.text === m.item.text
    if (m.type === 'revive') { this.reviveResult(m, { v: ok ? 'ok' : 'miss', heard: pick.text }); return }
    m.picked = null
    this.bekatResult(m, { v: ok ? 'ok' : 'miss', heard: pick.text })
  }

  bekatDone(m) {
    const g = this.game
    const allOk = m.results.length >= 2 && m.results.every(v => v === 'ok')
    if (allOk) { g.power('x2', X2_TIME); this.sfx('perfect'); g.stats.perfect++ }
    this.station(m, 'done', { perfect: allOk })
    this.later(m, 1.6, () => {
      this.m = null
      this.set({ station: null })
      this.sfx('door')
      g.resumeFromStation()
    })
  }

  /* ── revive by voice (§B3.5) ────────────────────────────────────── */

  onCrash() {
    if (this.cfg.revive_voice === false || this.revivesUsed >= 2 || !this.deck) return false
    const item = this.deck.reviveItem(this.revivesUsed)
    if (!item) return false
    if (this.m) this.abort()
    const m = this.begin('revive', item, { nth: this.revivesUsed })
    this.reviveUi(m, 'intro')
    this.later(m, 0.4, () => {
      if (this.listenMode) {
        m.listen = true
        m.options = this.deck.optionsFor(item).map(o => ({ ...o, target: o.text === item.text }))
        this.reviveUi(m, 'listen', { options: m.options })
        this.say(m, item.text, 'teacher')
        return
      }
      this.say(m, item.text, item.kind === 'word' ? 'teacher' : item.voice || 'narrator').then(ok => {
        if (!ok) return
        this.later(m, 0.2, () => {
          const sec = item.kind === 'word' ? REVIVE_WORD : REVIVE_PHRASE
          this.open(m, sec, (r) => this.reviveResult(m, r), REVIVE_SERVER_EXTRA)
          if (this.m === m && m.phase === 'open') this.reviveUi(m, 'open')
        })
      })
    })
    return true
  }

  reviveUi(m, mode, extra = {}) {
    const it = m.item
    this.set({
      revive: {
        id: `${m.id}-${mode}`, mode, nth: m.nth, text: it.text, uz: it.uz || '', picture: it.picture || '',
        kind: it.kind, win: m.win || 0, ...extra,
      },
    })
  }

  reviveResult(m, r) {
    const g = this.game
    if (r.v === 'ok' || r.v === 'close') {
      this.record(m, r.v, r, { mm: 'r', tries: 2 })
      this.revivesUsed++
      this.sfx('revive')
      this.reviveUi(m, 'ok', { words: r.words, heard: r.heard })
      this.later(m, 0.8, () => {
        this.m = null
        this.set({ revive: null })
        g.revive()
      })
      return
    }
    if (r.v !== 'skip') this.record(m, 'miss', r, { mm: 'r', tries: 2 })
    this.reviveUi(m, 'fail', { words: r.words, heard: r.heard })
    this.sfx('miss')
    this.later(m, 1.6, () => this.endRun())
  }

  /* "Tugatish" on the revive card */
  skipRevive() {
    const m = this.m
    if (!m || m.type !== 'revive') return
    this.hooks.stopListening?.({ discard: true })
    this.endRun()
  }

  endRun() {
    this.m = null
    this.set({ revive: null })
    this.game.gameOver('crash')
  }

  /* ── twister (B1+, a gold token, once per run) ──────────────────── */

  onToken() {
    if (this.m || this.listenMode) return
    const item = this.deck.twister()
    if (!item) return
    const m = this.begin('twister', item)
    this.game.startRide({ pic: '' })
    this.later(m, RIDE.cardAt, () => {
      this.card(m, 'intro')
      this.say(m, item.text, item.voice || 'coach').then(ok => {
        if (!ok) return
        this.later(m, 0.2, () => {
          this.open(m, twisterWindow(item.n || 6), (r) => this.twisterResult(m, r))
          if (this.m === m && m.phase === 'open') this.card(m, 'open')
        })
      })
    })
  }

  twisterResult(m, r) {
    const g = this.game
    const v = r.v === 'skip' ? 'skip' : r.v
    this.record(m, v, r, { mm: 't' })
    this.card(m, v === 'skip' ? 'skip' : v, { words: r.words, heard: r.heard })
    if (v === 'ok') {
      this.sfx('perfect')
      g.popBalloon(true)
      this.later(m, 0.9, () => {
        this.m = null
        this.set({ card: null })
        g.startKite()
      })
      return
    }
    this.sfx(v === 'close' ? 'close' : 'miss')
    if (v === 'close') g.popBalloon(true)
    this.later(m, 1.2, () => this.finishRide(m))
  }

  /* ── Listen mode (§B3.8) ────────────────────────────────────────── */

  toListenMode(reason, error = '') {
    if (this.listenMode) return
    this.listenMode = true
    this.hooks.stopListening?.({ discard: true })
    this.set({ listenMode: true, toast: { kind: 'listen', reason, error, id: this.game.clock } })
    const m = this.m
    if (!m) return
    if (m.type === 'balloon') {
      // this balloon becomes a Listen one
      m.listen = true
      m.phase = 'start'
      this.listenBalloon(m)
    } else if (m.type === 'twister') {
      m.phase = 'judged'
      this.finishRide(m)
    } else if (m.type === 'bekat') {
      m.phase = 'start'
      this.listenBekat(m)
    } else if (m.type === 'revive') {
      m.phase = 'start'
      m.listen = true
      m.options = this.deck.optionsFor(m.item).map(o => ({ ...o, target: o.text === m.item.text }))
      this.reviveUi(m, 'listen', { options: m.options })
      this.say(m, m.item.text, 'teacher')
    }
  }

  /* the learner picked Listen mode themselves (after the mic tip, or in the pause sheet) */
  chooseListenMode() { this.toListenMode('choice') }
}

/* the Bekat character for a phrase's voice (Portrait keys of tobys-day/characters.jsx) */
export function npcFor(item) {
  const v = item?.voice || 'narrator'
  return { grandma: 'grandma', driver: 'driver', man: 'shopkeeper', girl: 'girl', boy: 'boy', teacher: 'teacher', mum: 'mum', coach: 'driver' }[v] || 'brown'
}

