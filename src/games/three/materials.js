/*
 * PBR materials shared by the 3D games. Every factory returns a new material;
 * MaterialSet caches by key so a scene creates each look once and frees them
 * all together.
 *
 *   const mats = new MaterialSet()
 *   mats.get('glass', glassMaterial)            // cached
 *   paintMaterial('#b3122e')                    // car paint (clear-coated)
 *   mats.dispose()
 *
 * Reflections come from the scene's environment map (Stage.useRoomEnvironment).
 */
import { AdditiveBlending, Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'

const luminance = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b

/* Car paint: metallic flake under a glossy clear coat. Light colours get less metal (white stays white). */
export function paintMaterial(color, { physical = true, flake } = {}) {
  const c = new Color(color)
  const lum = luminance(c)
  const metalness = flake ?? (lum > 0.55 ? 0.12 : lum < 0.02 ? 0.35 : 0.5)
  if (!physical) return new MeshStandardMaterial({ color: c, metalness, roughness: 0.3 })
  return new MeshPhysicalMaterial({ color: c, metalness, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.06 })
}

/* Recolour a paint material in place (keeps the same program). */
export function setPaint(material, color) {
  const c = material.color.set(color)
  const lum = luminance(c)
  material.metalness = lum > 0.55 ? 0.12 : lum < 0.02 ? 0.35 : 0.5
}

/* Tinted car glass: almost black, mirror-like (no transparency, so no sorting and no empty cabin). */
export const glassMaterial = () => new MeshStandardMaterial({ color: '#0d1319', metalness: 0.3, roughness: 0.08, envMapIntensity: 0.62 })

export const chromeMaterial = () => new MeshStandardMaterial({ color: '#f1f3f6', metalness: 1, roughness: 0.1 })
export const goldMaterial = () => new MeshStandardMaterial({ color: '#ffc64a', metalness: 1, roughness: 0.16 })
export const steelMaterial = () => new MeshStandardMaterial({ color: '#aeb5bf', metalness: 0.85, roughness: 0.32 })
export const rubberMaterial = () => new MeshStandardMaterial({ color: '#151619', metalness: 0, roughness: 0.92 })

/* Plastic / rubber / small coloured bits, coloured per vertex (one material for all the trim of a model). */
export const trimMaterial = () => new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0.08, roughness: 0.58 })

/* Matte surfaces coloured per vertex (props, trees, people): one draw call per merged model. */
export const vertexMaterial = (opts = {}) => new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, metalness: 0, roughness: 0.85, ...opts })

/* A lamp lens: glassy when off, glowing when on — drive it with emissiveIntensity. */
export const lampMaterial = (glow = '#fff3dc', lens = '#dfe5ec') => new MeshStandardMaterial({
  color: lens, emissive: glow, emissiveIntensity: 0.2, metalness: 0.2, roughness: 0.12, toneMapped: false,
})

/* Unlit additive glow (headlight cones, neon, flames, light pools). */
export const glowMaterial = (color = '#ffffff', map = null, opacity = 1) => new MeshBasicMaterial({
  color, map, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, fog: true, toneMapped: false,
})

/* A dark matte stand-in: locked cars in the garage show only their silhouette. */
export const silhouetteMaterial = () => new MeshStandardMaterial({ color: '#050507', metalness: 0.3, roughness: 0.55, side: DoubleSide })

export class MaterialSet {
  constructor() { this.map = new Map() }

  get(key, make) {
    let m = this.map.get(key)
    if (!m) { m = make(); this.map.set(key, m) }
    return m
  }

  forEach(fn) { this.map.forEach(fn) }

  dispose() {
    for (const m of this.map.values()) {
      m.map?.dispose?.()
      m.emissiveMap?.dispose?.()
      m.dispose()
    }
    this.map.clear()
  }
}
