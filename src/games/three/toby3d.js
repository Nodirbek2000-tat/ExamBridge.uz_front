/*
 * Toby in 3D — the cream kitten of Toby's Day (tobys-day/Toby.jsx palette), built from code — and the
 * two optional teen runners Lola and Bek on the same pivot rig (RUNNER_PLAN §B1, owner decision 2).
 *
 *   const toby = buildToby({ outfit: 'cap', who: 'toby' | 'lola' | 'bek' })
 *   scene.add(toby.root)                     // feet at y = 0, facing −z (away from a chase camera)
 *   toby.update(dt, { state, t, speed })     // run · jump · fall · roll · ride · stumble · land · cheer ·
 *                                            // crash · stand · idle   (t = seconds in the state)
 *   toby.setOutfit('doppi' | 'cap' | 'bow' | 'scarf' | 'glasses' | 'headphones' | 'crown' | '')
 *   toby.dispose()
 *
 * ≈ 1.1 m tall, chibi (the head is ~45% of the height). Parts are ModelBuilder meshes on pivots (no
 * skinning): one vertex-coloured material + one glossy eye material. Toby: ≈ 3.3k triangles, 13 draw
 * calls at most (with an outfit and the crash stars); Lola / Bek: 9.
 *
 * Animation (code only): run — legs ±35°, arms opposite, 2.2 Hz + 0.08 × speed, 4 cm bob, tail sway ·
 * jump — squash 0.9 / 1.1 on take-off, tucked at the apex · roll — a ball spinning 2π in 0.6 s, ears
 * flat · stumble — a 0.3 s wobble · ride — one paw up on the string, legs swinging · land — squash 0.85
 * for 0.12 s · cheer — both paws up, ears perked · crash — falls back, stars circle his head.
 */
import { CapsuleGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import { ModelBuilder } from './primitives'

const TOBY = {
  fur: '#FFF6EA', shade: '#F1E2CC', muzzle: '#FFFFFF', pink: '#FDA4AF', nose: '#F472B6', blush: '#FFD3DA',
  shirt: '#FF6B6B', collar: '#E0424F', hips: '#FFF6EA', pad: '#FBC4CC', limb: '#FFF6EA', foot: '#FFF6EA', white: '#FFFFFF',
}
const PEOPLE = {
  lola: {
    skin: '#EDBE95', hair: '#3B2418', shirt: '#2BB3C0', collar: '#F5B14C', hips: '#2E5AAC', limb: '#EDBE95',
    sleeve: '#2BB3C0', foot: '#F6EBD9', sole: '#D94A5A', blush: '#F3A0A0', lips: '#C9505E', white: '#FFFFFF',
  },
  bek: {
    skin: '#E0AE84', hair: '#231812', shirt: '#F5B14C', collar: '#D94A5A', hips: '#2E3A5C', limb: '#2E3A5C',
    sleeve: '#F5B14C', foot: '#FFFFFF', sole: '#2BB3C0', blush: '#EC9C8C', lips: '#B5534F', white: '#FFFFFF',
  },
}
export const RUNNERS = ['toby', 'lola', 'bek']
const OUTFITS = ['cap', 'bow', 'scarf', 'glasses', 'headphones', 'crown', 'doppi']
const TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const damp = (cur, goal, k, dt) => cur + (goal - cur) * (1 - Math.exp(-k * dt))

function capsule(m, r, len, o) {
  m.add(new CapsuleGeometry(r, len, 3, 8), o)
}

/* ── Toby's parts ─────────────────────────────────────────────────────── */

function tobyHead() {
  const C = TOBY
  const m = new ModelBuilder()
  m.sphere(0.27, { seg: 18, color: C.fur, scale: [1.06, 0.94, 1] })
  // face (toward −z)
  m.sphere(0.12, { seg: 12, at: [0, -0.075, -0.205], scale: [1.25, 0.78, 0.8], color: C.muzzle })
  m.sphere(0.034, { seg: 8, at: [0, -0.03, -0.29], scale: [1.25, 0.85, 0.9], color: C.nose })
  m.sphere(0.05, { seg: 8, at: [-0.165, -0.07, -0.19], scale: [1, 0.6, 0.5], color: C.blush })
  m.sphere(0.05, { seg: 8, at: [0.165, -0.07, -0.19], scale: [1, 0.6, 0.5], color: C.blush })
  // a small smile under the nose
  m.torus(0.03, 0.007, { radial: 3, tubular: 8, arc: Math.PI, at: [-0.03, -0.085, -0.29], rot: [0, 0, Math.PI], color: '#9F1239' })
  m.torus(0.03, 0.007, { radial: 3, tubular: 8, arc: Math.PI, at: [0.03, -0.085, -0.29], rot: [0, 0, Math.PI], color: '#9F1239' })
  // the white glints of the eyes (the eyes themselves are glossy, a mesh of their own)
  for (const sx of [-1, 1]) {
    m.sphere(0.017, { seg: 5, at: [sx * 0.092 + 0.012, 0.055, -0.268], color: C.white })
    m.sphere(0.009, { seg: 5, at: [sx * 0.092 - 0.012, 0.022, -0.27], color: C.white })
  }
  return m.build({ crease: 50 })
}

/* the ears, on their own pivot (they flatten in a roll and perk up in a cheer); pivot at the crown */
function tobyEars() {
  const C = TOBY
  const m = new ModelBuilder()
  for (const sx of [-1, 1]) {
    m.cone(0.105, 0.2, { seg: 8, at: [sx * 0.17, 0.07, 0.01], rot: [0, 0, -sx * 0.42], color: C.fur })
    m.cone(0.065, 0.13, { seg: 8, at: [sx * 0.165, 0.055, -0.035], rot: [-0.12, 0, -sx * 0.42], color: C.pink })
  }
  return m.build({ crease: 50 })
}

function eyesGeometry(human = false) {
  const m = new ModelBuilder()
  for (const sx of [-1, 1]) m.sphere(human ? 0.042 : 0.05, { seg: 10, at: [sx * 0.092, 0.035, human ? -0.245 : -0.235], scale: [0.82, 1.12, 0.62] })
  return m.build({ crease: 80 })
}

function torsoGeometry(C) {
  const m = new ModelBuilder()
  m.sphere(0.19, { seg: 14, at: [0, 0.03, 0], scale: [1.05, 0.82, 0.95], color: C.hips })            // hips
  m.sphere(0.2, { seg: 16, at: [0, 0.17, 0], scale: [1, 1.05, 0.9], color: C.shirt })              // T-shirt
  m.torus(0.105, 0.03, { radial: 6, tubular: 14, at: [0, 0.33, 0], rot: [Math.PI / 2, 0, 0], color: C.collar })
  if (C === TOBY) m.sphere(0.09, { seg: 10, at: [0, 0.06, -0.15], scale: [1.2, 1, 0.5], color: C.fur })   // tummy
  else m.box(0.3, 0.035, 0.32, { at: [0, 0.075, 0], color: C.collar })                                  // a belt
  return m.build({ crease: 60 })
}

function armGeometry(C) {
  const m = new ModelBuilder()
  capsule(m, 0.058, 0.17, { at: [0, -0.12, 0], color: C === TOBY ? C.fur : C.skin })
  m.sphere(0.072, { seg: 8, at: [0, -0.25, 0], color: C === TOBY ? C.fur : C.skin })
  m.sphere(0.064, { seg: 8, at: [0, -0.02, 0], scale: [1.15, 1, 1.15], color: C.sleeve || C.shirt })   // sleeve
  return m.build({ crease: 60 })
}

function legGeometry(C) {
  const m = new ModelBuilder()
  capsule(m, 0.075, 0.13, { at: [0, -0.12, 0], color: C.limb })
  m.sphere(0.085, { seg: 8, at: [0, -0.255, -0.035], scale: [1, 0.62, 1.32], color: C.foot })       // foot / shoe
  m.sphere(0.035, { seg: 6, at: [0, -0.285, -0.125], scale: [1.4, 0.4, 0.8], color: C.pad || C.sole })
  if (C !== TOBY) m.box(0.15, 0.03, 0.24, { at: [0, -0.3, -0.035], color: C.sole })
  return m.build({ crease: 60 })
}

function tailGeometry(i) {
  const C = TOBY
  const m = new ModelBuilder()
  const r = 0.055 - i * 0.008
  m.sphere(r, { seg: 7, at: [0, 0, 0.04], color: C.fur })
  m.sphere(r * 0.92, { seg: 7, at: [0, 0.03, 0.1], color: i === 2 ? C.shade : C.fur })
  return m.build({ crease: 60 })
}

/* ── Lola and Bek: a round chibi head, hair, a smile ───────────────────── */

function personHead(who) {
  const C = PEOPLE[who]
  const m = new ModelBuilder()
  m.sphere(0.26, { seg: 18, color: C.skin, scale: [1.02, 0.96, 1] })
  // ears at the sides
  for (const sx of [-1, 1]) m.sphere(0.055, { seg: 8, at: [sx * 0.255, -0.01, 0.0], scale: [0.6, 1, 0.8], color: C.skin })
  // nose, cheeks, smile, brows
  m.sphere(0.028, { seg: 7, at: [0, -0.04, -0.258], color: C.skin })
  for (const sx of [-1, 1]) {
    m.sphere(0.045, { seg: 8, at: [sx * 0.15, -0.075, -0.205], scale: [1, 0.6, 0.5], color: C.blush })
    m.box(0.075, 0.016, 0.02, { at: [sx * 0.092, 0.115, -0.245], rot: [0, 0, sx * -0.12], color: C.hair })
    m.sphere(0.014, { seg: 5, at: [sx * 0.092 + 0.012, 0.05, -0.262], color: C.white })
  }
  m.torus(0.045, 0.011, { radial: 3, tubular: 10, arc: Math.PI, at: [0, -0.085, -0.245], rot: [0, 0, Math.PI], color: C.lips })
  if (who === 'lola') {
    // a soft bob of dark hair with a side parting, a fringe and two braids
    m.sphere(0.278, { seg: 18, at: [0, 0.045, 0.02], scale: [1.04, 0.92, 1.0], color: C.hair })
    m.sphere(0.2, { seg: 12, at: [0.07, 0.17, -0.12], scale: [1.2, 0.5, 0.7], color: C.hair })
    m.sphere(0.16, { seg: 12, at: [-0.11, 0.15, -0.14], scale: [1.1, 0.5, 0.65], color: C.hair })
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 4; i++) m.sphere(0.052 - i * 0.004, { seg: 7, at: [sx * 0.2, -0.12 - i * 0.075, 0.13 + i * 0.01], color: C.hair })
      m.sphere(0.03, { seg: 6, at: [sx * 0.2, -0.43, 0.15], color: '#D94A5A' })
    }
  } else {
    // short neat hair with a little quiff
    m.sphere(0.272, { seg: 18, at: [0, 0.06, 0.03], scale: [1.03, 0.86, 1.0], color: C.hair })
    m.sphere(0.12, { seg: 10, at: [0.05, 0.25, -0.16], scale: [1.4, 0.6, 0.9], color: C.hair })
  }
  return m.build({ crease: 50 })
}

/* ── outfits (one merged mesh on the head pivot) ──────────────────────── */

function outfitGeometry(name) {
  const m = new ModelBuilder()
  if (name === 'cap') {
    m.sphere(0.26, { seg: 14, at: [0, 0.07, 0.01], scale: [1.08, 0.62, 1.04], color: '#E5484D' })
    m.cyl(0.2, 0.2, 0.02, { seg: 14, at: [0, 0.1, -0.24], scale: [1, 1, 0.85], color: '#B91C1C' })
    m.sphere(0.03, { seg: 6, at: [0, 0.24, 0.01], color: '#B91C1C' })
  } else if (name === 'doppi') {
    // a four-sided skullcap, black with white "qalampir" marks
    m.cyl(0.215, 0.24, 0.13, { seg: 4, at: [0, 0.235, 0.02], rot: [0, Math.PI / 4, 0], color: '#16161D' })
    m.cyl(0.17, 0.215, 0.06, { seg: 4, at: [0, 0.32, 0.02], rot: [0, Math.PI / 4, 0], color: '#16161D' })
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU
      m.sphere(0.04, { seg: 6, at: [Math.sin(a) * 0.205, 0.235, 0.02 + Math.cos(a) * 0.205], scale: [1, 1.6, 0.4], rot: [0, a, 0], color: '#F6EBD9' })
    }
  } else if (name === 'crown') {
    m.cyl(0.17, 0.17, 0.08, { seg: 14, at: [0, 0.27, 0.02], color: '#F5B14C', open: false })
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU
      m.cone(0.04, 0.09, { seg: 5, at: [Math.sin(a) * 0.15, 0.35, 0.02 + Math.cos(a) * 0.15], color: '#F5B14C' })
    }
    m.sphere(0.028, { seg: 6, at: [0, 0.28, -0.17], color: '#D94A5A' })
  } else if (name === 'bow') {
    m.sphere(0.07, { seg: 8, at: [0.13, 0.22, -0.02], scale: [1.2, 0.8, 0.5], rot: [0, 0, 0.5], color: '#F472B6' })
    m.sphere(0.07, { seg: 8, at: [0.25, 0.27, -0.02], scale: [1.2, 0.8, 0.5], rot: [0, 0, 0.5], color: '#F472B6' })
    m.sphere(0.035, { seg: 6, at: [0.19, 0.245, -0.04], color: '#DB2777' })
  } else if (name === 'glasses') {
    for (const sx of [-1, 1]) m.torus(0.06, 0.012, { radial: 5, tubular: 14, at: [sx * 0.092, 0.035, -0.272], color: '#1F2937' })
    m.box(0.07, 0.014, 0.014, { at: [0, 0.045, -0.275], color: '#1F2937' })
  } else if (name === 'headphones') {
    m.torus(0.28, 0.022, { radial: 5, tubular: 18, arc: Math.PI, at: [0, 0.02, 0.02], rot: [0, Math.PI / 2, 0], color: '#2E5AAC' })
    for (const sx of [-1, 1]) m.cyl(0.07, 0.07, 0.06, { seg: 12, at: [sx * 0.27, 0.0, 0.02], rot: [0, 0, Math.PI / 2], color: '#2BB3C0' })
  } else if (name === 'scarf') {
    m.torus(0.15, 0.045, { radial: 6, tubular: 16, at: [0, -0.24, 0], rot: [Math.PI / 2, 0, 0], color: '#2BB3C0' })
    m.box(0.07, 0.16, 0.03, { at: [0.08, -0.33, -0.15], rot: [0.2, 0, 0.15], color: '#2BB3C0' })
  }
  return m.empty ? null : m.build({ crease: 45 })
}

/* three little saffron stars circling the head after a crash */
function starsGeometry() {
  const m = new ModelBuilder()
  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * TAU
    const cx = Math.cos(a) * 0.3
    const cz = Math.sin(a) * 0.3
    const P = []
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * TAU
      const a1 = ((i + 1) / 10) * TAU
      const r0 = i % 2 ? 0.03 : 0.07
      const r1 = i % 2 ? 0.07 : 0.03
      P.push(cx, 0.36, cz, cx + Math.cos(a0) * r0, 0.36 + Math.sin(a0) * r0, cz, cx + Math.cos(a1) * r1, 0.36 + Math.sin(a1) * r1, cz)
    }
    m.tris(P, { color: '#F5B14C', twoSided: true })
  }
  return m.build({ crease: 10 })
}

export const TOBY_OUTFITS = OUTFITS

export function buildToby({ outfit = '', castShadow = true, who = 'toby' } = {}) {
  const human = who === 'lola' || who === 'bek'
  const C = human ? PEOPLE[who] : TOBY
  const fur = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.82, metalness: 0 })
  const eyeMat = new MeshPhysicalMaterial({ color: '#1F2937', roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 })
  const mesh = (geo, mat = fur) => {
    const o = new Mesh(geo, mat)
    o.castShadow = castShadow
    return o
  }

  const root = new Group()
  root.name = who
  const spin = new Group()             // rolls and falls turn around the middle
  spin.position.y = 0.42
  root.add(spin)
  const body = new Group()             // the hips pivot
  body.position.y = -0.12
  spin.add(body)
  body.add(mesh(torsoGeometry(C)))

  const neck = new Group()
  neck.position.set(0, 0.36, 0)
  body.add(neck)
  const head = new Group()
  head.position.set(0, 0.2, 0)
  neck.add(head)
  head.add(mesh(human ? personHead(who) : tobyHead()))
  head.add(mesh(eyesGeometry(human), eyeMat))
  let ears = null
  if (!human) {
    ears = new Group()
    ears.position.set(0, 0.18, 0)
    ears.add(mesh(tobyEars()))
    head.add(ears)
  }
  const stars = new Mesh(starsGeometry(), new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, emissive: '#F5B14C', emissiveIntensity: 0.6, roughness: 0.4 }))
  stars.visible = false
  head.add(stars)

  const armGeo = armGeometry(C)
  const legGeo = legGeometry(C)
  const arms = [-1, 1].map((sx) => {
    const p = new Group()
    p.position.set(sx * 0.2, 0.27, 0)
    p.add(mesh(armGeo))
    body.add(p)
    return p
  })
  const legs = [-1, 1].map((sx) => {
    const p = new Group()
    p.position.set(sx * 0.095, 0.0, 0.02)
    p.add(mesh(legGeo))
    body.add(p)
    return p
  })
  const tail = []
  if (!human) {
    let parent = body
    for (let i = 0; i < 3; i++) {
      const p = new Group()
      p.position.set(0, i === 0 ? 0.0 : 0.03, i === 0 ? 0.17 : 0.12)
      p.add(mesh(tailGeometry(i)))
      parent.add(p)
      tail.push(p)
      parent = p
    }
  }

  let outfitMesh = null
  let outfitName = ''
  const setOutfit = (name) => {
    if (name === outfitName) return
    if (outfitMesh) {
      outfitMesh.parent?.remove(outfitMesh)
      outfitMesh.geometry.dispose()
      outfitMesh = null
    }
    outfitName = OUTFITS.includes(name) ? name : ''
    const geo = outfitName ? outfitGeometry(outfitName) : null
    if (geo) {
      outfitMesh = mesh(geo)
      head.add(outfitMesh)
    }
  }
  setOutfit(outfit)

  let phase = 0
  let time = 0
  const pose = { lean: 0, legL: 0, legR: 0, armLx: 0, armRx: 0, armLz: 0.15, armRz: -0.15, bob: 0, sx: 1, sy: 1, spin: 0, yaw: 0, tilt: 0, roll: 0, ear: 0 }

  function update(dt, { state = 'idle', t = 0, speed = 0 } = {}) {
    time += dt
    const run = state === 'run'
    phase += dt * TAU * (2.2 + 0.08 * speed) * (run ? 1 : 0.35)
    const s = Math.sin(phase)
    // goals for this state
    let lean = 0, legL = 0, legR = 0, armLx = 0, armRx = 0, armLz = 0.18, armRz = -0.18, bob = 0, sx = 1, sy = 1
    let spinX = 0, yaw = 0, tilt = 0, roll = 0, ear = 0, k = 14
    if (state === 'run') {
      legL = s * 0.61; legR = -s * 0.61
      armLx = -s * 0.7; armRx = s * 0.7
      bob = Math.abs(Math.cos(phase)) * 0.04
      lean = 0.12
      ear = 0.12
    } else if (state === 'jump') {
      // squash on take-off, stretch on the way up, tucked at the apex
      if (t < 0.09) { sy = 0.9; sx = 1.06 } else if (t < 0.22) { sy = 1.1; sx = 0.95 } else { sy = 1; sx = 1 }
      const tuck = clamp((t - 0.18) / 0.14)
      legL = 0.55 + tuck * 0.65; legR = 0.35 + tuck * 0.75; armLz = 1.1; armRz = -1.1; armLx = -0.4; armRx = -0.4; lean = 0.05
      ear = -0.15
    } else if (state === 'fall') {
      legL = 0.35; legR = 0.2; armLz = 1.3; armRz = -1.3; lean = -0.05; ear = -0.25
    } else if (state === 'roll') {
      spinX = -TAU * clamp(t / 0.6); k = 60
      legL = 1.6; legR = 1.6; armLx = 1.2; armRx = 1.2; sx = 0.9; sy = 0.8
      ear = 1.15
    } else if (state === 'land') {
      sy = 0.85; sx = 1.08; legL = 0.2; legR = 0.2; ear = 0.3
    } else if (state === 'stumble') {
      roll = Math.sin(t * 34) * 0.28 * (1 - clamp(t / 0.3)); armLz = 1.4; armRz = -0.6; legL = 0.4; ear = 0.5
    } else if (state === 'ride') {
      armRz = -2.75; armRx = 0.15; armLz = 0.5
      legL = Math.sin(time * 2.1) * 0.35 + 0.2; legR = -Math.sin(time * 2.1) * 0.35 + 0.2
      roll = Math.sin(time * 1.3) * 0.06; yaw = Math.sin(time * 0.7) * 0.15
      ear = Math.sin(time * 2.6) * 0.12
    } else if (state === 'cheer') {
      armLz = 2.55 + Math.sin(time * 14) * 0.2; armRz = -2.55 - Math.sin(time * 14) * 0.2
      bob = Math.abs(Math.sin(time * 9)) * 0.08; legL = 0.2; legR = 0.2
      ear = -0.25
    } else if (state === 'crash') {
      spinX = 1.25 * clamp(t / 0.35); k = 18
      armLz = 2.2; armRz = -2.2; legL = 1.1; legR = 0.8; bob = -0.12 * clamp(t / 0.35)
      ear = 0.6
    } else if (state === 'stand') {
      spinX = 1.25 * (1 - clamp(t / 0.4)); armLz = 1.2; armRz = -1.2
    } else {
      // idle: breathes, looks around, an ear twitch now and then
      bob = Math.sin(time * 2.2) * 0.006
      yaw = Math.sin(time * 0.55) * 0.35
      tilt = Math.sin(time * 0.8) * 0.06
      armLz = 0.2; armRz = -0.2
      ear = (time % 5.3) < 0.18 ? 0.35 : 0
    }
    const P = pose
    P.lean = damp(P.lean, lean, k, dt)
    P.legL = damp(P.legL, legL, k, dt); P.legR = damp(P.legR, legR, k, dt)
    P.armLx = damp(P.armLx, armLx, k, dt); P.armRx = damp(P.armRx, armRx, k, dt)
    P.armLz = damp(P.armLz, armLz, k, dt); P.armRz = damp(P.armRz, armRz, k, dt)
    P.bob = damp(P.bob, bob, 20, dt)
    P.sx = damp(P.sx, sx, 22, dt); P.sy = damp(P.sy, sy, 22, dt)
    P.spin = state === 'roll' ? spinX : damp(P.spin, spinX, k, dt)
    P.yaw = damp(P.yaw, yaw, 6, dt); P.tilt = damp(P.tilt, tilt, 6, dt); P.roll = damp(P.roll, roll, 16, dt)
    P.ear = damp(P.ear, ear, 18, dt)

    spin.rotation.set(P.spin, 0, P.roll)
    spin.position.y = 0.42 + P.bob
    spin.scale.set(P.sx, P.sy, P.sx)
    body.rotation.x = -P.lean
    legs[0].rotation.x = P.legL
    legs[1].rotation.x = P.legR
    arms[0].rotation.set(P.armLx, 0, P.armLz)
    arms[1].rotation.set(P.armRx, 0, P.armRz)
    head.rotation.set(P.lean * 0.6 + (run ? Math.sin(phase * 2) * 0.03 : 0), P.yaw, P.tilt)
    if (ears) ears.rotation.x = P.ear
    const wag = run ? 0.35 : 0.22
    for (let i = 0; i < tail.length; i++) {
      tail[i].rotation.x = -0.45 - i * 0.18
      tail[i].rotation.y = Math.sin(time * (run ? 7 : 2.4) - i * 0.9) * wag
    }
    const dizzy = state === 'crash' && t > 0.25
    stars.visible = dizzy
    if (dizzy) stars.rotation.y = time * 4.2
  }

  function dispose() {
    root.traverse((o) => { if (o.isMesh) o.geometry.dispose() })
    fur.dispose()
    eyeMat.dispose()
    stars.material.dispose()
  }

  update(0, { state: 'idle' })
  return { root, setOutfit, update, dispose, who, get outfit() { return outfitName } }
}
