/*
 * The speaking moments (RUNNER_PLAN §B3, §B11 director.test): windows, the mic never open while a
 * model line plays, latency profiles (300 ms / 1.5 s / 3.5 s), server mode with its hold (≤ 6 s),
 * echo retry, skips → the mic tip, in-run requeue, Listen mode, revive by voice and Bekat lines.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulate, deckItems, ITEMS } from './helpers.js'
import { Deck } from '../engine/deck.js'
import { JUDGE_MAX, SERVER_EXTRA, echoWindow, twisterWindow, wordWindow } from '../engine/levels.js'

const r1 = (x) => Math.round(x * 10) / 10

test('window formula values (§B3.2 table)', () => {
  assert.equal(r1(wordWindow(1, 'A1')), 4.5)
  assert.equal(r1(wordWindow(1, 'A1') + SERVER_EXTRA), 7.5)
  assert.equal(r1(wordWindow(1, 'B1')), 3.9)
  assert.equal(r1(wordWindow(1, 'B1') + SERVER_EXTRA), 6.9)
  assert.equal(r1(wordWindow(1, 'C1')), 3.5)
  assert.equal(r1(wordWindow(1, 'C1') + SERVER_EXTRA), 6.5)
  assert.equal(r1(echoWindow(6, 'A2')), 5.1)
  assert.equal(r1(echoWindow(6, 'A2') + SERVER_EXTRA), 8.1)
  assert.equal(r1(echoWindow(12, 'C1')), 6.7)
  assert.equal(r1(twisterWindow(7)), 4.3)
  assert.equal(wordWindow(1, 'C1', 0.8), 3.5)               // never below 3.5 s
})

for (const [name, latency] of [['300 ms', 0.3], ['1.5 s', 1.5], ['3.5 s', 3.5]]) {
  test(`a fake recogniser answering after ${name}: every balloon passes on the first try`, async () => {
    for (const level of ['A1', 'C1']) {
      const lat = level === 'C1' && latency > 3 ? 3.3 : latency     // C1 single-word windows are 3.5 s
      const { game, hooks } = await simulate({ level, seconds: 120, seed: 5, profile: { latency: lat, accuracy: 1 } })
      const balloons = game.director.outcomes.filter(o => o.m === 'b')
      assert.ok(balloons.length >= 5, `${level}: ${balloons.length} balloons`)
      for (const o of balloons) {
        assert.equal(o.v, 'ok', `${level} ${o.text}`)
        assert.equal(o.tries, 1)
        assert.ok(o.ms >= lat * 1000 - 40 && o.ms <= lat * 1000 + 60, `ms ${o.ms}`)
      }
      assert.equal(hooks.log.openDuringSay, 0)
      assert.equal(game.stats.crashes, 0)
    }
  })
}

test('server mode (Whisper stub at 2.5 s): slower rides, longer windows, the flat speed bonus', async () => {
  let minSpeedK = 1
  const { game, hooks } = await simulate({ level: 'A2', seconds: 150, seed: 6, profile: { server: true, serverLatency: 2.5, accuracy: 1 }, onFrame: (g) => {
    if (g.phase === 'ride' && g.ride.phase === 'hold') minSpeedK = Math.min(minSpeedK, g.speedK)
  } })
  const d = game.director
  assert.equal(game.summary().stt, 'server')
  assert.ok(minSpeedK < 0.72, `ride speed ×${minSpeedK.toFixed(2)}`)
  const b = d.outcomes.filter(o => o.m === 'b')
  assert.ok(b.length >= 4)
  for (const o of b) assert.equal(o.v, 'ok')
  assert.ok(d.clips >= b.length)
  assert.equal(hooks.log.openDuringSay, 0)
  // flat 25 per first-try balloon: points = 125 each
  assert.equal(d.points - d.outcomes.filter(o => o.m === 's').reduce((s, o) => s + (o.v === 'ok' ? 150 : o.v === 'close' ? 100 : 0), 0), b.length * 125)
})

test('server hold: a late transcript is waited for at most 6 s, then the balloon gives a skip', async () => {
  const holds = []
  let holdAt = null
  const { game } = await simulate({ level: 'A1', seconds: 100, seed: 7, profile: { server: true, serverLatency: 14, accuracy: 1 }, onFrame: (g) => {
    const m = g.director.m
    if (m?.phase === 'hold' && holdAt == null) holdAt = g.clock
    if (holdAt != null && m?.phase !== 'hold') { holds.push(g.clock - holdAt); holdAt = null }
  } })
  assert.ok(holds.length >= 2)
  for (const h of holds) assert.ok(h <= JUDGE_MAX + 0.1, `held ${h.toFixed(2)} s`)
  assert.ok(game.director.outcomes.some(o => o.v === 'skip'))
})

test('a wrong word: the model voice says it, then one echo retry for half points', async () => {
  const { game, hooks } = await simulate({ level: 'A1', seconds: 90, seed: 8, profile: { latency: 0.9, wrongFirst: true } })
  const b = game.director.outcomes.filter(o => o.m === 'b')
  assert.ok(b.length >= 6)
  for (let i = 0; i < b.length - 1; i += 2) {
    assert.deepEqual([b[i].v, b[i].tries, b[i + 1].v, b[i + 1].tries], ['miss', 1, 'ok', 2])
    assert.equal(b[i].text, b[i + 1].text)
  }
  assert.equal(hooks.log.openDuringSay, 0)
  assert.equal(game.director.passes, game.director.outcomes.filter(o => o.m === 's' && o.tries === 1 && o.v !== 'miss' && o.v !== 'skip').length)
})

test('silence: skips change nothing, and three in a row bring the mic tip + Listen mode offer', async () => {
  const toasts = []
  const { game } = await simulate({ level: 'A1', seconds: 80, seed: 9, profile: { silence: 1 }, hooks: { set: (p) => { if (p.toast) toasts.push(p.toast) } } })
  const b = game.director.outcomes.filter(o => o.m === 'b')
  assert.ok(b.length >= 3)
  assert.ok(b.every(o => o.v === 'skip'))
  const tip = toasts.find(t => t.kind === 'mic-tip')
  assert.ok(tip && tip.offerListen)
  assert.equal(game.director.points, 0)
})

test('in-run requeue: a miss comes back once 40–80 s later, a heard word 60–90 s later as recall', () => {
  const items = deckItems(0)
  const deck = new Deck(items, { level: 'A1', seed: 3 })
  const a = deck.nextBalloon(0)
  a.pt = 'picture'
  deck.result(a, 'miss', 100)
  assert.equal(deck.later.length, 1)
  assert.ok(deck.later[0].at >= 140 && deck.later[0].at <= 180)
  deck.result(a, 'miss', 110)                      // once only
  assert.equal(deck.later.length, 1)
  const h = deck.nextBalloon(0)
  h.pt = 'hear'
  deck.result(h, 'ok', 100)
  const back = deck.later.find(l => l.inst.text === h.text)
  assert.ok(back.at >= 160 && back.at <= 190)
  assert.notEqual(back.inst.pt, 'hear')            // the second time is real recall
  // due requeued items come before the rest
  const first = deck.later.sort((x, y) => x.at - y.at)[0]
  assert.equal(deck.nextBalloon(1000).text, first.inst.text)
})

test('prompt downgrade and choices', () => {
  const deck = new Deck([
    { k: 'w', id: 1, kind: 'word', pt: 'picture', text: 'zebra', uz: 'zebra', picture: 'not-a-picture' },
    { k: 'w', id: 2, kind: 'word', pt: 'uz', text: 'bus', uz: '', picture: 'bus' },
    { k: 'w', id: 3, kind: 'word', pt: 'choice', text: 'apple', uz: 'olma', picture: 'apple' },
    { k: 'w', id: 4, kind: 'word', pt: 'picture', text: 'dog', uz: 'it', picture: 'dog' },
  ], { level: 'A1', seed: 1 })
  assert.equal(deck.nextBalloon(0).pt, 'uz')       // unknown picture → uz
  assert.equal(deck.nextBalloon(0).pt, 'picture')  // no uz → picture
  const c = deck.nextBalloon(0)
  assert.equal(c.pt, 'choice')
  assert.equal(c.choices.length, 3)
  assert.ok(c.choices.includes('apple'))
})

test('Listen mode: three balloons, Toby swipes into the right one, outcomes are for meaning', async () => {
  const { game } = await simulate({ level: 'A1', seconds: 90, seed: 10, listenMode: true, answer: true })
  const d = game.director
  const b = d.outcomes.filter(o => o.m === 'b')
  assert.ok(b.length >= 4)
  for (const o of b) { assert.equal(o.pt, 'listen'); assert.equal(o.v, 'ok') }
  assert.equal(game.summary().mode, 'listen')
})

test('a fatal mic error switches to Listen mode with a toast', async () => {
  const toasts = []
  const ref = {}
  const { game } = await simulate({ level: 'A1', seconds: 40, seed: 12, hooks: {
    set: (p) => { if (p.toast) toasts.push(p.toast) },
    // the browser refuses the microphone
    listen: (lid) => ref.g.after(0.2, () => ref.g.director.listenEnded(lid, [], 'not-allowed')),
  }, onFrame: (g) => { ref.g = g } })
  assert.ok(game.director.listenMode)
  assert.ok(toasts.some(t => t.kind === 'listen' && t.reason === 'mic'))
})

test('revive by voice: a crash offers a missed word; a pass puts Toby back with a shield', async () => {
  let crashed = false
  let revived = false
  const { game } = await simulate({ level: 'A1', seconds: 60, seed: 13, profile: { latency: 0.8 }, onFrame: (g) => {
    if (!crashed && g.phase === 'run' && g.clock > 20) { crashed = true; g.hitFront() }
    if (crashed && !revived && g.revives === 1) { revived = true; assert.ok(g.player.shield > 1.5) }
  } })
  assert.ok(revived)
  assert.equal(game.status, 'running')
  const r = game.director.outcomes.filter(o => o.m === 'r')
  assert.equal(r.length, 1)
  assert.equal(r[0].tries, 2)
})

test('a Bekat: two lines, chest coins, x2 when both are perfect', async () => {
  const { game } = await simulate({ level: 'A2', seconds: 100, seed: 14, profile: { latency: 0.8, accuracy: 1 } })
  const s = game.director.outcomes.filter(o => o.m === 's')
  assert.ok(s.length >= 2)
  assert.ok(s.every(o => o.v === 'ok'))
  assert.ok(game.stationsDone >= 1)
  assert.ok(game.powers.x2 > 0)
  assert.ok(ITEMS().length > 200)
})

test('the recogniser breaks mid-run while the admin switched Whisper off: Listen mode, no server listen', async () => {
  const toasts = []
  const ref = {}
  let listens = 0
  const { game } = await simulate({ level: 'A1', seconds: 40, seed: 15, config: { server_stt: false }, hooks: {
    set: (p) => { if (p.toast) toasts.push(p.toast) },
    listen: (lid) => { listens++; ref.g.after(0.3, () => ref.g.director.listenEnded(lid, [], 'retry')) },
  }, onFrame: (g) => { ref.g = g } })
  assert.ok(game.director.listenMode)
  assert.equal(game.director.serverMode, true)
  assert.equal(listens, 1, 'the window is not reopened for the server')
  assert.equal(game.director.clips, 0)
  assert.ok(toasts.some(t => t.kind === 'listen' && t.reason === 'server'))
})
