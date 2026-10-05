/*
 * The selected car on a real 3D turntable (studio light, drag to turn).
 * three.js loads lazily; until it is ready — or when WebGL is missing — the
 * drawn SVG car stands in. Locked cars show as dark silhouettes.
 * onThumbs(map id → data URL) gets 3D thumbnails of every car (same renderer).
 */
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { CARS, carLook } from './cars'
import CarSvg from './CarSvg'

const loadStudio = () => import('../../../games/three/studio')
// the studio floor runs past the canvas: fade the sides and the bottom out so it never ends in a hard line
// (the studio frames the car clear of these bands)
const EDGE_FADE = '[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent),linear-gradient(to_bottom,#000_80%,transparent)] [mask-composite:intersect]'

export default function CarStage({ carId, up, locked = false, owned = null, className = '', onThumbs, accent = '#ffb224' }) {
  const canvasRef = useRef(null)
  const studioRef = useRef(null)
  const dragRef = useRef(null)
  const thumbsRef = useRef(onThumbs)
  const reduce = useReducedMotion()
  const [ready, setReady] = useState(false)       // the studio exists
  const [shown, setShown] = useState(false)       // …and has drawn the car (its shaders compile in the background first)
  const [failed, setFailed] = useState(false)
  const [e1, e2] = up || [1, 1]
  const ownedKey = owned ? owned.join(',') : ''
  useEffect(() => { thumbsRef.current = onThumbs })

  useEffect(() => {
    let alive = true
    let studio = null
    loadStudio().then(({ createStudio }) => {
      if (!alive || !canvasRef.current) return
      studio = createStudio(canvasRef.current, {
        reduced: !!reduce, accent,
        onFallback: () => alive && setFailed(true),
        onShown: () => alive && setShown(true),
      })
      if (!studio) { setFailed(true); return }
      studioRef.current = studio
      if (window.__vdDebug) window.__vdStudio = studio          // tests: renderer.info after leaving
      setReady(true)
    }).catch(() => alive && setFailed(true))
    return () => {
      alive = false
      studio?.dispose()
      if (window.__vdStudio === studio) window.__vdStudio = null
      studioRef.current = null
      setReady(false)            // a rebuilt studio (reduced-motion switched) must be shown the car again
      setShown(false)
    }
  }, [reduce, accent])

  useEffect(() => {
    if (!ready) return
    studioRef.current?.show(carId, { ...carLook(carId, [e1, e2]), locked })
  }, [ready, carId, e1, e2, locked])

  // thumbnails of every car, drawn once the browser is idle (and again when ownership changes);
  // after the first car is on screen, so the shaders are ready and nothing blocks
  useEffect(() => {
    if (!shown || !thumbsRef.current) return undefined
    const list = owned || CARS.map(c => c.id)
    const run = () => {
      const st = studioRef.current
      if (!st) return
      const shots = st.snapshot(CARS.map(c => ({ id: c.id, ...carLook(c.id, [1, 1]), locked: !list.includes(c.id) })))
      thumbsRef.current?.(Object.fromEntries(CARS.map((c, i) => [c.id, shots[i]])))
    }
    const id = window.requestIdleCallback ? window.requestIdleCallback(run, { timeout: 1200 }) : setTimeout(run, 300)
    return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id) : clearTimeout(id))
  }, [shown, ownedKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const onDown = (e) => {
    if (!studioRef.current) return
    dragRef.current = { x: e.clientX, id: e.pointerId }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    studioRef.current?.drag(e.clientX - d.x)
    d.x = e.clientX
  }
  const onUp = (e) => {
    if (dragRef.current?.id !== e.pointerId) return
    dragRef.current = null
    studioRef.current?.release()
  }

  const show3d = ready && shown && !failed
  return (
    <div className={`relative ${className}`}>
      <div aria-hidden={show3d}
        className={`pointer-events-none absolute inset-0 flex items-end justify-center pb-[8%] transition-opacity duration-500 motion-reduce:transition-none ${show3d ? 'opacity-0' : 'opacity-100'}`}>
        <CarSvg model={carId} up={up || [1, 1]} locked={locked} className="w-[82%] opacity-90" />
      </div>
      <canvas ref={canvasRef} aria-label="Mashinani aylantirish uchun suring"
        className={`absolute inset-0 block h-full w-full cursor-grab touch-pan-y transition-opacity duration-500 ${EDGE_FADE} active:cursor-grabbing ${show3d ? 'opacity-100' : 'opacity-0'}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />
    </div>
  )
}
