/* TOBY RUN — can this browser draw the 3D world? (and the lazy three.js chunk of the scene) */
let glOk = null

export function webglAvailable() {
  if (glOk != null) return glOk
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    glOk = !!gl
    // give the probe context back at once (browsers keep only a handful of live WebGL contexts)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    glOk = false
  }
  return glOk
}

export const loadScene = () => import('./three/RunnerScene')
export const preloadRunnerScene = () => loadScene().catch(() => null)
/* ?rn2d=1 forces the no-WebGL path (testing) */
export const forceCards = () => typeof window !== 'undefined' && /[?&]rn2d=1/.test(window.location.search)
