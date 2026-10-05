/*
 * City buildings: one instanced box per building with windows mapped in metres
 * (any size keeps square windows), lit windows at night, a plain roof.
 *
 *   const { map, lit } = facadeTextures()
 *   const mat = facadeMaterial(map, lit)                    // emissiveIntensity = how lit the city is
 *   new InstancedBatch(unitBoxOnGround(), mat, 200, { colors: true, cells: true })
 *   batch.add(x, 0, z, rotY, [w, h, d], wallColour, [seed, 0, 0, 0])
 */
import { BoxGeometry, MeshStandardMaterial } from 'three'
import { canvasTexture } from './textures'
import { seeded } from './random'

const N = 8              // windows per texture side
export const FACADE_CELL = [3.0, 3.3]   // metres per window (across, per floor)

export function facadeTextures(seed = 7) {
  const S = 512
  const c = S / N
  const map = canvasTexture(S, S, (g) => {
    g.fillStyle = '#ece8e1'
    g.fillRect(0, 0, S, S)
    for (let r = 0; r < N; r++) {
      for (let k = 0; k < N; k++) {
        const x = k * c
        const y = r * c
        g.fillStyle = 'rgba(0,0,0,0.05)'
        g.fillRect(x, y + c - 6, c, 3)                       // floor line
        g.fillStyle = '#f7f5f0'
        g.fillRect(x + 11, y + 13, c - 22, c - 22)           // frame
        const gr = g.createLinearGradient(x, y + 15, x + c, y + c)
        gr.addColorStop(0, '#5e7a91')
        gr.addColorStop(1, '#243746')
        g.fillStyle = gr
        g.fillRect(x + 14, y + 16, c - 28, c - 28)
        g.fillStyle = 'rgba(255,255,255,0.16)'
        g.fillRect(x + 14, y + 16, (c - 28) * 0.38, c - 28)
        g.fillStyle = '#f7f5f0'
        g.fillRect(x + c / 2 - 1.5, y + 16, 3, c - 28)       // mullion
        g.fillStyle = 'rgba(0,0,0,0.18)'
        g.fillRect(x + 9, y + c - 10, c - 18, 3)             // sill shadow
      }
    }
  }, { repeat: true })
  const rnd = seeded(seed)
  const lit = canvasTexture(S, S, (g) => {
    g.fillStyle = '#000000'
    g.fillRect(0, 0, S, S)
    for (let r = 0; r < N; r++) {
      for (let k = 0; k < N; k++) {
        if (rnd() > 0.46) continue
        const warm = rnd() < 0.78
        g.fillStyle = warm ? `rgba(255,${190 + Math.floor(rnd() * 40)},${110 + Math.floor(rnd() * 50)},1)` : 'rgba(190,225,255,1)'
        g.globalAlpha = 0.55 + rnd() * 0.45
        g.fillRect(k * c + 14, r * c + 16, c - 28, c - 28)
        g.globalAlpha = 1
      }
    }
  }, { repeat: true })
  return { map, lit }
}

/* a 1 × 1 × 1 box standing on y = 0 (scale it per building) */
export function unitBoxOnGround() {
  const g = new BoxGeometry(1, 1, 1)
  g.translate(0, 0.5, 0)
  return g
}

export function facadeMaterial(map, lit) {
  const mat = new MeshStandardMaterial({ map, emissiveMap: lit, emissive: '#ffffff', emissiveIntensity: 0, roughness: 0.82, metalness: 0.05 })
  const [cw, ch] = FACADE_CELL
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = `attribute vec4 aCell;\n${shader.vertexShader}`.replace('#include <uv_vertex>', `#include <uv_vertex>
  vec3 fcScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  vec3 fcLocal = position * fcScale;
  vec2 fcFace = abs(normal.x) > 0.5 ? fcLocal.zy : fcLocal.xy;
  vec2 fcUv = fcFace / vec2(${(cw * N).toFixed(2)}, ${(ch * N).toFixed(2)}) + vec2(floor(aCell.x * 8.0) / 8.0, floor(fract(aCell.x * 13.7) * 8.0) / 8.0);
  fcUv = mix(fcUv, vec2(0.004, 0.996), step(0.5, abs(normal.y)));
  vMapUv = fcUv;
  vEmissiveMapUv = fcUv;`)
  }
  mat.customProgramCacheKey = () => 'facade-v1'
  return mat
}
