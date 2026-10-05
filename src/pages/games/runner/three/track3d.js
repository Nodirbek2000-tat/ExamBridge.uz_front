/*
 * TOBY RUN — the track itself (RUNNER_PLAN §B1 "Track", §B9.1 track3d.js): rails on ballast with
 * sleepers in the metro, tram rails on cobblestone outside, so the 3 lanes always read the same; the
 * curbs and the verges (bozor paving, park grass, city pavement). Everything is instanced and refilled
 * each frame from the engine's distance in 10 m segments (no allocation). The scenery is world.js.
 */
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { InstancedBatch } from '../../../../games/three/instancing'
import { ModelBuilder } from '../../../../games/three/primitives'
import { LANE_X, groundAt } from '../engine/physics.js'
import { BIOME_LOOK, biomeKeyAt } from './biomes'

const BACK = 14
const AHEAD = 128
const SEG = 6                     // the scenery's slot (world.js): beds and portals change on the same metre

const zOf = (s, dist) => -(s - dist)

export class TrackView {
  constructor(stage, kit) {
    const scene = stage.scene
    const std = (o = {}) => new MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0, ...o })
    // one bed under all three lanes: ballast (metro) or cobblestone (outside)
    this.ballast = new InstancedBatch(new BoxGeometry(8.2, 0.12, SEG), kit.tileMaterial('ballast', 1.5, 'xz'), 28, { colors: true, receiveShadow: true })
    this.cobble = new InstancedBatch(new BoxGeometry(8.2, 0.1, SEG), kit.tileMaterial('cobble', 1.6, 'xz', { roughness: 0.85 }), 28, { colors: true, receiveShadow: true })
    // a sleeper every metre, merged: one instance per lane per segment
    const strip = new ModelBuilder()
    for (let i = 0; i < SEG; i++) strip.box(2.0, 0.08, 0.26, { at: [0, 0, -SEG / 2 + 0.5 + i], color: '#4a3f35' })
    this.sleepers = new InstancedBatch(strip.build({ crease: 10 }), std({ vertexColors: true }), 84, { receiveShadow: true })
    // a rail: head + web; outside a dark groove beside it (tram rails flush with the stones)
    const rail = new ModelBuilder()
    rail.box(0.09, 0.05, SEG, { at: [0, 0.1, 0], color: '#d6d2ca' })
    rail.box(0.05, 0.08, SEG, { at: [0, 0.04, 0], color: '#6d6a66' })
    this.rails = new InstancedBatch(rail.build({ crease: 10 }), std({ vertexColors: true, metalness: 0.55, roughness: 0.35 }), 170, { receiveShadow: true })
    const groove = new ModelBuilder()
    groove.box(0.14, 0.02, SEG, { at: [0, 0.055, 0], color: '#3a3632' })
    this.grooves = new InstancedBatch(groove.build({ crease: 10 }), std({ vertexColors: true, roughness: 0.95 }), 170)
    this.curbs = new InstancedBatch(new BoxGeometry(0.36, 0.3, SEG), std({ roughness: 0.7 }), 60, { colors: true, receiveShadow: true })
    this.paving = new InstancedBatch(new BoxGeometry(100, 0.1, SEG), kit.tileMaterial('paving', 3, 'xz'), 60, { colors: true, receiveShadow: true })
    this.grass = new InstancedBatch(new BoxGeometry(100, 0.1, SEG), kit.tileMaterial('grass', 3, 'xz'), 60, { colors: true, receiveShadow: true })
    this.all = [this.ballast, this.cobble, this.sleepers, this.rails, this.grooves, this.curbs, this.paving, this.grass]
    for (const b of this.all) scene.add(b)
  }

  groundUnder(game, p) {
    return groundAt(game.near, game.nNear, p.x, game.dist)
  }

  update(game) {
    const dist = game.dist
    const track = game.track
    const from = Math.floor((dist - BACK) / SEG) * SEG
    const to = dist + AHEAD
    for (const b of this.all) b.begin()
    for (let s = from; s < to; s += SEG) {
      const key = biomeKeyAt(track, s + SEG / 2)
      const look = BIOME_LOOK[key]
      const z = zOf(s + SEG / 2, dist)
      const metro = key === 'metro'
      if (metro) {
        this.ballast.add(0, -0.06, z, 0, 1, look.bedTint)
        for (let l = 0; l < 3; l++) this.sleepers.add(LANE_X[l], 0.02, z)
      } else {
        this.cobble.add(0, -0.05, z, 0, 1, look.bedTint)
      }
      for (let l = 0; l < 3; l++) {
        for (let q = -1; q <= 1; q += 2) {          // (no array per segment and lane: this runs every frame)
          const side = 0.72 * q
          this.rails.add(LANE_X[l] + side, metro ? 0.02 : -0.04, z)
          if (!metro) this.grooves.add(LANE_X[l] + side * 0.9, 0, z)
        }
      }
      this.curbs.add(-4.18, 0.1, z, 0, 1, look.curb)
      this.curbs.add(4.18, 0.1, z, 0, 1, look.curb)
      if (look.verge === 'paving') {
        this.paving.add(-54.3, 0.0, z, 0, 1, look.vergeTint)
        this.paving.add(54.3, 0.0, z, 0, 1, look.vergeTint)
      } else if (look.verge === 'grass') {
        this.grass.add(-54.3, 0.0, z, 0, 1, look.vergeTint)
        this.grass.add(54.3, 0.0, z, 0, 1, look.vergeTint)
      }
    }
    for (const b of this.all) b.end()
  }
}
