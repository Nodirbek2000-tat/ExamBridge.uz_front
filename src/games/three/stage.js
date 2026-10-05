/*
 * Stage: one WebGLRenderer + Scene with everything a game page needs around it.
 *
 *   const stage = createStage(canvas, { onFrame(dt, t), onResize(w, h), onFallback(reason) })
 *   stage.setCamera(camera); stage.start(); … stage.dispose()
 *
 * - DPR capped (1.75 by default); ResizeObserver keeps the drawing buffer in step.
 * - Auto quality: while the measured FPS stays under `minFps`, shadows go first,
 *   then resolution (onQuality(level) tells the game: 2 high · 1 no shadows · 0 low res).
 * - WebGL context loss: the loop pauses and resumes on restore (the environment
 *   map is rebuilt, onRestore() lets the game re-attach it); a second loss, a loss not
 *   restored within 3 s, or no WebGL at all calls onFallback().
 * - dispose() frees every geometry, material, texture and render target in the
 *   scene plus anything registered with track(), then the renderer and its context.
 * - stage.stats = { fps, calls, triangles, quality } after every frame.
 * - onFrame(dt, t) may return false to skip drawing that frame (nothing moved).
 * createStage() returns null when WebGL is unavailable.
 */
import {
  ACESFilmicToneMapping, PCFSoftShadowMap, PMREMGenerator, SRGBColorSpace, Scene, WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const TEXTURE_SLOTS = [
  'map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap', 'bumpMap',
  'displacementMap', 'clearcoatMap', 'clearcoatRoughnessMap', 'clearcoatNormalMap', 'specularMap', 'gradientMap',
]

/* Free a material and the textures it owns (the shared scene environment is left alone). */
export function disposeMaterial(m, keep) {
  if (!m) return
  for (const k of TEXTURE_SLOTS) if (m[k] && m[k] !== keep) m[k].dispose()
  if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u?.value?.isTexture && u.value !== keep) u.value.dispose()
  m.dispose()
}

/* Free everything under `root`: geometries, materials, textures, instanced buffers, shadow maps. */
export function disposeObject(root, keep) {
  root?.traverse?.((o) => {
    o.geometry?.dispose?.()
    if (Array.isArray(o.material)) o.material.forEach(m => disposeMaterial(m, keep))
    else disposeMaterial(o.material, keep)
    if (o.isInstancedMesh) o.dispose()
    if (o.isLight) o.dispose?.()              // a shadow-casting light owns its shadow map render target
  })
}

export function createStage(canvas, opts = {}) {
  let renderer
  try {
    renderer = new WebGLRenderer({
      canvas, antialias: opts.antialias ?? true, alpha: !!opts.alpha, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    })
  } catch {
    return null
  }
  if (!renderer.getContext()) { renderer.dispose(); return null }
  return new Stage(canvas, renderer, opts)
}

class Stage {
  constructor(canvas, renderer, opts) {
    const {
      dprCap = 1.75, shadows = true, exposure = 1, clearColor = 0x0b0b10, minFps = 45, autoQuality = true,
      onFrame = null, onResize = null, onFallback = null, onQuality = null, onLost = null, onRestore = null,
    } = opts
    this.canvas = canvas
    this.renderer = renderer
    this.scene = new Scene()
    this.camera = null
    this.handlers = { onFrame, onResize, onFallback, onQuality, onLost, onRestore }
    this.dprCap = dprCap
    this.minFps = minFps
    this.autoQuality = autoQuality
    this.wantShadows = shadows
    this.quality = shadows ? 2 : 1
    this.dpr = Math.min(window.devicePixelRatio || 1, dprCap)
    this.size = { w: 1, h: 1 }
    this.stats = { fps: 60, calls: 0, triangles: 0, quality: this.quality }
    this.tracked = new Set()
    this.running = false
    this.disposed = false
    this.compiling = 0
    this.losses = 0
    this.envRT = null
    this.envIntensity = 1
    this.raf = 0
    this.last = 0
    this.meter = { frames: 0, time: 0, slow: 0, warm: 0 }

    // reading every program's info log blocks on the shader compiler: only worth it while developing
    renderer.debug.checkShaderErrors = !!import.meta.env?.DEV
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = exposure
    renderer.shadowMap.enabled = this.quality >= 2
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.setClearColor(clearColor, opts.alpha ? 0 : 1)
    renderer.setPixelRatio(this.dpr)
    this.maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 1)

    this.lostTimer = 0
    this.onLost = (e) => {
      e.preventDefault()
      this.losses++
      this.pauseLoop()
      clearTimeout(this.lostTimer)
      if (this.losses >= 2) { this.handlers.onFallback?.('context-lost'); return }
      this.handlers.onLost?.()
      // some mobile GPUs never give the context back: don't leave the game frozen on the last frame
      this.lostTimer = setTimeout(() => {
        if (this.disposed || this.losses >= 2 || !this.renderer.getContext().isContextLost?.()) return
        this.losses = 2
        this.handlers.onFallback?.('context-timeout')
      }, 3000)
    }
    this.onRestored = () => {
      clearTimeout(this.lostTimer)
      if (this.disposed || this.losses >= 2) return
      if (this.envRT) this.useRoomEnvironment(this.envIntensity, true)
      this.handlers.onRestore?.()
      if (this.running) this.resumeLoop()
    }
    canvas.addEventListener('webglcontextlost', this.onLost, false)
    canvas.addEventListener('webglcontextrestored', this.onRestored, false)

    this.resize = this.resize.bind(this)
    this.ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(this.resize) : null
    this.ro?.observe(canvas)
    window.addEventListener('resize', this.resize)
    this.resize()
  }

  /* Studio-like reflections for PBR materials (RoomEnvironment through PMREM). */
  useRoomEnvironment(intensity = 1, rebuild = false) {
    this.envIntensity = intensity
    if (!this.envRT || rebuild) {
      this.envRT?.dispose()
      const pmrem = new PMREMGenerator(this.renderer)
      const room = new RoomEnvironment()
      this.envRT = pmrem.fromScene(room, 0.04)
      room.dispose?.()
      pmrem.dispose()
    }
    this.scene.environment = this.envRT.texture
    this.scene.environmentIntensity = intensity
    return this.envRT.texture
  }

  setCamera(camera) {
    this.camera = camera
    this.resize()
  }

  /* Register anything with dispose() (textures, render targets, pooled objects outside the scene). */
  track(...items) {
    for (const it of items) if (it) this.tracked.add(it)
    return items[0]
  }

  setShadows(on) {
    const r = this.renderer
    if (r.shadowMap.enabled === on) return
    r.shadowMap.enabled = on
    // materials compile with / without shadow maps
    this.scene.traverse((o) => {
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
      for (const m of ms) m.needsUpdate = true
    })
  }

  setQuality(level) {
    level = Math.max(0, Math.min(2, level))
    if (level === this.quality) return
    this.quality = level
    this.stats.quality = level
    this.setShadows(level >= 2 && this.wantShadows)
    const dpr = Math.min(window.devicePixelRatio || 1, this.dprCap)
    this.dpr = level === 0 ? Math.max(0.75, Math.min(1, dpr * 0.7)) : dpr
    this.resize()
    this.meter.warm = 2.5
    this.handlers.onQuality?.(level)
  }

  resize() {
    if (this.disposed) return
    const r = this.canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width))
    const h = Math.max(1, Math.round(r.height))
    if (this.renderer.getPixelRatio() !== this.dpr) this.renderer.setPixelRatio(this.dpr)
    const changed = w !== this.size.w || h !== this.size.h
    this.size = { w, h }
    this.renderer.setSize(w, h, false)
    if (this.camera?.isPerspectiveCamera) {
      this.camera.aspect = w / h
      this.camera.updateProjectionMatrix()
    }
    if (changed) this.meter.warm = Math.max(this.meter.warm, 1)
    this.handlers.onResize?.(w, h)
    if (!this.running) this.render()
  }

  /*
   * Compile every material in the scene without blocking the page (KHR_parallel_shader_compile;
   * without it the programs count as ready at once and the first frame compiles as before).
   * Drawing waits until they are linked (at most maxMs) — the loop keeps calling onFrame — so the
   * first frame does not freeze the page for the shader compiler. → Promise<boolean> (false: disposed / lost)
   */
  precompile(maxMs = 4000) {
    const r = this.renderer
    if (this.disposed || !this.camera || r.getContext().isContextLost?.()) return Promise.resolve(false)
    let mats
    try { mats = r.compile(this.scene, this.camera) } catch { return Promise.resolve(false) }
    this.compiling++
    const t0 = performance.now()
    return new Promise((resolve) => {
      const done = (ok) => {
        this.compiling--
        this.meter.warm = Math.max(this.meter.warm, 1.5)       // the first real frames are not a trend
        resolve(ok)
      }
      const check = () => {
        if (this.disposed || r.getContext().isContextLost?.()) { done(false); return }
        for (const m of mats) {
          const p = r.properties.get(m).currentProgram
          if (!p || p.isReady()) mats.delete(m)
        }
        if (!mats.size || performance.now() - t0 > maxMs) done(true)
        else setTimeout(check, 16)
      }
      check()
    })
  }

  render() {
    if (this.disposed || !this.camera || this.compiling > 0 || this.losses >= 2 || this.renderer.getContext().isContextLost?.()) return
    this.renderer.render(this.scene, this.camera)
    const info = this.renderer.info.render
    this.stats.calls = info.calls
    this.stats.triangles = info.triangles
  }

  start() {
    if (this.running || this.disposed) return
    this.running = true
    this.meter.warm = 2.5
    this.resumeLoop()
  }

  stop() {
    this.running = false
    this.pauseLoop()
  }

  resumeLoop() {
    if (this.raf || this.disposed) return
    this.last = 0
    const loop = (now) => {
      this.raf = requestAnimationFrame(loop)
      const dt = this.last ? (now - this.last) / 1000 : 0
      this.last = now
      this.measure(dt)
      // onFrame may return false: nothing changed, keep the last picture (a paused game)
      if (this.handlers.onFrame?.(dt, now / 1000) !== false) this.render()
    }
    this.raf = requestAnimationFrame(loop)
  }

  pauseLoop() {
    if (this.raf) cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  /* FPS over one-second windows; two slow windows in a row → one quality step down. */
  measure(dt) {
    const m = this.meter
    if (!(dt > 0) || dt > 0.25) return            // a hidden tab or a hitch, not a trend
    if (m.warm > 0) { m.warm -= dt; return }
    m.frames++
    m.time += dt
    if (m.time < 1) return
    const fps = m.frames / m.time
    this.stats.fps = Math.round(fps)
    m.frames = 0
    m.time = 0
    if (!this.autoQuality || this.paused) return
    m.slow = fps < this.minFps ? m.slow + 1 : 0
    if (m.slow >= 2 && this.quality > 0) {
      m.slow = 0
      this.setQuality(this.quality - 1)
    }
  }

  dispose() {
    if (this.disposed) return
    this.stop()
    this.disposed = true
    clearTimeout(this.lostTimer)
    this.ro?.disconnect()
    window.removeEventListener('resize', this.resize)
    this.canvas.removeEventListener('webglcontextlost', this.onLost, false)
    this.canvas.removeEventListener('webglcontextrestored', this.onRestored, false)
    const env = this.envRT?.texture
    disposeObject(this.scene, env)
    for (const it of this.tracked) {
      if (it.isObject3D) disposeObject(it, env)
      else it.dispose?.()
    }
    this.tracked.clear()
    this.scene.environment = null
    this.envRT?.dispose()
    this.envRT = null
    const lost = this.renderer.getContext().isContextLost?.()
    this.renderer.dispose()
    if (!lost) this.renderer.forceContextLoss?.()
  }
}
