/*
 * TOBY RUN — Shovqin, the noise cloud (RUNNER_PLAN §B1): a cute, grumpy purple cloud with headphones
 * that chases Toby for 6 s after a stumble. A correct spoken answer puffs it away. 3 draw calls.
 */
import { Group, Mesh, MeshStandardMaterial } from 'three'
import { ModelBuilder } from '../../../../games/three/primitives'
import { vertexMaterial } from '../../../../games/three/materials'

function cloudGeometry() {
  const m = new ModelBuilder()
  m.blob(0.62, { at: [0, 0, 0], color: '#7C5BEF', seed: 2 })
  m.blob(0.44, { at: [-0.55, -0.1, 0.05], color: '#7C5BEF', seed: 5 })
  m.blob(0.46, { at: [0.55, -0.08, 0.02], color: '#7C5BEF', seed: 7 })
  m.blob(0.36, { at: [-0.25, 0.42, 0.05], color: '#8B6CF6', seed: 9 })
  m.blob(0.34, { at: [0.3, 0.4, -0.02], color: '#8B6CF6', seed: 11 })
  return m.build({ crease: 70 })
}

function faceGeometry() {
  const m = new ModelBuilder()
  // it looks at Toby (and so away from the camera)… and at the camera, grumpy, from its back
  for (const z of [-0.6, 0.6]) {
    for (const x of [-0.2, 0.2]) {
      m.sphere(0.12, { seg: 8, at: [x, 0.08, z], scale: [1, 0.8, 0.5], color: '#ffffff' })
      m.sphere(0.06, { seg: 6, at: [x, 0.05, z * 1.06], scale: [1, 1, 0.5], color: '#1F2937' })
      m.box(0.2, 0.04, 0.04, { at: [x, 0.24, z], rot: [0, 0, x < 0 ? -0.35 : 0.35], color: '#3b2a7a' })
    }
    m.box(0.22, 0.04, 0.04, { at: [0, -0.18, z], color: '#3b2a7a' })
  }
  return m.build({ crease: 40 })
}

function headphonesGeometry() {
  const m = new ModelBuilder()
  m.torus(0.66, 0.05, { radial: 5, tubular: 18, arc: Math.PI, at: [0, 0.05, 0], color: '#16161D' })
  for (const x of [-0.66, 0.66]) m.cyl(0.18, 0.18, 0.14, { seg: 12, at: [x, 0.02, 0], rot: [0, 0, Math.PI / 2], color: '#F5B14C' })
  return m.build({ crease: 40 })
}

export class Shovqin {
  constructor(stage) {
    this.group = new Group()
    this.body = new Mesh(cloudGeometry(), new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.85, roughness: 0.9 }))
    this.face = new Mesh(faceGeometry(), vertexMaterial({ roughness: 0.6 }))
    this.phones = new Mesh(headphonesGeometry(), vertexMaterial({ roughness: 0.4 }))
    this.group.add(this.body, this.face, this.phones)
    this.group.visible = false
    stage.scene.add(this.group)
  }

  update(game) {
    const s = game.shovqin
    const t = game.clock
    const puff = t - s.puff
    const puffing = puff >= 0 && puff < 0.4
    const k = puffing ? 1 - puff / 0.4 : s.k
    const show = k > 0.02
    this.group.visible = show
    if (!show) return
    const p = game.player
    const wob = Math.sin(t * 5) * 0.06
    // 2 m behind Toby, low in the frame; a puff swells it and blows it back, away
    const back = 2.3 + (puffing ? (puff / 0.4) * 3 : (1 - k) * 2)
    this.group.position.set(p.x * 0.85 + Math.sin(t * 1.7) * 0.3, 0.7 + wob + (puffing ? puff * 2 : 0), back)
    const sc = (puffing ? 0.75 + (puff / 0.4) * 0.6 : 0.75) * Math.max(0.05, k)
    this.group.scale.set(sc * (1 + wob), sc * (1 - wob), sc)
    this.group.rotation.y = Math.sin(t * 2.3) * 0.25
    this.body.material.opacity = puffing ? 0.85 * (1 - puff / 0.4) : 0.85
  }
}
