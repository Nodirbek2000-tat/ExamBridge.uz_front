/*
 * The road: verges (two themes meet at a zone boundary), asphalt with markings,
 * pavements and kerbs (or snow banks), painted decals, side streets at
 * junctions, speed bumps, rail tracks and tunnels. Everything streams past the
 * car at the origin; nothing is created while driving (pools / instancing).
 */
import { InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three'
import { InstancedBatch, atlasCellMaterial, colorOf, metricUvMaterial } from '../../../../games/three/instancing'
import { KeyedPool } from '../../../../games/three/pool'
import { ModelBuilder } from '../../../../games/three/primitives'
import { vertexMaterial } from '../../../../games/three/materials'
import { DECAL, ROAD_TILE, ROAD_W, asphaltTexture, decalAtlas, decalCell, groundTexture, paveTexture, roadTexture } from './atlas'
import { bumpModel, railTrackModel, tunnelExitModel, tunnelLampModel, tunnelModel } from './models'
import { FAR, LANE, SLOT, ZS, blockedAt, themeOf, zOf } from './world'

const flatPlane = () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)
const GROUND_TILE = 10
const SEG = SLOT * ZS               // a pavement segment = one roadside slot (8.4 m)
const _m = new Matrix4()
const SIDES = [-1, 1]
const LANES = [-LANE, 0, LANE]
// one scratch scale vector (InstancedBatch.add reads it at once) — nothing is allocated per frame
const S3 = [1, 1, 1]
const s3 = (x, y, z) => { S3[0] = x; S3[1] = y; S3[2] = z; return S3 }

function pavementSegment() {
  const m = new ModelBuilder()
  m.box(0.24, 0.17, SEG, { at: [4.62, 0.085, 0], color: '#b9b5ac' })
  m.box(3.3, 0.13, SEG, { at: [6.39, 0.065, 0], color: '#ffffff' })
  m.box(0.12, 0.15, SEG, { at: [8.08, 0.075, 0], color: '#a8a49b' })
  return m.build({ crease: 30 })
}

function snowBankSegment() {
  const m = new ModelBuilder()
  for (let i = 0; i < 4; i++) m.blob(0.9, { at: [5.6, 0.05, -SEG / 2 + 1.05 + i * 2.1], scale: [1.1, 0.45, 1.5], color: '#f4f8fc', seed: 3 + i, lump: 0.16 })
  return m.build({ crease: 40 })
}

export class Road {
  constructor(stage) {
    this.stage = stage
    const scene = stage.scene
    this.root = new Object3D()
    scene.add(this.root)
    const T = this.tex = {
      road: roadTexture({ anisotropy: stage.maxAnisotropy }), asphalt: asphaltTexture(), ground: groundTexture(), decal: decalAtlas(), pave: paveTexture(),
    }
    T.ground.repeat.set(700 / GROUND_TILE, 500 / GROUND_TILE)
    for (const t of Object.values(T)) stage.track(t)

    // verges: A under everything (snapped to the texture tile), B beyond the next zone boundary
    const groundGeo = new PlaneGeometry(700, 500).rotateX(-Math.PI / 2)
    this.groundA = new Mesh(groundGeo, new MeshStandardMaterial({ map: T.ground, color: '#6f9a52', roughness: 1, metalness: 0 }))
    this.groundB = new Mesh(groundGeo, new MeshStandardMaterial({ map: T.ground, color: '#6f9a52', roughness: 1, metalness: 0 }))
    this.groundA.position.y = -0.03
    this.groundB.position.y = -0.02
    this.groundA.receiveShadow = true
    this.groundB.receiveShadow = true
    this.root.add(this.groundA, this.groundB)

    // asphalt
    T.road.repeat.set(1, 420 / ROAD_TILE)
    this.roadMat = new MeshStandardMaterial({ map: T.road, roughness: 0.88, metalness: 0, color: '#ffffff' })
    this.road = new Mesh(new PlaneGeometry(ROAD_W, 420).rotateX(-Math.PI / 2), this.roadMat)
    this.road.position.set(0, 0, 20 - 210)
    this.road.receiveShadow = true
    this.root.add(this.road)

    // pavements / snow banks, side streets, decals, bumps, rails
    this.pave = new InstancedBatch(pavementSegment(), metricUvMaterial(new MeshStandardMaterial({ map: T.pave, vertexColors: true, roughness: 0.9 }), 2.1), 80, { receiveShadow: true })
    this.banks = new InstancedBatch(snowBankSegment(), vertexMaterial({ roughness: 0.7 }), 80, { receiveShadow: true })
    this.side = new InstancedBatch(flatPlane(), metricUvMaterial(new MeshStandardMaterial({
      map: T.asphalt, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), 6), 16, { receiveShadow: true })
    this.decals = new InstancedBatch(flatPlane(), atlasCellMaterial(new MeshStandardMaterial({
      map: T.decal, alphaTest: 0.45, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    })), 96, { cells: true, receiveShadow: true })
    this.padMat = atlasCellMaterial(new MeshStandardMaterial({
      map: T.decal, alphaTest: 0.45, color: '#0b2530', emissive: '#22d3ee', emissiveMap: T.decal, emissiveIntensity: 1.6,
      polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -5,
    }))
    this.pads = new InstancedBatch(flatPlane(), this.padMat, 12, { cells: true })
    this.bumps = new InstancedBatch(bumpModel(), vertexMaterial({ roughness: 0.6 }), 8, { receiveShadow: true })
    this.rails = new InstancedBatch(railTrackModel(), vertexMaterial({ roughness: 0.55, metalness: 0.2 }), 4, { receiveShadow: true })
    this.batches = [this.pave, this.banks, this.side, this.decals, this.pads, this.bumps, this.rails]
    for (const b of this.batches) this.root.add(b)

    // tunnels (pooled groups)
    const tunnelGeo = tunnelModel()
    const exitGeo = tunnelExitModel()
    const lampGeo = tunnelLampModel()
    this.tunnelMat = vertexMaterial({ roughness: 0.92 })
    this.tunnelLampMat = new MeshStandardMaterial({ color: '#fff3d6', emissive: '#ffd9a0', emissiveIntensity: 2.2 })
    stage.track(tunnelGeo, exitGeo, lampGeo, this.tunnelMat, this.tunnelLampMat)
    this.tunnels = new KeyedPool(() => {
      const g = new Object3D()
      const body = new Mesh(tunnelGeo, this.tunnelMat)
      body.receiveShadow = true
      const exit = new Mesh(exitGeo, this.tunnelMat)
      exit.position.z = -52
      const lamps = new InstancedMesh(lampGeo, this.tunnelLampMat, 18)
      for (let i = 0; i < 9; i++) {
        for (const s of [-1, 1]) {
          _m.makeTranslation(s * 2.4, 5.62, -3 - i * 6)
          lamps.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), _m)
        }
      }
      g.add(body, exit, lamps)
      g.visible = false
      this.root.add(g)
      return g
    }, { onRelease: g => { g.visible = false } })
  }

  /* a tunnel made ahead (hidden), so its shaders compile before the run */
  prewarm() {
    const p = this.tunnels.pool
    if (!p.all.length) p.release(p.make())
  }

  /*
   * view: { carPos, themeA, themeB, boundaryZ (metres, < 0 ahead) | null, wet 0..1, t }
   */
  update(game, view) {
    const { carPos, t } = view
    const A = themeOf(view.themeA)
    const B = themeOf(view.themeB)
    const run = carPos * ZS

    // verges
    this.groundA.position.z = -200 + (run % GROUND_TILE)
    this.groundA.material.color.copy(colorOf(A.ground))
    const zb = view.boundaryZ
    this.groundB.visible = zb != null && zb > -FAR - 40 && view.themeB !== view.themeA
    if (this.groundB.visible) {
      this.groundB.position.z = zb - 250
      this.groundB.material.color.copy(colorOf(B.ground))
    }

    // asphalt: scroll the markings, wet roads shine
    this.tex.road.offset.y = (run / ROAD_TILE) % 1
    this.roadMat.color.copy(colorOf(A.road))
    this.roadMat.roughness = 0.88 - view.wet * 0.55
    this.roadMat.metalness = view.wet * 0.15

    for (const b of this.batches) b.begin()
    const decals = game.decals

    // pavements (city themes) or snow banks, slot by slot, skipping junction mouths and tunnels
    const i0 = Math.floor((carPos - 6) / SLOT)
    const i1 = Math.ceil((carPos + FAR / ZS) / SLOT)
    for (let i = i0; i <= i1; i++) {
      const p = i * SLOT
      const bl = blockedAt(decals, p, 1.2)
      if (bl === 0) continue
      const theme = themeOf(game.themeAt(p))
      const z = zOf(p, carPos)
      for (const side of SIDES) {
        if (bl === side) continue
        const rot = side < 0 ? Math.PI : 0
        if (theme.walk) this.pave.add(0, 0, z, rot)
        else if (theme.verge === 'snow') this.banks.add(0, 0, z, rot)
      }
    }

    // decals painted on the road, bumps, rails, side streets, tunnels
    this.tunnels.begin()
    for (const d of decals) {
      const z0 = zOf(d.pos, carPos)
      const len = (d.len || 0.3) * ZS
      const zc = z0 - len / 2
      if (z0 - len > 30 || z0 < -FAR - 60) continue
      switch (d.kind) {
        case 'stopline': this.decals.add(0, 0.004, zc, 0, s3(9.0, 1, Math.max(0.5, len)), null, decalCell(DECAL.stopline)); break
        case 'zebra':
          this.decals.add(0, 0.004, zc, 0, s3(9.0, 1, len), null, decalCell(DECAL.zebra))
          for (const x of LANES) this.decals.add(x, 0.004, z0 + 14, 0, s3(1.6, 1, 3.0), null, decalCell(DECAL.slow))
          break
        case 'giveway': this.decals.add(0, 0.004, zc, 0, s3(9.0, 1, 0.9), null, decalCell(DECAL.giveway)); break
        case 'arrow': {
          const cell = d.dir < 0 ? DECAL.arrowL : d.dir > 0 ? DECAL.arrowR : DECAL.arrowS
          this.decals.add(d.x * LANE, 0.004, zc, 0, s3(1.7, 1, 4.6), null, decalCell(cell))
          break
        }
        case 'ring': this.decals.add(0, 0.004, zOf(d.pos + 0.3, carPos), 0, s3(4.4, 1, 4.4), null, decalCell(DECAL.ring)); break
        case 'bumps': this.bumps.add(0, 0, zc, 0, 1); break
        case 'pad': for (const x of LANES) this.pads.add(x, 0.006, zc, 0, s3(2.5, 1, len), null, decalCell(DECAL.pad)); break
        case 'rail': this.rails.add(0, 0, zc, 0, 1); break
        case 'junction': {
          const s = d.side ?? 0
          for (const side of SIDES) {
            if (s !== 0 && s !== side) continue
            this.side.add(side * 24.4, 0.002, zc, 0, s3(40, 1, len))
            for (let k = 0; k < 4; k++) this.decals.add(side * (7.5 + k * 5.5), 0.006, zc, 0, s3(2.6, 1, 0.16), null, decalCell(DECAL.stopline))
          }
          break
        }
        case 'tunnel': {
          const g = this.tunnels.use(d)
          g.visible = true
          g.position.set(0, 0, z0)
          break
        }
        default: break
      }
    }
    this.tunnels.end()
    this.tunnelMat.color.copy(colorOf(view.themeA === 'snow' ? '#e9eef4' : view.themeA === 'desert' ? '#f3d7b4' : '#ffffff'))
    this.padMat.emissiveIntensity = 1.2 + Math.sin(t * 10) * 0.6
    for (const b of this.batches) b.end()
  }
}
