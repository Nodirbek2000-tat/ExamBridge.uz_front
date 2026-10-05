/*
 * TOBY RUN in 3D (RUNNER_PLAN §B9.2): one Stage, the light presets blended per biome, the chase camera,
 * the runner (Toby, or Lola / Bek) on the equipped carpet, the track, the world (biomes, skyline,
 * Bekat set), obstacles, coins and pickups, the balloon, Shovqin, effects and the item pictures. Each
 * frame it advances the engine (the game's own clock) and mirrors the engine's world into the scene —
 * the engine stays the single source of truth.
 *
 *   const scene = createRunnerScene(canvas, { gameRef, reduced, autoQuality, onFallback, attract })   // null without WebGL
 *   scene.dispose()
 * window.__rnStats = { fps, calls, triangles, quality, mode, cpu, step } (tests).
 *
 * Track position s ↔ world z: Toby stays at z = 0, the world streams toward +z (z = −(s − dist)).
 */
import { Color, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { createStage } from '../../../../games/three/stage'
import { Environment } from '../../../../games/three/environment'
import { ChaseCamera } from '../../../../games/three/camera'
import { InstancedBatch, atlasCellMaterial } from '../../../../games/three/instancing'
import { radialTexture } from '../../../../games/three/textures'
import { buildToby } from '../../../../games/three/toby3d'
import { CARPETS } from '../../../../games/three/ornaments'
import { TrackView } from './track3d'
import { World } from './world'
import { ObstacleView } from './obstacles'
import { PickupView } from './pickups'
import { Balloon } from './balloon'
import { Shovqin } from './shovqin'
import { Fx } from './fx'
import { PictureAtlas } from './pictureAtlas'
import { AtlasBuilder, SceneKit } from './kit'
import { BIOME_LOOK, biomeBlend } from './biomes'

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (t) => t * t * (3 - 2 * t)
const TUNNEL = new Color('#8a6d4a')
const GILAM_GLOW = new Color('#F5B14C')
const NO_GLOW = new Color('#000000')
// while riding: back and up, looking a little upward so Toby and his balloon sit mid-frame under the card
const RIDE_FRAME = { back: 8.4, up: 2.5, ahead: 10, lookUp: 3.7 }
// phones (portrait): the card sits at the bottom, so Toby and the balloon ride in the upper half
const RIDE_FRAME_P = { back: 9.0, up: 2.6, ahead: 10, lookUp: 3.0 }
const _side = new Vector3()
const _look = new Vector3()

/* the carpet under the runner's feet: a soft rug with tassels, its top an ornament cell */
function carpetGeometry(key) {
  const b = new AtlasBuilder()
  b.box(0.84, 0.03, 1.16, { color: '#5b3a2a' })
  b.plane(0.84, 1.16, { at: [0, 0.017, 0], rot: [-Math.PI / 2, 0, 0], cell: key })
  for (const z of [-0.6, 0.6]) for (let i = 0; i < 6; i++) b.box(0.035, 0.012, 0.09, { at: [-0.34 + i * 0.136, 0.0, z * 1.04], color: '#F6EBD9' })
  return b.build({ crease: 20 })
}

export function createRunnerScene(canvas, opts) {
  const s = new RunnerScene(canvas, opts)
  return s.ok ? s : null
}

class RunnerScene {
  constructor(canvas, { gameRef, reduced = false, onFallback = null, autoQuality = true, attract = false }) {
    this.gameRef = gameRef
    this.reduced = reduced
    this.attract = attract
    const phone = Math.min(window.innerWidth, window.innerHeight) < 600
    const stage = createStage(canvas, {
      shadows: true, dprCap: phone ? 1.5 : 1.75, minFps: 45, autoQuality, exposure: 1,
      onFrame: (dt) => this.frame(dt),
      onFallback: (why) => onFallback?.(why),
    })
    this.ok = !!stage
    if (!stage) return
    this.stage = stage
    stage.useRoomEnvironment(0.55)
    this.env = new Environment(stage, { shadows: true, shadowSize: 1024, shadowBox: 12 })
    this.rig = new ChaseCamera({
      portrait: { back: 5.2, up: 2.6, ahead: 9, lookUp: 0.75, fov: 62 },
      landscape: { back: 5.6, up: 2.4, ahead: 9, lookUp: 0.9, fov: 55 },
      near: 0.2, far: 420, stiffness: 7,
    })
    stage.setCamera(this.rig.camera)
    this.base = { ...this.rig.frame }
    stage.handlers.onResize = (w, h) => { this.rig.resize(w, h); this.base = { ...this.rig.frame } }
    this.rig.resize(stage.size.w, stage.size.h)
    this.base = { ...this.rig.frame }

    const game0 = gameRef.current
    this.kit = new SceneKit()
    stage.track(this.kit)
    this.track = new TrackView(stage, this.kit)
    this.world = new World(stage, this.kit)
    this.obstacles = new ObstacleView(stage)
    this.pickups = new PickupView(stage)
    this.balloon = new Balloon(stage)
    this.shovqin = new Shovqin(stage)
    this.fx = new Fx(stage, { reduced })
    // the item pictures (balloon face, arch crest, Listen balloons): one batch over the picture atlas
    this.atlas = new PictureAtlas(stage.renderer)
    stage.track(this.atlas)
    this.pics = new InstancedBatch(new PlaneGeometry(1, 1), atlasCellMaterial(new MeshBasicMaterial({
      map: this.atlas.texture, transparent: true, depthWrite: false, toneMapped: false,
    })), 8, { cells: true })
    this.pics.renderOrder = 4
    stage.scene.add(this.pics)

    this.toby = buildToby({ outfit: game0?.outfit || '', who: game0?.runner || 'toby' })
    stage.scene.add(this.toby.root)
    stage.track({ dispose: () => this.toby.dispose() })
    this.carpetMat = this.kit.atlasMaterial({ roughness: 0.85, emissive: '#000000' })
    this.carpet = new Mesh(carpetGeometry('carpet-klassik'), this.carpetMat)
    this.carpet.castShadow = true
    this.carpetKey = ''
    stage.scene.add(this.carpet)
    // a soft contact shadow under Toby (always on, cheap; real shadows only at quality 2)
    this.blob = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(0,0,0,0.45)'], [0.6, 'rgba(0,0,0,0.18)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false,
    }))
    this.blob.rotation.x = -Math.PI / 2
    this.blob.renderOrder = 1
    stage.scene.add(this.blob)

    this.view = { blend: { dark: 0, dt: 0, tint: TUNNEL }, target: { x: 0, y: 0, z: 0, lean: 0 }, cam: { shake: 0, fovKick: 0, follow: 0.55 } }
    this.mix = { a: 'metro', b: 'metro', k: 0 }
    this.prev = { x: 0, rideK: 0, sideK: 0, orbit: 0 }
    this.statT = 0
    this.wantT = 0
    this.cpu = 0
    this.stepMs = 0
    this.outfit = null
    this.tobyArgs = { state: 'idle', t: 0, speed: 0 }       // reused every frame
    if (window.__rnQuality != null) stage.setQuality(window.__rnQuality)
    if (window.__rnDebug) window.__rnScene = this
    // every program now (in parallel where the GPU allows), so the first balloon, pop, picture or crash
    // never stalls a frame on the shader compiler
    stage.precompile(3000)
    stage.start()
  }

  frame(dt) {
    const game = this.gameRef.current
    if (!game) return false
    const t0 = performance.now()
    game.step(dt)
    const t1 = performance.now()
    if (game.paused || game.halted) return this.idle ? false : (this.idle = true)
    this.idle = false
    this.sync(game, Math.min(dt, 0.05))
    this.cpu += (performance.now() - t1 - this.cpu) * 0.1
    this.stepMs += (t1 - t0 - this.stepMs) * 0.1
    this.statT += dt
    if (this.statT > 0.5) {
      this.statT = 0
      const s = this.stage.stats
      window.__rnStats = {
        fps: s.fps, calls: s.calls, triangles: s.triangles, quality: s.quality, mode: '3d',
        cpu: Math.round(this.cpu * 100) / 100, step: Math.round(this.stepMs * 100) / 100,
      }
    }
    return true
  }

  /* pictures the next moments will need, drawn ahead (≥ 2 s before) */
  prefetchPictures(game) {
    const d = game.director
    if (!d?.deck) return
    const names = []
    if (d.reserved?.picture) names.push(d.reserved.picture)
    for (const it of d.deck.peek(4)) if (it.picture) names.push(it.picture)
    for (const c of game.choices) if (c.picture) names.push(c.picture)
    this.atlas.want(names)
  }

  sync(game, dt) {
    const p = game.player
    const V = this.view
    const P = this.prev

    // light and air: the biome under Toby, the next one blending in before the switch past a Bekat
    const mix = biomeBlend(game, this.mix)
    const A = BIOME_LOOK[mix.a]
    const B = BIOME_LOOK[mix.b]
    V.blend.dt = dt
    V.blend.dark = A.dark + (B.dark - A.dark) * mix.k
    this.env.blend(A.env, B.env, smooth(mix.k), V.blend)
    // night: a soft cool fill so Toby and the obstacles stay readable (the preset's moonlight is dim)
    const fill = A.lift + (B.lift - A.lift) * smooth(mix.k)
    if (fill > 0) this.env.hemi.intensity = Math.max(this.env.hemi.intensity, fill)

    // the runner and the carpet
    if (this.outfit !== (game.outfit || '')) { this.outfit = game.outfit || ''; this.toby.setOutfit(this.outfit) }
    const vx = dt > 0 ? (p.x - P.x) / dt : 0
    P.x = p.x
    this.toby.root.rotation.y = clamp(-vx * 0.03, -0.35, 0.35)
    const ground = this.track.groundUnder(game, p)
    const onCarpet = this.syncCarpet(game, p, ground)
    this.toby.root.position.set(p.x, p.y + onCarpet, 0)
    const ta = this.tobyArgs
    ta.state = game.status === 'ready' ? 'idle' : p.state
    ta.t = p.t
    ta.speed = game.speed
    this.toby.update(dt, ta)
    const shield = p.shield > 0
    this.blob.position.set(p.x, ground + 0.02, 0.05)
    const lift = clamp(p.y - ground, 0, 6)
    const bs = 0.95 * (1 - lift / 8)
    this.blob.scale.set(bs, bs * 0.75, 1)
    this.blob.material.opacity = 1 - lift / 7

    // camera: behind Toby; higher and further back while riding; to the side at a Bekat; orbit before the start
    const riding = game.phase === 'ride' ? 1 : 0
    P.rideK += (riding - P.rideK) * (1 - Math.exp(-3 * dt))
    const station = game.phase === 'station' || game.phase === 'brake' ? 1 : 0
    P.sideK += (station - P.sideK) * (1 - Math.exp(-(station ? 2.6 : 3.5) * dt))
    const f = this.rig.frame
    const b = this.base
    const k = smooth(clamp(P.rideK))
    const R = this.rig.camera.aspect < 0.8 ? RIDE_FRAME_P : RIDE_FRAME
    f.back = b.back + (R.back - b.back) * k
    f.up = b.up + (R.up - b.up) * k
    f.ahead = b.ahead + (R.ahead - b.ahead) * k
    f.lookUp = b.lookUp + (R.lookUp - b.lookUp) * k
    const T = V.target
    T.x = p.x
    T.y = p.y
    T.lean = this.reduced ? 0 : clamp(-vx * 0.004, -0.04, 0.04)
    const hitAgo = game.clock - game.fx.hitT
    V.cam.shake = !this.reduced && hitAgo >= 0 && hitAgo < 0.35 ? 1 - hitAgo / 0.35 : 0
    V.cam.fovKick = this.reduced ? 0 : game.powers.magnet > game.clock ? 2 : 0
    this.rig.update(dt, T, V.cam)
    const cam = this.rig.camera
    if (game.status === 'ready' || P.sideK > 0.001) {
      P.orbit += dt * (this.reduced ? 0.05 : 0.16)
      const ready = game.status === 'ready'
      if (ready) {
        // attract mode: a slow swing in front of Toby (a three-quarter view of his face)
        const a = 0.95 + Math.sin(P.orbit) * 0.5
        _side.set(p.x + Math.sin(a) * 4.7, 1.8, -Math.cos(a) * 4.7)
        _look.set(p.x - 0.55, 0.85, -0.9)
      } else {
        // the Bekat: from the far side of the tracks, Toby in profile with the platform behind him
        // (phones: Toby higher in the frame — the panel takes the bottom)
        const tall = this.rig.camera.aspect < 0.8
        _side.set(Math.max(-5.7, p.x - 5.2), tall ? 1.9 : 2.2, tall ? -0.5 : 0.7)
        _look.set(p.x + 1.3, tall ? 0.45 : 1.0, tall ? 0.15 : 1.9)
      }
      const sk = ready ? 1 : smooth(clamp(P.sideK))
      cam.position.lerp(_side, sk)
      cam.lookAt(_look)
    }
    T.x = p.x * 0.5
    T.y = 0
    T.z = -6
    this.env.follow(cam.position, T)
    T.z = 0

    // the world
    this.wantT -= dt
    if (this.wantT <= 0) { this.wantT = 0.5; this.prefetchPictures(game) }
    this.atlas.tick(game.clock)
    this.pics.begin()
    this.track.update(game, dt)
    this.world.update(game, dt, cam, mix)
    this.obstacles.update(game, dt)
    this.pickups.update(game, dt, this.pics, this.atlas)
    this.balloon.update(game, dt, this.pics, this.atlas)
    this.pics.end()
    this.shovqin.update(game, dt, cam)
    this.fx.update(game, dt, this.balloon.pos)
    this.pickups.shieldAt(p, game.clock, shield)
  }

  /* → how far the runner stands above his track height (the carpet's thickness and hover) */
  syncCarpet(game, p, ground) {
    const key = CARPETS.some(c => c.key === game.carpet) ? game.carpet : ''
    if (key !== this.carpetKey) {
      this.carpetKey = key
      if (key) {
        this.carpet.geometry.dispose()
        this.carpet.geometry = carpetGeometry(key)
      }
    }
    const state = game.status === 'ready' ? 'idle' : p.state
    const hide = !key || game.phase === 'ride' || state === 'crash' || state === 'stand' || state === 'roll'
    this.carpet.visible = !hide
    if (hide) return 0
    const t = game.clock
    const gilam = game.powers.gilam > t
    const air = Math.max(0, p.y - ground)
    const hover = 0.05 + (this.reduced ? 0 : Math.sin(t * 5.2) * 0.012) + (gilam ? 0.08 : 0)
    this.carpet.position.set(p.x, p.y - (air > 0.05 ? 0.02 : 0) + hover, 0.06)
    this.carpet.rotation.set(this.reduced ? 0 : Math.sin(t * 7.5) * 0.035, this.toby.root.rotation.y, this.reduced ? 0 : Math.sin(t * 3.1) * 0.02)
    const sc = gilam ? 1.22 : 1
    this.carpet.scale.set(sc, 1, sc)
    this.carpetMat.emissive.copy(gilam ? GILAM_GLOW : NO_GLOW)
    this.carpetMat.emissiveIntensity = gilam ? 0.25 + Math.sin(t * 8) * 0.1 : 0
    return hover + 0.03
  }

  dispose() {
    if (!this.stage) return
    this.stage.dispose()
    this.stage = null
    if (window.__rnStats?.mode === '3d') window.__rnStats = null
    if (window.__rnScene === this) window.__rnScene = null
  }
}
