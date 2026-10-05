/*
 * TOBY RUN — coins (one InstancedBatch), power-ups (magnit, x2, uchar gilam), the twister's gold token,
 * the So'z shari arch (with the coming item's picture on its speech-bubble crest when the prompt shows a
 * picture), Listen mode's three choice balloons (picture or word), and the shield bubble around Toby.
 */
import {
  AdditiveBlending, CanvasTexture, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry,
  SRGBColorSpace, SphereGeometry,
} from 'three'
import { InstancedBatch } from '../../../../games/three/instancing'
import { ModelBuilder } from '../../../../games/three/primitives'
import { glowMaterial, vertexMaterial } from '../../../../games/three/materials'
import { makeCanvas } from '../../../../games/three/textures'
import { LANE_X } from '../engine/physics.js'

const BACK = 6
const AHEAD = 125
const PICTURE_PT = new Set(['picture', 'choice', 'hear'])
const GLOW_SCALE = [4.9, 4.9, 0.3]

function magnetGeometry() {
  const m = new ModelBuilder()
  m.torus(0.3, 0.1, { radial: 8, tubular: 16, arc: Math.PI, rot: [0, 0, Math.PI], color: '#D94A5A' })
  for (const x of [-0.3, 0.3]) {
    m.cyl(0.1, 0.1, 0.22, { seg: 10, at: [x, 0.11, 0], color: '#D94A5A' })
    m.cyl(0.101, 0.101, 0.12, { seg: 10, at: [x, 0.28, 0], color: '#e8edf3' })
  }
  return m.build({ crease: 50 })
}

function x2Geometry() {
  const m = new ModelBuilder()
  m.cyl(0.36, 0.36, 0.1, { seg: 18, rot: [Math.PI / 2, 0, 0], color: '#2BB3C0' })
  m.torus(0.36, 0.04, { radial: 5, tubular: 20, color: '#F6EBD9' })
  // an "×2" in relief: two crossed bars and a 2-ish hook
  m.box(0.28, 0.06, 0.06, { at: [-0.1, 0, 0.06], rot: [0, 0, 0.78], color: '#ffffff' })
  m.box(0.28, 0.06, 0.06, { at: [-0.1, 0, 0.06], rot: [0, 0, -0.78], color: '#ffffff' })
  m.torus(0.08, 0.03, { radial: 4, tubular: 10, arc: Math.PI * 1.2, at: [0.15, 0.06, 0.06], rot: [0, 0, -0.3], color: '#ffffff' })
  m.box(0.17, 0.05, 0.06, { at: [0.15, -0.11, 0.06], color: '#ffffff' })
  return m.build({ crease: 50 })
}

function carpetGeometry() {
  const m = new ModelBuilder()
  m.box(0.95, 0.06, 0.6, { color: '#D94A5A' })
  m.box(0.75, 0.065, 0.42, { color: '#2E5AAC' })
  m.box(0.4, 0.07, 0.2, { color: '#F5B14C' })
  for (const x of [-0.5, 0.5]) for (let i = 0; i < 4; i++) m.box(0.06, 0.03, 0.03, { at: [x * 1.05, 0, -0.22 + i * 0.15], color: '#F6EBD9' })
  return m.build({ crease: 50 })
}

function starGeometry() {
  const m = new ModelBuilder()
  const P = []
  const pts = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const r = i % 2 ? 0.2 : 0.46
    pts.push([Math.cos(a) * r, Math.sin(a) * r])
  }
  for (let i = 0; i < 10; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[(i + 1) % 10]
    P.push(0, 0, 0.1, ax, ay, 0, bx, by, 0)
    P.push(0, 0, -0.1, bx, by, 0, ax, ay, 0)
  }
  m.tris(P, { color: '#F5B14C' })
  return m.build({ crease: 20 })
}

/* the So'z shari arch over all three lanes: pillars, a girih band, a speech-bubble crest */
function archGeometry() {
  const m = new ModelBuilder()
  for (const x of [-4.4, 4.4]) {
    m.box(0.6, 3.0, 0.6, { at: [x, 1.5, 0], color: '#2E5AAC' })
    m.box(0.72, 0.3, 0.72, { at: [x, 0.15, 0], color: '#F6EBD9' })
    m.box(0.7, 0.18, 0.7, { at: [x, 2.95, 0], color: '#F5B14C' })
  }
  m.torus(4.4, 0.3, { radial: 8, tubular: 28, arc: Math.PI, at: [0, 3.0, 0], color: '#2E5AAC' })
  m.torus(4.4, 0.1, { radial: 5, tubular: 28, arc: Math.PI, at: [0, 3.0, 0.27], color: '#2BB3C0' })
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI
    m.sphere(0.13, { seg: 6, at: [Math.cos(a) * 4.4, 3.0 + Math.sin(a) * 4.4, 0.32], color: i % 2 ? '#F5B14C' : '#F6EBD9' })
  }
  // the speech bubble on top
  m.sphere(0.95, { seg: 14, at: [0, 7.9, 0], scale: [1.25, 0.9, 0.5], color: '#F6EBD9' })
  m.cone(0.28, 0.6, { seg: 6, at: [-0.35, 7.1, 0], rot: [0, 0, 0.5], color: '#F6EBD9' })
  for (const x of [-0.42, 0, 0.42]) m.sphere(0.11, { seg: 6, at: [x, 7.9, 0.46], color: '#2E5AAC' })
  return m.build({ crease: 40 })
}

function labelTexture() {
  const c = makeCanvas(512, 256)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return { c, t }
}

function drawLabel(lab, text) {
  const g = lab.c.getContext('2d')
  g.clearRect(0, 0, 512, 256)
  g.fillStyle = '#F6EBD9'
  g.beginPath()
  g.roundRect ? g.roundRect(8, 40, 496, 176, 88) : g.rect(8, 40, 496, 176)
  g.fill()
  g.fillStyle = '#16161D'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  let size = 96
  g.font = `800 ${size}px Inter, "Segoe UI", Arial, sans-serif`
  const w = g.measureText(text).width
  if (w > 440) { size = Math.floor(size * 440 / w); g.font = `800 ${size}px Inter, "Segoe UI", Arial, sans-serif` }
  g.fillText(text, 256, 132)
  lab.t.needsUpdate = true
}

export class PickupView {
  constructor(stage) {
    const scene = stage.scene
    // coins stay bright gold in a dark tunnel too (a little self-light)
    const gold = new MeshStandardMaterial({ color: '#FFC24D', metalness: 0.35, roughness: 0.3, emissive: '#c98a12', emissiveIntensity: 0.55 })
    this.coinsB = new InstancedBatch(new CylinderGeometry(0.3, 0.3, 0.07, 18), gold, 256, { castShadow: false })
    const mat = vertexMaterial({ roughness: 0.45, metalness: 0.1 })
    this.magnet = new InstancedBatch(magnetGeometry(), mat, 6, { castShadow: true })
    this.x2 = new InstancedBatch(x2Geometry(), mat, 6, { castShadow: true })
    this.gilam = new InstancedBatch(carpetGeometry(), mat, 6, { castShadow: true })
    this.token = new InstancedBatch(starGeometry(), new MeshStandardMaterial({ color: '#F5B14C', metalness: 0.6, roughness: 0.25, emissive: '#F5B14C', emissiveIntensity: 0.45 }), 4)
    this.arch = new InstancedBatch(archGeometry(), vertexMaterial({ roughness: 0.55 }), 3, { castShadow: true, receiveShadow: true })
    this.archGlow = new InstancedBatch(new SphereGeometry(1, 16, 10), glowMaterial('#2BB3C0', null, 0.18), 3)
    this.archGlow.renderOrder = 4
    for (const b of [this.coinsB, this.magnet, this.x2, this.gilam, this.token, this.arch, this.archGlow]) scene.add(b)

    // Listen mode: three balloons with their words
    this.choiceGroups = []
    const bubbleGeo = new SphereGeometry(0.85, 18, 12)
    const bubbleMat = new MeshStandardMaterial({ color: '#F6EBD9', roughness: 0.55 })
    for (let i = 0; i < 3; i++) {
      const g = new Group()
      const b = new Mesh(bubbleGeo, bubbleMat)
      b.scale.set(1.25, 1, 0.8)
      g.add(b)
      const lab = labelTexture()
      const plane = new Mesh(new PlaneGeometry(1.9, 0.95), new MeshBasicMaterial({ map: lab.t, transparent: true, toneMapped: false, depthWrite: false }))
      plane.position.set(0, 0, 0.72)
      g.add(plane)
      g.visible = false
      g.userData = { lab, text: '' }
      scene.add(g)
      this.choiceGroups.push(g)
    }

    // the shield: a soft bubble around Toby
    this.shield = new Mesh(new SphereGeometry(0.95, 20, 14), new MeshBasicMaterial({
      color: '#7fe3ff', transparent: true, opacity: 0.16, depthWrite: false, blending: AdditiveBlending, toneMapped: false,
    }))
    this.shield.visible = false
    this.shield.renderOrder = 6
    scene.add(this.shield)
    this.t = 0
  }

  /* pics: the shared picture batch (begun by the scene) · atlas: PictureAtlas */
  update(game, dt, pics, atlas) {
    this.t += dt
    const t = this.t
    const dist = game.dist
    // coins
    const c = game.coins
    const b = this.coinsB
    b.begin()
    for (let i = 0; i < c.cap; i++) {
      if (!c.alive[i]) continue
      const z = -(c.s[i] - dist)
      if (z > 0.6 || z < -AHEAD) continue                // a coin Toby passed never fills the camera
      b.addRot(c.x[i], c.y[i], z, Math.PI / 2, 0, t * 3 + c.s[i] * 0.4, 1)
    }
    b.end()
    // power-ups and the token
    this.magnet.begin(); this.x2.begin(); this.gilam.begin(); this.token.begin()
    for (const u of game.pickups) {
      if (!u.alive) continue
      const z = -(u.s - dist)
      if (z > BACK || z < -AHEAD) continue
      const y = 0.9 + Math.sin(t * 3 + u.s) * 0.12
      const batch = u.type === 'magnet' ? this.magnet : u.type === 'x2' ? this.x2 : u.type === 'gilam' ? this.gilam : this.token
      batch.addRot(LANE_X[u.lane], y, z, u.type === 'gilam' ? 0.25 : 0, t * 2.2, 0, u.type === 'token' ? 1.1 : 1.15)
    }
    this.magnet.end(); this.x2.end(); this.gilam.end(); this.token.end()
    // arches
    this.arch.begin(); this.archGlow.begin()
    for (const g of game.gates) {
      const z = -(g.s - dist)
      if (z > 20 || z < -AHEAD - 10) continue
      this.arch.add(0, 0, z)
      if (!g.used) this.archGlow.addRot(0, 3.4, z, 0, 0, 0, GLOW_SCALE)
      const it = g.item
      if (it && it.picture && !g.used && !game.listenMode && PICTURE_PT.has(it.pt)) {
        atlas.wantOne(it.picture)
        const cell = atlas.cell(it.picture)
        if (cell) pics.add(0, 7.9, z + 0.5, 0, 1.55, null, cell)
      }
    }
    this.arch.end(); this.archGlow.end()
    // Listen mode balloons
    for (let i = 0; i < 3; i++) {
      const grp = this.choiceGroups[i]
      const ch = game.choices[i]
      if (!ch || ch.hit) { grp.visible = false; continue }
      let cell = null
      if (ch.picture) { atlas.wantOne(ch.picture); cell = atlas.cell(ch.picture) }
      const label = cell ? '' : ch.text
      if (grp.userData.text !== label) { grp.userData.text = label; drawLabel(grp.userData.lab, label) }
      grp.visible = true
      const y = game.player.y + 0.6 + Math.sin(t * 2 + i) * 0.1
      grp.position.set(LANE_X[ch.lane], y, -(ch.s - dist))
      grp.children[1].visible = !cell
      if (cell) pics.add(LANE_X[ch.lane], y, -(ch.s - dist) + 0.72, 0, 1.35, null, cell)
    }
  }

  shieldAt(p, clock, on) {
    const s = this.shield
    s.visible = on
    if (!on) return
    s.position.set(p.x, p.y + 0.55, 0)
    const pulse = 1 + Math.sin(clock * 9) * 0.04
    s.scale.set(pulse, pulse * 1.05, pulse)
    s.material.opacity = 0.1 + Math.min(1, p.shield) * 0.1
  }
}
