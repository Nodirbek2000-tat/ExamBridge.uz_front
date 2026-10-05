/*
 * TOBY RUN — what is on screen behind the HUD: the 3D world (three.js, loaded lazily) or, without WebGL
 * or after the context is lost twice, Card mode (CardMode.jsx). Both advance the engine from their own
 * animation loop, so switching mid-run just continues (the director keeps going; obstacles are lifted).
 * ?rn2d=1 forces Card mode (testing). `reduced` (the setting) adds to prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react'
import { forceCards, loadScene, webglAvailable } from './webgl'
import CardMode from './CardMode'

function Scene3D({ gameRef, onFallback, attract, reduced: wantReduced }) {
  const canvasRef = useRef(null)
  const fallbackRef = useRef(onFallback)
  useEffect(() => { fallbackRef.current = onFallback })

  useEffect(() => {
    let alive = true
    let scene = null
    const reduced = !!wantReduced || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    loadScene().then(({ createRunnerScene }) => {
      if (!alive || !canvasRef.current) return
      scene = createRunnerScene(canvasRef.current, {
        gameRef, reduced, attract, autoQuality: !window.__rnLockQuality,
        onFallback: () => { if (alive) fallbackRef.current?.() },
      })
      if (!scene) fallbackRef.current?.()
    }).catch(() => { if (alive) fallbackRef.current?.() })
    return () => {
      alive = false
      scene?.dispose()
    }
  }, [gameRef, attract, wantReduced])

  return <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-hidden="true" />
}

export default function RunnerView({ gameRef, attract = false, reduced = false }) {
  const [mode, setMode] = useState(() => (webglAvailable() && !forceCards() ? '3d' : 'card'))
  if (mode === '3d') return <Scene3D gameRef={gameRef} attract={attract} reduced={reduced} onFallback={() => setMode('card')} />
  return <CardMode gameRef={gameRef} />
}
