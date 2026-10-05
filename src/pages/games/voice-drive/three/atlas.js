/*
 * Canvas textures for the VOICE DRIVE road: the asphalt tile with its markings,
 * the decal atlas (stop line, zebra, arrows, bumps, turbo pad…), the road-sign
 * atlas and the word labels (BANK, SCHOOL, billboards). Drawn once per scene.
 */
import { RepeatWrapping } from 'three'
import { canvasTexture } from '../../../../games/three/textures'
import { seeded } from '../../../../games/three/random'

export const ROAD_W = 9.6          // metres the road texture spans (3 lanes × 3 m + 0.3 m shoulders)
export const ROAD_TILE = 12        // metres one texture tile covers along the road

/*
 * Fine grain: light and dark specks of random strength. The specks are grouped into a dozen tones and
 * each tone is filled as one path — tens of thousands of single fillRect + colour strings took ~0.2 s
 * of the scene start (the road tile alone has ~63 000 specks).
 */
const TONES = 12
function grain(g, w, h, base, seed, n = 1, alpha = 0.09) {
  const r = seeded(seed)
  g.fillStyle = base
  g.fillRect(0, 0, w, h)
  const light = Array.from({ length: TONES }, () => [])
  const dark = Array.from({ length: TONES }, () => [])
  const count = (w * h) / 10 * n
  for (let i = 0; i < count; i++) {
    const v = r()
    const s = 1 + r() * 2
    const x = r() * w
    const y = r() * h
    const k = Math.abs(v - 0.5) * 2                       // 0 … 1: how strong the speck is
    ;(v > 0.5 ? light : dark)[Math.min(TONES - 1, Math.floor(k * TONES))].push(x, y, s)
  }
  const draw = (groups, rgb, a) => groups.forEach((list, t) => {
    if (!list.length) return
    g.fillStyle = `rgba(${rgb},${(a * (t + 0.5) / TONES).toFixed(3)})`
    g.beginPath()
    for (let i = 0; i < list.length; i += 3) g.rect(list[i], list[i + 1], list[i + 2], list[i + 2])
    g.fill()
  })
  draw(light, '255,255,255', alpha)
  draw(dark, '0,0,0', alpha * 1.3)
}

/* asphalt with lane markings; u across the road (0 → left edge), v along it */
export function roadTexture({ anisotropy = 8 } = {}) {
  const t = canvasTexture(512, 1024, (g, w, h) => {
    grain(g, w, h, '#55585e', 11, 1.2, 0.12)
    const px = w / ROAD_W
    // darker wheel tracks in every lane
    for (let lane = 0; lane < 3; lane++) {
      const cx = (0.3 + 1.5 + lane * 3) * px
      for (const off of [-0.8, 0.8]) {
        const gr = g.createLinearGradient(cx + off * px - 0.5 * px, 0, cx + off * px + 0.5 * px, 0)
        gr.addColorStop(0, 'rgba(0,0,0,0)')
        gr.addColorStop(0.5, 'rgba(0,0,0,0.13)')
        gr.addColorStop(1, 'rgba(0,0,0,0)')
        g.fillStyle = gr
        g.fillRect(cx + off * px - 0.5 * px, 0, px, h)
      }
    }
    // a few repair patches and cracks
    const r = seeded(5)
    for (let i = 0; i < 4; i++) {
      g.fillStyle = `rgba(0,0,0,${(0.05 + r() * 0.06).toFixed(3)})`
      g.fillRect(r() * w, r() * h, 30 + r() * 70, 20 + r() * 90)
    }
    g.strokeStyle = 'rgba(20,20,22,0.35)'
    g.lineWidth = 1.2
    for (let i = 0; i < 6; i++) {
      let x = r() * w
      let y = r() * h
      g.beginPath()
      g.moveTo(x, y)
      for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += 10 + r() * 20; g.lineTo(x, y) }
      g.stroke()
    }
    // markings: solid edge lines, dashed lane dividers (4 m dash, 8 m gap)
    const paint = (x0, x1, y0, y1) => {
      g.fillStyle = 'rgba(246,246,240,0.92)'
      g.fillRect(x0 * px, y0, (x1 - x0) * px, y1 - y0)
    }
    paint(0.18, 0.33, 0, h)
    paint(ROAD_W - 0.33, ROAD_W - 0.18, 0, h)
    const dash = (4 / ROAD_TILE) * h
    for (const x of [0.3 + 3, 0.3 + 6]) paint(x - 0.075, x + 0.075, h * 0.15, h * 0.15 + dash)
    // the shoulders a touch lighter
    g.fillStyle = 'rgba(255,255,255,0.04)'
    g.fillRect(0, 0, 0.18 * px, h)
    g.fillRect(w - 0.18 * px, 0, 0.18 * px, h)
  }, { repeat: true })
  t.anisotropy = anisotropy
  return t
}

/* side streets: plain asphalt */
export function asphaltTexture() {
  return canvasTexture(256, 256, (g, w, h) => grain(g, w, h, '#55585e', 23, 1.2, 0.12), { repeat: true })
}

/* ground: grass / sand / snow grain, tinted by the material colour */
export function groundTexture() {
  const t = canvasTexture(256, 256, (g, w, h) => {
    grain(g, w, h, '#b0b0b0', 7, 2.2, 0.22)
    const r = seeded(9)
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${(0.03 + r() * 0.05).toFixed(3)})`
      g.beginPath()
      g.ellipse(r() * w, r() * h, 8 + r() * 30, 6 + r() * 20, r() * 3, 0, Math.PI * 2)
      g.fill()
    }
  }, { repeat: true })
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  return t
}

/* paving slabs for the pavements */
export function paveTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    grain(g, w, h, '#c9c6bf', 31, 1, 0.1)
    g.strokeStyle = 'rgba(0,0,0,0.16)'
    g.lineWidth = 2
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(0, (i * h) / 4); g.lineTo(w, (i * h) / 4); g.stroke()
      g.beginPath(); g.moveTo((i * w) / 4, 0); g.lineTo((i * w) / 4, h); g.stroke()
    }
  }, { repeat: true })
}

/* ── decal atlas: 4 × 4 cells of 256 px ─────────────────────────────── */
export const DECAL = { stopline: 0, zebra: 1, arrowS: 2, arrowL: 3, arrowR: 4, giveway: 5, bumps: 6, pad: 7, ring: 8, slow: 9, dash: 10, rail: 11 }

export function decalAtlas() {
  const N = 4
  const S = 256
  const tex = canvasTexture(N * S, N * S, (g) => {
    const cell = (i, fn) => {
      const x = (i % N) * S
      const y = Math.floor(i / N) * S
      g.save()
      g.translate(x, y)
      g.beginPath()
      g.rect(0, 0, S, S)
      g.clip()
      fn(g)
      g.restore()
    }
    const white = 'rgba(246,246,240,0.95)'
    cell(DECAL.stopline, (c) => { c.fillStyle = white; c.fillRect(0, 0, S, S) })
    // zebra: stripes run along the road (v), spaced across it (u)
    cell(DECAL.zebra, (c) => {
      c.fillStyle = white
      for (let i = 0; i < 8; i++) c.fillRect(8 + i * 31.5, 0, 17, S)
    })
    // painted arrows: the shaft comes from the bottom of the cell (the near end), the head points up the road
    const arrow = (c, dir) => {
      c.fillStyle = white
      c.strokeStyle = white
      c.save()
      c.translate(S / 2 - dir * 30, S / 2)
      c.lineWidth = 26
      c.lineCap = 'butt'
      c.beginPath()
      if (dir) {
        c.moveTo(0, 124)
        c.lineTo(0, 10)
        c.quadraticCurveTo(0, -46, dir * 52, -46)
        c.stroke()
        c.beginPath(); c.moveTo(dir * 50, -96); c.lineTo(dir * 112, -46); c.lineTo(dir * 50, 4); c.closePath(); c.fill()
      } else {
        c.moveTo(0, 124); c.lineTo(0, -30); c.stroke()
        c.beginPath(); c.moveTo(-50, -26); c.lineTo(0, -124); c.lineTo(50, -26); c.closePath(); c.fill()
      }
      c.restore()
    }
    cell(DECAL.arrowS, (c) => arrow(c, 0))
    cell(DECAL.arrowL, (c) => arrow(c, -1))
    cell(DECAL.arrowR, (c) => arrow(c, 1))
    cell(DECAL.giveway, (c) => {
      c.fillStyle = white
      for (let i = 0; i < 6; i++) {
        const x = 10 + i * 41
        c.beginPath(); c.moveTo(x, S * 0.15); c.lineTo(x + 34, S * 0.15); c.lineTo(x + 17, S * 0.85); c.closePath(); c.fill()
      }
    })
    cell(DECAL.bumps, (c) => {
      c.fillStyle = '#f5c518'
      c.fillRect(0, 0, S, S)
      c.fillStyle = '#16181b'
      for (let i = 0; i < 8; i += 2) c.fillRect(i * 32, 0, 32, S)
    })
    cell(DECAL.pad, (c) => {
      c.fillStyle = 'rgba(0,0,0,0)'
      c.clearRect(0, 0, S, S)
      c.fillStyle = '#ffffff'
      for (let i = 0; i < 3; i++) {
        const y = 200 - i * 78
        c.beginPath()
        c.moveTo(30, y); c.lineTo(128, y - 70); c.lineTo(226, y); c.lineTo(226, y - 26); c.lineTo(128, y - 96); c.lineTo(30, y - 26)
        c.closePath(); c.fill()
      }
    })
    cell(DECAL.ring, (c) => {
      c.fillStyle = white
      c.beginPath(); c.arc(S / 2, S / 2, S * 0.46, 0, Math.PI * 2); c.fill()
      c.globalCompositeOperation = 'destination-out'
      c.beginPath(); c.arc(S / 2, S / 2, S * 0.3, 0, Math.PI * 2); c.fill()
      c.globalCompositeOperation = 'source-over'
    })
    cell(DECAL.slow, (c) => {
      c.fillStyle = white
      c.font = '900 92px Arial, sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.save()
      c.translate(S / 2, S / 2)
      c.scale(1, 2.2)
      c.fillText('SLOW', 0, 0)
      c.restore()
    })
    cell(DECAL.dash, (c) => { c.fillStyle = white; c.fillRect(S * 0.42, 0, S * 0.16, S * 0.5) })
    cell(DECAL.rail, (c) => {
      c.fillStyle = '#5a5047'
      c.fillRect(0, 0, S, S)
      c.fillStyle = '#3a332d'
      for (let i = 0; i < 8; i++) c.fillRect(i * 32 + 6, 0, 18, S)
    })
  })
  tex.anisotropy = 8
  return tex
}

// 4 × 4 atlas cells [u0, v0, su, sv], made once (they are looked up every frame)
const CELLS_4x4 = Array.from({ length: 16 }, (_, i) => [(i % 4) / 4, 1 - (Math.floor(i / 4) + 1) / 4, 1 / 4, 1 / 4])
export const decalCell = (i) => CELLS_4x4[i]

/* ── road signs: 4 × 4 cells ────────────────────────────────────────── */
export const SIGN = { left: 0, right: 1, straight: 2, round: 3, works: 4, ped: 5, lights: 6, school: 7, bump: 8, rail: 9, animals: 10, tunnel: 11, fuel: 12, pickup: 13, turbo: 14, stop: 15 }

export function signAtlas() {
  const N = 4
  const S = 256
  const tex = canvasTexture(N * S, N * S, (g) => {
    const cell = (i, fn) => {
      g.save()
      g.translate((i % N) * S, Math.floor(i / N) * S)
      fn(g)
      g.restore()
    }
    const blueRound = (c, draw) => {
      c.fillStyle = '#ffffff'
      c.beginPath(); c.arc(128, 128, 122, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#1f5fbf'
      c.beginPath(); c.arc(128, 128, 112, 0, Math.PI * 2); c.fill()
      c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'
      draw(c)
    }
    const warn = (c, draw) => {
      c.fillStyle = '#ffffff'
      c.beginPath(); c.moveTo(128, 6); c.lineTo(250, 228); c.lineTo(6, 228); c.closePath(); c.fill()
      c.fillStyle = '#d4262c'
      c.beginPath(); c.moveTo(128, 18); c.lineTo(238, 222); c.lineTo(18, 222); c.closePath(); c.fill()
      c.fillStyle = '#ffffff'
      c.beginPath(); c.moveTo(128, 56); c.lineTo(208, 202); c.lineTo(48, 202); c.closePath(); c.fill()
      c.fillStyle = '#16181b'; c.strokeStyle = '#16181b'
      draw(c)
    }
    const blueSquare = (c, draw) => {
      c.fillStyle = '#ffffff'
      c.beginPath(); c.roundRect ? c.roundRect(8, 8, 240, 240, 26) : c.rect(8, 8, 240, 240); c.fill()
      c.fillStyle = '#1f5fbf'
      c.beginPath(); c.roundRect ? c.roundRect(18, 18, 220, 220, 20) : c.rect(18, 18, 220, 220); c.fill()
      c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'
      draw(c)
    }
    const arrowShape = (c, rot) => {
      c.save(); c.translate(128, 128); c.rotate(rot)
      c.beginPath(); c.moveTo(-60, 14); c.lineTo(10, 14); c.lineTo(10, 44); c.lineTo(66, 0); c.lineTo(10, -44); c.lineTo(10, -14); c.lineTo(-60, -14); c.closePath(); c.fill()
      c.restore()
    }
    cell(SIGN.left, (c) => blueRound(c, () => arrowShape(c, Math.PI)))
    cell(SIGN.right, (c) => blueRound(c, () => arrowShape(c, 0)))
    cell(SIGN.straight, (c) => blueRound(c, () => arrowShape(c, -Math.PI / 2)))
    cell(SIGN.round, (c) => blueRound(c, () => {
      for (let k = 0; k < 3; k++) {
        c.save(); c.translate(128, 128); c.rotate((k * Math.PI * 2) / 3)
        c.lineWidth = 20
        c.beginPath(); c.arc(0, 0, 58, -0.9, 0.55); c.stroke()
        c.beginPath(); c.moveTo(Math.cos(0.55) * 58 + 22, Math.sin(0.55) * 58 - 8); c.lineTo(Math.cos(0.9) * 58 - 6, Math.sin(0.9) * 58 + 24); c.lineTo(Math.cos(0.4) * 58 - 26, Math.sin(0.4) * 58 + 2); c.fill()
        c.restore()
      }
    }))
    cell(SIGN.works, (c) => warn(c, () => {
      c.beginPath(); c.arc(112, 108, 12, 0, Math.PI * 2); c.fill()
      c.lineWidth = 12; c.lineCap = 'round'
      c.beginPath(); c.moveTo(112, 124); c.lineTo(104, 160); c.lineTo(88, 190); c.moveTo(104, 160); c.lineTo(124, 188); c.moveTo(110, 134); c.lineTo(150, 150); c.stroke()
      c.beginPath(); c.moveTo(150, 150); c.lineTo(168, 186); c.stroke()
      c.beginPath(); c.moveTo(150, 194); c.lineTo(186, 194); c.lineTo(170, 176); c.closePath(); c.fill()
    }))
    const walker = (c, x, y, s = 1) => {
      c.save(); c.translate(x, y); c.scale(s, s)
      c.beginPath(); c.arc(0, -48, 11, 0, Math.PI * 2); c.fill()
      c.lineWidth = 11; c.lineCap = 'round'; c.lineJoin = 'round'
      c.beginPath(); c.moveTo(0, -34); c.lineTo(-4, 4); c.lineTo(-20, 36); c.moveTo(-4, 4); c.lineTo(14, 36); c.moveTo(-2, -26); c.lineTo(-22, -6); c.moveTo(-2, -26); c.lineTo(18, -10); c.stroke()
      c.restore()
    }
    cell(SIGN.ped, (c) => warn(c, () => {
      walker(c, 128, 160)
      c.fillRect(70, 196, 116, 6)
    }))
    cell(SIGN.lights, (c) => warn(c, () => {
      c.fillStyle = '#16181b'
      c.beginPath(); c.roundRect ? c.roundRect(104, 84, 48, 112, 10) : c.rect(104, 84, 48, 112); c.fill()
      ;[['#e5484d', 104], ['#ffb224', 140], ['#30a46c', 176]].forEach(([col, y]) => { c.fillStyle = col; c.beginPath(); c.arc(128, y, 14, 0, Math.PI * 2); c.fill() })
    }))
    cell(SIGN.school, (c) => warn(c, () => {
      walker(c, 104, 168, 0.92)
      walker(c, 156, 176, 0.72)
    }))
    cell(SIGN.bump, (c) => warn(c, () => {
      c.beginPath(); c.moveTo(60, 196); c.lineTo(96, 196); c.quadraticCurveTo(128, 120, 160, 196); c.lineTo(196, 196); c.lineTo(196, 202); c.lineTo(60, 202); c.closePath(); c.fill()
    }))
    cell(SIGN.rail, (c) => warn(c, () => {
      c.lineWidth = 9
      for (const x of [86, 170]) { c.beginPath(); c.moveTo(x, 100); c.lineTo(x, 196); c.stroke() }
      for (let y = 112; y < 196; y += 20) c.fillRect(74, y, 108, 7)
    }))
    cell(SIGN.animals, (c) => warn(c, () => {
      c.beginPath(); c.ellipse(128, 156, 44, 24, 0, 0, Math.PI * 2); c.fill()
      c.beginPath(); c.ellipse(80, 136, 16, 13, -0.4, 0, Math.PI * 2); c.fill()
      c.lineWidth = 9
      for (const x of [100, 112, 146, 158]) { c.beginPath(); c.moveTo(x, 172); c.lineTo(x, 198); c.stroke() }
    }))
    cell(SIGN.tunnel, (c) => warn(c, () => {
      c.beginPath(); c.moveTo(58, 200); c.lineTo(58, 150); c.quadraticCurveTo(128, 70, 198, 150); c.lineTo(198, 200); c.closePath(); c.fill()
      c.fillStyle = '#ffffff'
      c.beginPath(); c.moveTo(96, 200); c.lineTo(96, 162); c.quadraticCurveTo(128, 118, 160, 162); c.lineTo(160, 200); c.closePath(); c.fill()
    }))
    cell(SIGN.fuel, (c) => blueSquare(c, () => {
      c.fillStyle = '#ffffff'
      c.beginPath(); c.roundRect ? c.roundRect(52, 66, 110, 130, 14) : c.rect(52, 66, 110, 130); c.fill()
      c.fillStyle = '#1f5fbf'
      c.fillRect(68, 82, 78, 40)
      c.fillStyle = '#ffffff'
      c.lineWidth = 10; c.strokeStyle = '#ffffff'
      c.beginPath(); c.moveTo(162, 100); c.lineTo(190, 116); c.lineTo(190, 176); c.quadraticCurveTo(190, 196, 172, 186); c.stroke()
      c.fillRect(42, 192, 132, 16)
    }))
    cell(SIGN.pickup, (c) => blueSquare(c, () => {
      c.fillStyle = '#ffffff'
      c.beginPath(); c.roundRect ? c.roundRect(46, 62, 164, 104, 18) : c.rect(46, 62, 164, 104); c.fill()
      c.fillStyle = '#1f5fbf'
      c.fillRect(62, 78, 58, 40); c.fillRect(132, 78, 62, 40)
      c.fillStyle = '#ffffff'
      c.beginPath(); c.arc(84, 176, 16, 0, Math.PI * 2); c.arc(172, 176, 16, 0, Math.PI * 2); c.fill()
      c.font = '900 34px Arial, sans-serif'; c.textAlign = 'center'; c.fillText('BUS', 128, 228)
    }))
    cell(SIGN.turbo, (c) => {
      c.fillStyle = '#16181b'
      c.beginPath(); c.roundRect ? c.roundRect(8, 8, 240, 240, 30) : c.rect(8, 8, 240, 240); c.fill()
      c.fillStyle = '#ffb224'
      c.beginPath(); c.moveTo(150, 30); c.lineTo(70, 140); c.lineTo(122, 140); c.lineTo(100, 226); c.lineTo(190, 106); c.lineTo(136, 106); c.closePath(); c.fill()
    })
    cell(SIGN.stop, (c) => {
      c.fillStyle = '#ffffff'
      c.beginPath()
      for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * Math.PI) / 4; c.lineTo(128 + Math.cos(a) * 122, 128 + Math.sin(a) * 122) }
      c.closePath(); c.fill()
      c.fillStyle = '#d4262c'
      c.beginPath()
      for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + (k * Math.PI) / 4; c.lineTo(128 + Math.cos(a) * 110, 128 + Math.sin(a) * 110) }
      c.closePath(); c.fill()
      c.fillStyle = '#ffffff'; c.font = '900 72px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', 128, 132)
    })
  })
  tex.anisotropy = 4
  return tex
}

export const signCell = (i) => CELLS_4x4[i]

/* the engine's sign faces → atlas cells */
export const SIGN_FACE = {
  left: SIGN.left, right: SIGN.right, straight: SIGN.straight, round: SIGN.round, works: SIGN.works, ped: SIGN.ped,
  lights: SIGN.lights, school: SIGN.school, bump: SIGN.bump, rail: SIGN.rail, animals: SIGN.animals, tunnel: SIGN.tunnel,
  fuel: SIGN.fuel, pickup: SIGN.pickup, turbo: SIGN.turbo,
}
