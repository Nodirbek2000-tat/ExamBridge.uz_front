/* The track (RUNNER_PLAN §B11 track.test): determinism by seed, arches reachable from every lane, Bekat clearance. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Track, GATE_AT, GATE_CLEAR, STATION_STOP } from '../engine/track.js'
import { CHUNKS, OBSTACLE_SPAN } from '../engine/chunks.js'
import { LEVEL_ORDER, LEVELS } from '../engine/levels.js'

function build(seed, level = 'B1', upto = 4000) {
  const t = new Track({ seed, level, firstGate: 52 })
  const log = []
  for (let d = 0; d < upto; d += 20) {
    t.ensure(d, Math.min(1, d / 2500), LEVELS[level].start + d / 400, 4.25)
    for (const o of t.obstacles) if (!o.logged) { o.logged = true; log.push(`${o.type}:${o.lane}:${o.z}`) }
  }
  return { t, log }
}

test('the same seed builds the same track; another seed does not', () => {
  for (const level of LEVEL_ORDER) {
    const a = build(1234, level)
    const b = build(1234, level)
    assert.deepEqual(a.log, b.log, level)
    assert.deepEqual(a.t.gates.map(g => g.s), b.t.gates.map(g => g.s))
    const c = build(99, level)
    assert.notDeepEqual(a.log, c.log)
  }
})

test('chunks keep their obstacles inside 6–36 m', () => {
  for (const c of CHUNKS) {
    for (const [type, , at, ramp] of c.items) {
      const len = { low: 0.6, high: 0.5, wall: 1.6, train: 14, move: 14 }[type]
      assert.ok(at - (ramp ? 6 : 0) >= OBSTACLE_SPAN[0], `${c.id} starts too early`)
      if (type !== 'move') assert.ok(at + len <= OBSTACLE_SPAN[1] + 1e-9, `${c.id} ends too late`)
      else assert.ok(at >= 30, `${c.id}: an oncoming carriage sits at 30–36 m`)
    }
  }
  assert.ok(CHUNKS.length >= 40)
})

test('every arch can be reached from every lane: nothing 10 m before it or after it', () => {
  for (const level of LEVEL_ORDER) {
    for (const seed of [3, 17, 2024]) {
      const t = new Track({ seed, level, firstGate: 52 })
      const all = []
      for (let d = 0; d < 6000; d += 20) {
        t.ensure(d, Math.min(1, d / 3000), LEVELS[level].cap, 4.25)
        for (const o of t.obstacles) if (!o.seen) { o.seen = true; all.push({ ...o }) }
      }
      assert.ok(t.gates.length >= 10, `${level}: arches are placed`)
      for (const g of t.gates) {
        for (const o of all) {
          const from = o.z - (o.ramp || 0)
          const to = o.z + o.len
          if (o.vz) continue                     // oncoming carriages are never placed in or next to a gate chunk
          assert.ok(to <= g.s - 10 || from >= g.s + 10, `${level}/${seed}: ${o.type} at ${from}–${to} near the arch at ${g.s}`)
        }
      }
      assert.equal(GATE_CLEAR - GATE_AT, 10)
    }
  }
})

test('a Bekat has 60 m of clear track before its platform, and comes every station_every_m ± 40 m', () => {
  for (const level of LEVEL_ORDER) {
    const t = new Track({ seed: 5, level, firstGate: 52 })
    const all = []
    for (let d = 0; d < 6000; d += 20) {
      t.ensure(d, 0.5, LEVELS[level].cap, 4.25)
      for (const o of t.obstacles) if (!o.seen) { o.seen = true; all.push({ ...o }) }
    }
    let prev = 0
    const stops = t.stations.map(s => s.stop)
    assert.ok(stops.length >= 3)
    for (const st of t.stations) {
      assert.equal(st.stop - st.s0, STATION_STOP)
      for (const o of all) {
        if (o.vz) continue
        assert.ok(o.z + o.len <= st.s0 || o.z - (o.ramp || 0) >= st.stop + 20, `${level}: ${o.type} inside the Bekat run-up`)
      }
      // no arch so close before a platform that a ride would reach it
      for (const g of t.gates) assert.ok(g.s >= st.stop || st.stop - g.s >= 60, `${level}: arch at ${g.s} too close to the stop at ${st.stop}`)
      const gap = st.stop - prev
      assert.ok(gap >= LEVELS[level].stationEvery && gap < LEVELS[level].stationEvery + 40 + 1, `${level}: Bekat gap ${gap}`)
      prev = st.stop
    }
  }
})

test('after an arch come chunks with landing slots in every lane', () => {
  for (const level of LEVEL_ORDER) {
    const t = new Track({ seed: 8, level, firstGate: 52 })
    for (let d = 0; d < 3000; d += 20) t.ensure(d, 1, LEVELS[level].cap, 4.25)
    assert.ok(t.landable.length >= 3, `${level}: ${t.landable.length} landable chunks`)
    assert.ok(t.landable.every(c => !c.moving))
  }
})
