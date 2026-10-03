/*
 * The road canvas: one requestAnimationFrame loop that advances the game and
 * draws it. No React state is touched per frame. While paused it draws once
 * and then idles. The canvas resolution is capped (DPR ≤ 2 and ≈ 3 MP, so a big
 * desktop screen does not cost more than a phone) and drops further if the
 * device cannot keep up.
 */
import { useEffect, useRef } from 'react'
import { drawWorld, hasBackground, makeLayout, warmBackground } from './render'

const MAX_PIXELS = 3.2e6
const idle = (fn) => (window.requestIdleCallback ? window.requestIdleCallback(fn, { timeout: 1000 }) : setTimeout(fn, 120))

export default function Road({ gameRef }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return undefined
    const view = { layout: null, dpr: 1, drop: 0, items: [], cache: {} }
    let raf = 0
    let last = 0
    let frames = 0
    let slow = 0
    let idleDrawn = false
    let warming = ''

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      const budget = Math.sqrt(MAX_PIXELS / (r.width * r.height))
      view.dpr = Math.max(0.75, Math.min(window.devicePixelRatio || 1, 2, budget) - view.drop)
      canvas.width = Math.round(r.width * view.dpr)
      canvas.height = Math.round(r.height * view.dpr)
      view.layout = makeLayout(r.width, r.height)
      view.cache = {}
      idleDrawn = false
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    ro?.observe(canvas)
    window.addEventListener('resize', resize)
    resize()

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = last ? (now - last) / 1000 : 0
      last = now
      const game = gameRef.current
      if (!game || !view.layout) return
      // adaptive resolution: mostly slow frames for ~1.5 s → fewer pixels
      if (dt > 0 && dt < 0.25 && !game.paused) {
        frames++
        if (dt > 1 / 45) slow++
        if (frames >= 90) {
          if (slow > 50 && view.dpr > 0.8) { view.drop += 0.35; resize() }
          frames = 0
          slow = 0
        }
      }
      game.frame(dt)
      // the next theme's sky is drawn while the browser is idle, before it rolls in
      const next = game.nextZone(game.dist)
      if (next && warming !== next.theme && !hasBackground(view, next.theme)) {
        warming = next.theme
        idle(() => { warmBackground(view, next.theme); warming = '' })
      }
      if (game.paused || game.halted) {
        if (idleDrawn) return
        idleDrawn = true
      } else idleDrawn = false
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0)
      drawWorld(ctx, game, view)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [gameRef])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
}
