/*
 * Ornaments — the one 1024² atlas of Tashkent-inspired patterns the 3D runner dresses its world with
 * (RUNNER_PLAN §B1), drawn with the 2D canvas at run time (no image files, no three.js import, so a
 * shop screen can draw the same swatches into a small <canvas>).
 *
 *   ORNAMENT_KEYS                       the 16 atlas cells, row by row (4 × 4, 256 px each)
 *   ornamentCanvas()                    → the 1024² atlas canvas (drawn once, cached)
 *   ornamentCell(key)                   → [u0, v0, su, sv] of a cell (texture space, flipY like CanvasTexture)
 *   ornamentTile(key, size = 256)       → a canvas of one pattern on its own (for RepeatWrapping surfaces:
 *                                         marble floors, ganch vaults, cobblestone, ballast…)
 *   drawOrnament(g, key, x, y, size)    → draws one pattern into any 2D context (shop swatches)
 *   cellUv(geometry, key, inset)        → remaps a geometry's 0..1 uvs into a cell (merged, textured props)
 *   CARPETS                             the shop's carpets: [{ id, key, title }]
 *
 * Patterns: girih (8-point khatam stars), ikat (khan-atlas feathered zig-zags), suzani (rosettes), ganch
 * (carved plaster lattice), marble, awning stripes, a carriage window strip, a generic METRO sign (Latin,
 * no real logo), six carpets, a glazed majolica tile, plain white (untextured parts of merged meshes).
 * Extra tiles outside the atlas: cobble, ballast, paving, grass.
 * Palette: lapis #2E5AAC · turquoise #2BB3C0 · saffron #F5B14C · pomegranate #D94A5A · cream #F6EBD9.
 */
import { seeded } from './random'

export const ORN = {
  lapis: '#2E5AAC', lapisDeep: '#1E3F82', navy: '#16224A', turquoise: '#2BB3C0', turqDeep: '#16808C',
  saffron: '#F5B14C', gold: '#D9982E', pomegranate: '#D94A5A', pomDeep: '#9E2A3C', cream: '#F6EBD9',
  ivory: '#FFF8EC', ink: '#1B1B26', leaf: '#3E8F5A', plum: '#5B3A7A',
}

export const ORNAMENT_KEYS = [
  'girih', 'ikat', 'suzani', 'ganch',
  'marble', 'awning', 'windows', 'metro',
  'carpet-klassik', 'carpet-ikat', 'carpet-suzani', 'carpet-girih',
  'carpet-tungi', 'carpet-oltin', 'tile', 'white',
]

export const CARPETS = [
  { id: 'carpet-klassik', key: 'carpet-klassik', title: 'Klassik' },
  { id: 'carpet-ikat', key: 'carpet-ikat', title: 'Ikat' },
  { id: 'carpet-suzani', key: 'carpet-suzani', title: 'Suzani' },
  { id: 'carpet-girih', key: 'carpet-girih', title: 'Girih' },
  { id: 'carpet-tungi', key: 'carpet-tungi', title: 'Tungi yulduz' },
  { id: 'carpet-oltin', key: 'carpet-oltin', title: 'Oltin' },
]

const CELL = 256
const COLS = 4

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/* ── small drawing helpers (everything in a 0..s box) ─────────────────── */

function star8(g, cx, cy, r, inner = 0.72) {
  g.beginPath()
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * inner : r
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  g.closePath()
}

function polygon(g, cx, cy, r, n, rot = 0) {
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2
    g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
  }
  g.closePath()
}

function rrect(g, x, y, w, h, r) {
  g.beginPath()
  if (g.roundRect) g.roundRect(x, y, w, h, r)
  else g.rect(x, y, w, h)
}

/* repeat fn(dx, dy) for the copies needed so a pattern wraps seamlessly at the cell edges */
function wrapped(s, fn) {
  for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) fn(dx, dy)
}

/* ── the patterns ──────────────────────────────────────────────────────── */

function girih(g, s, { bg = ORN.lapis, star = ORN.turquoise, line = ORN.cream, core = ORN.saffron } = {}) {
  g.fillStyle = bg
  g.fillRect(0, 0, s, s)
  const p = s / 2
  wrapped(s, (dx, dy) => {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const cx = i * p + dx
        const cy = j * p + dy
        // the 8-point star: two squares, one turned 45°
        g.fillStyle = star
        polygon(g, cx, cy, p * 0.36, 4, Math.PI / 4)
        g.fill()
        polygon(g, cx, cy, p * 0.36, 4, 0)
        g.fill()
        g.lineWidth = s * 0.012
        g.strokeStyle = line
        star8(g, cx, cy, p * 0.37, 0.76)
        g.stroke()
        g.fillStyle = core
        polygon(g, cx, cy, p * 0.12, 8, Math.PI / 8)
        g.fill()
        // the cross between four stars
        const ox = cx + p / 2
        const oy = cy + p / 2
        g.fillStyle = line
        g.globalAlpha = 0.9
        polygon(g, ox, oy, p * 0.16, 4, Math.PI / 4)
        g.fill()
        g.globalAlpha = 1
        g.fillStyle = bg
        polygon(g, ox, oy, p * 0.08, 4, Math.PI / 4)
        g.fill()
      }
    }
  })
  // interlace: thin straps along the diagonals
  g.strokeStyle = 'rgba(246,235,217,0.35)'
  g.lineWidth = s * 0.006
  wrapped(s, (dx, dy) => {
    g.beginPath()
    g.moveTo(dx, dy); g.lineTo(dx + s, dy + s)
    g.moveTo(dx + s, dy); g.lineTo(dx, dy + s)
    g.stroke()
  })
}

function ikat(g, s, { cols = [ORN.pomegranate, ORN.saffron, ORN.lapis, ORN.cream, ORN.turquoise, ORN.plum], seed = 4 } = {}) {
  const rnd = seeded(seed)
  const n = 4
  const w = s / n
  for (let c = 0; c < n; c++) {
    const base = cols[c % cols.length]
    const fig = cols[(c + 2) % cols.length]
    const edge = cols[(c + 4) % cols.length]
    g.fillStyle = base
    g.fillRect(c * w, 0, w + 1, s)
    // stacked lozenges (the "flames"), feathered edges: several shifted copies at low alpha
    const period = s / 2
    for (let k = -1; k < 3; k++) {
      const cy = k * period + period / 2 + (c % 2 ? period / 2 : 0)
      for (let f = 0; f < 6; f++) {
        const jx = (rnd() - 0.5) * w * 0.08
        const jy = (rnd() - 0.5) * period * 0.06
        g.globalAlpha = f === 0 ? 1 : 0.22
        g.fillStyle = fig
        g.beginPath()
        g.moveTo(c * w + w / 2 + jx, cy - period * 0.48 + jy)
        g.lineTo(c * w + w * 0.94 + jx, cy + jy)
        g.lineTo(c * w + w / 2 + jx, cy + period * 0.48 + jy)
        g.lineTo(c * w + w * 0.06 + jx, cy + jy)
        g.closePath()
        g.fill()
      }
      g.globalAlpha = 1
      g.fillStyle = edge
      g.beginPath()
      g.moveTo(c * w + w / 2, cy - period * 0.22)
      g.lineTo(c * w + w * 0.72, cy)
      g.lineTo(c * w + w / 2, cy + period * 0.22)
      g.lineTo(c * w + w * 0.28, cy)
      g.closePath()
      g.fill()
      g.fillStyle = base
      g.beginPath()
      g.arc(c * w + w / 2, cy, w * 0.07, 0, Math.PI * 2)
      g.fill()
    }
    // the thread streaks of the weave
    g.globalAlpha = 0.08
    g.fillStyle = '#000'
    for (let y = 0; y < s; y += 3) g.fillRect(c * w, y, w, 1)
    g.globalAlpha = 1
  }
}

function rosette(g, cx, cy, r, { petal = ORN.pomegranate, ring = ORN.pomDeep, core = ORN.saffron, leaf = ORN.leaf } = {}) {
  // leaves around
  g.fillStyle = leaf
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    g.beginPath()
    g.ellipse(cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05, r * 0.32, r * 0.13, a, 0, Math.PI * 2)
    g.fill()
  }
  // petals
  g.fillStyle = petal
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.beginPath()
    g.ellipse(cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62, r * 0.34, r * 0.2, a, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = ring
  g.beginPath(); g.arc(cx, cy, r * 0.52, 0, Math.PI * 2); g.fill()
  g.fillStyle = ORN.cream
  g.beginPath(); g.arc(cx, cy, r * 0.4, 0, Math.PI * 2); g.fill()
  g.fillStyle = petal
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    g.beginPath(); g.arc(cx + Math.cos(a) * r * 0.28, cy + Math.sin(a) * r * 0.28, r * 0.08, 0, Math.PI * 2); g.fill()
  }
  g.fillStyle = core
  g.beginPath(); g.arc(cx, cy, r * 0.15, 0, Math.PI * 2); g.fill()
}

function suzani(g, s, { bg = ORN.cream } = {}) {
  g.fillStyle = bg
  g.fillRect(0, 0, s, s)
  wrapped(s, (dx, dy) => {
    rosette(g, s * 0.25 + dx, s * 0.25 + dy, s * 0.17)
    rosette(g, s * 0.75 + dx, s * 0.75 + dy, s * 0.17, { petal: ORN.lapis, ring: ORN.lapisDeep })
    // small blossoms on the vines between
    for (const [x, y] of [[0.75, 0.25], [0.25, 0.75]]) {
      g.strokeStyle = ORN.leaf
      g.lineWidth = s * 0.012
      g.beginPath()
      g.moveTo(x * s + dx - s * 0.12, y * s + dy)
      g.quadraticCurveTo(x * s + dx, y * s + dy - s * 0.1, x * s + dx + s * 0.12, y * s + dy)
      g.stroke()
      g.fillStyle = ORN.saffron
      g.beginPath(); g.arc(x * s + dx, y * s + dy - s * 0.03, s * 0.04, 0, Math.PI * 2); g.fill()
      g.fillStyle = ORN.pomegranate
      g.beginPath(); g.arc(x * s + dx, y * s + dy - s * 0.03, s * 0.018, 0, Math.PI * 2); g.fill()
    }
  })
}

/* carved plaster: a lattice of pointed arches with a shadow below and a highlight above each cut */
function ganch(g, s) {
  g.fillStyle = '#EFE6D6'
  g.fillRect(0, 0, s, s)
  const p = s / 4
  const cut = (dx, dy, color, w) => {
    g.strokeStyle = color
    g.lineWidth = w
    for (let i = -1; i <= 4; i++) {
      for (let j = -1; j <= 4; j++) {
        const x = i * p + dx
        const y = j * p + dy
        // a pointed arch cell
        g.beginPath()
        g.moveTo(x, y + p)
        g.lineTo(x, y + p * 0.5)
        g.quadraticCurveTo(x, y + p * 0.1, x + p / 2, y)
        g.quadraticCurveTo(x + p, y + p * 0.1, x + p, y + p * 0.5)
        g.lineTo(x + p, y + p)
        g.stroke()
        // a small star in it
        star8(g, x + p / 2, y + p * 0.58, p * 0.16, 0.55)
        g.stroke()
      }
    }
  }
  cut(1.6, 1.6, 'rgba(120,96,64,0.28)', s * 0.014)
  cut(-1, -1, 'rgba(255,255,255,0.9)', s * 0.012)
  cut(0, 0, 'rgba(176,150,112,0.45)', s * 0.006)
}

function marble(g, s, { bg = '#EEE9E1', vein = 'rgba(120,112,104,', seed = 9 } = {}) {
  const rnd = seeded(seed)
  g.fillStyle = bg
  g.fillRect(0, 0, s, s)
  // soft clouds
  for (let i = 0; i < 26; i++) {
    const x = rnd() * s
    const y = rnd() * s
    const r = s * (0.08 + rnd() * 0.18)
    const gr = g.createRadialGradient(x, y, 0, x, y, r)
    gr.addColorStop(0, rnd() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(205,196,184,0.25)')
    gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    wrapped(s, (dx, dy) => g.fillRect(x - r + dx, y - r + dy, r * 2, r * 2))
  }
  // veins
  for (let i = 0; i < 9; i++) {
    let x = rnd() * s
    let y = rnd() * s
    const ang = rnd() * Math.PI
    const len = s * (0.4 + rnd() * 0.6)
    const w = 0.5 + rnd() * 2.2
    const pts = []
    for (let k = 0; k < 14; k++) {
      x += Math.cos(ang + (rnd() - 0.5) * 1.4) * len / 14
      y += Math.sin(ang + (rnd() - 0.5) * 1.4) * len / 14
      pts.push([x, y])
    }
    wrapped(s, (dx, dy) => {
      g.strokeStyle = `${vein}${(0.18 + rnd() * 0.22).toFixed(2)})`
      g.lineWidth = w
      g.beginPath()
      pts.forEach(([px, py], k) => (k ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy)))
      g.stroke()
    })
  }
}

function awning(g, s) {
  const n = 8
  const w = s / n
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? ORN.cream : ORN.turquoise
    g.fillRect(i * w, 0, w + 1, s)
  }
  // a saffron band and a gentle fold shading
  g.fillStyle = ORN.saffron
  g.fillRect(0, s * 0.86, s, s * 0.05)
  const gr = g.createLinearGradient(0, 0, 0, s)
  gr.addColorStop(0, 'rgba(255,255,255,0.12)')
  gr.addColorStop(1, 'rgba(0,0,0,0.14)')
  g.fillStyle = gr
  g.fillRect(0, 0, s, s)
}

function windows(g, s) {
  g.fillStyle = ORN.lapis
  g.fillRect(0, 0, s, s)
  g.fillStyle = ORN.cream
  g.fillRect(0, s * 0.74, s, s * 0.06)
  g.fillStyle = ORN.turquoise
  g.fillRect(0, s * 0.82, s, s * 0.03)
  for (let i = 0; i < 3; i++) {
    const x = s * 0.06 + i * s * 0.32
    rrect(g, x, s * 0.16, s * 0.26, s * 0.48, s * 0.05)
    const gr = g.createLinearGradient(x, s * 0.16, x + s * 0.26, s * 0.64)
    gr.addColorStop(0, '#2A3F5E')
    gr.addColorStop(1, '#0E1726')
    g.fillStyle = gr
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.16)'
    g.beginPath()
    g.moveTo(x + s * 0.03, s * 0.6)
    g.lineTo(x + s * 0.14, s * 0.2)
    g.lineTo(x + s * 0.2, s * 0.2)
    g.lineTo(x + s * 0.09, s * 0.6)
    g.closePath()
    g.fill()
  }
}

function metro(g, s) {
  g.fillStyle = ORN.navy
  g.fillRect(0, 0, s, s)
  rrect(g, s * 0.05, s * 0.28, s * 0.9, s * 0.44, s * 0.08)
  g.fillStyle = ORN.lapis
  g.fill()
  g.fillStyle = ORN.saffron
  g.beginPath(); g.arc(s * 0.22, s * 0.5, s * 0.13, 0, Math.PI * 2); g.fill()
  g.fillStyle = ORN.navy
  g.font = `900 ${Math.round(s * 0.17)}px Inter, "Segoe UI", Arial, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('M', s * 0.22, s * 0.51)
  g.fillStyle = ORN.cream
  g.font = `800 ${Math.round(s * 0.13)}px Inter, "Segoe UI", Arial, sans-serif`
  g.textAlign = 'left'
  g.fillText('METRO', s * 0.4, s * 0.51)
}

function tile(g, s) {
  g.fillStyle = '#F4F7F6'
  g.fillRect(0, 0, s, s)
  const p = s / 2
  wrapped(s, (dx, dy) => {
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const cx = i * p + p / 2 + dx
        const cy = j * p + p / 2 + dy
        // four petals (turquoise), a lapis star, saffron heart
        g.fillStyle = ORN.turquoise
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2
          g.beginPath()
          g.ellipse(cx + Math.cos(a) * p * 0.2, cy + Math.sin(a) * p * 0.2, p * 0.2, p * 0.1, a, 0, Math.PI * 2)
          g.fill()
        }
        g.fillStyle = ORN.lapis
        star8(g, cx, cy, p * 0.14, 0.6)
        g.fill()
        g.fillStyle = ORN.saffron
        g.beginPath(); g.arc(cx, cy, p * 0.05, 0, Math.PI * 2); g.fill()
        // corner quarter-flowers meet across tiles
        g.fillStyle = ORN.lapis
        g.beginPath(); g.arc(i * p + dx, j * p + dy, p * 0.12, 0, Math.PI * 2); g.fill()
      }
    }
  })
  // glaze: thin grout lines and a sheen
  g.strokeStyle = 'rgba(30,63,130,0.25)'
  g.lineWidth = 2
  for (let i = 0; i <= 2; i++) {
    g.beginPath(); g.moveTo(i * p, 0); g.lineTo(i * p, s); g.moveTo(0, i * p); g.lineTo(s, i * p); g.stroke()
  }
}

/* carpets: a field with a border, drawn whole (not tiled) */
function carpetFrame(g, s, { field, border, inner, guard }) {
  g.fillStyle = border
  g.fillRect(0, 0, s, s)
  g.fillStyle = guard
  g.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88)
  g.fillStyle = inner
  g.fillRect(s * 0.09, s * 0.09, s * 0.82, s * 0.82)
  g.fillStyle = field
  g.fillRect(s * 0.13, s * 0.13, s * 0.74, s * 0.74)
  // a running "tooth" motif in the border
  g.fillStyle = guard
  const n = 12
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    for (const [x, y, r] of [[t, 0.03, 0], [t, 0.97, Math.PI], [0.03, t, -Math.PI / 2], [0.97, t, Math.PI / 2]]) {
      g.save()
      g.translate(x * s, y * s)
      g.rotate(r)
      g.beginPath()
      g.moveTo(-s * 0.025, s * 0.018)
      g.lineTo(0, -s * 0.018)
      g.lineTo(s * 0.025, s * 0.018)
      g.closePath()
      g.fill()
      g.restore()
    }
  }
}

function inField(g, s, draw) {
  g.save()
  g.beginPath()
  g.rect(s * 0.13, s * 0.13, s * 0.74, s * 0.74)
  g.clip()
  draw()
  g.restore()
}

function carpet(g, s, kind) {
  if (kind === 'klassik') {
    carpetFrame(g, s, { field: '#A3263A', border: '#1E3F82', inner: ORN.cream, guard: ORN.saffron })
    inField(g, s, () => {
      // small guls in rows + a central medallion
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (i === 1 && j === 1) continue
          const cx = s * (0.25 + i * 0.25)
          const cy = s * (0.25 + j * 0.25)
          g.fillStyle = ORN.cream
          polygon(g, cx, cy, s * 0.07, 8, Math.PI / 8)
          g.fill()
          g.fillStyle = '#1E3F82'
          polygon(g, cx, cy, s * 0.04, 4, Math.PI / 4)
          g.fill()
        }
      }
      g.fillStyle = '#1E3F82'
      polygon(g, s / 2, s / 2, s * 0.17, 8, Math.PI / 8)
      g.fill()
      g.fillStyle = ORN.saffron
      star8(g, s / 2, s / 2, s * 0.12, 0.62)
      g.fill()
      g.fillStyle = '#A3263A'
      g.beginPath(); g.arc(s / 2, s / 2, s * 0.045, 0, Math.PI * 2); g.fill()
    })
  } else if (kind === 'ikat') {
    carpetFrame(g, s, { field: ORN.cream, border: ORN.plum, inner: ORN.saffron, guard: ORN.cream })
    inField(g, s, () => {
      g.save()
      g.translate(s * 0.13, s * 0.13)
      g.scale(0.74, 0.74)
      ikat(g, s, { seed: 7 })
      g.restore()
    })
  } else if (kind === 'suzani') {
    carpetFrame(g, s, { field: ORN.ivory, border: ORN.pomegranate, inner: ORN.leaf, guard: ORN.cream })
    inField(g, s, () => {
      rosette(g, s / 2, s / 2, s * 0.2)
      for (const [x, y] of [[0.24, 0.24], [0.76, 0.24], [0.24, 0.76], [0.76, 0.76]]) {
        rosette(g, x * s, y * s, s * 0.08, { petal: ORN.lapis, ring: ORN.lapisDeep })
      }
    })
  } else if (kind === 'girih') {
    carpetFrame(g, s, { field: ORN.lapis, border: ORN.saffron, inner: ORN.navy, guard: ORN.cream })
    inField(g, s, () => {
      g.save()
      g.translate(s * 0.13, s * 0.13)
      g.scale(0.37, 0.37)
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        g.save(); g.translate(i * s, j * s); girih(g, s); g.restore()
      }
      g.restore()
    })
  } else if (kind === 'tungi') {
    carpetFrame(g, s, { field: ORN.navy, border: '#0D1530', inner: ORN.saffron, guard: ORN.lapis })
    inField(g, s, () => {
      const rnd = seeded(21)
      for (let i = 0; i < 36; i++) {
        const x = s * (0.15 + rnd() * 0.7)
        const y = s * (0.15 + rnd() * 0.7)
        const r = s * (0.008 + rnd() * 0.012)
        g.fillStyle = rnd() < 0.7 ? '#FFE6A8' : '#BFE8FF'
        star8(g, x, y, r * 2.2, 0.35)
        g.fill()
      }
      // a big star and its constellation
      g.strokeStyle = 'rgba(255,230,168,0.5)'
      g.lineWidth = s * 0.006
      const pts = [[0.3, 0.62], [0.42, 0.48], [0.5, 0.5], [0.62, 0.36], [0.72, 0.42]]
      g.beginPath()
      pts.forEach(([x, y], k) => (k ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)))
      g.stroke()
      g.fillStyle = ORN.saffron
      star8(g, s * 0.5, s * 0.5, s * 0.07, 0.42)
      g.fill()
    })
  } else {
    // oltin: gold on gold, a damask lattice with pomegranate seeds
    carpetFrame(g, s, { field: '#E9B24A', border: '#8A5A12', inner: ORN.pomegranate, guard: '#FFE3A0' })
    inField(g, s, () => {
      g.strokeStyle = '#B87A1C'
      g.lineWidth = s * 0.012
      for (let i = -2; i <= 6; i++) {
        g.beginPath(); g.moveTo(s * 0.13 + i * s * 0.12, s * 0.13); g.lineTo(s * 0.13 + i * s * 0.12 + s * 0.74, s * 0.87); g.stroke()
        g.beginPath(); g.moveTo(s * 0.13 + i * s * 0.12, s * 0.87); g.lineTo(s * 0.13 + i * s * 0.12 + s * 0.74, s * 0.13); g.stroke()
      }
      g.fillStyle = '#FFF0C2'
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
        if ((i + j) % 2) continue
        g.beginPath(); g.arc(s * (0.19 + i * 0.12), s * (0.19 + j * 0.12), s * 0.018, 0, Math.PI * 2); g.fill()
      }
      g.fillStyle = ORN.pomegranate
      polygon(g, s / 2, s / 2, s * 0.09, 4, Math.PI / 4)
      g.fill()
    })
  }
  // pile: a soft sheen and the weave
  const gr = g.createLinearGradient(0, 0, s, s)
  gr.addColorStop(0, 'rgba(255,255,255,0.10)')
  gr.addColorStop(1, 'rgba(0,0,0,0.12)')
  g.fillStyle = gr
  g.fillRect(0, 0, s, s)
}

/* ── tiles outside the atlas ───────────────────────────────────────────── */

function stones(g, s, { base, light, dark, mortar, rows = 8, seed = 2, jitter = 0.18 }) {
  const rnd = seeded(seed)
  g.fillStyle = mortar
  g.fillRect(0, 0, s, s)
  const h = s / rows
  for (let r = 0; r < rows; r++) {
    const n = rows
    const w = s / n
    const off = r % 2 ? w / 2 : 0
    for (let c = -1; c <= n; c++) {
      const x = c * w + off
      const y = r * h
      const k = rnd()
      g.fillStyle = k < 0.33 ? light : k < 0.66 ? base : dark
      rrect(g, x + 1.5, y + 1.5, w - 3 - rnd() * w * jitter, h - 3 - rnd() * h * jitter, Math.min(w, h) * 0.3)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.10)'
      rrect(g, x + 3, y + 2.5, (w - 6) * 0.6, (h - 6) * 0.35, Math.min(w, h) * 0.2)
      g.fill()
    }
  }
}

function ballast(g, s) {
  const rnd = seeded(5)
  g.fillStyle = '#6B6863'
  g.fillRect(0, 0, s, s)
  for (let i = 0; i < 900; i++) {
    const x = rnd() * s
    const y = rnd() * s
    const r = 1.5 + rnd() * 3.5
    const v = Math.floor(70 + rnd() * 80)
    g.fillStyle = `rgb(${v},${v - 4},${v - 8})`
    wrapped(s, (dx, dy) => {
      g.beginPath(); g.ellipse(x + dx, y + dy, r, r * 0.8, rnd() * 3, 0, Math.PI * 2); g.fill()
    })
  }
}

function grass(g, s) {
  const rnd = seeded(8)
  g.fillStyle = '#6E9A4E'
  g.fillRect(0, 0, s, s)
  for (let i = 0; i < 1800; i++) {
    const x = rnd() * s
    const y = rnd() * s
    const v = rnd()
    g.fillStyle = v < 0.5 ? 'rgba(40,80,30,0.35)' : 'rgba(170,210,110,0.3)'
    g.fillRect(x, y, 1.5, 3 + rnd() * 3)
  }
}

/* ── public ────────────────────────────────────────────────────────────── */

const DRAW = {
  girih: (g, s) => girih(g, s),
  ikat: (g, s) => ikat(g, s),
  suzani: (g, s) => suzani(g, s),
  ganch: (g, s) => ganch(g, s),
  marble: (g, s) => marble(g, s),
  awning: (g, s) => awning(g, s),
  windows: (g, s) => windows(g, s),
  metro: (g, s) => metro(g, s),
  'carpet-klassik': (g, s) => carpet(g, s, 'klassik'),
  'carpet-ikat': (g, s) => carpet(g, s, 'ikat'),
  'carpet-suzani': (g, s) => carpet(g, s, 'suzani'),
  'carpet-girih': (g, s) => carpet(g, s, 'girih'),
  'carpet-tungi': (g, s) => carpet(g, s, 'tungi'),
  'carpet-oltin': (g, s) => carpet(g, s, 'oltin'),
  tile: (g, s) => tile(g, s),
  white: (g, s) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s) },
  // outside the atlas
  cobble: (g, s) => stones(g, s, { base: '#9A8E80', light: '#B3A898', dark: '#7F7468', mortar: '#5E554C', rows: 8, seed: 2 }),
  paving: (g, s) => stones(g, s, { base: '#CDB89A', light: '#DCCAAE', dark: '#BBA586', mortar: '#9C8770', rows: 4, seed: 6, jitter: 0.04 }),
  ballast: (g, s) => ballast(g, s),
  grass: (g, s) => grass(g, s),
  'marble-dark': (g, s) => marble(g, s, { bg: '#3B3F4C', vein: 'rgba(220,214,204,', seed: 12 }),
}

export const ORNAMENT_EXTRA = ['cobble', 'paving', 'ballast', 'grass', 'marble-dark']

/* draw one pattern into any 2D context at (x, y), size × size */
export function drawOrnament(g, key, x = 0, y = 0, size = CELL) {
  const fn = DRAW[key] || DRAW.white
  g.save()
  g.beginPath()
  g.rect(x, y, size, size)
  g.clip()
  g.translate(x, y)
  fn(g, size)
  g.restore()
}

let atlas = null
export function ornamentCanvas() {
  if (atlas) return atlas
  const c = makeCanvas(CELL * COLS, CELL * COLS)
  const g = c.getContext('2d')
  ORNAMENT_KEYS.forEach((key, i) => drawOrnament(g, key, (i % COLS) * CELL, Math.floor(i / COLS) * CELL, CELL))
  atlas = c
  return c
}

/* [u0, v0, su, sv] in texture space (CanvasTexture flips y: row 0 is at the top) */
export function ornamentCell(key, inset = 0) {
  const i = Math.max(0, ORNAMENT_KEYS.indexOf(key))
  const col = i % COLS
  const row = Math.floor(i / COLS)
  const k = 1 / COLS
  const e = inset / (CELL * COLS)
  return [col * k + e, 1 - (row + 1) * k + e, k - 2 * e, k - 2 * e]
}

const tiles = new Map()
export function ornamentTile(key, size = CELL) {
  const id = `${key}:${size}`
  let c = tiles.get(id)
  if (!c) {
    c = makeCanvas(size, size)
    drawOrnament(c.getContext('2d'), key, 0, 0, size)
    tiles.set(id, c)
  }
  return c
}

/* remap a geometry's 0..1 uvs into an atlas cell (a few texels in, so mipmaps do not bleed) */
export function cellUv(geometry, key, inset = 3) {
  const [u0, v0, su, sv] = ornamentCell(key, inset)
  const uv = geometry.attributes.uv
  if (!uv) return geometry
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * su, v0 + uv.getY(i) * sv)
  uv.needsUpdate = true
  return geometry
}

/* the uv of the plain white cell (untextured parts of a merged, atlas-textured mesh) */
export const WHITE_UV = (() => {
  const [u0, v0, su, sv] = ornamentCell('white')
  return [u0 + su / 2, v0 + sv / 2]
})()
