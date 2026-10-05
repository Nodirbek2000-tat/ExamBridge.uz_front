/*
 * The road on screen: real 3D (three.js, loaded lazily) or, when WebGL is
 * missing, its context is lost twice or does not come back, the 2D canvas road.
 * Both advance the engine from their own animation loop, so switching mid-run
 * just continues. ?vd2d=1 forces the 2D road (testing).
 */
import { useEffect, useRef, useState } from 'react'
import Road from './Road'
import { loadDriveScene, want3d } from './webgl'

function Road3D({ gameRef, onFallback }) {
  const canvasRef = useRef(null)
  const fallbackRef = useRef(onFallback)
  const [shown, setShown] = useState(false)
  useEffect(() => { fallbackRef.current = onFallback })

  useEffect(() => {
    let alive = true
    let scene = null
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    loadDriveScene().then(({ createDriveScene }) => {
      if (!alive || !canvasRef.current) return
      scene = createDriveScene(canvasRef.current, {
        gameRef, reduced, autoQuality: !window.__vdLockQuality,
        onFallback: () => { if (alive) fallbackRef.current?.() },
        onReady: () => { if (alive) setShown(true) },
      })
      if (!scene) fallbackRef.current?.()
    }).catch(() => { if (alive) fallbackRef.current?.() })
    return () => {
      alive = false
      scene?.dispose()
    }
  }, [gameRef])

  // the road fades in with its first frame (its shaders compile in the background meanwhile)
  return (
    <canvas ref={canvasRef} aria-hidden="true"
      className={`absolute inset-0 block h-full w-full transition-opacity duration-500 motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`} />
  )
}

export default function DriveView({ gameRef }) {
  const [mode, setMode] = useState(() => (want3d() ? '3d' : '2d'))
  useEffect(() => {
    if (mode === '2d') window.__vdStats = { fps: 0, calls: 0, mode: '2d' }
  }, [mode])
  if (mode === '3d') return <Road3D gameRef={gameRef} onFallback={() => setMode('2d')} />
  return <Road gameRef={gameRef} />
}
