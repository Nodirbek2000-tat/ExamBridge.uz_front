/*
 * TOBY RUN — the So'z shari speech-bubble balloon Toby holds on a ride (RUNNER_PLAN §B3.3), and the
 * Varrak kite after a twister. A cream bubble with a lapis rim and "…" dots, the item's drawn picture on
 * its face (pictureAtlas) when the prompt shows a picture, a string to his raised paw. On a pass it swells
 * and pops (fx.js throws the confetti) and a small saffron glider balloon carries him down; on a miss
 * it sags and glides down grey. 4 draw calls at most (+ the shared picture batch).
 */
import { Color, CylinderGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { ModelBuilder } from '../../../../games/three/primitives'
import { vertexMaterial } from '../../../../games/three/materials'

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const PICTURE_PT = new Set(['picture', 'choice', 'hear'])
const GLIDER_OK = new Color('#F5B14C')
const GLIDER_MISS = new Color('#c9c2b6')

function bubbleGeometry() {
  const m = new ModelBuilder()
  m.sphere(0.85, { seg: 22, scale: [1.3, 1.0, 0.92], color: '#FFF8EC' })
  m.cone(0.26, 0.55, { seg: 8, at: [-0.42, -0.86, 0], rot: [0, 0, 0.55], color: '#FFF8EC' })
  for (const z of [-0.79, 0.79]) for (const x of [-0.36, 0, 0.36]) m.sphere(0.1, { seg: 8, at: [x, 0.02, z], scale: [1, 1, 0.5], color: '#2E5AAC' })
  m.torus(0.86, 0.035, { radial: 4, tubular: 28, rot: [Math.PI / 2, 0, 0], scale: [1.3, 0.92, 1], at: [0, 0, 0], color: '#2BB3C0' })
  m.cone(0.05, 0.08, { seg: 6, at: [0.15, -0.86, 0], rot: [Math.PI, 0, 0], color: '#2BB3C0' })
  return m.build({ crease: 70 })
}

function kiteGeometry() {
  const m = new ModelBuilder()
  m.tris([0, 1.1, 0, -0.75, 0, 0, 0, -0.9, 0, 0, 1.1, 0, 0, -0.9, 0, 0.75, 0, 0], { color: '#D94A5A', twoSided: true })
  m.tris([0, 1.1, 0.01, -0.75, 0, 0.01, 0, 0, 0.01], { color: '#F5B14C', twoSided: true })
  m.tris([0, -0.9, 0.01, 0.75, 0, 0.01, 0, 0, 0.01], { color: '#2BB3C0', twoSided: true })
  m.box(0.04, 2.0, 0.04, { at: [0, 0.1, 0.02], color: '#6d5843' })
  for (let i = 0; i < 4; i++) m.box(0.16, 0.05, 0.02, { at: [0.04 * (i % 2 ? 1 : -1), -1.05 - i * 0.22, 0.02], rot: [0, 0, i % 2 ? 0.5 : -0.5], color: i % 2 ? '#F5B14C' : '#D94A5A' })
  return m.build({ crease: 10 })
}

export class Balloon {
  constructor(stage) {
    const scene = stage.scene
    this.mat = vertexMaterial({ roughness: 0.45 })
    this.bubble = new Mesh(bubbleGeometry(), this.mat)
    this.bubble.castShadow = true
    this.glider = new Mesh(this.bubble.geometry, new MeshStandardMaterial({ color: '#F5B14C', roughness: 0.5 }))
    this.glider.castShadow = true
    this.kite = new Mesh(kiteGeometry(), this.mat)
    this.string = new Mesh(new CylinderGeometry(0.012, 0.012, 1, 4), new MeshStandardMaterial({ color: '#9aa3b2', roughness: 0.6 }))
    for (const o of [this.bubble, this.glider, this.kite, this.string]) { o.visible = false; scene.add(o) }
    this.pos = new Vector3()
  }

  /* pics: the shared picture batch (begun by the scene) · atlas: PictureAtlas */
  update(game, dt, pics, atlas) {
    const r = game.ride
    const p = game.player
    const riding = game.phase === 'ride'
    const hand = { x: p.x + 0.36, y: p.y + 1.05 }
    const sway = Math.sin(game.clock * 1.6) * 0.12
    const bx = hand.x + 0.15 + sway * 0.4
    const by = hand.y + 1.3
    this.pos.set(bx, by, 0.1)
    const popped = riding && r.pop > 0            // startRide() resets pop, so this is this ride's pop
    // the bubble: inflates on the lift, swells and bursts on a pop
    let show = riding && !r.kite && !popped
    let scale = 0.8
    if (riding && r.phase === 'lift') scale = 0.8 * (0.4 + 0.6 * clamp(r.t / 0.45))
    if (riding && popped) {
      const k = (game.clock - r.pop) / 0.18
      if (k < 1) { show = true; scale = 0.8 + k * 0.3 }
    }
    this.bubble.visible = show
    if (show) {
      this.bubble.position.set(bx, by, 0.1)
      this.bubble.rotation.set(0, 0, sway * 0.5)
      this.bubble.scale.setScalar(scale)
      // the picture on its face — never in Listen mode (the learner picks the picture there)
      const card = game.director?.cardState
      const reveal = !!card && card.reveal && !card.options
      if (r.pic && !r.listen && (PICTURE_PT.has(r.pt) || reveal)) {
        atlas.wantOne(r.pic)
        const cell = atlas.cell(r.pic)
        // in front of the bubble's face, its rim and its "…" dots (front of the bubble ≈ 0.1 + 0.84 × scale)
        if (cell) pics.addRot(bx, by + 0.02, 0.1 + 0.92 * scale, 0, 0, sway * 0.5, 1.25 * scale, null, cell)
      }
    }
    // after the pop / at the end: a small glider balloon (saffron on a pass, grey-ish when the moment was missed)
    const glide = riding && !r.kite && (popped || r.phase === 'seek' || r.phase === 'glide' || r.phase === 'descent') && !(popped && game.clock - r.pop < 0.18)
    this.glider.visible = glide
    if (glide) {
      this.glider.position.set(bx, by - 0.25, 0.1)
      this.glider.scale.setScalar(0.62)
      this.glider.material.color.copy(popped ? GLIDER_OK : GLIDER_MISS)
    }
    // the kite after a twister
    this.kite.visible = riding && r.kite
    if (this.kite.visible) {
      this.kite.position.set(bx, by + 0.4, 0.2)
      this.kite.rotation.set(0.2, 0, sway)
    }
    // the string from the paw up to whatever he holds
    const holding = this.bubble.visible || glide || this.kite.visible
    this.string.visible = holding
    if (holding) {
      const top = this.kite.visible ? by - 0.5 : glide ? by - 0.75 : by - 0.85 * scale
      const len = Math.max(0.1, top - hand.y)
      this.string.position.set((hand.x + bx) / 2, hand.y + len / 2, 0.1)
      this.string.scale.set(1, len, 1)
      this.string.rotation.z = Math.atan2(hand.x - bx, len)
    }
  }
}
