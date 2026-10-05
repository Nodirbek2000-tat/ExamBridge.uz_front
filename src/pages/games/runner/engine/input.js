/*
 * TOBY RUN — controls (RUNNER_PLAN §B2): swipes, keys and on-screen buttons → actions.
 *
 *   const unbind = bindInput(layer, { onAction, onPause })     layer: the swipe layer over the canvas
 *   keyAction(key) / swipeAction(dx, dy) are pure (node tests)
 *
 * A swipe fires during the move, as soon as the finger has gone ≥ 24 px within 250 ms along the
 * dominant axis — no waiting for the finger to lift. A tap (no swipe) does nothing, so taps on the
 * cards above the layer still work. The jump buffer (150 ms) and coyote time (80 ms) live in physics.js.
 */
export const SWIPE_MIN = 24
export const SWIPE_MS = 250

const KEYS = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', Spacebar: 'jump',
  ArrowDown: 'roll', s: 'roll', S: 'roll',
  p: 'pause', P: 'pause', Escape: 'pause',
}

export const keyAction = (key) => KEYS[key] || null

export function swipeAction(dx, dy, min = SWIPE_MIN) {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < min) return null
  if (ax >= ay) return dx < 0 ? 'left' : 'right'
  return dy < 0 ? 'jump' : 'roll'
}

export function bindInput(layer, { onAction, onPause } = {}) {
  let start = null          // { id, x, y, t, fired }
  const down = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), fired: false }
  }
  const move = (e) => {
    if (!start || start.fired || e.pointerId !== start.id) return
    if (performance.now() - start.t > SWIPE_MS) {
      // a slow drag: measure from here on
      start = { ...start, x: e.clientX, y: e.clientY, t: performance.now() }
      return
    }
    const a = swipeAction(e.clientX - start.x, e.clientY - start.y)
    if (a) {
      start.fired = true
      onAction?.(a)
    }
  }
  const up = (e) => { if (start && e.pointerId === start.id) start = null }
  const key = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    const t = e.target
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
    const a = keyAction(e.key)
    if (!a) return
    if (a === 'jump' && e.key === ' ' && t?.tagName === 'BUTTON') return     // Space on a focused button presses it
    e.preventDefault()
    if (e.repeat && a !== 'pause') return
    if (a === 'pause') onPause?.()
    else onAction?.(a)
  }
  layer?.addEventListener('pointerdown', down)
  layer?.addEventListener('pointermove', move)
  layer?.addEventListener('pointerup', up)
  layer?.addEventListener('pointercancel', up)
  window.addEventListener('keydown', key)
  return () => {
    layer?.removeEventListener('pointerdown', down)
    layer?.removeEventListener('pointermove', move)
    layer?.removeEventListener('pointerup', up)
    layer?.removeEventListener('pointercancel', up)
    window.removeEventListener('keydown', key)
  }
}
