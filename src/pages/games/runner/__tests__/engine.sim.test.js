/*
 * Whole simulated games (RUNNER_PLAN §B10 P1, §B11 engine.sim.test): the autopilot plays 10 minutes
 * at every level with a fake recogniser — no unavoidable deaths, a balloon every 13–20 s, a Bekat
 * every station_every_m (± 40 m), ≥ 15 spoken moments per 3 minutes of running.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { simulate } from './helpers.js'
import { LEVELS, LEVEL_ORDER, RIDE } from '../engine/levels.js'

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }

for (const level of LEVEL_ORDER) {
  test(`autopilot plays 10 minutes at ${level}`, async () => {
    const { game, hooks, events } = await simulate({ level, seconds: 600, seed: 11 + LEVEL_ORDER.indexOf(level), profile: { latency: 1.0, accuracy: 0.85 } })
    assert.equal(game.status, 'running', 'the run is still going')
    assert.equal(events.crashes, 0, 'no crashes')
    assert.equal(game.stats.crashes, 0)
    assert.equal(game.stats.stumbles, 0, 'no stumbles either')
    // a balloon every 13–20 s (gaps that hold a Bekat are longer by design)
    const stopsAt = events.stations.map(s => s.t)
    const gaps = []
    for (let i = 1; i < events.gates.length; i++) {
      const a = events.gates[i - 1].t
      const b = events.gates[i].t
      if (!stopsAt.some(t => t > a && t < b)) gaps.push(b - a)
    }
    const med = median(gaps)
    assert.ok(med >= 13 && med <= 20, `${level}: median balloon gap ${med.toFixed(1)} s`)
    // Bekat at station_every_m ± 40 m
    const every = LEVELS[level].stationEvery
    assert.ok(events.stations.length >= 4, `${level}: ${events.stations.length} Bekats`)
    let prev = 0
    for (const st of events.stations) {
      const d = st.stop - prev
      assert.ok(d >= every - 1 && d <= every + 40, `${level}: Bekat after ${d} m`)
      assert.ok(Math.abs(st.dist - st.stop) < 1.5, 'Toby stops at the platform')
      prev = st.stop
    }
    // ≥ 15 spoken moments per 3 minutes of running (the speed ramp's 180 s)
    const perRun = (hooks.log.listens / game.runT) * 180
    const perClock = (hooks.log.listens / game.clock) * 180
    assert.ok(perRun >= 15, `${level}: ${perRun.toFixed(1)} spoken moments per 3 min of running (${perClock.toFixed(1)} per 3 min of play)`)
    // every landing comes with the shield
    assert.ok(events.landings.length >= 20)
    // the mic never opened while a model line was playing
    assert.equal(hooks.log.openDuringSay, 0)
    assert.equal(hooks.log.maxOpenWhileSaying, 0)
    console.log(`  ${level}: ${game.meters()} m, ${events.gates.length} balloons (median gap ${med.toFixed(1)} s), ${events.stations.length} Bekats, ${perRun.toFixed(1)}/${perClock.toFixed(1)} spoken per 3 min (running/play), score ${game.score()}, coins ${game.coinsGot}, autopilot fails ${game.auto.fails}`)
  })
}

test('the landing shield and the ride altitude', async () => {
  let minAltListening = Infinity
  let shields = 0
  let landings = 0
  let wasRide = false
  await simulate({ level: 'B1', seconds: 240, seed: 4, profile: { latency: 1.2, accuracy: 0.8 }, onFrame: (g) => {
    const m = g.director.m
    if (m && m.type === 'balloon' && m.phase === 'open') minAltListening = Math.min(minAltListening, g.player.y)
    if (wasRide && g.phase === 'run') { landings++; if (g.player.shield >= RIDE.shield - 0.05) shields++ }
    wasRide = g.phase === 'ride'
  } })
  assert.ok(minAltListening >= RIDE.alt - 1e-6, `listening at ${minAltListening} m`)
  assert.ok(landings >= 8)
  assert.equal(shields, landings)
})

test('same seed, same inputs → the same game', async () => {
  const a = await simulate({ level: 'A2', seconds: 150, seed: 21 })
  const b = await simulate({ level: 'A2', seconds: 150, seed: 21 })
  assert.equal(a.game.dist, b.game.dist)
  assert.deepEqual(a.game.summary().outcomes.map(o => o.v), b.game.summary().outcomes.map(o => o.v))
  assert.equal(a.game.coinsGot, b.game.coinsGot)
})
