/* Score parity with the server: sat/games/fixtures/runner_score_cases.json (RUNNER_PLAN §B7). */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { liveScore, rnd, score, speedBonus } from '../engine/score.js'
import { wordWindow } from '../engine/levels.js'

const FIXTURE = fileURLToPath(new URL('../../../../../../sat/games/fixtures/runner_score_cases.json', import.meta.url))

test('every fixture case matches the Python formula', () => {
  const { cases } = JSON.parse(readFileSync(FIXTURE, 'utf8'))
  assert.ok(cases.length >= 20)
  for (const c of cases) {
    const r = score(c.outcomes, c.args)
    assert.deepEqual({ points: r.points, passes: r.passes, score: r.score }, c.expected, c.name)
  }
})

test('hand-computed values', () => {
  assert.equal(Math.round(wordWindow(1, 'A1') * 1000), 4485)
  assert.equal(speedBonus(1320, wordWindow(1, 'A1'), 'browser'), 41)
  assert.equal(speedBonus(299, 4, 'browser'), 0)
  assert.equal(speedBonus(600, 4, 'browser'), 50)
  assert.equal(speedBonus(9000, 4, 'server'), 25)
  assert.equal(rnd(2.5), 3)
  assert.equal(rnd(0.49999999999999994), 1)          // the same as Python's floor(x + 0.5)
  assert.equal(liveScore(141, 1, 1000, 'A1'), 1255)
})
