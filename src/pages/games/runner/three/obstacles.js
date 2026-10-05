/*
 * TOBY RUN — obstacles (RUNNER_PLAN §B1, §B9.1 obstacles.js). One instanced mesh per shape and biome,
 * refilled each frame from game.obstacles. The shape says what to do, whatever the biome (and without
 * colour):
 *   low   — something knee-high across the lane: jump        metro turnstile · bozor aravacha cart ·
 *                                                             park bench · city road barrier
 *   high  — a board on two posts, "DIQQAT!": roll under it    (the board's colour follows the biome)
 *   wall  — a tall block: change lane                         metro crates · bozor fruit crates ·
 *                                                             ice-cream cart · a toy microvan
 *   train / move — a carriage (its front ramp leads onto the roof) / an oncoming one: metro carriages,
 *                  trams outside
 * The colliders never change (engine/physics.js SHAPES); only the dress does.
 */
import { CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { InstancedBatch, atlasCellMaterial } from '../../../../games/three/instancing'
import { ModelBuilder } from '../../../../games/three/primitives'
import { vertexMaterial } from '../../../../games/three/materials'
import { makeCanvas } from '../../../../games/three/textures'
import { BIOMES } from '../engine/track.js'
import { LANE_X } from '../engine/physics.js'
import { biomeIndexAt } from './biomes'

const BACK = 12
const AHEAD = 130

/* ── low (jump) ─────────────────────────────────────────────────────────── */

function turnstileGeometry() {
  const m = new ModelBuilder()
  for (const x of [-1.02, 1.02]) {
    m.box(0.18, 0.98, 0.3, { at: [x, 0.49, 0], color: '#2d3240' })
    m.box(0.22, 0.06, 0.34, { at: [x, 0.99, 0], color: '#D9982E' })
    m.box(0.36, 0.06, 0.44, { at: [x, 0.03, 0], color: '#1f232d' })
    m.box(0.06, 0.1, 0.12, { at: [x - Math.sign(x) * 0.1, 0.84, -0.16], color: '#2BB3C0' })
  }
  m.box(2.2, 0.2, 0.12, { at: [0, 0.78, 0], color: '#F5B14C' })
  for (let i = 0; i < 5; i++) m.box(0.2, 0.205, 0.125, { at: [-0.88 + i * 0.44, 0.78, 0], rot: [0, 0, 0.5], color: '#16161D' })
  m.box(2.1, 0.08, 0.08, { at: [0, 0.4, 0], color: '#F6EBD9' })
  return m.build({ crease: 30 })
}

function cartGeometry() {
  const m = new ModelBuilder()
  m.box(1.9, 0.12, 0.62, { at: [0, 0.58, 0], color: '#a8743f' })
  for (const z of [-0.29, 0.29]) m.box(1.9, 0.22, 0.05, { at: [0, 0.72, z], color: '#8a5d31' })
  for (const x of [-0.93, 0.93]) {
    m.cyl(0.4, 0.4, 0.07, { seg: 16, at: [x * 1.04, 0.4, 0], rot: [0, 0, Math.PI / 2], color: '#5b4128' })
    m.cyl(0.1, 0.1, 0.1, { seg: 8, at: [x * 1.04, 0.4, 0], rot: [0, 0, Math.PI / 2], color: '#D9982E' })
    for (let i = 0; i < 4; i++) m.box(0.035, 0.74, 0.035, { at: [x * 1.06, 0.4, 0], rot: [i * Math.PI / 4, 0, 0], color: '#7b5a3a' })
  }
  for (const x of [-0.4, 0.4]) m.box(0.05, 0.05, 0.9, { at: [x, 0.62, 0.65], color: '#8a5d31' })
  for (let i = 0; i < 4; i++) m.sphere(0.17, { seg: 9, at: [-0.6 + i * 0.4, 0.78, 0], scale: [1.25, 0.82, 0.9], color: i % 2 ? '#E8C35A' : '#7fa64a' })
  return m.build({ crease: 30 })
}

function benchLowGeometry() {
  const m = new ModelBuilder()
  for (const x of [-0.9, 0.9]) {
    m.box(0.08, 0.45, 0.46, { at: [x, 0.22, 0], color: '#2b2f3a' })
    m.box(0.08, 0.42, 0.08, { at: [x, 0.66, 0.2], color: '#2b2f3a' })
  }
  for (let i = 0; i < 3; i++) m.box(2.05, 0.05, 0.12, { at: [0, 0.47, -0.14 + i * 0.14], color: '#b07a4a' })
  for (let i = 0; i < 2; i++) m.box(2.05, 0.11, 0.05, { at: [0, 0.66 + i * 0.16, 0.22], color: '#b07a4a' })
  return m.build({ crease: 30 })
}

function roadBarrierGeometry() {
  const m = new ModelBuilder()
  for (const x of [-0.95, 0.95]) {
    for (const z of [-0.18, 0.18]) m.box(0.07, 0.86, 0.07, { at: [x, 0.42, z], rot: [z > 0 ? 0.32 : -0.32, 0, 0], color: '#3a3f4d' })
  }
  m.box(2.1, 0.24, 0.08, { at: [0, 0.74, 0], color: '#ffffff' })
  for (let i = 0; i < 5; i++) m.box(0.24, 0.245, 0.085, { at: [-0.84 + i * 0.42, 0.74, 0], rot: [0, 0, 0.6], color: '#D94A5A' })
  m.box(2.1, 0.06, 0.06, { at: [0, 0.32, 0], color: '#ffffff' })
  m.sphere(0.07, { seg: 8, at: [-0.95, 0.94, 0], color: '#ffb347' })
  m.sphere(0.07, { seg: 8, at: [0.95, 0.94, 0], color: '#ffb347' })
  return m.build({ crease: 30 })
}

/* ── high (roll) ────────────────────────────────────────────────────────── */

function signFrameGeometry() {
  const m = new ModelBuilder()
  for (const x of [-1.08, 1.08]) m.box(0.14, 3.0, 0.14, { at: [x, 1.5, 0], color: '#2d3240' })
  m.box(2.36, 0.14, 0.16, { at: [0, 2.94, 0], color: '#2d3240' })
  m.box(2.2, 1.06, 0.12, { at: [0, 1.42, 0], color: '#ffffff' })
  m.box(2.26, 0.08, 0.14, { at: [0, 0.88, 0], color: '#F6EBD9' })
  m.box(2.26, 0.08, 0.14, { at: [0, 1.96, 0], color: '#F6EBD9' })
  for (const x of [-0.7, 0.7]) m.box(0.04, 0.95, 0.04, { at: [x, 2.45, 0], color: '#9aa3b2' })
  return m.build({ crease: 30 })
}

/* one board per biome, stacked: DIQQAT! + a "roll" arrow */
const SIGN_COLORS = [['#D94A5A', '#ffffff'], ['#F5B14C', '#16161D'], ['#3E8F5A', '#ffffff'], ['#F08A24', '#16161D']]
function signTexture() {
  const W = 512
  const H = 224
  const c = makeCanvas(W, H * 4)
  const g = c.getContext('2d')
  SIGN_COLORS.forEach(([bg, fg], i) => {
    const y = i * H
    g.fillStyle = bg
    g.fillRect(0, y, W, H)
    if (i === 1) {
      // the bozor board: awning stripes along the top
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#F6EBD9' : '#2BB3C0'; g.fillRect(k * 64, y, 64, 26) }
    }
    if (i === 3) {
      g.fillStyle = '#16161D'
      for (let k = -1; k < 9; k++) {
        g.beginPath(); g.moveTo(k * 64, y + H); g.lineTo(k * 64 + 32, y + H); g.lineTo(k * 64 + 52, y + H - 20); g.lineTo(k * 64 + 20, y + H - 20); g.closePath(); g.fill()
      }
    }
    g.fillStyle = fg
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = '900 100px Inter, "Segoe UI", Arial, sans-serif'
    g.fillText('DIQQAT!', W / 2, y + 100)
    g.strokeStyle = fg
    g.lineWidth = 12
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(196, y + 170); g.lineTo(256, y + 196); g.lineTo(316, y + 170)
    g.stroke()
  })
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}
const signCell = (b) => [0, 1 - (b + 1) / 4, 1, 1 / 4]
const SIGN_CELLS = [0, 1, 2, 3].map(signCell)

/* ── wall (change lane) ─────────────────────────────────────────────────── */

function cratesGeometry(fruit = false) {
  const m = new ModelBuilder()
  const wood = ['#b98b57', '#a87a49', '#c79b63']
  let i = 0
  for (const [x, y, s] of [[-0.58, 0.5, 1.0], [0.56, 0.5, 1.0], [0.0, 1.52, 1.04], [-0.55, 2.0, 0.42], [0.62, 1.2, 0.36]]) {
    const c = wood[i++ % wood.length]
    m.box(s * 1.08, s, 1.5, { at: [x, y, 0], color: c })
    m.box(s * 1.1, 0.08, 1.52, { at: [x, y + s * 0.3, 0], color: '#7a5634' })
    m.box(s * 1.1, 0.08, 1.52, { at: [x, y - s * 0.3, 0], color: '#7a5634' })
  }
  if (fruit) {
    m.sphere(0.34, { seg: 12, at: [0.0, 2.32, 0.1], scale: [1, 0.9, 1.2], color: '#2f6b3a' })
    for (let k = 0; k < 5; k++) m.sphere(0.12, { seg: 7, at: [-0.82 + k * 0.4, 1.05, 0.62], color: k % 2 ? '#C8323F' : '#F2A23A' })
  }
  return m.build({ crease: 30 })
}

function iceCreamGeometry() {
  const m = new ModelBuilder()
  m.box(1.9, 1.15, 1.4, { at: [0, 0.85, 0], color: '#F6F1E8' })
  m.box(1.92, 0.24, 1.42, { at: [0, 1.0, 0], color: '#2BB3C0' })
  m.box(1.94, 0.08, 1.44, { at: [0, 1.46, 0], color: '#F5B14C' })
  for (const x of [-0.7, 0.7]) m.cyl(0.26, 0.26, 0.08, { seg: 14, at: [x, 0.26, 0.72], rot: [Math.PI / 2, 0, 0], color: '#2b2f3a' })
  m.cyl(0.035, 0.035, 0.95, { seg: 6, at: [0, 1.95, 0], color: '#9aa3b2' })
  m.cone(1.25, 0.45, { seg: 12, at: [0, 2.55, 0], color: '#F6EBD9' })
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    m.cone(0.36, 0.44, { seg: 4, at: [Math.cos(a) * 0.62, 2.56, Math.sin(a) * 0.62], rot: [0, -a, 0], color: k % 2 ? '#D94A5A' : '#F6EBD9' })
  }
  // a big cone on the front
  m.cone(0.2, 0.5, { seg: 10, at: [0, 0.75, 0.74], rot: [Math.PI, 0, 0], color: '#E0A85E' })
  m.sphere(0.2, { seg: 10, at: [0, 1.06, 0.74], color: '#F7A8C0' })
  return m.build({ crease: 30 })
}

function microvanGeometry() {
  const m = new ModelBuilder()
  m.box(2.0, 1.5, 1.7, { at: [0, 1.05, 0], color: '#F4F6F8' })
  m.box(1.9, 0.5, 1.6, { at: [0, 2.0, -0.02], color: '#F4F6F8' })
  m.box(2.02, 0.18, 1.72, { at: [0, 0.95, 0], color: '#2BB3C0' })
  m.box(1.7, 0.5, 0.04, { at: [0, 1.9, 0.85], color: '#1d2a3a' })
  for (const x of [-0.72, 0.72]) {
    m.box(0.3, 0.16, 0.05, { at: [x, 1.3, 0.86], color: '#fff3c4' })
    m.cyl(0.3, 0.3, 0.24, { seg: 12, at: [x * 1.25, 0.32, 0.35], rot: [0, 0, Math.PI / 2], color: '#16161D' })
    m.cyl(0.3, 0.3, 0.24, { seg: 12, at: [x * 1.25, 0.32, -0.45], rot: [0, 0, Math.PI / 2], color: '#16161D' })
  }
  m.box(1.4, 0.1, 0.06, { at: [0, 0.55, 0.86], color: '#2d3240' })
  m.box(0.5, 0.06, 0.04, { at: [0, 1.06, 0.88], color: '#ffffff' })
  return m.build({ crease: 30 })
}

/* ── carriages ──────────────────────────────────────────────────────────── */

/* a carriage from local z = 0 (its front, toward Toby) back to z = −14 */
function carriageGeometry({ body, band, lit, roof = '#c9ced6', stripe = '#2BB3C0', glass = '#1d2a3a', tram = false }) {
  const m = new ModelBuilder()
  const L = 14
  m.box(2.4, 2.9, L, { at: [0, 1.9, -L / 2], color: body })
  m.box(2.3, 0.3, L - 0.2, { at: [0, 3.35, -L / 2], color: roof })
  m.box(2.42, 0.22, L, { at: [0, 1.15, -L / 2], color: band })
  m.box(2.0, 0.42, L - 1.2, { at: [0, 0.32, -L / 2], color: '#2b2f38' })
  for (let i = 0; i < 5; i++) {
    const z = -1.6 - i * 2.7
    for (const x of [-1.215, 1.215]) m.box(0.02, 0.9, 1.8, { at: [x, 2.15, z], color: glass })
  }
  if (tram) {
    m.box(2.42, 0.5, L, { at: [0, 0.75, -L / 2], color: stripe })
    m.box(1.4, 0.16, 3.0, { at: [0, 3.55, -L / 2], color: '#9aa3b2' })
  }
  // front: windscreen, lamps, a stripe
  m.box(1.9, 1.0, 0.04, { at: [0, 2.35, 0.01], color: '#16202c' })
  m.box(2.42, 0.18, 0.06, { at: [0, 1.5, 0.02], color: stripe })
  for (const x of [-0.8, 0.8]) m.box(0.34, 0.2, 0.06, { at: [x, 1.05, 0.03], color: lit })
  m.box(1.0, 0.32, 0.06, { at: [0, 3.0, 0.02], color: '#F6EBD9' })
  for (const z of [-2.2, -L + 2.2]) for (const x of [-0.75, 0.75]) m.cyl(0.32, 0.32, 0.2, { seg: 10, at: [x, 0.32, z], rot: [0, 0, Math.PI / 2], color: '#16161D' })
  return m.build({ crease: 30 })
}

/* the front ramp: from the ground at local z = +6 up to the roof (3.4 m) at z = 0 */
function rampGeometry() {
  const m = new ModelBuilder()
  const H = 3.4
  const L = 6
  const W = 1.1
  const top = [-W, 0, L, W, 0, L, W, H, 0, -W, 0, L, W, H, 0, -W, H, 0]
  m.tris(top, { color: '#9aa3b2' })
  for (const sx of [-1, 1]) m.tris([sx * W, 0, L, sx * W, 0, 0, sx * W, H, 0], { color: '#5d6573', twoSided: true })
  for (let i = 1; i < 6; i++) {
    const k = i / 6
    m.box(2.2, 0.05, 0.22, { at: [0, H * (1 - k) + 0.03, L * k], rot: [Math.atan2(H, L), 0, 0], color: i % 2 ? '#F5B14C' : '#16161D' })
  }
  return m.build({ crease: 30 })
}

export class ObstacleView {
  constructor(stage) {
    const mat = vertexMaterial({ roughness: 0.72 })
    const opt = { castShadow: true, receiveShadow: true }
    const B = (geo, n) => new InstancedBatch(geo, mat, n, opt)
    // per biome (BIOMES order: metro, bozor, xiyobon, shahar)
    this.low = [B(turnstileGeometry(), 40), B(cartGeometry(), 40), B(benchLowGeometry(), 40), B(roadBarrierGeometry(), 40)]
    this.wall = [B(cratesGeometry(false), 28), B(cratesGeometry(true), 28), B(iceCreamGeometry(), 28), B(microvanGeometry(), 28)]
    this.high = B(signFrameGeometry(), 32)
    this.highText = new InstancedBatch(new PlaneGeometry(2.08, 0.92), atlasCellMaterial(new MeshBasicMaterial({ map: signTexture(), toneMapped: false })), 32, { cells: true })
    const metro = carriageGeometry({ body: '#2E5AAC', band: '#F6EBD9', lit: '#fff3c4' })
    const tram = carriageGeometry({ body: '#F6EBD9', band: '#2E5AAC', lit: '#fff3c4', stripe: '#2BB3C0', tram: true })
    this.train = [B(metro, 20), B(tram, 20)]
    this.move = [B(carriageGeometry({ body: '#D94A5A', band: '#F5B14C', lit: '#ffffff', stripe: '#F6EBD9' }), 6),
      B(carriageGeometry({ body: '#F5B14C', band: '#D94A5A', lit: '#ffffff', stripe: '#D94A5A', tram: true }), 6)]
    this.ramp = B(rampGeometry(), 16)
    this.all = [...this.low, ...this.wall, this.high, this.highText, ...this.train, ...this.move, this.ramp]
    for (const b of this.all) stage.scene.add(b)
  }

  update(game) {
    const dist = game.dist
    const track = game.track
    for (const b of this.all) b.begin()
    for (const o of game.obstacles) {
      const zFront = -(o.z - dist)
      const zBack = -(o.z + o.len - dist)
      if (zBack > BACK || zFront + (o.ramp || 0) < -AHEAD) continue
      const x = LANE_X[o.lane]
      const zMid = (zFront + zBack) / 2
      const bi = biomeIndexAt(track, o.z)
      const outside = BIOMES[bi] !== 'metro' ? 1 : 0
      if (o.type === 'low') this.low[bi].add(x, 0, zMid)
      else if (o.type === 'high') { this.high.add(x, 0, zMid); this.highText.add(x, 1.42, zMid + 0.07, 0, 1, null, SIGN_CELLS[bi]) }
      else if (o.type === 'wall') this.wall[bi].add(x, 0, zMid)
      else if (o.type === 'train') {
        this.train[outside].add(x, 0, zFront)
        if (o.ramp) this.ramp.add(x, 0, zFront)
      } else if (o.type === 'move') this.move[outside].add(x, 0, zFront)
    }
    for (const b of this.all) b.end()
  }
}
