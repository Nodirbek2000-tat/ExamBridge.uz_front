/*
 * Canvas textures drawn at run time — no image files.
 *
 *   canvasTexture(w, h, draw, opts)      any 2D drawing as a texture
 *   plateTexture('01 A 777')             a licence plate (white, black border, flag + UZ)
 *   wordAtlas(words, opts)               billboards: one word per cell → { texture, cells: { word: [u, v, su, sv] } }
 *   windowsTexture({ lit })              building facade (glass + frames, a plain strip at v < 1/16)
 *   radialTexture(stops)                 soft blobs: contact shadows, glows, light pools
 *   noiseTexture(base, spread)           grass / sand / snow grain
 */
import { CanvasTexture, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three'
import { seeded } from './random'

export function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/* opts: { repeat: true, srgb: true, anisotropy, mipmaps } */
export function canvasTexture(w, h, draw, opts = {}) {
  const c = makeCanvas(w, h)
  const g = c.getContext('2d')
  draw(g, w, h)
  const t = new CanvasTexture(c)
  if (opts.srgb !== false) t.colorSpace = SRGBColorSpace
  if (opts.repeat) { t.wrapS = RepeatWrapping; t.wrapT = RepeatWrapping }
  if (opts.mipmaps === false) { t.generateMipmaps = false; t.minFilter = LinearFilter }
  t.anisotropy = opts.anisotropy || 4
  return t
}

/* Draw a licence plate into g at (x, y, w, h). Uzbek style: region code | number, flag and "UZ" at the right. */
export function drawPlate(g, x, y, w, h, text = '01 A 777') {
  const r = h * 0.12
  g.save()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h)
  g.fill()
  g.lineWidth = h * 0.05
  g.strokeStyle = '#111111'
  g.beginPath()
  g.roundRect ? g.roundRect(x + h * 0.05, y + h * 0.05, w - h * 0.1, h - h * 0.1, r * 0.7) : g.rect(x + h * 0.05, y + h * 0.05, w - h * 0.1, h - h * 0.1)
  g.stroke()
  const [region, ...rest] = String(text).split(' ')
  const sep = x + w * 0.17
  g.beginPath()
  g.moveTo(sep, y + h * 0.1)
  g.lineTo(sep, y + h * 0.9)
  g.stroke()
  g.fillStyle = '#111111'
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.font = `700 ${Math.round(h * 0.72)}px "Arial Narrow", "Roboto Condensed", Arial, sans-serif`
  const fit = (s, maxW) => Math.min(1, maxW / Math.max(1, g.measureText(s).width))
  const draw = (s, cx, maxW) => {
    const k = fit(s, maxW)
    g.save()
    g.translate(cx, y + h * 0.54)
    g.scale(k, 1)
    g.fillText(s, 0, 0)
    g.restore()
  }
  draw(region, x + w * 0.09, w * 0.12)
  draw(rest.join(' '), x + w * 0.5, w * 0.56)
  // flag (blue, white, green with thin red lines) and UZ
  const fx = x + w * 0.83
  const fw = w * 0.11
  const fy = y + h * 0.16
  const fh = h * 0.34
  const bands = ['#1eb3e6', '#ffffff', '#1eb53a']
  bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(fx, fy + (fh / 3) * i, fw, fh / 3) })
  g.fillStyle = '#ce1126'
  g.fillRect(fx, fy + fh / 3 - h * 0.012, fw, h * 0.024)
  g.fillRect(fx, fy + (2 * fh) / 3 - h * 0.012, fw, h * 0.024)
  g.lineWidth = h * 0.015
  g.strokeStyle = '#333333'
  g.strokeRect(fx, fy, fw, fh)
  g.fillStyle = '#1d3f8f'
  g.font = `700 ${Math.round(h * 0.3)}px Arial, sans-serif`
  g.fillText('UZ', fx + fw / 2, y + h * 0.72)
  g.restore()
}

export function plateTexture(text = '01 A 777') {
  return canvasTexture(512, 112, (g, w, h) => drawPlate(g, 0, 0, w, h, text))
}

/*
 * Billboard words, one per 2:1 cell: { texture, cell(word) → [u0, v0, su, sv] }.
 * styles cycle through `palettes` ({ bg, fg, accent }).
 */
export function wordAtlas(words, { cols = 4, cellW = 256, cellH = 128, palettes } = {}) {
  const list = [...new Set(words)]
  const rows = Math.max(1, Math.ceil(list.length / cols))
  const pal = palettes || [
    { bg: '#111118', fg: '#ffffff', accent: '#ffb224' },
    { bg: '#f4efe6', fg: '#16161d', accent: '#e5484d' },
    { bg: '#0d3b66', fg: '#ffffff', accent: '#5ec2f2' },
    { bg: '#ffb224', fg: '#16161d', accent: '#16161d' },
    { bg: '#1b4332', fg: '#f1faee', accent: '#95d5b2' },
    { bg: '#e5484d', fg: '#ffffff', accent: '#ffe08a' },
  ]
  const H = 1 << Math.ceil(Math.log2(rows * cellH))
  const W = cols * cellW
  const cells = {}
  const texture = canvasTexture(W, H, (g) => {
    list.forEach((word, i) => {
      const cx = (i % cols) * cellW
      const cy = Math.floor(i / cols) * cellH
      const p = pal[i % pal.length]
      g.fillStyle = p.bg
      g.fillRect(cx, cy, cellW, cellH)
      g.fillStyle = p.accent
      g.fillRect(cx, cy + cellH - cellH * 0.1, cellW, cellH * 0.1)
      g.fillRect(cx + cellW * 0.08, cy + cellH * 0.18, cellW * 0.12, cellH * 0.05)
      g.fillStyle = p.fg
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      let size = cellH * 0.42
      g.font = `800 ${size}px "Inter", "Segoe UI", Arial, sans-serif`
      const tw = g.measureText(word).width
      if (tw > cellW * 0.84) { size *= (cellW * 0.84) / tw; g.font = `800 ${size}px "Inter", "Segoe UI", Arial, sans-serif` }
      g.fillText(word, cx + cellW / 2, cy + cellH * 0.52)
      cells[word] = [cx / W, 1 - (cy + cellH) / H, cellW / W, cellH / H]
    })
  })
  return { texture, cells, cell: (w) => cells[w] || cells[list[0]] }
}

/*
 * A facade: 4 × 4 windows per tile. `lit` draws only the lit windows (an emissive map, black elsewhere).
 * The bottom 1/16 of the texture is plain wall (map roofs and ends there).
 */
export function windowsTexture({ lit = false, seed = 7, wall = '#d8d4cc', glass = '#5f7f99', frame = '#f2efe9' } = {}) {
  const rnd = seeded(seed)
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = lit ? '#000000' : wall
    g.fillRect(0, 0, w, h)
    const usable = h - h / 16
    const cell = 64
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = c * cell + 12
        const y = r * (usable / 4) + 12
        const ww = cell - 24
        const wh = usable / 4 - 22
        if (lit) {
          if (rnd() < 0.42) {
            const warm = rnd() < 0.8
            g.fillStyle = warm ? '#ffcf7a' : '#bfe3ff'
            g.globalAlpha = 0.65 + rnd() * 0.35
            g.fillRect(x + 2, y + 2, ww - 4, wh - 4)
            g.globalAlpha = 1
          }
        } else {
          g.fillStyle = frame
          g.fillRect(x - 3, y - 3, ww + 6, wh + 6)
          const gr = g.createLinearGradient(x, y, x + ww, y + wh)
          gr.addColorStop(0, glass)
          gr.addColorStop(1, '#2b3f52')
          g.fillStyle = gr
          g.fillRect(x, y, ww, wh)
          g.fillStyle = 'rgba(255,255,255,0.18)'
          g.fillRect(x, y, ww * 0.35, wh)
          g.fillStyle = frame
          g.fillRect(x + ww / 2 - 1.5, y, 3, wh)
        }
      }
    }
    if (!lit) {
      g.fillStyle = 'rgba(0,0,0,0.08)'
      for (let r = 1; r < 4; r++) g.fillRect(0, r * (usable / 4) - 2, w, 3)
    }
  }, { repeat: true })
}

/* Soft radial blob: stops = [[0, 'rgba(…)'], [1, 'rgba(…,0)']] */
export function radialTexture(stops, size = 128) {
  return canvasTexture(size, size, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    for (const [o, c] of stops) gr.addColorStop(o, c)
    g.fillStyle = gr
    g.fillRect(0, 0, w, h)
  }, { mipmaps: true })
}

/*
 * A rounded-rectangle soft shadow (cars, trucks): darker in the middle, fading out.
 * Built from stacked translucent rounded rectangles (no ctx.filter — Safari has none).
 */
export function contactShadowTexture(size = 128) {
  return canvasTexture(size, size * 2, (g, w, h) => {
    const steps = 18
    for (let i = 0; i < steps; i++) {
      const k = i / (steps - 1)                 // 0 = the outer halo … 1 = the core
      const m = w * (0.02 + k * 0.2)
      const r = w * (0.3 - k * 0.12)
      g.fillStyle = `rgba(0,0,0,${(0.05 + k * 0.03).toFixed(3)})`
      g.beginPath()
      if (g.roundRect) g.roundRect(m, m * 1.1, w - 2 * m, h - 2.2 * m, r)
      else g.rect(m, m * 1.1, w - 2 * m, h - 2.2 * m)
      g.fill()
    }
  })
}

/* Fine grain around a base colour (grass, sand, snow, gravel); tint further with material.color. */
export function noiseTexture({ base = '#808080', spread = 0.12, size = 256, seed = 3, blades = false } = {}) {
  const rnd = seeded(seed)
  return canvasTexture(size, size, (g, w, h) => {
    g.fillStyle = base
    g.fillRect(0, 0, w, h)
    const n = (w * h) / 18
    for (let i = 0; i < n; i++) {
      const v = (rnd() - 0.5) * 2 * spread
      g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`
      const s = blades ? 1 + rnd() * 1.5 : 1 + rnd() * 2.5
      g.fillRect(rnd() * w, rnd() * h, s, blades ? s * 3 : s)
    }
  }, { repeat: true })
}

/* Diagonal warning stripes (barriers, crossing arms, works). */
export function stripeTexture(a = '#e5484d', b = '#ffffff', n = 4) {
  return canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = b
    g.fillRect(0, 0, w, h)
    g.fillStyle = a
    const step = w / n
    for (let i = -1; i <= n; i++) {
      g.beginPath()
      g.moveTo(i * step, h)
      g.lineTo(i * step + step / 2, h)
      g.lineTo(i * step + step / 2 + h, 0)
      g.lineTo(i * step + h, 0)
      g.closePath()
      g.fill()
    }
  }, { repeat: true })
}
