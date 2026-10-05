/* Daily missions (missions.js, §B7): 3 active, ≥ 2 speaking, ≤ 6 a day, daily roll-over, the server swap. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_PER_DAY, MISSIONS, applyFixes, applyRun, missionInfo, rollMissions, runMetrics, tashkentDay } from '../missions.js'

const DAY = '2026-10-04'
const word = (id, v = 'ok', extra = {}) => ({ k: 'w', id, kind: 'word', pt: 'picture', v, tries: 1, ms: 1200, ...extra })

test('a day starts with 3 missions, at least 2 about speaking, the same set for the same day', () => {
  for (const day of ['2026-10-04', '2026-10-05', '2026-12-31']) {
    const m = rollMissions(null, { day })
    assert.equal(m.active.length, 3)
    assert.ok(m.active.filter(a => missionInfo(a.id).kind === 'speak').length >= 2)
    assert.deepEqual(rollMissions(null, { day }).active, m.active)
  }
  assert.equal(MISSIONS.filter(m => !m.server).length, 12)
})

test('a new day starts over', () => {
  const m = { day: '2026-10-03', active: [{ id: 'say8', p: 5 }], done_today: 6, done: ['a'], fixes: 2 }
  const n = rollMissions(m, { day: DAY })
  assert.equal(n.day, DAY)
  assert.equal(n.done_today, 0)
  assert.equal(n.active.length, 3)
})

test('"in one run" keeps the best run; daily missions add up; a finished one pays and is replaced', () => {
  let m = { day: DAY, active: [{ id: 'say8', p: 0 }, { id: 'run2000', p: 0 }, { id: 'fix3', p: 0 }], done_today: 0, done: [], fixes: 0 }
  const run = (n, dist) => ({ outcomes: Array.from({ length: n }, (_, i) => word(i + 1)), distance_m: dist, coins: 0, passes: n, stats: {} })
  let r = applyRun(m, run(5, 900), { day: DAY })
  assert.deepEqual(r.completed, [])
  assert.equal(r.missions.active.find(a => a.id === 'say8').p, 5)
  assert.equal(r.missions.active.find(a => a.id === 'run2000').p, 900)
  r = applyRun(r.missions, run(4, 1200), { day: DAY })
  assert.equal(r.missions.active.find(a => a.id === 'say8').p, 5, 'best single run, not a sum')
  assert.deepEqual(r.completed.map(c => c.id), ['run2000'])
  assert.equal(r.reward, missionInfo('run2000').reward)
  assert.equal(r.missions.active.length, 3, 'topped up again')
  r = applyRun(r.missions, run(8, 100), { day: DAY })
  assert.ok(r.completed.some(c => c.id === 'say8'))
  m = r.missions
  for (let i = 0; i < 3; i++) m = applyFixes(m, 1, { day: DAY }).missions
  assert.ok(m.done.includes('fix3'))
})

test('at most 6 completions a day', () => {
  let m = rollMissions(null, { day: DAY })
  let total = 0
  const huge = {
    outcomes: Array.from({ length: 40 }, (_, i) => word(i + 1, 'ok', { ms: 900 })), distance_m: 9000, coins: 900, passes: 30, revives: 2,
    stats: { perfect: 3, puffs: 3, rolls: 20, roofM: 400, magnets: 4 },
  }
  for (let i = 0; i < 10; i++) {
    const r = applyRun(m, huge, { day: DAY })
    m = applyFixes(r.missions, 3, { day: DAY }).missions
    total = m.done_today
  }
  assert.equal(total, MAX_PER_DAY)
  assert.equal(m.active.length, 0)
})

test('server mode swaps "5 fast answers" for "10 passes"; fast answers only count in the browser', () => {
  const m = { day: DAY, active: [{ id: 'fast5', p: 2 }], done_today: 0, done: [], fixes: 0 }
  const s = rollMissions(m, { day: DAY, server: true })
  assert.ok(s.active.some(a => a.id === 'pass10'))
  assert.ok(!s.active.some(a => a.id === 'fast5'))
  const summary = { outcomes: [word(1, 'ok', { ms: 800 }), word(2, 'ok', { ms: 2000 }), word(3, 'ok', { ms: null })], passes: 3, stats: {} }
  assert.equal(runMetrics(summary).fast5, 1)
  assert.equal(runMetrics(summary, { server: true }).fast5, 0)
})

test('learn5 counts items heard first and then recalled in the same run', () => {
  const outs = [
    { k: 'w', id: 1, kind: 'word', pt: 'hear', v: 'ok', tries: 1 },
    { k: 'w', id: 2, kind: 'word', pt: 'hear', v: 'ok', tries: 1 },
    { k: 'w', id: 1, kind: 'word', pt: 'picture', v: 'ok', tries: 1 },
    { k: 'w', id: 2, kind: 'word', pt: 'uz', v: 'miss', tries: 1 },
    { k: 'w', id: 3, kind: 'word', pt: 'picture', v: 'ok', tries: 1 },
  ]
  assert.equal(runMetrics({ outcomes: outs, stats: {} }).learn5, 1)
})

test('the day is Tashkent time', () => {
  assert.equal(tashkentDay(new Date('2026-10-04T19:30:00Z')), '2026-10-05')
  assert.equal(tashkentDay(new Date('2026-10-04T18:59:00Z')), '2026-10-04')
})

test('Listen-mode swipes and revives are not "said": speaking missions count spoken passes only', () => {
  const summary = {
    outcomes: [word(1), word(2, 'ok', { pt: 'listen', ms: null }), word(3, 'ok', { pt: 'listen', ms: null }), word(4, 'ok', { m: 'r', tries: 2 })],
    passes: 3, stats: {},
  }
  const m = runMetrics(summary, { server: true })
  assert.equal(m.say8, 1)
  assert.equal(m.pass10, 1)
})
