/* The saved state (wallet.js): the coin ledger and merging — "two quick saves lose nothing" (§B10 P4). */
import test from 'node:test'
import assert from 'node:assert/strict'
import { coinsOf, earn, emptyProgress, merge, normalize, spend } from '../wallet.js'

const at = (p, ts) => ({ ...p, ts })

test('two devices saving at once: every coin earned and every purchase survives, in any merge order', () => {
  const server0 = at(emptyProgress(), 1)
  // device A earns 100 and buys a cap for 40; device B, from the same old copy, earns 30
  const a1 = at(earn(server0, 'A', 100), 2)
  const a2 = at({ ...spend(a1, 'A', 40), owned: ['cap'] }, 3)
  const b1 = at(earn(server0, 'B', 30), 4)
  const expect = 100 - 40 + 30
  for (const [x, y, z] of [[server0, a2, b1], [b1, server0, a2], [a2, b1, server0]]) {
    const m = merge(merge(x, y), z)
    assert.equal(m.coins, expect)
    assert.deepEqual(m.owned, ['cap'])
  }
  // an older copy of A arriving late changes nothing
  const late = merge(merge(a2, b1), a1)
  assert.equal(late.coins, expect)
  assert.deepEqual(late.owned, ['cap'])
})

test('two quick saves on one device (the second built on a stale read) lose nothing', () => {
  const base = at(earn(emptyProgress(), 'A', 50), 1)
  const first = at({ ...earn(base, 'A', 20), level: 'A2' }, 2)          // a run's coins
  const second = at({ ...base, settings: { ...base.settings, calm: true } }, 3)   // a settings change from the stale copy
  const m = merge(first, second)
  assert.equal(m.coins, 70, 'the run coins are kept although the newer copy did not have them')
  assert.equal(m.settings.calm, true)
})

test('merge keeps the best upgrades and bests, the union of owned items, the newer choices', () => {
  const a = at({ ...emptyProgress(), up: { magnet: 3, x2: 0, gilam: 1 }, best: { A1: 900 }, owned: ['bow'], equip: { outfit: 'bow', carpet: 'carpet-klassik', runner: 'toby' } }, 5)
  const b = at({ ...emptyProgress(), up: { magnet: 1, x2: 2, gilam: 0 }, best: { A1: 1200, B1: 40 }, owned: ['cap'], equip: { outfit: 'cap', carpet: 'carpet-ikat', runner: 'toby' } }, 9)
  const m = merge(a, b)
  assert.deepEqual(m.up, { magnet: 3, x2: 2, gilam: 1 })
  assert.deepEqual(m.best, { A1: 1200, B1: 40 })
  assert.deepEqual([...m.owned].sort(), ['bow', 'cap'])
  assert.equal(m.equip.outfit, 'cap')
})

test('spending more than the wallet holds is refused; legacy "coins" become a base ledger entry', () => {
  const p = earn(emptyProgress(), 'A', 30)
  assert.equal(spend(p, 'A', 31), null)
  assert.equal(coinsOf(spend(p, 'B', 30)), 0)
  const legacy = normalize({ coins: 420 })
  assert.equal(legacy.coins, 420)
  assert.deepEqual(legacy.wallet, { base: { e: 420, s: 0 } })
  // the legacy copy merged with a ledger copy that already absorbed it does not double the coins
  const absorbed = at(earn(normalize({ coins: 420 }), 'A', 10), 2)
  assert.equal(merge(normalize({ coins: 420 }), absorbed).coins, 430)
})

test('the JSON stays small (≤ 20 KB) with a full history', () => {
  let p = emptyProgress()
  for (let i = 0; i < 12; i++) p = earn(p, `dev${i}`, 1000 + i)
  p = { ...p, owned: Array.from({ length: 60 }, (_, i) => `item-${i}`), runs: Array.from({ length: 20 }, (_, i) => `${i}`.padStart(32, 'f')) }
  assert.ok(JSON.stringify(normalize(p)).length < 20 * 1024)
})

test('many devices (school PCs, private windows): a new device beyond the first dozen keeps its coins', () => {
  let p = emptyProgress()
  for (let i = 0; i < 20; i++) p = earn(p, `dev${i}`, 10)
  const late = earn(p, 'newphone', 500)
  const n = normalize(JSON.parse(JSON.stringify(late)))
  assert.equal(n.coins, 20 * 10 + 500)
  // over the cap the least active devices go, never the busy one
  let q = emptyProgress()
  for (let i = 0; i < 70; i++) q = earn(q, `d${i}`, 1)
  q = earn(q, 'busy', 900)
  const m = normalize(q)
  assert.ok(m.wallet.busy && m.wallet.busy.e === 900)
  assert.ok(Object.keys(m.wallet).length <= 64)
})
