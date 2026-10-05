/*
 * TOBY RUN — every per-level number in one place (RUNNER_PLAN §B2, §B3.2, §B7).
 * Pure JS (node --test reads it). The server mirrors LEVELS / LEVEL_K / word windows in
 * sat/games/runner_logic.py.
 */

export const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1']

/*
 * start → cap: m/s, a linear ramp over RAMP_S seconds of running (rides and Bekats do not count)
 * gap: running seconds between balloons · stationEvery: metres between Bekats
 * diff: chunk difficulty range · moving: share of chunks with an oncoming carriage
 * L: mic-window factor · K: score factor · passAt: echo "good" threshold
 */
export const LEVELS = {
  A1: { start: 8, cap: 13, gap: 12, stationEvery: 650, diff: [1, 2], moving: 0, L: 1.15, K: 1.0, passAt: 0.7 },
  A2: { start: 9, cap: 14.5, gap: 11, stationEvery: 700, diff: [1, 3], moving: 0.08, L: 1.08, K: 1.1, passAt: 0.7 },
  B1: { start: 10, cap: 16, gap: 10, stationEvery: 800, diff: [2, 4], moving: 0.14, L: 1.0, K: 1.2, passAt: 0.8 },
  B2: { start: 11, cap: 17, gap: 9.5, stationEvery: 850, diff: [3, 5], moving: 0.18, L: 0.95, K: 1.35, passAt: 0.8 },
  C1: { start: 12, cap: 18, gap: 9, stationEvery: 900, diff: [3, 5], moving: 0.22, L: 0.9, K: 1.5, passAt: 0.8 },
}

export const RAMP_S = 180
export const CALM_SPEED = 0.75          // calm mode: −25% speed …
export const CALM_DENSITY = 0.7         // … and −30% obstacles
export const REDUCED_SPEED = 0.85       // prefers-reduced-motion: −15% speed
export const SERVER_EXTRA = 3           // seconds added to every window when speech goes to the server

export const DEFAULT_CONFIG = {
  speed_scale: 1, window_scale: 1, balloon_gap_scale: 1, station_every_m: null, clips_per_run: 30,
  twister: true, revive_voice: true, server_stt: true, leaderboard: true, levels: LEVEL_ORDER,
}

export const levelOf = (id) => LEVELS[id] || LEVELS.A1

/* running speed after `runT` seconds of running */
export function speedAt(level, runT, { speedScale = 1, calm = false, reduced = false } = {}) {
  const L = levelOf(level)
  const k = Math.min(1, Math.max(0, runT / RAMP_S))
  return (L.start + (L.cap - L.start) * k) * speedScale * (calm ? CALM_SPEED : 1) * (reduced ? REDUCED_SPEED : 1)
}

export const capSpeed = (level, speedScale = 1) => levelOf(level).cap * speedScale

export const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length

/* §B3.2 — seconds of mic time (browser; add SERVER_EXTRA in server mode) */
export const wordWindow = (n, level, ws = 1) => Math.max(3.5, (3.4 + 0.5 * n) * levelOf(level).L * ws)
export const echoWindow = (n, level, ws = 1) => Math.max(4.0, (2.0 + 0.45 * n) * levelOf(level).L * ws)
export const twisterWindow = (n) => 1.5 + 0.4 * n
export const BEKAT_WINDOW = 10
export const RETRY_WORD = 3.5
export const REVIVE_WORD = 6
export const REVIVE_PHRASE = 8
export const JUDGE_MAX = 6               // server hold: the longest a balloon waits for Whisper
export const WRONG_HOLD = 0.45           // a live guess naming another option must last this long

/* prompt read time before the mic opens (hear = the model line + 0.2 s) */
export const READ_TIME = { picture: 0.3, uz: 0.5, choice: 0.6, definition: 1.2, opposite: 1.2, synonym: 1.2, fill: 1.2, hear: 0.2 }

/* the balloon ride (§B3.3) */
export const RIDE = {
  alt: 4.5,             // above carriage roofs (3.4 m)
  lift: 0.5,            // seconds to rise
  ease: 0.4,            // world speed eases to slow / slowServer over this
  slow: 0.85,
  slowServer: 0.7,
  cardAt: 0.5,          // the prompt card appears
  micAt: 0.8,           // chime + mic (after the read time)
  descent: 1.0,
  shield: 1.2,          // landing shield
  landMin: 6,           // the landing slot is 6–30 m ahead…
  landMax: 30,
  landFree: 1.0,        // …free for ≥ v × 1.0 s
}

export const BEKAT = { brake: 1.0, resume: 1.5, clear: 60 }
export const REVIVE = { slowmo: 0.6, shield: 2, max: 2 }
export const SHOVQIN_TIME = 6
export const MAGNET_TIME = 8
export const X2_TIME = 15
export const VARRAK_TIME = 6

/* score (§B7) — parity with games/runner_logic.py */
export const POINTS = { first: 100, close: 60, retry: 50, bekatOk: 150, bekatClose: 100, twisterOk: 200, twisterClose: 120, serverBonus: 25 }
export const COINS = { balloon: 8, retry: 4, bekatOk: 30, bekatClose: 15, fix: 10, fixMax: 5 }
