/*
 * The engine's objects in 3D: coins, cones, road works, the jump barrier, road
 * signs, traffic in the way (box trucks, vans, saloons), traffic lights, the
 * rail crossing and its train, pedestrians, the passenger, sheep and cows, the
 * gas station, the bus stop and the corner buildings (bank, park, school).
 * Simple things are instanced; groups come from pools keyed by the engine object.
 */
import { Mesh, MeshStandardMaterial, Object3D, PlaneGeometry } from 'three'
import { InstancedBatch, atlasCellMaterial, colorOf } from '../../../../games/three/instancing'
import { KeyedPool } from '../../../../games/three/pool'
import { vertexMaterial } from '../../../../games/three/materials'
import { wordAtlas } from '../../../../games/three/textures'
import { hash } from '../../../../games/three/random'
import { SIGN_FACE, signAtlas, signCell } from './atlas'
import {
  bankModel, beamModel, busStopModel, carriageModel, coinModel, coneModel, cowModel, crossingArmModel, crossingLampModel, crossingPostModel,
  parkModel, personModel, schoolModel, sheepModel, signPostModel, stationLightsModel, stationModel, trafficLampModel, trafficLightModel,
  truckModel, worksModel,
} from './models'
import { FAR, HY, LANE, zOf } from './world'

const TRAFFIC = ['#b8322a', '#2d3e50', '#e9edf0', '#2a6fb0', '#1c8a74', '#7c858d', '#c8601d', '#6e3f8f', '#3a3d42']
const LABELS = ['BANK', 'PARK', 'SCHOOL', 'FUEL', 'BUS']
const LABEL_PAL = [
  { bg: '#e7e1d4', fg: '#3a3127', accent: '#c9a45c' }, { bg: '#2f5d3a', fg: '#ffffff', accent: '#9bd27a' },
  { bg: '#1f5fbf', fg: '#ffffff', accent: '#ffd23f' }, { bg: '#24272c', fg: '#ffffff', accent: '#e8432f' }, { bg: '#1f5fbf', fg: '#ffffff', accent: '#ffffff' },
]
const LAMP_ON = [['#ff2b1c', '#3a0b08'], ['#ffb01c', '#3a2a08'], ['#20f070', '#08301a']]
const BLACK = colorOf('#000000')
// nothing below is allocated per frame: fixed scales, the park's trees, one scratch state for traffic rigs
const S_FUEL = [1.5, 1.5, 1]
const S_BUS = [0.9, 0.9, 1]
const S_BANK = [3.2, 3.2, 1]
const S_SCHOOL = [3.4, 3.4, 1]
const S_PARK = [3.0, 3.0, 1]
const PARK_TREES = [[3, -6, 1.1], [7, 3, 1.25], [10, -5, 1], [4, 7, 0.95], [12, 6, 1.15]]
const TRAFFIC_STATE = { brake: 0, lights: 0 }

export class Props {
  constructor(stage, cars, scenery) {
    this.stage = stage
    this.cars = cars
    this.scenery = scenery
    this.root = new Object3D()
    stage.scene.add(this.root)
    this.list = []
    const B = (geo, mat, cap, opts = {}) => {
      const b = new InstancedBatch(geo, mat, cap, opts)
      this.root.add(b)
      this.list.push(b)
      return b
    }
    const vmat = this.vmat = vertexMaterial({ roughness: 0.6 })
    const coinMat = new MeshStandardMaterial({ color: '#ffc83d', metalness: 1, roughness: 0.22, emissive: '#7a4a00', emissiveIntensity: 0.35 })
    this.blinkMat = new MeshStandardMaterial({ color: '#ffb01c', emissive: '#ffa000', emissiveIntensity: 2 })
    this.signTex = signAtlas()
    this.labels = wordAtlas(LABELS, { cols: 4, palettes: LABEL_PAL })
    stage.track(this.signTex, this.labels.texture)
    this.labelMat = atlasCellMaterial(new MeshStandardMaterial({ map: this.labels.texture, emissiveMap: this.labels.texture, emissive: '#ffffff', emissiveIntensity: 0.1, roughness: 0.6 }))
    const signMat = atlasCellMaterial(new MeshStandardMaterial({ map: this.signTex, alphaTest: 0.5, roughness: 0.45, metalness: 0.1, emissiveMap: this.signTex, emissive: '#ffffff', emissiveIntensity: 0.08 }))
    this.signMat = signMat

    this.b = {
      coin: B(coinModel(), coinMat, 90, { castShadow: true }),
      cone: B(coneModel(), vmat, 60, { castShadow: true }),
      works: B(worksModel(), vmat, 12, { castShadow: true }),
      blink: B(new PlaneGeometry(0.14, 0.18), this.blinkMat, 12),
      beam: B(beamModel(), vmat, 4, { castShadow: true }),
      post: B(signPostModel(), vmat, 30, { castShadow: true }),
      sign: B(new PlaneGeometry(0.8, 0.8), signMat, 30, { cells: true }),
      sheep: B(sheepModel(), vmat, 12, { castShadow: true }),
      cow: B(cowModel(), vmat, 6, { castShadow: true }),
      label: B(new PlaneGeometry(1, 0.5), this.labelMat, 16, { cells: true }),
    }
    this.people = [0, 1, 2].map(v => B(personModel(v), vmat, 10, { castShadow: true }))
    this.waver = B(personModel(4, { wave: true }), vmat, 3, { castShadow: true })

    // pooled groups
    const geo = (make) => { const g = make(); stage.track(g); return g }
    const truckGeos = [geo(() => truckModel('#e4e7eb', '#f4f4f2', '#2563eb')), geo(() => truckModel('#d9472b', '#f2efe8', '#d9472b'))]
    this.trucks = new KeyedPool(() => this.group(new Mesh(truckGeos[0], vmat), true), { onRelease: g => { g.visible = false } })
    this.trucks.geos = truckGeos
    this.vans = new KeyedPool(() => this.rig('van'), { onRelease: r => { r.root.visible = false } })
    this.saloons = new KeyedPool(() => this.rig('klassik'), { onRelease: r => { r.root.visible = false } })

    const lightGeo = geo(trafficLightModel)
    const lampGeos = [0, 1, 2].map(i => geo(() => trafficLampModel(i)))
    this.lights = new KeyedPool(() => {
      const g = new Object3D()
      const mats = LAMP_ON.map(([, off]) => new MeshStandardMaterial({ color: off, emissive: '#000000', emissiveIntensity: 3, roughness: 0.25 }))
      stage.track(...mats)
      for (const side of [1, -1]) {
        const s = new Object3D()
        s.add(new Mesh(lightGeo, vmat))
        lampGeos.forEach((lg, i) => s.add(new Mesh(lg, mats[i])))
        s.position.x = side * 5.7
        s.scale.x = side
        s.traverse(o => { o.castShadow = o.isMesh })
        g.add(s)
      }
      g.userData.mats = mats
      return this.place(g)
    }, { onRelease: g => { g.visible = false } })

    const postGeo = geo(crossingPostModel)
    const armGeo = geo(crossingArmModel)
    const clampGeo = geo(crossingLampModel)
    this.crossings = new KeyedPool(() => {
      const g = new Object3D()
      const lamp = new MeshStandardMaterial({ color: '#3a0b08', emissive: '#ff2b1c', emissiveIntensity: 0, roughness: 0.3 })
      stage.track(lamp)
      g.userData.arms = []
      for (const side of [-1, 1]) {
        const s = new Object3D()
        const post = new Mesh(postGeo, vmat)
        post.position.x = -5.7
        const lampMesh = new Mesh(clampGeo, lamp)
        lampMesh.position.x = -5.7
        const pivot = new Object3D()
        pivot.position.set(-5.25, 0.95, 0.35)
        pivot.add(new Mesh(armGeo, vmat))
        s.add(post, lampMesh, pivot)
        s.scale.x = side < 0 ? 1 : -1
        s.traverse(o => { o.castShadow = o.isMesh })
        g.add(s)
        g.userData.arms.push(pivot)
      }
      g.userData.lamp = lamp
      return this.place(g)
    }, { onRelease: g => { g.visible = false } })

    const carriageGeos = ['#c8322c', '#1f6fb5', '#e0a020', '#1c8a64'].map(c => geo(() => carriageModel(c)))
    this.trains = new KeyedPool(() => {
      const g = new Object3D()
      g.userData.cars = carriageGeos.map(cg => { const m = new Mesh(cg, vmat); m.castShadow = true; g.add(m); return m })
      return this.place(g)
    }, { onRelease: g => { g.visible = false } })

    const stationGeo = geo(stationModel)
    const stationLightGeo = geo(stationLightsModel)
    this.stationLight = new MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6e6', emissiveIntensity: 1.2 })
    stage.track(this.stationLight)
    this.stations = new KeyedPool(() => {
      const g = new Object3D()
      const body = new Mesh(stationGeo, vmat)
      body.castShadow = true
      body.receiveShadow = true
      g.add(body, new Mesh(stationLightGeo, this.stationLight))
      return this.place(g)
    }, { onRelease: g => { g.visible = false } })

    const simple = (make) => {
      const gg = geo(make)
      return new KeyedPool(() => {
        const m = new Mesh(gg, vmat)
        m.castShadow = true
        m.receiveShadow = true
        return this.place(m)
      }, { onRelease: g => { g.visible = false } })
    }
    this.stops = simple(busStopModel)
    this.landmarks = { bank: simple(bankModel), park: simple(parkModel), school: simple(schoolModel) }
    this.pools = [this.trucks, this.vans, this.saloons, this.lights, this.crossings, this.trains, this.stations, this.stops, ...Object.values(this.landmarks)]
  }

  /* one (hidden) item of every pooled kind, made ahead: no model building or shader compiling mid-run */
  prewarm() {
    for (const p of this.pools) if (!p.pool.all.length) p.pool.release(p.pool.make())
  }

  place(o) { o.visible = false; this.root.add(o); return o }

  group(mesh, shadow) {
    mesh.castShadow = shadow
    const g = new Object3D()
    g.add(mesh)
    g.userData.mesh = mesh
    return this.place(g)
  }

  rig(id) {
    const r = this.cars.create(id, { color: '#7c858d', physical: false, rims: 'steel' })
    r.root.visible = false
    this.root.add(r.root)
    return r
  }

  update(game, view) {
    const { carPos, t, night } = view
    const b = this.b
    for (const x of this.list) x.begin()
    for (const p of this.pools) p.begin()
    this.labelMat.emissiveIntensity = 0.08 + night * 0.9
    this.signMat.emissiveIntensity = 0.06 + night * 0.35
    this.stationLight.emissiveIntensity = 0.8 + night * 2.2
    this.blinkMat.emissiveIntensity = Math.sin(t * 9) > 0 ? 3 : 0.1
    const blink = Math.sin(t * 7) > 0 ? 1 : 0

    for (const o of game.objects) {
      const z = zOf(o.pos, carPos)
      if (z < -FAR || z > 30) continue
      let x = (o.x || 0) * LANE
      let y = 0
      let spin = 0
      if (o.fly) {
        const ft = t - o.fly.t0
        x += o.fly.vx * ft * LANE
        y = Math.max(0, (o.fly.vh * ft - 6 * ft * ft) * HY)
        spin = o.fly.spin * ft
      }
      switch (o.kind) {
        case 'coin':
          b.coin.add(x, 0.85 + Math.sin(t * 4 + o.pos) * 0.09, z, t * 3.2 + o.pos * 0.7)
          break
        case 'cone':
          b.cone.addRot(x, y, z, spin * 0.5, spin, spin * 0.3)
          break
        case 'works':
          b.works.addRot(x, y, z, 0, spin * 0.4, spin * 0.2)
          if (!o.fly) b.blink.add(x + 0.85, 1.25, z + 0.07)
          break
        case 'beam':
          b.beam.addRot(0, y, z, spin * 0.15, 0, spin * 0.05)
          break
        case 'sign': {
          const cell = signCell(SIGN_FACE[o.face] ?? SIGN_FACE.works)
          b.post.add(x, 0, z)
          b.sign.add(x, 2.6, z + 0.06, 0, 1, null, cell)
          break
        }
        case 'truck': this.traffic(o, x, y, z, spin, blink); break
        case 'ped': {
          const dir = (o.x1 ?? 1) > (o.x0 ?? 0) ? 1 : -1
          const batch = this.people[(o.v || 0) % 3]
          batch.add(x, (o.bob || 0) * HY, z, dir > 0 ? -Math.PI / 2 : Math.PI / 2, o.kid ? 0.66 : 1)
          break
        }
        case 'passenger': {
          if (o.gone) break
          const waving = o.walkT0 == null && !o.sad
          if (waving) this.waver.add(x, (o.bob || 0) * HY, z, Math.PI / 2 + Math.sin(t * 2) * 0.1)
          else this.people[1].add(x, (o.bob || 0) * HY, z, Math.PI / 2)
          break
        }
        case 'animal': {
          const yaw = (o.dir || 1) > 0 ? -Math.PI / 2 : Math.PI / 2
          const s = o.fade ?? 1
          if (s > 0.05) (o.v === 'cow' ? b.cow : b.sheep).add(x, (o.hop || 0) * HY, z, yaw + Math.sin(t * 1.3 + o.pos) * 0.15 * (o.flee ? 0 : 1), s)
          break
        }
        case 'light': {
          const g = this.lights.use(o)
          g.visible = true
          g.position.set(0, 0, z)
          const mats = g.userData.mats
          const on = o.state === 'red' ? 0 : o.state === 'amber' ? 1 : 2
          for (let i = 0; i < mats.length; i++) {
            mats[i].color.copy(colorOf(LAMP_ON[i][i === on ? 0 : 1]))
            mats[i].emissive.copy(i === on ? colorOf(LAMP_ON[i][0]) : BLACK)
          }
          break
        }
        case 'rail': {
          const g = this.crossings.use(o)
          g.visible = true
          g.position.set(0, 0, z)
          for (const arm of g.userData.arms) arm.rotation.z = o.angle ?? Math.PI / 2
          g.userData.lamp.emissiveIntensity = o.flashing && Math.floor(t * 3) % 2 === 0 ? 3.5 : 0
          break
        }
        case 'train': {
          const g = this.trains.use(o)
          g.visible = true
          g.position.set(0, 0, z)
          const front = -14 + (t - o.t0) * 32
          const cars = g.userData.cars
          for (let c = 0; c < cars.length; c++) cars[c].position.x = (front - c * 5.4 - 2.55) * LANE
          break
        }
        case 'station': {
          const g = this.stations.use(o)
          g.visible = true
          g.position.set(x, 0, z)
          b.label.add(x - 6.17, 5.45, z - 5.8, -Math.PI / 2, S_FUEL, null, this.labels.cell('FUEL'))
          break
        }
        case 'busstop': {
          const g = this.stops.use(o)
          g.visible = true
          g.position.set(x, 0, z)
          b.label.add(x - 0.9, 2.72, z - 2.36, 0, S_BUS, null, this.labels.cell('BUS'))
          break
        }
        case 'landmark': this.landmark(o, x, z); break
        default: break
      }
    }

    for (const p of this.pools) p.end()
    for (const x of this.list) x.end()
  }

  /* a vehicle stopped in the lane (a blocker): its rear stands at the object's position */
  traffic(o, x, y, z, spin, blink) {
    const v = (o.v || 0) % 3
    const tint = TRAFFIC[Math.floor(hash(Math.round(o.pos * 10)) * TRAFFIC.length)]
    if (v === 0) {
      const g = this.trucks.use(o)
      if (this.trucks.lastFresh) g.userData.mesh.geometry = this.trucks.geos[hash(Math.round(o.pos * 7)) < 0.5 ? 0 : 1]
      g.visible = true
      g.position.set(x, y, z - 3.62)
      g.rotation.set(spin * 0.1, spin * 0.3, spin * 0.2)
      return
    }
    const pool = v === 1 ? this.vans : this.saloons
    const r = pool.use(o)
    if (pool.lastFresh) r.setColor(tint)
    r.root.visible = true
    r.root.position.set(x, y, z - r.model.L / 2)
    r.root.rotation.set(spin * 0.1, spin * 0.3, spin * 0.2)
    TRAFFIC_STATE.brake = blink
    r.update(0, TRAFFIC_STATE)
  }

  landmark(o, x, z) {
    const v = this.landmarks[o.v] ? o.v : 'bank'
    const g = this.landmarks[v].use(o)
    g.visible = true
    const side = x < 0 ? -1 : 1
    g.position.set(x, 0, z)
    g.scale.x = side
    const yaw = side > 0 ? -Math.PI / 2 : Math.PI / 2
    if (v === 'bank') this.b.label.add(x - 2.45 * side, 8.95, z, yaw, S_BANK, null, this.labels.cell('BANK'))
    else if (v === 'school') this.b.label.add(x - 0.6 * side, 4.35, z, yaw, S_SCHOOL, null, this.labels.cell('SCHOOL'))
    else {
      this.b.label.add(x - 2.7 * side, 4.7, z, yaw, S_PARK, null, this.labels.cell('PARK'))
      const trees = this.scenery.b.tree
      for (const [dx, dz, s] of PARK_TREES) trees.add(x + dx * side, 0, z + dz, dx, s)
    }
  }
}
