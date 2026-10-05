/*
 * TOBY RUN — the four biomes' looks (RUNNER_PLAN §B1): light preset, tunnel darkness, track bed, verge,
 * skyline tint, `lift` (a soft fill at night so Toby and the obstacles stay readable). The scenery
 * changes SCENE_SHIFT metres after a Bekat's stop — just past the platform's far end — so the platform
 * hides the switch and the light has blended by then.
 */
import { BIOMES } from '../engine/track.js'

export const SCENE_SHIFT = 22
export const BLEND_M = 80

export const BIOME_LOOK = {
  // the tunnel: dark air and fog that swallows the far vault, warm chandeliers
  metro: { env: 'studio', dark: 0.12, bed: 'ballast', bedTint: '#d8d2c8', curb: '#E9DFCC', verge: null, skyline: null, lift: 0 },
  bozor: { env: 'day', dark: 0, bed: 'cobble', bedTint: '#efe2cf', curb: '#F1E4C9', verge: 'paving', vergeTint: '#f4e6cf', skyline: '#a9bbd0', lift: 0 },
  xiyobon: { env: 'sunset', dark: 0, bed: 'cobble', bedTint: '#e9d9c6', curb: '#EADCC3', verge: 'grass', vergeTint: '#d9e6b8', skyline: '#b77d86', lift: 0 },
  shahar: { env: 'night', dark: 0, bed: 'cobble', bedTint: '#9a9eae', curb: '#8a91a3', verge: 'paving', vergeTint: '#7a7f91', skyline: '#1f2c58', lift: 0.5 },
}

/* the biome the scenery shows at track position s */
export const biomeIndexAt = (track, s) => track.biomeAt(s - SCENE_SHIFT)
export const biomeKeyAt = (track, s) => BIOMES[biomeIndexAt(track, s)]

/*
 * The light and air for the frame: the biome under Toby and, over the BLEND_M metres before the
 * scenery switch past a Bekat, the next one blending in → { a, b, k }.
 */
export function biomeBlend(game, out) {
  const track = game.track
  const dist = game.dist
  out.a = biomeKeyAt(track, dist)
  out.b = out.a
  out.k = 0
  for (const st of game.stations) {
    const ahead = st.stop + SCENE_SHIFT - dist
    if (ahead > 0 && ahead < BLEND_M) {
      out.b = BIOMES[st.biome]
      out.k = 1 - ahead / BLEND_M
      break
    }
  }
  return out
}
