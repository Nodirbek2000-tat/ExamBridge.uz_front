/*
 * TOBY RUN — hand-authored 40 m chunks (RUNNER_PLAN §B2). Lanes 0 L · 1 C · 2 R.
 *
 * item: [type, lane, at, ramp?]   type low · high · wall · train · move (see physics.js)
 *   at = where it starts (m from the chunk start); a train's ramp (6 m) lies in front of `at`
 * coins: [lane, from, to]         a line of coins (y follows roofs / ramps, arcs over low barriers)
 *
 * Rules every chunk keeps (the solver and the node tests check them):
 *   - obstacles lie in 6–36 m, so two chunks never squeeze a combo across their seam
 *   - from every lane there is a way through at the level's top speed with a 0.35 s reaction
 *   - `move` (oncoming carriage) sits at 30–36 m: it starts rolling when Toby is 60 m away and
 *     meets him ≈ 15–20 m before its mark, in a lane kept free for it
 * d: difficulty 1 (A1) … 5 (C1). Biomes only change how the shapes look (three/obstacles.js).
 */

const R = true   // a front ramp

export const CHUNK_LEN = 40

export const CHUNKS = [
  // ── 1: one thing at a time ─────────────────────────────────────────────
  { id: 'low-c', d: 1, items: [['low', 1, 16]], coins: [[1, 6, 34]] },
  { id: 'low-lr', d: 1, items: [['low', 0, 12], ['low', 2, 26]], coins: [[1, 8, 34]] },
  { id: 'high-r', d: 1, items: [['high', 2, 18]], coins: [[2, 8, 30]] },
  { id: 'wall-c', d: 1, items: [['wall', 1, 18]], coins: [[0, 8, 34]] },
  { id: 'train-l', d: 1, items: [['train', 0, 10]], coins: [[1, 6, 34]] },
  { id: 'ramp-c', d: 1, items: [['train', 1, 14, R]], coins: [[1, 6, 30]] },
  { id: 'two-low', d: 1, items: [['low', 0, 10], ['low', 1, 26]], coins: [[2, 6, 34]] },
  { id: 'rest', d: 1, items: [], coins: [[0, 6, 14], [1, 16, 24], [2, 26, 34]] },
  { id: 'high-two', d: 1, items: [['high', 1, 12], ['high', 0, 28]], coins: [[1, 6, 22]] },
  { id: 'funnel', d: 1, items: [['wall', 0, 16], ['wall', 2, 16]], coins: [[1, 8, 32]] },

  // ── 2: two rows ────────────────────────────────────────────────────────
  { id: 'mix-3', d: 2, items: [['low', 1, 10], ['wall', 0, 22], ['high', 2, 30]], coins: [[1, 6, 18]] },
  { id: 'corridor', d: 2, items: [['train', 0, 8], ['train', 2, 8], ['low', 1, 28]], coins: [[1, 8, 34]] },
  { id: 'ramp-jumps', d: 2, items: [['train', 1, 14, R], ['low', 0, 22], ['low', 2, 22]], coins: [[1, 8, 34]] },
  { id: 'roll-row', d: 2, items: [['high', 0, 10], ['high', 1, 10], ['low', 2, 28]], coins: [[1, 6, 16]] },
  { id: 'wall-jumps', d: 2, items: [['wall', 1, 10], ['low', 0, 24], ['low', 2, 24]], coins: [[0, 14, 34]] },
  { id: 'zig', d: 2, items: [['low', 0, 8], ['low', 1, 8], ['high', 2, 22], ['high', 1, 22]], coins: [[2, 6, 16], [0, 18, 34]] },
  { id: 'roofs', d: 2, items: [['train', 0, 14, R], ['train', 1, 12]], coins: [[0, 8, 34]] },
  { id: 'gauntlet-c', d: 2, items: [['high', 1, 8], ['low', 1, 20], ['high', 1, 32]], coins: [[1, 6, 34]] },
  { id: 'slalom', d: 2, items: [['wall', 0, 8], ['wall', 2, 20], ['wall', 1, 32]], coins: [[1, 6, 14], [0, 18, 26]] },
  { id: 'ramp-r', d: 2, items: [['train', 2, 12, R], ['low', 1, 14], ['high', 0, 26]], coins: [[2, 6, 34]] },

  // ── 3: carriages and full rows ─────────────────────────────────────────
  { id: 'hop', d: 3, items: [['train', 0, 12, R], ['train', 1, 18], ['train', 2, 22, R]], coins: [[0, 6, 26], [1, 26, 32]] },
  { id: 'jump-all', d: 3, items: [['low', 0, 12], ['low', 1, 12], ['low', 2, 12], ['high', 0, 28], ['high', 2, 28]], coins: [[1, 8, 34]] },
  { id: 'ramp-walls', d: 3, items: [['train', 1, 12, R], ['wall', 0, 20], ['wall', 2, 20]], coins: [[1, 6, 30]] },
  { id: 'roll-jump', d: 3, items: [['high', 0, 12], ['high', 1, 12], ['high', 2, 12], ['low', 0, 28], ['low', 1, 28], ['low', 2, 28]], coins: [[1, 6, 34]] },
  { id: 'oncoming-l', d: 3, items: [['move', 0, 34], ['low', 1, 12], ['wall', 2, 22]], coins: [[1, 6, 34]], moving: true },
  { id: 'oncoming-c', d: 3, items: [['move', 1, 34], ['wall', 0, 12]], coins: [[2, 6, 34]], moving: true },
  { id: 'three-ways', d: 3, items: [['low', 0, 10], ['high', 1, 10], ['wall', 2, 10], ['low', 0, 28], ['low', 1, 28]], coins: [[2, 14, 34]] },
  { id: 'corridor-roll', d: 3, items: [['train', 0, 6], ['train', 2, 6], ['high', 1, 12], ['low', 1, 28]], coins: [[1, 6, 34]] },
  { id: 'roof-row', d: 3, items: [['train', 1, 12, R], ['train', 0, 20], ['train', 2, 20]], coins: [[1, 6, 34]] },
  { id: 'wall-roll', d: 3, items: [['wall', 1, 8], ['high', 0, 20], ['high', 2, 20], ['wall', 1, 30]], coins: [[0, 12, 34]] },

  // ── 4: combos ──────────────────────────────────────────────────────────
  { id: 'roll-then-jump', d: 4, items: [['high', 0, 8], ['high', 1, 8], ['high', 2, 8], ['low', 0, 20], ['low', 1, 20], ['wall', 2, 20], ['high', 1, 32]], coins: [[0, 6, 34]] },
  { id: 'center-gauntlet', d: 4, items: [['low', 1, 8], ['wall', 0, 10], ['high', 1, 20], ['wall', 2, 20], ['low', 1, 32], ['wall', 0, 32]], coins: [[1, 6, 34]] },
  { id: 'oncoming-ramp', d: 4, items: [['move', 2, 34], ['train', 0, 12, R], ['low', 1, 22]], coins: [[0, 6, 34]], moving: true },
  { id: 'rows', d: 4, items: [['low', 0, 8], ['low', 1, 8], ['low', 2, 8], ['high', 0, 22], ['high', 1, 22], ['high', 2, 22], ['low', 0, 34], ['low', 2, 34]], coins: [[1, 6, 30]] },
  { id: 'block-switch', d: 4, items: [['wall', 0, 10], ['train', 1, 12], ['low', 2, 24], ['wall', 0, 26], ['high', 1, 30]], coins: [[2, 8, 34]] },

  // ── 5: dense ───────────────────────────────────────────────────────────
  { id: 'oncoming-mix', d: 5, items: [['move', 1, 36], ['low', 0, 10], ['high', 2, 10], ['wall', 0, 26]], coins: [[2, 14, 34]], moving: true },
  { id: 'roof-highway', d: 5, items: [['train', 0, 12, R], ['train', 1, 16, R], ['train', 2, 20, R]], coins: [[1, 10, 34]] },
  { id: 'roll-jump-roll', d: 5, items: [['high', 0, 8], ['high', 1, 8], ['high', 2, 8], ['low', 0, 20], ['low', 1, 20], ['low', 2, 20], ['high', 0, 32], ['high', 1, 32], ['high', 2, 32]], coins: [[1, 6, 34]] },
  { id: 'weave', d: 5, items: [['wall', 1, 8], ['low', 0, 14], ['high', 2, 14], ['wall', 0, 26], ['low', 1, 30], ['high', 2, 32]], coins: [[2, 18, 34]] },
  { id: 'double-oncoming', d: 5, items: [['move', 0, 34], ['move', 2, 36], ['low', 1, 20]], coins: [[1, 6, 34]], moving: true },
]

/* the first stretch of a run and the run-up to a Bekat: nothing in the way */
export const CLEAR = { id: 'clear', d: 0, items: [], coins: [[1, 8, 32]] }
export const CHUNK_BY_ID = Object.fromEntries(CHUNKS.map(c => [c.id, c]))
export const OBSTACLE_SPAN = [6, 36]
