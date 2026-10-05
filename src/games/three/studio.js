/*
 * Studio turntable: one car on a dark stage with soft studio light and
 * reflections, turned by dragging (with inertia) and slowly on its own.
 * The canvas is transparent — the page's own background shows behind it.
 *
 *   const studio = createStudio(canvas, { reduced, onFallback, onShown })      // null without WebGL
 *   studio.show('jip', { color, rims, neon, flame, locked })    // onShown() with the first car frame drawn
 *                                                               // (its shaders compile without blocking the page)
 *   studio.snapshot([{ id, color, rims, locked }], 320, 180) → [dataURL]   (thumbnails, same renderer)
 *   studio.dispose()
 */
import {
  CircleGeometry, DirectionalLight, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, RingGeometry, Vector3,
} from 'three'
import { createStage } from './stage'
import { CarFactory } from './carRig'
import { radialTexture } from './textures'

const LOOK = new Vector3(0, 0.62, 0)
const GLASS_ENV = 0.4          // glass mirrors the studio lights softly (full strength = white windscreens)

export function createStudio(canvas, { reduced = false, onFallback = null, onShown = null, accent = '#ffb224' } = {}) {
  let studio = null
  const stage = createStage(canvas, {
    alpha: true, shadows: true, exposure: 1.0, dprCap: 1.75, autoQuality: false,
    onFrame: (dt) => studio?.frame(dt),
    onResize: (w, h) => studio?.resize(w, h),
    onRestore: () => { if (studio) { studio.cars.setGlassEnv(stage.envRT.texture, GLASS_ENV); studio.dirty = true } },
    onFallback: (why) => onFallback?.(why),
  })
  if (!stage) return null
  studio = new Studio(stage, { reduced, accent, onShown })
  return studio
}

class Studio {
  constructor(stage, { reduced, accent, onShown }) {
    this.stage = stage
    this.reduced = reduced
    this.onShown = onShown
    this.compiled = false
    this.announce = false
    const scene = stage.scene
    stage.useRoomEnvironment(0.85)

    this.camera = new PerspectiveCamera(28, 1, 0.5, 80)
    stage.setCamera(this.camera)

    scene.add(new HemisphereLight('#ffffff', '#202028', 0.35))
    const key = new DirectionalLight('#ffffff', 1.9)
    key.position.set(-3.5, 7, 4.5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 })
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.02
    key.shadow.radius = 4
    scene.add(key)
    const rim = new DirectionalLight('#cfe0ff', 1.3)
    rim.position.set(4, 3, -5)
    scene.add(rim)

    // the floor: a glossy dark disc fading out, a thin accent ring on it, a pool of light
    // alphaMap reads the green channel: white → opaque, black → clear
    const fade = radialTexture([[0, 'rgb(255,255,255)'], [0.42, 'rgb(210,210,210)'], [0.78, 'rgb(40,40,40)'], [1, 'rgb(0,0,0)']], 256)
    stage.track(fade)
    this.floor = new Mesh(new CircleGeometry(4.6, 64), new MeshStandardMaterial({ color: '#1a1a22', roughness: 0.3, metalness: 0.45, alphaMap: fade, transparent: true, depthWrite: false }))
    this.floor.rotation.x = -Math.PI / 2
    this.floor.receiveShadow = true
    scene.add(this.floor)
    this.ring = new Mesh(new RingGeometry(3.0, 3.04, 96), new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.4 }))
    this.ring.rotation.x = -Math.PI / 2
    this.ring.position.y = 0.004
    scene.add(this.ring)
    const pool = radialTexture([[0, 'rgba(255,255,255,0.16)'], [1, 'rgba(255,255,255,0)']], 256)
    stage.track(pool)
    const poolMesh = this.pool = new Mesh(new CircleGeometry(4.2, 48), new MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false }))
    poolMesh.rotation.x = -Math.PI / 2
    poolMesh.position.y = 0.002
    scene.add(poolMesh)

    this.cars = new CarFactory({ physical: true })
    this.cars.setGlassEnv(stage.envRT.texture, GLASS_ENV)
    this.rig = null
    this.current = ''
    this.yaw = Math.PI - 0.6        // front three-quarter (the car faces −z)
    this.vel = 0
    this.dragging = false
    this.idle = 0
    this.dirty = true
    this.size = { w: 1, h: 1 }
    this.resize(stage.size.w, stage.size.h)
    stage.start()
  }

  /* opts: { color, rims, neon, flame, locked } */
  show(id, opts = {}) {
    const key = `${id}|${opts.color}|${opts.rims}|${opts.neon}|${opts.flame}|${!!opts.locked}`
    if (key === this.current) return
    this.current = key
    if (!this.rig || this.rig.id !== id) {
      this.rig?.dispose()
      this.rig = this.cars.create(id, { color: opts.color, rims: opts.rims, neon: opts.neon, flame: opts.flame })
      this.stage.scene.add(this.rig.root)
      this.frameCar()
      this.placeCamera()               // each model has its own length: re-fit the distance
    } else {
      this.rig.setColor(opts.color)
      this.rig.setRims(opts.rims || 'steel')
      this.rig.setNeon(opts.neon || null)
      this.rig.setFlame(opts.flame || 0)
    }
    this.rig.setSilhouette(!!opts.locked)
    this.ring.visible = !opts.locked
    this.rig.update(0, { lights: opts.locked ? 0 : 0.35 })
    this.dirty = true
    if (!this.compiled) {
      // the first car: its shaders link in the background and the stage draws once they are ready
      // (a blocking first frame froze the start page); onShown() follows that first frame
      this.compiled = true
      this.stage.precompile().then(() => { this.dirty = true; this.announce = true })
    } else this.stage.render()
  }

  /*
   * Fit the camera distance to the car and the canvas shape, with room to spare on every side:
   * the page fades the canvas edges out (the floor never ends in a hard line), the car must stay clear of that.
   */
  frameCar() {
    const m = this.rig?.model
    const L = m ? Math.max(m.L, 3.6) : 4.4
    const aspect = this.size.w / Math.max(1, this.size.h)
    const vFov = (this.camera.fov * Math.PI) / 180
    const needH = 2.35 / (2 * Math.tan(vFov / 2))
    const needW = (L * 1.24) / (2 * Math.tan(vFov / 2) * aspect)
    this.dist = Math.max(needH, needW) + 0.6
  }

  resize(w, h) {
    this.size = { w, h }
    this.dirty = true
    this.frameCar()
    this.placeCamera()
  }

  placeCamera() {
    const d = this.dist || 9
    this.camera.position.set(0, 1.55 + d * 0.06, d)
    this.camera.lookAt(LOOK)
  }

  /* drag: pointer x movement in pixels */
  drag(dx) {
    this.dragging = true
    const k = 0.012
    this.yaw += dx * k
    this.vel = dx * k * 60
    this.idle = 0
  }

  release() {
    this.dragging = false
  }

  /* → false when nothing moved (reduced motion, no drag, no spin left): the stage keeps the last picture */
  frame(dt) {
    if (!this.rig) return false
    this.idle += dt
    const was = this.yaw
    if (!this.dragging) {
      if (Math.abs(this.vel) > 1e-3) {
        this.yaw += this.vel * dt
        this.vel *= Math.exp(-dt * 3)
      } else this.vel = 0
      if (!this.reduced && this.idle > 1.5 && Math.abs(this.vel) < 0.3) this.yaw += dt * 0.32
    }
    this.rig.root.rotation.y = this.yaw
    const draw = this.dirty || this.yaw !== was
    this.dirty = false
    if (draw && this.announce && !this.stage.compiling) {
      this.announce = false            // this frame is the first picture of the car
      this.onShown?.()
    }
    return draw
  }

  /* Thumbnails with the same renderer: [{ id, color, rims, neon, locked }] → data URLs (transparent PNG). */
  snapshot(list, w = 360, h = 200) {
    const st = this.stage
    const r = st.renderer
    const prevYaw = this.yaw
    const prev = this.current
    const prevRig = this.rig
    const prevSize = { ...st.size }
    const out = []
    const cam = this.camera
    r.setPixelRatio(1)
    r.setSize(w, h, false)
    cam.aspect = w / h
    cam.updateProjectionMatrix()
    this.ring.visible = false
    this.floor.visible = false
    this.pool.visible = false
    for (const item of list) {
      const rig = this.cars.create(item.id, { color: item.color, rims: item.rims, neon: item.neon })
      rig.setSilhouette(!!item.locked)
      rig.update(0, { lights: item.locked ? 0 : 0.35 })
      rig.root.rotation.y = item.yaw ?? Math.PI - 0.62
      if (prevRig) prevRig.root.visible = false
      st.scene.add(rig.root)
      const m = rig.model
      const vFov = (cam.fov * Math.PI) / 180
      const d = Math.max(1.8 / (2 * Math.tan(vFov / 2)), (Math.max(m.L, 3.6) * 1.02) / (2 * Math.tan(vFov / 2) * (w / h))) + 0.4
      cam.position.set(0, (item.elev ?? 1.5) + d * 0.06, d)
      cam.lookAt(LOOK)
      r.render(st.scene, cam)
      out.push(st.canvas.toDataURL('image/png'))
      rig.dispose()
    }
    if (prevRig) prevRig.root.visible = true
    this.ring.visible = !!prevRig && !prevRig.silhouetted
    this.floor.visible = true
    this.pool.visible = true
    this.current = prev
    this.yaw = prevYaw
    r.setPixelRatio(st.dpr)
    st.size = { w: 0, h: 0 }
    st.resize()
    this.resize(prevSize.w, prevSize.h)
    st.render()
    return out
  }

  dispose() {
    this.rig?.dispose()
    this.cars.dispose()
    this.stage.dispose()
  }
}
