/*
 * Light, sky and air for an outdoor scene: six presets (day, sunset, night,
 * rain, snow, desert) and a studio. A preset sets the sky gradient (with sun /
 * moon disc and stars), fog, a hemisphere + sun light pair, the environment-map
 * strength (RoomEnvironment reflections) and the exposure.
 *
 *   const env = new Environment(stage, { shadows: true })
 *   env.blend('day', 'sunset', k, { dark })      // every frame; cross-fades two presets
 *   env.follow(target)                           // sky, clouds and the sun's shadow box ride with the player
 *   env.state → { night, wet, rain, snow, stars, dark }  for the game (street lights, wet road…)
 */
import {
  BackSide, Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry,
  ShaderMaterial, SphereGeometry, Vector3,
} from 'three'
import { InstancedBatch } from './instancing'
import { canvasTexture } from './textures'
import { seeded } from './random'

export const ENV_PRESETS = {
  day: {
    top: '#2f6fd0', mid: '#71b3ee', horizon: '#d9ecfb',
    sun: '#fff1dc', sunI: 2.7, elev: 46, azim: -32,
    hemiSky: '#cfe6ff', hemiGround: '#6b6a4f', hemiI: 0.95,
    fog: '#cfe3f5', fogNear: 55, fogFar: 175,
    envI: 0.75, exposure: 1.0, disc: '#fffbe8', discSize: 0.012, glow: 0.35,
    clouds: '#ffffff', cloudA: 0.9, cloudN: 9, night: 0, wet: 0, rain: 0, snow: 0, stars: 0,
  },
  sunset: {
    top: '#1d1847', mid: '#8c3f7d', horizon: '#ffa36c',
    sun: '#ffb070', sunI: 2.3, elev: 8, azim: 4,
    hemiSky: '#ffb38f', hemiGround: '#38283d', hemiI: 0.75,
    fog: '#d98a78', fogNear: 45, fogFar: 165,
    envI: 0.6, exposure: 1.02, disc: '#ffd9a0', discSize: 0.03, glow: 0.9,
    clouds: '#ffb4a2', cloudA: 0.55, cloudN: 7, night: 0.35, wet: 0, rain: 0, snow: 0, stars: 0,
  },
  night: {
    top: '#02040b', mid: '#08122c', horizon: '#1a2a58',
    sun: '#8fa6ff', sunI: 0.3, elev: 38, azim: 38,
    hemiSky: '#24345e', hemiGround: '#07080d', hemiI: 0.16,
    fog: '#0c1430', fogNear: 25, fogFar: 150,
    envI: 0.07, exposure: 1.0, disc: '#eef2ff', discSize: 0.009, glow: 0.18,
    clouds: '#1b2346', cloudA: 0.0, cloudN: 0, night: 1, wet: 0, rain: 0, snow: 0, stars: 1, moon: 1,
  },
  rain: {
    top: '#3a424f', mid: '#5c6676', horizon: '#8e98a6',
    sun: '#e3e9f2', sunI: 0.8, elev: 55, azim: -20,
    hemiSky: '#b5bfcc', hemiGround: '#3c4238', hemiI: 1.05,
    fog: '#7d8794', fogNear: 18, fogFar: 115,
    envI: 0.6, exposure: 1.0, disc: '#cfd6df', discSize: 0.0, glow: 0.0,
    clouds: '#5a616c', cloudA: 0.95, cloudN: 14, night: 0.3, wet: 1, rain: 1, snow: 0, stars: 0,
  },
  snow: {
    top: '#7aa0d4', mid: '#b6cde9', horizon: '#eef3fa',
    sun: '#ffffff', sunI: 2.1, elev: 28, azim: 30,
    hemiSky: '#e8f1ff', hemiGround: '#c5d0df', hemiI: 1.1,
    fog: '#e3ebf5', fogNear: 25, fogFar: 130,
    envI: 0.8, exposure: 0.96, disc: '#ffffff', discSize: 0.012, glow: 0.3,
    clouds: '#ffffff', cloudA: 0.8, cloudN: 10, night: 0, wet: 0, rain: 0, snow: 1, stars: 0,
  },
  desert: {
    top: '#2a7bd0', mid: '#86c1ec', horizon: '#fbe4c0',
    sun: '#fff0d4', sunI: 3.0, elev: 54, azim: -58,
    hemiSky: '#d2e7ff', hemiGround: '#c49a63', hemiI: 0.9,
    fog: '#f1dab6', fogNear: 60, fogFar: 185,
    envI: 0.8, exposure: 0.98, disc: '#fffbe8', discSize: 0.013, glow: 0.5,
    clouds: '#ffffff', cloudA: 0.45, cloudN: 4, night: 0, wet: 0, rain: 0, snow: 0, stars: 0,
  },
  studio: {
    top: '#0b0b10', mid: '#111118', horizon: '#17171f',
    sun: '#ffffff', sunI: 2.2, elev: 55, azim: -35,
    hemiSky: '#ffffff', hemiGround: '#20202a', hemiI: 0.5,
    fog: '#0b0b10', fogNear: 30, fogFar: 80,
    envI: 1.0, exposure: 1.0, disc: '#000000', discSize: 0, glow: 0,
    clouds: '#000000', cloudA: 0, cloudN: 0, night: 0, wet: 0, rain: 0, snow: 0, stars: 0,
  },
}

const TUNNEL_AIR = new Color(0.02, 0.02, 0.025)
const COLOR_KEYS = ['top', 'mid', 'horizon', 'sun', 'hemiSky', 'hemiGround', 'fog', 'disc', 'clouds']
const NUM_KEYS = ['sunI', 'elev', 'azim', 'hemiI', 'fogNear', 'fogFar', 'envI', 'exposure', 'discSize', 'glow', 'cloudA', 'night', 'wet', 'rain', 'snow', 'stars', 'moon']

/* presets → linear Colors once */
const cache = new Map()
function resolved(name) {
  let r = cache.get(name)
  if (!r) {
    const p = ENV_PRESETS[name] || ENV_PRESETS.day
    r = { ...p }
    for (const k of COLOR_KEYS) r[k] = new Color(p[k])
    for (const k of NUM_KEYS) r[k] = p[k] || 0
    cache.set(name, r)
  }
  return r
}

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;          // always on the far plane
}`

const SKY_FRAG = `
uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uDisc;
uniform float uDiscSize; uniform float uGlow; uniform float uStars; uniform float uMoon; uniform float uTime;
varying vec3 vDir;
float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uTop, smoothstep(0.22, 0.85, h));
  col = mix(col, uHorizon * 0.9, smoothstep(0.0, -0.08, h));
  float sd = dot(d, normalize(uSunDir));
  col += uDisc * uGlow * (0.35 * pow(max(sd, 0.0), 6.0) + 0.6 * pow(max(sd, 0.0), 60.0));
  float disc = smoothstep(1.0 - uDiscSize, 1.0 - uDiscSize * 0.55, sd);
  if (uMoon > 0.5) {
    // a crescent: the disc minus a shifted disc
    vec3 off = normalize(uSunDir + vec3(0.012, 0.006, 0.0));
    disc *= 1.0 - smoothstep(1.0 - uDiscSize * 0.95, 1.0 - uDiscSize * 0.5, dot(d, off));
  }
  col = mix(col, uDisc * 1.6, disc);
  if (uStars > 0.0 && h > 0.02) {
    vec3 p = floor(d * 360.0);
    float n = hash3(p);
    float tw = 0.65 + 0.35 * sin(uTime * 2.0 + n * 50.0);
    col += uStars * step(0.9975, n) * smoothstep(0.02, 0.35, h) * tw * vec3(0.9, 0.95, 1.0);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

function cloudTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    const rnd = seeded(11)
    for (let i = 0; i < 26; i++) {
      const x = w * (0.18 + rnd() * 0.64)
      const y = h * (0.45 + (rnd() - 0.5) * 0.3)
      const r = h * (0.16 + rnd() * 0.22)
      const gr = g.createRadialGradient(x, y, 0, x, y, r)
      gr.addColorStop(0, 'rgba(255,255,255,0.55)')
      gr.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = gr
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
  }, { mipmaps: true })
}

export class Environment {
  constructor(stage, { shadows = true, shadowSize = 1024, shadowBox = 20 } = {}) {
    this.stage = stage
    const scene = stage.scene
    this.root = new Object3D()
    scene.add(this.root)

    this.uniforms = {
      uTop: { value: new Color() }, uMid: { value: new Color() }, uHorizon: { value: new Color() },
      uSunDir: { value: new Vector3(0, 1, 0) }, uDisc: { value: new Color() }, uDiscSize: { value: 0.01 },
      uGlow: { value: 0.3 }, uStars: { value: 0 }, uMoon: { value: 0 }, uTime: { value: 0 },
    }
    this.sky = new Mesh(new SphereGeometry(500, 32, 16), new ShaderMaterial({
      uniforms: this.uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: BackSide, depthWrite: false, fog: false,
    }))
    this.sky.renderOrder = -10
    this.sky.frustumCulled = false
    this.root.add(this.sky)

    // a band of clouds far away, riding with the camera
    this.cloudMat = new MeshBasicMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, fog: false, opacity: 1 })
    this.clouds = new InstancedBatch(new PlaneGeometry(1, 0.5), this.cloudMat, 16)
    this.clouds.renderOrder = -9
    this.root.add(this.clouds)
    const rnd = seeded(5)
    this.cloudSlots = Array.from({ length: 16 }, () => {
      const x = (rnd() - 0.5) * 900
      const y = 45 + rnd() * 75
      const z = -330 - rnd() * 120
      const s = 90 + rnd() * 110
      return { x, y, z, s, scale: [s, s, 1] }          // scale made once, not per frame
    })

    this.hemi = new HemisphereLight(0xffffff, 0x444444, 1)
    scene.add(this.hemi)
    this.sun = new DirectionalLight(0xffffff, 2)
    this.sun.castShadow = shadows
    const sh = this.sun.shadow
    sh.mapSize.set(shadowSize, shadowSize)
    sh.camera.left = -shadowBox
    sh.camera.right = shadowBox
    sh.camera.top = shadowBox
    sh.camera.bottom = -shadowBox
    sh.camera.near = 1
    sh.camera.far = 120
    sh.bias = -0.0004
    sh.normalBias = 0.02
    scene.add(this.sun)
    scene.add(this.sun.target)
    scene.fog = new Fog(0xffffff, 50, 170)

    this.anchor = new Vector3()
    this.state = { night: 0, wet: 0, rain: 0, snow: 0, stars: 0, dark: 0, fogFar: 170 }
    this.cur = { ...resolved('day') }
    for (const k of COLOR_KEYS) this.cur[k] = this.cur[k].clone()
    this.time = 0
  }

  /* Blend preset a → b by k (0..1); extra.dark (0..1) dims everything (tunnels). */
  blend(a, b = a, k = 0, { dark = 0, dt = 0, tint = null } = {}) {
    const A = resolved(a)
    const B = resolved(b)
    const c = this.cur
    for (const key of COLOR_KEYS) c[key].copy(A[key]).lerp(B[key], k)
    for (const key of NUM_KEYS) c[key] = A[key] + (B[key] - A[key]) * k
    this.time += dt
    this.apply(dark, tint)
  }

  apply(dark = 0, tint = null) {
    const c = this.cur
    const u = this.uniforms
    u.uTop.value.copy(c.top)
    u.uMid.value.copy(c.mid)
    u.uHorizon.value.copy(c.horizon)
    u.uDisc.value.copy(c.disc)
    u.uDiscSize.value = c.discSize
    u.uGlow.value = c.glow
    u.uStars.value = c.stars
    u.uMoon.value = c.moon > 0.5 ? 1 : 0
    u.uTime.value = this.time
    const el = (c.elev * Math.PI) / 180
    const az = (c.azim * Math.PI) / 180
    const dir = u.uSunDir.value.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))
    // the light comes from the sun's side
    this.sun.position.copy(this.anchor).addScaledVector(dir, 60)
    this.sun.target.position.copy(this.anchor)
    const lit = 1 - dark * 0.92
    this.sun.color.copy(c.sun)
    this.sun.intensity = c.sunI * lit
    this.hemi.color.copy(c.hemiSky)
    this.hemi.groundColor.copy(c.hemiGround)
    this.hemi.intensity = c.hemiI * (1 - dark * 0.85)
    if (tint && dark > 0) this.hemi.color.lerp(tint, dark * 0.8)
    const fog = this.stage.scene.fog
    fog.color.copy(c.fog)
    if (dark > 0) fog.color.lerp(TUNNEL_AIR, dark * 0.9)
    fog.near = c.fogNear * (1 - dark * 0.6)
    fog.far = c.fogFar * (1 - dark * 0.5)
    this.stage.scene.environmentIntensity = c.envI * (1 - dark * 0.85)
    this.stage.renderer.toneMappingExposure = c.exposure
    const s = this.state
    s.night = Math.max(c.night, dark)
    s.wet = c.wet
    s.rain = c.rain * (1 - dark)
    s.snow = c.snow * (1 - dark)
    s.stars = c.stars
    s.dark = dark
    s.fogFar = fog.far
    // clouds
    this.cloudMat.color.copy(c.clouds)
    this.cloudMat.opacity = c.cloudA
    const n = Math.round(c.cloudN)
    const cl = this.clouds
    cl.begin()
    if (c.cloudA > 0.02) {
      for (let i = 0; i < n; i++) {
        const sl = this.cloudSlots[i]
        const x = ((sl.x + this.time * 1.5 + 450) % 900) - 450
        cl.add(x, sl.y, sl.z, 0, sl.scale)
      }
    }
    cl.end()
  }

  /* sky + clouds centred on the camera; the sun's shadow box centred on `target` (a little ahead of the player) */
  follow(cameraPos, target = cameraPos) {
    this.root.position.copy(cameraPos)
    this.anchor.copy(target)
  }
}
