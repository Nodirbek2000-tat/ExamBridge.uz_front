/*
 * VOICE DRIVE renderer: a pseudo-3D road drawn on one canvas.
 *
 * Projection (camera behind the car, road on the ground plane):
 *   y(z) = horizon + K / z        x(x, z) = centre + (x − camX) · S0 · CAR_Z / z
 * so a straight road edge is a straight screen line and everything scales by 1/z.
 * The world is split into theme zones (city, sunset, desert, snow, night, rain):
 * the ground and the roadside of each zone use its own colours, so a new theme
 * rolls in from the horizon while the sky cross-fades. Road stripes are batched
 * into a handful of paths per frame; sprites are pre-rendered canvases (art.js)
 * drawn far → near. Wide screens also get a far row of towers / mesas / peaks.
 */
import { THEMES, carSprite, commonSprites, seeded, themeSprites } from './art'
import { CAR_Z, Z_FAR } from './engine'

const ROAD = 1.5
const RUMBLE = 0.16
const SLOT = 4.2
const FAR_SLOT = 9
const BG_PAD = 60
const STRIPE_FAR = 95
const WT = ROAD + 0.55                      // tunnel wall, from the road centre
const CAR_SCALE = 1.08                      // the player's car is drawn a little larger than life
const CONFETTI = ['#f43f5e', '#facc15', '#22c55e', '#38bdf8', '#a855f7', '#fb923c']

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v))

function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

/* Screen layout for a canvas of W×H CSS pixels. Wide screens get a bigger road and car. */
export function makeLayout(W, H) {
  const wide = W >= 1024
  const short = H < 520
  const yH = Math.round(H * (short ? 0.3 : wide ? 0.38 : 0.36))
  const bottomPad = short ? 30 : wide ? clamp(H * 0.19, 150, 200) : Math.max(118, Math.min(172, H * 0.19))
  const carY = H - bottomPad
  const roadPx = Math.min(W * (wide ? 0.9 : 0.98), wide ? 1100 : 620, (carY - yH) * (wide ? 2.1 : 1.7))
  const S0 = roadPx / 3.1
  const K = (carY - yH) * CAR_Z
  const zNear = Math.max(1.2, (K / Math.max(1, H - yH)) * 0.92)
  const hCam = K / (S0 * CAR_Z)               // camera height in world units
  return { W, H, yH, carY, S0, K, cx: W / 2, zNear, hCam, far: W >= 640, wide, key: `${W}x${H}` }
}

/* Build a theme's sprites ahead of time (the road calls this while idle). */
export function warmTheme(name) {
  themeSprites(name)
}

/* Sky, clouds, sun / moon, hills and the far skyline / mountains / mesas — drawn once per size. */
function buildBackground(L, pal, name, dpr) {
  const w = L.W + BG_PAD * 2
  const h = L.yH + 2
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * dpr)
  c.height = Math.ceil(h * dpr)
  const g = c.getContext('2d')
  g.scale(dpr, dpr)
  const rnd = seeded(name.length * 131 + name.charCodeAt(0) * 7 + 7)

  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, pal.skyTop)
  sky.addColorStop(0.55, pal.skyMid)
  sky.addColorStop(1, pal.skyBottom)
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)

  if (pal.stars) {
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(255,255,255,${(0.25 + rnd() * 0.75).toFixed(2)})`
      const s = rnd() < 0.15 ? 2 : 1.2
      g.fillRect(rnd() * w, rnd() * h * 0.8, s, s)
    }
  }

  if (pal.sunR > 0) {
    const sr = Math.min(w, 900) * pal.sunR
    const sx = w * pal.sunX
    const sy = h * pal.sunY
    const glow = g.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 3.2)
    glow.addColorStop(0, pal.sunGlow)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = glow
    g.fillRect(sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4)
    // the disc on its own canvas so stripes / the crescent can be cut out of it
    const d = document.createElement('canvas')
    const ds = Math.ceil(sr * 2 + 4)
    d.width = Math.ceil(ds * dpr)
    d.height = Math.ceil(ds * dpr)
    const dg = d.getContext('2d')
    dg.scale(dpr, dpr)
    const r = sr
    if (pal.sunStripes) {
      const sg = dg.createLinearGradient(0, 2, 0, 2 + r * 2)
      sg.addColorStop(0, '#fff1a8')
      sg.addColorStop(0.5, pal.sun)
      sg.addColorStop(1, '#ff5f8f')
      dg.fillStyle = sg
    } else dg.fillStyle = pal.sun
    dg.beginPath(); dg.arc(r + 2, r + 2, r, 0, Math.PI * 2); dg.fill()
    dg.globalCompositeOperation = 'destination-out'
    if (pal.sunStripes) {
      for (let i = 0; i < 6; i++) dg.fillRect(0, r + 2 + r * (0.15 + i * 0.15), ds, 1.5 + i * 1.3)
    }
    if (pal.moon) { dg.beginPath(); dg.arc(r + 2 + r * 0.45, r + 2 - r * 0.25, r * 0.85, 0, Math.PI * 2); dg.fill() }
    g.drawImage(d, sx - r - 2, sy - r - 2, ds, ds)
  }

  // soft clouds
  if (pal.clouds) {
    g.fillStyle = pal.clouds
    const n = pal.weather === 'rain' ? 16 : 7
    for (let i = 0; i < n; i++) {
      const cx = rnd() * w
      const cy = h * (0.08 + rnd() * (pal.weather === 'rain' ? 0.45 : 0.35))
      const s = (pal.weather === 'rain' ? 60 : 30) + rnd() * 50
      for (const [ox, oy, rx, ry] of [[0, 0, 1, 0.32], [-0.45, 0.08, 0.55, 0.26], [0.4, 0.06, 0.6, 0.28]]) {
        g.beginPath()
        g.ellipse(cx + s * ox, cy + s * oy, s * rx, s * ry, 0, 0, Math.PI * 2)
        g.fill()
      }
    }
  }

  // far silhouettes on the horizon
  if (pal.bg === 'mountains') {
    for (let layer = 0; layer < 2; layer++) {
      const peaks = []
      g.fillStyle = layer ? pal.skyline : pal.rock
      g.beginPath()
      g.moveTo(0, h)
      let x = -20
      while (x < w + 40) {
        const pw = 60 + rnd() * 110
        const ph = h * (layer ? 0.22 : 0.34) * (0.5 + rnd() * 0.6)
        g.lineTo(x + pw / 2, h - ph)
        g.lineTo(x + pw, h - h * 0.04)
        peaks.push([x + pw / 2, h - ph, pw, ph])
        x += pw * 0.8
      }
      g.lineTo(w, h)
      g.closePath()
      g.fill()
      // snow caps: the top third of every peak
      g.fillStyle = layer ? 'rgba(248,251,255,0.8)' : '#f8fbff'
      g.beginPath()
      for (const [px, py, pw, ph] of peaks) {
        const k = 0.3
        const dx = (pw / 2) * k * ((ph) / Math.max(1, ph + h * 0.04))
        g.moveTo(px, py)
        g.lineTo(px + dx, py + ph * k)
        g.lineTo(px + dx * 0.3, py + ph * k * 0.8)
        g.lineTo(px - dx * 0.2, py + ph * k)
        g.lineTo(px - dx, py + ph * k * 0.85)
        g.closePath()
      }
      g.fill()
    }
  } else if (pal.bg === 'mesas') {
    g.fillStyle = pal.skyline
    let x = rnd() * 40
    while (x < w) {
      const mw = 60 + rnd() * 140
      const mh = h * (0.08 + rnd() * 0.16)
      g.beginPath()
      g.moveTo(x, h)
      g.lineTo(x + mw * 0.12, h - mh)
      g.lineTo(x + mw * 0.88, h - mh)
      g.lineTo(x + mw, h)
      g.closePath()
      g.fill()
      x += mw + rnd() * 120
    }
  }

  // two layers of hills / dunes
  pal.hills.forEach((col, layer) => {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(0, h)
    const base = layer ? h * 0.06 : h * 0.12
    const amp = layer ? h * 0.05 : h * 0.09
    const ph = rnd() * 6
    for (let x = 0; x <= w; x += 6) {
      const y = h - base - amp * (0.6 * Math.sin(x * 0.006 + ph) + 0.4 * Math.sin(x * 0.017 + ph * 2))
      g.lineTo(x, y)
    }
    g.lineTo(w, h)
    g.closePath()
    g.fill()
  })

  // city skyline sitting on the horizon
  if (pal.bg === 'city') {
    let x = rnd() * 20
    while (x < w) {
      const bw = 14 + rnd() * 30
      const bh = (0.04 + rnd() * 0.13) * Math.max(160, h)
      if (rnd() < 0.82) {
        g.fillStyle = pal.skyline
        g.fillRect(x, h - bh, bw, bh)
        if (pal.skylineLit) {
          g.fillStyle = pal.skylineLit
          for (let wy = h - bh + 4; wy < h - 4; wy += 6) {
            for (let wx = x + 3; wx < x + bw - 3; wx += 5) if (rnd() < 0.18) g.fillRect(wx, wy, 2, 2.5)
          }
        }
      }
      x += bw + rnd() * 6
    }
  }
  return c
}

function cached(view, key, make) {
  if (!view.cache) view.cache = {}
  if (view.cache[key] === undefined) view.cache[key] = make()
  return view.cache[key]
}

/* Is the sky of `theme` already drawn for this layout? / draw it now (the road calls this while idle). */
export const hasBackground = (view, theme) => !!view.cache?.[`bg:${theme}:${view.layout?.key}`]
export function warmBackground(view, theme) {
  if (!view.layout || !THEMES[theme]) return
  cached(view, `bg:${theme}:${view.layout.key}`, () => buildBackground(view.layout, THEMES[theme], theme, view.dpr))
}

/* Draw one frame. `view` = { layout, dpr, items, cache } owned by the canvas component. */
export function drawWorld(ctx, game, view) {
  const L = view.layout
  const { W, H, yH, K, S0, cx, zNear: zN } = L
  const camX = game.camX
  const dist = game.dist
  const t = game.clock
  const car = game.car
  const zF = Z_FAR
  const com = commonSprites()

  // the theme under the camera, and the next one rolling in from the horizon
  const themeA = game.themeAt(dist)
  const nextZone = game.nextZone(dist)
  const palA = THEMES[themeA] || THEMES.day
  const kB = nextZone && nextZone.from - dist < zF ? clamp(1 - (nextZone.from - dist) / zF) : 0
  const palB = nextZone ? THEMES[nextZone.theme] || palA : palA
  const zBoundary = nextZone ? nextZone.from - dist : Infinity

  const Y = (z) => yH + K / z
  const SC = (z) => (S0 * CAR_Z) / z
  const X = (x, z) => cx + (x - camX) * SC(z)
  const quad = (x1, x2, za, zb) => {
    const ya = Y(za)
    const yb = Y(zb)
    ctx.moveTo(X(x1, za), ya)
    ctx.lineTo(X(x2, za), ya)
    ctx.lineTo(X(x2, zb), yb)
    ctx.lineTo(X(x1, zb), yb)
    ctx.closePath()
  }

  ctx.save()
  const st = t - game.fx.shakeT0
  if (st >= 0 && st < 0.45) {
    const k = (1 - st / 0.45) * game.fx.shakePow * 7
    ctx.translate(Math.sin(t * 90) * k, Math.cos(t * 73) * k * 0.6)
  }

  // sky (cross-fades into the next theme while it rolls in)
  ctx.fillStyle = palA.skyTop
  ctx.fillRect(-12, -12, W + 24, yH + 14)
  const bgShift = -BG_PAD - clamp(camX * 14, -BG_PAD, BG_PAD)
  ctx.drawImage(cached(view, `bg:${themeA}:${L.key}`, () => buildBackground(L, palA, themeA, view.dpr)), bgShift, 0, W + BG_PAD * 2, yH + 2)
  if (kB > 0.01 && palB !== palA) {
    ctx.globalAlpha = kB
    ctx.drawImage(cached(view, `bg:${nextZone.theme}:${L.key}`, () => buildBackground(L, palB, nextZone.theme, view.dpr)), bgShift, 0, W + BG_PAD * 2, yH + 2)
    ctx.globalAlpha = 1
  }

  // ground + road, zone by zone
  const SEG = 3
  const RS = 1.5
  const DP = 5
  function ground(pal, z0, z1) {
    if (z1 <= z0) return
    const top = z1 >= zF ? yH : Y(z1)
    ctx.fillStyle = pal.grass[0]
    ctx.fillRect(-12, top, W + 24, Y(z0) - top + (z0 <= zN ? H : 0))
    ctx.beginPath()
    for (let k = Math.floor((dist + z0) / SEG); k * SEG - dist < z1; k++) {
      if (k & 1) continue
      const za = Math.max(z0, k * SEG - dist)
      const zb = Math.min(z1, (k + 1) * SEG - dist)
      if (zb <= za) continue
      const ya = Y(za)
      const yb = Y(zb)
      ctx.rect(-12, yb, W + 24, ya - yb)
    }
    ctx.fillStyle = pal.grass[1]
    ctx.fill()

    ctx.beginPath()
    quad(-ROAD - RUMBLE, ROAD + RUMBLE, z0, z1)
    ctx.fillStyle = pal.road[0]
    ctx.fill()
    const sf = Math.min(z1, STRIPE_FAR)
    ctx.beginPath()
    for (let k = Math.floor((dist + z0) / SEG); k * SEG - dist < sf; k++) {
      if (!(k & 1)) continue
      const za = Math.max(z0, k * SEG - dist)
      const zb = Math.min(sf, (k + 1) * SEG - dist)
      if (zb > za) quad(-ROAD, ROAD, za, zb)
    }
    ctx.fillStyle = pal.road[1]
    ctx.fill()
    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath()
      for (let k = Math.floor((dist + z0) / RS); k * RS - dist < sf; k++) {
        if ((k & 1) !== pass) continue
        const za = Math.max(z0, k * RS - dist)
        const zb = Math.min(sf, (k + 1) * RS - dist)
        if (zb <= za) continue
        quad(-ROAD - RUMBLE, -ROAD, za, zb)
        quad(ROAD, ROAD + RUMBLE, za, zb)
      }
      ctx.fillStyle = pal.rumble[pass]
      ctx.fill()
    }
    ctx.beginPath()
    for (let k = Math.floor((dist + z0) / DP) - 1; k * DP - dist < sf; k++) {
      const za = Math.max(z0, k * DP - dist)
      const zb = Math.min(sf, k * DP - dist + 2.2)
      if (zb <= za) continue
      quad(-0.545, -0.455, za, zb)
      quad(0.455, 0.545, za, zb)
    }
    quad(-ROAD + 0.05, -ROAD + 0.11, z0, z1)
    quad(ROAD - 0.11, ROAD - 0.05, z0, z1)
    ctx.fillStyle = pal.lane
    ctx.fill()
  }
  ground(palA, zN, Math.min(zF, zBoundary))
  if (zBoundary < zF) ground(palB, Math.max(zN, zBoundary), zF)
  const palAt = (z) => (z >= zBoundary ? palB : palA)

  // decals painted on the road
  for (const d of game.decals) {
    let za = d.pos - dist
    const zb = za + (d.len || 0.3)
    if (zb < zN || za > zF || d.kind === 'clear' || d.kind === 'tunnel') continue
    za = Math.max(za, zN)
    const pal = palAt(za)
    switch (d.kind) {
      case 'stopline':
        ctx.fillStyle = '#f8fafc'
        ctx.beginPath(); quad(-ROAD, ROAD, za, zb); ctx.fill()
        break
      case 'giveway':
        ctx.fillStyle = '#f8fafc'
        ctx.beginPath()
        for (let x = -ROAD + 0.05; x < ROAD - 0.1; x += 0.32) quad(x, x + 0.18, za, zb)
        ctx.fill()
        break
      case 'zebra':
        ctx.fillStyle = '#f8fafc'
        ctx.beginPath()
        for (let i = 0; i < 7; i++) { const x = -1.38 + i * 0.42; quad(x, x + 0.24, za, zb) }
        ctx.fill()
        break
      case 'junction': {
        ctx.fillStyle = pal.road[0]
        ctx.beginPath()
        if (d.side <= 0) quad(-40, -ROAD + 0.02, za, zb)
        if (d.side >= 0) quad(ROAD - 0.02, 40, za, zb)
        ctx.fill()
        const zm = d.pos + d.len / 2 - dist
        if (zm - 0.06 > zN) {
          ctx.fillStyle = pal.lane
          ctx.beginPath()
          for (let x = 2.1; x < 16; x += 1.6) {
            if (d.side <= 0) quad(-x - 0.8, -x, zm - 0.06, zm + 0.06)
            if (d.side >= 0) quad(x, x + 0.8, zm - 0.06, zm + 0.06)
          }
          ctx.fill()
        }
        break
      }
      case 'ring': {
        const zc = d.pos + 0.3 - dist
        if (zc - 0.6 <= zN) break
        const rx = 0.55 * SC(zc)
        const ry = Math.max(1, (Y(zc - 0.55) - Y(zc + 0.55)) / 2)
        ctx.fillStyle = '#f8fafc'
        ctx.beginPath(); ctx.ellipse(X(0, zc), Y(zc), rx, ry, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = pal.road[0]
        ctx.beginPath(); ctx.ellipse(X(0, zc), Y(zc), rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2); ctx.fill()
        break
      }
      case 'bumps':
        ctx.fillStyle = '#facc15'
        ctx.beginPath(); quad(-ROAD, ROAD, za, zb); ctx.fill()
        ctx.fillStyle = '#111827'
        ctx.beginPath()
        for (let i = 0; i < 10; i += 2) { const x = -ROAD + i * 0.3; quad(x, x + 0.3, za, zb) }
        ctx.fill()
        break
      case 'rail': {
        ctx.fillStyle = '#4b4540'
        ctx.beginPath(); quad(-40, 40, za, zb); ctx.fill()
        ctx.fillStyle = '#cbd5e1'
        ctx.beginPath()
        for (const off of [0.25, 0.8]) { const zr = d.pos + off - dist; if (zr > zN) quad(-40, 40, zr, zr + 0.07) }
        ctx.fill()
        break
      }
      case 'pad': {
        // turbo pad: glowing chevrons in every lane
        const pulse = 0.55 + 0.45 * Math.sin(t * 10)
        ctx.fillStyle = `rgba(34,211,238,${(0.55 + pulse * 0.4).toFixed(2)})`
        ctx.beginPath(); quad(-ROAD + 0.08, ROAD - 0.08, za, zb); ctx.fill()
        ctx.fillStyle = pulse > 0.5 ? '#f0abfc' : '#fdf4ff'
        ctx.beginPath()
        for (const x of [-1, 0, 1]) {
          for (let i = 0; i < 3; i++) {
            const z0 = d.pos - dist + 0.15 + i * 0.75
            if (z0 <= zN) continue
            const pts = [[x - 0.34, z0], [x, z0 + 0.42], [x + 0.34, z0], [x + 0.34, z0 + 0.2], [x, z0 + 0.62], [x - 0.34, z0 + 0.2]]
            pts.forEach(([px, pz], j) => { if (j) ctx.lineTo(X(px, pz), Y(pz)); else ctx.moveTo(X(px, pz), Y(pz)) })
            ctx.closePath()
          }
        }
        ctx.fill()
        break
      }
      case 'arrow': {
        const th = (d.dir || 0) * 0.5
        const cs = Math.cos(th)
        const sn = Math.sin(th)
        const pts = [[-0.07, 0], [0.07, 0], [0.07, 1.2], [0.2, 1.2], [0, 1.8], [-0.2, 1.2], [-0.07, 1.2]]
        if (d.pos - dist <= zN) break
        ctx.fillStyle = pal.lane
        ctx.beginPath()
        pts.forEach(([u, w], i) => {
          const wx = d.x + u * cs + w * sn
          const wz = d.pos - dist + (-u * sn + w * cs)
          if (i === 0) ctx.moveTo(X(wx, wz), Y(wz)); else ctx.lineTo(X(wx, wz), Y(wz))
        })
        ctx.closePath()
        ctx.fill()
        break
      }
      default:
        break
    }
  }

  // fog hides the far stripes melting into the horizon
  const fogOf = (name, pal) => cached(view, `fog:${name}:${L.key}`, () => {
    const h = (L.carY - yH) * 0.18
    const gr = ctx.createLinearGradient(0, yH - 1, 0, yH + h)
    const [r, g2, b] = pal.fog
    gr.addColorStop(0, `rgba(${r},${g2},${b},0.95)`)
    gr.addColorStop(1, `rgba(${r},${g2},${b},0)`)
    return { gr, h }
  })
  const fogA = fogOf(themeA, palA)
  ctx.fillStyle = fogA.gr
  if (kB > 0.01) ctx.globalAlpha = 1 - kB
  ctx.fillRect(-12, yH - 1, W + 24, fogA.h + 1)
  if (kB > 0.01) {
    const fogB = fogOf(nextZone.theme, palB)
    ctx.globalAlpha = kB
    ctx.fillStyle = fogB.gr
    ctx.fillRect(-12, yH - 1, W + 24, fogB.h + 1)
    ctx.globalAlpha = 1
  }

  // headlights: at night, in the rain, and in a tunnel once switched on
  const autoLights = ((palA.night || palA.lights) ? 1 - kB : 0) + ((palB.night || palB.lights) ? kB : 0)
  const lightsOn = game.status !== 'over' && (autoLights > 0.5 || game.lightsOn)
  const headlights = (strength) => {
    const z1 = CAR_Z + 0.6
    const z2 = CAR_Z + 16
    const hl = ctx.createLinearGradient(0, Y(z1), 0, Y(z2))
    hl.addColorStop(0, `rgba(255,240,200,${(0.3 * strength).toFixed(3)})`)
    hl.addColorStop(1, 'rgba(255,240,200,0)')
    ctx.fillStyle = hl
    ctx.beginPath()
    ctx.moveTo(X(car.x - 0.32, z1), Y(z1))
    ctx.lineTo(X(car.x + 0.32, z1), Y(z1))
    ctx.lineTo(X(car.x + 1.3, z2), Y(z2))
    ctx.lineTo(X(car.x - 1.3, z2), Y(z2))
    ctx.closePath()
    ctx.fill()
  }
  if (lightsOn && game.tunnelDark < 0.05) headlights(1)

  /* ── everything standing up, far → near ── */
  const items = view.items || (view.items = [])
  items.length = 0
  const blocked = (p, wide = 2.5) => {
    let side = null
    for (const d of game.decals) {
      if (d.kind === 'tunnel') {
        if (p > d.pos - 4 && p < d.pos + d.len + 1) return 0
        continue
      }
      if (d.kind !== 'junction' && d.kind !== 'rail' && d.kind !== 'zebra' && d.kind !== 'clear') continue
      if (p > d.pos - wide && p < d.pos + (d.len || 0) + wide) {
        const s = d.side ?? 0
        if (s === 0) return 0
        side = side === null || side === s ? s : 0
      }
    }
    return side
  }
  const i0 = Math.ceil((dist + zN) / SLOT)
  const i1 = Math.floor((dist + zF) / SLOT)
  for (let i = i0; i <= i1; i++) {
    const p = i * SLOT
    const b = blocked(p)
    if (b === 0) continue
    const pal = THEMES[game.themeAt(p)]
    for (let side = -1; side <= 1; side += 2) {
      if (b === side) continue
      const n = i * 2 + (side > 0 ? 1 : 0)
      const type = pal.scenery[Math.floor(hash(n) * pal.scenery.length)]
      if (type === 'none') continue
      items.push({ z: p - dist, k: 1, type, side, h2: hash(n + 7919), h3: hash(n + 104729), theme: game.themeAt(p) })
    }
  }
  if (L.far) {
    const f0 = Math.ceil((dist + zN + 6) / FAR_SLOT)
    const f1 = Math.floor((dist + zF) / FAR_SLOT)
    for (let i = f0; i <= f1; i++) {
      const p = i * FAR_SLOT + FAR_SLOT / 2
      if (blocked(p, 0) === 0) continue
      const theme = game.themeAt(p)
      const pal = THEMES[theme]
      for (let side = -1; side <= 1; side += 2) {
        const n = 50000 + i * 2 + (side > 0 ? 1 : 0)
        if (hash(n + 3) < 0.25) continue
        const type = pal.far[Math.floor(hash(n) * pal.far.length)]
        items.push({ z: p - dist, k: 6, type, side, h2: hash(n + 7919), h3: hash(n + 104729), theme })
      }
    }
  }
  for (const o of game.objects) {
    const z = o.pos - dist
    if (z > zN * 0.75 && z < zF) items.push({ z, k: 2, o })
  }
  for (const d of game.decals) {
    if (d.kind !== 'tunnel') continue
    const ez = d.pos - dist
    const xz = d.pos + d.len - dist
    if (xz < 0.4 || ez > zF) continue
    items.push({ z: Math.min(zF, xz) + 0.01, k: 7, d })                // the inside (walls, ceiling)
    if (ez > 0.6) items.push({ z: ez - 0.005, k: 8, d })                // the mountain face with the portal
  }
  items.push({ z: CAR_Z, k: 3 })
  for (const p of game.particles) {
    const z = p.pos - dist
    if (z > zN) items.push({ z, k: 4, p })
  }
  items.sort((a, b) => b.z - a.z)

  const drawSprite = (sp, x, z, width, lift = 0, rot = 0, alpha = 1, flip = false) => {
    const s = SC(z)
    const w = width * s
    if (w < 0.6) return
    const h = (w * sp.h) / sp.w
    const left = X(x, z) - w * sp.ax
    const top = Y(z) - lift * s - h
    if (left > W + 40 || left + w < -40 || top > H || top + h < -40) return
    const fade = z > zF - 30 ? clamp((zF - z) / 30) : 1
    const a = fade * alpha
    if (a <= 0.01) return
    if (a < 1) ctx.globalAlpha = a
    if (rot || flip) {
      ctx.save()
      ctx.translate(left + w * sp.ax, top + h)
      ctx.rotate(rot)
      if (flip) ctx.scale(-1, 1)
      ctx.drawImage(sp.img, -w * sp.ax, -h, w, h)
      ctx.restore()
    } else ctx.drawImage(sp.img, left, top, w, h)
    if (a < 1) ctx.globalAlpha = 1
  }
  const shadow = (x, z, width) => {
    const s = SC(z)
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse(X(x, z), Y(z), width * 0.55 * s, Math.max(1, width * 0.1 * s), 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const glowAt = (sp, x, y, r, alpha = 1, sy = 1) => {
    const prev = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = 'lighter'
    if (alpha < 1) ctx.globalAlpha = alpha
    ctx.drawImage(sp.img, x - r, y - r * sy, r * 2, r * 2 * sy)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = prev
  }
  const dot = (x, y, r, fill) => {
    ctx.fillStyle = fill
    ctx.beginPath()
    ctx.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2)
    ctx.fill()
  }
  const pick = (arr, h) => arr[Math.min(arr.length - 1, Math.floor(h * arr.length))]

  for (const it of items) {
    const z = it.z
    if (it.k === 1) {
      const { type, side, h2, h3 } = it
      const spr = themeSprites(it.theme)
      if (type === 'tree') drawSprite(pick(spr.tree, h3), side * (2.5 + h2 * 1.8), z, 1.6 + h3 * 0.6)
      else if (type === 'pine') drawSprite(spr.pine[0], side * (2.4 + h2 * 2), z, 1.1 + h3 * 0.4)
      else if (type === 'snowpine') drawSprite(spr.snowpine[0], side * (2.4 + h2 * 2.2), z, 1.2 + h3 * 0.5)
      else if (type === 'palm') drawSprite(spr.palm[0], side * (2.3 + h2 * 0.9), z, 2.0 + h3 * 0.4)
      else if (type === 'bush') drawSprite(spr.bush[0], side * (2.1 + h2 * 0.8), z, 1.3 + h3 * 0.4)
      else if (type === 'house') drawSprite(pick(spr.house, h3), side * (3.9 + h2 * 1.4), z, 3.0 + h3 * 0.6)
      else if (type === 'building') drawSprite(pick(spr.building, h3), side * (5.3 + h2 * 2), z, 3.4 + h2 * 1.2)
      else if (type === 'lamp') drawSprite(side < 0 ? spr.lampL : spr.lampR, side * 1.95, z, 1.45)
      else if (type === 'billboard') drawSprite(pick(spr.billboard, h3), side * (3.3 + h2 * 1.2), z, 2.7)
      else if (type === 'cactus') drawSprite(pick(spr.cactus, h3), side * (2.3 + h2 * 2.2), z, 0.7 + h3 * 0.4)
      else if (type === 'rock') drawSprite(spr.rock[0], side * (2.6 + h2 * 2.5), z, 1.0 + h3 * 0.9, 0, 0, 1, side > 0)
      else if (type === 'deadbush') drawSprite(spr.deadbush[0], side * (2.1 + h2 * 1.5), z, 0.9)
      else if (type === 'cabin') drawSprite(spr.cabin[0], side * (4.0 + h2 * 1.5), z, 3.0 + h3 * 0.4, 0, 0, 1, side > 0)
      else if (type === 'snowman') drawSprite(spr.snowman[0], side * (2.4 + h2 * 0.8), z, 0.7)
      continue
    }
    if (it.k === 6) {
      const { type, side, h2, h3 } = it
      const spr = themeSprites(it.theme)
      if (type === 'tower') drawSprite(pick(spr.tower, h3), side * (9 + h2 * 5), z, 4 + h3 * 1.5)
      else if (type === 'building') drawSprite(pick(spr.building, h3), side * (8.5 + h2 * 4), z, 4 + h2 * 1.2)
      else if (type === 'tree') drawSprite(pick(spr.tree, h3), side * (7 + h2 * 4), z, 2.6 + h3)
      else if (type === 'palm') drawSprite(spr.palm[0], side * (7 + h2 * 4), z, 2.8 + h3 * 0.6)
      else if (type === 'mesa') drawSprite(pick(spr.mesa, h3), side * (16 + h2 * 8), z, 14 + h3 * 6, 0, 0, 1, side < 0)
      else if (type === 'rock') drawSprite(spr.rock[0], side * (8 + h2 * 5), z, 3 + h3 * 2, 0, 0, 1, side > 0)
      else if (type === 'cactus') drawSprite(pick(spr.cactus, h3), side * (7 + h2 * 5), z, 1.2 + h3 * 0.5)
      else if (type === 'snowpine') drawSprite(spr.snowpine[0], side * (7 + h2 * 5), z, 2.2 + h3 * 0.8)
      else if (type === 'peak') drawSprite(spr.peak[0], side * (18 + h2 * 8), z, 16 + h3 * 6, 0, 0, 1, side < 0)
      continue
    }
    if (it.k === 7) { drawTunnelInside(it.d); continue }
    if (it.k === 8) { drawPortal(it.d); continue }
    if (it.k === 3) {
      if (game.tunnelDark > 0.02) darkness()
      drawCar()
      continue
    }
    if (it.k === 4) {
      const p = it.p
      const s = SC(z)
      const px = X(p.x, z)
      const py = Y(z) - p.h * s
      const a = clamp(p.life / p.max)
      if (p.kind === 'smoke') { ctx.globalAlpha = 0.45 * a; dot(px, py, p.size * s, '#d4d4dc'); ctx.globalAlpha = 1 }
      else if (p.kind === 'spark') { ctx.globalAlpha = a; dot(px, py, Math.max(1.5, p.size * s), p.color || '#fde047'); ctx.globalAlpha = 1 }
      else if (p.kind === 'coin') {
        const w = Math.max(6, 0.3 * s)
        ctx.globalAlpha = a
        ctx.drawImage(com.coin.img, px - w / 2, py - w / 2, w, w)
        ctx.globalAlpha = 1
      } else { ctx.globalAlpha = a; ctx.fillStyle = p.color; const r = Math.max(1.5, p.size * s); ctx.fillRect(px - r, py - r, r * 2, r * 2); ctx.globalAlpha = 1 }
      continue
    }
    const o = it.o
    let fx = 0
    let fh = 0
    let rot = 0
    let alpha = 1
    if (o.fly) {
      const ft = t - o.fly.t0
      fx = o.fly.vx * ft
      fh = o.fly.vh * ft - 6 * ft * ft
      rot = o.fly.spin * ft
      alpha = clamp(1 - ft / 0.9)
    }
    switch (o.kind) {
      case 'truck':
        if (!o.fly) shadow(o.x, z, 1.0)
        drawSprite(com.trucks[o.v % 3], o.x + fx, z, 1.0, Math.max(0, fh), rot * 0.3, alpha)
        break
      case 'cone':
        drawSprite(com.cone, o.x + fx, z, 0.36, Math.max(0, fh), rot, alpha)
        break
      case 'works':
        drawSprite(com.works, o.x + fx, z, 1.0, Math.max(0, fh), rot * 0.5, alpha)
        break
      case 'beam':
        drawSprite(com.beam, fx, z, 3.25, Math.max(0, fh), rot * 0.2, alpha)
        break
      case 'sign':
        drawSprite(com.signs[o.face] || com.signs.works, o.x, z, 0.8)
        break
      case 'ped':
        drawSprite(o.kid ? com.kids[o.v % 3] : com.peds[o.v % 3], o.x, z, o.kid ? 0.36 : 0.42, o.bob || 0)
        break
      case 'passenger': {
        if (o.gone) break
        const sp = o.walkT0 != null ? com.peds[1] : o.sad ? com.peds[1] : com.wave[Math.floor(t * 4) % 2]
        drawSprite(sp, o.x, z, 0.44, o.bob || 0)
        break
      }
      case 'animal': {
        const cow = o.v === 'cow'
        if (!o.gone) shadow(o.x, z, cow ? 0.9 : 0.55)
        drawSprite(cow ? com.cow : com.sheep, o.x, z, cow ? 1.05 : 0.62, o.hop || 0, 0, o.fade ?? 1, o.dir > 0)
        break
      }
      case 'station':
        drawSprite(com.station, o.x, z, 4.8)
        break
      case 'busstop':
        drawSprite(com.busstop, o.x, z, 2.3)
        break
      case 'landmark':
        drawSprite(com.landmark[o.v] || com.landmark.bank, o.x, z, 3.5, 0, 0, 1)
        break
      case 'coin': {
        const s = SC(z)
        const w = 0.44 * s
        if (w < 0.8) break
        const cxp = X(o.x, z)
        const cyp = Y(z) - (0.5 + Math.sin(t * 4 + o.pos) * 0.06) * s
        const sx = Math.max(0.15, Math.abs(Math.cos(t * 4 + o.pos * 0.7)))
        ctx.save()
        ctx.translate(cxp, cyp)
        ctx.scale(sx, 1)
        ctx.drawImage(com.coin.img, -w / 2, -w / 2, w, w)
        ctx.restore()
        break
      }
      case 'light':
        drawLight(o, z)
        break
      case 'rail':
        drawRail(o, z)
        break
      case 'train':
        drawTrain(o, z)
        break
      default:
        break
    }
  }

  /* Traffic lights: a pole on each side plus a mast arm with a big head over the road. */
  function drawLight(o, z) {
    const s = SC(z)
    const y0 = Y(z)
    const lamps = [['red', 0.2, '#ef4444', '#3f1414'], ['amber', 0.5, '#f59e0b', '#3a2a0a'], ['green', 0.8, '#22c55e', '#0f2a19']]
    const head = (cx0, top, hw, hh) => {
      ctx.fillStyle = '#0b1220'
      ctx.fillRect(cx0 - hw / 2, top, hw, hh)
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(cx0 - hw / 2, top, hw, Math.max(1, hh * 0.03))
      const r = hw * 0.32
      for (const [nm, f, on, off] of lamps) {
        const ly = top + hh * f
        const lit = o.state === nm
        dot(cx0, ly, r, lit ? on : off)
        if (lit) glowAt(com.glow[nm], cx0, ly, r * 6)
      }
    }
    const pw = Math.max(1, 0.1 * s)
    ctx.fillStyle = '#1f2937'
    for (let side = -1; side <= 1; side += 2) {
      const px = X(side * 1.95, z)
      const poleH = (side > 0 ? 3.4 : 2.4) * s
      ctx.fillRect(px - pw / 2, y0 - poleH, pw, poleH)
    }
    const armY = y0 - 3.2 * s
    const armL = X(-0.2, z)
    const armR = X(1.95, z)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(armL, armY - pw / 2, armR - armL, pw)
    head(X(0.3, z), armY, 0.6 * s, 1.5 * s)
    head(X(-1.95, z), y0 - 2.4 * s - 1.2 * s, 0.48 * s, 1.2 * s)
  }

  function drawRail(o, z) {
    const s = SC(z)
    const y0 = Y(z)
    for (let side = -1; side <= 1; side += 2) {
      const px = X(side * 1.85, z)
      const pw = Math.max(1, 0.1 * s)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(px - pw / 2, y0 - 1.55 * s, pw, 1.55 * s)
      const bw = 0.5 * s
      const bh = 0.2 * s
      const by = y0 - 1.35 * s
      ctx.fillStyle = '#111827'
      ctx.fillRect(px - bw / 2, by - bh / 2, bw, bh)
      const on = o.flashing ? Math.floor(t * 3) % 2 : -1
      for (let k = 0; k < 2; k++) {
        const lx = px + (k ? 1 : -1) * 0.14 * s
        dot(lx, by, 0.085 * s, on === k ? '#ef4444' : '#450a0a')
        if (on === k) glowAt(com.glow.red, lx, by, 0.4 * s)
      }
      const pivX = side * 1.75
      const pivH = 0.95
      const len = 1.65
      const ex = pivX - side * Math.cos(o.angle) * len
      const eh = pivH + Math.sin(o.angle) * len
      const x1 = X(pivX, z)
      const y1 = y0 - pivH * s
      const x2 = X(ex, z)
      const y2 = y0 - eh * s
      ctx.lineWidth = Math.max(1.5, 0.11 * s)
      ctx.lineCap = 'round'
      ctx.strokeStyle = '#f8fafc'
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      const dash = Math.max(1, 0.22 * s)
      ctx.setLineDash([dash, dash])
      ctx.lineCap = 'butt'
      ctx.strokeStyle = '#dc2626'
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      ctx.setLineDash([])
    }
  }

  function drawTrain(o, z) {
    const s = SC(z)
    const y0 = Y(z)
    const front = -14 + (t - o.t0) * 32
    const top = y0 - 2.1 * s
    const bottom = y0 - 0.2 * s
    const hgt = bottom - top
    const colors = ['#dc2626', '#0ea5e9', '#f59e0b', '#10b981']
    for (let c = 0; c < 4; c++) {
      const xr = front - c * 5.4
      const xl = xr - 5.1
      const l = X(xl, z)
      const r = X(xr, z)
      if (r < 0 || l > W) continue
      ctx.fillStyle = colors[c]
      ctx.fillRect(l, top, r - l, hgt)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillRect(l, top + hgt * 0.62, r - l, hgt * 0.07)
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.fillRect(l, top, r - l, hgt * 0.08)
      ctx.fillStyle = '#0f172a'
      for (let wx = xl + 0.45; wx < xr - 0.7; wx += 0.9) ctx.fillRect(X(wx, z), top + hgt * 0.16, 0.55 * s, hgt * 0.3)
      for (const wx of [xl + 0.8, xl + 1.5, xr - 1.5, xr - 0.8]) dot(X(wx, z), bottom, 0.22 * s, '#111827')
    }
  }

  /* Tunnel inside: two walls and the ceiling, each one quad from the near end to the exit. */
  function drawTunnelInside(d) {
    const Ht = Math.max(2.8, L.hCam + 1.2)
    const z0 = Math.max(0.35, d.pos - dist)
    const z1 = Math.min(zF, d.pos + d.len - dist)
    if (z1 <= z0) return
    const top = (x, z) => [X(x, z), Y(z) - Ht * SC(z)]
    const poly = (pts, fill) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
      ctx.closePath()
      ctx.fill()
    }
    for (const side of [-1, 1]) {
      const x = side * WT
      poly([[X(x, z0), Y(z0)], [X(x, z1), Y(z1)], top(x, z1), top(x, z0)], side < 0 ? '#3f3f46' : '#34343b')
      // a light band along the wall
      const b = (h) => [[X(x, z0), Y(z0) - h * SC(z0)], [X(x, z1), Y(z1) - h * SC(z1)]]
      const [a0, a1] = b(0.55)
      const [c0, c1] = b(0.8)
      poly([a0, a1, c1, c0], '#a1a1aa')
    }
    poly([top(-WT, z0), top(-WT, z1), top(WT, z1), top(WT, z0)], '#27272a')
    // ceiling lamps
    ctx.fillStyle = game.lightsOn ? '#fde68a' : '#f59e0b'
    ctx.beginPath()
    for (let p = Math.ceil((dist + z0) / 3) * 3; p - dist < z1; p += 3) {
      const zz = p - dist
      if (zz < 0.5) continue
      for (const side of [-1, 1]) {
        const [lx, ly] = top(side * (WT - 0.25), zz)
        const r = Math.max(0.8, 0.09 * SC(zz))
        ctx.moveTo(lx + r, ly + r * 1.5)
        ctx.arc(lx, ly + r * 1.5, r, 0, Math.PI * 2)
      }
    }
    ctx.fill()
    // the road surface inside is a little darker
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath(); quad(-ROAD - RUMBLE, ROAD + RUMBLE, Math.max(zN, z0), z1); ctx.fill()
  }

  /* The mountain face with the tunnel portal in it. */
  function drawPortal(d) {
    const ez = d.pos - dist
    const Ht = Math.max(2.8, L.hCam + 1.2)
    const s = SC(ez)
    const x0 = X(0, ez)
    const y0 = Y(ez)
    const pal = palAt(ez)
    const px = (x) => x0 + x * s
    const py = (h) => y0 - h * s
    const ridge = [[-38, 0], [-35, Ht + 1.4], [-28, Ht + 4.4], [-21, Ht + 3.0], [-14, Ht + 6.4], [-7, Ht + 4.2], [0, Ht + 5.5], [6, Ht + 3.6], [13, Ht + 7.0], [20, Ht + 4.0], [27, Ht + 5.3], [34, Ht + 1.6], [38, 0]]
    ctx.beginPath()
    ridge.forEach(([x, h], i) => (i ? ctx.lineTo(px(x), py(h)) : ctx.moveTo(px(x), py(h))))
    ctx.closePath()
    // the opening (drawn the other way round, so even-odd cuts it out)
    const r = WT
    ctx.moveTo(px(WT), py(0))
    ctx.lineTo(px(WT), py(Ht - r))
    ctx.ellipse(px(0), py(Ht - r), r * s, r * s, 0, 0, Math.PI, true)
    ctx.lineTo(px(-WT), py(0))
    ctx.closePath()
    const face = ctx.createLinearGradient(0, py(Ht + 7), 0, y0)
    face.addColorStop(0, pal.rock)
    face.addColorStop(1, pal.rockDark)
    ctx.fillStyle = face
    ctx.fill('evenodd')
    // rock facets: the shady side of every peak
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    for (let i = 1; i < ridge.length - 1; i++) {
      const [x, h] = ridge[i]
      const [nx, nh] = ridge[i + 1]
      if (h < nh) continue
      ctx.moveTo(px(x), py(h)); ctx.lineTo(px(nx), py(nh)); ctx.lineTo(px(x + 1.2), py(Ht + 1.2)); ctx.closePath()
    }
    ctx.fill()
    // a cap on every peak: snow, sand or grass
    ctx.fillStyle = pal.weather === 'snow' ? '#f8fbff' : pal.bg === 'mesas' ? '#e8c48c' : pal.grass[1]
    ctx.beginPath()
    for (let i = 1; i < ridge.length - 1; i++) {
      const [x, h] = ridge[i]
      if (h < Ht + 3.5) continue
      const k = Math.min(1.6, (h - Ht) * 0.28)
      ctx.moveTo(px(x - k * 1.9), py(h - k * 1.1)); ctx.lineTo(px(x), py(h)); ctx.lineTo(px(x + k * 1.9), py(h - k * 1.1))
      ctx.lineTo(px(x + k * 0.8), py(h - k * 0.75)); ctx.lineTo(px(x), py(h - k * 1.05)); ctx.lineTo(px(x - k * 0.9), py(h - k * 0.7)); ctx.closePath()
    }
    ctx.fill()
    ctx.strokeStyle = '#d6d3d1'
    ctx.lineWidth = Math.max(2, 0.32 * s)
    ctx.beginPath()
    ctx.moveTo(px(WT + 0.16), py(0))
    ctx.lineTo(px(WT + 0.16), py(Ht - r))
    ctx.ellipse(px(0), py(Ht - r), (r + 0.16) * s, (r + 0.16) * s, 0, 0, Math.PI, true)
    ctx.lineTo(px(-WT - 0.16), py(0))
    ctx.stroke()
    // a sign over the portal
    const sw = 2.4 * s
    const sh = 0.5 * s
    ctx.fillStyle = '#1d4ed8'
    ctx.fillRect(px(0) - sw / 2, py(Ht + 0.95), sw, sh)
    if (sh > 7) {
      ctx.fillStyle = '#fff'
      ctx.font = `900 ${Math.round(sh * 0.62)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TUNNEL', px(0), py(Ht + 0.95) + sh / 2)
    }
  }

  /* Inside a dark tunnel everything goes dim; headlights cut a bright cone. */
  function darkness() {
    const lit = game.lightsOn
    ctx.fillStyle = `rgba(4,6,12,${((lit ? 0.38 : 0.82) * game.tunnelDark).toFixed(3)})`
    ctx.fillRect(-12, -12, W + 24, H + 24)
    if (lit) {
      const prev = ctx.globalCompositeOperation
      ctx.globalCompositeOperation = 'lighter'
      headlights(1.4 * game.tunnelDark)
      ctx.globalCompositeOperation = prev
    }
  }

  function drawCar() {
    const cs = game.carSetup
    const spr = carSprite(cs.id, cs.color, cs.engine)
    const m = spr.model
    const s = SC(CAR_Z)
    const w = m.units * CAR_SCALE * s
    const h = (w * m.h) / m.w
    const bx = X(car.x + car.jx, CAR_Z)
    const by = Y(CAR_Z)
    const k = 1 - Math.min(0.6, car.y * 0.3)
    ctx.fillStyle = 'rgba(0,0,0,0.38)'
    ctx.beginPath()
    ctx.ellipse(bx, by - 1, w * 0.52 * k, Math.max(2, w * 0.09 * k), 0, 0, Math.PI * 2)
    ctx.fill()
    if (cs.engine >= 3) glowAt(com.glow.cyan, bx, by - 2, w * 0.7 * k, 0.75 + 0.25 * Math.sin(t * 6), 0.22)

    const ok = t - game.fx.okT0
    if (ok >= 0 && ok < 0.55) {
      const p = ok / 0.55
      ctx.strokeStyle = `rgba(74,222,128,${(1 - p).toFixed(2)})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(bx, by - 2, w * (0.55 + p * 0.5), w * (0.12 + p * 0.1), 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    const sh = t - game.fx.shieldT0
    if (sh >= 0 && sh < 1.1) {
      const p = sh / 1.1
      ctx.strokeStyle = `rgba(56,189,248,${(1 - p).toFixed(2)})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.ellipse(bx, by - h * 0.5, w * (0.7 + p * 0.3), h * (0.75 + p * 0.3), 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = `rgba(56,189,248,${(0.18 * (1 - p)).toFixed(3)})`
      ctx.fill()
    }

    ctx.save()
    ctx.translate(bx, by - car.y * s)
    ctx.rotate(car.rot)
    ctx.scale(car.sx, 1)
    // exhaust flames behind the body: big while boosting; the top turbo flickers all the time
    const boosting = t < game.fx.boostUntil
    if ((boosting && cs.turbo >= 1) || cs.turbo >= 3) {
      const flick = 0.75 + 0.5 * hash(Math.floor(t * 30))
      const size = w * (boosting ? 0.2 + cs.turbo * 0.04 : 0.08) * flick
      const gl = cs.turbo >= 3 ? com.glow.orange : cs.turbo >= 2 ? com.glow.cyan : com.glow.amber
      for (const [ex, ey] of m.exhaust) glowAt(gl, -w / 2 + (ex / m.w) * w, -h + (ey / m.h) * h + size * 0.3, size, 1)
    }
    ctx.drawImage(spr.img, -w / 2, -h, w, h)
    const glow = game.braking ? 1 : lightsOn || game.tunnelDark > 0.2 ? 0.45 : 0
    if (glow > 0) {
      for (const [tx, ty] of m.tail) glowAt(com.glow.red, -w / 2 + (tx / m.w) * w, -h + (ty / m.h) * h, w * 0.17, glow)
    }
    ctx.restore()

    const ht = t - game.fx.honkT0
    if (ht >= 0 && ht < 1.1) {
      const a = clamp(1.4 - ht * 1.3)
      const fs = Math.round(clamp(w * 0.11, 14, 30))
      ctx.globalAlpha = a
      ctx.font = `900 ${fs}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tx = bx
      const ty = by - h - fs * 1.4 - ht * 14
      const tw = ctx.measureText('BEEP BEEP!').width + fs * 1.4
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(tx - tw / 2, ty - fs, tw, fs * 2, fs); else ctx.rect(tx - tw / 2, ty - fs, tw, fs * 2)
      ctx.fill()
      ctx.fillStyle = '#1f2937'
      ctx.fillText('BEEP BEEP!', tx, ty + 1)
      ctx.globalAlpha = 1
    }
  }

  // speed lines while boosting
  if (t < game.fx.boostUntil && !game.reduced) {
    const R = Math.hypot(W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + 0.17
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      if (sa < -0.2) continue
      const r0 = ((t * 1.7 + i * 0.37) % 1) * R * 0.55 + R * 0.12
      ctx.moveTo(cx + ca * r0, yH + sa * r0)
      ctx.lineTo(cx + ca * (r0 + 80), yH + sa * (r0 + 80))
    }
    ctx.stroke()
  }

  // weather (screen space, a fixed handful of streaks / flakes)
  const rainA = (palA.weather === 'rain' ? 1 - kB : 0) + (palB.weather === 'rain' && palB !== palA ? kB : 0)
  const snowA = (palA.weather === 'snow' ? 1 - kB : 0) + (palB.weather === 'snow' && palB !== palA ? kB : 0)
  const inside = game.tunnelDark > 0.5
  if (rainA > 0.02 && !inside) {
    ctx.strokeStyle = `rgba(210,222,240,${(0.5 * rainA).toFixed(3)})`
    ctx.lineWidth = 1.3
    ctx.beginPath()
    const n = L.wide ? 140 : 80
    for (let i = 0; i < n; i++) {
      const sp = 700 + hash(i + 900) * 400
      const y = ((hash(i + 500) * (H + 60) + t * sp) % (H + 60)) - 30
      const x = ((hash(i) * (W + 80) - t * sp * 0.18) % (W + 80) + W + 80) % (W + 80) - 40
      ctx.moveTo(x, y)
      ctx.lineTo(x - 5, y + 20)
    }
    ctx.stroke()
  }
  if (snowA > 0.02 && !inside) {
    ctx.fillStyle = `rgba(255,255,255,${(0.85 * snowA).toFixed(3)})`
    ctx.beginPath()
    const n = L.wide ? 110 : 70
    for (let i = 0; i < n; i++) {
      const r = 1.2 + hash(i + 77) * 2.6
      const y = (hash(i + 300) * H + t * (40 + hash(i + 700) * 60)) % H
      const x = ((hash(i) * W + Math.sin(t * 1.3 + i) * 18 + t * 12) % W + W) % W
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  // confetti for a new best
  const ct = t - game.fx.confettiT0
  if (ct >= 0 && ct < 3.4 && !game.reduced) {
    for (let i = 0; i < 90; i++) {
      const hx = hash(i * 3 + 1)
      const hy = hash(i * 7 + 2)
      const hc = hash(i * 11 + 3)
      const y = -20 + ct * (180 + hy * 260) - hy * 160
      if (y < -20 || y > H) continue
      const x = hx * W + Math.sin(ct * (2 + hc * 3) + i) * 30
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(ct * (3 + hc * 6) + i)
      ctx.fillStyle = CONFETTI[i % CONFETTI.length]
      ctx.fillRect(-5, -3, 10, 6)
      ctx.restore()
    }
  }

  const ft = t - game.fx.flashT0
  if (ft >= 0 && ft < 0.45) {
    ctx.fillStyle = `rgba(239,68,68,${(0.32 * (1 - ft / 0.45)).toFixed(3)})`
    ctx.fillRect(-12, -12, W + 24, H + 24)
  }
  const gt = t - game.fx.goldT0
  if (gt >= 0 && gt < 0.5) {
    ctx.fillStyle = `rgba(250,204,21,${(0.22 * (1 - gt / 0.5)).toFixed(3)})`
    ctx.fillRect(-12, -12, W + 24, H + 24)
  }
  ctx.restore()
}
