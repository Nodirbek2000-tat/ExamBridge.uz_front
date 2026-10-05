/*
 * Roadside scenery, rebuilt every frame from deterministic slots (slot n always
 * gets the same tree / building), one instanced batch per model:
 * buildings with window facades (lit at night), houses, cabins, trees, palms,
 * pines, cacti, rocks, lamp posts (+ glowing lenses and light pools at night),
 * billboards with English words, power poles, guard rails and the far backdrop
 * (towers, mesas, snowy peaks).
 */
import { Color, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three'
import { InstancedBatch, atlasCellMaterial, colorOf } from '../../../../games/three/instancing'
import { facadeMaterial, facadeTextures, unitBoxOnGround } from '../../../../games/three/facade'
import { glowMaterial, vertexMaterial } from '../../../../games/three/materials'
import { radialTexture, wordAtlas } from '../../../../games/three/textures'
import { hash } from '../../../../games/three/random'
import { THEMES } from '../art'
import {
  billboardModel, bushModel, cabinModel, cactusModel, deadBushModel, guardRailModel, houseModel, lampLensModel, lampPostModel, mesaModel, palmModel,
  peakModel, pineModel, powerPoleModel, rockModel, snowmanModel, treeModel,
} from './models'
import { FAR, SLOT, ZS, blockedAt, themeOf, zOf } from './world'

const SEG = SLOT * ZS
const _c = new Color()
const SIDES = [-1, 1]
const FALLBACK_WORDS = ['HELLO!']
// scratch scale / atlas-cell vectors (read at once by InstancedBatch.add) — nothing allocated per frame
const S3 = [1, 1, 1]
const s3 = (x, y, z) => { S3[0] = x; S3[1] = y; S3[2] = z; return S3 }
const C4 = [0, 0, 0, 0]
const seedCell = (v) => { C4[0] = v; return C4 }

export class Scenery {
  constructor(stage) {
    this.stage = stage
    this.root = new Object3D()
    stage.scene.add(this.root)
    this.list = []
    const B = (geo, mat, cap, opts = {}) => {
      const b = new InstancedBatch(geo, mat, cap, opts)
      this.root.add(b)
      this.list.push(b)
      return b
    }
    const veg = vertexMaterial({ roughness: 0.82 })
    const stuff = vertexMaterial({ roughness: 0.7 })
    const metal = vertexMaterial({ roughness: 0.45, metalness: 0.45 })
    const { map, lit } = facadeTextures(11)
    stage.track(map, lit)
    this.facade = facadeMaterial(map, lit)
    const words = [...new Set(Object.values(THEMES).flatMap(t => t.words || []))]
    this.words = wordAtlas(words, { cols: 4 })
    stage.track(this.words.texture)
    this.faceMat = atlasCellMaterial(new MeshStandardMaterial({ map: this.words.texture, emissiveMap: this.words.texture, emissive: '#ffffff', emissiveIntensity: 0.05, roughness: 0.5 }))
    this.lensMat = new MeshStandardMaterial({ color: '#fff6e0', emissive: '#ffd79a', emissiveIntensity: 0.1 })
    const poolTex = radialTexture([[0, 'rgba(255,214,150,0.9)'], [0.4, 'rgba(255,200,130,0.35)'], [1, 'rgba(255,190,120,0)']], 128)
    stage.track(poolTex)
    this.poolMat = glowMaterial('#ffffff', poolTex, 0)
    this.poolMat.polygonOffset = true
    this.poolMat.polygonOffsetFactor = -6

    this.b = {
      building: B(unitBoxOnGround(), this.facade, 240, { colors: true, cells: true, receiveShadow: true }),
      house: B(houseModel(0), stuff, 40, { colors: true, castShadow: true, receiveShadow: true }),
      cabin: B(cabinModel(), stuff, 24, { castShadow: true }),
      tree: B(treeModel(3), veg, 200, { colors: true, castShadow: true }),
      palm: B(palmModel(), veg, 90, { colors: true, castShadow: true }),
      pine: B(pineModel(), veg, 160, { colors: true, castShadow: true }),
      snowpine: B(pineModel({ snow: true }), veg, 220, { colors: true, castShadow: true }),
      bush: B(bushModel(), veg, 120, { colors: true }),
      cactus: B(cactusModel(), veg, 120, { colors: true, castShadow: true }),
      rock: B(rockModel(), stuff, 120, { colors: true, castShadow: true }),
      deadbush: B(deadBushModel(), veg, 80),
      snowman: B(snowmanModel(), stuff, 12, { castShadow: true }),
      lamp: B(lampPostModel(), metal, 64, { castShadow: true }),
      lens: B(lampLensModel(), this.lensMat, 64),
      pool: B(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.poolMat, 64),
      board: B(billboardModel(), metal, 24, { castShadow: true }),
      face: B(new PlaneGeometry(6.0, 3.0), this.faceMat, 24, { cells: true }),
      pole: B(powerPoleModel(), stuff, 40, { castShadow: true }),
      rail: B(guardRailModel(), metal, 90),
      mesa: B(mesaModel(), stuff, 20),
      peak: B(peakModel(), stuff, 16),
    }
    this.pool = this.b.pool
    this.pool.renderOrder = 2
  }

  begin() { for (const b of this.list) b.begin() }

  end() { for (const b of this.list) b.end() }

  /* view: { carPos, night 0..1 } */
  fill(game, view) {
    const { carPos, night } = view
    const decals = game.decals
    const b = this.b
    const lit = night
    this.facade.emissiveIntensity = 0.06 + night * 1.25
    this.faceMat.emissiveIntensity = 0.04 + night * 0.85
    this.lensMat.emissiveIntensity = 0.12 + night * 3.2
    this.poolMat.opacity = night * 0.55

    const i0 = Math.floor((carPos - 7) / SLOT)
    const i1 = Math.ceil((carPos + FAR / ZS) / SLOT)
    for (let i = i0; i <= i1; i++) {
      const p = i * SLOT
      const z = zOf(p, carPos)
      const name = game.themeAt(p)
      const T = themeOf(name)
      const bl = blockedAt(decals, p)
      // far backdrop first (it is never blocked)
      if (i % 3 === 0) this.far(T, i, z)
      if (bl === 0) continue
      for (const side of SIDES) {
        if (bl === side) continue
        const n = i * 2 + (side > 0 ? 1 : 0)
        const h1 = hash(n)
        const h2 = hash(n + 7919)
        const h3 = hash(n + 104729)
        const face = side < 0 ? 0 : Math.PI          // models whose front is +x face the road this way
        // the kerb row: lamp posts with trees / palms between
        if (T.walk) {
          const lamp = side > 0 ? i % 4 === 0 : i % 4 === 2
          if (lamp) {
            const rot = side > 0 ? 0 : Math.PI
            b.lamp.add(side * 4.95, 0, z, rot)
            b.lens.add(side * 4.95, 0, z, rot)
            if (lit > 0.02) b.pool.add(side * 2.9, 0.02, z, 0, s3(9, 1, 11))
          } else if (T.kerb && h1 < 0.8) {
            const s = 0.85 + h2 * 0.35
            const tint = _c.setScalar(0.85 + h3 * 0.25)
            b[T.kerb].add(side * (5.75 + (h2 - 0.5) * 0.3), 0, z + (h3 - 0.5) * 2.4, h1 * 6.28, s, tint)
          }
        } else if (T.rail) {
          b.rail.add(side * 5.25, 0, z, side < 0 ? Math.PI : 0)
        }
        if (T.poles && side > 0 && i % 5 === 0) b.pole.add(8.6, 0, z, 0)

        // the building row
        this.buildings(T, side, i, z, h1, h2, h3, face)

        // loose items further out (country themes) or a billboard in a gap (city)
        if (!T.walk && T.extras) {
          const count = name === 'snow' ? 3 : 2
          for (let k = 0; k < count; k++) {
            const hk = hash(n * 7 + k * 31 + 5)
            const hx = hash(n * 13 + k * 17 + 9)
            const type = T.extras[Math.floor(hk * T.extras.length)]
            const x = side * (7.4 + hx * (name === 'snow' ? 26 : 30))
            const zz = z + (hash(n + k * 101) - 0.5) * SEG
            if (type === 'billboard') { if (k === 0 && hx < 0.3) this.billboard(name, side, n, z, 11) }
            else b[type].add(x, 0, zz, hk * 6.28, 0.75 + hx * 0.6, _c.setScalar(0.85 + hk * 0.25))
          }
        }
      }
    }
  }

  buildings(T, side, i, z, h1, h2, h3, face) {
    const b = this.b
    if (!T.build) return
    if (T.build === 'cabins') {
      if (h2 < 0.3) b.cabin.add(side * (15 + h1 * 6), 0, z, face + (h3 - 0.5) * 0.4)
      else b.snowpine.add(side * (9 + h1 * 4), 0, z + (h3 - 0.5) * 4, h1 * 6, 0.9 + h2 * 0.5, _c.setScalar(0.9 + h3 * 0.15))
      return
    }
    // a billboard instead of a building now and then
    if (T.extras?.includes('billboard') && h2 > 0.9) {
      this.billboard(null, side, i * 2, z, 10.5, T)
      b.bush.add(side * 9.2, 0, z + 3, h1 * 6, 0.9, _c.setScalar(1))
      return
    }
    const houses = T.build === 'city' ? 0.28 : T.build === 'low' ? 0.5 : 0
    if (h2 < houses) {
      b.house.add(side * (14.5 + h1 * 1.5), 0, z, face, 1, colorOf(T.walls[Math.floor(h3 * T.walls.length)]))
      if (h1 < 0.6) b.bush.add(side * 9.6, 0, z + (h3 - 0.5) * 3, h1 * 6, 0.8, _c.setScalar(1))
      return
    }
    const floors = T.build === 'tall' ? 5 + Math.floor(h1 * 12) : T.build === 'low' ? 2 + Math.floor(h1 * 3) : 3 + Math.floor(h1 * 6)
    const h = floors * 3.3 + 0.6
    const d = 10 + h3 * 8
    const w = SEG * (0.86 + h3 * 0.1)
    const wall = T.walls[Math.floor(hash(i * 3 + 1) * T.walls.length)]
    b.building.add(side * (8.9 + d / 2), 0, z, 0, s3(d, h, w), colorOf(wall), seedCell(hash(i * 7 + (side > 0 ? 3 : 0))))
  }

  billboard(themeName, side, n, z, x, T) {
    const theme = THEMES[themeName] || null
    const list = theme?.words || (T ? this.wordsFor(T) : null) || FALLBACK_WORDS
    const word = list[Math.floor(hash(n + 55) * list.length)]
    const rot = side * -0.32                    // turned a little toward the road
    this.b.board.add(side * x, 0, z, rot)
    const cx = Math.sin(rot) * 0.42
    const cz = Math.cos(rot) * 0.42
    this.b.face.add(side * x + cx, 6.4, z + cz, rot, 1, null, this.words.cell(word))
  }

  wordsFor(T) {
    if (!this.wordsByTheme) {
      this.wordsByTheme = new Map()
      for (const [name, def] of Object.entries(THEMES)) if (def.words && !this.wordsByTheme.has(themeOf(name))) this.wordsByTheme.set(themeOf(name), def.words)
    }
    return this.wordsByTheme.get(T) || FALLBACK_WORDS
  }

  far(T, i, z) {
    const b = this.b
    const h1 = hash(i * 5 + 3)
    const h2 = hash(i * 11 + 7)
    for (const side of SIDES) {
      const hs = side > 0 ? h1 : h2
      if (T.far === 'tower') {
        const floors = 9 + Math.floor(hs * 22)
        b.building.add(side * (42 + hs * 45), 0, z + (h2 - 0.5) * 10, 0, s3(16 + h1 * 10, floors * 3.3, 16 + h2 * 8), colorOf(T.walls[Math.floor(hs * T.walls.length)]), seedCell(hash(i * 13 + side)))
      } else if (T.far === 'mesa' && i % 6 === 0) {
        b.mesa.add(side * (75 + hs * 60), 0, z, hs * 6, 0.7 + hs * 0.7, _c.setScalar(0.9 + hs * 0.2))
      } else if (T.far === 'peak' && i % 6 === 0) {
        b.peak.add(side * (95 + hs * 70), 0, z - 40, hs * 6, 0.9 + hs * 0.8, _c.setScalar(0.95 + hs * 0.1))
      }
      if ((T.far === 'peak' || T.far === 'mesa') && i % 3 === 0) {
        // a nearer row of trees / rocks fills the middle distance
        if (T.far === 'peak') b.snowpine.add(side * (34 + hs * 20), 0, z, hs * 6, 1.2 + hs * 0.6, _c.setScalar(0.9))
        else b.rock.add(side * (36 + hs * 25), 0, z, hs * 6, 1.5 + hs, _c.setScalar(0.95))
      }
    }
  }
}
