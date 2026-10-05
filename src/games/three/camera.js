/*
 * Chase camera: rides behind a target with springy smoothing, leans into lane
 * changes, kicks the field of view while boosting and shakes on hits.
 *
 *   const rig = new ChaseCamera({ portrait: {...}, landscape: {...} })
 *   rig.resize(w, h)                                    // picks / blends the framing for the aspect ratio
 *   rig.update(dt, { x, y, z, lean }, { shake, fovKick, follow })
 *
 * Framing (world units, relative to the target): back, up = camera offset;
 * ahead, lookUp = the point looked at; fov = vertical degrees.
 */
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'

const DEFAULT = {
  portrait: { back: 4.9, up: 2.25, ahead: 8, lookUp: 0.2, fov: 64 },
  landscape: { back: 3.6, up: 1.45, ahead: 7, lookUp: 0.42, fov: 50 },
}

const lerp = MathUtils.lerp

export class ChaseCamera {
  constructor({ portrait = DEFAULT.portrait, landscape = DEFAULT.landscape, near = 0.1, far = 900, stiffness = 7 } = {}) {
    this.camera = new PerspectiveCamera(55, 1, near, far)
    this.framings = { portrait: { ...DEFAULT.portrait, ...portrait }, landscape: { ...DEFAULT.landscape, ...landscape } }
    this.frame = { ...this.framings.landscape }
    this.stiffness = stiffness
    this.pos = new Vector3()
    this.look = new Vector3()
    this.goal = new Vector3()
    this.goalLook = new Vector3()
    this.roll = 0
    this.fov = this.frame.fov
    this.snapped = false
    this.time = 0
  }

  /* portrait (aspect ≤ 0.6) … landscape (aspect ≥ 1.3), blended in between */
  resize(w, h) {
    const a = w / Math.max(1, h)
    const k = MathUtils.clamp((a - 0.6) / 0.7, 0, 1)
    const P = this.framings.portrait
    const L = this.framings.landscape
    for (const key of Object.keys(L)) this.frame[key] = lerp(P[key], L[key], k)
    this.camera.aspect = a
    this.camera.fov = this.frame.fov
    this.fov = this.frame.fov
    this.camera.updateProjectionMatrix()
  }

  snap(target) {
    this.snapped = false
    this.update(0, target, {})
  }

  /*
   * target: { x, y, z, lean } — lean (radians) rolls the camera a little with lane changes.
   * fx: { shake 0..1, fovKick degrees, follow 0..1 (how much of target.x the camera follows) }
   */
  update(dt, target, { shake = 0, fovKick = 0, follow = 0.55 } = {}) {
    const f = this.frame
    this.time += dt
    this.goal.set(target.x * follow, (target.y || 0) * 0.5 + f.up, (target.z || 0) + f.back)
    this.goalLook.set(target.x * (follow + 0.2), (target.y || 0) * 0.35 + f.lookUp, (target.z || 0) - f.ahead)
    if (!this.snapped || dt <= 0) {
      this.pos.copy(this.goal)
      this.look.copy(this.goalLook)
      this.snapped = true
    } else {
      const k = 1 - Math.exp(-this.stiffness * dt)
      this.pos.x += (this.goal.x - this.pos.x) * k
      this.pos.y += (this.goal.y - this.pos.y) * k * 0.8
      this.pos.z = this.goal.z
      this.look.x += (this.goalLook.x - this.look.x) * k
      this.look.y += (this.goalLook.y - this.look.y) * k
      this.look.z = this.goalLook.z
    }
    const cam = this.camera
    cam.position.copy(this.pos)
    if (shake > 0) {
      const t = this.time
      cam.position.x += Math.sin(t * 83) * 0.09 * shake
      cam.position.y += Math.cos(t * 71) * 0.06 * shake
    }
    cam.lookAt(this.look)
    const kr = dt > 0 ? 1 - Math.exp(-6 * dt) : 1
    this.roll += ((target.lean || 0) - this.roll) * kr
    cam.rotateZ(this.roll)
    const fov = f.fov + fovKick
    if (Math.abs(fov - this.fov) > 0.01) {
      this.fov += (fov - this.fov) * (dt > 0 ? 1 - Math.exp(-5 * dt) : 1)
      cam.fov = this.fov
      cam.updateProjectionMatrix()
    }
  }
}
