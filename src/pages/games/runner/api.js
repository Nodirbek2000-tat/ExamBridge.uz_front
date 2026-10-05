/*
 * TOBY RUN — the server (RUNNER_PLAN §B8.3). Every call may fail (offline); callers fall back.
 *   getDeck(level, topic)   GET  /games/runner/deck/        → { deck, seed, level, topic, server_stt, clips_left, config, items }
 *   postFinish(body)        POST /games/runner/finish/      → { score, best, new_best, ranked, flags, srs, points, passes }
 *   postPractice(deck, o)   POST /games/runner/practice/    → { fixed }
 *   getMe(level)            GET  /games/runner/me/          → { level, topics, week }
 *   getBoard(by)            GET  /games/runner/board/?by=score|said   (this week, ranked runs only)
 * The run is saved by finish/ only (never also POST /voice/runner/runs/).
 */
import api from '../../../api/client'

const OPTS = { timeout: 12000 }

export const getDeck = (level, topic = 'all') => api.get('/games/runner/deck/', { ...OPTS, params: { level, topic } }).then(r => r.data)
export const postFinish = (body) => api.post('/games/runner/finish/', body, { timeout: 15000 }).then(r => r.data)
export const postPractice = (deck, outcomes) => api.post('/games/runner/practice/', { deck, outcomes }, OPTS).then(r => r.data)
export const getMe = (level) => api.get('/games/runner/me/', { ...OPTS, params: { level } }).then(r => r.data)
export const getBoard = (by = 'score') => api.get('/games/runner/board/', { ...OPTS, params: { by } }).then(r => r.data)

/* a 32-character id for one run (the server answers a repeated one with the stored run) */
export function newRef() {
  const a = new Uint8Array(16)
  try { crypto.getRandomValues(a) } catch { for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256) }
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('')
}

/* the finish body (§B8.3) from the engine's summary; local items are left out */
export function finishBody(summary, deckToken, ref) {
  const outcomes = summary.outcomes
    .filter(o => o.k === 'w' || o.k === 'p')
    .slice(0, 120)
    .map(o => ({ k: o.k, id: o.id, kind: o.kind, pt: o.pt, v: o.v, tries: o.tries, ms: o.ms ?? undefined, heard: o.heard || '', m: o.m, score: o.score ?? undefined }))
  return {
    deck: deckToken, ref, mode: summary.mode, stt: summary.stt,
    distance_m: summary.distance_m, duration_s: Math.max(10, summary.duration_s), coins: summary.coins,
    revives: summary.revives, stations: summary.stations, score_client: summary.score_client, clips: summary.clips,
    outcomes,
  }
}
