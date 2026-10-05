/*
 * TOBY RUN — the picture atlas (RUNNER_PLAN §B9.1 pictureAtlas.js): Toby's Day ItemArt SVGs rasterised
 * into one 1024² texture, 16 cells of 256 px, least-recently-used cells reused. The balloon, the arch
 * crest and Listen mode's balloons show the item's drawn picture from here.
 *
 *   const atlas = new PictureAtlas()
 *   atlas.want(['ticket', 'bus'])     queue pictures (drawn one at a time, a few ms each, ≥ 2 s before needed)
 *   atlas.cell('ticket')              → [u0, v0, su, sv] once drawn (null before) — marks it as used
 *   atlas.texture                     CanvasTexture; a new cell goes up alone (texSubImage2D through
 *                                     renderer.copyTextureToTexture), never the whole 4 MB atlas
 *   atlas.dispose()
 *
 * Rasterising: ItemIcon renders into a detached React root (flushSync), its SVG markup becomes an <img>
 * (data URL) and is drawn into the cell. No react-dom/server, no files.
 */
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { CanvasTexture, SRGBColorSpace, Vector2 } from 'three'
import { ItemIcon } from '../../tobys-day/items'
import { hasPicture } from '../engine/deck.js'

const SIZE = 1024
const CELL = 256
const COLS = 4
const PAD = 40                       // the picture sits on a round cream sticker

export class PictureAtlas {
  constructor(renderer = null) {
    this.renderer = renderer
    this.scratch = document.createElement('canvas')
    this.scratch.width = CELL
    this.scratch.height = CELL
    this.scratchTex = new CanvasTexture(this.scratch)
    this.at = new Vector2()
    this.canvas = document.createElement('canvas')
    this.canvas.width = SIZE
    this.canvas.height = SIZE
    this.g = this.canvas.getContext('2d')
    this.texture = new CanvasTexture(this.canvas)
    this.texture.colorSpace = SRGBColorSpace
    this.texture.anisotropy = 4
    this.slots = new Map()            // name → { i, ready, used }
    this.order = []                   // cell index → name
    this.queue = []
    this.busy = false
    this.dirty = false
    this.clock = 0
    this.host = document.createElement('div')
    this.root = null
    this.disposed = false
  }

  /* queue pictures to draw (unknown names are ignored) */
  want(names) {
    for (const n of names) this.wantOne(n)
  }

  /* one picture (called every frame by the balloon, arch and Listen balloons: no allocation once known) */
  wantOne(n) {
    if (!n || this.slots.has(n) || this.queue.includes(n) || !hasPicture({ picture: n })) return
    this.queue.push(n)
    this.pump()
  }

  /* the cell of a drawn picture, or null; marks it as used now */
  cell(name) {
    const s = name ? this.slots.get(name) : null
    if (!s || !s.ready) return null
    s.used = this.clock
    const col = s.i % COLS
    const row = Math.floor(s.i / COLS)
    const k = 1 / COLS
    return s.cellArr || (s.cellArr = [col * k, 1 - (row + 1) * k, k, k])
  }

  ready(name) { return !!this.slots.get(name)?.ready }

  /* once a frame: time for the LRU, and one texture upload when something changed */
  tick(t) {
    this.clock = t
    // a picture waiting for a free cell (every cell shown in the last 2 s) tries again
    if (this.queue.length && !this.busy) this.pump()
    if (this.dirty) {
      this.dirty = false
      this.texture.needsUpdate = true
    }
  }

  slotFor(name) {
    let i = -1
    if (this.order.length < COLS * COLS) i = this.order.length
    else {
      // the least recently used picture not shown in the last 2 s
      let best = Infinity
      for (const s of this.slots.values()) {
        if (s.ready && s.used < best && this.clock - s.used > 2) { best = s.used; i = s.i }
      }
      if (i < 0) return -1
      this.slots.delete(this.order[i])
    }
    this.order[i] = name
    const s = { i, ready: false, used: this.clock, cellArr: null }
    this.slots.set(name, s)
    return i
  }

  markup(name) {
    if (!this.root) this.root = createRoot(this.host)
    flushSync(() => this.root.render(createElement(ItemIcon, { name, size: CELL - PAD * 2 })))
    let svg = this.host.innerHTML
    if (!/xmlns=/.test(svg)) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    return svg
  }

  pump() {
    if (this.busy || this.disposed || !this.queue.length) return
    const name = this.queue.shift()
    const i = this.slotFor(name)
    if (i < 0) { this.queue.unshift(name); return }
    this.busy = true
    let svg = ''
    try { svg = this.markup(name) } catch { svg = '' }
    const done = () => {
      this.busy = false
      if (!this.disposed) setTimeout(() => this.pump(), 0)
    }
    if (!svg) { this.slots.delete(name); done(); return }
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      if (this.disposed || this.slots.get(name)?.i !== i) { done(); return }
      const x = (i % COLS) * CELL
      const y = Math.floor(i / COLS) * CELL
      // the sticker: a cream disc with the picture, drawn once into the scratch cell
      const g = this.scratch.getContext('2d')
      g.clearRect(0, 0, CELL, CELL)
      g.fillStyle = '#FFF8EC'
      g.beginPath(); g.arc(CELL / 2, CELL / 2, CELL / 2 - 6, 0, Math.PI * 2); g.fill()
      g.lineWidth = 6
      g.strokeStyle = '#E9DCC4'
      g.stroke()
      g.drawImage(img, PAD, PAD, CELL - PAD * 2, CELL - PAD * 2)
      // the atlas canvas keeps every cell (a lost context re-uploads it whole)
      this.g.clearRect(x, y, CELL, CELL)
      this.g.drawImage(this.scratch, x, y)
      let sent = false
      if (this.renderer) {
        try {
          // GL rows count from the bottom; the canvas is flipped on upload (flipY)
          this.renderer.copyTextureToTexture(this.scratchTex, this.texture, null, this.at.set(x, SIZE - y - CELL))
          sent = true
        } catch { sent = false }
      }
      if (!sent) this.dirty = true
      const s = this.slots.get(name)
      if (s) s.ready = true
      done()
    }
    img.onerror = () => { this.slots.delete(name); done() }
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  dispose() {
    this.disposed = true
    this.queue.length = 0
    this.texture.dispose()
    this.scratchTex.dispose()
    const root = this.root
    this.root = null
    // unmounting synchronously inside a React commit warns: do it after the current task
    if (root) setTimeout(() => { try { root.unmount() } catch { /* already gone */ } }, 0)
  }
}
