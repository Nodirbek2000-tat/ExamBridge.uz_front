/*
 * Rain streaks and snow flakes in a box that rides with the camera.
 * Two draw calls at most (none when the sky is clear).
 *
 *   const wx = new Weather(scene, { drops: 700, flakes: 600 })
 *   wx.update(dt, camera, { rain: 0..1, snow: 0..1, speed: m/s toward the camera, wind })
 */
import {
  AdditiveBlending, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Points, PointsMaterial,
} from 'three'
import { radialTexture } from './textures'
import { seeded } from './random'

const BOX = { x: 22, y: 14, zNear: 6, zFar: -46 }

export class Weather {
  constructor(scene, { drops = 700, flakes = 600 } = {}) {
    const rnd = seeded(77)
    this.n = drops
    this.m = flakes
    this.rain = new Float32Array(drops * 3)
    this.snow = new Float32Array(flakes * 4)          // x, y, z, phase
    for (let i = 0; i < drops; i++) {
      this.rain[i * 3] = (rnd() - 0.5) * 2 * BOX.x
      this.rain[i * 3 + 1] = rnd() * BOX.y
      this.rain[i * 3 + 2] = BOX.zFar + rnd() * (BOX.zNear - BOX.zFar)
    }
    for (let i = 0; i < flakes; i++) {
      this.snow[i * 4] = (rnd() - 0.5) * 2 * BOX.x
      this.snow[i * 4 + 1] = rnd() * BOX.y
      this.snow[i * 4 + 2] = BOX.zFar + rnd() * (BOX.zNear - BOX.zFar)
      this.snow[i * 4 + 3] = rnd() * Math.PI * 2
    }
    const lg = new BufferGeometry()
    lg.setAttribute('position', new Float32BufferAttribute(new Float32Array(drops * 6), 3))
    this.lines = new LineSegments(lg, new LineBasicMaterial({ color: '#c9d6e6', transparent: true, opacity: 0.4, depthWrite: false, fog: false }))
    this.lines.frustumCulled = false
    this.lines.visible = false
    this.lines.renderOrder = 5
    const pg = new BufferGeometry()
    pg.setAttribute('position', new Float32BufferAttribute(new Float32Array(flakes * 3), 3))
    this.flakeTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']], 64)
    this.points = new Points(pg, new PointsMaterial({
      map: this.flakeTex, size: 0.16, sizeAttenuation: true, transparent: true, depthWrite: false, opacity: 0.95, fog: false, blending: AdditiveBlending,
    }))
    this.points.frustumCulled = false
    this.points.visible = false
    this.points.renderOrder = 5
    scene.add(this.lines, this.points)
    this.t = 0
  }

  update(dt, camera, { rain = 0, snow = 0, speed = 0, wind = 1.5 } = {}) {
    this.t += dt
    const cx = camera.position.x
    const cy = camera.position.y - 4
    const cz = camera.position.z
    const span = BOX.zNear - BOX.zFar
    this.lines.visible = rain > 0.02
    this.points.visible = snow > 0.02
    if (this.lines.visible) {
      this.lines.material.opacity = 0.42 * rain
      const P = this.lines.geometry.attributes.position.array
      const fall = 19
      const n = Math.round(this.n * Math.min(1, 0.3 + rain * 0.7))
      for (let i = 0; i < this.n; i++) {
        const r = this.rain
        let y = r[i * 3 + 1] - fall * dt
        let z = r[i * 3 + 2] + speed * dt
        let x = r[i * 3] + wind * dt
        if (y < 0) y += BOX.y
        if (z > BOX.zNear) z -= span
        if (x > BOX.x) x -= 2 * BOX.x
        r[i * 3] = x; r[i * 3 + 1] = y; r[i * 3 + 2] = z
        const o = i * 6
        if (i >= n) { P[o] = P[o + 3] = 0; P[o + 1] = P[o + 4] = -100; P[o + 2] = P[o + 5] = 0; continue }
        // streak along the drop's motion relative to the camera
        const k = 0.045
        P[o] = cx + x; P[o + 1] = cy + y; P[o + 2] = cz + z
        P[o + 3] = cx + x - wind * k; P[o + 4] = cy + y + fall * k; P[o + 5] = cz + z - speed * k * 0.6
      }
      this.lines.geometry.attributes.position.needsUpdate = true
    }
    if (this.points.visible) {
      this.points.material.opacity = 0.95 * snow
      const P = this.points.geometry.attributes.position.array
      const s = this.snow
      for (let i = 0; i < this.m; i++) {
        let y = s[i * 4 + 1] - (1.3 + (i % 5) * 0.25) * dt
        let z = s[i * 4 + 2] + speed * dt
        const ph = s[i * 4 + 3]
        let x = s[i * 4] + Math.sin(this.t * 1.3 + ph) * 0.6 * dt
        if (y < 0) y += BOX.y
        if (z > BOX.zNear) z -= span
        s[i * 4] = x; s[i * 4 + 1] = y; s[i * 4 + 2] = z
        P[i * 3] = cx + x; P[i * 3 + 1] = cy + y; P[i * 3 + 2] = cz + z
      }
      this.points.geometry.attributes.position.needsUpdate = true
    }
  }

  dispose() {
    this.lines.removeFromParent()
    this.points.removeFromParent()
    this.lines.geometry.dispose()
    this.lines.material.dispose()
    this.points.geometry.dispose()
    this.points.material.dispose()
    this.flakeTex.dispose()
  }
}
