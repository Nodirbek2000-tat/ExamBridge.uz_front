/*
 * VOICE DRIVE in 3D: one Stage (renderer, resize, auto quality, context loss),
 * the sky / light presets, the chase camera, the player's car, the road,
 * scenery, props and effects. Each frame it advances the engine (the game's own
 * clock) and mirrors the engine's world into the scene — the engine stays the
 * single source of truth, exactly as with the 2D canvas road.
 *
 *   const scene = createDriveScene(canvas, { gameRef, reduced, onFallback, onReady })   // null without WebGL
 *   scene.dispose()
 * The shaders compile in the background (no frozen page after Start); onReady() fires with the
 * first frame drawn. Traffic models and pooled props are made ahead while the browser is idle.
 * window.__vdStats = { fps, calls, triangles, quality } (for tests).
 */
import { Color } from 'three'
import { createStage } from '../../../../games/three/stage'
import { Environment } from '../../../../games/three/environment'
import { ChaseCamera } from '../../../../games/three/camera'
import { CarFactory } from '../../../../games/three/carRig'
import { carLook } from '../cars'
import { CAR_Z } from '../engine'
import { Road } from './road'
import { Scenery } from './scenery'
import { Props } from './props'
import { Fx } from './fx'
import { HY, LANE, ZS, themeOf, zOf } from './world'

const SODIUM = new Color('#ffb46a')          // tunnel lamps tint the air inside
const GLASS_ENV = 0.27                       // car glass reflects this share of the scene's environment light
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))
const smooth = (t) => t * t * (3 - 2 * t)
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2)

export function createDriveScene(canvas, opts) {
  const s = new DriveScene(canvas, opts)
  return s.ok ? s : null
}

class DriveScene {
  constructor(canvas, { gameRef, reduced = false, onFallback = null, onReady = null, autoQuality = true }) {
    this.gameRef = gameRef
    this.reduced = reduced
    const stage = createStage(canvas, {
      shadows: true, dprCap: 1.75, minFps: 45, autoQuality, exposure: 1,
      onFrame: (dt) => this.frame(dt),
      onFallback: (why) => onFallback?.(why),
    })
    this.ok = !!stage
    if (!stage) return
    this.stage = stage
    stage.useRoomEnvironment(0.7)
    this.env = new Environment(stage, { shadows: true, shadowSize: 1024, shadowBox: 16 })
    this.rig = new ChaseCamera({
      portrait: { back: 8.6, up: 3.5, ahead: 13, lookUp: 0.1, fov: 60 },
      landscape: { back: 8.4, up: 3.0, ahead: 17, lookUp: 0.9, fov: 44 },
      near: 0.3, far: 700, stiffness: 6,
    })
    stage.setCamera(this.rig.camera)
    const resize = stage.handlers.onResize
    stage.handlers.onResize = (w, h) => { this.rig.resize(w, h); resize?.(w, h) }
    this.rig.resize(stage.size.w, stage.size.h)
    this.cars = new CarFactory({ physical: true })
    stage.track(this.cars)
    // car glass on the road: a soft, dim reflection (full strength mirrored the room light boxes — white rear windows)
    this.glass = this.cars.material('glass')
    this.glass.roughness = 0.14
    this.cars.setGlassEnv(stage.envRT.texture, GLASS_ENV * 0.75)
    stage.handlers.onRestore = () => this.cars.setGlassEnv(stage.envRT.texture, this.glass.envMapIntensity)
    this.road = new Road(stage)
    this.scenery = new Scenery(stage)
    this.props = new Props(stage, this.cars, this.scenery)
    this.fx = new Fx(stage, this.rig.camera)
    this.player = null
    this.prev = { x: 0, speed: 0, a: 0, yaw: 0 }
    // the per-frame "views" handed to the parts, reused (no allocation per frame)
    this.v = {
      blend: { dark: 0, dt: 0, tint: SODIUM },
      car: { speed: 0, steer: 0, roll: 0, pitch: 0, brake: 0, lights: 0, boost: 0, t: 0 },
      target: { x: 0, y: 0, z: 0, lean: 0 },
      cam: { shake: 0, fovKick: 0, follow: 0.55 },
      road: { carPos: 0, themeA: 'day', themeB: 'day', boundaryZ: null, wet: 0, t: 0 },
      world: { carPos: 0, t: 0, night: 0 },
      fx: { carPos: 0, t: 0, car: { x: 0, y: 0, L: 4, W: 1.8, H: 1.4 }, lights: 0, tunnel: 0, night: 0, rain: 0, snow: 0, speed: 0, steer: 0, reduced: false },
    }
    this.idle = false
    this.statT = 0
    this.cpu = 0
    if (window.__vdQuality != null) stage.setQuality(window.__vdQuality)
    if (window.__vdDebug) window.__vdScene = this          // tests: renderer.info, forced quality / fallback
    if (gameRef.current) this.ensurePlayer(gameRef.current)
    // the shaders link in the background; the loop runs (the engine keeps time) and draws once they are ready
    this.onReady = onReady
    this.shown = false
    stage.precompile()
    stage.start()
    // while the ready card is up: build the traffic models and compile every shader (no hitch on the first van / tunnel)
    this.warmId = window.requestIdleCallback ? window.requestIdleCallback(() => this.warm(), { timeout: 1500 }) : setTimeout(() => this.warm(), 400)
  }

  warm() {
    this.warmId = 0
    if (!this.stage) return
    this.road.prewarm()
    this.props.prewarm()
    const { renderer, scene, camera } = this.stage
    if (renderer.getContext().isContextLost?.()) return
    // compile() only starts the GPU work (the browser links in the background); compileAsync()'s
    // polling would throw if the scene were disposed while it waits
    renderer.compile(scene, camera)
  }

  frame(dt) {
    const game = this.gameRef.current
    if (!game) return false
    game.frame(dt)
    if (game.paused || game.halted) {
      if (this.idle) return false
      this.idle = true
    } else this.idle = false
    const t0 = performance.now()
    this.sync(game, Math.min(dt, 0.05))
    this.cpu += (performance.now() - t0 - this.cpu) * 0.1
    if (!this.shown && !this.stage.compiling) {
      this.shown = true                          // this frame is the first one drawn
      this.onReady?.()
    }
    this.statT += dt
    if (this.statT > 0.5) {
      this.statT = 0
      const s = this.stage.stats
      window.__vdStats = { fps: s.fps, calls: s.calls, triangles: s.triangles, quality: s.quality, cpu: Math.round(this.cpu * 100) / 100, mode: '3d' }
    }
    return true
  }

  ensurePlayer(game) {
    if (this.player) return this.player
    const cs = game.carSetup
    const look = carLook(cs.id, [cs.engine, cs.turbo])
    this.player = this.cars.create(cs.id, { ...look, castShadow: true })
    this.stage.scene.add(this.player.root)
    return this.player
  }

  sync(game, dt) {
    const t = game.clock
    const carPos = game.dist + CAR_Z
    const prev = this.prev

    // themes: the zone under the car, the next one blending in over the last ~180 m
    const themeA = game.themeAt(carPos)
    const next = game.nextZone(carPos)
    const themeB = next ? next.theme : themeA
    const kB = next ? smooth(clamp(1 - (next.from - carPos) / 90)) : 0
    const A = themeOf(themeA)
    const B = themeOf(themeB)
    const V = this.v
    V.blend.dark = game.tunnelDark
    V.blend.dt = dt
    this.env.blend(A.env, B.env, kB, V.blend)
    this.glass.envMapIntensity = this.stage.scene.environmentIntensity * GLASS_ENV
    const st = this.env.state
    const night = clamp(st.night)

    // the player's car
    const rig = this.ensurePlayer(game)
    const c = game.car
    const x = (c.x + c.jx) * LANE
    const y = c.y * HY
    const speed = game.v * ZS
    const vx = dt > 0 ? (x - prev.x) / dt : 0
    prev.x = x
    const acc = dt > 0 ? (speed - prev.speed) / dt : 0
    prev.speed = speed
    prev.a += (acc - prev.a) * Math.min(1, dt * 6)
    let yaw = Math.atan2(-vx, Math.max(6, speed)) * 0.9
    let spin = 0
    if (c.fx?.kind === 'spin') spin = easeInOut(clamp((t - c.fx.t0) / 1.1)) * Math.PI * 2
    if (c.fx?.kind === 'hit') yaw += c.rot * 0.5
    prev.yaw += (yaw - prev.yaw) * Math.min(1, dt * 10)
    rig.root.position.set(x, y, 0)
    rig.root.rotation.set(0, prev.yaw + spin, 0)
    const autoLights = (A.lit ? 1 - kB : 0) + (B.lit ? kB : 0) > 0.5 || night > 0.55
    const lights = game.status !== 'over' && (autoLights || game.lightsOn) ? 1 : 0
    const boost = t < game.fx.boostUntil ? 1 : 0
    const steer = clamp(-vx * 0.06, -0.45, 0.45)
    const cs = V.car
    cs.speed = speed
    cs.steer = steer
    cs.roll = clamp(c.rot * 0.55, -0.09, 0.09)
    cs.pitch = clamp(prev.a * 0.0028, -0.045, 0.025)
    cs.brake = game.braking ? 1 : 0
    cs.lights = lights
    cs.boost = boost
    cs.t = t
    rig.update(dt, cs)

    // camera: follows the car, leans a little with it, shakes on hits, widens while boosting
    const sh = t - game.fx.shakeT0
    const tg = V.target
    tg.x = x
    tg.y = y
    tg.lean = this.reduced ? 0 : -prev.yaw * 0.12
    V.cam.shake = !this.reduced && sh >= 0 && sh < 0.45 ? (1 - sh / 0.45) * game.fx.shakePow : 0
    V.cam.fovKick = boost ? 7 : 0
    this.rig.update(dt, tg, V.cam)
    const cam = this.rig.camera
    tg.x = x * 0.5                     // the sun's shadow box: a little ahead of the car
    tg.y = 0
    tg.z = -7
    this.env.follow(cam.position, tg)
    tg.z = 0

    // the world
    const rv = V.road
    rv.carPos = carPos
    rv.themeA = themeA
    rv.themeB = themeB
    rv.boundaryZ = next ? zOf(next.from, carPos) : null
    rv.wet = st.wet
    rv.t = t
    this.road.update(game, rv)
    const wv = V.world
    wv.carPos = carPos
    wv.t = t
    wv.night = night
    this.scenery.begin()
    this.scenery.fill(game, wv)
    this.props.update(game, wv)
    this.scenery.end()
    const m = rig.model
    const fv = V.fx
    fv.carPos = carPos
    fv.t = t
    fv.car.x = x
    fv.car.y = y
    fv.car.L = m.L
    fv.car.W = m.W
    fv.car.H = m.H
    fv.lights = lights
    fv.tunnel = game.tunnelDark
    fv.night = night
    fv.rain = st.rain
    fv.snow = st.snow
    fv.speed = speed
    fv.steer = steer
    fv.reduced = this.reduced
    this.fx.update(game, fv, dt)
  }

  dispose() {
    if (!this.stage) return
    if (this.warmId) (window.cancelIdleCallback && window.requestIdleCallback ? window.cancelIdleCallback(this.warmId) : clearTimeout(this.warmId))
    this.fx.dispose()
    this.player?.dispose()
    this.stage.dispose()
    this.stage = null
    if (window.__vdStats?.mode === '3d') window.__vdStats = null
    if (window.__vdScene === this) window.__vdScene = null
  }
}
