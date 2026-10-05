/*
 * Effects around the car: smoke, sparks and debris (the engine's particles),
 * horn sound-waves, the ✓ ring on the road, the shield bubble, headlights
 * (a real spot light + soft beams), rain / snow, speed lines while boosting,
 * confetti for a new best and the red / gold screen flash.
 */
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, Color, ConeGeometry, DoubleSide, Float32BufferAttribute, LineBasicMaterial, LineSegments,
  Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, Quaternion, RingGeometry, SphereGeometry, SpotLight, Vector3,
} from 'three'
import { InstancedBatch, colorOf } from '../../../../games/three/instancing'
import { Weather } from '../../../../games/three/weather'
import { radialTexture, canvasTexture } from '../../../../games/three/textures'
import { HY, LANE, zOf } from './world'

const CONFETTI = ['#f43f5e', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c']
const _m = new Matrix4()
const _p = new Vector3()
const _s = new Vector3()
const _q = new Quaternion()
const _c = new Color()
const _x = new Vector3(1, 0, 0)

function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

export class Fx {
  constructor(stage, camera) {
    this.stage = stage
    this.camera = camera
    const scene = stage.scene
    scene.add(camera)
    this.root = new Object3D()
    scene.add(this.root)
    const soft = radialTexture([[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']], 64)
    const beamTex = canvasTexture(64, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, 'rgba(255,255,255,1)')
      gr.addColorStop(0.35, 'rgba(255,255,255,0.45)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.fillRect(0, 0, w, h)
    })
    stage.track(soft, beamTex)
    this.list = []
    const B = (geo, mat, cap, opts = {}, parent = this.root) => {
      const b = new InstancedBatch(geo, mat, cap, opts)
      parent.add(b)
      this.list.push(b)
      return b
    }
    const quad = new PlaneGeometry(1, 1)
    this.smoke = B(quad, new MeshBasicMaterial({ map: soft, color: '#d8dade', transparent: true, depthWrite: false, opacity: 0.55 }), 80, { colors: true })
    this.spark = B(quad, new MeshBasicMaterial({ map: soft, color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false }), 90, { colors: true })
    this.debris = B(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), 60, { colors: true })
    this.rings = B(new RingGeometry(0.86, 1, 56), new MeshBasicMaterial({
      color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, toneMapped: false,
    }), 8, { colors: true })
    for (const b of [this.smoke, this.spark]) b.renderOrder = 4

    this.shield = new Mesh(new SphereGeometry(1, 28, 18), new MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }))
    this.shield.visible = false
    this.root.add(this.shield)

    // headlights: one spot light for both lamps (lights the road, the tunnel and what is ahead) + soft beams
    this.spot = new SpotLight('#fff2dc', 0, 70, 0.48, 0.55, 1.3)
    this.spot.position.set(0, 0.75, -2.0)
    this.spot.target.position.set(0, 0, -26)
    this.root.add(this.spot, this.spot.target)
    const cone = new ConeGeometry(2.3, 14, 18, 1, true)
    cone.translate(0, -7, 0)
    cone.rotateX(Math.PI / 2)            // tip at the lamp, opening forward (−z)
    this.beamMat = new MeshBasicMaterial({ map: beamTex, color: '#fff1d0', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide })
    this.beams = new Object3D()
    for (const x of [-0.55, 0.55]) {
      const m = new Mesh(cone, this.beamMat)
      m.position.set(x, 0.66, -2.1)
      m.rotation.x = -0.055
      m.scale.set(0.55, 0.32, 1)
      this.beams.add(m)
    }
    this.beams.visible = false
    this.root.add(this.beams)

    // screen-space bits ride on the camera
    this.flash = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }))
    this.flash.renderOrder = 100
    this.flash.visible = false
    camera.add(this.flash)
    this.confetti = B(new PlaneGeometry(0.11, 0.07), new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide, depthTest: false, toneMapped: false }), 90, { colors: true }, camera)
    this.confetti.renderOrder = 99
    const lg = new BufferGeometry()
    lg.setAttribute('position', new Float32BufferAttribute(new Float32Array(24 * 6), 3))
    this.lines = new LineSegments(lg, new LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthTest: false, depthWrite: false }))
    this.lines.frustumCulled = false
    this.lines.visible = false
    this.lines.renderOrder = 98
    camera.add(this.lines)

    this.weather = new Weather(scene, { drops: 650, flakes: 560 })
  }

  /*
   * view: { carPos, t, car: { x, y, L, W, H }, lights 0..1, tunnel 0..1, night 0..1, rain, snow, speed (m/s), reduced }
   */
  update(game, view, dt) {
    const { carPos, t, car } = view
    const fx = game.fx
    const cam = this.camera
    for (const b of this.list) b.begin()

    // particles (billboards facing the camera)
    for (const p of game.particles) {
      const z = zOf(p.pos, carPos)
      const x = p.x * LANE
      const y = p.h * HY
      const a = Math.max(0, Math.min(1, p.life / p.max))
      if (p.kind === 'smoke') {
        const s = p.size * 2.4
        _m.compose(_p.set(x, y + 0.2, z), cam.quaternion, _s.set(s, s, s))
        this.smoke.addMatrix(_m, _c.setScalar(0.35 + a * 0.65))
      } else if (p.kind === 'debris') {
        const s = p.size * 1.6
        _q.setFromAxisAngle(_x, t * 9 + p.pos)
        _m.compose(_p.set(x, y, z), _q, _s.set(s, s, s))
        this.debris.addMatrix(_m, p.color || '#f97316')
      } else {
        const s = Math.max(0.12, p.size * 2.6)
        _m.compose(_p.set(x, y + 0.3, z), cam.quaternion, _s.set(s, s, s))
        this.spark.addMatrix(_m, _c.copy(colorOf(p.color || '#fde047')).multiplyScalar(a))
      }
    }

    // horn: three sound-waves rolling ahead of the car
    const ht = t - fx.honkT0
    if (ht >= 0 && ht < 1.1 && !view.reduced) {
      for (let i = 0; i < 3; i++) {
        const k = ht * 1.6 - i * 0.22
        if (k <= 0 || k > 1) continue
        const r = 0.7 + k * 2.6
        _m.compose(_p.set(car.x, 1.0, -car.L / 2 - 0.6 - k * 5), _q.identity(), _s.set(r, r * 0.7, 1))
        this.rings.addMatrix(_m, _c.copy(colorOf('#fde68a')).multiplyScalar((1 - k) * 0.9))
      }
    }
    // ✓: a green ring spreading on the road
    const ok = t - fx.okT0
    if (ok >= 0 && ok < 0.6) {
      const k = ok / 0.6
      const r = 1.6 + k * 2.8
      _q.setFromAxisAngle(_x, -Math.PI / 2)
      _m.compose(_p.set(car.x, 0.05, 0), _q, _s.set(r, r * 1.3, 1))
      this.rings.addMatrix(_m, _c.copy(colorOf('#4ade80')).multiplyScalar(1 - k))
    }
    // shield bubble
    const sh = t - fx.shieldT0
    this.shield.visible = sh >= 0 && sh < 1.1
    if (this.shield.visible) {
      const k = sh / 1.1
      this.shield.position.set(car.x, car.y + car.H * 0.45, 0)
      this.shield.scale.set(car.W * 0.85 + k * 0.4, car.H * 0.8 + k * 0.3, car.L * 0.62 + k * 0.4)
      this.shield.material.opacity = 0.32 * (1 - k)
    }

    // headlights
    const L = view.lights
    this.spot.intensity = L * (view.tunnel > 0.3 ? 380 : 460)
    this.spot.position.set(car.x, 0.75 + car.y, -car.L / 2 + 0.2)
    this.spot.target.position.set(car.x + view.steer * -8, 0, -28)
    this.beams.visible = L > 0.05 && view.night > 0.3
    this.beams.position.set(car.x, car.y, 0)
    this.beamMat.opacity = 0.07 * L * Math.min(1, view.night + view.tunnel)

    // weather
    this.weather.update(dt, cam, { rain: view.rain, snow: view.snow, speed: view.speed * 0.9 })

    // screen flash (red = a hit, gold = turbo)
    const ft = t - fx.flashT0
    const gt = t - fx.goldT0
    let fa = 0
    if (ft >= 0 && ft < 0.45) { fa = 0.3 * (1 - ft / 0.45); this.flash.material.color.copy(colorOf('#ef4444')) }
    else if (gt >= 0 && gt < 0.5) { fa = 0.22 * (1 - gt / 0.5); this.flash.material.color.copy(colorOf('#facc15')) }
    this.flash.visible = fa > 0.002
    if (this.flash.visible) {
      const d = 0.5
      const h = 2 * d * Math.tan((cam.fov * Math.PI) / 360) * 1.1
      this.flash.position.set(0, 0, -d)
      this.flash.scale.set(h * cam.aspect, h, 1)
      this.flash.material.opacity = fa
    }

    // confetti (camera space)
    const ct = t - fx.confettiT0
    if (ct >= 0 && ct < 3.4 && !view.reduced) {
      const d = 3
      const H = 2 * d * Math.tan((cam.fov * Math.PI) / 360)
      const W = H * cam.aspect
      for (let i = 0; i < 90; i++) {
        const hx = hash(i * 3 + 1)
        const hy = hash(i * 7 + 2)
        const hc = hash(i * 11 + 3)
        const yN = -0.05 + ct * (0.22 + hy * 0.3) - hy * 0.2
        if (yN < -0.05 || yN > 1.05) continue
        _q.setFromAxisAngle(_p.set(hc - 0.5, 1, hy - 0.5).normalize(), ct * (3 + hc * 6) + i)
        _m.compose(_p.set((hx - 0.5) * W + Math.sin(ct * (2 + hc * 3) + i) * 0.12, H / 2 - yN * H, -d), _q, _s.set(1, 1, 1))
        this.confetti.addMatrix(_m, CONFETTI[i % CONFETTI.length])
      }
    }

    // speed lines while boosting
    const boosting = t < fx.boostUntil && !view.reduced
    this.lines.visible = boosting
    if (boosting) {
      const P = this.lines.geometry.attributes.position.array
      const d = 2
      const H = 2 * d * Math.tan((cam.fov * Math.PI) / 360)
      const R = Math.hypot(H * cam.aspect, H) / 2
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + 0.17
        const r0 = (((t * 1.7 + i * 0.37) % 1) * 0.55 + 0.3) * R
        const r1 = r0 + R * 0.16
        const ca = Math.cos(a)
        const sa = Math.sin(a) * 0.8 - 0.12
        const o = i * 6
        P[o] = ca * r0; P[o + 1] = sa * r0; P[o + 2] = -d
        P[o + 3] = ca * r1; P[o + 4] = sa * r1; P[o + 5] = -d
      }
      this.lines.geometry.attributes.position.needsUpdate = true
    }

    for (const b of this.list) b.end()
  }

  dispose() {
    this.weather.dispose()
  }
}
