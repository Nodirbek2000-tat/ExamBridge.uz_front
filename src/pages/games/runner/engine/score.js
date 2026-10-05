/*
 * TOBY RUN — the score formula (RUNNER_PLAN §B7). The server recomputes it with the same
 * numbers (sat/games/runner_logic.py); sat/games/fixtures/runner_score_cases.json is checked
 * by both test suites, so the live HUD and the leaderboard always agree.
 *
 *   points    = Σ item points
 *     balloon first-try ok 100 + speed bonus · close 60 · echo-retry pass 50
 *     Bekat line ok 150 · close 100 · twister ok 200 · close 120 · revive 0
 *     speed bonus (browser) round(50 · clamp(1 − (ms − 600) / (W·1000 − 600), 0, 1)); ms < 300 → 0
 *     speed bonus (server)  flat 25
 *   passes    = first-try ok + first-try close (balloon, Bekat, twister)
 *   score     = round((distance_m + points) × (1 + 0.1 × min(passes, 20)) × levelK)
 *
 * Outcome: { m: 'b' | 's' | 't' | 'r', v: 'ok' | 'close' | 'miss' | 'skip', tries, ms, n }
 */
import { LEVELS, wordWindow } from './levels.js'

/* round half up — the same as the server's floor(x + 0.5) (Math.round differs for some inputs) */
export const rnd = (x) => Math.floor(x + 0.5)
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

export function speedBonus(ms, w, stt) {
  if (stt === 'server') return 25
  if (ms == null || ms < 300) return 0
  return rnd(50 * clamp(1 - (ms - 600) / (w * 1000 - 600), 0, 1))
}

export function itemPoints(o, { level, stt = 'browser', mode = 'voice', windowScale = 1 }) {
  if (o.v !== 'ok' && o.v !== 'close') return 0
  const m = o.m || 'b'
  const first = (o.tries || 1) <= 1
  if (m === 'b') {
    if (!first) return 50
    if (o.v === 'close') return 60
    const bonus = mode === 'voice' || mode === 'card' ? speedBonus(o.ms, wordWindow(o.n || 1, level, windowScale), stt) : 0
    return 100 + bonus
  }
  if (m === 's') return o.v === 'ok' ? 150 : 100
  if (m === 't') return o.v === 'ok' ? 200 : 120
  return 0
}

export const isPass = (o) => (o.v === 'ok' || o.v === 'close') && (o.tries || 1) <= 1 && ['b', 's', 't'].includes(o.m || 'b')

export function score(outcomes, { level, distance_m: distance, stt = 'browser', mode = 'voice', window_scale: ws = 1 }) {
  let points = 0
  let passes = 0
  for (const o of outcomes) {
    points += itemPoints(o, { level, stt, mode, windowScale: ws })
    if (isPass(o)) passes++
  }
  const mult = 1 + 0.1 * Math.min(passes, 20)
  const K = (LEVELS[level] || LEVELS.A1).K
  return { points, passes, mult, score: rnd((Math.max(0, Math.floor(distance)) + points) * mult * K) }
}

/* the live HUD: points and passes are summed once per outcome, distance changes every frame */
export function liveScore(points, passes, distance, level) {
  const K = (LEVELS[level] || LEVELS.A1).K
  return rnd((Math.max(0, Math.floor(distance)) + points) * (1 + 0.1 * Math.min(passes, 20)) * K)
}
