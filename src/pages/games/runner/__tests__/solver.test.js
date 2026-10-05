/* The solver (RUNNER_PLAN §B11 solver.test): every chunk runnable at the top speed with a 0.35 s reaction. */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHUNKS, CLEAR } from '../engine/chunks.js'
import { landableSet, landingSlots, solveChunk } from '../engine/solver.js'
import { LEVELS, LEVEL_ORDER } from '../engine/levels.js'

const levelsFor = (c) => LEVEL_ORDER.filter(k => c.d >= LEVELS[k].diff[0] && c.d <= LEVELS[k].diff[1])

test('every chunk can be run from every lane at the cap speed of each level that uses it', () => {
  for (const c of CHUNKS) {
    const levels = levelsFor(c)
    assert.ok(levels.length, `${c.id} is used by some level`)
    for (const lv of levels) {
      const r = solveChunk(c, { speed: LEVELS[lv].cap, reaction: 0.35 })
      assert.ok(r.ok, `${c.id} at ${lv} (${LEVELS[lv].cap} m/s): lanes ${r.lanes.map(Boolean)}`)
    }
  }
})

test('…and still with the admin speed scale at its top (×1.2)', () => {
  for (const c of CHUNKS) {
    const top = Math.max(...levelsFor(c).map(k => LEVELS[k].cap))
    assert.ok(solveChunk(c, { speed: top * 1.2, reaction: 0.35 }).ok, c.id)
  }
})

test('a plan respects the reaction time between actions', () => {
  for (const c of CHUNKS) {
    const r = solveChunk(c, { speed: 16, reaction: 0.35 })
    for (const lane of r.lanes) {
      if (!lane) continue
      for (let i = 1; i < lane.length; i++) assert.ok(lane[i].t - lane[i - 1].t >= 0.35 - 1e-9, c.id)
    }
  }
})

test('a chunk that cannot be run is caught', () => {
  const wall = { id: 'test-wall', d: 1, items: [['wall', 0, 10], ['wall', 1, 10], ['wall', 2, 10]], coins: [] }
  assert.equal(solveChunk(wall, { speed: 13 }).ok, false)
  const tight = { id: 'test-tight', d: 1, items: [['low', 0, 6], ['wall', 1, 6], ['wall', 2, 6]], coins: [] }
  assert.equal(solveChunk(tight, { speed: 18, reaction: 0.35 }).lanes[2], null)
})

test('landing slots: within 25 m in every lane for the chunks used after an arch', () => {
  for (const lv of LEVEL_ORDER) {
    const speed = LEVELS[lv].cap
    const landable = landableSet(CHUNKS.filter(c => !c.moving && c.d <= LEVELS[lv].diff[1]), speed)
    assert.ok(landable.length >= 3, `${lv}: ${landable.length}`)
    for (const c of landable) {
      for (const next of [CLEAR, ...landable]) {
        const r = landingSlots(c, { speed, within: 25, next })
        assert.ok(r.ok, `${lv}: ${c.id} → ${next.id} worst ${r.worst}`)
      }
    }
  }
})
