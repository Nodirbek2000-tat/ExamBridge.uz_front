/*
 * Can this browser draw the 3D road? (asked once; the probe context is given back at once —
 * browsers keep only a handful of live WebGL contexts). ?vd2d=1 forces the 2D road (testing).
 */
let glOk = null
export function webglAvailable() {
  if (glOk != null) return glOk
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    glOk = !!gl
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    glOk = false
  }
  return glOk
}

export const want3d = () => webglAvailable() && !/[?&]vd2d=1/.test(window.location.search)

export const loadDriveScene = () => import('./three/DriveScene')

/* Fetch the 3D road while the player is still on the start screen, so Start opens at once. */
export function preloadDriveScene() {
  if (want3d()) loadDriveScene().catch(() => {})
}
