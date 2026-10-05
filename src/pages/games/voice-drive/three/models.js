/*
 * VOICE DRIVE props, built in code: each model is one merged, vertex-coloured
 * geometry (one draw call per model type, drawn instanced). Metres, y up,
 * models face −z (toward the far end of the road) unless noted.
 */
import { ExtrudeGeometry, Shape } from 'three'
import { ModelBuilder } from '../../../../games/three/primitives'
import { seeded } from '../../../../games/three/random'

const C = {
  trunk: '#6b4a32', bark: '#5a3d29', leaf: ['#3f7d3b', '#4d9146', '#356f35'], pine: '#24553a', pine2: '#2d6544', snow: '#f3f7fb',
  cactus: '#4f8c40', cactus2: '#447a37', rock: '#8e877c', rock2: '#7a7369', sand: '#d8b98a',
  concrete: '#c4c0b8', concreteDark: '#9a968f', metal: '#7f858d', metalDark: '#3b3f45', black: '#16181b', white: '#f2f2ef',
  red: '#d4262c', orange: '#f26b1d', amber: '#ffb11f', yellow: '#f6c945', glass: '#5d7d96', glassDark: '#2c3e4f',
  wood: '#8b6240', woodDark: '#6a4a30', roofRed: '#a8443a', skin: ['#f1c7a3', '#d9a07a', '#a8714e'], hair: ['#2b1e16', '#5a3a22', '#141414'],
}

/* ── vegetation ─────────────────────────────────────────────────────── */

export function treeModel(seed = 1) {
  const r = seeded(seed)
  const m = new ModelBuilder()
  m.cyl(0.13, 0.2, 2.6, { at: [0, 1.3, 0], color: C.trunk, seg: 7 })
  m.beam([0, 1.9, 0], [0.55, 2.7, 0.1], 0.07, { color: C.trunk })
  m.beam([0, 2.1, 0], [-0.45, 2.8, -0.2], 0.06, { color: C.trunk })
  const blobs = [[0, 3.6, 0, 1.55], [0.75, 3.1, 0.3, 1.05], [-0.7, 3.2, -0.25, 1.1], [0.15, 4.4, -0.2, 1.05], [-0.2, 2.9, 0.7, 0.9]]
  blobs.forEach(([x, y, z, s], i) => m.blob(s, { at: [x, y, z], color: C.leaf[i % 3], seed: seed * 7 + i, lump: s * 0.16 }))
  void r
  return m.build({ crease: 62 })
}

export function pineModel({ snow = false } = {}) {
  const m = new ModelBuilder()
  m.cyl(0.1, 0.16, 1.4, { at: [0, 0.7, 0], color: C.bark, seg: 6 })
  const tiers = [[1.9, 2.0, 1.25], [1.55, 1.8, 2.25], [1.15, 1.6, 3.15], [0.75, 1.4, 3.95]]
  tiers.forEach(([rad, h, y], i) => {
    m.cone(rad, h, { at: [0, y + h / 2, 0], color: i % 2 ? C.pine2 : C.pine, seg: 9 })
    if (snow) m.cone(rad * 0.62, h * 0.5, { at: [0, y + h * 0.76, 0], color: C.snow, seg: 9 })
  })
  return m.build({ crease: 30 })
}

export function palmModel() {
  const m = new ModelBuilder()
  // a gently curved trunk of rings
  let x = 0
  for (let i = 0; i < 9; i++) {
    const y = i * 0.72
    const nx = x + 0.05 + i * 0.012
    m.cyl(0.15 - i * 0.006, 0.17 - i * 0.006, 0.74, { at: [(x + nx) / 2, y + 0.37, 0], color: i % 2 ? '#8a6a48' : '#76593b', seg: 7 })
    x = nx
  }
  const top = [x, 6.5, 0]
  m.blob(0.32, { at: top, color: '#6b5034', detail: 0 })
  // fronds: bent two-sided strips
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const P = []
    const seg = 5
    const len = 3.2
    for (let i = 0; i < seg; i++) {
      const t0 = i / seg
      const t1 = (i + 1) / seg
      const w0 = 0.42 * Math.sin(Math.PI * Math.min(1, t0 * 1.1 + 0.08))
      const w1 = 0.42 * Math.sin(Math.PI * Math.min(1, t1 * 1.1 + 0.08))
      const pt = (t, w) => {
        const d = t * len
        const h = Math.sin(t * Math.PI * 0.9) * 0.9 - t * t * 1.6
        return [top[0] + ca * d - sa * w, top[1] + h, top[2] + sa * d + ca * w]
      }
      const a0 = pt(t0, -w0); const b0 = pt(t0, w0); const a1 = pt(t1, -w1); const b1 = pt(t1, w1)
      P.push(...a0, ...b0, ...b1, ...a0, ...b1, ...a1)
    }
    m.tris(P, { color: k % 2 ? '#3f8a3c' : '#4a9a43', twoSided: true })
  }
  return m.build({ crease: 50 })
}

export function bushModel(seed = 2) {
  const m = new ModelBuilder()
  m.blob(0.75, { at: [0, 0.55, 0], color: C.leaf[1], seed, scale: [1.3, 0.85, 1] })
  m.blob(0.55, { at: [0.6, 0.45, 0.2], color: C.leaf[0], seed: seed + 3 })
  m.blob(0.5, { at: [-0.55, 0.4, -0.1], color: C.leaf[2], seed: seed + 5 })
  return m.build({ crease: 32 })
}

export function cactusModel() {
  const m = new ModelBuilder()
  m.cyl(0.26, 0.3, 3.4, { at: [0, 1.7, 0], color: C.cactus, seg: 9 })
  m.sphere(0.26, { at: [0, 3.4, 0], color: C.cactus, seg: 9 })
  // arms
  m.cyl(0.17, 0.17, 0.7, { at: [0.45, 1.6, 0], rot: [0, 0, Math.PI / 2], color: C.cactus2, seg: 8 })
  m.cyl(0.17, 0.17, 1.1, { at: [0.78, 2.1, 0], color: C.cactus2, seg: 8 })
  m.sphere(0.17, { at: [0.78, 2.65, 0], color: C.cactus2, seg: 8 })
  m.cyl(0.15, 0.15, 0.6, { at: [-0.4, 2.2, 0], rot: [0, 0, Math.PI / 2], color: C.cactus2, seg: 8 })
  m.cyl(0.15, 0.15, 0.8, { at: [-0.68, 2.55, 0], color: C.cactus2, seg: 8 })
  m.sphere(0.15, { at: [-0.68, 2.95, 0], color: C.cactus2, seg: 8 })
  return m.build({ crease: 40 })
}

export function rockModel(seed = 3) {
  const m = new ModelBuilder()
  m.rock(1.0, { at: [0, 0.45, 0], color: C.rock, seed, scale: [1.4, 0.8, 1.1] })
  m.rock(0.55, { at: [1.0, 0.25, 0.3], color: C.rock2, seed: seed + 9 })
  return m.build({ crease: 20 })
}

export function deadBushModel() {
  const m = new ModelBuilder()
  const r = seeded(17)
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2
    const h = 0.5 + r() * 0.6
    const d = 0.3 + r() * 0.4
    m.beam([0, 0, 0], [Math.cos(a) * d, h, Math.sin(a) * d], 0.025, { color: '#8a6f4b', r2: 0.012 })
  }
  return m.build({ crease: 60 })
}

export function snowmanModel() {
  const m = new ModelBuilder()
  m.sphere(0.55, { at: [0, 0.5, 0], color: C.snow, seg: 14 })
  m.sphere(0.4, { at: [0, 1.25, 0], color: C.snow, seg: 14 })
  m.sphere(0.28, { at: [0, 1.82, 0], color: C.snow, seg: 12 })
  m.cone(0.05, 0.3, { at: [0, 1.84, -0.4], rot: [-Math.PI / 2, 0, 0], color: C.orange, seg: 6 })
  m.cyl(0.22, 0.22, 0.04, { at: [0, 2.04, 0], color: C.black, seg: 12 })
  m.cyl(0.15, 0.15, 0.3, { at: [0, 2.2, 0], color: C.black, seg: 12 })
  m.torus(0.3, 0.07, { at: [0, 1.56, 0], rot: [Math.PI / 2, 0, 0], color: C.red })
  for (const y of [1.2, 1.35, 1.5]) m.sphere(0.035, { at: [0, y, -0.39], color: C.black, seg: 6 })
  return m.build({ crease: 45 })
}

/* ── buildings ──────────────────────────────────────────────────────── */

/* a pitched roof prism, ridge along x, centred */
function roofPrism(m, w, d, h, at, color) {
  const sh = new Shape()
  sh.moveTo(-d / 2, 0)
  sh.lineTo(d / 2, 0)
  sh.lineTo(0, h)
  sh.lineTo(-d / 2, 0)
  const g = new ExtrudeGeometry(sh, { depth: w, bevelEnabled: false })
  g.translate(0, 0, -w / 2)
  g.rotateY(Math.PI / 2)
  m.add(g, { at, color })
}

export function houseModel(variant = 0) {
  const m = new ModelBuilder()
  const walls = ['#e8dcc8', '#d9c4a5', '#cfd8dc'][variant % 3]
  const roof = ['#a8443a', '#6d4c41', '#55606e'][variant % 3]
  m.box(7, 5.2, 7, { at: [0, 2.6, 0], color: walls })
  roofPrism(m, 7.6, 7.8, 2.6, [0, 5.2, 0], roof)
  m.box(7.2, 0.25, 7.2, { at: [0, 5.15, 0], color: '#ffffff' })
  // windows and a door on the street side (+x faces the road for a house on the left; the scene turns them)
  for (const [z, y] of [[-2, 1.6], [2, 1.6], [-2, 3.9], [2, 3.9], [0, 3.9]]) {
    m.box(0.08, 1.15, 1.0, { at: [3.52, y, z], color: '#f4f4f0' })
    m.box(0.1, 0.95, 0.8, { at: [3.55, y, z], color: C.glassDark })
  }
  m.box(0.08, 2.1, 1.1, { at: [3.53, 1.05, 0], color: '#6a4a30' })
  m.box(0.5, 1.3, 0.5, { at: [-1.5, 6.4, 1.6], color: '#8a5a4a' })
  return m.build({ crease: 20 })
}

export function cabinModel() {
  const m = new ModelBuilder()
  // log walls
  for (let i = 0; i < 9; i++) {
    m.cyl(0.18, 0.18, 6.4, { at: [0, 0.2 + i * 0.36, 2.6], rot: [0, 0, Math.PI / 2], color: i % 2 ? C.wood : C.woodDark, seg: 7 })
    m.cyl(0.18, 0.18, 6.4, { at: [0, 0.2 + i * 0.36, -2.6], rot: [0, 0, Math.PI / 2], color: i % 2 ? C.wood : C.woodDark, seg: 7 })
  }
  m.box(5.8, 3.3, 5.2, { at: [0, 1.65, 0], color: C.woodDark })
  roofPrism(m, 7.0, 6.6, 2.4, [0, 3.3, 0], C.snow)
  m.box(0.08, 1.0, 1.0, { at: [2.92, 1.7, -1.2], color: '#f8d77a' })
  m.box(0.08, 2.0, 1.0, { at: [2.92, 1.0, 1.2], color: '#4a3020' })
  m.box(0.6, 1.6, 0.6, { at: [-1.6, 4.9, -1.2], color: '#7a6a62' })
  return m.build({ crease: 30 })
}

/* far mesa (desert backdrop) — big, layered */
export function mesaModel() {
  const m = new ModelBuilder()
  m.cyl(16, 22, 12, { at: [0, 6, 0], color: '#c27448', seg: 7 })
  m.cyl(13, 16, 6, { at: [0, 15, 0], color: '#b4643c', seg: 7 })
  m.cyl(13.5, 13, 0.8, { at: [0, 18.4, 0], color: '#d58a58', seg: 7 })
  return m.build({ crease: 25 })
}

/* far snowy peak */
export function peakModel() {
  const m = new ModelBuilder()
  m.cone(38, 46, { at: [0, 23, 0], color: '#6f7b8c', seg: 7 })
  m.cone(16, 19.5, { at: [0, 36.3, 0], color: C.snow, seg: 7 })
  m.cone(24, 28, { at: [30, 14, 8], color: '#7d8898', seg: 6 })
  m.cone(9, 10.5, { at: [30, 22.8, 8], color: C.snow, seg: 6 })
  return m.build({ crease: 20 })
}

/* ── street furniture ───────────────────────────────────────────────── */

/* lamp post on the kerb: the arm reaches over the road toward −x (the scene mirrors it for the other side) */
export function lampPostModel() {
  const m = new ModelBuilder()
  m.cyl(0.09, 0.13, 7.2, { at: [0, 3.6, 0], color: '#5d636b', seg: 8 })
  m.cyl(0.22, 0.26, 0.5, { at: [0, 0.25, 0], color: '#4b5057', seg: 8 })
  m.beam([0, 7.0, 0], [-1.2, 7.55, 0], 0.06, { color: '#5d636b' })
  m.beam([-1.2, 7.55, 0], [-1.9, 7.55, 0], 0.06, { color: '#5d636b' })
  m.box(0.75, 0.16, 0.34, { at: [-2.05, 7.5, 0], color: '#3d4248' })
  return m.build({ crease: 40 })
}

/* the glowing lens under the lamp head (separate, emissive) */
export function lampLensModel() {
  const m = new ModelBuilder()
  m.box(0.62, 0.04, 0.26, { at: [-2.05, 7.41, 0], color: '#ffffff' })
  return m.build({ crease: 10 })
}

export function billboardModel() {
  const m = new ModelBuilder()
  m.cyl(0.16, 0.2, 5.2, { at: [-1.6, 2.6, 0.3], color: C.metal, seg: 8 })
  m.cyl(0.16, 0.2, 5.2, { at: [1.6, 2.6, 0.3], color: C.metal, seg: 8 })
  m.box(6.4, 3.3, 0.3, { at: [0, 6.4, 0.25], color: '#2d3035' })
  m.box(6.6, 0.12, 0.6, { at: [0, 8.1, 0.1], color: C.metalDark })
  for (const x of [-2, 0, 2]) m.box(0.3, 0.12, 0.25, { at: [x, 8.1, 0.6], color: '#cfd3d8' })
  return m.build({ crease: 20 })
}

export function powerPoleModel() {
  const m = new ModelBuilder()
  m.cyl(0.13, 0.17, 9, { at: [0, 4.5, 0], color: '#7a5a3c', seg: 7 })
  m.box(2.6, 0.16, 0.16, { at: [0, 8.4, 0], color: '#6a4c32' })
  for (const x of [-1.1, -0.4, 0.4, 1.1]) m.cyl(0.05, 0.06, 0.24, { at: [x, 8.6, 0], color: '#a7c4cf', seg: 6 })
  return m.build({ crease: 40 })
}

/* guard rail: one 8.4 m section along z */
export function guardRailModel() {
  const m = new ModelBuilder()
  for (const z of [-4.2, -1.4, 1.4]) m.box(0.12, 0.75, 0.12, { at: [0, 0.37, z], color: C.metal })
  m.box(0.08, 0.32, 8.4, { at: [-0.08, 0.6, 0], color: '#b6bcc4' })
  return m.build({ crease: 20 })
}

/* a road sign: post + a square plate frame; the face is drawn by the sign batch (atlas) */
export function signPostModel() {
  const m = new ModelBuilder()
  m.cyl(0.04, 0.045, 2.75, { at: [0, 1.37, 0], color: '#8a9098', seg: 8 })
  m.box(0.86, 0.86, 0.04, { at: [0, 2.6, 0.03], color: '#9aa0a8' })
  return m.build({ crease: 30 })
}

/* ── obstacles ──────────────────────────────────────────────────────── */

export function coneModel() {
  const m = new ModelBuilder()
  m.box(0.44, 0.04, 0.44, { at: [0, 0.02, 0], color: '#1d1f22' })
  // one smooth cone (r 0.17 → 0.035 over 0.66 m) with two white reflective bands
  const H = 0.66
  const r = (y) => 0.17 - (0.135 * y) / H
  const band = (y0, y1, color) => m.cyl(r(y1) + 0.002, r(y0) + 0.002, y1 - y0, { at: [0, 0.04 + (y0 + y1) / 2, 0], color, seg: 16, open: true })
  m.cyl(0.035, 0.17, H, { at: [0, 0.04 + H / 2, 0], color: '#f26b1d', seg: 16 })
  band(0.3, 0.4, '#f4f4f0')
  band(0.48, 0.55, '#f4f4f0')
  return m.build({ crease: 55 })
}

/* red / white striped board on legs (road works), board across x */
function stripedBoard(m, w, h, y, z, n = 8, thick = 0.06) {
  const sw = w / n
  for (let i = 0; i < n; i++) m.box(sw, h, thick, { at: [-w / 2 + sw * (i + 0.5), y, z], color: i % 2 ? C.white : C.red })
}

export function worksModel() {
  const m = new ModelBuilder()
  stripedBoard(m, 1.9, 0.32, 0.95, 0, 6)
  stripedBoard(m, 1.9, 0.22, 0.45, 0, 6)
  for (const x of [-0.85, 0.85]) {
    m.beam([x, 0, -0.35], [x, 1.15, 0], 0.035, { color: '#d9dde2' })
    m.beam([x, 0, 0.35], [x, 1.15, 0], 0.035, { color: '#d9dde2' })
  }
  m.box(0.16, 0.2, 0.12, { at: [0.85, 1.25, 0], color: C.black })
  return m.build({ crease: 30 })
}

/* the barrier across the whole road for "Jump" */
export function beamModel(width = 9.4) {
  const m = new ModelBuilder()
  stripedBoard(m, width, 0.42, 0.95, 0, 14, 0.12)
  for (const x of [-width / 2 + 0.2, 0, width / 2 - 0.2]) {
    m.box(0.16, 1.15, 0.16, { at: [x, 0.57, 0.1], color: '#c9ced4' })
    m.box(0.7, 0.08, 0.5, { at: [x, 0.04, 0.1], color: '#3b3f45' })
  }
  return m.build({ crease: 30 })
}

/* a box truck (traffic blocker), facing −z: cab at the front */
export function truckModel(cab = '#e4e7eb', box = '#f4f4f2', stripe = '#2563eb') {
  const m = new ModelBuilder()
  const W = 2.3
  m.box(W, 2.75, 5.0, { at: [0, 2.15, 1.05], color: box })
  m.box(W + 0.02, 0.28, 4.9, { at: [0, 1.45, 1.05], color: stripe })
  m.box(W - 0.04, 1.6, 1.9, { at: [0, 1.55, -2.45], color: cab })
  m.box(W - 0.1, 0.62, 0.05, { at: [0, 1.95, -3.41], color: C.glassDark })
  m.box(W - 0.1, 0.35, 1.6, { at: [0, 2.48, -2.4], color: cab })
  m.box(W, 0.32, 0.18, { at: [0, 0.62, -3.42], color: '#2b2e33' })
  m.box(W, 0.3, 0.14, { at: [0, 0.7, 3.6], color: '#2b2e33' })
  m.box(W - 0.3, 0.3, 6.6, { at: [0, 0.75, 0.2], color: '#25282c' })
  // rear doors: hinge lines, lamps
  m.box(0.04, 2.5, 0.02, { at: [0, 2.15, 3.56], color: '#b8bcc2' })
  for (const x of [-0.95, 0.95]) {
    m.box(0.22, 0.12, 0.04, { at: [x, 0.95, 3.58], color: '#c81e1e' })
    m.box(0.2, 0.12, 0.04, { at: [x, 0.82, -3.43], color: '#f5f5f0' })
  }
  // wheels (static boxes of rubber with a hub; they hardly turn at a stop)
  for (const z of [-2.4, 1.0, 2.5]) {
    for (const x of [-1.0, 1.0]) {
      m.cyl(0.46, 0.46, 0.34, { at: [x, 0.46, z], rot: [0, 0, Math.PI / 2], color: '#141518', seg: 14 })
      m.cyl(0.25, 0.25, 0.36, { at: [x, 0.46, z], rot: [0, 0, Math.PI / 2], color: '#9aa0a8', seg: 10 })
    }
  }
  return m.build({ crease: 35 })
}

/* ── animals and people ─────────────────────────────────────────────── */

export function sheepModel() {
  const m = new ModelBuilder()
  const wool = '#f1eee6'
  m.blob(0.42, { at: [0, 0.78, 0], color: wool, scale: [0.95, 0.85, 1.35], seed: 5 })
  m.blob(0.3, { at: [0, 0.98, -0.25], color: wool, seed: 6 })
  m.blob(0.3, { at: [0, 0.95, 0.3], color: wool, seed: 7 })
  m.box(0.2, 0.24, 0.32, { at: [0, 0.9, -0.62], color: '#1f1c1a' })
  m.box(0.16, 0.05, 0.08, { at: [0.15, 0.95, -0.55], color: '#1f1c1a' })
  m.box(0.16, 0.05, 0.08, { at: [-0.15, 0.95, -0.55], color: '#1f1c1a' })
  for (const [x, z] of [[-0.18, -0.3], [0.18, -0.3], [-0.18, 0.32], [0.18, 0.32]]) m.cyl(0.045, 0.04, 0.52, { at: [x, 0.26, z], color: '#2a2522', seg: 6 })
  return m.build({ crease: 35 })
}

export function cowModel() {
  const m = new ModelBuilder()
  const w = '#f4f2ee'
  const b = '#1d1a19'
  m.box(0.8, 0.75, 1.75, { at: [0, 1.15, 0], color: w })
  m.box(0.82, 0.5, 0.6, { at: [0, 1.25, 0.35], color: b })
  m.box(0.82, 0.4, 0.45, { at: [0, 1.0, -0.5], color: b })
  m.box(0.42, 0.42, 0.55, { at: [0, 1.4, -1.05], color: w })
  m.box(0.36, 0.22, 0.2, { at: [0, 1.28, -1.36], color: '#e8b4a8' })
  m.box(0.43, 0.2, 0.3, { at: [0, 1.58, -1.0], color: b })
  for (const x of [-0.25, 0.25]) m.cone(0.04, 0.22, { at: [x, 1.72, -0.95], rot: [0, 0, x > 0 ? -0.6 : 0.6], color: '#e8e0cc', seg: 6 })
  for (const [x, z] of [[-0.28, -0.65], [0.28, -0.65], [-0.28, 0.65], [0.28, 0.65]]) m.box(0.16, 0.8, 0.16, { at: [x, 0.4, z], color: w })
  m.box(0.22, 0.12, 0.22, { at: [0, 0.74, 0.45], color: '#e8b4a8' })
  m.beam([0, 1.45, 0.86], [0, 0.85, 1.05], 0.03, { color: w })
  return m.build({ crease: 25 })
}

/* a person ~1.72 m (kids are drawn at 0.68 scale). wave = right arm up. */
export function personModel(variant = 0, { wave = false } = {}) {
  const m = new ModelBuilder()
  const shirt = ['#2f6fd6', '#d9483b', '#e9b324', '#3c9a5a', '#8b5cf6'][variant % 5]
  const pants = ['#2b3442', '#3d3a36', '#24324a'][variant % 3]
  const skin = C.skin[variant % 3]
  const hair = C.hair[variant % 3]
  m.box(0.15, 0.82, 0.18, { at: [-0.1, 0.41, 0], color: pants })
  m.box(0.15, 0.82, 0.18, { at: [0.1, 0.41, 0], color: pants })
  m.box(0.17, 0.08, 0.26, { at: [-0.1, 0.04, -0.04], color: '#1d1e22' })
  m.box(0.17, 0.08, 0.26, { at: [0.1, 0.04, -0.04], color: '#1d1e22' })
  m.box(0.44, 0.62, 0.24, { at: [0, 1.12, 0], color: shirt })
  m.box(0.12, 0.58, 0.14, { at: [-0.29, 1.12, 0], color: shirt, rot: [0, 0, -0.06] })
  if (wave) m.box(0.12, 0.6, 0.14, { at: [0.36, 1.58, 0], color: shirt, rot: [0, 0, 0.35] })
  else m.box(0.12, 0.58, 0.14, { at: [0.29, 1.12, 0], color: shirt, rot: [0, 0, 0.06] })
  m.box(0.1, 0.1, 0.12, { at: [-0.31, 0.78, 0], color: skin })
  m.box(0.1, 0.1, 0.12, { at: [wave ? 0.47 : 0.31, wave ? 1.9 : 0.78, 0], color: skin })
  m.box(0.1, 0.08, 0.1, { at: [0, 1.47, 0], color: skin })
  m.box(0.24, 0.27, 0.24, { at: [0, 1.63, 0], color: skin })
  m.box(0.26, 0.09, 0.26, { at: [0, 1.79, 0.01], color: hair })
  m.box(0.26, 0.16, 0.06, { at: [0, 1.7, 0.12], color: hair })
  return m.build({ crease: 20 })
}

/* ── places ─────────────────────────────────────────────────────────── */

/* bus stop shelter: the open side faces the road (−x) */
export function busStopModel() {
  const m = new ModelBuilder()
  m.box(1.4, 0.1, 3.6, { at: [0, 2.55, 0], color: '#3a3f46' })
  m.box(0.05, 2.2, 3.4, { at: [0.65, 1.3, 0], color: '#9fc3d6' })
  for (const z of [-1.7, 1.7]) {
    m.box(1.2, 2.2, 0.05, { at: [0.05, 1.3, z], color: '#9fc3d6' })
    m.box(0.08, 2.5, 0.08, { at: [-0.62, 1.25, z], color: '#5d636b' })
    m.box(0.08, 2.5, 0.08, { at: [0.66, 1.25, z], color: '#5d636b' })
  }
  m.box(0.45, 0.06, 2.8, { at: [0.35, 0.48, 0], color: '#8b6240' })
  m.box(0.06, 0.45, 2.8, { at: [0.56, 0.72, 0], color: '#8b6240' })
  m.box(0.04, 1.4, 1.0, { at: [0.6, 1.4, 0.8], color: '#f2f2ef' })
  m.box(1.5, 0.15, 3.8, { at: [0, 0.075, 0], color: C.concrete })
  m.cyl(0.04, 0.04, 2.9, { at: [-0.9, 1.45, -2.4], color: '#8a9098', seg: 8 })
  return m.build({ crease: 20 })
}

/* gas station: canopy over two pump islands, a shop at the back (+x = away from the road) */
export function stationModel() {
  const m = new ModelBuilder()
  m.box(15, 0.15, 11, { at: [2, 0.075, 0], color: '#c9c6bf' })
  m.box(9.5, 0.9, 12.5, { at: [0, 5.3, 0], color: '#f4f4f2' })
  m.box(9.6, 0.24, 12.6, { at: [0, 5.0, 0], color: '#e8432f' })
  for (const [x, z] of [[-3.6, -4.5], [3.6, -4.5], [-3.6, 4.5], [3.6, 4.5]]) m.box(0.42, 4.9, 0.42, { at: [x, 2.45, z], color: '#e6e6e3' })
  for (const z of [-3, 3]) {
    m.box(1.3, 0.25, 3.6, { at: [0, 0.27, z], color: '#d7d4cd' })
    for (const dz of [-0.9, 0.9]) {
      m.box(0.75, 1.75, 0.5, { at: [0, 1.25, z + dz], color: '#f2f2ef' })
      m.box(0.77, 0.4, 0.52, { at: [0, 1.85, z + dz], color: '#e8432f' })
      m.box(0.05, 0.3, 0.32, { at: [-0.39, 1.3, z + dz], color: '#1d2a36' })
      m.box(0.08, 0.5, 0.06, { at: [-0.42, 0.9, z + dz + 0.15], color: '#25282c' })
    }
  }
  // the shop
  m.box(5.5, 3.6, 10, { at: [9, 1.8, 0], color: '#eceae6' })
  m.box(0.06, 2.4, 8, { at: [6.22, 1.5, 0], color: C.glass })
  m.box(5.7, 0.5, 10.2, { at: [9, 3.75, 0], color: '#e8432f' })
  // price pylon by the road
  m.box(0.4, 5.6, 0.4, { at: [-6, 2.8, -5.8], color: '#d0d0cc' })
  m.box(0.3, 2.2, 1.7, { at: [-6, 5.4, -5.8], color: '#24272c' })
  return m.build({ crease: 20 })
}

/* canopy lights (emissive strip under the canopy) */
export function stationLightsModel() {
  const m = new ModelBuilder()
  for (const z of [-3, 3]) for (const x of [-2.5, 2.5]) m.box(1.6, 0.05, 2.6, { at: [x, 4.83, z], color: '#ffffff' })
  return m.build({ crease: 10 })
}

/* bank: columns, steps and a pediment (front faces −x, toward the road on the right) */
export function bankModel() {
  const m = new ModelBuilder()
  const stone = '#e7e1d4'
  m.box(10, 8, 14, { at: [3, 4, 0], color: stone })
  for (let i = 0; i < 3; i++) m.box(2.2 - i * 0.5, 0.3, 14.5, { at: [-2.4 + i * 0.25, 0.15 + i * 0.3, 0], color: '#d6cfc0' })
  for (let i = 0; i < 6; i++) {
    m.cyl(0.38, 0.42, 6.2, { at: [-1.8, 4.0, -5.5 + i * 2.2], color: '#f3efe6', seg: 12 })
    m.box(1.0, 0.25, 1.0, { at: [-1.8, 7.2, -5.5 + i * 2.2], color: '#f3efe6' })
  }
  m.box(1.6, 0.8, 14.4, { at: [-1.6, 7.7, 0], color: stone })
  const sh = new Shape()
  sh.moveTo(-7.4, 0); sh.lineTo(7.4, 0); sh.lineTo(0, 2.6); sh.lineTo(-7.4, 0)
  const ped = new ExtrudeGeometry(sh, { depth: 1.4, bevelEnabled: false })
  ped.rotateY(Math.PI / 2)
  m.add(ped, { at: [-2.3, 8.1, 0], color: '#f0ebe0' })
  for (const z of [-4.4, 4.4]) m.box(0.1, 3.2, 1.6, { at: [-2.05, 3.0, z], color: C.glassDark })
  m.box(0.1, 3.8, 2.2, { at: [-2.05, 2.5, 0], color: '#5b3d26' })
  return m.build({ crease: 20 })
}

export function schoolModel() {
  const m = new ModelBuilder()
  const wall = '#f0d9a6'
  m.box(9, 7.2, 22, { at: [4, 3.6, 0], color: wall })
  m.box(9.4, 0.5, 22.4, { at: [4, 7.4, 0], color: '#c8553d' })
  for (let f = 0; f < 2; f++) {
    for (let i = 0; i < 7; i++) {
      const z = -9 + i * 3
      if (f === 0 && Math.abs(z) < 2) continue
      m.box(0.08, 1.6, 1.8, { at: [-0.51, 2.0 + f * 3.1, z], color: '#ffffff' })
      m.box(0.1, 1.35, 1.55, { at: [-0.53, 2.0 + f * 3.1, z], color: C.glass })
    }
  }
  m.box(0.1, 2.6, 2.6, { at: [-0.52, 1.3, 0], color: '#4a6fa5' })
  m.box(2.2, 0.25, 4.2, { at: [-1.6, 3.0, 0], color: '#c8553d' })
  for (const z of [-1.8, 1.8]) m.box(0.16, 3.0, 0.16, { at: [-2.5, 1.5, z], color: '#e8e8e4' })
  // clock and flag pole
  m.cyl(0.62, 0.62, 0.12, { at: [-0.56, 6.2, 0], rot: [0, 0, Math.PI / 2], color: '#ffffff', seg: 20 })
  m.cyl(0.66, 0.66, 0.08, { at: [-0.52, 6.2, 0], rot: [0, 0, Math.PI / 2], color: '#2b2e33', seg: 20 })
  m.cyl(0.06, 0.08, 9, { at: [-4, 4.5, -7], color: '#c9ced4', seg: 8 })
  m.box(0.04, 1.0, 1.6, { at: [-4, 8.3, -7.82], color: '#1eb3e6' })
  m.box(0.045, 0.34, 1.6, { at: [-4, 8.0, -7.82], color: '#ffffff' })
  m.box(0.05, 0.34, 1.6, { at: [-4, 7.66, -7.82], color: '#1eb53a' })
  return m.build({ crease: 20 })
}

/* park entrance: gate arch, railings, benches (trees come from the tree batch) */
export function parkModel() {
  const m = new ModelBuilder()
  const green = '#2f5d3a'
  m.box(16, 0.08, 20, { at: [5, 0.04, 0], color: '#5f9e4f' })
  m.box(3, 0.1, 20, { at: [-1.6, 0.06, 0], color: '#d4c8a8' })
  for (const z of [-2.2, 2.2]) m.box(0.6, 4.4, 0.6, { at: [-2.4, 2.2, z], color: '#9b8b74' })
  m.box(0.5, 0.9, 5.4, { at: [-2.4, 4.7, 0], color: green })
  for (let i = 0; i < 18; i++) {
    const z = -9.6 + i * 1.13
    if (Math.abs(z) < 2.6) continue
    m.box(0.06, 1.2, 0.06, { at: [-2.4, 0.6, z], color: '#1f2a22' })
  }
  m.box(0.08, 0.08, 7.2, { at: [-2.4, 1.15, -6.0], color: '#1f2a22' })
  m.box(0.08, 0.08, 7.2, { at: [-2.4, 1.15, 6.0], color: '#1f2a22' })
  for (const z of [-6, 6]) {
    m.box(0.5, 0.08, 1.8, { at: [0.6, 0.48, z], color: '#8b6240' })
    m.box(0.08, 0.45, 1.8, { at: [0.85, 0.75, z], color: '#8b6240' })
  }
  m.cyl(0.06, 0.06, 3.4, { at: [1.5, 1.7, -3.4], color: '#2b2e33', seg: 6 })
  m.sphere(0.25, { at: [1.5, 3.5, -3.4], color: '#f3f0e6', seg: 8 })
  return m.build({ crease: 25 })
}

/* traffic light: a pole on the right kerb with a mast arm over the road (−x), the head hanging from it */
export function trafficLightModel() {
  const m = new ModelBuilder()
  const pole = '#43484f'
  m.cyl(0.13, 0.16, 6.4, { at: [0, 3.2, 0], color: pole, seg: 10 })
  m.beam([0, 6.1, 0], [-4.4, 6.1, 0], 0.08, { color: pole, seg: 8 })
  m.beam([0, 5.0, 0], [-1.6, 6.05, 0], 0.05, { color: pole, seg: 6 })
  // the head over the road and a smaller one on the pole
  for (const [x, y, s] of [[-3.0, 5.2, 1], [0, 3.1, 0.8]]) {
    m.box(0.42 * s, 1.18 * s, 0.32, { at: [x, y, 0.2], color: '#1a1c1f' })
    m.box(0.62 * s, 1.38 * s, 0.04, { at: [x, y, 0.02], color: '#f2f2ef' })
    for (let i = 0; i < 3; i++) m.box(0.34 * s, 0.05, 0.22, { at: [x, y + (0.38 - i * 0.38) * s + 0.17 * s, 0.44], color: '#1a1c1f' })
  }
  return m.build({ crease: 30 })
}

/* the lit lamp discs of a traffic light: lamp i (0 red, 1 amber, 2 green) of both heads */
export function trafficLampModel(i) {
  const m = new ModelBuilder()
  for (const [x, y, s] of [[-3.0, 5.2, 1], [0, 3.1, 0.8]]) {
    m.cyl(0.13 * s, 0.13 * s, 0.04, { at: [x, y + (0.38 - i * 0.38) * s, 0.37], rot: [Math.PI / 2, 0, 0], color: '#ffffff', seg: 16 })
  }
  return m.build({ crease: 40 })
}

/* rail crossing post (one side; the arm is separate so it can turn) */
export function crossingPostModel() {
  const m = new ModelBuilder()
  m.cyl(0.08, 0.1, 3.4, { at: [0, 1.7, 0], color: '#e8e8e4', seg: 8 })
  for (const r of [0.6, -0.6]) {
    m.box(1.25, 0.18, 0.04, { at: [0, 3.0, 0.08], rot: [0, 0, r], color: '#f2f2ef' })
    m.box(1.29, 0.06, 0.03, { at: [0, 3.0, 0.1], rot: [0, 0, r], color: '#d4262c' })
  }
  m.box(0.9, 0.3, 0.12, { at: [0, 2.25, 0.08], color: '#1a1c1f' })
  m.box(0.7, 0.9, 0.5, { at: [0, 0.45, -0.3], color: '#d8d8d4' })
  return m.build({ crease: 30 })
}

/* the barrier arm: pivot at the origin, pointing along +x, striped */
export function crossingArmModel(len = 4.6) {
  const m = new ModelBuilder()
  const n = 9
  for (let i = 0; i < n; i++) m.box(len / n, 0.14, 0.1, { at: [(len / n) * (i + 0.5), 0, 0], color: i % 2 ? '#f2f2ef' : '#d4262c' })
  m.box(0.4, 0.3, 0.25, { at: [-0.2, 0, 0], color: '#3b3f45' })
  return m.build({ crease: 30 })
}

export function crossingLampModel() {
  const m = new ModelBuilder()
  m.cyl(0.11, 0.11, 0.04, { at: [-0.26, 2.25, 0.16], rot: [Math.PI / 2, 0, 0], color: '#ffffff', seg: 14 })
  m.cyl(0.11, 0.11, 0.04, { at: [0.26, 2.25, 0.16], rot: [Math.PI / 2, 0, 0], color: '#ffffff', seg: 14 })
  return m.build({ crease: 40 })
}

/* a train carriage along x (it crosses the road), 14 m long */
export function carriageModel(color = '#d63a33') {
  const m = new ModelBuilder()
  m.box(14, 3.0, 3.0, { at: [0, 2.2, 0], color })
  m.box(13.6, 0.35, 2.7, { at: [0, 3.85, 0], color: '#c9ced4' })
  m.box(14.02, 0.22, 3.02, { at: [0, 1.4, 0], color: '#f2f2ef' })
  for (let i = 0; i < 6; i++) {
    for (const z of [-1.51, 1.51]) m.box(1.4, 0.95, 0.04, { at: [-5.2 + i * 2.08, 2.75, z], color: C.glassDark })
  }
  for (const x of [-5, 5]) {
    m.box(2.6, 0.6, 2.4, { at: [x, 0.55, 0], color: '#25282c' })
    for (const dx of [-0.75, 0.75]) for (const z of [-1.05, 1.05]) m.cyl(0.42, 0.42, 0.15, { at: [x + dx, 0.45, z], rot: [Math.PI / 2, 0, 0], color: '#3b3f45', seg: 12 })
  }
  return m.build({ crease: 30 })
}

export function coinModel() {
  const m = new ModelBuilder()
  m.cyl(0.33, 0.33, 0.06, { at: [0, 0, 0], rot: [Math.PI / 2, 0, 0], color: '#ffffff', seg: 28 })
  m.torus(0.31, 0.035, { at: [0, 0, 0], color: '#ffffff', radial: 6, tubular: 28 })
  m.box(0.08, 0.32, 0.075, { at: [0, 0, 0], color: '#ffffff' })
  return m.build({ crease: 45 })
}

/* tunnel: a 52 m tube along −z from the entrance (z = 0); the portal is part of it */
export function tunnelModel(len = 52, halfW = 6.2, height = 6.4) {
  const m = new ModelBuilder()
  const wall = '#8d8a84'
  const seg = 12
  // inner arch walls (seen from inside: two-sided triangles)
  const P = []
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI
    const a1 = ((i + 1) / seg) * Math.PI
    const p = (a, z) => [Math.cos(a) * halfW, (height - halfW) + Math.sin(a) * halfW, z]
    const A = p(a0, 0); const B = p(a1, 0); const Cc = p(a0, -len); const D = p(a1, -len)
    P.push(...A, ...Cc, ...B, ...B, ...Cc, ...D)
  }
  m.tris(P, { color: wall, twoSided: true })
  for (const x of [-halfW, halfW]) {
    m.box(0.1, height - halfW + 0.02, len, { at: [x, (height - halfW) / 2, -len / 2], color: '#9c9890' })
    m.box(0.12, 0.5, len, { at: [x * 0.99, 1.2, -len / 2], color: '#d8d4cc' })
    // a raised walkway between the road and the wall
    m.box(halfW - 4.75, 0.24, len + 0.2, { at: [Math.sign(x) * (4.75 + (halfW - 4.75) / 2), 0.12, -len / 2], color: '#a7a39b' })
  }
  // portal: a rock face with the arch cut out, and a concrete ring
  const face = new Shape()
  face.moveTo(-34, 0)
  const ridge = [[-34, 0], [-30, 9], [-22, 13], [-14, 11], [-7, 16], [0, 14], [8, 17], [15, 12], [24, 14], [31, 8], [34, 0]]
  ridge.forEach(([x, y]) => face.lineTo(x, y))
  const hole = new Shape()
  hole.moveTo(halfW + 0.4, 0)
  hole.lineTo(halfW + 0.4, height - halfW)
  hole.absarc(0, height - halfW, halfW + 0.4, 0, Math.PI, false)
  hole.lineTo(-halfW - 0.4, 0)
  hole.lineTo(halfW + 0.4, 0)
  face.holes.push(hole)
  const fg = new ExtrudeGeometry(face, { depth: 6, bevelEnabled: false, curveSegments: 10 })
  fg.translate(0, 0, -3)
  m.add(fg, { color: '#7d7468' })
  const ring = new Shape()
  ring.moveTo(halfW + 1.3, 0)
  ring.lineTo(halfW + 1.3, height - halfW)
  ring.absarc(0, height - halfW, halfW + 1.3, 0, Math.PI, false)
  ring.lineTo(-halfW - 1.3, 0)
  ring.lineTo(-halfW - 0.4, 0)
  ring.lineTo(-halfW - 0.4, height - halfW)
  ring.absarc(0, height - halfW, halfW + 0.4, Math.PI, 0, true)
  ring.lineTo(halfW + 0.4, 0)
  const rg = new ExtrudeGeometry(ring, { depth: 0.8, bevelEnabled: false, curveSegments: 14 })
  rg.translate(0, 0, 3.0)
  m.add(rg, { color: '#bdb8ae' })
  // grass / snow caps on the ridge are left to the material tint; a few boulders at the foot
  m.rock(2.2, { at: [-14, 0.6, 2.5], color: '#857c70', seed: 4 })
  m.rock(1.6, { at: [16, 0.4, 2.8], color: '#857c70', seed: 8 })
  return m.build({ crease: 28 })
}

/* the tunnel's exit ring (seen from inside, bright outside) */
export function tunnelExitModel(halfW = 6.2, height = 6.4) {
  const m = new ModelBuilder()
  const ring = new Shape()
  ring.moveTo(halfW + 1.2, 0)
  ring.lineTo(halfW + 1.2, height - halfW)
  ring.absarc(0, height - halfW, halfW + 1.2, 0, Math.PI, false)
  ring.lineTo(-halfW - 1.2, 0)
  ring.lineTo(-halfW, 0)
  ring.lineTo(-halfW, height - halfW)
  ring.absarc(0, height - halfW, halfW, Math.PI, 0, true)
  ring.lineTo(halfW, 0)
  const rg = new ExtrudeGeometry(ring, { depth: 0.6, bevelEnabled: false, curveSegments: 14 })
  m.add(rg, { color: '#bdb8ae' })
  return m.build({ crease: 28 })
}

/* ceiling lamp strip pieces (emissive, instanced along the tunnel) */
export function tunnelLampModel() {
  const m = new ModelBuilder()
  m.box(0.5, 0.08, 1.4, { at: [0, 0, 0], color: '#ffffff' })
  return m.build({ crease: 10 })
}

/* a speed bump across the road (x), yellow / black */
export function bumpModel(width = 9.2) {
  const m = new ModelBuilder()
  const n = 12
  for (let i = 0; i < n; i++) {
    const w = width / n
    m.cyl(0.45, 0.45, w, { at: [-width / 2 + w * (i + 0.5), -0.37, 0], rot: [0, 0, Math.PI / 2], color: i % 2 ? '#16181b' : '#f5c518', seg: 16, scale: [1, 1, 1] })
  }
  return m.build({ crease: 40 })
}

/* rail tracks across the road (along x, 80 m), 1.52 m gauge */
export function railTrackModel(len = 80) {
  const m = new ModelBuilder()
  for (let x = -len / 2; x < len / 2; x += 0.62) m.box(0.24, 0.12, 2.6, { at: [x, 0.02, 0], color: '#6b5e52' })
  for (const z of [-0.76, 0.76]) {
    m.box(len, 0.14, 0.08, { at: [0, 0.1, z], color: '#a4a9b0' })
    m.box(len, 0.04, 0.16, { at: [0, 0.04, z], color: '#6f747b' })
  }
  m.box(len, 0.03, 3.4, { at: [0, -0.02, 0], color: '#8a8278' })
  return m.build({ crease: 30 })
}
