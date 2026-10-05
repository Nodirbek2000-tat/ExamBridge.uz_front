/*
 * TOBY RUN — the world around the track (RUNNER_PLAN §B1, §B9.1 world.js): a loop of four
 * Tashkent-inspired biomes in a minimal "toy diorama" style, the far skyline, the tunnel portals and
 * the Bekat set. Everything is instanced and refilled each frame from the engine's distance in 6 m
 * slots (no allocation while running); a slot's biome is biomes.biomeKeyAt(track, s).
 *
 *   metro     a ganch-carved vault with ribs, majolica dado, marble walkways, columns, chandeliers
 *   bozor     striped stalls with melon / pomegranate piles, a tiled arcade, lanterns
 *   xiyobon   chinar trees, hedges, benches, fountains, a pigeon flock that scatters as Toby comes
 *   shahar    facades with lit windows, festoon lights along the pavements, street lamps, planters
 *   skyline   one band far away: TV tower, a market dome, portals, blocks (domes / portals only here)
 *   Bekat     a street platform with a canopy, or a platform inside the vault (metro)
 *
 * Respect rules: no bread underfoot, no religious buildings as props (domes / portals far away only),
 * no flags, emblems or real brands; the signs are generic Latin text.
 */
import {
  BackSide, CanvasTexture, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, Shape, ShapeGeometry, SphereGeometry,
} from 'three'
import { InstancedBatch, colorOf } from '../../../../games/three/instancing'
import { ModelBuilder } from '../../../../games/three/primitives'
import { facadeMaterial, facadeTextures, unitBoxOnGround } from '../../../../games/three/facade'
import { glowMaterial, vertexMaterial } from '../../../../games/three/materials'
import { canvasTexture, radialTexture } from '../../../../games/three/textures'
import { hash, seeded } from '../../../../games/three/random'
import { ornamentTile } from '../../../../games/three/ornaments'
import { BIOMES } from '../engine/track.js'
import { BIOME_TITLES } from '../content'
import { AtlasBuilder } from './kit'
import { BIOME_LOOK, biomeKeyAt } from './biomes'

const BACK = 16
const AHEAD = 132
const SLOT = 6
const VAULT_R = 6.35
const VAULT_Y = 2.6
const WALL_X = 6.3
const PLATFORM_SPAN = [-15, 23]          // metres around a station's stop kept clear on the platform side
const zOf = (s, dist) => -(s - dist)

/* ── geometry ───────────────────────────────────────────────────────────── */

function ribGeometry() {
  const m = new ModelBuilder()
  m.torus(5.98, 0.2, { radial: 6, tubular: 24, arc: Math.PI, at: [0, VAULT_Y, 0], color: '#efe6d6' })
  m.torus(5.8, 0.06, { radial: 4, tubular: 24, arc: Math.PI, at: [0, VAULT_Y, 0.02], color: '#2BB3C0' })
  for (const x of [-6.02, 6.02]) {
    m.box(0.46, VAULT_Y, 0.46, { at: [x, VAULT_Y / 2, 0], color: '#e7dccb' })
    m.box(0.56, 0.16, 0.56, { at: [x, VAULT_Y - 0.05, 0], color: '#D9982E' })
  }
  return m.build({ crease: 40 })
}

function columnGeometry() {
  const m = new ModelBuilder()
  m.box(0.82, 0.32, 0.82, { at: [0, 0.16, 0], color: '#d9cdb8' })
  m.cyl(0.36, 0.4, 0.22, { seg: 8, at: [0, 0.42, 0], color: '#efe6d6' })
  m.cyl(0.26, 0.29, 4.6, { seg: 8, at: [0, 2.83, 0], color: '#f4ede1' })
  for (const y of [1.25, 4.4]) m.torus(0.28, 0.045, { radial: 4, tubular: 12, at: [0, y, 0], rot: [Math.PI / 2, 0, 0], color: '#D9982E' })
  m.cyl(0.52, 0.28, 0.62, { seg: 8, at: [0, 5.44, 0], color: '#efe6d6' })
  m.box(1.08, 0.2, 1.08, { at: [0, 5.84, 0], color: '#D9982E' })
  return m.build({ crease: 30 })
}

// it hangs high, close under the vault: the So'z shari balloon (≈ 6.2–7.6 m over the middle lane) and the
// riding camera (≈ 7 m) pass under it, never through it
const CH = 0.95
function chandelierGeometry() {
  const m = new ModelBuilder()
  m.cyl(0.025, 0.025, 0.6, { seg: 4, at: [0, 8.65, 0], color: '#8a6a2a' })
  m.cyl(0.18, 0.06, 0.2, { seg: 10, at: [0, 7.5 + CH, 0], color: '#D9982E' })
  m.torus(0.78, 0.05, { radial: 5, tubular: 24, at: [0, 7.15 + CH, 0], rot: [Math.PI / 2, 0, 0], color: '#D9982E' })
  m.torus(0.46, 0.04, { radial: 5, tubular: 18, at: [0, 7.4 + CH, 0], rot: [Math.PI / 2, 0, 0], color: '#D9982E' })
  m.sphere(0.2, { seg: 10, at: [0, 7.05 + CH, 0], scale: [1, 1.3, 1], color: '#e9d39a' })
  m.sphere(0.07, { seg: 6, at: [0, 6.72 + CH, 0], color: '#D9982E' })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    const x = Math.cos(a) * 0.78
    const z = Math.sin(a) * 0.78
    m.cyl(0.035, 0.035, 0.16, { seg: 5, at: [x, 7.25 + CH, z], color: '#fff6e0' })
    m.sphere(0.05, { seg: 5, at: [x * 1.02, 6.95 + CH, z * 1.02], scale: [1, 1.6, 1], color: '#cfe8ff' })
  }
  return m.build({ crease: 50 })
}

/* a market stall facing +z: table with a suzani cloth, fruit piles, crates, a striped awning */
function stallGeometry(variant) {
  const b = new AtlasBuilder()
  b.box(2.6, 0.8, 1.4, { at: [0, 0.4, 0], color: '#9c7148' })
  b.box(2.72, 0.06, 1.52, { at: [0, 0.83, 0], cell: 'suzani' })
  for (const x of [-1.3, 1.3]) for (const z of [-0.7, 0.75]) b.cyl(0.05, 0.05, 2.7, { seg: 6, at: [x, 1.35, z], color: '#7b5a3a' })
  // the awning, sloping down toward the front, with a scalloped edge
  b.box(3.0, 0.06, 2.1, { at: [0, 2.55, 0.25], rot: [0.22, 0, 0], cell: 'awning' })
  for (let i = 0; i < 8; i++) b.cyl(0.19, 0.19, 0.04, { seg: 10, start: 0, arc: Math.PI, at: [-1.31 + i * 0.375, 2.28, 1.28], rot: [Math.PI / 2, 0, 0], color: i % 2 ? '#F6EBD9' : '#2BB3C0' })
  const rnd = seeded(variant ? 31 : 17)
  if (variant === 0) {
    // melons and watermelons
    for (let i = 0; i < 9; i++) {
      const x = -1.05 + (i % 5) * 0.52 + (i > 4 ? 0.26 : 0)
      const y = i > 4 ? 1.2 : 0.99
      const z = i > 4 ? -0.05 : (rnd() - 0.5) * 0.3
      if (i % 3 === 0) b.sphere(0.26, { seg: 10, at: [x, y, z], scale: [1, 0.9, 1], color: '#2f6b3a' })
      else b.sphere(0.21, { seg: 10, at: [x, y, z], scale: [1.35, 0.85, 0.9], color: '#E8C35A' })
    }
  } else {
    // pomegranates, apricots and grapes in shallow baskets
    for (let k = 0; k < 3; k++) {
      const cx = -0.85 + k * 0.85
      b.cyl(0.38, 0.3, 0.12, { seg: 12, at: [cx, 0.92, 0], color: '#c49a5c' })
      const col = k === 0 ? '#C8323F' : k === 1 ? '#F2A23A' : '#6A3F7A'
      const r = k === 0 ? 0.11 : k === 1 ? 0.075 : 0.06
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        const rr = i === 0 ? 0 : 0.2
        b.sphere(r, { seg: 7, at: [cx + Math.cos(a) * rr * (i ? 1 : 0), 1.04 + (i ? 0 : 0.08), Math.sin(a) * rr * (i ? 1 : 0)], color: col })
      }
      if (k === 0) b.cone(0.03, 0.06, { seg: 5, at: [cx, 1.2, 0], color: '#8c2430' })
    }
  }
  // crates in front
  for (const x of [-0.75, 0.75]) {
    b.box(0.7, 0.42, 0.5, { at: [x, 0.21, 1.05], color: '#b98b57' })
    b.box(0.72, 0.05, 0.52, { at: [x, 0.3, 1.05], color: '#8d6438' })
    for (let i = 0; i < 4; i++) b.sphere(0.1, { seg: 6, at: [x - 0.22 + i * 0.15, 0.46, 1.05], color: variant ? '#F2A23A' : '#9BC24A' })
  }
  return b.build({ crease: 40 })
}

/* the bozor arcade: a long low building with arched niches and a majolica band, front at +z */
function arcadeGeometry() {
  const b = new AtlasBuilder()
  const L = 12
  b.box(L, 5.2, 4, { at: [0, 2.6, 0], color: '#E9D9BE' })
  b.box(L + 0.2, 0.45, 4.2, { at: [0, 5.35, 0], color: '#d9c4a2' })
  for (let i = 0; i < 17; i++) b.plane(0.7, 0.7, { at: [-L / 2 + 0.35 + i * 0.7058, 4.55, 2.012], cell: 'tile' })
  for (let i = 0; i < 3; i++) {
    const x = -4 + i * 4
    b.box(2.4, 2.6, 0.1, { at: [x, 1.3, 2.0], color: '#3d2f26' })
    b.cyl(1.2, 1.2, 0.1, { seg: 14, start: -Math.PI / 2, arc: Math.PI, at: [x, 2.6, 2.0], rot: [Math.PI / 2, 0, 0], color: '#3d2f26' })
    b.torus(1.32, 0.09, { radial: 4, tubular: 14, arc: Math.PI, at: [x, 2.6, 2.03], color: '#2BB3C0' })
    for (const sx of [-1.32, 1.32]) b.box(0.18, 2.6, 0.08, { at: [x + sx, 1.3, 2.03], color: '#2BB3C0' })
    // a warm shop light inside
    b.box(1.6, 0.9, 0.04, { at: [x, 1.3, 2.06], color: '#f1c27a' })
  }
  // small domes on the roof line (market roofs, plain)
  for (const x of [-4, 4]) b.sphere(1.0, { seg: 12, theta: Math.PI / 2, at: [x, 5.55, -0.4], color: '#d9c4a2' })
  return b.build({ crease: 40 })
}

function lanternGeometry() {
  const m = new ModelBuilder()
  m.cyl(0.07, 0.1, 3.4, { seg: 7, at: [0, 1.7, 0], color: '#23262f' })
  m.box(0.34, 0.12, 0.34, { at: [0, 3.42, 0], color: '#23262f' })
  m.cyl(0.13, 0.17, 0.42, { seg: 6, at: [0, 3.68, 0], color: '#f7e2b2' })
  m.cone(0.24, 0.24, { seg: 6, at: [0, 4.0, 0], color: '#23262f' })
  m.sphere(0.05, { seg: 5, at: [0, 4.15, 0], color: '#D9982E' })
  return m.build({ crease: 40 })
}

function streetLampGeometry() {
  const m = new ModelBuilder()
  m.cyl(0.06, 0.09, 4.6, { seg: 6, at: [0, 2.3, 0], color: '#2d3240' })
  m.box(1.0, 0.08, 0.08, { at: [-0.46, 4.55, 0], color: '#2d3240' })
  m.box(0.46, 0.1, 0.26, { at: [-0.86, 4.5, 0], color: '#2d3240' })
  return m.build({ crease: 40 })
}

function chinarGeometry(seed) {
  const m = new ModelBuilder()
  const rnd = seeded(seed)
  m.cyl(0.26, 0.4, 3.6, { seg: 8, at: [0, 1.8, 0], color: '#cdbb9b' })
  m.beam([0, 3.2, 0], [0.9, 4.6, 0.2], 0.16, { color: '#c4b190' })
  m.beam([0, 3.4, 0], [-0.8, 4.9, -0.3], 0.15, { color: '#c4b190' })
  const greens = ['#5E8F45', '#6FA04F', '#4F7F3C', '#7BAE58']
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2
    const r = 0.9 + rnd() * 1.1
    m.blob(1.05 + rnd() * 0.7, { at: [Math.cos(a) * r, 4.7 + rnd() * 1.8, Math.sin(a) * r], color: greens[i % greens.length], seed: seed + i * 3 })
  }
  m.blob(1.5, { at: [0, 6.3, 0], color: greens[1], seed: seed + 40 })
  return m.build({ crease: 80 })
}

function hedgeGeometry() {
  const m = new ModelBuilder()
  for (let i = 0; i < 6; i++) m.blob(0.56, { at: [0, 0.42, -2.5 + i], scale: [0.85, 0.8, 1.1], color: i % 2 ? '#4f8a43' : '#5b9a4b', seed: 50 + i, detail: 1 })
  return m.build({ crease: 80 })
}

function parkBenchGeometry() {
  const m = new ModelBuilder()
  for (const z of [-0.85, 0.85]) {
    m.box(0.08, 0.45, 0.5, { at: [0, 0.22, z], color: '#2b2f3a' })
    m.box(0.08, 0.5, 0.08, { at: [-0.22, 0.7, z], color: '#2b2f3a' })
  }
  for (let i = 0; i < 3; i++) m.box(0.12, 0.05, 2.0, { at: [0.12 - i * 0.14, 0.48, 0], color: '#b07a4a' })
  for (let i = 0; i < 2; i++) m.box(0.05, 0.12, 2.0, { at: [-0.24, 0.72 + i * 0.17, 0], color: '#b07a4a' })
  return m.build({ crease: 30 })
}

function fountainGeometry() {
  const b = new AtlasBuilder()
  b.cyl(1.9, 2.0, 0.55, { seg: 24, at: [0, 0.27, 0], cell: 'tile' })
  b.cyl(2.0, 2.0, 0.08, { seg: 24, at: [0, 0.57, 0], color: '#efe6d6' })
  b.cyl(1.75, 1.75, 0.04, { seg: 24, at: [0, 0.5, 0], color: '#7fcfe0' })
  b.cyl(0.18, 0.26, 1.1, { seg: 10, at: [0, 0.9, 0], color: '#efe6d6' })
  b.cyl(0.75, 0.25, 0.25, { seg: 16, at: [0, 1.5, 0], color: '#efe6d6' })
  b.cyl(0.66, 0.66, 0.03, { seg: 16, at: [0, 1.61, 0], color: '#8fd8e6' })
  return b.build({ crease: 40 })
}

function jetGeometry() {
  const m = new ModelBuilder()
  m.cone(0.12, 1.4, { seg: 8, at: [0, 2.3, 0], color: '#ffffff' })
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    m.beam([0, 1.65, 0], [Math.cos(a) * 1.4, 0.6, Math.sin(a) * 1.4], 0.035, { color: '#ffffff', seg: 4 })
  }
  return m.build({ crease: 30 })
}

function pigeonGeometry(pose) {
  const m = new ModelBuilder()
  m.sphere(0.12, { seg: 7, at: [0, 0.14, 0], scale: [0.8, 0.85, 1.3], color: '#8a90a0' })
  m.sphere(0.07, { seg: 6, at: [0, 0.25, -0.13], color: '#9aa1b2' })
  m.cone(0.025, 0.06, { seg: 4, at: [0, 0.25, -0.21], rot: [-Math.PI / 2, 0, 0], color: '#e0a640' })
  m.box(0.14, 0.03, 0.12, { at: [0, 0.14, 0.2], color: '#6d7384' })
  if (pose === 'sit') {
    for (const sx of [-1, 1]) m.box(0.04, 0.09, 0.22, { at: [sx * 0.085, 0.16, 0.02], color: '#757b8c' })
  } else {
    const up = pose === 'up' ? 0.5 : -0.35
    for (const sx of [-1, 1]) m.box(0.3, 0.025, 0.16, { at: [sx * 0.2, 0.16 + up * 0.15, 0.02], rot: [0, 0, sx * up], color: '#757b8c' })
  }
  return m.build({ crease: 40 })
}

function planterGeometry() {
  const m = new ModelBuilder()
  m.box(1.0, 0.6, 1.0, { at: [0, 0.3, 0], color: '#3d4252' })
  m.box(1.06, 0.06, 1.06, { at: [0, 0.6, 0], color: '#C9A15A' })
  m.cyl(0.07, 0.09, 1.3, { seg: 6, at: [0, 1.2, 0], color: '#6b5843' })
  m.blob(0.75, { at: [0, 2.2, 0], color: '#3f6f4a', seed: 77 })
  return m.build({ crease: 80 })
}

/* the tunnel mouth: a cream facade with an arch the size of the vault, a girih band and a METRO sign */
function portalGeometry() {
  const b = new AtlasBuilder()
  const D = 1.4
  const top = VAULT_Y + VAULT_R
  b.box(9, 13, D, { at: [-(VAULT_R + 4.5), 6.5, 0], color: '#EFE4D2' })
  b.box(9, 13, D, { at: [VAULT_R + 4.5, 6.5, 0], color: '#EFE4D2' })
  b.box(VAULT_R * 2, 13 - top, D, { at: [0, top + (13 - top) / 2, 0], color: '#EFE4D2' })
  // the spandrels between the arch and its frame
  const sp = new Shape()
  sp.moveTo(-VAULT_R, VAULT_Y)
  sp.lineTo(-VAULT_R, top)
  sp.lineTo(VAULT_R, top)
  sp.lineTo(VAULT_R, VAULT_Y)
  sp.absarc(0, VAULT_Y, VAULT_R, 0, Math.PI, false)
  const spGeo = new ShapeGeometry(sp, 24)
  b.add(spGeo, { at: [0, 0, D / 2], color: '#EFE4D2' })
  const spBack = new ShapeGeometry(sp, 24)
  b.add(spBack, { at: [0, 0, -D / 2], rot: [0, Math.PI, 0], scale: [-1, 1, 1], color: '#EFE4D2' })
  // frame, bands and signs on the front (+z)
  b.torus(VAULT_R + 0.35, 0.32, { radial: 6, tubular: 28, arc: Math.PI, at: [0, VAULT_Y, D / 2 + 0.05], color: '#2E5AAC' })
  b.torus(VAULT_R + 0.82, 0.12, { radial: 4, tubular: 28, arc: Math.PI, at: [0, VAULT_Y, D / 2 + 0.05], color: '#F5B14C' })
  for (const sx of [-1, 1]) {
    b.box(0.64, VAULT_Y, 0.4, { at: [sx * (VAULT_R + 0.35), VAULT_Y / 2, D / 2 + 0.05], color: '#2E5AAC' })
    for (let i = 0; i < 4; i++) b.plane(2.4, 2.4, { at: [sx * (VAULT_R + 2.6), 1.4 + i * 2.4, D / 2 + 0.02], cell: 'tile' })
  }
  for (let i = 0; i < 13; i++) b.plane(1.4, 1.4, { at: [-8.4 + i * 1.4, 10.1, D / 2 + 0.02], cell: 'girih' })
  b.box(30, 0.5, D + 0.3, { at: [0, 13.1, 0], color: '#d9c4a2' })
  const sign = new PlaneGeometry(6.4, 2.9)
  const uv = sign.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setY(i, 0.25 + uv.getY(i) * 0.5)
  b.add(sign, { at: [0, 11.6, D / 2 + 0.04], cell: 'metro' })
  return b.build({ crease: 30 })
}

/* Bekat on a street: raised platform, a lapis canopy on columns with a girih fascia, majolica back wall,
   benches, pots — local x from 4 (track side) to 7.6, z −17…17 */
function streetPlatformGeometry() {
  const b = new AtlasBuilder()
  const L = 34
  b.box(3.6, 0.9, L, { at: [5.8, 0.45, 0], color: '#E3D7C4' })
  b.box(3.7, 0.08, L + 0.2, { at: [5.82, 0.93, 0], color: '#F4EEE4' })
  b.box(0.3, 0.09, L + 0.2, { at: [4.13, 0.94, 0], color: '#F5B14C' })
  b.box(0.36, 0.086, L, { at: [4.6, 0.935, 0], color: '#EAD9B0' })
  // canopy
  for (const z of [-13, -4.5, 4.5, 13]) {
    b.cyl(0.15, 0.17, 3.6, { seg: 10, at: [7.05, 2.75, z], color: '#2E5AAC' })
    b.torus(0.17, 0.04, { radial: 4, tubular: 12, at: [7.05, 4.3, z], rot: [Math.PI / 2, 0, 0], color: '#D9982E' })
    b.box(0.5, 0.12, 0.5, { at: [7.05, 0.99, z], color: '#d9c4a2' })
  }
  b.box(4.6, 0.26, L - 3, { at: [5.95, 4.66, 0], color: '#2E5AAC' })
  b.box(4.7, 0.1, L - 2.8, { at: [5.95, 4.5, 0], color: '#2BB3C0' })
  for (let i = 0; i < 44; i++) {
    b.plane(0.7, 0.7, { at: [3.62, 4.62, -15.05 + i * 0.7], rot: [0, -Math.PI / 2, 0], cell: 'girih' })
  }
  // back wall: majolica panels with a girih band on top
  b.box(0.2, 2.6, L - 4, { at: [7.6, 2.2, 0], color: '#EFE4D2' })
  for (let i = 0; i < 15; i++) {
    b.plane(2.0, 2.0, { at: [7.48, 2.0, -14 + i * 2.0], rot: [0, -Math.PI / 2, 0], cell: 'tile' })
  }
  for (let i = 0; i < 71; i++) b.plane(0.42, 0.42, { at: [7.48, 3.25, -14.79 + i * 0.42], rot: [0, -Math.PI / 2, 0], cell: 'girih' })
  // benches and pots
  for (const z of [-7.5, 7.5]) {
    b.box(0.5, 0.08, 2.2, { at: [6.85, 1.38, z], color: '#a8743f' })
    b.box(0.08, 0.5, 2.2, { at: [7.12, 1.7, z], color: '#a8743f' })
    for (const dz of [-0.95, 0.95]) b.box(0.42, 0.45, 0.08, { at: [6.85, 1.15, z + dz], color: '#2b2f3a' })
  }
  for (const z of [-15.5, 15.5, 0]) {
    b.cyl(0.36, 0.26, 0.6, { seg: 12, at: [6.9, 1.27, z], color: '#2BB3C0' })
    b.blob(0.5, { at: [6.9, 1.85, z], color: '#4f8a43', seed: 9 })
  }
  return b.build({ crease: 40 })
}

/* Bekat inside the vault: a marble platform against the majolica wall, benches */
function metroPlatformGeometry() {
  const b = new AtlasBuilder()
  const L = 34
  b.box(2.3, 0.9, L, { at: [5.15, 0.45, 0], color: '#E3D7C4' })
  b.box(2.4, 0.08, L + 0.2, { at: [5.17, 0.93, 0], color: '#F4EEE4' })
  b.box(0.3, 0.09, L + 0.2, { at: [4.13, 0.94, 0], color: '#F5B14C' })
  for (const z of [-9, 3]) {
    b.box(0.5, 0.08, 2.2, { at: [5.75, 1.38, z], color: '#a8743f' })
    b.box(0.08, 0.5, 2.2, { at: [6.02, 1.7, z], color: '#a8743f' })
    for (const dz of [-0.95, 0.95]) b.box(0.42, 0.45, 0.08, { at: [5.75, 1.15, z + dz], color: '#2b2f3a' })
  }
  return b.build({ crease: 40 })
}

/* the hanging station sign: "BEKAT" and where the line goes next */
function signCanvas(c, next) {
  const g = c.getContext('2d')
  const w = c.width
  const h = c.height
  g.clearRect(0, 0, w, h)
  g.fillStyle = '#16224A'
  g.beginPath()
  if (g.roundRect) g.roundRect(4, 4, w - 8, h - 8, 26); else g.rect(4, 4, w - 8, h - 8)
  g.fill()
  g.fillStyle = '#F5B14C'
  g.beginPath(); g.arc(70, h / 2, 42, 0, Math.PI * 2); g.fill()
  g.fillStyle = '#16224A'
  g.font = '900 54px Inter, "Segoe UI", Arial, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('B', 70, h / 2 + 3)
  g.textAlign = 'left'
  g.fillStyle = '#F6EBD9'
  g.font = '800 58px Inter, "Segoe UI", Arial, sans-serif'
  g.fillText('BEKAT', 132, h / 2 - 22)
  g.fillStyle = '#2BB3C0'
  g.font = '700 34px Inter, "Segoe UI", Arial, sans-serif'
  g.fillText(`→ ${next}`, 134, h / 2 + 30)
}

/* the far skyline: white silhouettes (tinted by the material) — TV tower, market domes, portals, blocks */
function skylineTexture() {
  return canvasTexture(2048, 256, (g, w, h) => {
    const rnd = seeded(41)
    g.clearRect(0, 0, w, h)
    const base = h - 18
    // far layer: soft hills and tree clumps
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.beginPath()
    g.moveTo(0, h)
    for (let x = 0; x <= w; x += 16) g.lineTo(x, base - 22 - Math.sin(x * 0.006) * 10 - rnd() * 8)
    g.lineTo(w, h)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.62)'
    for (let i = 0; i < 46; i++) {
      const x = rnd() * w
      const bw = 26 + rnd() * 50
      const bh = 26 + rnd() * 52
      g.fillRect(x, base - bh, bw, bh + 20)
    }
    // near layer: crisp silhouettes
    g.fillStyle = '#ffffff'
    const block = (x, bw, bh) => g.fillRect(x, base - bh, bw, bh + 20)
    for (let i = 0; i < 30; i++) block(rnd() * w, 30 + rnd() * 46, 20 + rnd() * 36)
    // a market dome on a drum, with small domes beside it
    const dome = (cx, r, drum) => {
      g.fillRect(cx - r * 1.05, base - drum, r * 2.1, drum + 20)
      g.beginPath(); g.ellipse(cx, base - drum, r, r * 0.86, 0, Math.PI, 0); g.fill()
    }
    dome(520, 62, 26)
    dome(430, 26, 18); dome(612, 26, 18); dome(380, 18, 14)
    // portals (pishtaq): a tall frame with the arch cut out
    const portal = (cx, pw, ph) => {
      g.fillRect(cx - pw / 2, base - ph, pw, ph + 20)
      g.globalCompositeOperation = 'destination-out'
      g.beginPath()
      g.moveTo(cx - pw * 0.28, base)
      g.lineTo(cx - pw * 0.28, base - ph * 0.55)
      g.quadraticCurveTo(cx - pw * 0.28, base - ph * 0.82, cx, base - ph * 0.86)
      g.quadraticCurveTo(cx + pw * 0.28, base - ph * 0.82, cx + pw * 0.28, base - ph * 0.55)
      g.lineTo(cx + pw * 0.28, base)
      g.fill()
      g.globalCompositeOperation = 'source-over'
    }
    portal(760, 84, 98)
    portal(250, 64, 74)
    // the TV tower: tripod legs, a long shaft, a pod and a needle
    const tx = 1180
    g.beginPath()
    g.moveTo(tx - 34, base + 2); g.lineTo(tx - 6, base - 70); g.lineTo(tx + 6, base - 70); g.lineTo(tx + 34, base + 2); g.lineTo(tx + 22, base + 2); g.lineTo(tx, base - 40); g.lineTo(tx - 22, base + 2)
    g.closePath(); g.fill()
    g.fillRect(tx - 5, base - 196, 10, 130)
    g.beginPath(); g.ellipse(tx, base - 150, 22, 9, 0, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.ellipse(tx, base - 112, 14, 6, 0, 0, Math.PI * 2); g.fill()
    g.fillRect(tx - 2, base - 236, 4, 44)
    // modern towers on the right
    for (const [x, bw, bh] of [[1460, 46, 120], [1520, 38, 92], [1600, 54, 140], [1690, 40, 104], [1760, 60, 82], [1860, 44, 126], [1930, 70, 70]]) {
      block(x, bw, bh)
      g.fillRect(x + bw / 2 - 2, base - bh - 16, 4, 16)
    }
    // chinar clumps on the left
    for (let i = 0; i < 16; i++) {
      const x = 20 + i * 12 + rnd() * 20
      g.beginPath(); g.arc(x, base - 30 - rnd() * 18, 18 + rnd() * 12, 0, Math.PI * 2); g.fill()
    }
  }, { mipmaps: true })
}

/* ── the world ──────────────────────────────────────────────────────────── */

export class World {
  constructor(stage, kit) {
    const scene = stage.scene
    this.stage = stage
    const atlasMat = kit.atlasMaterial({ roughness: 0.78 })
    const vmat = (o) => vertexMaterial(o)
    const add = (b) => { scene.add(b); this.batches.push(b); return b }
    this.batches = []

    // metro
    const vaultTex = new CanvasTexture(ornamentTile('ganch'))
    vaultTex.colorSpace = SRGBColorSpace
    vaultTex.wrapS = RepeatWrapping
    vaultTex.wrapT = RepeatWrapping
    vaultTex.repeat.set(7, 2.4)
    vaultTex.anisotropy = 8
    stage.track(vaultTex)
    const vault = new CylinderGeometry(VAULT_R, VAULT_R, SLOT + 0.02, 26, 1, true, -Math.PI / 2, Math.PI)
    vault.rotateX(-Math.PI / 2)
    vault.translate(0, VAULT_Y, 0)
    this.vault = add(new InstancedBatch(vault, new MeshStandardMaterial({ map: vaultTex, color: '#f3ead9', roughness: 0.92, side: BackSide }), 30))
    this.ribs = add(new InstancedBatch(ribGeometry(), vmat({ roughness: 0.6 }), 30))
    this.walls = add(new InstancedBatch(new PlaneGeometry(SLOT, VAULT_Y), kit.tileMaterial('tile', 1.3, 'xy', { roughness: 0.35 }), 60))
    this.walks = add(new InstancedBatch(new PlaneGeometry(1.94, SLOT).rotateX(-Math.PI / 2), kit.tileMaterial('marble', 2.4, 'xz', { roughness: 0.3 }), 60, { receiveShadow: true }))
    this.columns = add(new InstancedBatch(columnGeometry(), vmat({ roughness: 0.35 }), 30, { castShadow: true }))
    this.chandeliers = add(new InstancedBatch(chandelierGeometry(), vmat({ roughness: 0.3, metalness: 0.55 }), 14))
    this.portals = add(new InstancedBatch(portalGeometry(), kit.atlasMaterial({ roughness: 0.8 }), 3, { receiveShadow: true }))

    // bozor
    this.stalls = [0, 1].map(v => add(new InstancedBatch(stallGeometry(v), atlasMat, 16, { castShadow: true, receiveShadow: true })))
    this.arcades = add(new InstancedBatch(arcadeGeometry(), atlasMat, 28, { receiveShadow: true }))
    this.lanterns = add(new InstancedBatch(lanternGeometry(), vmat({ roughness: 0.5 }), 30))

    // xiyobon
    this.chinars = [3, 8].map(seed => add(new InstancedBatch(chinarGeometry(seed), vmat({ roughness: 0.9 }), 24, { castShadow: true })))
    this.hedges = add(new InstancedBatch(hedgeGeometry(), vmat({ roughness: 0.95 }), 52, { receiveShadow: true }))
    this.benches = add(new InstancedBatch(parkBenchGeometry(), vmat({ roughness: 0.7 }), 16))
    this.fountains = add(new InstancedBatch(fountainGeometry(), atlasMat, 4, { receiveShadow: true }))
    this.jets = add(new InstancedBatch(jetGeometry(), new MeshStandardMaterial({ color: '#dff6ff', transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }), 4))
    this.pigeons = ['sit', 'up', 'down'].map(p => add(new InstancedBatch(pigeonGeometry(p), vmat({ roughness: 0.8 }), 40)))

    // shahar
    const { map, lit } = facadeTextures(11)
    this.facadeMat = facadeMaterial(map, lit)
    this.buildings = add(new InstancedBatch(unitBoxOnGround(), this.facadeMat, 44, { colors: true, cells: true, receiveShadow: true }))
    this.lamps = add(new InstancedBatch(streetLampGeometry(), vmat({ roughness: 0.5 }), 30))
    this.planters = add(new InstancedBatch(planterGeometry(), vmat({ roughness: 0.85 }), 24))
    this.wires = add(new InstancedBatch(new CylinderGeometry(0.012, 0.012, SLOT, 3).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: '#1a1d26' }), 60))

    // lights: small bright bulbs and soft additive halos (colour per instance)
    this.bulbs = add(new InstancedBatch(new SphereGeometry(0.11, 8, 6), new MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), 300, { colors: true }))
    const halo = radialTexture([[0, 'rgba(255,255,255,0.95)'], [0.25, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']], 64)
    stage.track(halo)
    this.halos = add(new InstancedBatch(new PlaneGeometry(1, 1), glowMaterial('#ffffff', halo, 0.7), 170, { colors: true }))
    this.halos.renderOrder = 3

    // the far skyline band (rides with the camera)
    const skyTex = skylineTexture()
    skyTex.wrapS = RepeatWrapping
    skyTex.repeat.x = -1
    stage.track(skyTex)
    this.skyMat = new MeshBasicMaterial({ map: skyTex, transparent: true, depthWrite: false, fog: false, side: BackSide, color: '#9fb3c9' })
    const band = new CylinderGeometry(300, 300, 84, 48, 1, true, Math.PI / 2, Math.PI)
    band.translate(0, 30, 0)
    this.skyline = new Mesh(band, this.skyMat)
    this.skyline.renderOrder = -8
    this.skyline.frustumCulled = false
    scene.add(this.skyline)

    // Bekat platforms: one street, one metro, placed when a station is near
    this.streetPlat = new Mesh(streetPlatformGeometry(), atlasMat)
    this.metroPlat = new Mesh(metroPlatformGeometry(), atlasMat)
    for (const p of [this.streetPlat, this.metroPlat]) {
      p.castShadow = true
      p.receiveShadow = true
      p.visible = false
      scene.add(p)
    }
    this.signCanvas = document.createElement('canvas')
    this.signCanvas.width = 512
    this.signCanvas.height = 160
    this.signTex = new CanvasTexture(this.signCanvas)
    this.signTex.colorSpace = SRGBColorSpace
    this.signTex.anisotropy = 4
    stage.track(this.signTex)
    this.sign = new Group()
    const signFace = new Mesh(new PlaneGeometry(3.2, 1.0), new MeshBasicMaterial({ map: this.signTex, toneMapped: false, transparent: true, side: DoubleSide }))
    const rods = new Mesh(new CylinderGeometry(0.02, 0.02, 1, 4), new MeshStandardMaterial({ color: '#2d3240' }))
    rods.scale.y = 0.9
    rods.position.set(0, 0.95, 0)
    this.sign.add(signFace, rods)
    this.sign.visible = false
    scene.add(this.sign)
    this.signFor = ''

    this.t = 0
    this.night = 0
  }

  /* the right side next to a Bekat's platform is kept clear */
  blocked(stations, s) {
    for (const st of stations) if (s > st.stop + PLATFORM_SPAN[0] && s < st.stop + PLATFORM_SPAN[1]) return st
    return null
  }

  update(game, dt, cam, blend) {
    this.t += dt
    const t = this.t
    const dist = game.dist
    const track = game.track
    const stations = game.stations
    const env = this.stage.scene
    this.night = env.environmentIntensity < 0.3 ? 1 : 0
    this.facadeMat.emissiveIntensity = this.night ? 1.25 : 0.08

    for (const b of this.batches) b.begin()
    const from = Math.floor((dist - BACK) / SLOT)
    let prevKey = biomeKeyAt(track, (from - 1) * SLOT + SLOT / 2)
    for (let k = from; k * SLOT < dist + AHEAD; k++) {
      const s = k * SLOT
      const key = biomeKeyAt(track, s + SLOT / 2)
      const z = zOf(s, dist)
      const zc = z - SLOT / 2                     // the slot's middle
      const h = hash(k)
      const st = this.blocked(stations, s + SLOT / 2)
      // a tunnel mouth where the metro starts or ends
      if (key !== prevKey && (key === 'metro' || prevKey === 'metro')) this.portals.add(0, 0, z, key === 'metro' ? 0 : Math.PI)
      prevKey = key
      if (key === 'metro') this.metroSlot(k, zc, z, h, st)
      else if (key === 'bozor') this.bozorSlot(k, zc, z, h, st)
      else if (key === 'xiyobon') this.parkSlot(k, s, zc, z, h, st, dist, t)
      else this.citySlot(k, zc, z, h, st)
    }
    for (const b of this.batches) b.end()

    this.updatePlatforms(game, dist)

    // the skyline: the biome's haze colour; hidden deep in the tunnel
    const A = BIOME_LOOK[blend.a]
    const B = BIOME_LOOK[blend.b]
    const ca = A.skyline || '#0b0c12'
    const cb = B.skyline || '#0b0c12'
    this.skyMat.color.copy(colorOf(ca)).lerp(colorOf(cb), blend.k)        // parsed once, not every frame
    this.skyline.position.set(cam.position.x, 0, cam.position.z)
  }

  metroSlot(k, zc, z, h, st) {
    this.vault.add(0, 0, zc)
    this.ribs.add(0, 0, z)
    for (let side = -1; side <= 1; side += 2) {
      this.walls.add(side * WALL_X, VAULT_Y / 2, zc, side < 0 ? Math.PI / 2 : -Math.PI / 2)
      if (!(side > 0 && st)) this.walks.add(side * 5.33, 0.2, zc)
    }
    if (k % 2 === 0) {
      for (let side = -1; side <= 1; side += 2) {
        this.columns.add(side * 5.35, 0.2, z)
        // a sconce glow on the wall between the columns
        this.bulbs.add(side * 6.15, 2.25, zc, 0, 1, '#ffd9a0')
        this.halos.add(side * 6.0, 2.25, zc, 0, 1.6, '#ffb86a')
      }
    } else {
      this.chandeliers.add(0, 0, z)
      for (let i = 0; i < 8; i += 2) {
        const a = (i / 8) * Math.PI * 2
        this.bulbs.add(Math.cos(a) * 0.78, 7.36 + CH, z + Math.sin(a) * 0.78, 0, 0.7, '#fff1c8')
      }
      this.halos.add(0, 7.2 + CH, z + 0.2, 0, 4.2, '#ffc27a')
    }
  }

  bozorSlot(k, zc, z, h, st) {
    if (k % 2 === 0) this.stalls[h < 0.5 ? 0 : 1].add(-6.9, 0, zc, Math.PI / 2)
    else if (!st) this.stalls[h < 0.5 ? 1 : 0].add(6.9, 0, zc, -Math.PI / 2)
    if (k % 2 === 0) {
      this.arcades.add(-14.5, 0, z - SLOT, Math.PI / 2)
      this.arcades.add(14.5, 0, z - SLOT, -Math.PI / 2)
    }
    if (k % 4 === 1) {
      for (let side = -1; side <= 1; side += 2) {
        if (side > 0 && st) continue
        this.lanterns.add(side * 4.75, 0, zc)
        this.bulbs.add(side * 4.75, 3.68, zc, 0, 1.15, '#ffe2a8')
        this.halos.add(side * 4.75, 3.68, zc + 0.15, 0, 1.5, '#ffbf70')
      }
    }
  }

  parkSlot(k, s, zc, z, h, st, dist, t) {
    if (k % 2 === 0) this.chinars[h < 0.5 ? 0 : 1].add(-7.4 - h * 2.2, 0, zc, h * 6, 0.92 + h * 0.3)
    else if (!st) this.chinars[h < 0.5 ? 1 : 0].add(7.4 + h * 2.2, 0, zc, h * 5, 0.9 + h * 0.32)
    if (k % 3 === 1) {
      this.chinars[0].add(-14 - h * 4, 0, zc, h * 3, 1.1)
      this.chinars[1].add(14 + h * 4, 0, zc, h * 4, 1.05)
    }
    this.hedges.add(-4.85, 0, zc)
    if (!st) this.hedges.add(4.85, 0, zc)
    if (k % 4 === 1) this.benches.add(-5.75, 0, zc, 0)
    if (k % 4 === 3 && !st) this.benches.add(5.75, 0, zc, Math.PI)
    if (k % 4 === 0) {
      for (let side = -1; side <= 1; side += 2) {
        if (side > 0 && st) continue
        this.lanterns.add(side * 5.85, 0, zc + 1.5)
        this.bulbs.add(side * 5.85, 3.68, zc + 1.5, 0, 1.15, '#ffe2a8')
        this.halos.add(side * 5.85, 3.68, zc + 1.65, 0, 1.6, '#ffbf70')
      }
    }
    if (k % 8 === 4) {
      const side = Math.floor(k / 8) % 2 ? 1 : -1
      if (!(side > 0 && st)) {
        this.fountains.add(side * 10.5, 0, zc)
        const pulse = 1 + Math.sin(t * 3.1 + k) * 0.06
        this.jets.add(side * 10.5, 0, zc, t * 0.3, [1, pulse, 1])
      }
    }
    // a pigeon flock pecking on the path; it bursts up and away as Toby comes near
    if (k % 14 === 7) {
      const side = h < 0.5 ? -1 : 1
      if (side > 0 && st) return
      const fs = s + 3
      const near = fs - dist
      const u = Math.max(0, Math.min(1, (14 - near) / 12))
      for (let i = 0; i < 9; i++) {
        const r1 = hash(k * 31 + i)
        const r2 = hash(k * 57 + i)
        const px = side * (5.0 + r1 * 1.4)
        const pz = zOf(fs + (r2 - 0.5) * 4, dist)
        if (u <= 0) {
          this.pigeons[0].add(px, 0.02, pz, r1 * 6.28, 1.1)
        } else {
          const up = u * u * 7 + u * 1.5
          const out = side * u * (3 + r1 * 3)
          const flap = Math.sin(t * 26 + i * 1.7) > 0 ? 1 : 2
          this.pigeons[flap].add(px + out, 0.1 + up * (0.8 + r2 * 0.4), pz - u * (4 + r2 * 4), -side * 1.2, 1.1)
        }
      }
    }
  }

  citySlot(k, zc, z, h, st) {
    if (k % 2 === 0) {
      const hh = 10 + h * 18
      this.buildings.add(-12 - h * 3.5, 0, z - SLOT, 0, [7.5, hh, 11.4], h > 0.5 ? '#d7d0c4' : '#cbc2b3', [h, 0, 0, 0])
      this.buildings.add(12 + (1 - h) * 3.5, 0, z - SLOT, 0, [7.5, 10 + (1 - h) * 16, 11.4], '#cfc6b6', [1 - h, 0, 0, 0])
    }
    if (k % 3 === 0) {
      for (let side = -1; side <= 1; side += 2) {
        if (side > 0 && st) continue
        this.lamps.add(side * 4.85, 0, zc, side < 0 ? Math.PI : 0)
        this.bulbs.add(side * 4.0, 4.42, zc, 0, 1.3, '#fff0d0')
        this.halos.add(side * 4.0, 4.3, zc + 0.1, 0, 2.2, '#ffd59a')
      }
    }
    // festoon lights along the pavements (never across the track — the balloon rides above it)
    for (let side = -1; side <= 1; side += 2) {
      if (side > 0 && st) continue
      this.wires.add(side * 6.1, 4.12, zc, 0, [1, 1, 1])
      for (let i = 0; i < 4; i++) {
        const sag = Math.sin(((i + 0.5) / 4) * Math.PI) * 0.45
        const c = (k + i) % 3 === 0 ? '#ffd27a' : (k + i) % 3 === 1 ? '#7fe3ef' : '#ff8f9a'
        this.bulbs.add(side * 6.1, 4.1 - sag, z - 0.75 - i * 1.5, 0, 0.75, c)
        if (i % 2 === 0) this.halos.add(side * 6.1, 4.1 - sag, z - 0.6 - i * 1.5, 0, 0.9, c)
      }
    }
    if (k % 4 === 2) {
      this.planters.add(-5.6, 0, zc)
      if (!st) this.planters.add(5.6, 0, zc)
    }
  }

  updatePlatforms(game, dist) {
    let shown = null
    for (const st of game.stations) {
      const z = zOf(st.stop, dist)
      if (z < -AHEAD - 20 || z > BACK + 24) continue
      shown = st
      break
    }
    this.streetPlat.visible = false
    this.metroPlat.visible = false
    this.sign.visible = false
    if (!shown) return
    const metro = biomeKeyAt(game.track, shown.stop) === 'metro'
    const p = metro ? this.metroPlat : this.streetPlat
    const z = zOf(shown.stop, dist) - 4
    p.visible = true
    p.position.set(0, 0, z)
    const next = BIOME_TITLES[BIOMES[shown.biome]] || ''
    if (this.signFor !== next) { this.signFor = next; signCanvas(this.signCanvas, next); this.signTex.needsUpdate = true }
    this.sign.visible = true
    this.sign.position.set(metro ? 4.7 : 4.4, metro ? 3.55 : 3.6, z + 3)
    this.sign.rotation.set(0, -Math.PI / 2 + 0.28, 0)
  }
}

