/*
 * Cars in a scene: CarFactory builds each model once (geometries + shared
 * materials); CarRig is one car on the road or the turntable.
 *
 *   const cars = new CarFactory()
 *   const rig = cars.create('jip', { color: '#15171c', rims: 'gold', neon: '#38bdf8', flame: 2 })
 *   scene.add(rig.root)
 *   rig.update(dt, { speed, steer, roll, pitch, brake, lights, boost, t })   // every frame
 *   rig.dispose(); cars.dispose()
 *
 * Draw calls per car: paint, glass, chrome, trim, head lamps, tail lamps, plate,
 * tyres, rims (+ contact shadow, neon, flame when on).
 */
import {
  ConeGeometry, DynamicDrawUsage, Euler, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry,
  Quaternion, Vector3,
} from 'three'
import { buildCarModel } from './carModels'
import {
  MaterialSet, chromeMaterial, glassMaterial, glowMaterial, goldMaterial, lampMaterial, paintMaterial, rubberMaterial, setPaint,
  silhouetteMaterial, steelMaterial, trimMaterial,
} from './materials'
import { contactShadowTexture, plateTexture, radialTexture } from './textures'

const _m = new Matrix4()
const _q = new Quaternion()
const _e = new Euler(0, 0, 0, 'YXZ')
const _p = new Vector3()
const _s = new Vector3(1, 1, 1)

export class CarFactory {
  constructor({ physical = true, plate = '01 A 777', shadows = true } = {}) {
    this.physical = physical
    this.plate = plate
    this.shadows = shadows
    this.models = new Map()
    this.mats = new MaterialSet()
    this.extra = []          // geometries / textures owned by the factory
  }

  model(id) {
    let m = this.models.get(id)
    if (!m) { m = buildCarModel(id); this.models.set(id, m) }
    return m
  }

  material(key) {
    const M = this.mats
    switch (key) {
      case 'glass': return M.get(key, glassMaterial)
      case 'chrome': return M.get(key, chromeMaterial)
      case 'gold': return M.get(key, goldMaterial)
      case 'steel': return M.get(key, steelMaterial)
      case 'rubber': return M.get(key, rubberMaterial)
      case 'trim': return M.get(key, trimMaterial)
      case 'silhouette': return M.get(key, silhouetteMaterial)
      case 'plate': return M.get(key, () => new MeshStandardMaterial({ map: plateTexture(this.plate), roughness: 0.45, metalness: 0.1 }))
      case 'shadow': return M.get(key, () => new MeshBasicMaterial({
        map: contactShadowTexture(), color: '#000000', transparent: true, opacity: 0.62, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      }))
      case 'neonTex': return M.get(key, () => new MeshBasicMaterial({ map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]) }))
      default: return null
    }
  }

  geometry(key, make) {
    const k = `geo:${key}`
    let g = this.models.get(k)
    if (!g) { g = make(); this.models.set(k, g); this.extra.push(g) }
    return g
  }

  create(id, opts = {}) {
    return new CarRig(this, id, opts)
  }

  /*
   * Glass reflects its own, dimmer copy of the environment: with only scene.environment three.js
   * ignores material.envMapIntensity, and the studio light boxes turned rear windows into white panels.
   * Call again whenever the environment texture is rebuilt (context restore) or its strength changes.
   */
  setGlassEnv(texture, intensity = 0.3) {
    const g = this.material('glass')
    if (g.envMap !== texture) { g.envMap = texture; g.needsUpdate = true }
    g.envMapIntensity = intensity
  }

  dispose() {
    for (const [key, m] of this.models) {
      if (key.startsWith('geo:')) continue
      for (const g of Object.values(m.geos)) g.dispose()
      m.tyre.dispose()
      m.rim.dispose()
    }
    for (const g of this.extra) g.dispose?.()
    this.models.clear()
    this.extra = []
    this.mats.dispose()
  }
}

const BODY_KEYS = ['paint', 'glass', 'chrome', 'trim', 'head', 'tail', 'plate']

export class CarRig {
  /*
   * opts: { color, rims: 'steel' | 'chrome' | 'gold', neon: css colour | null, flame: 0..3,
   *         physical (paint), castShadow, contactShadow, plate }
   */
  constructor(factory, id, opts = {}) {
    this.factory = factory
    this.id = id
    this.model = factory.model(id)
    const m = this.model
    this.root = new Object3D()
    this.root.name = `car:${id}`
    this.body = new Object3D()
    this.root.add(this.body)
    this.spin = 0
    this.flameLevel = 0
    this.silhouetted = false

    this.paint = paintMaterial(opts.color || '#b3122e', { physical: opts.physical ?? factory.physical })
    this.headMat = lampMaterial('#fff4e0', '#e6ebf0')
    this.tailMat = lampMaterial('#ff1408', '#3a0606')
    this.tailMat.emissiveIntensity = 0.35
    this.own = [this.paint, this.headMat, this.tailMat]

    const mats = {
      paint: this.paint, glass: factory.material('glass'), chrome: factory.material('chrome'), trim: factory.material('trim'),
      head: this.headMat, tail: this.tailMat, plate: factory.material('plate'),
    }
    this.mats = mats
    this.meshes = {}
    const cast = opts.castShadow ?? true
    for (const key of BODY_KEYS) {
      const g = m.geos[key]
      if (!g) continue
      const mesh = new Mesh(g, mats[key])
      mesh.castShadow = cast && (key === 'paint' || key === 'glass' || key === 'trim')
      mesh.receiveShadow = key === 'paint'
      this.body.add(mesh)
      this.meshes[key] = mesh
    }

    const n = m.wheels.length + (m.spare ? 1 : 0)
    this.tyres = new InstancedMesh(m.tyre, factory.material('rubber'), n)
    this.rims = new InstancedMesh(m.rim, factory.material('steel'), n)
    for (const im of [this.tyres, this.rims]) {
      im.instanceMatrix.setUsage(DynamicDrawUsage)
      im.castShadow = cast
      im.frustumCulled = false
      this.root.add(im)
    }
    if (m.spare) {
      // the spare rides on the body (it rolls with it), facing backwards
      this.spareT = new InstancedMesh(m.tyre, factory.material('rubber'), 1)
      this.spareR = new InstancedMesh(m.rim, factory.material('steel'), 1)
      _e.set(0, -Math.PI / 2, 0)
      _q.setFromEuler(_e)
      _m.compose(_p.set(m.spare.x, m.spare.y, m.spare.z), _q, _s.set(1, 1, 1))
      for (const im of [this.spareT, this.spareR]) { im.setMatrixAt(0, _m); im.castShadow = cast; this.body.add(im) }
      this.tyres.count = m.wheels.length
      this.rims.count = m.wheels.length
    }

    if (opts.contactShadow !== false) {
      this.shadow = new Mesh(factory.geometry('shadowPlane', () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), factory.material('shadow'))
      this.shadow.scale.set(m.W * 1.25, 1, m.L * 1.12)
      this.shadow.position.y = 0.012
      this.shadow.renderOrder = 1
      this.root.add(this.shadow)
    }

    this.setRims(opts.rims || 'steel')
    this.setNeon(opts.neon || null)
    this.setFlame(opts.flame || 0)
    this.update(0, {})
  }

  setColor(color) { setPaint(this.paint, color) }

  setRims(kind) {
    this.rimKind = kind
    const mat = this.factory.material(kind === 'gold' ? 'gold' : kind === 'chrome' ? 'chrome' : 'steel')
    if (!this.silhouetted) {
      this.rims.material = mat
      if (this.spareR) this.spareR.material = mat
    }
  }

  /* neon underglow: a soft coloured light pool under the car */
  setNeon(color) {
    if (!color) { if (this.neon) this.neon.visible = false; return }
    if (!this.neon) {
      const base = this.factory.material('neonTex')
      this.neonMat = glowMaterial(color, base.map, 0.9)
      this.own.push(this.neonMat)
      this.neon = new Mesh(this.factory.geometry('shadowPlane', () => new PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), this.neonMat)
      this.neon.scale.set(this.model.W * 2.1, 1, this.model.L * 1.35)
      this.neon.position.y = 0.02
      this.neon.renderOrder = 2
      this.root.add(this.neon)
    }
    this.neonMat.color.set(color)
    this.neon.visible = !this.silhouetted
  }

  /* exhaust flames: 0 none · 1 small amber (boost only) · 2 blue · 3 big */
  setFlame(level) {
    this.flameLevel = level
    if (!level || !this.model.exhaust.length) { if (this.flames) this.flames.visible = false; return }
    if (!this.flames) {
      const g = this.factory.geometry('flame', () => {
        const c = new ConeGeometry(0.075, 0.5, 12, 1, true)
        c.rotateX(Math.PI / 2)            // tip toward +z (backwards)
        c.translate(0, 0, 0.25)
        return c
      })
      this.flameMat = glowMaterial('#ff9a3c', null, 0.9)
      this.own.push(this.flameMat)
      this.flames = new InstancedMesh(g, this.flameMat, this.model.exhaust.length)
      this.flames.frustumCulled = false
      this.flames.renderOrder = 3
      this.body.add(this.flames)
    }
    this.flameMat.color.set(level >= 2 ? '#5ad1ff' : '#ff9a3c')
  }

  /* locked car in the garage: a dark silhouette */
  setSilhouette(on) {
    if (on === this.silhouetted) return
    this.silhouetted = on
    const dark = this.factory.material('silhouette')
    for (const [key, mesh] of Object.entries(this.meshes)) mesh.material = on ? dark : this.mats[key]
    this.tyres.material = on ? dark : this.factory.material('rubber')
    if (this.spareT) this.spareT.material = this.tyres.material
    if (on) { this.rims.material = dark; if (this.spareR) this.spareR.material = dark } else this.setRims(this.rimKind)
    if (this.neon) this.neon.visible = !on && !!this.neonMat
    if (this.flames) this.flames.visible = false
  }

  /*
   * state: speed (m/s, forward), steer (rad, + = left), roll (rad), pitch (rad, + = nose down),
   * brake 0..1, lights 0..1 (head lamps), boost 0..1, t (seconds, for flicker)
   */
  update(dt, { speed = 0, steer = 0, roll = 0, pitch = 0, brake = 0, lights = 0, boost = 0, t = 0 } = {}) {
    const m = this.model
    this.spin += (speed * dt) / m.R
    if (this.spin > 1e4) this.spin -= Math.PI * 2 * 1000
    this.body.rotation.set(pitch, 0, roll, 'YXZ')
    this.body.position.y = Math.abs(roll) * m.W * 0.12
    for (let i = 0; i < m.wheels.length; i++) {
      const w = m.wheels[i]
      const yaw = (w.front ? steer : 0) + (w.left ? Math.PI : 0)
      _e.set(w.left ? this.spin : -this.spin, yaw, 0)
      _q.setFromEuler(_e)
      _m.compose(_p.set(w.x, w.y, w.z), _q, _s.set(1, 1, 1))
      this.tyres.setMatrixAt(i, _m)
      this.rims.setMatrixAt(i, _m)
    }
    this.tyres.instanceMatrix.needsUpdate = true
    this.rims.instanceMatrix.needsUpdate = true
    if (!this.silhouetted) {
      this.headMat.emissiveIntensity = 0.55 + lights * 0.45
      this.tailMat.emissiveIntensity = 0.32 + lights * 0.3 + brake * 0.6
    }
    if (this.flames) {
      const on = !this.silhouetted && (boost > 0.01 || this.flameLevel >= 3)
      this.flames.visible = on
      if (on) {
        const size = boost > 0.01 ? 0.7 + this.flameLevel * 0.22 : 0.42
        for (let i = 0; i < m.exhaust.length; i++) {
          const e = m.exhaust[i]
          const f = size * (0.75 + 0.35 * Math.abs(Math.sin(t * 37 + i * 1.7)))
          _m.compose(_p.set(e[0], e[1], e[2]), _q.identity(), _s.set(f * 0.9, f * 0.9, f))
          this.flames.setMatrixAt(i, _m)
        }
        this.flames.instanceMatrix.needsUpdate = true
      }
    }
  }

  dispose() {
    this.root.removeFromParent()
    for (const mat of this.own) mat.dispose()
    this.tyres.dispose()
    this.rims.dispose()
    this.spareT?.dispose()
    this.spareR?.dispose()
    this.flames?.dispose()
  }
}
